import {
  buildGeocodeQueries,
  matchesGeocodeCandidate,
  runProviderFallbackChain,
} from "./geocodeQuery.ts";

const MAURITANIA_WILAYAS = new Set([
  "Adrar",
  "Assaba",
  "Brakna",
  "Dakhlet Nouadhibou",
  "Gorgol",
  "Guidimaka",
  "Hodh Ech Chargui",
  "Hodh El Gharbi",
  "Inchiri",
  "Nouakchott Nord",
  "Nouakchott Ouest",
  "Nouakchott Sud",
  "Tagant",
  "Tiris Zemmour",
  "Trarza",
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
  Vary: "Origin",
};
const NOMINATIM_RETRY_DELAY_MS = 1_100;
const PHOTON_RETRY_DELAY_MS = 250;
const PHOTON_BASE_URL = "https://photon.komoot.io/api/";

type ExternalProvider = "photon" | "nominatim";

type GeocodingCandidate = {
  provider?: ExternalProvider;
  place_id?: number | string;
  osm_type?: string;
  osm_id?: number | string;
  type?: string;
  name?: string;
  display_name?: string;
  lat?: string;
  lon?: string;
  address?: {
    country_code?: string;
  };
};

type PhotonFeature = {
  geometry?: { coordinates?: unknown };
  properties?: {
    osm_type?: unknown;
    osm_id?: unknown;
    type?: unknown;
    name?: unknown;
    city?: unknown;
    district?: unknown;
    county?: unknown;
    state?: unknown;
    country?: unknown;
    countrycode?: unknown;
  };
};

type SearchPayload = {
  query?: unknown;
  wilaya?: unknown;
  country?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  debug?: unknown;
};

type DiagnosticStage =
  | "auth_failed"
  | "configuration_invalid"
  | "payload_normalized"
  | "reservation_failed"
  | "photon_fetch_failed"
  | "photon_parse_failed"
  | "nominatim_fetch_failed"
  | "nominatim_parse_failed"
  | "no_valid_match"
  | "discovery_save_failed"
  | "unexpected_error";

type ErrorStatus = "invalid_query" | "unauthenticated" | "rate_limited" | "error";

function logDiagnostic(event: string, details: Record<string, unknown> = {}) {
  console.info(JSON.stringify({ scope: "geocode-place", event, ...details }));
}

function errorName(error: unknown) {
  return error instanceof Error ? error.name : "unknown";
}

function response(payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), { headers: corsHeaders });
}

function finalResponse(
  payload: Record<string, unknown>,
  debug: boolean,
  stage?: DiagnosticStage,
  errorCode?: string,
  debugDetails: Record<string, unknown> = {},
) {
  const status = typeof payload.status === "string" ? payload.status : "unknown";
  logDiagnostic("final_response", { status, stage: stage ?? null, errorCode: errorCode ?? null });

  if (debug && stage && errorCode) {
    return response({ ...payload, error_code: errorCode, stage, ...debugDetails });
  }

  return response(payload);
}

function errorResponse(
  status: ErrorStatus,
  stage: DiagnosticStage,
  errorCode: string,
  debug: boolean,
  debugDetails: Record<string, unknown> = {},
) {
  return finalResponse({ status }, debug, stage, errorCode, debugDetails);
}

function isFiniteCoordinate(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLocaleLowerCase();
}

function matchRank(candidate: GeocodingCandidate, query: string) {
  const candidateName = normalize(candidate.name ?? "");
  const candidateDisplayName = normalize(candidate.display_name ?? "");

  if (candidateName === query) return 0;
  if (candidateDisplayName.startsWith(`${query},`) || candidateDisplayName === query) return 1;
  if (candidateName.startsWith(query)) return 2;
  return 3;
}

function placeKindRank(candidate: GeocodingCandidate) {
  const kind = normalize(candidate.type ?? "");
  return ["city", "town", "village", "municipality", "locality"].includes(kind) ? 0 : 1;
}

function candidateCoordinates(candidate: GeocodingCandidate) {
  const latitude = Number(candidate.lat);
  const longitude = Number(candidate.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  return {
    latitude: Number(latitude.toFixed(6)),
    longitude: Number(longitude.toFixed(6)),
  };
}

function distanceFromLocation(
  candidate: GeocodingCandidate,
  location: { latitude: number; longitude: number },
) {
  const coordinates = candidateCoordinates(candidate);
  if (!coordinates) return Number.POSITIVE_INFINITY;

  const radians = Math.PI / 180;
  const latitudeDistance = (coordinates.latitude - location.latitude) * radians;
  const longitudeDistance = (coordinates.longitude - location.longitude) * radians;
  const haversine =
    Math.sin(latitudeDistance / 2) ** 2 +
    Math.cos(location.latitude * radians) *
      Math.cos(coordinates.latitude * radians) *
      Math.sin(longitudeDistance / 2) ** 2;

  return 6_371 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

type CandidateSelection = {
  candidates: GeocodingCandidate[];
  responseCount: number;
  rejected: {
    invalid: number;
    country: number;
    missingCoordinatesOrName: number;
    queryMismatch: number;
  };
};

type ProviderSearchResult =
  | { ok: true; selection: CandidateSelection; httpStatus: number }
  | {
    ok: false;
    stage:
      | "photon_fetch_failed"
      | "photon_parse_failed"
      | "nominatim_fetch_failed"
      | "nominatim_parse_failed";
    httpStatus: number | null;
  };

function selectCandidates(
  data: unknown,
  query: string,
  location: { latitude: number; longitude: number } | null,
  provider: ExternalProvider,
) {
  if (!Array.isArray(data)) return null;

  const rejected: CandidateSelection["rejected"] = {
    invalid: 0,
    country: 0,
    missingCoordinatesOrName: 0,
    queryMismatch: 0,
  };
  const candidates: GeocodingCandidate[] = [];

  for (const value of data) {
    if (!value || typeof value !== "object") {
      rejected.invalid += 1;
      continue;
    }

    const candidate = { ...(value as GeocodingCandidate), provider };
    if (candidate.address?.country_code?.toLowerCase() !== "mr") {
      rejected.country += 1;
      continue;
    }

    if (!candidate.display_name || !candidateCoordinates(candidate)) {
      rejected.missingCoordinatesOrName += 1;
      continue;
    }

    if (!matchesGeocodeCandidate(query, candidate.name, candidate.display_name)) {
      rejected.queryMismatch += 1;
      continue;
    }

    candidates.push(candidate);
  }

  candidates.sort((first, second) => {
      const kindDifference = placeKindRank(first) - placeKindRank(second);
      if (kindDifference) return kindDifference;
      const rankDifference = matchRank(first, query) - matchRank(second, query);
      if (rankDifference || !location) return rankDifference;
      return distanceFromLocation(first, location) - distanceFromLocation(second, location);
    });

  return { candidates, responseCount: data.length, rejected };
}

function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function identifierValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return "";
}

function photonFeatureToCandidate(value: unknown): GeocodingCandidate | null {
  if (!value || typeof value !== "object") return null;

  const feature = value as PhotonFeature;
  const coordinates = feature.geometry?.coordinates;
  const properties = feature.properties;
  if (!Array.isArray(coordinates) || coordinates.length < 2 || !properties) return null;

  const longitude = coordinates[0];
  const latitude = coordinates[1];
  if (typeof longitude !== "number" || typeof latitude !== "number") return null;

  const name = textValue(properties.name);
  const country = textValue(properties.country);
  const rawCountryCode = textValue(properties.countrycode).toLowerCase();
  const countryCode = rawCountryCode === "mr" || normalize(country) === "mauritania" ? "mr" : rawCountryCode;
  const addressParts = [
    name,
    textValue(properties.city),
    textValue(properties.district),
    textValue(properties.county),
    textValue(properties.state),
    country,
  ].filter((part, index, parts) => part && parts.indexOf(part) === index);
  const displayName = addressParts.join(", ");
  const osmType = textValue(properties.osm_type);
  const osmId = identifierValue(properties.osm_id);

  return {
    provider: "photon",
    place_id: osmType && osmId ? `photon:${osmType}:${osmId}` : undefined,
    osm_type: osmType || undefined,
    osm_id: osmId || undefined,
    type: textValue(properties.type) || undefined,
    name: name || undefined,
    display_name: displayName || undefined,
    lat: String(latitude),
    lon: String(longitude),
    address: { country_code: countryCode },
  };
}

async function searchPhoton(
  attempt: "context" | "country_fallback",
  contextQuery: string,
  query: string,
  location: { latitude: number; longitude: number } | null,
): Promise<ProviderSearchResult> {
  const geocodingUrl = new URL(PHOTON_BASE_URL);
  geocodingUrl.searchParams.set("q", contextQuery);
  geocodingUrl.searchParams.set("limit", "8");

  if (location) {
    geocodingUrl.searchParams.set("lat", String(location.latitude));
    geocodingUrl.searchParams.set("lon", String(location.longitude));
  }

  logDiagnostic("photon_attempt", {
    attempt,
    providerOrigin: geocodingUrl.origin,
    query: contextQuery,
    hasLocation: Boolean(location),
  });

  let geocodingResponse: Response;
  try {
    geocodingResponse = await fetch(geocodingUrl, {
      headers: { Accept: "application/json" },
    });
  } catch (error) {
    logDiagnostic("photon_fetch_error", { attempt, errorName: errorName(error) });
    return { ok: false, stage: "photon_fetch_failed", httpStatus: null };
  }

  logDiagnostic("photon_http_status", { attempt, httpStatus: geocodingResponse.status });
  if (!geocodingResponse.ok) {
    return { ok: false, stage: "photon_fetch_failed", httpStatus: geocodingResponse.status };
  }

  let data: unknown;
  try {
    data = await geocodingResponse.json();
  } catch (error) {
    logDiagnostic("photon_parse_error", { attempt, errorName: errorName(error) });
    return { ok: false, stage: "photon_parse_failed", httpStatus: geocodingResponse.status };
  }

  const features =
    data && typeof data === "object" && Array.isArray((data as { features?: unknown }).features)
      ? (data as { features: unknown[] }).features
      : null;
  if (!features) {
    logDiagnostic("photon_parse_error", { attempt, errorName: "missing_features" });
    return { ok: false, stage: "photon_parse_failed", httpStatus: geocodingResponse.status };
  }

  const candidates = features
    .map(photonFeatureToCandidate)
    .filter((candidate): candidate is GeocodingCandidate => candidate !== null);
  const selection = selectCandidates(candidates, query, location, "photon");
  if (!selection) {
    logDiagnostic("photon_parse_error", { attempt, errorName: "invalid_features" });
    return { ok: false, stage: "photon_parse_failed", httpStatus: geocodingResponse.status };
  }
  selection.responseCount = features.length;

  logDiagnostic("photon_response", {
    attempt,
    responseCount: selection.responseCount,
    acceptedCount: selection.candidates.length,
    rejected: selection.rejected,
  });
  return { ok: true, selection, httpStatus: geocodingResponse.status };
}

async function searchNominatim(
  providerBaseUrl: URL,
  userAgent: string,
  attempt: "context" | "country_fallback",
  contextQuery: string,
  query: string,
  location: { latitude: number; longitude: number } | null,
): Promise<ProviderSearchResult> {
  const geocodingUrl = new URL("/search", providerBaseUrl);
  geocodingUrl.searchParams.set("q", contextQuery);
  geocodingUrl.searchParams.set("format", "jsonv2");
  geocodingUrl.searchParams.set("addressdetails", "1");
  geocodingUrl.searchParams.set("countrycodes", "mr");
  geocodingUrl.searchParams.set("limit", "8");

  if (location) {
    const { latitude, longitude } = location;
    geocodingUrl.searchParams.set(
      "viewbox",
      `${longitude - 1},${latitude + 1},${longitude + 1},${latitude - 1}`,
    );
  }

  logDiagnostic("nominatim_attempt", {
    attempt,
    providerOrigin: providerBaseUrl.origin,
    query: contextQuery,
    hasLocation: Boolean(location),
  });

  let geocodingResponse: Response;
  try {
    geocodingResponse = await fetch(geocodingUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": userAgent,
      },
    });
  } catch (error) {
    logDiagnostic("nominatim_fetch_error", { attempt, errorName: errorName(error) });
    return { ok: false, stage: "nominatim_fetch_failed", httpStatus: null };
  }

  logDiagnostic("nominatim_http_status", { attempt, httpStatus: geocodingResponse.status });
  if (!geocodingResponse.ok) {
    return { ok: false, stage: "nominatim_fetch_failed", httpStatus: geocodingResponse.status };
  }

  let data: unknown;
  try {
    data = await geocodingResponse.json();
  } catch (error) {
    logDiagnostic("nominatim_parse_error", { attempt, errorName: errorName(error) });
    return { ok: false, stage: "nominatim_parse_failed", httpStatus: geocodingResponse.status };
  }

  const selection = selectCandidates(data, query, location, "nominatim");
  if (!selection) {
    logDiagnostic("nominatim_parse_error", { attempt, errorName: "non_array_response" });
    return { ok: false, stage: "nominatim_parse_failed", httpStatus: geocodingResponse.status };
  }

  logDiagnostic("nominatim_response", {
    attempt,
    responseCount: selection.responseCount,
    acceptedCount: selection.candidates.length,
    rejected: selection.rejected,
  });
  return { ok: true, selection, httpStatus: geocodingResponse.status };
}

async function postToSupabase(
  supabaseUrl: string,
  anonKey: string,
  authorization: string,
  rpcName: string,
  body: Record<string, unknown>,
) {
  return fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    method: "POST",
    headers: {
      Authorization: authorization,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

Deno.serve(async (request) => {
  logDiagnostic("request_received", { method: request.method });
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  let body: SearchPayload;
  try {
    body = (await request.json()) as SearchPayload;
  } catch (error) {
    logDiagnostic("payload_parse_error", { errorName: errorName(error) });
    return errorResponse("error", "payload_normalized", "invalid_json", false);
  }

  const debug = body.debug === true;
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = request.headers.get("Authorization");
  const nominatimBaseUrl = Deno.env.get("NOMINATIM_BASE_URL") ?? "https://nominatim.openstreetmap.org";
  const nominatimUserAgent = Deno.env.get("NOMINATIM_USER_AGENT");

  if (!supabaseUrl || !anonKey) {
    logDiagnostic("configuration_error", {
      hasSupabaseUrl: Boolean(supabaseUrl),
      hasAnonKey: Boolean(anonKey),
    });
    return errorResponse("error", "configuration_invalid", "configuration_missing", debug);
  }

  if (!authorization?.startsWith("Bearer ")) {
    logDiagnostic("auth_failed", { reason: "missing_bearer_token" });
    return errorResponse("unauthenticated", "auth_failed", "missing_bearer_token", debug);
  }

  try {
    let currentUser: Response;
    try {
      currentUser = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: { Authorization: authorization, apikey: anonKey },
      });
    } catch (error) {
      logDiagnostic("auth_failed", { reason: "user_lookup_fetch_failed", errorName: errorName(error) });
      return errorResponse("error", "auth_failed", "user_lookup_fetch_failed", debug);
    }
    logDiagnostic("auth_resolved", { httpStatus: currentUser.status, resolved: currentUser.ok });
    if (!currentUser.ok) {
      return errorResponse("unauthenticated", "auth_failed", "user_lookup_rejected", debug);
    }

    const query = typeof body.query === "string" ? body.query.trim() : "";
    const wilaya = typeof body.wilaya === "string" && MAURITANIA_WILAYAS.has(body.wilaya) ? body.wilaya : null;
    const hasLocation = body.latitude !== null || body.longitude !== null;
    const requestedLocation =
      isFiniteCoordinate(body.latitude, -90, 90) &&
      isFiniteCoordinate(body.longitude, -180, 180)
        ? { latitude: body.latitude, longitude: body.longitude }
        : null;

    logDiagnostic("payload_normalized", {
      query,
      wilaya,
      country: body.country ?? null,
      hasCoordinates: Boolean(requestedLocation),
      debug,
    });
    if (query.length < 2 || query.length > 80) {
      return errorResponse("invalid_query", "payload_normalized", "invalid_query", debug);
    }
    if (typeof body.wilaya === "string" && !wilaya) {
      return errorResponse("invalid_query", "payload_normalized", "invalid_wilaya", debug);
    }
    if (body.country !== undefined && body.country !== "Mauritania") {
      return errorResponse("invalid_query", "payload_normalized", "invalid_country", debug);
    }
    if (hasLocation && !requestedLocation) {
      return errorResponse("invalid_query", "payload_normalized", "invalid_coordinates", debug);
    }

    let reservationResponse: Response;
    let reservation: Record<string, unknown>;
    logDiagnostic("reservation_start", { rpc: "reserve_external_place_lookup", query });
    try {
      reservationResponse = await postToSupabase(
        supabaseUrl,
        anonKey,
        authorization,
        "reserve_external_place_lookup",
        { p_query: query },
      );
      reservation = (await reservationResponse.json()) as Record<string, unknown>;
    } catch (error) {
      logDiagnostic("reservation_error", { errorName: errorName(error) });
      return errorResponse("error", "reservation_failed", "reservation_request_failed", debug);
    }

    const reservationStatus = typeof reservation.status === "string" ? reservation.status : null;
    const reservationRpcCode = typeof reservation.code === "string" ? reservation.code : null;
    logDiagnostic("reservation_result", {
      httpStatus: reservationResponse.status,
      status: reservationStatus,
      rpcCode: reservationRpcCode,
    });
    if (!reservationResponse.ok || reservation.status !== "allowed") {
      const status: ErrorStatus = reservation.status === "rate_limited" ? "rate_limited" : "error";
      const errorCode = reservation.status === "rate_limited" ? "reservation_rate_limited" : "reservation_rejected";
      return errorResponse(status, "reservation_failed", errorCode, debug, {
        reservation_http_status: reservationResponse.status,
        reservation_status: reservationStatus,
        reservation_rpc_code: reservationRpcCode,
      });
    }

    const normalizedQuery = normalize(query);
    const geocodeQueries = buildGeocodeQueries(query, wilaya);
    let providerBaseUrl: URL | null = null;
    if (!nominatimUserAgent) {
      logDiagnostic("provider_attempt_unusable", {
        provider: "nominatim",
        reason: "missing_user_agent",
      });
    } else {
      try {
        providerBaseUrl = new URL(nominatimBaseUrl);
      } catch (error) {
        logDiagnostic("provider_attempt_unusable", {
          provider: "nominatim",
          reason: "invalid_base_url",
          errorName: errorName(error),
        });
      }
      if (providerBaseUrl?.protocol !== "https:") {
        logDiagnostic("provider_attempt_unusable", {
          provider: "nominatim",
          reason: "https_required",
        });
        providerBaseUrl = null;
      }
    }

    const chainResult = await runProviderFallbackChain(
      geocodeQueries,
      async (provider, attempt, contextQuery) => {
        if (attempt === "country_fallback") {
          const delay = provider === "photon" ? PHOTON_RETRY_DELAY_MS : NOMINATIM_RETRY_DELAY_MS;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        const providerResult = provider === "photon"
          ? await searchPhoton(attempt, contextQuery, normalizedQuery, requestedLocation)
          : providerBaseUrl && nominatimUserAgent
            ? await searchNominatim(
              providerBaseUrl,
              nominatimUserAgent,
              attempt,
              contextQuery,
              normalizedQuery,
              requestedLocation,
            )
            : null;

        if (!providerResult) return null;
        if (!providerResult.ok) {
          logDiagnostic("provider_attempt_unusable", {
            provider,
            attempt,
            reason: providerResult.stage,
            httpStatus: providerResult.httpStatus,
          });
          return null;
        }
        if (!providerResult.selection.candidates.length) {
          logDiagnostic("provider_attempt_unusable", {
            provider,
            attempt,
            reason: "no_valid_candidate",
          });
          return null;
        }

        return providerResult.selection;
      },
    );
    const selection = chainResult?.candidate ?? null;

    const finalSelection = selection ?? {
      candidates: [],
      responseCount: 0,
      rejected: { invalid: 0, country: 0, missingCoordinatesOrName: 0, queryMismatch: 0 },
    };
    const candidate = finalSelection.candidates[0];
    const coordinates = candidate ? candidateCoordinates(candidate) : null;
    if (!candidate || !coordinates || !candidate.display_name) {
      logDiagnostic("candidate_match", {
        decision: "rejected",
        reason: "no_valid_match",
        provider: candidate?.provider ?? null,
        acceptedCount: finalSelection.candidates.length,
        rejected: finalSelection.rejected,
      });
      return finalResponse({ status: "not_found" }, debug, "no_valid_match", "no_valid_match");
    }

    logDiagnostic("candidate_match", {
      decision: "accepted",
      reason: "mauritania_country_and_query_match",
      provider: candidate.provider ?? "nominatim",
      candidateName: candidate.name?.trim() || null,
    });
    const provider = candidate.provider ?? "nominatim";
    const providerPlaceId = String(candidate.place_id ?? `${candidate.osm_type ?? "place"}:${candidate.osm_id ?? candidate.display_name}`);
    const discoveryBody = {
      p_searched_query: query,
      p_provider: provider,
      p_provider_place_id: providerPlaceId,
      p_display_name: candidate.display_name,
      p_latitude: coordinates.latitude,
      p_longitude: coordinates.longitude,
      p_country: "Mauritania",
      p_wilaya: wilaya,
    };

    let discoveryStatus: "created" | "duplicate" | "error" = "error";
    logDiagnostic("discovery_save_start", { provider, wilaya });
    try {
      const discoveryResponse = await postToSupabase(
        supabaseUrl,
        anonKey,
        authorization,
        "create_external_place_discovery",
        discoveryBody,
      );
      const discovery = (await discoveryResponse.json()) as { status?: unknown };
      discoveryStatus = discovery.status === "created" || discovery.status === "duplicate" ? discovery.status : "error";
      logDiagnostic("discovery_save_result", {
        httpStatus: discoveryResponse.status,
        status: discoveryStatus,
      });
    } catch (error) {
      logDiagnostic("discovery_save_error", { errorName: errorName(error) });
    }

    return finalResponse(
      {
        status: "found",
        place: {
          display_name: candidate.name?.trim() || candidate.display_name,
          address: candidate.display_name,
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          provider,
          discovery_status: discoveryStatus,
        },
      },
      debug,
      discoveryStatus === "error" ? "discovery_save_failed" : undefined,
      discoveryStatus === "error" ? "discovery_save_failed" : undefined,
    );
  } catch (error) {
    logDiagnostic("unexpected_error", { errorName: errorName(error) });
    return errorResponse("error", "unexpected_error", "unexpected_error", debug);
  }
});

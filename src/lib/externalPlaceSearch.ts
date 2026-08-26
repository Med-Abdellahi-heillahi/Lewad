import { supabase } from "./supabaseClient";
import type { MauritaniaWilaya, SearchCoordinates } from "./searchLocationContext";

export type ExternalPlace = {
  displayName: string;
  address: string;
  latitude: number;
  longitude: number;
  provider: "photon" | "nominatim";
  discoveryStatus: "created" | "duplicate" | "error";
};

export type ExternalPlaceSearchStatus =
  | "found"
  | "not_found"
  | "rate_limited"
  | "invalid_query"
  | "unauthenticated"
  | "error";

export type ExternalPlaceSearchResponse = {
  status: ExternalPlaceSearchStatus;
  place: ExternalPlace | null;
};

type ExternalPlaceSearchParams = {
  query: string;
  wilaya?: MauritaniaWilaya | null;
  location?: SearchCoordinates | null;
};

const validStatuses = new Set<ExternalPlaceSearchStatus>([
  "found",
  "not_found",
  "rate_limited",
  "invalid_query",
  "unauthenticated",
  "error",
]);

const validDiscoveryStatuses = new Set<ExternalPlace["discoveryStatus"]>([
  "created",
  "duplicate",
  "error",
]);

const errorResponse: ExternalPlaceSearchResponse = {
  status: "error",
  place: null,
};

function debugExternalPlace(event: string, details: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) {
    const serializedDetails = Object.keys(details).length ? ` ${JSON.stringify(details)}` : "";
    console.debug(`[external-place] ${event}${serializedDetails}`);
  }
}

async function describeInvokeError(error: unknown) {
  const errorLike = error && typeof error === "object" ? (error as Record<string, unknown>) : null;
  const context = errorLike?.context;
  const details: Record<string, unknown> = {
    hasError: Boolean(error),
    errorName: typeof errorLike?.name === "string" ? errorLike.name : null,
    errorMessage: typeof errorLike?.message === "string" ? errorLike.message : null,
  };

  if (context instanceof Response) {
    details.httpStatus = context.status;
    details.responseBody = await context
      .clone()
      .text()
      .then((body) => body.slice(0, 500))
      .catch(() => null);
  }

  return details;
}

function isValidCoordinate(
  value: unknown,
  minimum: number,
  maximum: number,
): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function parsePlace(value: unknown): ExternalPlace | null {
  if (!value || typeof value !== "object") return null;

  const place = value as Record<string, unknown>;
  const latitude = place.latitude;
  const longitude = place.longitude;
  if (
    typeof place.display_name !== "string" ||
    typeof place.address !== "string" ||
    (place.provider !== "photon" && place.provider !== "nominatim") ||
    !isValidCoordinate(latitude, -90, 90) ||
    !isValidCoordinate(longitude, -180, 180) ||
    typeof place.discovery_status !== "string" ||
    !validDiscoveryStatuses.has(place.discovery_status as ExternalPlace["discoveryStatus"])
  ) {
    return null;
  }

  return {
    displayName: place.display_name,
    address: place.address,
    latitude,
    longitude,
    provider: place.provider,
    discoveryStatus: place.discovery_status as ExternalPlace["discoveryStatus"],
  };
}

export async function searchExternalPlace({
  query,
  wilaya = null,
  location = null,
}: ExternalPlaceSearchParams): Promise<ExternalPlaceSearchResponse> {
  const payload = {
    query,
    wilaya,
    country: "Mauritania" as const,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    debug: import.meta.env.DEV ? true : undefined,
  };
  debugExternalPlace("geocode payload", {
    query,
    wilaya,
    country: payload.country,
    hasCoordinates: Boolean(location),
    debug: Boolean(payload.debug),
  });

  try {
    const { data, error } = await supabase.functions.invoke("geocode-place", {
      body: payload,
    });

    if (error || !data || typeof data !== "object") {
      debugExternalPlace("geocode error", {
        ...(await describeInvokeError(error)),
        hasData: Boolean(data),
      });
      return errorResponse;
    }

    const response = data as Record<string, unknown>;
    const status =
      typeof response.status === "string" && validStatuses.has(response.status as ExternalPlaceSearchStatus)
        ? (response.status as ExternalPlaceSearchStatus)
        : "error";

    const parsedPlace = status === "found" ? parsePlace(response.place) : null;
    if (status === "found" && !parsedPlace) {
      debugExternalPlace("geocode error", { reason: "invalid_found_response" });
    } else if (status === "found" && parsedPlace) {
      debugExternalPlace("geocode success", {
        discoveryStatus: parsedPlace.discoveryStatus,
      });
    } else if (status === "not_found") {
      debugExternalPlace("geocode no result");
    } else {
      debugExternalPlace("geocode error", {
        status,
        errorCode: typeof response.error_code === "string" ? response.error_code : null,
        stage: typeof response.stage === "string" ? response.stage : null,
        reservationHttpStatus:
          typeof response.reservation_http_status === "number"
            ? response.reservation_http_status
            : null,
        reservationStatus:
          typeof response.reservation_status === "string" ? response.reservation_status : null,
        reservationRpcCode:
          typeof response.reservation_rpc_code === "string" ? response.reservation_rpc_code : null,
      });
    }

    return {
      status,
      place: parsedPlace,
    };
  } catch {
    debugExternalPlace("geocode error", { reason: "invoke_rejected" });
    return errorResponse;
  }
}

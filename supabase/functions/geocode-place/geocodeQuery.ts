export function buildGeocodeQuery(query: string, wilaya: string | null) {
  return [query.trim(), wilaya, "Mauritania"].filter(Boolean).join(", ");
}

/**
 * Nominatim sometimes does not recognize a wilaya in a place query even when
 * the place itself is present. Preserve the selected wilaya as the preferred
 * attempt, then use the country-only context exactly once as a fallback.
 */
export function buildGeocodeQueries(query: string, wilaya: string | null) {
  const countryQuery = buildGeocodeQuery(query, null);
  return wilaya
    ? [buildGeocodeQuery(query, wilaya), countryQuery]
    : [countryQuery];
}

export type GeocodeProvider = "photon" | "nominatim";
export type GeocodeAttempt = "context" | "country_fallback";

/**
 * Runs each provider's context and country fallback in a fixed order. A null
 * result or a thrown provider error never aborts the remaining attempts.
 */
export async function runProviderFallbackChain<T>(
  queries: string[],
  search: (
    provider: GeocodeProvider,
    attempt: GeocodeAttempt,
    contextQuery: string,
  ) => Promise<T | null>,
) {
  for (const provider of ["photon", "nominatim"] as const) {
    for (const [index, contextQuery] of queries.entries()) {
      const attempt: GeocodeAttempt = index === 0 ? "context" : "country_fallback";
      try {
        const candidate = await search(provider, attempt, contextQuery);
        if (candidate !== null) return { provider, candidate };
      } catch {
        // The caller logs provider failures; continuing preserves the fallback.
      }
    }
  }

  return null;
}

function normalizeForMatch(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

/** Accept longer provider names such as "Kiffa Department" without accepting unrelated places. */
export function matchesGeocodeCandidate(
  query: string,
  candidateName: string | undefined,
  candidateDisplayName: string | undefined,
) {
  const normalizedQuery = normalizeForMatch(query);
  if (!normalizedQuery) return false;

  return (
    normalizeForMatch(candidateName ?? "").includes(normalizedQuery) ||
    normalizeForMatch(candidateDisplayName ?? "").includes(normalizedQuery)
  );
}

import { normalizeSearchText } from "./searchMatching";
import type { PlaceTypeKey } from "./placeTypes";

export const CLIENT_SEARCH_RESULTS_PER_PAGE = 5;

type ClientSearchResultCandidate = {
  name: string;
  name_ar?: string | null;
  place_types?: readonly PlaceTypeKey[] | null;
};

type ClientSearchLocationCandidate = {
  neighborhood?: string | null;
  address?: string | null;
  city?: string | null;
};

export type ClientSearchResultPage<T> = {
  items: T[];
  page: number;
  totalCount: number;
  totalPages: number;
};

function normalizeClientResultName(value: string): string {
  return normalizeSearchText(value)
    .replaceAll("ـ", "")
    .replaceAll("ى", "ي")
    .replaceAll("ة", "ه");
}

export function isStrongExactClientSearchResult(
  result: ClientSearchResultCandidate,
  query: string,
): boolean {
  const normalizedQuery = normalizeClientResultName(query);
  if (!normalizedQuery) return false;

  return [result.name, result.name_ar].some(
    (name) =>
      typeof name === "string" &&
      normalizeClientResultName(name) === normalizedQuery,
  );
}

const geographicPlaceTypes = new Set<PlaceTypeKey>([
  "region",
  "moughataa",
  "wilaya",
]);

function isGeographicClientSearchResult(
  result: ClientSearchResultCandidate,
): boolean {
  return result.place_types?.some((type) => geographicPlaceTypes.has(type)) ?? false;
}

/**
 * Keep the RPC's relevance order within each tier, while making exact visible
 * names deterministic on the client. Exact geographic records win ties so an
 * imported place cannot be hidden behind a business with the same name.
 */
export function rankClientSearchResults<
  T extends ClientSearchResultCandidate,
>(results: readonly T[], query: string): T[] {
  return results
    .map((result, index) => ({
      result,
      index,
      rank: isStrongExactClientSearchResult(result, query)
        ? isGeographicClientSearchResult(result)
          ? 0
          : 1
        : 2,
    }))
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .map(({ result }) => result);
}

/**
 * An explicit map alternative is useful only when every parsed internal row
 * is a partial match. A count mismatch fails closed because an omitted row may
 * have been the exact internal place the user wanted.
 */
export function shouldOfferClientSearchMapOption<
  T extends ClientSearchResultCandidate,
>(results: readonly T[], reportedResultsCount: number, query: string): boolean {
  if (
    !normalizeSearchText(query) ||
    results.length === 0 ||
    reportedResultsCount !== results.length
  ) {
    return false;
  }

  return results.every(
    (result) => !isStrongExactClientSearchResult(result, query),
  );
}

/**
 * A single parsed row is not enough to prove that a result is unambiguous:
 * the RPC count also has to confirm that no malformed or omitted row existed.
 */
export function getAutoSelectedClientSearchResult<
  T extends ClientSearchResultCandidate,
>(results: readonly T[], reportedResultsCount: number, query: string): T | null {
  if (reportedResultsCount !== 1 || results.length !== 1) return null;
  if (isGeographicClientSearchResult(results[0])) return null;
  return isStrongExactClientSearchResult(results[0], query) ? results[0] : null;
}

export function formatClientSearchChoiceLocation(
  location: ClientSearchLocationCandidate,
): string {
  const seen = new Set<string>();

  return [location.neighborhood, location.address, location.city]
    .map((value) => value?.trim())
    .filter((value): value is string => {
      if (!value) return false;
      const normalizedValue = normalizeSearchText(value);
      if (seen.has(normalizedValue)) return false;
      seen.add(normalizedValue);
      return true;
    })
    .join(" · ");
}

export function getClientSearchResultPage<T>(
  results: readonly T[],
  requestedPage: number,
): ClientSearchResultPage<T> {
  const totalCount = results.length;
  const totalPages = Math.ceil(totalCount / CLIENT_SEARCH_RESULTS_PER_PAGE);
  const normalizedPage = Number.isFinite(requestedPage)
    ? Math.max(1, Math.floor(requestedPage))
    : 1;
  const page = Math.min(normalizedPage, Math.max(1, totalPages));
  const start = (page - 1) * CLIENT_SEARCH_RESULTS_PER_PAGE;

  return {
    items: results.slice(start, start + CLIENT_SEARCH_RESULTS_PER_PAGE),
    page,
    totalCount,
    totalPages,
  };
}

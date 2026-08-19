export type SearchMatchCandidate = {
  name: string
}

/**
 * Makes local search forgiving without changing the source value that is
 * eventually displayed. Accents, casing and repeated spaces never affect a
 * match.
 */
export function normalizeSearchText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Prefix matches are more useful while typing, so they always precede broader
 * contains matches. The order within each group remains the catalogue order.
 */
export function getSearchSuggestions<T extends SearchMatchCandidate>(
  candidates: readonly T[],
  query: string,
  limit = 6,
): T[] {
  const normalizedQuery = normalizeSearchText(query)
  if (normalizedQuery.length < 2 || limit < 1) return []

  const startsWith: T[] = []
  const contains: T[] = []

  for (const candidate of candidates) {
    const normalizedName = normalizeSearchText(candidate.name)
    if (normalizedName.startsWith(normalizedQuery)) startsWith.push(candidate)
    else if (normalizedName.includes(normalizedQuery)) contains.push(candidate)
  }

  return [...startsWith, ...contains].slice(0, limit)
}

function levenshteinDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    let diagonal = previous[0]
    previous[0] = leftIndex

    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const above = previous[rightIndex]
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1
      previous[rightIndex] = Math.min(
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + 1,
        diagonal + substitutionCost,
      )
      diagonal = above
    }
  }

  return previous[right.length]
}

/**
 * Returns a correction only for a genuinely close name. The cap avoids turning
 * an unrelated query into a misleading recommendation.
 */
export function findClosestSearchMatch<T extends SearchMatchCandidate>(
  candidates: readonly T[],
  query: string,
): T | null {
  const normalizedQuery = normalizeSearchText(query)
  if (normalizedQuery.length < 2) return null

  let closest: T | null = null
  let closestDistance = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    const candidateName = normalizeSearchText(candidate.name)
    const distance = levenshteinDistance(normalizedQuery, candidateName)
    if (distance < closestDistance) {
      closest = candidate
      closestDistance = distance
    }
  }

  const maximumDistance = Math.min(3, Math.max(1, Math.ceil(normalizedQuery.length * 0.34)))
  return closestDistance <= maximumDistance ? closest : null
}

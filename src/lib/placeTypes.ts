/** Stable, database-safe type keys used only by the administrator import flow. */
export const PLACE_TYPE_KEYS = [
  'establishment',
  'company',
  'region',
  'moughataa',
  'wilaya',
  'sports_hall',
  'restaurant',
  'hall',
  'administration',
  'private',
  'public',
] as const

export type PlaceTypeKey = (typeof PLACE_TYPE_KEYS)[number]

const placeTypeKeySet = new Set<string>(PLACE_TYPE_KEYS)

export function isPlaceTypeKey(value: unknown): value is PlaceTypeKey {
  return typeof value === 'string' && placeTypeKeySet.has(value)
}

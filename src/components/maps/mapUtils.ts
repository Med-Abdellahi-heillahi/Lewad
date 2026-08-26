export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
}

export function mapUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

export function hasCoordinates(value: { latitude: number | null; longitude: number | null }): boolean {
  return typeof value.latitude === 'number'
    && typeof value.longitude === 'number'
    && Number.isFinite(value.latitude)
    && Number.isFinite(value.longitude)
    && value.latitude >= -90
    && value.latitude <= 90
    && value.longitude >= -180
    && value.longitude <= 180
}

export const NOUAKCHOTT_CENTER = { lat: 18.0856, lng: -15.9785 } as const
export const DEFAULT_ZOOM = 12 as const
export const PICKER_ZOOM = 15 as const

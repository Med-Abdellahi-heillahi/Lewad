import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { directionsUrl, hasCoordinates } from '../src/components/maps/mapUtils'

const searchViewPath = new URL('../src/components/AppDemo.tsx', import.meta.url)
const mapSheetPath = new URL('../src/components/maps/ServiceMapSheet.tsx', import.meta.url)
const serviceWorkerPath = new URL('../public/sw.js', import.meta.url)

describe('search result map contracts', () => {
  it('creates a plain external directions URL only for valid coordinate pairs', () => {
    expect(directionsUrl(18.0856, -15.9785)).toBe('https://www.google.com/maps/dir/?api=1&destination=18.0856,-15.9785')
    expect(hasCoordinates({ latitude: 18.0856, longitude: -15.9785 })).toBe(true)
    expect(hasCoordinates({ latitude: null, longitude: -15.9785 })).toBe(false)
    expect(hasCoordinates({ latitude: 91, longitude: -15.9785 })).toBe(false)
    expect(hasCoordinates({ latitude: 18.0856, longitude: -181 })).toBe(false)
  })

  it('keeps branch map actions secondary and shows a translated fallback without coordinates', () => {
    const source = readFileSync(searchViewPath, 'utf8').replaceAll('\r\n', '\n')

    expect(source).toMatch(/nearbyPlace:\s*['"]Lieu proche['"]/
    )
    expect(source).toMatch(/nearbyPlace:\s*['"]المكان القريب['"]/
    )
    expect(source).toMatch(/nearbyPlace:\s*['"]Nearby place['"]/
    )
    expect(source).toContain('copy.locationUnavailable')
    expect(source).toContain('onViewMap={openMap}')
    expect(source).toContain('aria-label={copy.viewOnMap}')
    expect(source).toContain('aria-label={copy.directionsLink}')
  })

  it('keeps the map sheet lazy, dismissible, and independent from tile caching', () => {
    const searchSource = readFileSync(searchViewPath, 'utf8').replaceAll('\r\n', '\n')
    const mapSheetSource = readFileSync(mapSheetPath, 'utf8')
    const serviceWorkerSource = readFileSync(serviceWorkerPath, 'utf8')

    expect(searchSource).toMatch(/lazy\(\(\)\s*=>\s*import\(['"]\.\/maps\/ServiceMapSheet['"]\)/)
    expect(mapSheetSource).toContain('selectedBranchId?: string')
    expect(mapSheetSource).toContain("event.key === 'Escape'")
    expect(mapSheetSource).toContain('onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}')
    expect(serviceWorkerSource).toContain("if (url.origin !== self.location.origin) return")
  })
})

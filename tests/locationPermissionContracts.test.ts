import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const formPath = new URL('../src/components/BusinessSubmissionForm.tsx', import.meta.url)
const mapPickerPath = new URL('../src/components/map/MapLocationPicker.tsx', import.meta.url)
const frenchCopyPath = new URL('../src/i18n/fr.ts', import.meta.url)
const arabicCopyPath = new URL('../src/i18n/ar.ts', import.meta.url)
const englishCopyPath = new URL('../src/i18n/en.ts', import.meta.url)

describe('business submission location permission', () => {
  it('requests the browser location only from the explicit current-position action', () => {
    const source = readFileSync(mapPickerPath, 'utf8')
    const handlerStart = source.indexOf('function useCurrentPosition()')
    const handlerEnd = source.indexOf('\n  return (', handlerStart)

    expect(handlerStart).toBeGreaterThan(-1)
    expect(handlerEnd).toBeGreaterThan(handlerStart)
    expect(source.slice(0, handlerStart)).not.toContain('getCurrentPosition')
    expect(source.slice(handlerStart, handlerEnd)).toContain('navigator.geolocation.getCurrentPosition')
    expect(source).toContain('onClick={useCurrentPosition}')
  })

  it('keeps coordinates internal and requires a marker selected through the map picker', () => {
    const formSource = readFileSync(formPath, 'utf8')
    const pickerSource = readFileSync(mapPickerPath, 'utf8')

    expect(formSource).toContain('<MapLocationPicker')
    expect(formSource).toContain('latitude: mapLocation.latitude')
    expect(formSource).toContain('longitude: mapLocation.longitude')
    expect(formSource).not.toContain('id="latitude"')
    expect(formSource).not.toContain('id="longitude"')
    expect(pickerSource).toContain('useMapEvents')
    expect(pickerSource).toContain('onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng })')
    expect(pickerSource).toContain('onClick={useCurrentPosition}')
    expect(pickerSource).toContain('onClick={selectMapCenter}')
  })

  it('uses the required map-only helper and validation copy in every supported language', () => {
    const frenchCopy = readFileSync(frenchCopyPath, 'utf8')
    const arabicCopy = readFileSync(arabicCopyPath, 'utf8')
    const englishCopy = readFileSync(englishCopyPath, 'utf8')

    expect(frenchCopy).toContain('Pas besoin de connaître la latitude ou la longitude. Touchez simplement la carte.')
    expect(frenchCopy).toContain('Veuillez sélectionner l’emplacement sur la carte.')
    expect(arabicCopy).toContain('لا تحتاج إلى معرفة خطوط الطول والعرض. فقط اضغط على الخريطة.')
    expect(arabicCopy).toContain('يرجى تحديد الموقع على الخريطة.')
    expect(englishCopy).toContain('You do not need to know latitude or longitude. Just tap the map.')
    expect(englishCopy).toContain('Please select the location on the map.')
  })
})

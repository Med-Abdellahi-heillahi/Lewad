import type { Map as LeafletMap } from 'leaflet'
import { CircleMarker, MapContainer, TileLayer, useMapEvents, ZoomControl } from 'react-leaflet'
import { useState } from 'react'
import 'leaflet/dist/leaflet.css'
import './MapLocationPicker.css'
import { btnGhost, fieldHint, fieldLabel } from '../../lib/ui'
import { Icon } from '../Icon'

export type MapCoordinates = {
  latitude: number
  longitude: number
}

type MapLocationPickerCopy = {
  mapPickerLabel: string
  mapPickerHelper: string
  mapPickerKeyboardHint: string
  useCurrentPosition: string
  locatingCurrentPosition: string
  currentPositionDenied: string
  currentPositionUnavailable: string
  markerPlaced: string
  placeMarker: string
  zoomIn: string
  zoomOut: string
  attribution: string
}

type MapLocationPickerProps = {
  copy: MapLocationPickerCopy
  value: MapCoordinates | null
  onChange: (coordinates: MapCoordinates) => void
  error?: string
}

type PositionState = 'idle' | 'loading' | 'denied' | 'unavailable'

const DEFAULT_CENTER: [number, number] = [18.0735, -15.9582]
const DEFAULT_ZOOM = 12
const MAP_TILE_TEMPLATE = import.meta.env.VITE_MAP_TILE_URL ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

function MapClickHandler({ onChange }: Pick<MapLocationPickerProps, 'onChange'>) {
  useMapEvents({
    click(event) {
      onChange({ latitude: event.latlng.lat, longitude: event.latlng.lng })
    },
  })

  return null
}

export function MapLocationPicker({ copy, value, onChange, error }: MapLocationPickerProps) {
  const [map, setMap] = useState<LeafletMap | null>(null)
  const [positionState, setPositionState] = useState<PositionState>('idle')
  const helperId = 'business-submission-map-helper'
  const keyboardHintId = 'business-submission-map-keyboard-hint'
  const errorId = error ? 'business-submission-map-error' : undefined

  function selectMapCenter() {
    if (!map) return

    const center = map.getCenter()
    onChange({ latitude: center.lat, longitude: center.lng })
  }

  function useCurrentPosition() {
    if (!navigator.geolocation) {
      setPositionState('unavailable')
      return
    }

    setPositionState('loading')
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        map?.setView([coordinates.latitude, coordinates.longitude], Math.max(map.getZoom(), DEFAULT_ZOOM))
        onChange(coordinates)
        setPositionState('idle')
      },
      (positionError) => {
        setPositionState(positionError.code === 1 ? 'denied' : 'unavailable')
      },
      { enableHighAccuracy: true, maximumAge: 300_000, timeout: 10_000 },
    )
  }

  return (
    <fieldset className="grid gap-3">
      <legend className={fieldLabel}>{copy.mapPickerLabel}</legend>
      <p id={helperId} className="-mt-1 text-sm leading-6 text-muted">{copy.mapPickerHelper}</p>
      <p id={keyboardHintId} className={fieldHint}>{copy.mapPickerKeyboardHint}</p>

      <div className={`h-64 overflow-hidden rounded-xl border sm:h-72 ${error ? 'border-ask ring-2 ring-ask/15' : 'border-line'}`} aria-invalid={Boolean(error) || undefined} aria-errormessage={errorId}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          minZoom={3}
          maxZoom={18}
          zoomControl={false}
          scrollWheelZoom={false}
          keyboard
          className="lewad-map-picker h-full w-full"
          aria-label={copy.mapPickerLabel}
          aria-describedby={`${helperId} ${keyboardHintId}`}
          ref={setMap}
        >
          <TileLayer
            attribution={`&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">${copy.attribution}</a>`}
            url={MAP_TILE_TEMPLATE}
          />
          <MapClickHandler onChange={onChange} />
          {value && (
            <CircleMarker
              center={[value.latitude, value.longitude]}
              radius={11}
              pathOptions={{ color: 'var(--brand-deep)', fillColor: 'var(--brand)', fillOpacity: 1, weight: 3 }}
            />
          )}
          <ZoomControl position="topright" zoomInTitle={copy.zoomIn} zoomOutTitle={copy.zoomOut} />
        </MapContainer>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className={btnGhost} disabled={positionState === 'loading'} onClick={useCurrentPosition}>
          {positionState === 'loading' ? copy.locatingCurrentPosition : copy.useCurrentPosition}
        </button>
        <button type="button" className={btnGhost} disabled={!map} onClick={selectMapCenter}>{copy.placeMarker}</button>
        {value && <p className="inline-flex items-center gap-1.5 text-sm font-medium text-answer" role="status"><Icon name="check" size={16} />{copy.markerPlaced}</p>}
      </div>

      {positionState === 'denied' && <p className={fieldHint} role="status">{copy.currentPositionDenied}</p>}
      {positionState === 'unavailable' && <p className={fieldHint} role="status">{copy.currentPositionUnavailable}</p>}
      {error && <p id={errorId} className="text-xs text-ask" role="alert">{error}</p>}
    </fieldset>
  )
}

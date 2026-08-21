import { useEffect, useRef, useState } from 'react'
import type { Db2Branch } from '../../lib/db2'
import { directionsUrl, hasCoordinates, NOUAKCHOTT_CENTER, DEFAULT_ZOOM } from './mapUtils'

type ServiceMapCopy = {
  mainBranch: string
  nearbyPlace: string
  directionsLink: string
  locationUnavailable: string
  mapSheetTitle: string
  mapCloseLabel: string
  mapUnavailable: string
  mapLoading: string
  openExternalMap: string
}

type ServiceMapSheetProps = {
  copy: ServiceMapCopy
  branches: Db2Branch[]
  selectedBranchId?: string
  onClose: () => void
}

export function ServiceMapSheet({ copy, branches, selectedBranchId, onClose }: ServiceMapSheetProps) {
  const mappableBranches = branches.filter(hasCoordinates)
  const mainBranch = branches.find((branch) => branch.is_main) ?? branches[0]
  const selectedBranch = branches.find((branch) => branch.id === selectedBranchId)
  const destinationBranch = selectedBranch && hasCoordinates(selectedBranch)
    ? selectedBranch
    : mainBranch && hasCoordinates(mainBranch)
      ? mainBranch
      : mappableBranches[0]
  const destinationCoords = destinationBranch && hasCoordinates(destinationBranch)
    ? { lat: destinationBranch.latitude!, lng: destinationBranch.longitude! }
    : null
  const mapRef = useRef<HTMLDivElement>(null)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [onClose])

  useEffect(() => {
    if (!mapRef.current || mapReady || mapError) return
    let cancelled = false
    let leafletMap: { remove: () => void } | null = null

    const loadMap = async () => {
      try {
        const L = await import('leaflet')
        await import('leaflet/dist/leaflet.css')
        if (cancelled || !mapRef.current) return

        const center = destinationCoords
          ? destinationCoords
          : NOUAKCHOTT_CENTER

        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        const map = L.map(mapRef.current, {
          center: [center.lat, center.lng],
          zoom: DEFAULT_ZOOM,
          scrollWheelZoom: false,
          zoomAnimation: !prefersReducedMotion,
          fadeAnimation: !prefersReducedMotion,
        })
        leafletMap = map

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(map)

        const markerColors: Record<string, string> = {}
        mappableBranches.forEach((branch) => {
          const isMain = branch.is_main
          const color = isMain ? 'var(--brand-deep, #6366f1)' : 'var(--muted, #9ca3af)'
          const icon = L.divIcon({
            className: '',
            html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);display:grid;place-items:center"><div style="width:8px;height:8px;background:white;border-radius:50%"></div></div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          })
          L.marker([branch.latitude!, branch.longitude!], { icon, title: branch.name })
            .addTo(map)
        })

        if (!selectedBranch && mappableBranches.length > 0) {
          const bounds = L.latLngBounds(mappableBranches.map((b) => [b.latitude!, b.longitude!] as [number, number]))
          map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 })
        }

        setMapReady(true)
      } catch {
        if (!cancelled) setMapError(true)
      }
    }

    loadMap()
    return () => {
      cancelled = true
      leafletMap?.remove()
    }
  }, [branches, selectedBranchId, copy.mainBranch])

  return (
    <div className="fixed inset-0 z-60 grid place-items-end bg-ink/40 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-4" role="dialog" aria-modal="true" aria-labelledby="service-map-title" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div
        className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 id="service-map-title" className="text-sm font-bold text-ink">{copy.mapSheetTitle}</h2>
          <button type="button" onClick={onClose} className="inline-flex size-11 items-center justify-center rounded-lg text-ink-soft hover:bg-surface-2" aria-label={copy.mapCloseLabel}>
            ✕
          </button>
        </div>

        <div className="relative h-[45vh] min-h-60 sm:h-80">
          {mapError && <div className="absolute inset-0 grid place-items-center bg-surface p-6 text-center"><p className="text-sm text-muted">{copy.mapUnavailable}</p></div>}
          {!mapError && !mapReady && <div className="absolute inset-0 grid place-items-center bg-surface"><span className="text-sm text-muted">{copy.mapLoading}</span></div>}
          <div ref={mapRef} className="size-full" />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
          <div className="min-w-0">
            {destinationBranch && <p className="truncate text-sm font-semibold text-ink">{destinationBranch.name}</p>}
            {destinationBranch && <p className="mt-0.5 truncate text-xs text-muted"><span className="font-semibold text-ink-soft">{copy.nearbyPlace}</span>{' · '}{destinationBranch.neighborhood ?? destinationBranch.address ?? destinationBranch.city ?? copy.locationUnavailable}</p>}
            {destinationCoords && <p className="mt-0.5 text-xs text-muted ltr-isolate tabular">{destinationCoords.lat.toFixed(5)}, {destinationCoords.lng.toFixed(5)}</p>}
          </div>
          <div className="flex gap-2">
            {destinationCoords && (
              <a className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-2.5 text-[13px] font-semibold text-ink-soft hover:bg-surface-2" href={directionsUrl(destinationCoords.lat, destinationCoords.lng)} target="_blank" rel="noreferrer">
                {copy.directionsLink}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

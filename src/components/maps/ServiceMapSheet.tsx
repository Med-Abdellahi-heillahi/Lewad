import { useEffect, useRef, useState } from 'react'
import type { Db2Branch } from '../../lib/db2'
import { Icon } from '../Icon'
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
  const panelRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)
  const [mapReady, setMapReady] = useState(false)
  const [mapError, setMapError] = useState(false)

  useEffect(() => {
    restoreFocusRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null
    const previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 20)

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }

      if (event.key !== 'Tab' || !panelRef.current) return
      const focusableElements = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (focusableElements.length === 0) {
        event.preventDefault()
        panelRef.current.focus()
        return
      }

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault()
        lastElement.focus()
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault()
        firstElement.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousBodyOverflow
      if (restoreFocusRef.current?.isConnected) restoreFocusRef.current.focus()
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

        mappableBranches.forEach((branch) => {
          const isMain = branch.is_main
          const color = isMain ? 'var(--brand-deep)' : 'var(--muted)'
          const icon = L.divIcon({
            className: '',
            html: `<div style="width:28px;height:28px;border-radius:50%;background:${color};border:3px solid var(--surface);box-shadow:0 2px 8px var(--line-strong);display:grid;place-items:center"><div style="width:8px;height:8px;background:var(--surface);border-radius:50%"></div></div>`,
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
    <div
      className="fixed inset-0 z-60 grid place-items-end overscroll-contain bg-ink/40 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="service-map-title"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        tabIndex={-1}
        className="flex h-[88dvh] max-h-[48rem] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-line bg-gradient-to-br from-surface via-surface to-tint-1/20 shadow-2xl sm:h-auto sm:max-h-[80vh] sm:rounded-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-line bg-surface/95 px-4 py-3 backdrop-blur">
          <h2 id="service-map-title" className="text-sm font-bold text-ink">{copy.mapSheetTitle}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="inline-flex size-11 items-center justify-center rounded-xl border border-transparent text-ink-soft transition hover:border-line hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-deep"
            aria-label={copy.mapCloseLabel}
            title={copy.mapCloseLabel}
          >
            <Icon name="close" size={19} />
          </button>
        </div>

        <div className="relative min-h-0 flex-1 sm:h-80 sm:min-h-60 sm:flex-none">
          {mapError && <div className="absolute inset-0 grid place-items-center bg-surface p-6 text-center"><p className="text-sm text-muted">{copy.mapUnavailable}</p></div>}
          {!mapError && !mapReady && <div className="absolute inset-0 grid place-items-center bg-surface"><span className="text-sm text-muted">{copy.mapLoading}</span></div>}
          <div ref={mapRef} className="size-full" />
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-line bg-surface/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:py-3">
          <div className="min-w-0">
            {destinationBranch && <p dir="auto" className="truncate text-sm font-semibold text-ink">{destinationBranch.name}</p>}
            {destinationBranch && <p className="mt-0.5 truncate text-xs text-muted"><span className="font-semibold text-ink-soft">{copy.nearbyPlace}</span>{' · '}{destinationBranch.neighborhood ?? destinationBranch.address ?? destinationBranch.city ?? copy.locationUnavailable}</p>}
            {destinationCoords && <p className="mt-0.5 text-xs text-muted ltr-isolate tabular">{destinationCoords.lat.toFixed(5)}, {destinationCoords.lng.toFixed(5)}</p>}
          </div>
          <div className="grid shrink-0 gap-2 sm:flex">
            {destinationCoords && (
              <a className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-[13px] font-semibold text-ink-soft transition hover:border-line-strong hover:bg-surface-2 hover:text-ink sm:w-auto" href={directionsUrl(destinationCoords.lat, destinationCoords.lng)} target="_blank" rel="noreferrer">
                {copy.directionsLink}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

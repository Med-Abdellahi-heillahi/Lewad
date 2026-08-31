import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { getPublicActivityStats, type PublicActivityStats } from '../lib/analytics'
import { formatNumber } from '../lib/format'

const REFRESH_INTERVAL_MS = 60_000

type LandingActivityCounterProps = {
  className?: string
  fullWidth?: boolean
}

/** Compact public aggregate. It never reads privileged analytics or raw events. */
export function LandingActivityCounter({ className = '', fullWidth = false }: LandingActivityCounterProps) {
  const { locale, t } = useI18n()
  const [stats, setStats] = useState<PublicActivityStats | null>(null)

  useEffect(() => {
    let active = true

    const refresh = () => {
      void getPublicActivityStats().then((next) => {
        if (active) setStats(next)
      })
    }

    refresh()
    const interval = window.setInterval(refresh, REFRESH_INTERVAL_MS)
    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [])

  const estimate = stats?.estimatedActivity
  const visibleLabel = estimate === undefined
    ? t.nav.activityFallback
    : `+${formatNumber(estimate, locale)} ${t.nav.activityEstimatedVisits}`

  return (
    <span
      className={`inline-flex min-h-9 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full border border-line bg-surface/90 px-3 text-[11px] font-bold text-ink-soft shadow-sm backdrop-blur-sm ${fullWidth ? 'w-full' : 'w-[11.5rem]'} ${className}`}
      title={t.nav.activityEstimateHint}
      aria-label={`${visibleLabel}. ${t.nav.activityEstimateHint}`}
    >
      <span
        aria-hidden="true"
        className={`size-2 shrink-0 rounded-full ring-4 ${estimate === undefined ? 'bg-muted/50 ring-surface-2' : 'bg-answer ring-answer-bg'}`}
      />
      {estimate === undefined ? (
        <span className="truncate">{t.nav.activityFallback}</span>
      ) : (
        <span className="min-w-0 truncate whitespace-nowrap">
          <bdi dir="ltr" className="tabular text-ink">+{formatNumber(estimate, locale)}</bdi>{' '}
          <span>{t.nav.activityEstimatedVisits}</span>
        </span>
      )}
    </span>
  )
}

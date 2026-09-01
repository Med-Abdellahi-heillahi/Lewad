import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Activity, BarChart3, CalendarDays, Clock, Eye, Languages, RefreshCw, Smartphone,
  TrendingUp, UserCheck, UsersRound, UserX,
} from 'lucide-react'
import { useI18n, type Locale } from '../../i18n'
import {
  getPublicActivityStats,
  getSuperAdminAnalyticsSummary,
  type PublicActivityStats,
  type SuperAdminAnalyticsSummary,
} from '../../lib/analytics'
import { btnGhost, card } from '../../lib/ui'
import { AdminBarChart } from '../admin/AdminCharts'
import { AdminMetricCard, AdminSectionHeader, type AdminIcon } from '../admin/AdminUi'
import { EmptyState, InlineAlert, LoadingCard } from '../system/States'
import { analyticsCopy } from './analyticsCopy'

const dateLocales: Record<Locale, string> = { fr: 'fr-FR', ar: 'ar-u-nu-latn', en: 'en-US' }

function formatCoarseActivityTime(value: string, locale: Locale) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(dateLocales[locale], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

/** Privacy-safe aggregate analytics reserved for the existing Super Admin guard. */
export function SuperAdminAnalytics() {
  const { locale } = useI18n()
  const copy = analyticsCopy[locale]
  const [summary, setSummary] = useState<SuperAdminAnalyticsSummary | null>(null)
  const [publicStats, setPublicStats] = useState<PublicActivityStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const requestId = useRef(0)

  const refresh = useCallback(async () => {
    const currentRequest = ++requestId.current
    setLoading(true)
    setLoadFailed(false)

    const [nextSummary, nextPublicStats] = await Promise.all([
      getSuperAdminAnalyticsSummary(),
      getPublicActivityStats(),
    ])
    if (requestId.current !== currentRequest) return

    setSummary((current) => nextSummary ?? current)
    setPublicStats((current) => nextPublicStats ?? current)
    setLoadFailed(nextSummary === null)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
    return () => {
      requestId.current += 1
    }
  }, [refresh])

  const header = (
    <header className={`${card} border-brand/45 p-4 sm:p-6`}>
      <AdminSectionHeader
        icon={BarChart3}
        title={copy.title}
        text={copy.text}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex min-h-9 items-center rounded-full bg-brand-soft px-3 text-[11px] font-bold text-brand-deep">
              {copy.badge}
            </span>
            <button
              type="button"
              className={`${btnGhost} min-h-11 px-3`}
              onClick={() => void refresh()}
              disabled={loading}
              aria-label={loading ? copy.refreshing : copy.refresh}
              title={loading ? copy.refreshing : copy.refresh}
            >
              <RefreshCw size={16} aria-hidden className={loading ? 'motion-safe:animate-spin' : undefined} />
              <span className="hidden sm:inline">{loading ? copy.refreshing : copy.refresh}</span>
            </button>
          </div>
        )}
      />
    </header>
  )

  if (loading && !summary) {
    return (
      <div className="space-y-5">
        {header}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => <LoadingCard key={index} label={copy.loading} lines={2} />)}
        </div>
        <div className="grid gap-3 xl:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => <LoadingCard key={index} label={copy.loading} lines={5} />)}
        </div>
      </div>
    )
  }

  if (!summary) {
    return (
      <div className="space-y-5">
        {header}
        <EmptyState
          icon="alert"
          title={copy.unavailableTitle}
          text={copy.unavailableText}
          action={<button type="button" className={btnGhost} onClick={() => void refresh()}>{copy.retry}</button>}
        />
      </div>
    )
  }

  const metrics: { icon: AdminIcon; label: string; value: number | string; hint?: string }[] = [
    { icon: Eye, label: copy.metrics.totalVisits, value: summary.totalPageViews },
    { icon: Activity, label: copy.metrics.activeNow, value: summary.activeSessionsNow },
    { icon: Clock, label: copy.metrics.today, value: summary.visitsToday },
    { icon: CalendarDays, label: copy.metrics.week, value: summary.visits7Days },
    { icon: BarChart3, label: copy.metrics.month, value: summary.visits30Days },
    { icon: UsersRound, label: copy.metrics.uniqueSessions, value: summary.uniqueSessions },
    { icon: TrendingUp, label: copy.metrics.estimated, value: publicStats?.estimatedActivity ?? '—', hint: copy.metrics.estimatedHint },
    { icon: UserCheck, label: copy.metrics.authenticated, value: summary.authBreakdown.authenticated },
    { icon: UserX, label: copy.metrics.anonymous, value: summary.authBreakdown.anonymous },
  ]

  const pageData = summary.topPages.map((item) => ({ label: `\u2066${item.path}\u2069`, value: item.count }))
  const eventData = summary.topEventTypes.map((item) => ({ label: copy.eventLabels[item.eventType], value: item.count }))
  const deviceData = summary.deviceBreakdown.map((item) => ({ label: copy.deviceLabels[item.deviceType], value: item.count }))
  const localeData = summary.localeBreakdown.map((item) => ({ label: copy.localeLabels[item.locale], value: item.count }))

  return (
    <div className="space-y-5">
      {header}

      {loadFailed && (
        <InlineAlert
          tone="error"
          title={copy.unavailableTitle}
          action={<button type="button" className={btnGhost} onClick={() => void refresh()}>{copy.retry}</button>}
        >
          {copy.unavailableText}
        </InlineAlert>
      )}

      <section className="space-y-3" aria-label={copy.title}>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <AdminMetricCard key={metric.label} icon={metric.icon} label={metric.label} value={metric.value} hint={metric.hint} />
          ))}
        </div>
      </section>

      <div className="grid min-w-0 gap-3 xl:grid-cols-2">
        <AdminBarChart icon={Eye} title={copy.sections.topPages} text={copy.sections.topPagesText} data={pageData} emptyLabel={copy.empty} />
        <AdminBarChart icon={BarChart3} title={copy.sections.eventTypes} text={copy.sections.eventTypesText} data={eventData} emptyLabel={copy.empty} />
        <AdminBarChart icon={Smartphone} title={copy.sections.devices} text={copy.sections.devicesText} data={deviceData} emptyLabel={copy.empty} />
        <AdminBarChart icon={Languages} title={copy.sections.locales} text={copy.sections.localesText} data={localeData} emptyLabel={copy.empty} />
      </div>

      <section className={`${card} p-4 sm:p-5`}>
        <AdminSectionHeader icon={Activity} title={copy.sections.recent} text={copy.sections.recentText} />
        {summary.recentEvents.length === 0 ? (
          <p className="mt-5 rounded-xl border border-line bg-surface-2 px-4 py-6 text-center text-sm text-muted">{copy.empty}</p>
        ) : (
          <ol className="mt-5 grid list-none gap-2.5">
            {summary.recentEvents.map((event, index) => (
              <li key={`${event.createdMinute}-${event.eventType}-${event.path}-${index}`} className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-page-alt px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-soft">
                    <Activity size={16} aria-hidden />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink">{copy.eventLabels[event.eventType]}</p>
                    <p className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                      <bdi dir="ltr" className="max-w-full truncate font-semibold text-ink-soft">{event.path}</bdi>
                      <span aria-hidden>·</span>
                      <span>{copy.deviceLabels[event.deviceType]}</span>
                      <span aria-hidden>·</span>
                      <span>{copy.localeLabels[event.locale]}</span>
                    </p>
                  </div>
                </div>
                <time dateTime={event.createdMinute} className="shrink-0 text-xs font-medium text-muted sm:text-end">
                  {formatCoarseActivityTime(event.createdMinute, locale)}
                </time>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}

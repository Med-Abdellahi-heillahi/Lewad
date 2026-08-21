import { useMemo } from 'react'
import {
  Activity, AlertTriangle, Bell, Building2, CheckCircle, ChartPie, ClipboardList, Clock, CreditCard,
  DatabaseBackup, ListChecks, MapPin, RefreshCw, Search, ShieldCheck, TrendingDown, TrendingUp,
  UserCheck, UserRoundCog, UsersRound, UserX, Wallet,
} from 'lucide-react'
import { useI18n } from '../../i18n'
import {
  ANALYTICS_WINDOWS, buildAdminAlerts,
  type AdminAlertId, type AdminAnalytics, type AdminAnalyticsWindow, type AdminOverview, type AdminServices,
} from '../../lib/admin'
import { formatNumber } from '../../lib/format'
import { btnGhost, card } from '../../lib/ui'
import { Reveal } from '../Reveal'
import { EmptyState, LoadingCard } from '../system/States'
import { AdminAlertCard, AdminMetricCard, AdminSectionHeader, type AdminIcon } from '../admin/AdminUi'
import { AdminAreaChart, AdminBarChart, AdminDonutChart, type AdminBarDatum } from '../admin/AdminCharts'
import { adminCopy } from '../admin/adminCopy'

/**
 * Tableau de bord Super Admin.
 *
 * Toutes les valeurs viennent de `getAdminAnalytics` / `getAdminOverview`, qui
 * lisent la base dans la portée RLS admin déjà en place — aucune policy n'est
 * élargie et aucune donnée n'est inventée. Un indicateur qu'on ne peut pas lire
 * (module recharge absent) affiche son libellé « indisponible », jamais un zéro
 * qui se lirait comme une mesure réelle.
 */

const alertIcons: Record<AdminAlertId, AdminIcon> = {
  pendingRequests: ListChecks,
  emptyWallets: Wallet,
  notFoundRate: TrendingDown,
  searchErrors: AlertTriangle,
  establishmentsWithoutBranch: Building2,
  branchesWithoutCoordinates: MapPin,
  rechargeManual: Clock,
  businessSubmissions: Bell,
  backupCheck: DatabaseBackup,
}

type SuperAdminOverviewProps = {
  overview: AdminOverview | null
  analytics: AdminAnalytics | null
  services: AdminServices | null
  loading: boolean
  windowDays: AdminAnalyticsWindow
  onWindowChange: (days: AdminAnalyticsWindow) => void
  onRetry: () => void
}

/** Sélecteur de période. Un `radiogroup` : trois états exclusifs, pas trois boutons indépendants. */
function WindowFilter({
  value,
  onChange,
  disabled,
}: {
  value: AdminAnalyticsWindow
  onChange: (days: AdminAnalyticsWindow) => void
  disabled: boolean
}) {
  const { locale } = useI18n()
  const copy = adminCopy[locale].superSpace.dashboard
  const labels: Record<AdminAnalyticsWindow, string> = { 7: copy.windows.d7, 30: copy.windows.d30, 90: copy.windows.d90 }

  return (
    <div role="radiogroup" aria-label={copy.filterLabel} className="flex flex-wrap items-center gap-1 rounded-xl border border-line bg-page-alt p-1">
      {ANALYTICS_WINDOWS.map((days) => {
        const active = days === value
        return (
          <button
            key={days}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(days)}
            className={`min-h-9 rounded-lg px-3 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              active ? 'bg-brand text-brand-ink' : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
            }`}
          >
            {labels[days]}
          </button>
        )
      })}
    </div>
  )
}

export function SuperAdminOverview({
  overview,
  analytics,
  services,
  loading,
  windowDays,
  onWindowChange,
  onRetry,
}: SuperAdminOverviewProps) {
  const { locale } = useI18n()
  const superCopy = adminCopy[locale].superSpace
  const copy = superCopy.dashboard
  const statusCopy = adminCopy[locale].content.status

  const alerts = useMemo(() => buildAdminAlerts(overview, services), [overview, services])

  const roleData = useMemo<AdminBarDatum[]>(() => analytics ? [
    { label: copy.kpi.totalUsers, value: analytics.usersByRole.user },
    { label: copy.kpi.admins, value: analytics.usersByRole.admin, tone: 'accent' },
    { label: copy.kpi.superAdmins, value: analytics.usersByRole.superAdmin, tone: 'positive' },
  ] : [], [analytics, copy])

  const requestData = useMemo<AdminBarDatum[]>(() => analytics ? [
    { label: statusCopy.pending ?? 'pending', value: analytics.requestsByStatus.pending },
    { label: statusCopy.reviewed ?? 'reviewed', value: analytics.requestsByStatus.reviewed },
    { label: statusCopy.added ?? 'added', value: analytics.requestsByStatus.added, tone: 'positive' },
    { label: statusCopy.rejected ?? 'rejected', value: analytics.requestsByStatus.rejected, tone: 'negative' },
    { label: statusCopy.duplicate ?? 'duplicate', value: analytics.requestsByStatus.duplicate },
  ] : [], [analytics, statusCopy])

  const rechargeConnected = analytics?.rechargeModule === 'connected'
  const unavailable = superCopy.overview.unavailable

  const header = (
    <header className={`${card} border-brand/45 p-4 sm:p-6`}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="inline-flex rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand-deep">{superCopy.title}</span>
          <h2 className="mt-3 text-xl font-bold tracking-tight text-ink">{copy.title}</h2>
          <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted">{copy.text}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <WindowFilter value={windowDays} onChange={onWindowChange} disabled={loading} />
          <button type="button" className={`${btnGhost} min-h-11 px-3`} onClick={onRetry} disabled={loading} aria-label={copy.refresh} title={copy.refresh}>
            <RefreshCw size={16} aria-hidden className={loading ? 'motion-safe:animate-spin' : undefined} />
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        {copy.windowHint} · <span className="tabular font-semibold text-ink-soft">{formatNumber(windowDays, locale)}</span>
      </p>
    </header>
  )

  if (loading) {
    return (
      <div className="space-y-5">
        {header}
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, index) => <LoadingCard key={index} label={copy.loading} lines={2} />)}
        </div>
        <LoadingCard label={copy.loading} lines={6} />
      </div>
    )
  }

  if (!overview || !analytics) {
    return (
      <div className="space-y-5">
        {header}
        <EmptyState
          icon="alert"
          title={copy.noData}
          text={adminCopy[locale].dashboard.unavailableText}
          action={<button type="button" className={btnGhost} onClick={onRetry}>{copy.retry}</button>}
        />
      </div>
    )
  }

  const kpis: { icon: AdminIcon; label: string; value: number | string; tone?: 'attention'; hint?: string }[] = [
    { icon: UsersRound, label: copy.kpi.totalUsers, value: overview.totalUsers },
    { icon: UserCheck, label: copy.kpi.activeUsers, value: analytics.usersByStatus.active },
    { icon: UserX, label: copy.kpi.suspendedUsers, value: analytics.usersByStatus.suspended, tone: analytics.usersByStatus.suspended > 0 ? 'attention' : undefined },
    { icon: UserRoundCog, label: copy.kpi.admins, value: analytics.usersByRole.admin },
    { icon: ShieldCheck, label: copy.kpi.superAdmins, value: analytics.usersByRole.superAdmin },
    { icon: Search, label: copy.kpi.totalSearches, value: overview.totalSearches },
    { icon: TrendingUp, label: copy.kpi.searchesToday, value: analytics.searchesToday },
    { icon: Activity, label: copy.kpi.searchesThisMonth, value: analytics.searchesThisMonth },
    { icon: ListChecks, label: copy.kpi.pendingRequests, value: overview.pendingRequests, tone: overview.pendingRequests > 0 ? 'attention' : undefined },
    { icon: Building2, label: copy.kpi.approvedServices, value: overview.approvedEstablishments },
    // Sans module recharge déployé, on affiche « indisponible » plutôt qu'un zéro trompeur.
    { icon: CreditCard, label: copy.kpi.pendingRecharges, value: rechargeConnected ? analytics.pendingRecharges : unavailable, tone: rechargeConnected && analytics.pendingRecharges > 0 ? 'attention' : undefined },
    { icon: CheckCircle, label: copy.kpi.approvedRecharges, value: rechargeConnected ? analytics.approvedRecharges : unavailable },
    { icon: Wallet, label: copy.kpi.creditsIssued, value: analytics.creditsIssued, hint: analytics.creditsTruncated ? copy.creditsApprox : undefined },
  ]

  return (
    <div className="space-y-5">
      {header}

      <section className="space-y-3">
        <AdminSectionHeader icon={Activity} title={copy.kpiTitle} />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi, index) => (
            <Reveal key={kpi.label} delay={Math.min(index, 7) * 0.03}>
              <AdminMetricCard icon={kpi.icon} label={kpi.label} value={kpi.value} hint={kpi.hint} tone={kpi.tone ?? 'neutral'} />
            </Reveal>
          ))}
        </div>
      </section>

      {/* Graphique principal à gauche, rail d'appoint à droite au-delà de `xl`. */}
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)] xl:items-start">
        <Reveal className="min-w-0">
          <AdminAreaChart
            icon={Search}
            title={copy.charts.searchesTitle}
            text={copy.charts.searchesText}
            series={analytics.searchSeries}
            primaryLabel={copy.legend.searches}
            secondaryLabel={copy.legend.notFound}
            emptyLabel={copy.noData}
          />
        </Reveal>

        <div className="grid min-w-0 gap-3">
          <Reveal delay={0.05} className="min-w-0">
            {rechargeConnected ? (
              <AdminAreaChart
                icon={CreditCard}
                title={copy.charts.rechargesTitle}
                text={copy.charts.rechargesText}
                series={analytics.rechargeSeries}
                primaryLabel={copy.legend.created}
                secondaryLabel={copy.legend.approved}
                emptyLabel={copy.noData}
              />
            ) : (
              <article className={`${card} p-4 sm:p-5`}>
                <AdminSectionHeader icon={CreditCard} title={copy.charts.rechargesTitle} />
                <p className="mt-4 rounded-xl border border-line bg-surface-2 px-4 py-5 text-center text-sm text-muted">
                  {copy.rechargesUnavailable}
                </p>
              </article>
            )}
          </Reveal>
          <Reveal delay={0.1} className="min-w-0">
            <AdminBarChart
              icon={ListChecks}
              title={copy.charts.requestsTitle}
              text={copy.charts.requestsText}
              data={requestData}
              emptyLabel={copy.noData}
            />
          </Reveal>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <Reveal className="min-w-0">
          <AdminDonutChart
            icon={ChartPie}
            title={copy.charts.rolesTitle}
            text={copy.charts.rolesText}
            data={roleData}
            emptyLabel={copy.noData}
            centerLabel={copy.charts.rolesCenter}
          />
        </Reveal>
        <Reveal delay={0.05} className="min-w-0">
          <AdminAreaChart
            icon={UsersRound}
            title={copy.charts.growthTitle}
            text={copy.charts.growthText}
            series={analytics.userSeries}
            primaryLabel={copy.legend.signups}
            emptyLabel={copy.noData}
          />
        </Reveal>
      </div>

      {alerts.length > 0 && (
        <section className="space-y-3">
          <AdminSectionHeader icon={Bell} title={adminCopy[locale].alerts.title} text={adminCopy[locale].alerts.subtitle} />
          <div className="grid gap-3 lg:grid-cols-2">
            {alerts.map((alert) => (
              <AdminAlertCard
                key={alert.id}
                icon={alertIcons[alert.id]}
                tone={alert.tone}
                count={alert.count}
                title={adminCopy[locale].alerts.items[alert.id].title}
                text={adminCopy[locale].alerts.items[alert.id].text}
              />
            ))}
          </div>
        </section>
      )}

      {/* L'onglet Sécurité a été retiré : ses rappels vivent ici, en lecture seule. */}
      <section className={`${card} p-4 sm:p-5`}>
        <AdminSectionHeader icon={ClipboardList} title={copy.remindersTitle} text={superCopy.security.text} />
        <ul className="mt-4 grid list-none gap-2.5 sm:grid-cols-2">
          {superCopy.security.checklist.map((item) => (
            <li key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-ink-soft">
              <ShieldCheck className="mt-0.5 shrink-0 text-answer" size={16} aria-hidden />
              {item}
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

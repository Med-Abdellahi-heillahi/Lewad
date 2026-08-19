import { useMemo } from 'react'
import {
  Activity, AlertTriangle, Bell, Building2, CheckCircle, Clock, DatabaseBackup, ListChecks,
  MapPin, Search, Shield, TrendingDown, Users, Wallet,
} from 'lucide-react'
import { useI18n } from '../../i18n'
import { buildAdminAlerts, type AdminAlertId, type AdminOverview, type AdminServices } from '../../lib/admin'
import { EmptyState, LoadingCard } from '../system/States'
import { AdminAlertCard, AdminMetricCard, AdminSectionHeader, type AdminIcon } from './AdminUi'
import { AdminRechargePanel } from './AdminRechargePanel'
import { adminCopy } from './adminCopy'

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

export function AdminDashboard({
  overview,
  services,
  loading,
}: {
  overview: AdminOverview | null
  services: AdminServices | null
  loading: boolean
}) {
  const { locale } = useI18n()
  const copy = adminCopy[locale]

  const alerts = useMemo(() => buildAdminAlerts(overview, services), [overview, services])

  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <LoadingCard key={index} label={copy.dashboard.loading} lines={2} />
        ))}
      </div>
    )
  }

  if (!overview) {
    return <EmptyState icon="alert" title={copy.dashboard.unavailableTitle} text={copy.dashboard.unavailableText} />
  }

  return (
    <div className="space-y-8">
      {/* --- Indicateurs --- */}
      <section className="space-y-4">
        <AdminSectionHeader icon={Activity} title={copy.metrics.title} text={copy.metrics.subtitle} />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <AdminMetricCard
            icon={ListChecks}
            label={copy.metrics.pendingRequests}
            value={overview.pendingRequests}
            tone={overview.pendingRequests > 0 ? 'attention' : 'neutral'}
          />
          <AdminMetricCard icon={Users} label={copy.metrics.totalUsers} value={overview.totalUsers} />
          <AdminMetricCard icon={CheckCircle} label={copy.metrics.activeUsers} value={overview.activeUsers} />
          <AdminMetricCard icon={Wallet} label={copy.metrics.totalWallets} value={overview.totalWallets} />

          <AdminMetricCard
            icon={Wallet}
            label={copy.metrics.totalPoints}
            value={overview.totalPoints}
            hint={copy.metrics.pointsHint}
          />
          <AdminMetricCard icon={Search} label={copy.metrics.totalSearches} value={overview.totalSearches} />
          <AdminMetricCard icon={CheckCircle} label={copy.metrics.successfulSearches} value={overview.successfulSearches} />
          <AdminMetricCard
            icon={TrendingDown}
            label={copy.metrics.notFoundSearches}
            value={overview.notFoundSearches}
            tone={overview.notFoundSearches > 0 ? 'attention' : 'neutral'}
          />

          <AdminMetricCard icon={Building2} label={copy.metrics.approvedEstablishments} value={overview.approvedEstablishments} />
          <AdminMetricCard icon={MapPin} label={copy.metrics.activeBranches} value={overview.activeBranches} />
          <AdminMetricCard icon={Shield} label={copy.metrics.activeCategories} value={overview.activeCategories} />
        </div>
      </section>

      {/* --- Points d'attention --- */}
      <section className="space-y-4">
        <AdminSectionHeader icon={Bell} title={copy.alerts.title} text={copy.alerts.subtitle} />

        {alerts.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface px-4 py-5 text-sm text-muted">{copy.alerts.none}</p>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {alerts.map((alert) => (
              <AdminAlertCard
                key={alert.id}
                icon={alertIcons[alert.id]}
                tone={alert.tone}
                count={alert.count}
                title={copy.alerts.items[alert.id].title}
                text={copy.alerts.items[alert.id].text}
              />
            ))}
          </div>
        )}
      </section>

      <AdminRechargePanel />
    </div>
  )
}

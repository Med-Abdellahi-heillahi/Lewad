import { Activity, BadgeCheck, Building2, CreditCard, ListChecks, Search, ShieldCheck, UserCheck, UserRoundCog, UsersRound, UserX } from 'lucide-react'
import { useI18n } from '../../i18n'
import type { AdminAnalytics, AdminOverview, AdminRechargeModule, AdminRechargeRequest, AdminServices } from '../../lib/admin'
import { card } from '../../lib/ui'
import { AdminDashboard } from '../admin/AdminDashboard'
import { AdminMetricCard, AdminSectionHeader } from '../admin/AdminUi'
import { adminCopy } from '../admin/adminCopy'

export function SuperAdminOverview({
  overview,
  analytics,
  services,
  recharges,
  rechargeModule,
  loading,
}: {
  overview: AdminOverview | null
  analytics: AdminAnalytics | null
  services: AdminServices | null
  recharges: AdminRechargeRequest[]
  rechargeModule: AdminRechargeModule
  loading: boolean
}) {
  const { locale } = useI18n()
  const copy = adminCopy[locale].superSpace
  const pendingRecharges = rechargeModule === 'connected'
    ? recharges.filter((request) => request.status === 'pending').length
    : copy.overview.unavailable

  return (
    <div className="space-y-8">
      <header className={`${card} border-brand/45 p-5 sm:p-6`}>
        <span className="inline-flex rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-bold text-brand-deep">{copy.title}</span>
        <h2 className="mt-4 text-xl font-bold tracking-tight text-ink">{copy.overview.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{copy.overview.text}</p>
      </header>

      {!loading && overview && (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <AdminMetricCard icon={UsersRound} label={copy.overview.totalUsers} value={overview.totalUsers} />
            <AdminMetricCard icon={UserRoundCog} label={copy.overview.admins} value={analytics?.usersByRole.admin ?? copy.overview.unavailable} />
            <AdminMetricCard icon={ShieldCheck} label={copy.overview.superAdmins} value={analytics?.usersByRole.superAdmin ?? copy.overview.unavailable} />
            <AdminMetricCard icon={UserCheck} label={copy.overview.activeUsers} value={overview.activeUsers} />
            <AdminMetricCard icon={UserX} label={copy.overview.suspendedUsers} value={analytics?.usersByStatus.suspended ?? copy.overview.unavailable} />
            <AdminMetricCard icon={Search} label={copy.overview.totalSearches} value={overview.totalSearches} />
            <AdminMetricCard icon={ListChecks} label={copy.overview.pendingRequests} value={overview.pendingRequests} tone={overview.pendingRequests > 0 ? 'attention' : 'neutral'} />
            <AdminMetricCard icon={CreditCard} label={copy.overview.pendingRecharges} value={pendingRecharges} tone={typeof pendingRecharges === 'number' && pendingRecharges > 0 ? 'attention' : 'neutral'} />
            <AdminMetricCard icon={Building2} label={copy.overview.approvedServices} value={overview.approvedEstablishments} />
          </div>
        </section>
      )}

      <section className="space-y-4">
        <AdminSectionHeader icon={Activity} title={copy.platformAnalytics.title} text={copy.platformAnalytics.text} />
        <AdminDashboard overview={overview} services={services} analytics={analytics} loading={loading} />
      </section>
    </div>
  )
}

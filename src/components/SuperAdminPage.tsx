import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Mail, Phone, Shield, ShieldCheck, UsersRound } from 'lucide-react'
import { useI18n } from '../i18n'
import { signOut } from '../lib/auth'
import { useAccount } from '../hooks/useAccount'
import { contact } from '../lib/content'
import { formatDate, initialOf, profileDisplayName } from '../lib/format'
import { AccountLoading } from './system/AccountLoading'
import {
  adminUpdateUserStatus,
  getAdminAnalytics,
  getAdminOverview,
  getAdminServices,
  getAdminUsers,
  superAdminUpdateUserRole,
  ANALYTICS_WINDOWS,
  type AdminAnalytics,
  type AdminAnalyticsWindow,
  type AdminOverview,
  type AdminServices,
  type AdminUser,
  type AdminUserRoleFilter,
  type AdminUserStatusFilter,
} from '../lib/admin'
import { paginatedResult, DEFAULT_PAGE_SIZE, type PaginatedResult } from '../lib/pagination'
import { appWrap, btnGhost, card, pill } from '../lib/ui'
import { AppShell } from './shell/AppShell'
import { InlineAlert } from './system/States'
import { AppearanceSettings, PasswordResetSettings } from './settings/SettingsControls'
import { AdminSectionHeader } from './admin/AdminUi'
import { adminCopy, type SuperAdminTabId } from './admin/adminCopy'
import { AdminUsers } from './admin/AdminUsers'
import { AdminManagement, SuperAdminAuditLog } from './super-admin/AdminManagement'
import { SuperAdminAnalytics } from './super-admin/SuperAdminAnalytics'
import { SuperAdminOverview } from './super-admin/SuperAdminOverview'
import { SuperAdminServices } from './super-admin/SuperAdminServices'
import { SuperAdminSidebar, superAdminTabs } from './super-admin/SuperAdminSidebar'
import { SuperAdminBottomNav } from './super-admin/SuperAdminBottomNav'

function emptyUsersPage(): PaginatedResult<AdminUser> {
  return paginatedResult([], 0, { pageSize: DEFAULT_PAGE_SIZE })
}

function initialSuperAdminTab(): SuperAdminTabId {
  const path = window.location.pathname.replace(/\/+$/, '')
  if (path === '/super-admin/analytics') return 'analytics'

  const requested = new URLSearchParams(window.location.search).get('tab')
  return superAdminTabs.some((tab) => tab.id === requested) ? requested as SuperAdminTabId : 'overview'
}

function superAdminTabUrl(tab: SuperAdminTabId) {
  if (tab === 'overview') return '/super-admin'
  if (tab === 'analytics') return '/super-admin/analytics'
  return `/super-admin?tab=${encodeURIComponent(tab)}`
}

function SuperAdminSettingsPanel() {
  const { locale } = useI18n()
  const { user, profile, authFullName } = useAccount()
  const copy = adminCopy[locale]
  const account = copy.account
  const statusLabels = copy.content.status

  const displayName = profileDisplayName(profile, locale, authFullName) ?? user?.email ?? copy.content.unnamedUser
  const email = profile?.email ?? user?.email ?? null
  const active = profile?.status === 'active'

  return (
    <div className="space-y-5">
      {/* Super Admin Account */}
      <section className={`${card} overflow-hidden`} aria-label={account.identity}>
        <div className="flex items-center gap-4 border-b border-line bg-page-alt p-5 sm:p-6">
          <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand text-2xl font-bold text-brand-ink">
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="" className="size-full object-cover" />
              : initialOf(displayName)}
          </span>
          <div className="min-w-0">
            <h2 dir="auto" className="truncate text-lg font-bold text-ink sm:text-xl">{displayName}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`${pill} bg-surface-2 text-ink-soft`}>
                <Shield size={12} aria-hidden />
                {account.superAdminProfile === copy.superSpace.badge ? copy.superSpace.badge : account.superAdminProfile}
              </span>
              {active !== undefined && (
                <span className={`${pill} ${active ? 'bg-answer-bg text-answer' : 'bg-ask-bg text-ask'}`}>
                  <span aria-hidden className={`size-1.5 rounded-full ${active ? 'bg-answer' : 'bg-ask'}`} />
                  {statusLabels[profile?.status ?? ''] ?? profile?.status ?? '—'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="grid gap-px bg-line sm:grid-cols-2">
          {email && (
            <div className="bg-surface px-4 py-3.5">
              <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Mail size={13} aria-hidden />{account.email}</dt>
              <dd className="mt-1.5 text-sm font-semibold break-words text-ink ltr-isolate">{email}</dd>
            </div>
          )}
          {profile?.phone && (
            <div className="bg-surface px-4 py-3.5">
              <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Phone size={13} aria-hidden />{account.phone}</dt>
              <dd className="mt-1.5 text-sm font-semibold break-words text-ink ltr-isolate">{profile.phone}</dd>
            </div>
          )}
          {profile?.created_at && (
            <div className="bg-surface px-4 py-3.5">
              <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><CalendarDays size={13} aria-hidden />{account.createdAt}</dt>
              <dd className="mt-1.5 text-sm font-semibold break-words text-ink">{formatDate(profile.created_at, locale)}</dd>
            </div>
          )}
        </div>
        <div className="border-t border-line bg-page-alt px-4 py-3">
          <a href="/super-admin/profile" className={btnGhost}>
            <ShieldCheck size={16} aria-hidden />
            {account.backToSuperAdmin} — {account.platformRole}
          </a>
        </div>
      </section>

      {/* Interface Settings */}
      <AppearanceSettings />

      {/* Password Change */}
      <PasswordResetSettings userEmail={email} />

      {/* Lewad Contact */}
      <section className={`${card} p-5 sm:p-6`}>
        <h2 className="text-lg font-bold tracking-tight text-ink">{locale === 'ar' ? 'التواصل' : locale === 'en' ? 'Contact' : 'Contact'}</h2>
        <p className="mt-1 text-sm text-muted">{locale === 'ar' ? 'معلومات التواصل مع فريق Lewad.' : locale === 'en' ? 'Lewad team contact details.' : 'Coordonnées de l\'équipe Lewad.'}</p>
        <div className="mt-4 grid gap-px bg-line sm:grid-cols-2">
          <div className="bg-surface px-4 py-3.5">
            <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Phone size={13} aria-hidden />{locale === 'ar' ? 'الهاتف' : locale === 'en' ? 'Phone' : 'Téléphone'}</dt>
            <dd className="mt-1.5 text-sm font-semibold text-ink ltr-isolate">{contact.phoneDisplay}</dd>
          </div>
          <div className="bg-surface px-4 py-3.5">
            <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Mail size={13} aria-hidden />{locale === 'ar' ? 'البريد الإلكتروني' : locale === 'en' ? 'Email' : 'E-mail'}</dt>
            <dd className="mt-1.5 text-sm font-semibold text-ink ltr-isolate">{contact.email}</dd>
          </div>
        </div>
      </section>

      {/* System Info */}
      <section className={`${card} p-5 sm:p-6`}>
        <h2 className="text-lg font-bold tracking-tight text-ink">{locale === 'ar' ? 'معلومات النظام' : locale === 'en' ? 'System info' : 'Informations système'}</h2>
        <p className="mt-1 text-sm text-muted">{locale === 'ar' ? 'معلومات تقنية عن النسخة الحالية.' : locale === 'en' ? 'Technical details about the current version.' : 'Informations techniques sur la version actuelle.'}</p>
        <dl className="mt-4 grid gap-px bg-line sm:grid-cols-2">
          <div className="bg-surface px-4 py-3.5">
            <dt className="text-xs font-semibold text-muted">{locale === 'ar' ? 'الإصدار' : locale === 'en' ? 'Version' : 'Version'}</dt>
            <dd className="mt-1.5 text-sm font-semibold text-ink">Lewad V1</dd>
          </div>
          <div className="bg-surface px-4 py-3.5">
            <dt className="text-xs font-semibold text-muted">{locale === 'ar' ? 'دورك' : locale === 'en' ? 'Your role' : 'Votre rôle'}</dt>
            <dd className="mt-1.5 text-sm font-semibold text-ink">{copy.superSpace.badge}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}

/** Dedicated platform-control route. Its role and status mutations call only reviewed server-side RPCs. */
export function SuperAdminPage() {
  const { locale } = useI18n()
  const { loading: accountLoading } = useAccount()
  const copy = adminCopy[locale]

  if (accountLoading) return <AccountLoading />
  const [activeTab, setActiveTab] = useState<SuperAdminTabId>(initialSuperAdminTab)
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
  const [services, setServices] = useState<AdminServices | null>(null)
  const [users, setUsers] = useState<PaginatedResult<AdminUser>>(() => emptyUsersPage())
  const [filters, setFilters] = useState<{ search: string; role: AdminUserRoleFilter; status: AdminUserStatusFilter }>({ search: '', role: 'user', status: 'all' })
  const [usersPage, setUsersPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [windowDays, setWindowDays] = useState<AdminAnalyticsWindow>(30)

  const loadOverview = useCallback(async () => {
    setLoading(true)
    setError(null)
    const [overviewResult, analyticsResult, servicesResult] = await Promise.all([
      getAdminOverview(), getAdminAnalytics(windowDays), getAdminServices(),
    ])
    setOverview(overviewResult.data)
    setAnalytics(analyticsResult.data)
    setServices(servicesResult.data)
    setError(overviewResult.error ?? analyticsResult.error ?? servicesResult.error)
    setLoading(false)
  }, [windowDays])

  const loadUsers = useCallback(async () => {
    setLoading(true)
    setError(null)
    const result = await getAdminUsers({ page: usersPage, pageSize: DEFAULT_PAGE_SIZE, ...filters })
    setUsers(result.data)
    setError(result.error)
    setLoading(false)
  }, [filters, usersPage])

  useEffect(() => {
    if (activeTab === 'overview') {
      void loadOverview()
      return
    }
    if (activeTab === 'users') void loadUsers()
  }, [activeTab, loadOverview, loadUsers])

  const selectTab = (tab: SuperAdminTabId) => {
    window.history.replaceState(window.history.state, '', superAdminTabUrl(tab))
    setActiveTab(tab)
    setMobileSidebarOpen(false)
    if (tab === 'users') {
      setUsersPage(1)
      setFilters((current) => ({ ...current, role: 'user' }))
    }
  }

  const endSession = async () => {
    setSigningOut(true)
    await signOut()
    window.location.replace('/')
  }

  const updateFilters = (next: { search: string; role: AdminUserRoleFilter; status: AdminUserStatusFilter }) => {
    setUsersPage(1)
    setFilters(next)
  }

  const displayName = (user: AdminUser) => {
    if (locale === 'ar' && user.full_name_ar?.trim()) return user.full_name_ar.trim()
    return user.full_name?.trim() || user.full_name_ar?.trim() || user.email || copy.content.unnamedUser
  }

  const saveStatus = async (user: AdminUser, status: 'active' | 'suspended') => {
    const result = await adminUpdateUserStatus({ userId: user.id, status })
    if (result.error || !result.data) return result.error ?? copy.users.userUpdateFailed
    setUsers((current) => ({ ...current, data: current.data.map((item) => item.id === user.id ? result.data as AdminUser : item) }))
    void loadOverview()
    return null
  }

  const saveRole = async (user: AdminUser, role: AdminUser['role']) => {
    const result = await superAdminUpdateUserRole({ userId: user.id, role })
    if (result.error || !result.data) return result.error ?? copy.users.userUpdateFailed
    setUsers((current) => ({ ...current, data: current.data.map((item) => item.id === user.id ? result.data as AdminUser : item) }))
    void loadOverview()
    return null
  }

  return (
    <AppShell
      documentTitle={copy.superSpace.title}
      adminBar={{
        productLabel: copy.superSpace.title,
        sectionLabel: copy.superSpace.tabs[activeTab],
        roleLabel: copy.header.superAdmin,
        sidebarCollapsed,
        mobileSidebarOpen,
        desktopToggleLabel: sidebarCollapsed ? copy.sidebar.expand : copy.sidebar.collapse,
        mobileToggleLabel: copy.superSpace.navigation,
        onDesktopSidebarToggle: () => setSidebarCollapsed((current) => !current),
        onMobileSidebarToggle: () => setMobileSidebarOpen(true),
      }}
    >
      <main id="app-main" className={`${appWrap} pb-24 pt-4 sm:pt-5 lg:pb-12 lg:pt-5`}>
        <div className={`lg:grid lg:items-start lg:gap-6 ${sidebarCollapsed ? 'lg:grid-cols-[5rem_minmax(0,1fr)]' : 'lg:grid-cols-[17rem_minmax(0,1fr)]'}`}>
          <SuperAdminSidebar activeTab={activeTab} collapsed={sidebarCollapsed} mobileOpen={mobileSidebarOpen} signingOut={signingOut} onDesktopToggle={() => setSidebarCollapsed((current) => !current)} onMobileOpenChange={setMobileSidebarOpen} onSelectTab={selectTab} onSignOut={() => void endSession()} />

          <section className="min-w-0" aria-label={copy.superSpace.tabs[activeTab]}>
            {error && <InlineAlert tone="error" title={copy.header.dataErrorTitle} className="mb-5">{error} {copy.header.dataErrorText}</InlineAlert>}
            {activeTab === 'overview' && <SuperAdminOverview overview={overview} analytics={analytics} services={services} loading={loading} windowDays={windowDays} onWindowChange={setWindowDays} onRetry={() => void loadOverview()} />}
            {activeTab === 'analytics' && <SuperAdminAnalytics />}
            {activeTab === 'admins' && <AdminManagement />}
            {activeTab === 'users' && <div className="space-y-5">
              <header className={`${card} border-brand/45 p-5 sm:p-6`}><AdminSectionHeader icon={UsersRound} title={copy.superSpace.people.usersTitle} text={copy.superSpace.people.usersText} /></header>
              <AdminUsers users={users.data} pagination={users} loading={loading} currentRole="super_admin" filters={filters} onFiltersChange={updateFilters} onPageChange={setUsersPage} onStatusChange={saveStatus} onRoleChange={saveRole} displayName={displayName} />
            </div>}
            {activeTab === 'services' && <SuperAdminServices />}
            {activeTab === 'audit' && <SuperAdminAuditLog />}
            {activeTab === 'settings' && <SuperAdminSettingsPanel />}
          </section>
        </div>
      </main>
      <SuperAdminBottomNav activeTab={activeTab} signingOut={signingOut} onSelectTab={selectTab} onSignOut={() => void endSession()} />
    </AppShell>
  )
}

export { RequireSuperAdmin } from './admin/AdminAccess'

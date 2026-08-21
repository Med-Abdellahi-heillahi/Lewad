import { useCallback, useEffect, useState } from 'react'
import { SlidersHorizontal, UsersRound } from 'lucide-react'
import { useI18n } from '../i18n'
import { signOut } from '../lib/auth'
import { useAccount } from '../hooks/useAccount'
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
import { appWrap, card } from '../lib/ui'
import { AppShell } from './shell/AppShell'
import { InlineAlert } from './system/States'
import { AdminSectionHeader } from './admin/AdminUi'
import { adminCopy, type SuperAdminTabId } from './admin/adminCopy'
import { AdminUsers } from './admin/AdminUsers'
import { AdminManagement, SuperAdminAuditLog } from './super-admin/AdminManagement'
import { SuperAdminOverview } from './super-admin/SuperAdminOverview'
import { SuperAdminSidebar, superAdminTabs } from './super-admin/SuperAdminSidebar'
import { SuperAdminBottomNav } from './super-admin/SuperAdminBottomNav'

function emptyUsersPage(): PaginatedResult<AdminUser> {
  return paginatedResult([], 0, { pageSize: DEFAULT_PAGE_SIZE })
}

function SuperAdminSettingsPanel() {
  const { locale } = useI18n()
  const copy = adminCopy[locale].superSpace

  return (
    <div className="space-y-5">
      <header className={`${card} border-brand/45 p-5 sm:p-6`}>
        <h2 className="text-xl font-bold tracking-tight text-ink">{copy.settings.title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{copy.settings.text}</p>
      </header>
      <section className={`${card} p-5 sm:p-6`}>
        <ul className="list-none space-y-3">
          {copy.settings.items.map((item) => <li key={item} className="flex items-start gap-3 text-sm leading-6 text-ink-soft"><SlidersHorizontal className="mt-0.5 shrink-0 text-muted" size={18} aria-hidden />{item}</li>)}
        </ul>
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
  const [activeTab, setActiveTab] = useState<SuperAdminTabId>(() => {
    const requested = new URLSearchParams(window.location.search).get('tab')
    return superAdminTabs.some((tab) => tab.id === requested) ? requested as SuperAdminTabId : 'overview'
  })
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
            {activeTab === 'admins' && <AdminManagement />}
            {activeTab === 'users' && <div className="space-y-5">
              <header className={`${card} border-brand/45 p-5 sm:p-6`}><AdminSectionHeader icon={UsersRound} title={copy.superSpace.people.usersTitle} text={copy.superSpace.people.usersText} /></header>
              <AdminUsers users={users.data} pagination={users} loading={loading} currentRole="super_admin" filters={filters} onFiltersChange={updateFilters} onPageChange={setUsersPage} onStatusChange={saveStatus} onRoleChange={saveRole} displayName={displayName} />
            </div>}
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

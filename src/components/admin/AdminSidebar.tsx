import { useMemo } from 'react'
import { Home, LogOut, Settings, Shield, User } from 'lucide-react'
import { useI18n } from '../../i18n'
import { adminCopy, type AdminTabId } from './adminCopy'
import { Drawer } from '../shell/Drawer'
import type { AdminIcon } from './AdminUi'

type AdminSidebarProps = {
  tabs: { id: AdminTabId; icon: AdminIcon }[]
  activeTab: AdminTabId
  collapsed: boolean
  mobileOpen: boolean
  isSuperAdmin: boolean
  signingOut: boolean
  onMobileOpenChange: (open: boolean) => void
  onSelectTab: (tab: AdminTabId) => void
  onSelectRecharge: () => void
  onSignOut: () => void
  superAdminHref?: string
  activeAccountPage?: 'profile' | 'settings'
}

function SidebarContent({
  tabs,
  activeTab,
  collapsed,
  isSuperAdmin,
  signingOut,
  onSelectTab,
  onSignOut,
  superAdminHref,
  activeAccountPage,
  locale,
}: {
  tabs: { id: AdminTabId; icon: AdminIcon }[]
  activeTab: AdminTabId
  collapsed: boolean
  isSuperAdmin: boolean
  signingOut: boolean
  onSelectTab: (tab: AdminTabId) => void
  onSignOut: () => void
  superAdminHref?: string
  activeAccountPage?: 'profile' | 'settings'
  locale: 'fr' | 'ar' | 'en'
}) {
  const copy = adminCopy[locale]
  const { sidebar, tabs: tabLabels } = copy

  return (
    <nav className="flex flex-1 flex-col gap-1 p-2" aria-label={sidebar.title}>
      {/* Role badge */}
      {!collapsed && (
        <div className="mb-2 px-3 py-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${isSuperAdmin ? 'bg-tint-4/60 text-tint-ink-4' : 'bg-tint-1/60 text-tint-ink-1'}`}>
            <Shield size={12} aria-hidden />
            {isSuperAdmin ? sidebar.superAdminBadge : sidebar.adminBadge}
          </span>
        </div>
      )}

      {/* Tab navigation */}
      <ul className="list-none space-y-0.5">
        {tabs.map((tab) => {
          const isActive = !activeAccountPage && activeTab === tab.id
          const IconComp = tab.icon
          return (
            <li key={tab.id}>
              <button
                type="button"
                onClick={() => onSelectTab(tab.id)}
                title={collapsed ? tabLabels[tab.id] : undefined}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-soft text-brand-deep font-semibold'
                    : 'text-muted hover:bg-surface-2 hover:text-ink'
                } ${collapsed ? 'justify-center !px-0' : ''}`}
              >
                <IconComp size={18} aria-hidden />
                {!collapsed && <span className="truncate">{tabLabels[tab.id]}</span>}
              </button>
            </li>
          )
        })}
      </ul>

      {/* Super Admin link */}
      {superAdminHref && (
        <div className="mt-2 border-t border-line pt-2">
          <a
            href={superAdminHref}
            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-tint-ink-4 transition-colors hover:bg-tint-4/30 ${collapsed ? 'justify-center !px-0' : ''}`}
          >
            <Shield size={18} aria-hidden />
            {!collapsed && <span className="truncate">{sidebar.superAdminSpace}</span>}
          </a>
        </div>
      )}

      {/* Bottom section: Profile + Settings + User Space + Logout.
          Profil et Paramètres restent dans l'espace admin ; `/app` est le seul
          passage assumé vers l'espace membre. */}
      <div className="mt-auto border-t border-line pt-2 space-y-0.5">
        <a
          href="/admin/profile"
          aria-current={activeAccountPage === 'profile' ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${activeAccountPage === 'profile' ? 'bg-brand-soft text-brand-deep font-semibold' : 'text-muted hover:bg-surface-2 hover:text-ink'} ${collapsed ? 'justify-center !px-0' : ''}`}
        >
          <User size={18} aria-hidden />
          {!collapsed && <span className="truncate">{sidebar.profile}</span>}
        </a>
        <a
          href="/admin/settings"
          title={collapsed ? sidebar.settings : undefined}
          aria-current={activeAccountPage === 'settings' ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${activeAccountPage === 'settings' ? 'bg-brand-soft text-brand-deep font-semibold' : 'text-muted hover:bg-surface-2 hover:text-ink'} ${collapsed ? 'justify-center !px-0' : ''}`}
        >
          <Settings size={18} aria-hidden />
          {!collapsed && <span className="truncate">{sidebar.settings}</span>}
        </a>
        <a
          href="/app"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink ${collapsed ? 'justify-center !px-0' : ''}`}
        >
          <Home size={18} aria-hidden />
          {!collapsed && <span className="truncate">{sidebar.userSpace}</span>}
        </a>
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          title={collapsed ? sidebar.logout : undefined}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ask transition-colors hover:bg-ask-bg disabled:opacity-50 ${collapsed ? 'justify-center !px-0' : ''}`}
        >
          <LogOut size={18} aria-hidden />
          {!collapsed && <span className="truncate">{signingOut ? sidebar.loggingOut : sidebar.logout}</span>}
        </button>
      </div>
    </nav>
  )
}

/**
 * Sidebar admin — deux rendus :
 *   • Desktop (`lg+`) : aside sticky dans le flux, piloté par `collapsed`.
 *   • Mobile : Drawer contrôlé par le parent via `mobileOpen` / `onMobileOpenChange`.
 */
export function AdminSidebar({
  tabs,
  activeTab,
  collapsed,
  mobileOpen,
  isSuperAdmin,
  signingOut,
  onMobileOpenChange,
  onSelectTab,
  onSelectRecharge,
  onSignOut,
  superAdminHref,
  activeAccountPage,
}: AdminSidebarProps) {
  const { locale } = useI18n()
  const copy = adminCopy[locale]

  const common = useMemo(
    () => ({ tabs, activeTab, collapsed, isSuperAdmin, signingOut, onSelectTab, onSignOut, superAdminHref, activeAccountPage, locale }),
    [tabs, activeTab, collapsed, isSuperAdmin, signingOut, onSelectTab, onSignOut, superAdminHref, activeAccountPage, locale],
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex sticky top-24 self-start flex-col rounded-2xl border border-line bg-surface transition-[width] duration-200 ${
          collapsed ? 'w-[4.5rem]' : 'w-64'
        }`}
        aria-label={copy.sidebar.title}
      >
        <SidebarContent {...common} />
      </aside>

      {/* Mobile drawer */}
      <Drawer
        open={mobileOpen}
        onClose={() => onMobileOpenChange(false)}
        title={copy.sidebar.title}
        panelWidthClassName="w-[min(85vw,18rem)]"
      >
        <div className="flex h-full flex-col">
          <SidebarContent {...common} collapsed={false} />
        </div>
      </Drawer>
    </>
  )
}

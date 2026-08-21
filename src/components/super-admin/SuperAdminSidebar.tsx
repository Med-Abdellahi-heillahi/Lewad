import { useMemo } from 'react'
import { Home, LayoutDashboard, LogOut, Shield, Users, Settings, ClipboardList, User } from 'lucide-react'
import { useI18n } from '../../i18n'
import { adminCopy, type SuperAdminTabId } from '../admin/adminCopy'
import { Drawer } from '../shell/Drawer'

export const superAdminTabs: { id: SuperAdminTabId; icon: typeof LayoutDashboard }[] = [
  { id: 'overview', icon: LayoutDashboard },
  { id: 'admins', icon: Shield },
  { id: 'users', icon: Users },
  { id: 'audit', icon: ClipboardList },
  { id: 'settings', icon: Settings },
]

type SuperAdminSidebarProps = {
  activeTab: SuperAdminTabId
  collapsed: boolean
  mobileOpen: boolean
  signingOut: boolean
  onDesktopToggle: () => void
  onMobileOpenChange: (open: boolean) => void
  onSelectTab: (tab: SuperAdminTabId) => void
  onSignOut: () => void
  activeAccountPage?: 'profile' | 'settings'
}

function SidebarContent({
  activeTab,
  collapsed,
  signingOut,
  onSelectTab,
  onSignOut,
  activeAccountPage,
  locale,
}: {
  activeTab: SuperAdminTabId
  collapsed: boolean
  signingOut: boolean
  onSelectTab: (tab: SuperAdminTabId) => void
  onSignOut: () => void
  activeAccountPage?: 'profile' | 'settings'
  locale: 'fr' | 'ar' | 'en'
}) {
  const copy = adminCopy[locale]
  const tabLabels = copy.superSpace.tabs

  return (
    <nav className="flex flex-1 flex-col gap-1 p-2" aria-label={copy.superSpace.navigation}>
      {/* Role badge */}
      {!collapsed && (
        <div className="mb-2 px-3 py-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-tint-4/60 px-2.5 py-1 text-[11px] font-bold text-tint-ink-4">
            <Shield size={12} aria-hidden />
            {copy.superSpace.badge}
          </span>
        </div>
      )}

      {/* Tab navigation */}
      <ul className="list-none space-y-0.5">
        {superAdminTabs.map((tab) => {
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

      {/* Bottom section: Admin space + User space + Profile + Logout */}
      <div className="mt-auto border-t border-line pt-2 space-y-0.5">
        <a
          href="/admin"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink ${collapsed ? 'justify-center !px-0' : ''}`}
        >
          <Home size={18} aria-hidden />
          {!collapsed && <span className="truncate">{copy.sidebar.adminNavigation}</span>}
        </a>
        <a
          href="/app"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink ${collapsed ? 'justify-center !px-0' : ''}`}
        >
          <Home size={18} aria-hidden />
          {!collapsed && <span className="truncate">{copy.sidebar.userSpace}</span>}
        </a>
        {/* Profil et Paramètres restent dans l'espace super admin ; `/app` reste
            le seul passage assumé vers l'espace membre. */}
        <a
          href="/super-admin/profile"
          aria-current={activeAccountPage === 'profile' ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${activeAccountPage === 'profile' ? 'bg-brand-soft text-brand-deep font-semibold' : 'text-muted hover:bg-surface-2 hover:text-ink'} ${collapsed ? 'justify-center !px-0' : ''}`}
        >
          <User size={18} aria-hidden />
          {!collapsed && <span className="truncate">{copy.sidebar.profile}</span>}
        </a>
        <a
          href="/super-admin/settings"
          title={collapsed ? copy.sidebar.settings : undefined}
          aria-current={activeAccountPage === 'settings' ? 'page' : undefined}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${activeAccountPage === 'settings' ? 'bg-brand-soft text-brand-deep font-semibold' : 'text-muted hover:bg-surface-2 hover:text-ink'} ${collapsed ? 'justify-center !px-0' : ''}`}
        >
          <Settings size={18} aria-hidden />
          {!collapsed && <span className="truncate">{copy.sidebar.settings}</span>}
        </a>
        <button
          type="button"
          onClick={onSignOut}
          disabled={signingOut}
          title={collapsed ? copy.sidebar.logout : undefined}
          className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-ask transition-colors hover:bg-ask-bg disabled:opacity-50 ${collapsed ? 'justify-center !px-0' : ''}`}
        >
          <LogOut size={18} aria-hidden />
          {!collapsed && <span className="truncate">{signingOut ? copy.sidebar.loggingOut : copy.sidebar.logout}</span>}
        </button>
      </div>
    </nav>
  )
}

/**
 * Sidebar super-admin — deux rendus :
 *   • Desktop (`lg+`) : aside sticky dans le flux, piloté par `collapsed`.
 *   • Mobile : Drawer contrôlé par le parent via `mobileOpen` / `onMobileOpenChange`.
 */
export function SuperAdminSidebar({
  activeTab,
  collapsed,
  mobileOpen,
  signingOut,
  onMobileOpenChange,
  onSelectTab,
  onSignOut,
  activeAccountPage,
}: SuperAdminSidebarProps) {
  const { locale } = useI18n()
  const copy = adminCopy[locale]

  const common = useMemo(
    () => ({ activeTab, collapsed, signingOut, onSelectTab, onSignOut, activeAccountPage, locale }),
    [activeTab, collapsed, signingOut, onSelectTab, onSignOut, activeAccountPage, locale],
  )

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex sticky top-24 self-start flex-col rounded-2xl border border-line bg-surface transition-[width] duration-200 ${
          collapsed ? 'w-[4.5rem]' : 'w-64'
        }`}
        aria-label={copy.superSpace.navigation}
      >
        <SidebarContent {...common} />
      </aside>

      {/* Mobile drawer */}
      <Drawer
        open={mobileOpen}
        onClose={() => onMobileOpenChange(false)}
        title={copy.superSpace.navigation}
        panelWidthClassName="w-[min(85vw,18rem)]"
      >
        <div className="flex h-full flex-col">
          <SidebarContent {...common} collapsed={false} />
        </div>
      </Drawer>
    </>
  )
}

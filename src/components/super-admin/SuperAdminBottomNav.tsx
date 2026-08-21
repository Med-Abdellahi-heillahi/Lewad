import { LayoutDashboard, LogOut, Settings, User, type LucideIcon } from 'lucide-react'
import { useI18n } from '../../i18n'
import { adminCopy, type SuperAdminTabId } from '../admin/adminCopy'

type SuperAdminBottomNavItem = 'overview' | 'profile' | 'settings'

type SuperAdminBottomNavLink = {
  id: SuperAdminBottomNavItem
  label: string
  href: string
  icon: LucideIcon
  active: boolean
  onClick?: () => void
}

type SuperAdminBottomNavProps = {
  activeTab: SuperAdminTabId
  signingOut: boolean
  onSelectTab: (tab: SuperAdminTabId) => void
  onSignOut: () => void
  /** When set, overrides tab-based highlighting (used on account pages). */
  activeItem?: SuperAdminBottomNavItem
}

/**
 * Mobile bottom nav for super-admin space.
 * Four buttons: Profile, Overview (dashboard), Settings, Logout.
 *
 * When `activeItem` is provided (account pages profile/settings),
 * it takes precedence over tab-based highlighting.
 */
export function SuperAdminBottomNav({ activeTab, signingOut, onSelectTab, onSignOut, activeItem }: SuperAdminBottomNavProps) {
  const { locale } = useI18n()
  const copy = adminCopy[locale]

  const isProfileActive = activeItem === 'profile'
  const isOverviewActive = activeItem ? activeItem === 'overview' : activeTab === 'overview'
  const isSettingsActive = activeItem === 'settings'

  const items: SuperAdminBottomNavLink[] = [
    // Profil du super admin, pas le profil membre. Les paramètres de compte
    // restent dans le tiroir : quatre cibles au maximum ici, sinon elles
    // deviennent trop étroites au pouce.
    { id: 'profile', label: copy.sidebar.profile, href: '/super-admin/profile', icon: User, active: isProfileActive },
    { id: 'overview', label: copy.superSpace.tabs.overview, href: '/super-admin', icon: LayoutDashboard, active: isOverviewActive, onClick: activeItem ? undefined : () => onSelectTab('overview') },
    { id: 'settings', label: copy.superSpace.tabs.settings, href: '/super-admin?tab=settings', icon: Settings, active: isSettingsActive },
  ]

  const itemClass = (active: boolean) =>
    `flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold leading-tight transition-colors ${
      active ? 'bg-tint-4/60 text-tint-ink-4' : 'text-muted hover:bg-surface-2 hover:text-ink'
    }`

  return (
    <nav aria-label={copy.superSpace.navigation} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md lg:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4 list-none gap-1 px-2 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const ItemIcon = item.icon

          return (
            <li key={item.id} className="min-w-0">
              {item.onClick ? (
                <button
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  aria-current={item.active ? 'page' : undefined}
                  className={`${itemClass(item.active)} w-full`}
                  onClick={item.onClick}
                >
                  <ItemIcon size={18} aria-hidden />
                  <span className="max-w-full truncate">{item.label}</span>
                </button>
              ) : (
                <a href={item.href} title={item.label} aria-label={item.label} aria-current={item.active ? 'page' : undefined} className={itemClass(item.active)}>
                  <ItemIcon size={18} aria-hidden />
                  <span className="max-w-full truncate">{item.label}</span>
                </a>
              )}
            </li>
          )
        })}
        <li className="min-w-0">
          <button
            type="button"
            title={copy.sidebar.logout}
            aria-label={copy.sidebar.logout}
            disabled={signingOut}
            className={`${itemClass(false)} w-full disabled:opacity-50`}
            onClick={onSignOut}
          >
            <LogOut size={18} aria-hidden />
            <span className="max-w-full truncate">{signingOut ? copy.sidebar.loggingOut : copy.sidebar.logout}</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}

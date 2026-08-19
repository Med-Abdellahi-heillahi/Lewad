import { LayoutDashboard, ListChecks, Settings, User } from 'lucide-react'
import { useI18n } from '../../i18n'
import { adminCopy, type AdminTabId } from './adminCopy'

type AdminBottomNavProps = {
  activeTab: AdminTabId
  onSelectTab: (tab: AdminTabId) => void
}

/**
 * Raccourcis réservés au mobile : le tiroir conserve la navigation admin
 * complète, tandis que cette barre garde les quatre destinations fréquentes
 * accessibles au pouce.
 */
export function AdminBottomNav({ activeTab, onSelectTab }: AdminBottomNavProps) {
  const { locale } = useI18n()
  const copy = adminCopy[locale]

  const items = [
    { id: 'profile', label: copy.sidebar.profile, href: '/profile', icon: User, active: false },
    { id: 'dashboard', label: copy.tabs.dashboard, href: '/admin', icon: LayoutDashboard, active: activeTab === 'dashboard' },
    { id: 'settings', label: copy.sidebar.settings, href: '/settings', icon: Settings, active: false },
  ] as const

  const itemClass = (active: boolean) =>
    `flex min-h-14 min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-semibold leading-tight transition-colors ${
      active ? 'bg-brand-soft text-brand-deep' : 'text-muted hover:bg-surface-2 hover:text-ink'
    }`

  return (
    <nav aria-label={copy.sidebar.title} className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-md lg:hidden">
      <ul className="mx-auto grid max-w-md grid-cols-4 list-none gap-1 px-2 pt-1 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
        {items.map((item) => {
          const ItemIcon = item.icon

          return (
            <li key={item.id} className="min-w-0">
              <a href={item.href} title={item.label} aria-label={item.label} aria-current={item.active ? 'page' : undefined} className={itemClass(item.active)}>
                <ItemIcon size={18} aria-hidden />
                <span className="max-w-full truncate">{item.label}</span>
              </a>
            </li>
          )
        })}
        <li className="min-w-0">
          <button
            type="button"
            title={copy.tabs.requests}
            aria-label={copy.tabs.requests}
            aria-current={activeTab === 'requests' ? 'page' : undefined}
            className={`${itemClass(activeTab === 'requests')} w-full`}
            onClick={() => onSelectTab('requests')}
          >
            <ListChecks size={18} aria-hidden />
            <span className="max-w-full truncate">{copy.tabs.requests}</span>
          </button>
        </li>
      </ul>
    </nav>
  )
}

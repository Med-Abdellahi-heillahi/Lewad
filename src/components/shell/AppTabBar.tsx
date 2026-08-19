import { useI18n } from '../../i18n'
import { useAccount } from '../../hooks/useAccount'
import { isAdminRole } from '../../lib/routeAuth'
import { Icon } from '../Icon'
import { appNavItems, appShellCopy, appTabIds, type AppNavId } from './appNav'

/**
 * Barre d'onglets basse, mobile uniquement.
 *
 * Les quatre destinations que le membre atteint le plus souvent passent sous le
 * pouce plutôt que derrière un menu : c'est ce qui sépare une page web d'une
 * application. Au-delà de `lg` elle disparaît — la barre du haut suffit.
 */
export function AppTabBar({ active }: { active?: AppNavId }) {
  const { locale } = useI18n()
  const { profile } = useAccount()
  const copy = appShellCopy[locale]
  const hasAdminAccess = profile?.status === 'active' && isAdminRole(profile?.role)
  const tabIds = hasAdminAccess ? appTabIds.filter((id) => id !== 'recharge') : appTabIds
  const tabs = tabIds.map((id) => {
    const item = appNavItems.find((navItem) => navItem.id === id)
    if (!item) throw new Error(`Unknown app tab: ${id}`)
    return { ...item, label: copy.shortItems[id] ?? copy.items[id] }
  })

  return (
    <nav
      aria-label={copy.primaryNav}
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-page/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
    >
      <ul className="mx-auto flex list-none items-stretch justify-around gap-1 px-2">
        {tabs.map((tab) => (
          <li key={tab.id} className="flex-1">
            <a
              href={tab.href}
              aria-current={tab.id === active ? 'page' : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold transition-colors ${
                tab.id === active ? 'text-brand-deep dark:text-brand' : 'text-muted hover:text-ink'
              }`}
            >
              <span
                className={`grid h-7 w-11 place-items-center rounded-full transition-colors ${
                  tab.id === active ? 'bg-brand-soft' : ''
                }`}
              >
                <Icon name={tab.icon} size={19} />
              </span>
              <span className="max-w-full truncate">{tab.label}</span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

import { useI18n } from '../../i18n'
import { card } from '../../lib/ui'
import { Drawer } from '../shell/Drawer'
import { CreditCard, Home, Mail, RefreshCw, Search, Settings, ShieldCheck, User, Wallet } from 'lucide-react'
import type { AdminTabId } from './adminCopy'
import { adminCopy } from './adminCopy'
import type { AdminIcon } from './AdminUi'

type AdminSidebarProps = {
  tabs: { id: AdminTabId; icon: AdminIcon }[]
  activeTab: AdminTabId
  collapsed: boolean
  mobileOpen: boolean
  onMobileOpenChange: (open: boolean) => void
  onSelectTab: (tab: AdminTabId) => void
  onSelectRecharge: () => void
  superAdminHref?: string
}

type SidebarLinksProps = Pick<AdminSidebarProps, 'tabs' | 'activeTab' | 'collapsed' | 'onSelectTab' | 'onSelectRecharge' | 'superAdminHref'> & {
  onNavigate?: () => void
}

function SidebarLinks({ tabs, activeTab, collapsed, onSelectTab, onSelectRecharge, superAdminHref, onNavigate }: SidebarLinksProps) {
  const { locale } = useI18n()
  const copy = adminCopy[locale].sidebar
  const userLinks = [
    { label: copy.userSpace, href: '/app', icon: Home },
    { label: copy.search, href: '/app', icon: Search },
    { label: copy.profile, href: '/profile', icon: User },
    { label: copy.credits, href: '/credits', icon: Wallet },
    { label: copy.recharge, href: '/recharge', icon: RefreshCw },
    { label: copy.settings, href: '/settings', icon: Settings },
    { label: copy.contact, href: '/contact', icon: Mail },
  ]
  const itemClass = `flex min-h-11 w-full items-center rounded-xl px-3 text-start text-sm transition-colors ${collapsed ? 'justify-center px-0' : 'gap-3'}`

  return (
    <nav aria-label={copy.title} className="space-y-5">
      <section>
        <h2 className={`px-2 text-[11px] font-bold tracking-[0.09em] text-muted uppercase rtl:tracking-normal rtl:normal-case ${collapsed ? 'sr-only' : ''}`}>{copy.adminNavigation}</h2>
        <ul className="mt-2 list-none space-y-1">
          {tabs.map((tab) => {
            const TabIcon = tab.icon
            const active = activeTab === tab.id
            const label = adminCopy[locale].tabs[tab.id]
            return <li key={tab.id}><button type="button" aria-current={active ? 'page' : undefined} aria-label={collapsed ? label : undefined} title={collapsed ? label : undefined} onClick={() => { onSelectTab(tab.id); onNavigate?.() }} className={`${itemClass} ${active ? 'bg-brand-soft font-semibold text-brand-deep' : 'font-semibold text-ink-soft hover:bg-surface-2 hover:text-ink'}`}><TabIcon size={17} aria-hidden />{!collapsed && <span>{label}</span>}</button></li>
          })}
          {superAdminHref && <li><a href={superAdminHref} aria-label={collapsed ? copy.superAdminSpace : undefined} title={collapsed ? copy.superAdminSpace : undefined} onClick={onNavigate} className={`${itemClass} border border-brand/30 bg-brand-soft font-semibold text-brand-deep hover:bg-brand/20`}><ShieldCheck size={17} aria-hidden />{!collapsed && <span>{copy.superAdminSpace}</span>}</a></li>}
          <li><button type="button" aria-label={collapsed ? copy.recharges : undefined} title={collapsed ? copy.recharges : undefined} onClick={() => { onSelectRecharge(); onNavigate?.() }} className={`${itemClass} font-semibold text-ink-soft hover:bg-surface-2 hover:text-ink`}><CreditCard size={17} aria-hidden />{!collapsed && <span>{copy.recharges}</span>}</button></li>
        </ul>
      </section>

      <section className="border-t border-line pt-5">
        <h2 className={`px-2 text-[11px] font-bold tracking-[0.09em] text-muted uppercase rtl:tracking-normal rtl:normal-case ${collapsed ? 'sr-only' : ''}`}>{copy.userNavigation}</h2>
        <ul className="mt-2 list-none space-y-1">
          {userLinks.map(({ label, href, icon: LinkIcon }) => <li key={label}><a href={href} aria-label={collapsed ? label : undefined} title={collapsed ? label : undefined} onClick={onNavigate} className={`${itemClass} font-medium text-ink-soft hover:bg-surface-2 hover:text-ink`}><LinkIcon size={17} aria-hidden />{!collapsed && <span>{label}</span>}</a></li>)}
        </ul>
      </section>
    </nav>
  )
}

/** Controlled rail on desktop and a shared accessible drawer below `lg`. */
export function AdminSidebar({ collapsed, mobileOpen, onMobileOpenChange, ...props }: AdminSidebarProps) {
  const { locale } = useI18n()
  const copy = adminCopy[locale].sidebar

  return (
    <>
      <aside className={`${card} sticky top-24 hidden self-start p-3 lg:block`}>
        <SidebarLinks {...props} collapsed={collapsed} />
      </aside>

      <Drawer open={mobileOpen} onClose={() => onMobileOpenChange(false)} title={copy.title} panelWidthClassName="w-[min(88vw,20rem)]">
        <SidebarLinks {...props} collapsed={false} onNavigate={() => onMobileOpenChange(false)} />
      </Drawer>
    </>
  )
}

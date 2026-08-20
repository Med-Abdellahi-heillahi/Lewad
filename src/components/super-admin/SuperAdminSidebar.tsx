import { AppWindow, ArrowLeft, ClipboardList, PanelLeftClose, PanelLeftOpen, ShieldCheck, ShieldEllipsis, UsersRound, UserRoundCog } from 'lucide-react'
import { useI18n } from '../../i18n'
import { card, iconBtn } from '../../lib/ui'
import { Drawer } from '../shell/Drawer'
import { adminCopy, type SuperAdminTabId } from '../admin/adminCopy'
import type { AdminIcon } from '../admin/AdminUi'

export const superAdminTabs: { id: SuperAdminTabId; icon: AdminIcon }[] = [
  { id: 'overview', icon: AppWindow },
  { id: 'admins', icon: UserRoundCog },
  { id: 'users', icon: UsersRound },
  { id: 'audit', icon: ClipboardList },
  { id: 'security', icon: ShieldCheck },
  { id: 'settings', icon: ShieldEllipsis },
]

type SuperAdminSidebarProps = {
  activeTab: SuperAdminTabId
  collapsed: boolean
  mobileOpen: boolean
  onDesktopToggle: () => void
  onMobileOpenChange: (open: boolean) => void
  onSelectTab: (tab: SuperAdminTabId) => void
}

type SidebarLinksProps = Pick<SuperAdminSidebarProps, 'activeTab' | 'collapsed' | 'onSelectTab'> & {
  onNavigate?: () => void
}

function SidebarLinks({ activeTab, collapsed, onSelectTab, onNavigate }: SidebarLinksProps) {
  const { locale } = useI18n()
  const copy = adminCopy[locale].superSpace
  const itemClass = `flex min-h-11 w-full items-center rounded-xl px-3 text-start text-sm transition-colors ${collapsed ? 'justify-center px-0' : 'gap-3'}`

  return (
    <nav aria-label={copy.navigation} className="space-y-5">
      <section>
        <h2 className={`px-2 text-[11px] font-bold tracking-[0.09em] text-muted uppercase rtl:tracking-normal rtl:normal-case ${collapsed ? 'sr-only' : ''}`}>{copy.title}</h2>
        <ul className="mt-2 list-none space-y-1">
          {superAdminTabs.map((tab) => {
            const TabIcon = tab.icon
            const label = copy.tabs[tab.id]
            const active = activeTab === tab.id
            return <li key={tab.id}><button type="button" aria-current={active ? 'page' : undefined} aria-label={collapsed ? label : undefined} title={collapsed ? label : undefined} onClick={() => { onSelectTab(tab.id); onNavigate?.() }} className={`${itemClass} ${active ? 'bg-brand-soft font-semibold text-brand-deep' : 'font-semibold text-ink-soft hover:bg-surface-2 hover:text-ink'}`}><TabIcon size={17} aria-hidden />{!collapsed && <span>{label}</span>}</button></li>
          })}
        </ul>
      </section>

      <section className="border-t border-line pt-5">
        <ul className="list-none space-y-1">
          <li><a href="/admin" onClick={onNavigate} aria-label={collapsed ? copy.goToAdmin : undefined} title={collapsed ? copy.goToAdmin : undefined} className={`${itemClass} border border-brand/30 bg-brand-soft font-semibold text-brand-deep hover:bg-brand/20`}><ArrowLeft size={17} aria-hidden className="rtl:rotate-180" />{!collapsed && <span>{copy.goToAdmin}</span>}</a></li>
          <li><a href="/app" onClick={onNavigate} aria-label={collapsed ? copy.backToApp : undefined} title={collapsed ? copy.backToApp : undefined} className={`${itemClass} font-medium text-ink-soft hover:bg-surface-2 hover:text-ink`}><ArrowLeft size={17} aria-hidden className="rtl:rotate-180" />{!collapsed && <span>{copy.backToApp}</span>}</a></li>
        </ul>
      </section>
    </nav>
  )
}

/** Separate control-center navigation for the dedicated super-admin route. */
export function SuperAdminSidebar({ collapsed, mobileOpen, onDesktopToggle, onMobileOpenChange, ...props }: SuperAdminSidebarProps) {
  const { locale } = useI18n()
  const copy = adminCopy[locale].superSpace
  const sidebarCopy = adminCopy[locale].sidebar

  return (
    <>
      <aside className={`${card} sticky top-24 hidden self-start p-3 lg:block`}>
        <div className="mb-3 hidden justify-end lg:flex"><button type="button" className={iconBtn} onClick={onDesktopToggle} aria-label={collapsed ? sidebarCopy.expand : sidebarCopy.collapse} title={collapsed ? sidebarCopy.expand : sidebarCopy.collapse}>{collapsed ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}</button></div>
        <SidebarLinks {...props} collapsed={collapsed} />
      </aside>

      <Drawer open={mobileOpen} onClose={() => onMobileOpenChange(false)} title={copy.navigation} panelWidthClassName="w-[min(88vw,20rem)]">
        <SidebarLinks {...props} collapsed={false} onNavigate={() => onMobileOpenChange(false)} />
      </Drawer>
    </>
  )
}

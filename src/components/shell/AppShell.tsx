import { useEffect, type ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { useAccount } from '../../hooks/useAccount'
import { AppBar, type AdminBarProps } from './AppBar'
import { AppFooter } from './AppFooter'
import { AppTabBar } from './AppTabBar'
import { appShellCopy, type AppNavId } from './appNav'

type AppShellProps = {
  /** Entrée de navigation active, pour la barre du haut et les onglets. */
  active?: AppNavId
  /** Titre du document — toujours suffixé « — Lewad ». */
  documentTitle?: string
  /** Cible du lien d'évitement ; `#app-main` par défaut. */
  skipTarget?: string
  skipLabel?: string
  homeHref?: string
  /** Remplace la navigation membre par une topbar administration compacte. */
  adminBar?: AdminBarProps
  children: ReactNode
}

/**
 * Coquille commune des pages applicatives : bandeau, contenu, onglets mobiles
 * et pied de page. Une seule structure pour `/app`, `/profile`, `/credits`,
 * `/recharge`, `/settings` et `/contact` — la barre ne peut plus diverger d'une
 * page à l'autre.
 */
export function AppShell({
  active,
  documentTitle,
  skipTarget = '#app-main',
  skipLabel,
  homeHref,
  adminBar,
  children,
}: AppShellProps) {
  const { locale } = useI18n()
  const { isAuthenticated } = useAccount()
  const copy = appShellCopy[locale]

  useEffect(() => {
    if (documentTitle) document.title = `${documentTitle} — Lewad`
  }, [documentTitle])

  const surface = adminBar ? 'app' : 'client'
  const footerClearance = !isAuthenticated
    ? ''
    : adminBar
      ? 'pb-20 lg:pb-5'
      : 'pb-[calc(8rem+env(safe-area-inset-bottom))] lg:pb-5'

  return (
    // Les pages client reprennent l'identité de la landing ; les espaces admin
    // conservent leur palette neutre sous `data-surface="app"`.
    <div data-surface={surface} className="flex min-h-dvh flex-col overflow-x-clip bg-page-alt text-ink">
      <a
        href={skipTarget}
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-60 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-brand-ink"
      >
        {skipLabel ?? copy.primaryNav}
      </a>

      <AppBar active={active} homeHref={homeHref} admin={adminBar} />

      <div className="flex-1">{children}</div>

      {/* La marge basse dégage les onglets et le raccourci flottant sur mobile. */}
      <AppFooter by={copy.by} version={copy.version} className={footerClearance} />

      {isAuthenticated && !adminBar && <AppTabBar active={active} />}
    </div>
  )
}

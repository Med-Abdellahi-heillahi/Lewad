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

  return (
    // `data-surface="app"` bascule les tokens de couleur sur la palette neutre
    // de l'espace membre (voir src/index.css). La landing n'est pas concernée.
    <div data-surface="app" className="flex min-h-dvh flex-col bg-page text-ink">
      <a
        href={skipTarget}
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-60 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-brand-ink"
      >
        {skipLabel ?? copy.primaryNav}
      </a>

      <AppBar active={active} homeHref={homeHref} admin={adminBar} />

      <div className="flex-1">{children}</div>

      {/* La marge basse du pied dégage la barre d'onglets fixe sur mobile. */}
      <AppFooter by={copy.by} version={copy.version} className={isAuthenticated ? 'pb-20 lg:pb-5' : ''} />

      {isAuthenticated && !adminBar && <AppTabBar active={active} />}
    </div>
  )
}

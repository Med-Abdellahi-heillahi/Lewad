import { appWrap } from '../../lib/ui'

type AppFooterProps = {
  by: string
  version: string
  /** Mention de copyright discrète, optionnelle. */
  rights?: string
  /** Marge additionnelle — sert à dégager la barre d'onglets mobile. */
  className?: string
}

/**
 * Pied de page applicatif : volontairement minimal.
 * Dans `/app` et `/auth` l'utilisateur travaille — le pied ne doit pas
 * concurrencer le contenu comme celui de la landing.
 */
export function AppFooter({ by, version, rights, className = '' }: AppFooterProps) {
  return (
    <footer className="border-t border-line">
      <div
        className={`${appWrap} flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-5 text-[13px] text-muted ${className}`}
      >
        <span className="font-semibold text-ink-soft">{by}</span>
        {rights && <span className="order-last w-full text-center sm:order-none sm:w-auto">{rights}</span>}
        <span className="tabular ltr-isolate">{version}</span>
      </div>
    </footer>
  )
}

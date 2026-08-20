import { Component, type ErrorInfo, type ReactNode } from 'react'
import type { Locale } from '../../i18n'
import { useI18n } from '../../i18n'
import { btnPrimary } from '../../lib/ui'
import { Icon } from '../Icon'

type Copy = { title: string; retry: string }

/**
 * Comme `AdminLoading`, ces chaînes restent locales : le message doit pouvoir
 * s'afficher alors que le lot distant n'a justement pas pu être récupéré.
 */
const labels: Record<Locale, Copy> = {
  fr: { title: 'Impossible de charger l’espace admin. Réessayez.', retry: 'Réessayer' },
  ar: { title: 'تعذّر تحميل مساحة الإدارة. حاول مجددًا.', retry: 'إعادة المحاولة' },
  en: { title: 'Unable to load the admin space. Please try again.', retry: 'Try again' },
}

function ChunkErrorScreen() {
  const { locale } = useI18n()
  const copy = labels[locale]

  return (
    <main role="alert" className="grid min-h-dvh place-items-center bg-page px-5 text-ink">
      <div className="max-w-sm text-center">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-ask-bg text-ask">
          <Icon name="alert" size={21} />
        </span>
        <p className="mt-4 text-sm leading-6 text-muted">{copy.title}</p>
        {/* Un rechargement complet plutôt qu'un simple `retry` : un lot
            introuvable vient presque toujours d'un déploiement plus récent,
            et seul un nouveau chargement ira chercher le bon manifeste. */}
        <button type="button" className={`${btnPrimary} mt-5`} onClick={() => window.location.reload()}>
          {copy.retry}
        </button>
      </div>
    </main>
  )
}

/**
 * Filet de sécurité autour d'un `import()` paresseux. Sans lui, un lot
 * inaccessible (réseau coupé, déploiement entre-temps) laisse un écran blanc.
 */
export class ChunkErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) console.error('Lazy chunk failed to load', error, info)
  }

  render() {
    return this.state.failed ? <ChunkErrorScreen /> : this.props.children
  }
}

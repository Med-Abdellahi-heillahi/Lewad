import { useI18n } from '../../i18n'
import { Icon } from '../Icon'

/**
 * Bouton retour discret en haut de page membre.
 *
 * Comportement : `history.back()` si l'historique contient au moins une entrée
 * côté même origine, sinon `/app`. Ne renvoie jamais vers admin/super-admin.
 */
export function BackButton({ className = '' }: { className?: string }) {
  const { t } = useI18n()
  const label = t.backButton.label

  const goBack = () => {
    if (window.history.length > 1) window.history.back()
    else window.location.assign('/app')
  }

  return (
    <button
      type="button"
      onClick={goBack}
      aria-label={label}
      className={`mb-5 inline-flex min-h-11 items-center gap-2 rounded-full border border-line bg-surface/85 px-3.5 text-sm font-semibold text-ink-soft backdrop-blur-sm transition-colors card-elevated hover:border-brand/50 hover:bg-brand-soft hover:text-brand-deep dark:hover:text-brand ${className}`}
    >
      <span className="rtl:rotate-180">
        <Icon name="chevronLeft" size={18} />
      </span>
      {label}
    </button>
  )
}

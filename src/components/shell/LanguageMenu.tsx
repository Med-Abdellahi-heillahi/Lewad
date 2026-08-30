import { useI18n } from '../../i18n'
import { iconBtn } from '../../lib/ui'
import { FlagIcon } from '../FlagIcon'

type LanguageMenuProps = {
  /** Conservé pour les appelants existants : ce contrôle n'ouvre plus de panneau. */
  align?: 'start' | 'end'
  className?: string
}

/**
 * Bascule rapide partagée par la landing, `/app` et `/auth`.
 * Le parcours public ne propose que les deux langues du produit : français et
 * arabe. English remains available in the internal appearance settings.
 */
export function LanguageMenu({ className = '' }: LanguageMenuProps) {
  const { t, locale, setLocale } = useI18n()
  const nextLocale = locale === 'fr' ? 'ar' : 'fr'
  const label = nextLocale === 'ar' ? t.nav.switchToArabic : t.nav.switchToFrench

  return (
    <button
      type="button"
      className={`${iconBtn} w-auto gap-1.5 px-2.5 text-[13px] font-semibold ${className}`}
      aria-label={label}
      title={label}
      onClick={() => setLocale(nextLocale)}
    >
      <FlagIcon locale={locale} decorative />
      <span aria-hidden="true">{locale.toUpperCase()}</span>
    </button>
  )
}

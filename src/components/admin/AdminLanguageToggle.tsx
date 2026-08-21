import { useI18n } from '../../i18n'
import { iconBtn } from '../../lib/ui'
import { FlagIcon } from '../FlagIcon'

const shortMap: Record<'fr' | 'ar' | 'en', string> = {
  fr: 'FR',
  ar: 'AR',
  en: 'EN',
}

type AdminLanguageToggleProps = {
  className?: string
}

/**
 * Quick language toggle for admin/super-admin navbar.
 * Directly toggles between FR ↔ AR. English falls back to FR.
 * Shows flag emoji + short label.
 */
export function AdminLanguageToggle({ className = '' }: AdminLanguageToggleProps) {
  const { locale, setLocale, t } = useI18n()

  const toggle = () => {
    if (locale === 'fr') {
      setLocale('ar')
    } else {
      setLocale('fr')
    }
  }

  const nextLocale = locale === 'fr' ? 'ar' : 'fr'
  const label = locale === 'fr' ? t.nav.switchToArabic : t.nav.switchToFrench

  return (
    <button
      type="button"
      className={`${iconBtn} w-auto gap-1.5 px-2.5 text-[13px] font-semibold ${className}`}
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      {/* Drapeau image plutôt qu'émoji : Windows ne rend pas les émojis
          drapeaux, où le bouton n'affichait que « FR »/« AR » en indicatif. */}
      <FlagIcon locale={locale} decorative />
      <span aria-hidden="true">{shortMap[locale]}</span>
    </button>
  )
}

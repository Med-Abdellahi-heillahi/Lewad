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
 * Cycles through all supported locales, including English.
 * Shows flag emoji + short label.
 */
export function AdminLanguageToggle({ className = '' }: AdminLanguageToggleProps) {
  const { locale, setLocale, t } = useI18n()

  const nextLocaleMap = { fr: 'ar', ar: 'en', en: 'fr' } as const
  const nextLocale = nextLocaleMap[locale]
  const labelMap = {
    fr: t.nav.switchToArabic,
    ar: t.nav.switchToEnglish,
    en: t.nav.switchToFrench,
  } as const

  const toggle = () => {
    setLocale(nextLocale)
  }

  const label = labelMap[locale]

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

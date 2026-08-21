import { useI18n } from '../../i18n'
import { iconBtn } from '../../lib/ui'

const flagMap: Record<'fr' | 'ar' | 'en', string> = {
  fr: '\u{1F1EB}\u{1F1F7}',
  ar: '\u{1F1F2}\u{1F1F7}',
  en: '\u{1F1EC}\u{1F1E7}',
}

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
      <span aria-hidden="true">{flagMap[locale]}</span>
      <span aria-hidden="true">{shortMap[locale]}</span>
    </button>
  )
}

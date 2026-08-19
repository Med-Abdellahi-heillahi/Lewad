import { useI18n } from '../../i18n'
import { useTheme } from '../../lib/theme'
import { iconBtn } from '../../lib/ui'
import { Icon } from '../Icon'

/** Bascule clair/sombre partagée par toutes les barres de navigation. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { t } = useI18n()
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      className={`${iconBtn} ${className}`}
      onClick={toggleTheme}
      aria-label={theme === 'light' ? t.nav.toDark : t.nav.toLight}
      title={theme === 'light' ? t.nav.toDark : t.nav.toLight}
    >
      <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
    </button>
  )
}

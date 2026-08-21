import { localeFlagSrc } from '../lib/assets'
import { dictionaries, type Locale } from '../i18n'

type FlagIconProps = {
  locale: Locale
  /** Taille du drapeau. Le ratio 3:2 est celui des trois fichiers fournis. */
  className?: string
  /**
   * `true` quand le nom de la langue est déjà visible à côté : le drapeau
   * devient décoratif et ne doit pas être annoncé deux fois.
   */
  decorative?: boolean
}

/**
 * Drapeau de langue : France pour le français, Mauritanie pour l'arabe,
 * Royaume-Uni pour l'anglais.
 *
 * Les fichiers sont servis depuis `public/assets/`. Le cadre arrondi et le
 * liseré évitent qu'un drapeau à dominante claire — la moitié blanche du
 * drapeau français — se fonde dans une surface claire.
 */
export function FlagIcon({ locale, className = 'h-3.5 w-5', decorative = false }: FlagIconProps) {
  return (
    <img
      src={localeFlagSrc[locale]}
      alt={decorative ? '' : dictionaries[locale].meta.label}
      aria-hidden={decorative || undefined}
      width={30}
      height={20}
      loading="lazy"
      decoding="async"
      className={`shrink-0 rounded-[3px] object-cover ring-1 ring-line ${className}`}
    />
  )
}

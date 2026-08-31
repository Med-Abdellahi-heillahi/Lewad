import { logoEmblemCrop, logoSrc } from '../lib/assets'
import { useI18n } from '../i18n'

/**
 * Le logo officiel est un PNG transparent dont l'encre principale est bleu nuit,
 * avec des accents ambrés. Posé tel quel sur un fond sombre, le chameau et le
 * mot-symbole disparaissent — seuls les accents restent lisibles.
 *
 * La pastille claire résout le cas des deux thèmes d'un seul geste : la marque
 * est toujours rendue sur le fond clair pour lequel elle a été dessinée.
 * `bg-white` est un utilitaire Tailwind, pas un nouveau jeton de thème ; la
 * pastille reste volontairement identique en clair et en sombre.
 */
const logoPlate = 'border border-line bg-white'

type LogoProps = {
  /** Masque le mot-symbole et ne garde que l'emblème. */
  compact?: boolean
  className?: string
}

/**
 * Emblème seul — le chameau et le point d'interrogation — posé sur sa pastille.
 *
 * Le dessin est cadré en 4/3 (voir `logoEmblemCrop`) et centré dans une
 * pastille carrée : c'est elle qui rend la marge que le cadrage ne peut pas
 * prendre sous l'emblème, le mot-symbole commençant une ligne plus bas.
 *
 * `className` porte la taille *et* le rayon : les deux varient selon l'usage, et
 * laisser un rayon par défaut ici entrerait en conflit avec celui de l'appelant.
 */
function LogoEmblem({ className }: { className: string }) {
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center ${logoPlate} ${className}`}>
      <span className="aspect-[4/3] w-[82%]" style={logoEmblemCrop} />
    </span>
  )
}

/**
 * Logo compact : emblème + mot-symbole composé en typographie.
 *
 * Le fichier de marque est un verrouillage vertical (emblème, « Lewad »,
 * « لواد », signature). À la hauteur d'une barre de navigation, sa signature
 * tomberait sous les deux pixels : on garde donc l'emblème en image et le nom
 * en texte, qui reste net à toutes les tailles. `LogoLockup` sert partout où la
 * hauteur permet d'afficher le verrouillage complet.
 */
export function Logo({ compact = false, className = '' }: LogoProps) {
  const { locale, t } = useI18n()

  return (
    <span dir={locale === 'ar' ? 'rtl' : 'ltr'} className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoEmblem className="size-8 rounded-[10px]" />
      {!compact && (
        <bdi dir="auto" lang={locale} className="font-display text-[19px] leading-none font-bold tracking-[0.04em] text-ink rtl:tracking-normal">
          {t.brandName}
        </bdi>
      )}
    </span>
  )
}

type LogoLockupProps = {
  /** Hauteur de l'image. La pastille s'ajuste autour. */
  className?: string
  /** Texte alternatif. Vide si un intitulé visible porte déjà le nom. */
  alt?: string
}

/**
 * Verrouillage complet de la marque, en image. Réservé aux contextes qui ont la
 * hauteur nécessaire : pied de page, page d'authentification.
 *
 * `object-contain` garde le ratio ; la hauteur est pilotée par `className`.
 */
export function LogoLockup({ className = 'h-20', alt }: LogoLockupProps) {
  const { t } = useI18n()

  return (
    <span dir="ltr" className={`inline-flex w-max rounded-2xl p-2 ${logoPlate}`}>
      <img
        src={logoSrc}
        alt={alt ?? t.brandName}
        width={500}
        height={500}
        loading="lazy"
        decoding="async"
        className={`w-auto max-w-full object-contain ${className}`}
      />
    </span>
  )
}

/**
 * Emblème seul, à la taille d'une icône d'application. Sert aux maquettes
 * d'installation, où la tuile représente Lewad sur l'écran d'accueil.
 */
export function LogoAppIcon({ className = 'size-12 rounded-2xl' }: { className?: string }) {
  return <LogoEmblem className={className} />
}

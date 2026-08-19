type LogoProps = {
  /** Masque le mot-symbole et ne garde que le signe. */
  compact?: boolean
  className?: string
}

/**
 * Logo temporaire : signe géométrique (repère de recherche locale) + mot « LEWAD »
 * composé en vraie typographie. Aucun texte n'est intégré à une image.
 */
export function Logo({ compact = false, className = '' }: LogoProps) {
  return (
    // `dir="ltr"` : le mot-symbole latin garde toujours le signe en tête,
    // y compris sur une page arabe — un logo ne se miroite pas.
    <span dir="ltr" className={`inline-flex items-center gap-2.5 ${className}`}>
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-brand text-brand-ink"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          {/* Repère de carte : le point creux évoque la loupe de recherche. */}
          <path
            d="M12 21.5s6.6-6.7 6.6-11a6.6 6.6 0 1 0-13.2 0c0 4.3 6.6 11 6.6 11Z"
            fill="currentColor"
          />
          <circle cx="12" cy="10.2" r="2.5" className="fill-brand" />
        </svg>
      </span>
      {!compact && (
        <span className="font-display text-[19px] leading-none font-bold tracking-[0.04em] text-ink">LEWAD</span>
      )}
    </span>
  )
}

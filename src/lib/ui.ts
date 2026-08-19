/**
 * Classes partagées. Volontairement de simples chaînes plutôt que des composants
 * à rallonge : on garde la lisibilité Tailwind sans abstraction inutile.
 */

export const btnBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-45'

export const btnPrimary = `${btnBase} bg-brand text-brand-ink hover:bg-brand/85`

export const btnGhost = `${btnBase} border border-line bg-surface text-ink hover:bg-surface-2`

export const btnQuiet = `${btnBase} text-ink hover:bg-surface-2`

/**
 * Bouton icône carré, cible tactile 44px. `inline-flex` (et non `grid`) pour que
 * les variantes avec libellé alignent icône et texte sur une seule ligne.
 */
export const iconBtn =
  'inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink transition-colors duration-200 hover:bg-surface-2'

/** Conteneur horizontal commun à toutes les sections. */
export const wrap = 'mx-auto w-full max-w-[1180px] px-5 sm:px-6'

/** Rythme vertical commun. */
export const sectionPad = 'py-16 sm:py-20 lg:py-28'

export const card = 'rounded-2xl border border-line bg-surface'

export const eyebrow =
  'inline-flex w-max items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-semibold tracking-[0.09em] text-muted uppercase rtl:tracking-normal rtl:normal-case'

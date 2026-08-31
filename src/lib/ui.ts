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

/** Conteneur horizontal commun à toutes les sections de la landing. */
export const wrap = 'mx-auto w-full max-w-[1180px] px-5 sm:px-6'

/**
 * Conteneur des pages applicatives. Plus large que la landing : à partir de
 * `lg` les pages membre passent en deux colonnes et ont besoin de la place.
 */
export const appWrap = 'mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8'

/** Rythme vertical commun. */
export const sectionPad = 'py-16 sm:py-20 lg:py-28'

/** Rythme vertical des pages applicatives — plus serré, plus « produit ». */
export const appPad = 'py-6 sm:py-9 lg:py-12'

export const card = 'rounded-2xl border border-line bg-surface card-elevated'

/** Carte de second plan : sert de conteneur à une donnée, pas à une action. */
export const cardMuted = 'rounded-2xl border border-line bg-page-alt'

export const eyebrow =
  'inline-flex w-max items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-semibold tracking-[0.09em] text-muted uppercase rtl:tracking-normal rtl:normal-case'

/** Champ de formulaire : hauteur 48px, cible tactile confortable au pouce. */
export const field =
  'h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-base text-ink outline-none transition-colors placeholder:text-muted focus:border-brand-deep focus:ring-2 focus:ring-brand-deep/15 sm:text-sm'

/**
 * Champ non modifiable. Le fond plein et le curseur barré disent « lecture
 * seule » avant même que l'utilisateur essaie de taper.
 */
export const fieldReadOnly = `${field} cursor-not-allowed border-dashed bg-surface-2 text-muted focus:border-line focus:ring-0`

export const fieldLabel = 'mb-2 block text-sm font-semibold text-ink'

export const fieldHint = 'mt-2 text-xs leading-5 text-muted'

/** Étiquette compacte : statut, rôle, unité. */
export const pill = 'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold'

/** Bloc de chargement. `motion-safe` respecte « réduire les animations ». */
export const skeleton = 'rounded-xl bg-surface-2 motion-safe:animate-pulse'

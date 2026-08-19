import type { Transition, Variants } from 'framer-motion'

/** Courbe douce, sans rebond — cohérente sur toute la page. */
export const ease = [0.16, 1, 0.3, 1] as const

export const transition: Transition = { duration: 0.45, ease }

/** Apparition standard des blocs au défilement. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0 },
}

/** Ouverture d'un panneau (menu, accordéon). */
export const collapse: Variants = {
  hidden: { opacity: 0, height: 0 },
  show: { opacity: 1, height: 'auto' },
}

/** Zone d'entrée : on déclenche un peu avant que le bloc soit pleinement visible. */
export const viewport = { once: true, margin: '-60px' } as const

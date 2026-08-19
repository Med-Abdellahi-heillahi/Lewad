import { m, useReducedMotion } from 'framer-motion'
import type { ReactNode } from 'react'
import { ease, fadeUp, viewport } from '../lib/motion'

type RevealProps = {
  children: ReactNode
  /** Retard en secondes, pour une cascade légère. */
  delay?: number
  className?: string
  as?: 'div' | 'section' | 'li' | 'article'
}

/**
 * Apparition au défilement. Sous `prefers-reduced-motion` le contenu est rendu
 * tel quel, sans transformation ni fondu.
 */
export function Reveal({ children, delay = 0, className, as = 'div' }: RevealProps) {
  const reduce = useReducedMotion()
  const Tag = m[as]

  if (reduce) {
    const Plain = as
    return <Plain className={className}>{children}</Plain>
  }

  return (
    <Tag
      className={className}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={viewport}
      transition={{ duration: 0.45, ease, delay }}
    >
      {children}
    </Tag>
  )
}

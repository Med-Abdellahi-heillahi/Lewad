import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'

type AlertProps = {
  children: ReactNode
  /** `note` = neutre et discret, `info` = accentué marque. */
  variant?: 'note' | 'info'
  icon?: IconName
  className?: string
}

const styles = {
  note: 'border-line bg-surface-2 text-muted',
  info: 'border-brand/45 bg-brand-soft text-ink-soft',
} as const

const iconStyles = {
  note: 'text-muted',
  info: 'text-brand-deep',
} as const

/** Bandeau d'information sobre : jamais bloquant, jamais alarmiste. */
export function Alert({ children, variant = 'note', icon = 'info', className = '' }: AlertProps) {
  return (
    <div
      role="note"
      className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] leading-relaxed ${styles[variant]} ${className}`}
    >
      <span className={`mt-px shrink-0 ${iconStyles[variant]}`}>
        <Icon name={icon} size={16} />
      </span>
      <span>{children}</span>
    </div>
  )
}

import type { ReactNode } from 'react'
import { card, skeleton } from '../../lib/ui'
import { Icon, type IconName } from '../Icon'

/** Bloc gris animé, dimensionné par la classe passée. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`block ${skeleton} ${className}`} />
}

type Tone = 'error' | 'success' | 'info' | 'neutral'

const toneStyles: Record<Tone, string> = {
  error: 'border-ask/30 bg-ask-bg text-ask',
  success: 'border-answer/30 bg-answer-bg text-answer',
  info: 'border-brand/45 bg-brand-soft text-brand-deep',
  neutral: 'border-line bg-surface-2 text-ink-soft',
}

const toneIcons: Record<Tone, IconName> = { error: 'alert', success: 'check', info: 'info', neutral: 'info' }

/**
 * Message inline — jamais une `alert()` navigateur : l'utilisateur garde la page
 * sous les yeux et le lecteur d'écran reçoit le bon rôle live.
 */
export function InlineAlert({
  tone = 'neutral',
  title,
  children,
  action,
  className = '',
}: {
  tone?: Tone
  title?: string
  children?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3.5 text-sm leading-6 sm:flex-row sm:items-center sm:justify-between ${toneStyles[tone]} ${className}`}
    >
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 shrink-0">
          <Icon name={toneIcons[tone]} size={17} />
        </span>
        <span className="min-w-0">
          {title && <strong className="block font-semibold">{title}</strong>}
          {children}
        </span>
      </div>
      {action && <span className="shrink-0">{action}</span>}
    </div>
  )
}

/**
 * État vide illustré. Un vide n'est pas une erreur : ton neutre, et toujours
 * une action pour en sortir quand il en existe une.
 */
export function EmptyState({
  icon = 'info',
  title,
  text,
  action,
  className = '',
}: {
  icon?: IconName
  title: string
  text?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={`grid place-items-center rounded-2xl border border-dashed border-line px-6 py-10 text-center ${className}`}>
      <div className="max-w-sm">
        <span className="mx-auto grid size-11 place-items-center rounded-xl bg-surface-2 text-muted">
          <Icon name={icon} size={21} />
        </span>
        <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
        {text && <p className="mt-2 text-sm leading-6 text-muted">{text}</p>}
        {action && <div className="mt-5 flex justify-center">{action}</div>}
      </div>
    </div>
  )
}

/** Squelette de carte pendant un chargement Supabase. */
export function LoadingCard({ lines = 3, label }: { lines?: number; label: string }) {
  return (
    <div className={`${card} p-5 sm:p-6`} role="status" aria-busy="true">
      <Skeleton className="h-4 w-32" />
      <div className="mt-5 grid gap-3">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton key={index} className={`h-11 ${index === lines - 1 ? 'w-2/3' : 'w-full'}`} />
        ))}
      </div>
      <span className="sr-only">{label}</span>
    </div>
  )
}

import { useEffect, useId, useRef, type ComponentType, type ReactNode } from 'react'
import { AlertTriangle, Info, X, type LucideProps } from 'lucide-react'
import { useI18n } from '../../i18n'
import { formatNumber } from '../../lib/format'
import { card, iconBtn, pill } from '../../lib/ui'
import { adminCopy } from './adminCopy'

export type AdminIcon = ComponentType<LucideProps>

function statusClass(status: string) {
  if (['active', 'approved', 'added', 'success'].includes(status)) return 'bg-answer-bg text-answer'
  if (['pending', 'reviewed', 'draft'].includes(status)) return 'bg-brand-soft text-brand-deep'
  if (['rejected', 'suspended', 'deleted', 'error', 'insufficient_credits', 'closed'].includes(status)) return 'bg-ask-bg text-ask'
  return 'bg-surface-2 text-ink-soft'
}

export function AdminStatusBadge({ value }: { value: string }) {
  const { locale } = useI18n()
  const label = adminCopy[locale].content.status[value] ?? value.replaceAll('_', ' ')
  return <span className={`${pill} ${statusClass(value)}`}>{label}</span>
}

/**
 * Primitives partagées de l'espace admin. Volontairement minimales : elles
 * portent le rythme visuel dense d'un outil interne, pas une bibliothèque.
 */

export function AdminSectionHeader({
  icon: LeadIcon,
  title,
  text,
  actions,
}: {
  icon?: AdminIcon
  title: string
  text?: string
  actions?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-3">
        {LeadIcon && (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-ink-soft">
            <LeadIcon size={18} aria-hidden />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          {text && <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}

export function AdminMetricCard({
  icon: LeadIcon,
  label,
  value,
  hint,
  tone = 'neutral',
}: {
  icon: AdminIcon
  label: string
  value: number | string
  hint?: string
  /** `attention` souligne un compteur qui appelle une action, sans le colorer entièrement. */
  tone?: 'neutral' | 'attention'
}) {
  const { locale } = useI18n()
  const display = typeof value === 'number' ? formatNumber(value, locale) : value

  return (
    <article className={`${card} p-4 sm:p-5`}>
      <div className="flex items-start justify-between gap-3">
        <span
          className={`grid size-9 shrink-0 place-items-center rounded-xl ${
            tone === 'attention' ? 'bg-ask-bg text-ask' : 'bg-surface-2 text-ink-soft'
          }`}
        >
          <LeadIcon size={18} aria-hidden />
        </span>
      </div>
      <p className="tabular mt-3 text-2xl font-bold text-ink">{display}</p>
      <p className="mt-1 text-sm font-medium text-ink-soft">{label}</p>
      {hint && <p className="mt-1 text-xs leading-relaxed text-muted">{hint}</p>}
    </article>
  )
}

export function AdminAlertCard({
  icon: LeadIcon,
  title,
  text,
  count,
  tone = 'info',
}: {
  icon?: AdminIcon
  title: string
  text: string
  count?: number
  tone?: 'warning' | 'info'
}) {
  const { locale } = useI18n()
  const ToneIcon = LeadIcon ?? (tone === 'warning' ? AlertTriangle : Info)

  return (
    <article
      className={`flex items-start gap-3 rounded-xl border p-4 ${
        tone === 'warning' ? 'border-ask/30 bg-ask-bg' : 'border-line bg-surface'
      }`}
    >
      <span className={`mt-0.5 shrink-0 ${tone === 'warning' ? 'text-ask' : 'text-muted'}`}>
        <ToneIcon size={17} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className={`text-sm font-bold ${tone === 'warning' ? 'text-ask' : 'text-ink'}`}>{title}</h3>
          {count !== undefined && (
            <span className="tabular rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-ink-soft">
              {formatNumber(count, locale)}
            </span>
          )}
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{text}</p>
      </div>
    </article>
  )
}

export function AdminEmptyState({
  icon: LeadIcon,
  title,
  text,
  badge,
}: {
  icon: AdminIcon
  title: string
  text: string
  badge?: string
}) {
  return (
    <div className={`${card} grid place-items-center px-5 py-10 text-center`}>
      <span className="grid size-11 place-items-center rounded-xl bg-surface-2 text-muted">
        <LeadIcon size={20} aria-hidden />
      </span>
      <h3 className="mt-4 text-base font-bold text-ink">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">{text}</p>
      {badge && (
        <span className="mt-4 rounded-full border border-line px-3 py-1 text-[11px] font-bold tracking-wide text-muted uppercase rtl:tracking-normal rtl:normal-case">
          {badge}
        </span>
      )}
    </div>
  )
}

/**
 * Feuille modale de l'espace admin. Sous `sm` elle s'ancre en bas et occupe la
 * hauteur utile : sur un téléphone un formulaire long doit se comporter comme un
 * tiroir plein écran, pas comme une boîte flottante.
 */
export function AdminModal({
  title,
  subtitle,
  closeLabel,
  onClose,
  size = 'md',
  children,
}: {
  title: string
  subtitle?: string
  closeLabel: string
  onClose: () => void
  size?: 'md' | 'lg'
  children: ReactNode
}) {
  const titleId = useId()
  const closeButton = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const focusTimer = window.setTimeout(() => closeButton.current?.focus(), 20)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      previousFocus.current?.focus?.()
    }
  }, [onClose])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-60 grid place-items-end bg-ink/40 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        className={`max-h-[calc(100dvh-1rem)] w-full ${size === 'lg' ? 'max-w-2xl' : 'max-w-xl'} overflow-y-auto rounded-t-3xl border border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:p-5`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-lg font-bold tracking-tight text-ink">{title}</h2>
            {subtitle && <p className="mt-1 text-xs leading-5 text-muted">{subtitle}</p>}
          </div>
          <button ref={closeButton} type="button" className={iconBtn} aria-label={closeLabel} title={closeLabel} onClick={onClose}>
            <X size={19} aria-hidden />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

/**
 * Bouton d'action admin. `disabled` est la valeur par défaut des actions futures :
 * une action affichée mais non protégée côté base ne doit jamais paraître cliquable.
 */
export function AdminActionButton({
  icon: LeadIcon,
  label,
  onClick,
  type = 'button',
  disabled = false,
  title,
  tone = 'neutral',
  iconOnly = false,
  className = '',
}: {
  icon: AdminIcon
  label: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  title?: string
  tone?: 'neutral' | 'primary' | 'warning' | 'danger' | 'success'
  /** Keeps dense table actions accessible without relying on the icon alone. */
  iconOnly?: boolean
  className?: string
}) {
  const tones = {
    neutral: 'border-line bg-surface text-ink-soft hover:bg-surface-2',
    primary: 'border-transparent bg-brand text-brand-ink hover:bg-brand/85',
    warning: 'border-brand/30 bg-brand-soft text-brand-deep hover:bg-brand/20',
    danger: 'border-ask/30 bg-ask-bg text-ask hover:bg-ask-bg',
    success: 'border-answer/30 bg-answer-bg text-answer hover:bg-answer-bg',
  } as const

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={iconOnly ? label : undefined}
      title={title ?? (iconOnly ? label : undefined)}
      className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-2.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${tones[tone]} ${iconOnly ? 'size-11 shrink-0 justify-center p-0' : ''} ${className}`}
    >
      <LeadIcon size={iconOnly ? 18 : 15} aria-hidden />
      {!iconOnly && label}
    </button>
  )
}

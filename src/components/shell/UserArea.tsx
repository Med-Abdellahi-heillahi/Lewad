import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../i18n'
import { ease } from '../../lib/motion'
import { useDismiss } from '../../lib/useDismiss'
import { btnGhost, btnPrimary } from '../../lib/ui'
import { Icon } from '../Icon'

export type UserAreaItem = {
  label: string
  href?: string
  onSelect?: () => void
}

type UserAreaProps = {
  /** `null` = visiteur non connecté : on affiche le CTA de connexion. */
  user?: { name: string; email?: string } | null
  /** Solde de points. `null` masque le badge. */
  credits?: number | null
  items?: UserAreaItem[]
  signInHref?: string
}

/**
 * Zone utilisateur du bandeau applicatif — **structure de présentation uniquement**.
 * Elle ne lit aucune session et n'appelle aucun service : le parent fournit le nom,
 * le solde et les entrées de menu. Prête à recevoir l'utilisateur connecté plus tard.
 */
export function UserArea({ user = null, credits = null, items = [], signInHref = '/auth?mode=login' }: UserAreaProps) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, ref, close)

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <a href={signInHref} className={`${btnGhost} hidden sm:inline-flex`}>
          {t.nav.signIn}
        </a>
        <a href={signInHref} className={`${btnPrimary} sm:hidden`} aria-label={t.nav.signIn}>
          <Icon name="user" size={17} />
        </a>
      </div>
    )
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || '?'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface ps-1.5 pe-2.5 transition-colors duration-200 hover:bg-surface-2"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={t.nav.account}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand text-[13px] font-bold text-brand-ink">
          {initial}
        </span>
        {/* Le nom n'apparaît qu'à partir de xl : à 1280px, la barre applicative
            porte déjà logo + navigation + langue + thème + badge de points. */}
        <span className="hidden max-w-28 truncate text-sm font-semibold text-ink xl:block">{user.name}</span>
        {credits !== null && (
          <span className="tabular inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-bold text-brand-deep">
            <Icon name="sparkle" size={11} />
            {credits}
          </span>
        )}
        <span className="text-muted">
          <Icon name="chevronDown" size={15} />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <m.div
            initial={reduce ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease }}
            className="absolute end-0 top-[calc(100%+8px)] z-50 w-60 rounded-2xl border border-line bg-surface p-1.5 shadow-xl shadow-black/10"
          >
            <div className="border-b border-line px-3 py-2.5">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              {user.email && <p className="ltr-isolate mt-0.5 truncate text-xs text-muted">{user.email}</p>}
            </div>

            <ul className="mt-1.5 list-none">
              {items.map((item) => (
                <li key={item.label}>
                  {item.href ? (
                    <a
                      href={item.href}
                      onClick={close}
                      className="block rounded-lg px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        item.onSelect?.()
                        close()
                      }}
                      className="block w-full rounded-lg px-3 py-2.5 text-start text-sm text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
                    >
                      {item.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  )
}

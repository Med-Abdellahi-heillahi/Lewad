import { useCallback, useRef, useState } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { dictionaries, locales, useI18n } from '../../i18n'
import { ease } from '../../lib/motion'
import { useDismiss } from '../../lib/useDismiss'
import { iconBtn } from '../../lib/ui'
import { Icon } from '../Icon'

type LanguageMenuProps = {
  /** Côté d'ancrage du panneau, relatif au sens de lecture. */
  align?: 'start' | 'end'
  className?: string
}

/**
 * Sélecteur de langue partagé par la landing, `/app` et `/auth`.
 * Un bouton compact plutôt qu'un segmenté à trois volets : la barre reste
 * lisible sur un écran de 320 px.
 */
export function LanguageMenu({ align = 'start', className = '' }: LanguageMenuProps) {
  const { t, locale, setLocale } = useI18n()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const close = useCallback(() => setOpen(false), [])
  useDismiss(open, ref, close)

  return (
    <div className={`relative ${className}`} ref={ref}>
      <button
        type="button"
        className={`${iconBtn} w-auto gap-1.5 px-2.5 text-[13px] font-semibold`}
        aria-label={t.nav.language}
        title={t.nav.language}
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="globe" size={18} />
        <span aria-hidden="true">{dictionaries[locale].meta.short}</span>
      </button>

      <AnimatePresence>
        {open && (
          <m.ul
            initial={reduce ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            animate={reduce ? undefined : { opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? undefined : { opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.18, ease }}
            className={`absolute top-[calc(100%+8px)] z-50 w-44 list-none rounded-xl border border-line bg-surface p-1.5 shadow-lg shadow-black/10 ${
              align === 'end' ? 'end-0' : 'start-0'
            }`}
          >
            {locales.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  lang={item}
                  aria-current={item === locale}
                  className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-start text-sm transition-colors ${
                    item === locale ? 'bg-surface-2 font-semibold text-ink' : 'text-muted hover:bg-surface-2'
                  }`}
                  onClick={() => {
                    setLocale(item)
                    setOpen(false)
                  }}
                >
                  {dictionaries[item].meta.label}
                  {item === locale && <Icon name="check" size={15} />}
                </button>
              </li>
            ))}
          </m.ul>
        )}
      </AnimatePresence>
    </div>
  )
}

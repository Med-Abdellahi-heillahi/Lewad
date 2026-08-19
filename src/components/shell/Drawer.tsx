import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../i18n'
import { ease } from '../../lib/motion'
import { Icon } from '../Icon'
import { Logo } from '../Logo'

type DrawerProps = {
  open: boolean
  onClose: () => void
  title: string
  panelWidthClassName?: string
  children: ReactNode
}

/**
 * Tiroir mobile plein écran, ouvert depuis le bord de fin de lecture.
 * Sur mobile on préfère un tiroir à un petit menu déroulant : cibles tactiles
 * larges, navigation au pouce, sensation applicative.
 */
export function Drawer({ open, onClose, title, panelWidthClassName = 'w-[min(92vw,22rem)]', children }: DrawerProps) {
  const { t, isRtl } = useI18n()
  const reduce = useReducedMotion()
  // `end-0` vaut « à gauche » en RTL : le glissement doit suivre le même bord.
  const offscreen = isRtl ? '-100%' : '100%'
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return

    restoreTo.current = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab' || !panelRef.current) return

      // Piège à focus : Tab boucle à l'intérieur du tiroir.
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    const focusTimer = window.setTimeout(() => {
      panelRef.current?.querySelector<HTMLElement>('button, a[href]')?.focus()
    }, 60)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(focusTimer)
      window.setTimeout(() => document.body.style.setProperty('overflow', overflow), 0)
      restoreTo.current?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-60 lg:hidden" role="dialog" aria-modal="true" aria-label={title}>
          <m.div
            className="absolute inset-0 bg-ink/35 backdrop-blur-[2px]"
            initial={reduce ? undefined : { opacity: 0 }}
            animate={reduce ? undefined : { opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2, ease }}
            onClick={onClose}
          />

          <m.div
            ref={panelRef}
            className={`absolute inset-y-0 end-0 flex ${panelWidthClassName} flex-col overflow-x-hidden border-s border-line bg-page shadow-2xl`}
            initial={reduce ? undefined : { x: offscreen }}
            animate={reduce ? undefined : { x: 0 }}
            exit={reduce ? undefined : { x: offscreen }}
            transition={{ duration: 0.28, ease }}
          >
            <div className="flex h-16 shrink-0 items-center justify-between border-b border-line px-4">
              <Logo />
              <button
                type="button"
                onClick={onClose}
                aria-label={t.nav.closeMenu}
                title={t.nav.closeMenu}
                className="inline-flex size-11 items-center justify-center rounded-xl text-ink transition-colors hover:bg-surface-2"
              >
                <Icon name="close" size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-x-hidden overflow-y-auto overscroll-contain p-4">{children}</div>
          </m.div>
        </div>
      )}
    </AnimatePresence>
  )
}

import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { Icon } from './Icon'

/** Floating landing-page control, shown only after the visitor has scrolled. */
export function BackToTop() {
  const { t } = useI18n()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const updateVisibility = () => setVisible(window.scrollY > 480)
    updateVisibility()
    window.addEventListener('scroll', updateVisibility, { passive: true })
    return () => window.removeEventListener('scroll', updateVisibility)
  }, [])

  if (!visible) return null

  return <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label={t.nav.backToTop} className="fixed bottom-5 end-5 z-40 grid size-12 place-items-center rounded-full border border-line bg-surface text-ink shadow-lg shadow-ink/10 transition hover:-translate-y-0.5 hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-brand-deep focus:ring-offset-2 focus:ring-offset-page"><Icon name="chevronUp" size={21} /></button>
}

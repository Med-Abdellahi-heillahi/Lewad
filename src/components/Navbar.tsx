import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { dictionaries, locales, useI18n } from '../i18n'
import { useTheme } from '../lib/theme'
import { useDismiss } from '../lib/useDismiss'
import { sectionIds } from '../lib/content'
import { ease } from '../lib/motion'
import { iconBtn, wrap } from '../lib/ui'
import { Icon } from './Icon'
import { Logo } from './Logo'

export function Navbar() {
  const { t, locale, setLocale } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const reduce = useReducedMotion()

  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const menuRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)

  const closeMenu = useCallback(() => setMenuOpen(false), [])
  const closeLang = useCallback(() => setLangOpen(false), [])
  useDismiss(menuOpen, menuRef, closeMenu)
  useDismiss(langOpen, langRef, closeLang)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const panel = reduce
    ? {}
    : {
        initial: { opacity: 0, y: -6, scale: 0.98 },
        animate: { opacity: 1, y: 0, scale: 1 },
        exit: { opacity: 0, y: -6, scale: 0.98 },
        transition: { duration: 0.18, ease },
      }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
        scrolled ? 'border-line bg-page/85 backdrop-blur-md' : 'border-transparent bg-page/60 backdrop-blur-sm'
      }`}
    >
      <div className={`${wrap} flex h-16 items-center justify-between gap-3 sm:h-[72px]`}>
        {/* Gauche — logo */}
        <div className="flex flex-1 justify-start">
          <a href="#top" aria-label="Lewad" className="rounded-lg">
            <Logo />
          </a>
        </div>

        {/* Centre — langue + thème */}
        <div className="flex items-center gap-2">
          <div className="relative" ref={langRef}>
            <button
              type="button"
              className={`${iconBtn} w-auto gap-1.5 px-2.5 text-[13px] font-semibold`}
              aria-label={t.nav.language}
              aria-expanded={langOpen}
              aria-haspopup="true"
              onClick={() => {
                setLangOpen((open) => !open)
                setMenuOpen(false)
              }}
            >
              <Icon name="globe" size={18} />
              <span aria-hidden="true">{dictionaries[locale].meta.short}</span>
            </button>

            <AnimatePresence>
              {langOpen && (
                <m.ul
                  {...panel}
                  className="absolute start-0 top-[calc(100%+8px)] z-50 w-40 list-none rounded-xl border border-line bg-surface p-1.5 shadow-lg shadow-black/5"
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
                          setLangOpen(false)
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

          <button
            type="button"
            className={iconBtn}
            onClick={toggleTheme}
            aria-label={theme === 'light' ? t.nav.toDark : t.nav.toLight}
          >
            <Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} />
          </button>
        </div>

        {/* Droite — menu des sections */}
        <div className="flex flex-1 justify-end">
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              className={`${iconBtn} w-auto gap-2 px-3 text-sm font-semibold`}
              aria-label={menuOpen ? t.nav.closeMenu : t.nav.openMenu}
              aria-expanded={menuOpen}
              aria-haspopup="true"
              aria-controls="lewad-menu"
              onClick={() => {
                setMenuOpen((open) => !open)
                setLangOpen(false)
              }}
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={18} />
              <span className="hidden sm:inline">{t.nav.menu}</span>
            </button>

            <AnimatePresence>
              {menuOpen && (
                <m.nav
                  {...panel}
                  id="lewad-menu"
                  aria-label={t.nav.menu}
                  className="absolute end-0 top-[calc(100%+8px)] z-50 w-60 rounded-2xl border border-line bg-surface p-1.5 shadow-xl shadow-black/5"
                >
                  <ul className="list-none">
                    {sectionIds.map((id) => (
                      <li key={id}>
                        <a
                          href={`#${id}`}
                          onClick={closeMenu}
                          className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 text-sm text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
                        >
                          {t.nav.sections[id]}
                          <span className="text-muted rtl:rotate-180">
                            <Icon name="arrow" size={15} />
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </m.nav>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { useI18n } from '../i18n'
import { useAuthSession } from '../hooks/useAuthSession'
import { primarySectionIds, sectionIds } from '../lib/content'
import { getMyProfile } from '../lib/db1'
import { defaultDestinationForRole } from '../lib/routeAuth'
import { signOut } from '../lib/auth'
import { btnGhost, btnPrimary, iconBtn, wrap } from '../lib/ui'
import { Icon } from './Icon'
import { Logo } from './Logo'
import { Drawer } from './shell/Drawer'
import { LanguageMenu } from './shell/LanguageMenu'
import { ThemeToggle } from './shell/ThemeToggle'

/**
 * Barre de navigation de la landing.
 *
 * Mobile  : logo · langue + thème · menu. Les libellés d'authentification
 *           restent dans le tiroir pour que FR, AR et EN tiennent à 390 px.
 * Desktop : logo · liens de sections en clair · langue + thème + CTA.
 * Les deux ne sont pas la même barre étirée — le desktop expose la navigation,
 * le mobile la range dans un tiroir pour garder la barre respirable.
 */
export function Navbar() {
  const { t } = useI18n()
  const { isAuthenticated } = useAuthSession()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [spaceHref, setSpaceHref] = useState('/app')
  const accountHref = isAuthenticated ? spaceHref : '/auth'
  const accountLabel = isAuthenticated ? t.nav.mySpace : t.nav.signUp
  const signInHref = '/auth'

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  const handleSignOut = async () => {
    setSigningOut(true)
    const { error } = await signOut()
    if (error) {
      setSigningOut(false)
      return
    }
    closeDrawer()
    window.location.assign('/')
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Le même rôle que celui résolu par la page d'authentification détermine
  // l'espace de retour. En cas de profil indisponible, la destination sûre
  // reste l'espace utilisateur, jamais l'administration.
  useEffect(() => {
    if (!isAuthenticated) {
      setSpaceHref('/app')
      return
    }

    let active = true
    void getMyProfile().then((result) => {
      if (!active) return
      setSpaceHref(defaultDestinationForRole(result.error || !result.data ? 'user' : result.data.role))
    })

    return () => {
      active = false
    }
  }, [isAuthenticated])

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${
          scrolled ? 'border-line bg-page/85 backdrop-blur-md' : 'border-transparent bg-page/60 backdrop-blur-sm'
        }`}
      >
        <div className={`${wrap} flex h-16 min-w-0 items-center gap-3 overflow-x-clip sm:h-[72px]`}>
          {/* --- Logo : toujours au bord de début --- */}
          <div className="flex min-w-0 flex-1 justify-start lg:flex-none">
            <a href="#top" aria-label="Lewad" className="min-w-0 max-w-full rounded-lg">
              <Logo className="max-w-full max-[359px]:[&>span:last-child]:hidden" />
            </a>
          </div>

          {/* --- Desktop : navigation de sections --- */}
          <nav aria-label={t.nav.navigate} className="hidden flex-1 justify-center lg:flex">
            <ul className="flex list-none items-center gap-1">
              {primarySectionIds.map((id) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="inline-flex min-h-9 items-center rounded-lg px-3 text-sm font-medium text-muted transition-colors hover:bg-surface-2 hover:text-ink"
                  >
                    {t.nav.sections[id]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* --- Mobile : langue + thème au centre --- */}
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <LanguageMenu />
            <ThemeToggle />
          </div>

          {/* --- Bord de fin --- */}
          <div className="flex min-w-0 flex-1 shrink-0 items-center justify-end gap-2 lg:flex-none">
            <div className="hidden items-center gap-2 lg:flex">
              <LanguageMenu align="end" />
              <ThemeToggle />
              {!isAuthenticated && (
                <a href={signInHref} className={btnGhost}>
                  {t.nav.signIn}
                </a>
              )}
              <a href={accountHref} className={btnPrimary}>
                {accountLabel}
                <span className="rtl:rotate-180">
                  <Icon name="arrow" size={16} />
                </span>
              </a>
            </div>

            <button
              type="button"
              className={`${iconBtn} shrink-0 lg:hidden`}
              aria-label={t.nav.openMenu}
              aria-expanded={drawerOpen}
              aria-haspopup="dialog"
              onClick={() => setDrawerOpen(true)}
            >
              <Icon name="menu" size={19} />
            </button>
          </div>
        </div>
      </header>

      <Drawer open={drawerOpen} onClose={closeDrawer} title={t.nav.navigate}>
        <div className="grid gap-2">
          <a href={accountHref} className={btnPrimary} onClick={closeDrawer}>
            {accountLabel}
            <span className="rtl:rotate-180"><Icon name="arrow" size={16} /></span>
          </a>
          {!isAuthenticated ? (
            <a href={signInHref} className={btnGhost} onClick={closeDrawer}>
              {t.nav.login}
            </a>
          ) : (
            <button type="button" className={`${btnGhost} w-full`} disabled={signingOut} onClick={() => void handleSignOut()}>
              {signingOut ? t.nav.signingOut : t.nav.signOut}
            </button>
          )}
        </div>

        <nav aria-label={t.nav.navigate}>
          <ul className="mt-6 list-none space-y-1">
            {sectionIds.map((id) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  onClick={closeDrawer}
                  className="flex min-h-12 items-center justify-between gap-3 rounded-xl px-3 text-[15px] font-medium text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"
                >
                  {t.nav.sections[id]}
                  <span className="text-muted rtl:rotate-180">
                    <Icon name="arrow" size={16} />
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </Drawer>
    </>
  )
}

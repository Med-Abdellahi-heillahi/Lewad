import { lazy, Suspense, useEffect, useMemo, useRef, type ReactNode } from 'react'
import { LazyMotion, domAnimation } from 'framer-motion'
import { I18nProvider, useI18n } from './i18n'
import { ThemeProvider } from './lib/theme'
import { TextSizeProvider } from './lib/textSize'
import { useOnlineStatus } from './lib/useOnlineStatus'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { BackToTop } from './components/BackToTop'
import { InstallPromptModal } from './components/InstallPromptModal'
import { PublicSearchDemo } from './components/AppDemo'
import { AuthPage } from './components/AuthPage'
import { AddBusinessPage, ContactPage, ProtectedAppPage, type PrivatePageName } from './components/AppPages'
import { Hero } from './components/sections/Hero'
import { WhatWeDo } from './components/sections/WhatWeDo'
import { AnimationStrip } from './components/sections/AnimationStrip'
import { Services } from './components/sections/Services'
import { Demo } from './components/sections/Demo'
import { InstallApp } from './components/sections/InstallApp'
import { Faq } from './components/sections/Faq'
import { Offers } from './components/sections/Offers'
import { Contact } from './components/sections/Contact'
import { ErrorPage, errorCodes, type ErrorCode } from './components/system/ErrorPage'
import { OfflineScreen } from './components/system/OfflineScreen'
import { SessionLoading } from './components/system/SessionLoading'
import { AdminLoading } from './components/system/AdminLoading'
import { ChunkErrorBoundary } from './components/system/ChunkErrorBoundary'
import { useAuthSession } from './hooks/useAuthSession'
import { AccountProvider } from './hooks/useAccount'
import { authUrlForCurrentRoute } from './lib/routeAuth'

/**
 * L'espace d'administration part dans son propre lot : tableaux, graphiques et
 * dictionnaire admin ne concernent qu'une poignée de comptes, il serait
 * absurde de les faire télécharger à chaque visiteur de la landing.
 *
 * Le garde `RequireAdmin` voyage avec le lot — il vit dans le même module que
 * la page. Conséquence assumée : un compte non-admin qui saisit `/admin` à la
 * main récupère le lot avant de voir le refus. L'accès aux données, lui, reste
 * décidé côté serveur par la RLS, pas par ce chargement.
 */
const LazyAdminRoute = lazy(() =>
  import('./components/AdminPage').then(({ AdminPage, RequireAdmin }) => ({
    default: function AdminRoute() {
      return (
        <RequireAdmin>
          <AdminPage />
        </RequireAdmin>
      )
    },
  })),
)

const LazySuperAdminRoute = lazy(() =>
  import('./components/SuperAdminPage').then(({ SuperAdminPage, RequireSuperAdmin }) => ({
    default: function SuperAdminRoute() {
      return (
        <RequireSuperAdmin>
          <SuperAdminPage />
        </RequireSuperAdmin>
      )
    },
  })),
)

type AdminAccountRoute = 'admin-profile' | 'admin-settings' | 'super-admin-profile' | 'super-admin-settings'

type Route = ErrorCode | 'admin' | 'super-admin' | AdminAccountRoute | 'app' | 'auth' | 'contact' | 'add-business' | PrivatePageName | null

/**
 * Profil et paramètres des espaces d'équipe. Le garde de rôle voyage dans le
 * même lot que la page : `/admin/*` accepte admin et super admin, tandis que
 * `/super-admin/*` reste réservé au super admin. Ces gardes restent du confort
 * de navigation — la RLS et les RPC décident réellement de l'accès aux données.
 */
const adminAccountRoutes: Record<AdminAccountRoute, { space: 'admin' | 'super-admin'; page: 'profile' | 'settings' }> = {
  'admin-profile': { space: 'admin', page: 'profile' },
  'admin-settings': { space: 'admin', page: 'settings' },
  'super-admin-profile': { space: 'super-admin', page: 'profile' },
  'super-admin-settings': { space: 'super-admin', page: 'settings' },
}

function isAdminAccountRoute(route: Route): route is AdminAccountRoute {
  return route !== null && route in adminAccountRoutes
}

const LazyAdminAccountRoute = lazy(async () => {
  const [{ AdminAccountPage }, { RequireAdmin, RequireSuperAdmin }] = await Promise.all([
    import('./components/admin/AdminAccountPages'),
    import('./components/admin/AdminAccess'),
  ])

  return {
    default: function AdminAccountRouteView({ route }: { route: AdminAccountRoute }) {
      const { space, page } = adminAccountRoutes[route]
      const Guard = space === 'super-admin' ? RequireSuperAdmin : RequireAdmin
      return (
        <Guard>
          <AdminAccountPage space={space} page={page} />
        </Guard>
      )
    },
  }
})

function RequireAuthentication({ children }: { children: ReactNode }) {
  const { loading, isAuthenticated } = useAuthSession()
  const wasAuthenticated = useRef(false)

  useEffect(() => {
    if (loading) return
    if (isAuthenticated) {
      wasAuthenticated.current = true
      return
    }
    /*
     * Deux situations très différentes se ressemblent ici :
     *
     * - jamais authentifié sur cette page = accès direct à une URL protégée,
     *   on envoie vers la connexion en conservant la destination ;
     * - authentifié puis plus du tout = la session s'est terminée pendant la
     *   visite (déconnexion), on repart sur l'accueil public.
     *
     * Sans cette distinction, `signOut()` émet SIGNED_OUT avant que le composant
     * appelant n'ait pu naviguer : le garde gagnait la course et produisait le
     * double saut /app → /auth?redirect=/app.
     */
    window.location.replace(wasAuthenticated.current ? '/' : authUrlForCurrentRoute())
  }, [isAuthenticated, loading])

  // Pendant la vérification, et pendant la redirection qui suit, on n'affiche
  // jamais le contenu protégé — même une fraction de seconde.
  if (loading || !isAuthenticated) return <SessionLoading />
  return <>{children}</>
}

/** La landing, l’authentification et le contact sont publics ; les pages membre requièrent une session. */
function useRoute(): Route {
  return useMemo(() => {
    const path = window.location.pathname.replace(/\/+$/, '')
    if (path === '' || path === '/index.html') return null
    // Les pages compte des espaces d'équipe passent avant les préfixes
    // fourre-tout : `/admin/profile` ne doit pas retomber sur `/admin`.
    if (path === '/super-admin/profile') return 'super-admin-profile'
    if (path === '/super-admin/settings') return 'super-admin-settings'
    if (path === '/admin/profile') return 'admin-profile'
    if (path === '/admin/settings') return 'admin-settings'
    if (path === '/super-admin' || path.startsWith('/super-admin/')) return 'super-admin'
    if (path === '/admin' || path.startsWith('/admin/')) return 'admin'
    if (path === '/app') return 'app'
    if (path === '/auth') return 'auth'
    if (path === '/contact') return 'contact'
    if (path === '/add-business') return 'add-business'
    if (path === '/profile' || path === '/credits' || path === '/settings' || path === '/recharge' || path === '/history') return path.slice(1) as PrivatePageName

    const code = path.match(/^\/errors\/([a-z0-9]+)$/i)?.[1]
    if (code && (errorCodes as readonly string[]).includes(code)) return code as ErrorCode

    return '404'
  }, [])
}

function Landing() {
  const { t } = useI18n()

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-60 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-brand-ink"
      >
        {t.nav.skip}
      </a>

      <Navbar />

      <main id="main">
        <Hero />
        <WhatWeDo />
        <AnimationStrip />
        <Services />
        <Demo />
        <InstallApp />
        <Faq />
        <Offers />
        <Contact />
      </main>

      <Footer />
      <BackToTop />
      <InstallPromptModal />
    </>
  )
}

function Shell() {
  const route = useRoute()
  const { online, recheck } = useOnlineStatus()

  if (!online) return <OfflineScreen onRetry={recheck} />
  // `AccountProvider` coiffe les pages applicatives : le bandeau et la page
  // qu'il surmonte lisent le même profil et le même portefeuille.
  if (route === 'app') return <RequireAuthentication><AccountProvider><PublicSearchDemo /></AccountProvider></RequireAuthentication>
  if (route === 'admin') return <RequireAuthentication><AccountProvider><ChunkErrorBoundary><Suspense fallback={<AdminLoading />}><LazyAdminRoute /></Suspense></ChunkErrorBoundary></AccountProvider></RequireAuthentication>
  if (route === 'super-admin') return <RequireAuthentication><AccountProvider><ChunkErrorBoundary><Suspense fallback={<AdminLoading />}><LazySuperAdminRoute /></Suspense></ChunkErrorBoundary></AccountProvider></RequireAuthentication>
  if (isAdminAccountRoute(route)) return <RequireAuthentication><AccountProvider><ChunkErrorBoundary><Suspense fallback={<AdminLoading />}><LazyAdminAccountRoute route={route} /></Suspense></ChunkErrorBoundary></AccountProvider></RequireAuthentication>
  if (route === 'auth') return <AuthPage />
  if (route === 'contact') return <AccountProvider><ContactPage /></AccountProvider>
  if (route === 'add-business') return <RequireAuthentication><AccountProvider><AddBusinessPage /></AccountProvider></RequireAuthentication>
  if (route === 'profile' || route === 'credits' || route === 'settings' || route === 'recharge' || route === 'history') return <RequireAuthentication><AccountProvider><ProtectedAppPage page={route} /></AccountProvider></RequireAuthentication>
  if (route) return <ErrorPage code={route} onRetry={() => window.location.reload()} />
  return <Landing />
}

export default function App() {
  return (
    <ThemeProvider>
      <TextSizeProvider>
        <I18nProvider>
          {/* `domAnimation` + composants `m` : on embarque les animations et les
              variantes, sans le layout/drag dont la landing n'a pas besoin. */}
          <LazyMotion features={domAnimation} strict>
            <Shell />
          </LazyMotion>
        </I18nProvider>
      </TextSizeProvider>
    </ThemeProvider>
  )
}

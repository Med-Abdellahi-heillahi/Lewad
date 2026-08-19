import { useMemo } from 'react'
import { LazyMotion, domAnimation } from 'framer-motion'
import { I18nProvider, useI18n } from './i18n'
import { ThemeProvider } from './lib/theme'
import { useOnlineStatus } from './lib/useOnlineStatus'
import { Navbar } from './components/Navbar'
import { Footer } from './components/Footer'
import { PublicSearchDemo } from './components/AppDemo'
import { Hero } from './components/sections/Hero'
import { WhatWeDo } from './components/sections/WhatWeDo'
import { AnimationStrip } from './components/sections/AnimationStrip'
import { Services } from './components/sections/Services'
import { Demo } from './components/sections/Demo'
import { Faq } from './components/sections/Faq'
import { Offers } from './components/sections/Offers'
import { Contact } from './components/sections/Contact'
import { ErrorPage, errorCodes, type ErrorCode } from './components/system/ErrorPage'
import { OfflineScreen } from './components/system/OfflineScreen'

/** `/app` est la démo publique ; `/errors/<code>` affiche l’erreur correspondante. */
function useRoute(): ErrorCode | 'app' | null {
  return useMemo(() => {
    const path = window.location.pathname.replace(/\/+$/, '')
    if (path === '' || path === '/index.html') return null
    if (path === '/app') return 'app'

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
        <Faq />
        <Offers />
        <Contact />
      </main>

      <Footer />
    </>
  )
}

function Shell() {
  const route = useRoute()
  const { online, recheck } = useOnlineStatus()

  if (!online) return <OfflineScreen onRetry={recheck} />
  if (route === 'app') return <PublicSearchDemo />
  if (route) return <ErrorPage code={route} onRetry={() => window.location.reload()} />
  return <Landing />
}

export default function App() {
  return (
    <ThemeProvider>
      <I18nProvider>
        {/* `domAnimation` + composants `m` : on embarque les animations et les
            variantes, sans le layout/drag dont la landing n'a pas besoin. */}
        <LazyMotion features={domAnimation} strict>
          <Shell />
        </LazyMotion>
      </I18nProvider>
    </ThemeProvider>
  )
}

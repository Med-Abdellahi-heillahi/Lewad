import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

function read(path: URL) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(?:ts|tsx)$/.test(entry.name) ? [readFileSync(path, 'utf8')] : []
  })
}

const contentPath = new URL('../src/lib/content.ts', import.meta.url)
const rechargePath = new URL('../src/lib/recharge.ts', import.meta.url)
const rechargeMigrationPath = new URL('../supabase/migrations/20260820000003_create_recharge_request_rpc.sql', import.meta.url)
const offersPath = new URL('../src/components/sections/Offers.tsx', import.meta.url)
const appPagesPath = new URL('../src/components/AppPages.tsx', import.meta.url)
const languageMenuPath = new URL('../src/components/shell/LanguageMenu.tsx', import.meta.url)
const navbarPath = new URL('../src/components/Navbar.tsx', import.meta.url)
const heroPath = new URL('../src/components/sections/Hero.tsx', import.meta.url)
const authPagePath = new URL('../src/components/AuthPage.tsx', import.meta.url)
const authPath = new URL('../src/lib/auth.ts', import.meta.url)
const routeAuthPath = new URL('../src/lib/routeAuth.ts', import.meta.url)
const frPath = new URL('../src/i18n/fr.ts', import.meta.url)
const arPath = new URL('../src/i18n/ar.ts', import.meta.url)
const enPath = new URL('../src/i18n/en.ts', import.meta.url)
const manifestPath = new URL('../public/manifest.webmanifest', import.meta.url)
const indexHtmlPath = new URL('../index.html', import.meta.url)
const installSectionPath = new URL('../src/components/sections/InstallApp.tsx', import.meta.url)
const installModalPath = new URL('../src/components/InstallPromptModal.tsx', import.meta.url)
const serviceWorkerPath = new URL('../public/sw.js', import.meta.url)
const icon192Path = new URL('../public/icons/icon-192.png', import.meta.url)
const icon512Path = new URL('../public/icons/icon-512.png', import.meta.url)
const maskable512Path = new URL('../public/icons/maskable-512.png', import.meta.url)

function pngSize(path: URL) {
  const bytes = readFileSync(path)
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }
}

const publicCopyPaths = [
  new URL('../src/i18n/fr.ts', import.meta.url),
  new URL('../src/i18n/ar.ts', import.meta.url),
  new URL('../src/i18n/en.ts', import.meta.url),
  new URL('../src/components/sections/InstallApp.tsx', import.meta.url),
  new URL('../src/components/InstallPromptModal.tsx', import.meta.url),
  new URL('../src/components/Footer.tsx', import.meta.url),
  new URL('../src/components/AuthPage.tsx', import.meta.url),
  new URL('../src/lib/content.ts', import.meta.url),
  manifestPath,
  indexHtmlPath,
  serviceWorkerPath,
]

describe('public launch contracts', () => {
  it('keeps official support details in the centralized contact object without old details in frontend source', () => {
    const contact = read(contentPath)
    const frontend = sourceFiles(fileURLToPath(new URL('../src/', import.meta.url))).join('\n')
    const retiredPhone = ['306', '87543'].join('')
    const retiredEmail = ['deda', 'hisdh'].join('') + '@gmail.com'

    expect(contact).toContain("phoneHref: 'tel:+22242015464'")
    expect(contact).toContain("whatsappHref: 'https://wa.me/22242015464'")
    expect(contact).toContain("email: 'lewad.help@gmail.com'")
    expect(frontend).not.toContain(retiredPhone)
    expect(frontend).not.toContain(retiredEmail)
  })

  it('uses the reviewed recharge contract catalogue on both landing and member recharge screens', () => {
    const recharge = read(rechargePath)
    const offers = read(offersPath)
    const appPages = read(appPagesPath)
    const migration = read(rechargeMigrationPath)

    for (const offer of [
      "{ code: 'starter_10', points: 10, amountMro: 50, featured: false }",
      "{ code: 'regular_30', points: 30, amountMro: 100, featured: true }",
      "{ code: 'advanced_100', points: 100, amountMro: 500, featured: false }",
    ]) {
      expect(recharge).toContain(offer)
    }
    expect(offers).toContain('rechargeOffers.map')
    expect(offers).toContain('formatCurrency(rechargeOffer.amountMro, locale)')
    expect(appPages).toContain('rechargeOffers.map')
    expect(appPages).not.toContain("{ code: 'starter_10', points: 10, amountMro: 50")
    expect(migration).toContain("v_offer_label := '10 points · 50 MRO'")
    expect(migration).toContain("v_offer_label := '30 points · 100 MRO'")
    expect(migration).toContain("v_offer_label := '100 points · 500 MRO'")
  })

  it('makes the public quick language control a direct French–Arabic toggle', () => {
    const menu = read(languageMenuPath)

    expect(menu).toContain("const nextLocale = locale === 'fr' ? 'ar' : 'fr'")
    expect(menu).toContain('onClick={() => setLocale(nextLocale)}')
    expect(menu).not.toContain('AnimatePresence')
    expect(menu).not.toContain('locales.map')
  })

  it('does not expose the internal Animation label in French landing copy', () => {
    const french = read(frPath)

    expect(french).not.toContain('strip: "Animation"')
    expect(french).not.toContain('eyebrow: "Animation"')
  })

  it('uses the supplied Lewad logo asset for installed-app, browser, and service-worker icons', () => {
    const manifest = JSON.parse(read(manifestPath)) as {
      icons: Array<{ src: string; sizes: string; type: string; purpose: string }>
    }
    const indexHtml = read(indexHtmlPath)
    const serviceWorker = read(serviceWorkerPath)

    expect(manifest.icons).toEqual([
      {
        src: '/icons/icon-192.png?v=launch-20260830-4',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png?v=launch-20260830-4',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/maskable-512.png?v=launch-20260830-4',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ])
    expect(pngSize(icon192Path)).toEqual({ width: 192, height: 192 })
    expect(pngSize(icon512Path)).toEqual({ width: 512, height: 512 })
    expect(pngSize(maskable512Path)).toEqual({ width: 512, height: 512 })
    expect(indexHtml).toContain('rel="manifest" href="/manifest.webmanifest?v=launch-20260830-4"')
    expect(indexHtml).toContain('rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png?v=launch-20260830-4"')
    expect(indexHtml).toContain('rel="apple-touch-icon" sizes="192x192" href="/icons/icon-192.png?v=launch-20260830-4"')
    expect(serviceWorker).toContain("const STATIC_CACHE = 'lewad-static-v4'")
    expect(serviceWorker).toContain("'/icons/icon-192.png?v=launch-20260830-4'")
    expect(serviceWorker).toContain("'/icons/icon-512.png?v=launch-20260830-4'")
    expect(serviceWorker).toContain("'/icons/maskable-512.png?v=launch-20260830-4'")
    expect(serviceWorker).not.toContain("'/assets/logo_lewad.png")
  })

  it('uses every launch-safe install screenshot and excludes only the unsafe ones', () => {
    const root = fileURLToPath(new URL('../public/assets/install_app_image/', import.meta.url))
    const iphoneDirectory = join(root, 'iphone')
    const androidDirectory = join(root, 'android')
    const installSection = read(installSectionPath)

    expect(existsSync(iphoneDirectory)).toBe(true)
    expect(existsSync(androidDirectory)).toBe(true)
    expect(readdirSync(iphoneDirectory).sort()).toEqual([
      '1.jpeg',
      '2.jpeg',
      '3.jpeg',
    ])
    expect(readdirSync(androidDirectory).sort()).toEqual([
      '.gitkeep',
      'android-1-menu.jpeg',
      'android-2-installer-raccourci.jpeg',
      'android-3-confirmer-installation.jpeg',
    ])
    expect(installSection).toContain('/assets/install_app_image/android/android-1-menu.jpeg')
    expect(installSection).toContain('/assets/install_app_image/android/android-2-installer-raccourci.jpeg')
    expect(installSection).toContain('/assets/install_app_image/iphone/1.jpeg')
    // These captures are retained for the owner but are not launch-safe to
    // render: the Android/iPhone confirmation screens show the retired pin,
    // while iPhone step 2 also exposes an AI-tool browser action.
    expect(installSection).not.toContain('/assets/install_app_image/android/android-3-confirmer-installation.jpeg')
    expect(installSection).not.toContain('/assets/install_app_image/iphone/2.jpeg')
    expect(installSection).not.toContain('/assets/install_app_image/iphone/3.jpeg')
    expect(installSection).toContain('id="android"')
    expect(installSection).toContain('id="iphone"')
    expect(installSection).toContain('alt={copy.visuals[index]')
    expect(installSection).toContain('width={screenshot.width}')
    expect(installSection).toContain('height={screenshot.height}')
    expect(installSection).toContain('object-contain')
    expect(installSection).toContain('copy.steps.map')
    expect(installSection).toContain('<div id="install-steps"')
    expect(installSection).toContain('screenshots={androidScreenshots}')
    expect(installSection).toContain('screenshots={iphoneScreenshots}')
    expect(installSection).not.toMatch(/https?:\/\//)
  })

  it('provides Android and iPhone steps in every supported language and keeps the compact modal linked to the guide', () => {
    const modal = read(installModalPath)

    for (const dictionary of [read(frPath), read(arPath), read(enPath)]) {
      expect(dictionary).toContain('platforms: {')
      expect(dictionary).toContain('android: {')
      expect(dictionary).toContain('iphone: {')
    }
    expect(read(frPath)).toContain('Installer sur Android')
    expect(read(frPath)).toContain('Installer sur iPhone')
    expect(read(arPath)).toContain('التثبيت على Android')
    expect(read(arPath)).toContain('التثبيت على iPhone')
    expect(read(enPath)).toContain('Install on Android')
    expect(read(enPath)).toContain('Install on iPhone')
    expect(read(frPath)).toContain('Ouvrez Lewad dans Chrome.')
    expect(read(frPath)).toContain('Appuyez sur le menu du navigateur.')
    expect(read(frPath)).toContain('Choisissez « Installer » ou « Installer et créer un raccourci ».')
    expect(read(frPath)).toContain('Ouvrez Lewad dans Safari.')
    expect(read(frPath)).toContain('Appuyez sur le bouton Partager.')
    expect(read(frPath)).toContain('Choisissez « Ajouter à l’écran d’accueil ».')
    expect(read(frPath)).toContain('Confirmez avec « Ajouter ».')
    expect(modal).toContain("document.getElementById('install')?.scrollIntoView")
    expect(read(installSectionPath)).toContain('id="install-steps"')
    expect(read(installSectionPath)).not.toContain('useInstallInvitation')
    expect(read(installSectionPath)).not.toContain('<Reveal')
  })

  it('opens connection and registration in their intended auth modes and retains protected redirects', () => {
    const navbar = read(navbarPath)
    const hero = read(heroPath)
    const authPage = read(authPagePath)
    const routeAuth = read(routeAuthPath)

    expect(navbar).toContain("const signInHref = '/auth?mode=login'")
    expect(navbar).toContain("const accountHref = isAuthenticated ? spaceHref : '/auth?mode=signup'")
    expect(hero).toContain('href="/auth?mode=signup"')
    expect(authPage).toContain("if (mode === 'signup') return 'signUp'")
    expect(authPage).toContain(": mode === 'signUp'\n        ? copy.signUp")
    expect(routeAuth).toContain('`/auth?mode=login&redirect=${encodeURIComponent(requestedPath)}`')
  })

  it('uses the typed sign-in email read-only for a neutral forgot-password flow', () => {
    const authPage = read(authPagePath)

    expect(authPage).toContain('value={email} onChange={setEmail} autoComplete="email" readOnly')
    expect(authPage).toContain('const startForgotPassword = () =>')
    expect(authPage).toContain("requestPasswordReset(email.trim(), locale)")
    expect(authPage).toContain('Si ce compte existe, un e-mail de réinitialisation sera envoyé.')
    expect(authPage).toContain('إذا كان هذا الحساب موجودًا، فسيتم إرسال بريد إلكتروني لإعادة التعيين.')
    expect(authPage).toContain('If this account exists, a reset email will be sent.')
    expect(authPage).not.toContain('resetEmail')
  })

  it('carries reset locale only in the return URL and keeps passwords and service roles out of frontend source', () => {
    const auth = read(authPath)
    const frontend = sourceFiles(fileURLToPath(new URL('../src/', import.meta.url))).join('\n')

    expect(auth).toContain("redirect.searchParams.set('mode', 'reset')")
    expect(auth).toContain("redirect.searchParams.set('lang', locale)")
    expect(read(authPagePath)).toContain('function resetLocaleFromUrl()')
    expect(frontend).not.toContain('service_role')
    expect(frontend).not.toMatch(/(?:localStorage|sessionStorage)\.(?:setItem|getItem)\([^\n]*password/i)
    expect(frontend).not.toMatch(/console\.(?:log|debug|info|warn|error)\([^\n]*(?:password|credentials|authData|formState)/i)
  })

  it('keeps all three install-section titles localized', () => {
    expect(read(frPath)).toContain('Comment installer Lewad sur votre téléphone')
    expect(read(arPath)).toMatch(/title: ".*Lewad.*"/)
    expect(read(arPath)).not.toContain('لواد')
    expect(read(enPath)).toContain('How to install Lewad on your phone')
  })

  it('keeps AI and tool branding out of public copy and rendered install screenshots', () => {
    const publicCopy = publicCopyPaths.map(read).join('\n')

    expect(publicCopy).not.toMatch(/chatgpt|openai|codex|claude|opencode|dall[ -]?e|artificial intelligence|intelligence artificielle|generated by|généré par|made with ai|created by ai|vibe coding|multi-agent|\bllm\b|\bbot\b|(?<![\w'’])ai(?:\s|[-–—:]|$)|(?<![\w'’])ia(?:\s|[-–—:]|$)/i)
    expect(read(installSectionPath)).not.toContain('/assets/install_app_image/iphone/2.jpeg')
    expect(read(installSectionPath)).not.toContain('/assets/install_app_image/iphone/3.jpeg')
  })
})

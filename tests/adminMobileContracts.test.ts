import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const languageTogglePath = new URL('../src/components/admin/AdminLanguageToggle.tsx', import.meta.url)
const appBarPath = new URL('../src/components/shell/AppBar.tsx', import.meta.url)
const adminAccessPath = new URL('../src/components/admin/AdminAccess.tsx', import.meta.url)
const frPath = new URL('../src/i18n/fr.ts', import.meta.url)
const arPath = new URL('../src/i18n/ar.ts', import.meta.url)
const enPath = new URL('../src/i18n/en.ts', import.meta.url)

function read(path: URL) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
}

describe('admin mobile shell contracts', () => {
  it('switches the compact admin language control directly between French and Arabic', () => {
    const source = read(languageTogglePath)

    expect(source).toContain("locale === 'fr' ? 'ar' : 'fr'")
    expect(source).toContain("nextLocale === 'ar' ? t.nav.switchToArabic : t.nav.switchToFrench")
    expect(source).not.toContain('switchToEnglish')
    expect(read(frPath)).toContain('switchToEnglish: "Changer vers anglais"')
    expect(read(arPath)).toContain('switchToEnglish: "التغيير إلى الإنجليزية"')
    expect(read(enPath)).toContain('switchToEnglish: "Switch to English"')
  })

  it('keeps the admin shell out of the member balance fallback while account access resolves', () => {
    const appBar = read(appBarPath)
    const adminAccess = read(adminAccessPath)

    expect(appBar).toContain('if (admin) {')
    expect(appBar).toContain('walletError && !wallet')
    expect(appBar.indexOf('if (admin) {')).toBeLessThan(appBar.indexOf('walletError && !wallet'))
    expect(adminAccess).toContain('if (loading) return <SessionLoading')
    expect(adminAccess).toContain('return <SessionLoading label={adminCopy[locale].access.redirecting} />')
  })
})

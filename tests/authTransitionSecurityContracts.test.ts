import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const authPagePath = new URL('../src/components/AuthPage.tsx', import.meta.url)
const sessionLoadingPath = new URL('../src/components/system/SessionLoading.tsx', import.meta.url)
const appPath = new URL('../src/App.tsx', import.meta.url)
const adminAccessPath = new URL('../src/components/admin/AdminAccess.tsx', import.meta.url)

function read(path: URL) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
}

function frontendSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return frontendSources(path)
    return /\.(?:ts|tsx)$/.test(entry.name) ? [readFileSync(path, 'utf8')] : []
  })
}

describe('auth transition security contracts', () => {
  it('clears submitted passwords before the auth request and uses a neutral loading screen', () => {
    const source = read(authPagePath)
    const passwordCapture = source.indexOf('const submittedPassword = password')
    const passwordClear = source.indexOf("setPassword('')", passwordCapture)
    const authRequest = source.indexOf('await signInWithEmail', passwordCapture)

    expect(passwordCapture).toBeGreaterThan(-1)
    expect(passwordClear).toBeGreaterThan(passwordCapture)
    expect(authRequest).toBeGreaterThan(passwordClear)
    expect(source).toContain("setConfirmation('')")
    expect(source).toContain("setNewPw('')")
    expect(source).toContain("setConfirmPw('')")
    expect(source).toContain('const showNeutralLoading = sessionLoading')
    expect(source).toContain('return <SessionLoading')
    expect(read(sessionLoadingPath)).toContain('aria-busy="true"')
  })

  it('does not render or serialize account and credential data during the auth handoff', () => {
    const source = read(authPagePath)

    expect(source).not.toContain('user?.email')
    expect(source).not.toContain('JSON.stringify(')
    expect(source).not.toMatch(/console\.(?:log|debug|info|warn|error)\([^\n]*(?:password|credential|authData|formState)/i)
    expect(source).not.toMatch(/(?:localStorage|sessionStorage)\.(?:setItem|getItem)\([^\n]*password/i)
  })

  it('prevents account and role guards from rendering a member shell during role resolution', () => {
    const app = read(appPath)
    const adminAccess = read(adminAccessPath)

    expect(app).toContain('if (loading || !isAuthenticated) return <SessionLoading />')
    expect(adminAccess).toContain('if (loading) return <SessionLoading')
    expect(adminAccess).toContain('return <SessionLoading label={adminCopy[locale].access.redirecting} />')
  })

  it('keeps password-bearing debug and browser storage calls out of frontend source', () => {
    const source = frontendSources(fileURLToPath(new URL('../src/', import.meta.url))).join('\n')

    expect(source).not.toMatch(/JSON\.stringify\([^\n]*(?:session|authData|credentials|password|formState)/i)
    expect(source).not.toMatch(/console\.(?:log|debug|info|warn|error)\([^\n]*(?:password|credentials|authData|formState)/i)
    expect(source).not.toMatch(/(?:localStorage|sessionStorage)\.(?:setItem|getItem)\([^\n]*password/i)
    expect(source).not.toContain('service_role')
  })
})

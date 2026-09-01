import { readdirSync, readFileSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const paths = {
  app: new URL('../src/App.tsx', import.meta.url),
  analytics: new URL('../src/lib/analytics.ts', import.meta.url),
  auth: new URL('../src/lib/auth.ts', import.meta.url),
  appDemo: new URL('../src/components/AppDemo.tsx', import.meta.url),
  appPages: new URL('../src/components/AppPages.tsx', import.meta.url),
  businessSubmission: new URL('../src/components/BusinessSubmissionForm.tsx', import.meta.url),
  navbar: new URL('../src/components/Navbar.tsx', import.meta.url),
  landingCounter: new URL('../src/components/LandingActivityCounter.tsx', import.meta.url),
  superAdminPage: new URL('../src/components/SuperAdminPage.tsx', import.meta.url),
  superAdminAnalytics: new URL('../src/components/super-admin/SuperAdminAnalytics.tsx', import.meta.url),
  superAdminSidebar: new URL('../src/components/super-admin/SuperAdminSidebar.tsx', import.meta.url),
  superAdminBottomNav: new URL('../src/components/super-admin/SuperAdminBottomNav.tsx', import.meta.url),
  adminCopy: new URL('../src/components/admin/adminCopy.ts', import.meta.url),
  fr: new URL('../src/i18n/fr.ts', import.meta.url),
  ar: new URL('../src/i18n/ar.ts', import.meta.url),
  en: new URL('../src/i18n/en.ts', import.meta.url),
}

function read(path: URL) {
  return readFileSync(path, 'utf8').replaceAll('\r\n', '\n')
}

function readRuntimeSource(directory = fileURLToPath(new URL('../src/', import.meta.url))): string {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = `${directory}/${entry.name}`
    if (entry.isDirectory()) return [readRuntimeSource(path)]
    if (!entry.isFile() || !/\.(?:ts|tsx)$/.test(entry.name) || entry.name.endsWith('.test.ts')) return []
    if (!statSync(path).isFile()) return []
    return [readFileSync(path, 'utf8')]
  }).join('\n')
}

function functionCalls(content: string, name: string) {
  const calls: string[] = []
  let searchFrom = 0
  while (true) {
    const start = content.indexOf(`${name}(`, searchFrom)
    if (start < 0) return calls
    let depth = 0
    let end = start
    for (; end < content.length; end += 1) {
      if (content[end] === '(') depth += 1
      if (content[end] === ')') {
        depth -= 1
        if (depth === 0) {
          end += 1
          break
        }
      }
    }
    calls.push(content.slice(start, end))
    searchFrom = end
  }
}

describe('analytics UI contracts', () => {
  it('shows the cached public estimate on desktop and inside the mobile drawer', () => {
    const counter = read(paths.landingCounter)
    const navbar = read(paths.navbar)

    expect(counter).toContain('getPublicActivityStats')
    expect(counter).toContain('stats?.estimatedActivity')
    expect(counter).toContain('if (estimate <= 0) return null')
    expect(counter).toContain('const REFRESH_INTERVAL_MS = 60_000')
    expect(counter).toContain('+{formatNumber(estimate, locale)}')
    expect(counter).not.toMatch(/estimatedActivity\s*\*\s*30/)
    expect(counter).not.toMatch(/visitsTodayReal\s*\*\s*30/)
    expect(counter).not.toContain('activeSessionsReal')
    expect(counter).not.toContain('visitsTodayReal')
    expect(counter).not.toMatch(/(?:users?|utilisateurs?)\s+(?:online|connectés?)/i)
    expect(counter).toContain('overflow-hidden')
    expect(counter).toContain('truncate whitespace-nowrap')
    expect(navbar).toContain('<LandingActivityCounter className="hidden xl:inline-flex" />')
    expect(navbar).toContain('<LandingActivityCounter fullWidth />')
  })

  it('keeps the public estimate and fallback copy aligned in French, Arabic and English', () => {
    const fr = read(paths.fr)
    const ar = read(paths.ar)
    const en = read(paths.en)
    expect(fr).toContain('activityEstimatedVisits: "visites estimées"')
    expect(fr).toContain('activityEstimateHint: "Estimation basée sur l’activité récente"')
    expect(ar).toContain('activityEstimatedVisits: "زيارة تقديرية"')
    expect(ar).toContain('activityEstimateHint: "تقدير مبني على النشاط الأخير"')
    expect(en).toContain('activityEstimatedVisits: "estimated visits"')
    expect(en).toContain('activityEstimateHint: "Estimate based on recent activity"')

    const publicCopy = `${fr}\n${ar}\n${en}\n${read(paths.landingCounter)}\n${read(paths.navbar)}`
    expect(publicCopy).not.toMatch(/(?:users?\s+online|online\s+users?|utilisateurs?\s+connectés?)/i)
    expect(publicCopy).not.toMatch(/مستخدم(?:ون|ين)?.{0,12}(?:متصل|الآن)/)

    for (const path of [paths.fr, paths.ar, paths.en]) {
      const copy = read(path)
      expect(copy).toContain('activityEstimateHint:')
      expect(copy).toContain('activityFallback:')
    }
  })

  it('opens the dedicated analytics path under the existing Super Admin guard', () => {
    const app = read(paths.app)
    const page = read(paths.superAdminPage)
    const sidebar = read(paths.superAdminSidebar)
    const copy = read(paths.adminCopy)

    expect(app).toContain('<RequireSuperAdmin>')
    expect(page).toContain("path === '/super-admin/analytics'")
    expect(page).toContain("if (tab === 'analytics') return '/super-admin/analytics'")
    expect(page).toContain('window.history.replaceState')
    expect(page).toContain("activeTab === 'analytics'")
    expect(page).toContain('<SuperAdminAnalytics />')
    expect(sidebar).toContain("{ id: 'analytics', icon: BarChart3 }")
    expect(copy).toContain("'overview' | 'analytics' | 'localisation-import' | 'admins'")
    expect(copy).toContain("analytics: 'Analytique'")
    expect(copy).toContain("analytics: 'التحليلات'")
    expect(copy).toContain("analytics: 'Analytics'")
  })

  it('renders only aggregate analytics and uses the server-computed public estimate', () => {
    const dashboard = read(paths.superAdminAnalytics)

    expect(dashboard).toContain('getSuperAdminAnalyticsSummary()')
    expect(dashboard).toContain('getPublicActivityStats()')
    expect(dashboard).toContain('publicStats?.estimatedActivity')
    expect(dashboard).toContain('summary.totalPageViews')
    expect(dashboard).toContain('summary.uniqueSessions')
    expect(dashboard).not.toMatch(/estimatedActivity\s*\*\s*30/)
    expect(dashboard).toContain('summary.authBreakdown.authenticated')
    expect(dashboard).toContain('summary.authBreakdown.anonymous')
    expect(dashboard).toContain('summary.topPages.map')
    expect(dashboard).toContain('summary.topEventTypes.map')
    expect(dashboard).toContain('summary.deviceBreakdown.map')
    expect(dashboard).toContain('summary.localeBreakdown.map')
    expect(dashboard).toContain('summary.recentEvents.map')
    expect(dashboard).not.toMatch(/event\.(?:authenticated|userId|sessionId|metadata|user_id|session_id)/)
    expect(dashboard).toContain('event.createdMinute')
    expect(dashboard).not.toContain('event.createdAt')
  })

  it('keeps analytics payloads free of raw query, GPS, payment, auth and profile values', () => {
    const analytics = read(paths.analytics)
    const appDemo = read(paths.appDemo)
    const appPages = read(paths.appPages)
    const businessSubmission = read(paths.businessSubmission)

    expect(appDemo).toContain('trackEvent("search_started", { query_length: requestedQuery.length })')
    expect(appDemo).toContain('trackEvent("search_completed", {')
    expect(appDemo).toContain('trackEvent("external_map_lookup")')
    expect(appPages).toContain('trackEvent("recharge_started")')
    expect(businessSubmission).toContain("trackEvent('add_business_started')")

    const runSearch = appDemo.slice(
      appDemo.indexOf('const runSearch = async'),
      appDemo.indexOf('const runExternalSearch = async'),
    )
    expect(runSearch.indexOf('trackEvent("search_started"')).toBeGreaterThan(
      runSearch.indexOf('if (!normalizedQuery || normalizedQuery.length < 2)'),
    )
    const editSearchQuery = appDemo.slice(
      appDemo.indexOf('const editSearchQuery ='),
      appDemo.indexOf('const applySuggestion ='),
    )
    expect(editSearchQuery).not.toContain('trackEvent(')

    const analyticsCalls = [appDemo, appPages, businessSubmission]
      .flatMap((content) => functionCalls(content, 'trackEvent'))
      .join('\n')
    expect(analyticsCalls).not.toMatch(/\b(?:query|search_query|latitude|longitude|coordinates)\s*:/i)
    expect(analyticsCalls).not.toMatch(/\b(?:amount|amount_mro|price|payment_reference|transaction_id|offer_code)\s*:/i)
    expect(analyticsCalls).not.toMatch(/\b(?:password|token|access_token|refresh_token|authorization)\s*:/i)
    expect(analyticsCalls).not.toMatch(/\b(?:name|full_name|full_name_ar|email|phone|whatsapp|user_id|role)\s*:/i)

    for (const forbiddenEvent of [
      'login', 'logout', 'signup', 'password_reset', 'profile_updated',
      'payment_started', 'payment_completed', 'payment_reference',
    ]) {
      expect(analytics).not.toContain(`'${forbiddenEvent}'`)
    }
  })

  it('contains no frontend runtime service-role credential path', () => {
    const runtime = readRuntimeSource().toLowerCase()

    expect(runtime).not.toContain('service_role')
    expect(runtime).not.toMatch(/vite_[a-z0-9_]*(?:secret|service|token)/)
  })

  it('rotates the analytics session only after a successful logout', () => {
    const analytics = read(paths.analytics)
    const auth = read(paths.auth)

    expect(analytics).toContain('export function rotateAnalyticsSession()')
    expect(auth).toContain("import { rotateAnalyticsSession } from './analytics'")
    expect(auth).toContain('const result = await supabase.auth.signOut()')
    expect(auth).toContain('if (!result.error) rotateAnalyticsSession()')
  })

  it('keeps analytics out of the four-item mobile bottom navigation', () => {
    const bottomNav = read(paths.superAdminBottomNav)

    expect(bottomNav).toContain('grid-cols-4')
    expect(bottomNav).not.toContain("id: 'analytics'")
  })
})

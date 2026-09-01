import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const paths = {
  app: new URL('../src/App.tsx', import.meta.url),
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

describe('analytics UI contracts', () => {
  it('shows the cached public estimate on desktop and inside the mobile drawer', () => {
    const counter = read(paths.landingCounter)
    const navbar = read(paths.navbar)

    expect(counter).toContain('getPublicActivityStats')
    expect(counter).toContain('stats?.estimatedActivity')
    expect(counter).toContain('const REFRESH_INTERVAL_MS = 60_000')
    expect(counter).toContain('+{formatNumber(estimate, locale)}')
    expect(counter).not.toMatch(/estimatedActivity\s*\*\s*30/)
    expect(counter).not.toMatch(/visitsTodayReal\s*\*\s*30/)
    expect(counter).not.toMatch(/(?:users?|utilisateurs?)\s+(?:online|connectés?)/i)
    expect(counter).toContain('overflow-hidden')
    expect(counter).toContain('truncate whitespace-nowrap')
    expect(navbar).toContain('<LandingActivityCounter className="hidden xl:inline-flex" />')
    expect(navbar).toContain('<LandingActivityCounter fullWidth />')
  })

  it('keeps the public estimate and fallback copy aligned in French, Arabic and English', () => {
    expect(read(paths.fr)).toContain('activityEstimatedVisits: "visites estimées"')
    expect(read(paths.ar)).toContain('activityEstimatedVisits: "زيارة تقديرية"')
    expect(read(paths.en)).toContain('activityEstimatedVisits: "estimated visits"')

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
    expect(dashboard).not.toMatch(/event\.(?:userId|sessionId|metadata|user_id|session_id)/)
  })

  it('keeps analytics out of the four-item mobile bottom navigation', () => {
    const bottomNav = read(paths.superAdminBottomNav)

    expect(bottomNav).toContain('grid-cols-4')
    expect(bottomNav).not.toContain("id: 'analytics'")
  })
})

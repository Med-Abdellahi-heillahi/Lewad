import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseMocks = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('./supabaseClient', () => ({
  supabase: { rpc: supabaseMocks.rpc },
}))

const FIXED_SESSION_ID = '11111111-1111-4111-8111-111111111111'

function browserEnvironment(pathname = '/app', width = 390) {
  const values = new Map<string, string>()
  const storage = {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
    clear: vi.fn(() => values.clear()),
    key: vi.fn(() => null),
    get length() { return values.size },
  }

  vi.stubGlobal('window', { innerWidth: width, location: { pathname } })
  vi.stubGlobal('document', { documentElement: { lang: 'fr' } })
  vi.stubGlobal('navigator', { language: 'fr-FR' })
  vi.stubGlobal('localStorage', storage)
  vi.stubGlobal('crypto', { randomUUID: vi.fn(() => FIXED_SESSION_ID) })
  return { storage, values }
}

async function loadAnalytics() {
  vi.resetModules()
  return import('./analytics')
}

describe('frontend analytics transport', () => {
  beforeEach(() => {
    supabaseMocks.rpc.mockReset()
    supabaseMocks.rpc.mockResolvedValue({ data: { ok: true, status: 'recorded' }, error: null })
    browserEnvironment()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('persists and reuses a UUID session identifier without auth data', async () => {
    const { storage } = browserEnvironment()
    const { getAnalyticsSessionId } = await loadAnalytics()

    expect(getAnalyticsSessionId()).toBe(FIXED_SESSION_ID)
    expect(getAnalyticsSessionId()).toBe(FIXED_SESSION_ID)
    expect(storage.setItem).toHaveBeenCalledOnce()
    expect(storage.setItem).toHaveBeenCalledWith('lewad-analytics-session-id', FIXED_SESSION_ID)
  })

  it('sends only inferred safe context and the event metadata allowlist', async () => {
    const { trackEvent } = await loadAnalytics()

    trackEvent('search_started', {
      query_length: 37,
      query: 'must not leave the browser',
      latitude: 18.1,
    } as never)

    expect(supabaseMocks.rpc).toHaveBeenCalledOnce()
    expect(supabaseMocks.rpc).toHaveBeenCalledWith('track_analytics_event', {
      p_session_id: FIXED_SESSION_ID,
      p_event_type: 'search_started',
      p_path: '/app',
      p_locale: 'fr',
      p_device_type: 'mobile',
      p_metadata: { query_length: 37 },
    })
  })

  it('deduplicates StrictMode page views and refuses non-client paths', async () => {
    const { getAnalyticsPagePath, trackEvent } = await loadAnalytics()

    trackEvent('page_view')
    trackEvent('page_view')

    expect(supabaseMocks.rpc).toHaveBeenCalledOnce()
    expect(getAnalyticsPagePath('/profile/')).toBe('/profile')
    expect(getAnalyticsPagePath('/admin')).toBeNull()

    vi.stubGlobal('window', { innerWidth: 1280, location: { pathname: '/admin' } })
    trackEvent('page_view')
    expect(supabaseMocks.rpc).toHaveBeenCalledOnce()
  })

  it('normalizes completed-search metadata and never throws synchronously', async () => {
    const { trackEvent } = await loadAnalytics()

    trackEvent('search_completed', {
      result_count: -12,
      result_status: 'not-a-status',
      balance: 200,
    } as never)
    expect(supabaseMocks.rpc.mock.calls[0]?.[1]?.p_metadata).toEqual({
      result_count: 0,
      result_status: 'error',
    })

    supabaseMocks.rpc.mockImplementationOnce(() => { throw new Error('offline') })
    expect(trackEvent('recharge_started')).toBeUndefined()
  })
})

describe('analytics summary readers', () => {
  beforeEach(() => {
    supabaseMocks.rpc.mockReset()
    browserEnvironment('/', 1280)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('deduplicates and caches public activity reads for sixty seconds', async () => {
    supabaseMocks.rpc.mockResolvedValue({
      data: {
        active_sessions_real: 4,
        visits_today_real: 28,
        estimated_activity: 35,
      },
      error: null,
    })
    const { getPublicActivityStats } = await loadAnalytics()

    const [first, second] = await Promise.all([
      getPublicActivityStats(),
      getPublicActivityStats(),
    ])
    const cached = await getPublicActivityStats()

    expect(supabaseMocks.rpc).toHaveBeenCalledOnce()
    expect(supabaseMocks.rpc).toHaveBeenCalledWith('get_public_activity_stats')
    expect(first).toEqual({ activeSessionsReal: 4, visitsTodayReal: 28, estimatedActivity: 35 })
    expect(second).toBe(first)
    expect(cached).toBe(first)
  })

  it('returns null for public RPC errors or malformed aggregates', async () => {
    supabaseMocks.rpc.mockResolvedValueOnce({ data: null, error: { message: 'denied' } })
    const firstModule = await loadAnalytics()
    await expect(firstModule.getPublicActivityStats()).resolves.toBeNull()
    await expect(firstModule.getPublicActivityStats()).resolves.toBeNull()
    expect(supabaseMocks.rpc).toHaveBeenCalledOnce()

    supabaseMocks.rpc.mockResolvedValueOnce({ data: { visits_today_real: 1 }, error: null })
    const secondModule = await loadAnalytics()
    await expect(secondModule.getPublicActivityStats()).resolves.toBeNull()
  })

  it('parses only aggregate-safe super-admin summary fields', async () => {
    supabaseMocks.rpc.mockResolvedValue({
      data: {
        total_events: 120,
        total_page_views: 52,
        unique_sessions: 31,
        unique_authenticated_users: 12,
        active_sessions_now: 3,
        visits_today: 18,
        visits_7_days: 74,
        visits_30_days: 210,
        auth_breakdown: { authenticated: 12, anonymous: 19 },
        top_pages: [{ path: '/app', count: 27 }],
        top_event_types: [{ event_type: 'search_started', count: 21 }],
        device_breakdown: [{ device_type: 'desktop', count: 15 }],
        locale_breakdown: [{ locale: 'ar', count: 11 }],
        recent_events: [{
          created_at: '2026-08-31T08:30:00Z',
          event_type: 'page_view',
          path: '/',
          locale: 'fr',
          device_type: 'mobile',
          authenticated: false,
          session_id: 'must-not-be-returned',
          user_id: 'must-not-be-returned',
        }],
      },
      error: null,
    })
    const { getSuperAdminAnalyticsSummary } = await loadAnalytics()

    const summary = await getSuperAdminAnalyticsSummary(
      '2026-08-01T00:00:00Z',
      '2026-08-31T23:59:59Z',
    )

    expect(supabaseMocks.rpc).toHaveBeenCalledWith('super_admin_get_analytics_summary', {
      p_from: '2026-08-01T00:00:00.000Z',
      p_to: '2026-08-31T23:59:59.000Z',
    })
    expect(summary).toMatchObject({
      totalEvents: 120,
      totalPageViews: 52,
      uniqueSessions: 31,
      uniqueAuthenticatedUsers: 12,
      authBreakdown: { authenticated: 12, anonymous: 19 },
      topPages: [{ path: '/app', count: 27 }],
      recentEvents: [{
        createdAt: '2026-08-31T08:30:00Z',
        eventType: 'page_view',
        path: '/',
        locale: 'fr',
        deviceType: 'mobile',
        authenticated: false,
      }],
    })
    expect(summary?.recentEvents[0]).not.toHaveProperty('sessionId')
    expect(summary?.recentEvents[0]).not.toHaveProperty('userId')
  })

  it('returns null when the super-admin RPC fails', async () => {
    supabaseMocks.rpc.mockRejectedValue(new Error('offline'))
    const { getSuperAdminAnalyticsSummary } = await loadAnalytics()

    await expect(getSuperAdminAnalyticsSummary()).resolves.toBeNull()
  })
})

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseMocks = vi.hoisted(() => ({ rpc: vi.fn() }))

vi.mock('./supabaseClient', () => ({
  supabase: { rpc: supabaseMocks.rpc },
}))

const FIXED_SESSION_ID = '11111111-1111-4111-8111-111111111111'
const ROTATED_SESSION_ID = '22222222-2222-4222-8222-222222222222'
const SESSION_TTL_MS = 24 * 60 * 60 * 1_000

function browserEnvironment(
  pathname = '/app',
  width = 390,
  initialValues: Record<string, string> = {},
) {
  const values = new Map<string, string>(Object.entries(initialValues))
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

function timestampValue(value: unknown) {
  if (typeof value === 'number') return value
  return typeof value === 'string' ? Date.parse(value) : Number.NaN
}

async function loadAnalytics() {
  vi.resetModules()
  return import('./analytics')
}

describe('frontend analytics transport', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-31T10:00:00.000Z'))
    supabaseMocks.rpc.mockReset()
    supabaseMocks.rpc.mockResolvedValue({ data: { ok: true, status: 'recorded' }, error: null })
    browserEnvironment()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('stores a privacy-bounded session record and reuses it before its 24-hour expiry', async () => {
    const { storage, values } = browserEnvironment()
    const { getAnalyticsSessionId } = await loadAnalytics()

    expect(getAnalyticsSessionId()).toBe(FIXED_SESSION_ID)
    const stored = JSON.parse(values.get('lewad-analytics-session-id') ?? '{}') as Record<string, unknown>
    expect(Object.keys(stored).sort()).toEqual(['created_at', 'expires_at', 'id'])
    expect(stored.id).toBe(FIXED_SESSION_ID)
    expect(timestampValue(stored.expires_at) - timestampValue(stored.created_at)).toBe(SESSION_TTL_MS)

    vi.setSystemTime(new Date('2026-09-01T09:59:59.000Z'))
    expect(getAnalyticsSessionId()).toBe(FIXED_SESSION_ID)
    const reloaded = await loadAnalytics()
    expect(reloaded.getAnalyticsSessionId()).toBe(FIXED_SESSION_ID)
    expect(storage.setItem).toHaveBeenCalledOnce()
  })

  it('rotates an expired session even in a long-lived document', async () => {
    const { values } = browserEnvironment()
    const randomUUID = vi.fn()
      .mockReturnValueOnce(FIXED_SESSION_ID)
      .mockReturnValueOnce(ROTATED_SESSION_ID)
    vi.stubGlobal('crypto', { randomUUID })
    const { getAnalyticsSessionId } = await loadAnalytics()

    expect(getAnalyticsSessionId()).toBe(FIXED_SESSION_ID)
    vi.setSystemTime(new Date('2026-09-01T10:00:00.001Z'))
    expect(getAnalyticsSessionId()).toBe(ROTATED_SESSION_ID)
    expect(JSON.parse(values.get('lewad-analytics-session-id') ?? '{}').id).toBe(ROTATED_SESSION_ID)
  })

  it.each([
    ['legacy UUID', FIXED_SESSION_ID],
    ['malformed JSON', '{not-json'],
    ['invalid identifier', JSON.stringify({ id: 'invalid', created_at: 1, expires_at: 2 })],
  ])('rotates a %s session record', async (_label, storedValue) => {
    browserEnvironment('/app', 390, { 'lewad-analytics-session-id': storedValue })
    const { getAnalyticsSessionId } = await loadAnalytics()

    expect(getAnalyticsSessionId()).toBe(FIXED_SESSION_ID)
  })

  it('falls back to one fresh volatile session when storage is unavailable', async () => {
    const { storage } = browserEnvironment()
    storage.getItem.mockImplementation(() => { throw new Error('blocked') })
    storage.setItem.mockImplementation(() => { throw new Error('blocked') })
    const { getAnalyticsSessionId } = await loadAnalytics()

    expect(getAnalyticsSessionId()).toBe(FIXED_SESSION_ID)
    expect(getAnalyticsSessionId()).toBe(FIXED_SESSION_ID)
  })

  it('sends only inferred safe context and the event metadata allowlist', async () => {
    const { trackEvent } = await loadAnalytics()

    trackEvent('search_started', {
      query_length: 37,
      query: 'must not leave the browser',
      latitude: 18.1,
      longitude: -15.9,
      amount_mro: 500,
      payment_reference: 'private-payment-reference',
      email: 'private@example.test',
      phone: '22000000',
      full_name: 'Private Person',
      access_token: 'private-token',
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

    trackEvent('recharge_started', {
      amount_mro: 500,
      payment_reference: 'private-payment-reference',
    } as never)
    expect(supabaseMocks.rpc.mock.calls[1]?.[1]?.p_metadata).toEqual({})
  })

  it('deduplicates StrictMode page views and refuses non-client paths', async () => {
    const { getAnalyticsPagePath, trackEvent } = await loadAnalytics()

    trackEvent('page_view')
    trackEvent('page_view')

    expect(supabaseMocks.rpc).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(5 * 60 * 1_000 - 1)
    trackEvent('page_view')
    expect(supabaseMocks.rpc).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(1)
    trackEvent('page_view')
    expect(supabaseMocks.rpc).toHaveBeenCalledTimes(2)
    expect(getAnalyticsPagePath('/profile/')).toBe('/profile')
    expect(getAnalyticsPagePath('/admin')).toBeNull()

    vi.stubGlobal('window', { innerWidth: 1280, location: { pathname: '/admin' } })
    trackEvent('page_view')
    expect(supabaseMocks.rpc).toHaveBeenCalledTimes(2)
  })

  it('throttles each search event for ten seconds without tracking keystrokes', async () => {
    const { trackEvent } = await loadAnalytics()
    const completed = { result_count: 3, result_status: 'success' } as const

    trackEvent('search_started', { query_length: 12 })
    trackEvent('search_started', { query_length: 13 })
    trackEvent('search_completed', completed)
    trackEvent('search_completed', completed)
    expect(supabaseMocks.rpc).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(9_999)
    trackEvent('search_started', { query_length: 12 })
    trackEvent('search_completed', completed)
    expect(supabaseMocks.rpc).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(1)
    trackEvent('search_started', { query_length: 12 })
    trackEvent('search_completed', completed)
    expect(supabaseMocks.rpc).toHaveBeenCalledTimes(4)
  })

  it('rotates the session and clears client throttle state at logout boundaries', async () => {
    const randomUUID = vi.fn()
      .mockReturnValueOnce(FIXED_SESSION_ID)
      .mockReturnValueOnce(ROTATED_SESSION_ID)
    vi.stubGlobal('crypto', { randomUUID })
    const { getAnalyticsSessionId, rotateAnalyticsSession, trackEvent } = await loadAnalytics()

    expect(getAnalyticsSessionId()).toBe(FIXED_SESSION_ID)
    trackEvent('page_view')
    expect(rotateAnalyticsSession().id).toBe(ROTATED_SESSION_ID)
    trackEvent('page_view')

    expect(getAnalyticsSessionId()).toBe(ROTATED_SESSION_ID)
    expect(supabaseMocks.rpc).toHaveBeenCalledTimes(2)
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
        estimated_activity: 100,
        active_sessions_real: 4,
        visits_today_real: 28,
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
    expect(first).toEqual({ estimatedActivity: 100 })
    expect(first).not.toHaveProperty('activeSessionsReal')
    expect(first).not.toHaveProperty('visitsTodayReal')
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

    supabaseMocks.rpc.mockResolvedValueOnce({ data: { estimated_activity: 75 }, error: null })
    const thirdModule = await loadAnalytics()
    await expect(thirdModule.getPublicActivityStats()).resolves.toBeNull()
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
        recent_events: [
          {
            created_minute: '2026-08-31T08:30:00Z',
            event_type: 'page_view',
            path: '/',
            locale: 'fr',
            device_type: 'mobile',
            created_at: '2026-08-31T08:32:17.123Z',
            authenticated: false,
            session_id: 'must-not-be-returned',
            user_id: 'must-not-be-returned',
            metadata: { query: 'must-not-be-returned' },
          },
          {
            created_at: '2026-08-31T08:34:59.999Z',
            event_type: 'page_view',
            path: '/profile',
            locale: 'fr',
            device_type: 'desktop',
          },
        ],
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
        createdMinute: '2026-08-31T08:30:00Z',
        eventType: 'page_view',
        path: '/',
        locale: 'fr',
        deviceType: 'mobile',
      }],
    })
    expect(summary?.recentEvents[0]).not.toHaveProperty('sessionId')
    expect(summary?.recentEvents[0]).not.toHaveProperty('userId')
    expect(summary?.recentEvents[0]).not.toHaveProperty('authenticated')
    expect(summary?.recentEvents[0]).not.toHaveProperty('metadata')
    expect(summary?.recentEvents[0]).not.toHaveProperty('createdAt')
    expect(summary?.recentEvents).toHaveLength(1)
  })

  it('returns null when the super-admin RPC fails', async () => {
    supabaseMocks.rpc.mockRejectedValue(new Error('offline'))
    const { getSuperAdminAnalyticsSummary } = await loadAnalytics()

    await expect(getSuperAdminAnalyticsSummary()).resolves.toBeNull()
  })
})

import { supabase } from './supabaseClient'

export const analyticsEventTypes = [
  'page_view',
  'search_started',
  'search_completed',
  'external_map_lookup',
  'add_business_started',
  'recharge_started',
  'install_prompt_viewed',
] as const

export type AnalyticsEventType = (typeof analyticsEventTypes)[number]

export const analyticsPagePaths = [
  '/',
  '/auth',
  '/app',
  '/profile',
  '/history',
  '/credits',
  '/recharge',
  '/add-business',
  '/settings',
  '/contact',
] as const

export type AnalyticsPagePath = (typeof analyticsPagePaths)[number]
export type AnalyticsLocale = 'fr' | 'ar' | 'en' | 'unknown'
export type AnalyticsDeviceType = 'mobile' | 'tablet' | 'desktop' | 'unknown'
export type AnalyticsSearchStatus =
  | 'success'
  | 'not_found'
  | 'insufficient_credits'
  | 'invalid_query'
  | 'error'

export type AnalyticsSession = Readonly<{
  id: string
  created_at: string
  expires_at: string
}>

export type AnalyticsEventMetadata = {
  page_view: Record<never, never>
  search_started: { query_length: number }
  search_completed: {
    result_count: number
    result_status: AnalyticsSearchStatus
  }
  external_map_lookup: Record<never, never>
  add_business_started: Record<never, never>
  recharge_started: Record<never, never>
  install_prompt_viewed: Record<never, never>
}

export type PublicActivityStats = Readonly<{
  estimatedActivity: number
}>

export type AnalyticsPageCount = Readonly<{
  path: AnalyticsPagePath
  count: number
}>

export type AnalyticsEventCount = Readonly<{
  eventType: AnalyticsEventType
  count: number
}>

export type AnalyticsDeviceCount = Readonly<{
  deviceType: AnalyticsDeviceType
  count: number
}>

export type AnalyticsLocaleCount = Readonly<{
  locale: AnalyticsLocale
  count: number
}>

export type RecentAnalyticsEvent = Readonly<{
  createdMinute: string
  eventType: AnalyticsEventType
  path: AnalyticsPagePath
  locale: AnalyticsLocale
  deviceType: AnalyticsDeviceType
}>

export type AnalyticsAuthBreakdown = Readonly<{
  authenticated: number
  anonymous: number
}>

export type SuperAdminAnalyticsSummary = Readonly<{
  totalEvents: number
  totalPageViews: number
  uniqueSessions: number
  uniqueAuthenticatedUsers: number
  activeSessionsNow: number
  visitsToday: number
  visits7Days: number
  visits30Days: number
  authBreakdown: AnalyticsAuthBreakdown
  topPages: readonly AnalyticsPageCount[]
  topEventTypes: readonly AnalyticsEventCount[]
  deviceBreakdown: readonly AnalyticsDeviceCount[]
  localeBreakdown: readonly AnalyticsLocaleCount[]
  recentEvents: readonly RecentAnalyticsEvent[]
}>

const EVENT_TYPE_SET = new Set<string>(analyticsEventTypes)
const PAGE_PATH_SET = new Set<string>(analyticsPagePaths)
const SEARCH_STATUS_SET = new Set<string>([
  'success',
  'not_found',
  'insufficient_credits',
  'invalid_query',
  'error',
])
const LOCALE_SET = new Set<string>(['fr', 'ar', 'en', 'unknown'])
const DEVICE_TYPE_SET = new Set<string>(['mobile', 'tablet', 'desktop', 'unknown'])
const SESSION_STORAGE_KEY = 'lewad-analytics-session-id'
const SESSION_TTL_MS = 24 * 60 * 60 * 1_000
const PAGE_VIEW_THROTTLE_MS = 5 * 60 * 1_000
const SEARCH_EVENT_THROTTLE_MS = 10_000
const PUBLIC_STATS_TTL_MS = 60_000
const PUBLIC_ESTIMATE_MAX = 1_000_000
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

let volatileSession: AnalyticsSession | null = null
const lastPageViewAt = new Map<string, number>()
const lastSearchEventAt = new Map<string, number>()
let publicStatsCache: { value: PublicActivityStats | null; expiresAt: number } | null = null
let publicStatsRequest: Promise<PublicActivityStats | null> | null = null

function createUuid() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
      const bytes = crypto.getRandomValues(new Uint8Array(16))
      bytes[6] = (bytes[6] & 0x0f) | 0x40
      bytes[8] = (bytes[8] & 0x3f) | 0x80
      const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
      return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
    }
  } catch {
    // A volatile UUID is sufficient when browser crypto is unavailable.
  }

  const randomHex = () => Math.floor(Math.random() * 0x1_0000).toString(16).padStart(4, '0')
  return `${randomHex()}${randomHex()}-${randomHex()}-4${randomHex().slice(1)}-a${randomHex().slice(1)}-${randomHex()}${randomHex()}${randomHex()}`
}

function createAnalyticsSession(now = Date.now()): AnalyticsSession {
  return Object.freeze({
    id: createUuid().toLowerCase(),
    created_at: new Date(now).toISOString(),
    expires_at: new Date(now + SESSION_TTL_MS).toISOString(),
  })
}

function validAnalyticsSession(value: unknown, now: number): AnalyticsSession | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const source = value as Record<string, unknown>
  const keys = Object.keys(source)
  if (
    keys.length !== 3
    || !keys.every((key) => key === 'id' || key === 'created_at' || key === 'expires_at')
    || typeof source.id !== 'string'
    || typeof source.created_at !== 'string'
    || typeof source.expires_at !== 'string'
    || !UUID_PATTERN.test(source.id)
  ) return null

  const createdAt = Date.parse(source.created_at)
  const expiresAt = Date.parse(source.expires_at)
  if (
    !Number.isFinite(createdAt)
    || !Number.isFinite(expiresAt)
    || createdAt > now
    || expiresAt <= now
    || expiresAt - createdAt !== SESSION_TTL_MS
  ) return null

  return Object.freeze({
    id: source.id.toLowerCase(),
    created_at: new Date(createdAt).toISOString(),
    expires_at: new Date(expiresAt).toISOString(),
  })
}

function readStoredAnalyticsSession(value: string | null, now: number) {
  if (!value) return null
  try {
    return validAnalyticsSession(JSON.parse(value), now)
  } catch {
    return null
  }
}

function persistAnalyticsSession(record: AnalyticsSession) {
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(record))
    return true
  } catch {
    return false
  }
}

function removeStoredAnalyticsSession() {
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY)
  } catch {
    // Rotation remains safe and non-blocking when storage is restricted.
  }
}

function replaceAnalyticsSession(now = Date.now()) {
  removeStoredAnalyticsSession()
  volatileSession = createAnalyticsSession(now)
  lastPageViewAt.clear()
  lastSearchEventAt.clear()
  persistAnalyticsSession(volatileSession)
  return volatileSession
}

export function getAnalyticsSession(): AnalyticsSession {
  const now = Date.now()
  const current = validAnalyticsSession(volatileSession, now)
  if (current) {
    volatileSession = current
    return current
  }

  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY)
    const parsed = readStoredAnalyticsSession(stored, now)
    if (parsed) {
      volatileSession = parsed
      return parsed
    }
  } catch {
    // A restricted/broken storage backend gets a fresh document-local session.
  }

  return replaceAnalyticsSession(now)
}

export function getAnalyticsSessionId() {
  return getAnalyticsSession().id
}

/** Breaks the analytics link across privacy boundaries such as a safe logout. */
export function rotateAnalyticsSession() {
  return replaceAnalyticsSession()
}

function normalizedPath(pathname: string) {
  const path = pathname.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/'
  return path === '/index.html' ? '/' : path
}

export function getAnalyticsPagePath(pathname?: string): AnalyticsPagePath | null {
  const source = pathname ?? (typeof window !== 'undefined' ? window.location.pathname : '')
  const path = normalizedPath(source)
  return PAGE_PATH_SET.has(path) ? path as AnalyticsPagePath : null
}

function inferLocale(): AnalyticsLocale {
  try {
    const stored = localStorage.getItem('lewad-locale')
    if (stored && LOCALE_SET.has(stored)) return stored as AnalyticsLocale
  } catch {
    // Fall through to non-storage language signals.
  }

  const documentLocale = typeof document !== 'undefined'
    ? document.documentElement.lang.toLowerCase().split('-')[0]
    : ''
  if (LOCALE_SET.has(documentLocale)) return documentLocale as AnalyticsLocale

  const browserLocale = typeof navigator !== 'undefined'
    ? navigator.language.toLowerCase().split('-')[0]
    : ''
  return LOCALE_SET.has(browserLocale) ? browserLocale as AnalyticsLocale : 'unknown'
}

function inferDeviceType(): AnalyticsDeviceType {
  if (typeof window === 'undefined') return 'unknown'
  const width = window.innerWidth
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet'
  return 'desktop'
}

function boundedInteger(value: unknown, maximum: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0
  return Math.min(maximum, Math.max(0, Math.trunc(value)))
}

function safeEventMetadata(eventType: AnalyticsEventType, metadata: unknown): Record<string, unknown> {
  const source = metadata && typeof metadata === 'object'
    ? metadata as Record<string, unknown>
    : {}

  if (eventType === 'search_started') {
    return { query_length: boundedInteger(source.query_length, 500) }
  }

  if (eventType === 'search_completed') {
    const resultStatus = typeof source.result_status === 'string' && SEARCH_STATUS_SET.has(source.result_status)
      ? source.result_status as AnalyticsSearchStatus
      : 'error'
    return {
      result_count: boundedInteger(source.result_count, 1_000),
      result_status: resultStatus,
    }
  }

  return {}
}

/**
 * Sends a V1 analytics event without ever joining the caller's control flow.
 * The RPC error and rejected promise are intentionally swallowed: product
 * telemetry must not affect search, wallet, recharge, or submission behavior.
 */
export function trackEvent<EventType extends AnalyticsEventType>(
  eventType: EventType,
  metadata: AnalyticsEventMetadata[EventType] = {} as AnalyticsEventMetadata[EventType],
): void {
  if (!EVENT_TYPE_SET.has(eventType)) return

  const path = getAnalyticsPagePath()
  if (!path) return

  const sessionId = getAnalyticsSessionId()
  const now = Date.now()
  if (eventType === 'page_view') {
    const pageViewKey = `${sessionId}:${path}`
    const previous = lastPageViewAt.get(pageViewKey)
    if (previous !== undefined && now - previous < PAGE_VIEW_THROTTLE_MS) return
    lastPageViewAt.set(pageViewKey, now)
  }
  if (eventType === 'search_started' || eventType === 'search_completed') {
    const searchEventKey = `${sessionId}:${path}:${eventType}`
    const previous = lastSearchEventAt.get(searchEventKey)
    if (previous !== undefined && now - previous < SEARCH_EVENT_THROTTLE_MS) return
    lastSearchEventAt.set(searchEventKey, now)
  }

  try {
    const request = supabase.rpc('track_analytics_event', {
      p_session_id: sessionId,
      p_event_type: eventType,
      p_path: path,
      p_locale: inferLocale(),
      p_device_type: inferDeviceType(),
      p_metadata: safeEventMetadata(eventType, metadata),
    })
    void Promise.resolve(request).catch(() => undefined)
  } catch {
    // Some mocked/offline clients can throw before returning a promise.
  }
}

function recordValue(value: unknown): Record<string, unknown> | null {
  const candidate = Array.isArray(value) ? value[0] : value
  return candidate && typeof candidate === 'object' && !Array.isArray(candidate)
    ? candidate as Record<string, unknown>
    : null
}

function countValue(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null
  return Math.trunc(value)
}

function parsePublicActivityStats(value: unknown): PublicActivityStats | null {
  const source = recordValue(value)
  if (!source) return null
  const estimatedActivity = countValue(source.estimated_activity)
  const isSafePublicBucket = estimatedActivity === 0
    || (estimatedActivity !== null && estimatedActivity >= 100 && estimatedActivity % 100 === 0)
  return estimatedActivity === null || estimatedActivity > PUBLIC_ESTIMATE_MAX || !isSafePublicBucket
    ? null
    : Object.freeze({ estimatedActivity })
}

export function getPublicActivityStats(): Promise<PublicActivityStats | null> {
  const now = Date.now()
  if (publicStatsCache && publicStatsCache.expiresAt > now) {
    return Promise.resolve(publicStatsCache.value)
  }
  if (publicStatsRequest) return publicStatsRequest

  publicStatsRequest = Promise.resolve()
    .then(() => supabase.rpc('get_public_activity_stats'))
    .then(({ data, error }) => {
      if (error) return null
      return parsePublicActivityStats(data)
    })
    .catch(() => null)
    .then((value) => {
      publicStatsCache = { value, expiresAt: Date.now() + PUBLIC_STATS_TTL_MS }
      return value
    })
    .finally(() => {
      publicStatsRequest = null
    })

  return publicStatsRequest
}

function countRows(value: unknown) {
  return Array.isArray(value) ? value : null
}

function rowCount(row: Record<string, unknown>) {
  return countValue(row.count ?? row.total)
}

function parsePageCounts(value: unknown): AnalyticsPageCount[] | null {
  const rows = countRows(value)
  if (!rows) return null
  return rows.flatMap((value) => {
    const row = recordValue(value)
    const pathValue = typeof row?.path === 'string' ? row.path : row?.page_path
    const path = typeof pathValue === 'string' ? getAnalyticsPagePath(pathValue) : null
    const count = row ? rowCount(row) : null
    return path && count !== null ? [{ path, count }] : []
  }).slice(0, 20)
}

function parseEventCounts(value: unknown): AnalyticsEventCount[] | null {
  const rows = countRows(value)
  if (!rows) return null
  return rows.flatMap((value) => {
    const row = recordValue(value)
    const eventType = row && typeof row.event_type === 'string' && EVENT_TYPE_SET.has(row.event_type)
      ? row.event_type as AnalyticsEventType
      : null
    const count = row ? rowCount(row) : null
    return eventType && count !== null ? [{ eventType, count }] : []
  }).slice(0, analyticsEventTypes.length)
}

function parseDeviceCounts(value: unknown): AnalyticsDeviceCount[] | null {
  const rows = countRows(value)
  if (!rows) return null
  return rows.flatMap((value) => {
    const row = recordValue(value)
    const deviceType = row && typeof row.device_type === 'string' && DEVICE_TYPE_SET.has(row.device_type)
      ? row.device_type as AnalyticsDeviceType
      : null
    const count = row ? rowCount(row) : null
    return deviceType && count !== null ? [{ deviceType, count }] : []
  }).slice(0, 4)
}

function parseLocaleCounts(value: unknown): AnalyticsLocaleCount[] | null {
  const rows = countRows(value)
  if (!rows) return null
  return rows.flatMap((value) => {
    const row = recordValue(value)
    const locale = row && typeof row.locale === 'string' && LOCALE_SET.has(row.locale)
      ? row.locale as AnalyticsLocale
      : null
    const count = row ? rowCount(row) : null
    return locale && count !== null ? [{ locale, count }] : []
  }).slice(0, 4)
}

function fiveMinuteTimestamp(value: unknown) {
  if (typeof value !== 'string') return null
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return null
  const date = new Date(timestamp)
  return date.getUTCMinutes() % 5 === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0
    ? value
    : null
}

function parseRecentEvents(value: unknown): RecentAnalyticsEvent[] | null {
  const rows = countRows(value)
  if (!rows) return null
  return rows.flatMap((value) => {
    const row = recordValue(value)
    if (!row) return []
    const eventType = typeof row.event_type === 'string' && EVENT_TYPE_SET.has(row.event_type)
      ? row.event_type as AnalyticsEventType
      : null
    const pathValue = typeof row.path === 'string' ? row.path : row.page_path
    const path = typeof pathValue === 'string' ? getAnalyticsPagePath(pathValue) : null
    const locale = typeof row.locale === 'string' && LOCALE_SET.has(row.locale)
      ? row.locale as AnalyticsLocale
      : null
    const deviceType = typeof row.device_type === 'string' && DEVICE_TYPE_SET.has(row.device_type)
      ? row.device_type as AnalyticsDeviceType
      : null
    const createdMinute = fiveMinuteTimestamp(row.created_minute)
    return eventType && path && locale && deviceType && createdMinute
      ? [{ createdMinute, eventType, path, locale, deviceType }]
      : []
  }).slice(0, 20)
}

function parseAuthBreakdown(value: unknown) {
  const source = recordValue(value)
  if (!source) return null
  const authenticated = countValue(source.authenticated)
  const anonymous = countValue(source.anonymous)
  return authenticated !== null && anonymous !== null ? { authenticated, anonymous } : null
}

function parseSuperAdminSummary(value: unknown): SuperAdminAnalyticsSummary | null {
  const source = recordValue(value)
  if (!source) return null

  const totalEvents = countValue(source.total_events)
  const totalPageViews = countValue(source.total_page_views)
  const uniqueSessions = countValue(source.unique_sessions)
  const uniqueAuthenticatedUsers = countValue(source.unique_authenticated_users)
  const activeSessionsNow = countValue(source.active_sessions_now)
  const visitsToday = countValue(source.visits_today)
  const visits7Days = countValue(source.visits_7_days)
  const visits30Days = countValue(source.visits_30_days)
  const authBreakdown = parseAuthBreakdown(source.auth_breakdown)
  const topPages = parsePageCounts(source.top_pages)
  const topEventTypes = parseEventCounts(source.top_event_types)
  const deviceBreakdown = parseDeviceCounts(source.device_breakdown)
  const localeBreakdown = parseLocaleCounts(source.locale_breakdown)
  const recentEvents = parseRecentEvents(source.recent_events)

  if (
    totalEvents === null || totalPageViews === null || uniqueSessions === null
    || uniqueAuthenticatedUsers === null || activeSessionsNow === null
    || visitsToday === null || visits7Days === null || visits30Days === null
    || !authBreakdown || !topPages || !topEventTypes || !deviceBreakdown
    || !localeBreakdown || !recentEvents
  ) return null

  return {
    totalEvents,
    totalPageViews,
    uniqueSessions,
    uniqueAuthenticatedUsers,
    activeSessionsNow,
    visitsToday,
    visits7Days,
    visits30Days,
    authBreakdown,
    topPages,
    topEventTypes,
    deviceBreakdown,
    localeBreakdown,
    recentEvents,
  }
}

function safeTimestamp(value: string | undefined) {
  if (value === undefined) return undefined
  const time = Date.parse(value)
  return Number.isFinite(time) ? new Date(time).toISOString() : null
}

export async function getSuperAdminAnalyticsSummary(
  from?: string,
  to?: string,
): Promise<SuperAdminAnalyticsSummary | null> {
  try {
    const safeFrom = safeTimestamp(from)
    const safeTo = safeTimestamp(to)
    if (safeFrom === null || safeTo === null) return null
    const parameters: { p_from?: string; p_to?: string } = {}
    if (safeFrom) parameters.p_from = safeFrom
    if (safeTo) parameters.p_to = safeTo
    const { data, error } = await supabase.rpc('super_admin_get_analytics_summary', parameters)
    return error ? null : parseSuperAdminSummary(data)
  } catch {
    return null
  }
}

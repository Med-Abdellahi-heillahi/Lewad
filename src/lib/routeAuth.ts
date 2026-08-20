import { getProfileByIdWithRetry } from './db1'
import { supabase } from './supabaseClient'

const defaultDestination = '/app'

export type LewadRole = 'user' | 'admin' | 'super_admin'

/** Unknown/missing profile roles must never grant an admin destination. */
export function normalizeLewadRole(role: string | null | undefined): LewadRole {
  if (role === 'admin' || role === 'super_admin') return role
  return 'user'
}

export function isAdminRole(role: string | null | undefined) {
  const normalizedRole = normalizeLewadRole(role)
  return normalizedRole === 'admin' || normalizedRole === 'super_admin'
}

export function defaultDestinationForRole(role: string | null | undefined) {
  const normalizedRole = normalizeLewadRole(role)
  if (normalizedRole === 'super_admin') return '/super-admin'
  if (normalizedRole === 'admin') return '/admin'
  return defaultDestination
}

/**
 * Role check for post-auth destinations. This keeps a valid same-origin
 * `redirect=/admin` from becoming a client-side privilege escalation.
 */
export function canRoleAccessPath(role: string | null | undefined, destination: string) {
  const path = new URL(destination, window.location.origin).pathname
  if (path === '/super-admin' || path.startsWith('/super-admin/')) return normalizeLewadRole(role) === 'super_admin'
  if (path === '/admin' || path.startsWith('/admin/')) return isAdminRole(role)
  return true
}

export function destinationForRole(role: string | null | undefined, requestedDestination?: string) {
  const fallback = defaultDestinationForRole(role)
  const destination = requestedDestination ?? fallback
  return canRoleAccessPath(role, destination) ? destination : fallback
}

export type PostLoginResolution = {
  destination: string
  role: LewadRole
  profileLoaded: true
} | {
  destination: null
  role: null
  profileLoaded: false
}

/**
 * Resolves a post-login destination only after Supabase confirms the current
 * user and DB1 has had a short chance to expose that user's trigger-created
 * profile. A missing/failed profile deliberately does not become `user` here:
 * callers can show a recoverable error instead of silently choosing a space.
 */
export async function resolvePostLoginDestination(options: { redirectTo?: string | null } = {}): Promise<PostLoginResolution> {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  const user = authData.user

  if (authError || !user) {
    if (import.meta.env.DEV) console.debug('[AuthRoute] no authenticated user while resolving role')
    return { destination: null, role: null, profileLoaded: false }
  }

  if (import.meta.env.DEV) console.debug('[AuthRoute] resolving role', { userId: user.id })

  try {
    const profileResult = await getProfileByIdWithRetry(user.id)
    if (!profileResult.data) {
      if (import.meta.env.DEV) console.debug('[AuthRoute] profile load failed', { userId: user.id, error: profileResult.error })
      return { destination: null, role: null, profileLoaded: false }
    }

    const role = normalizeLewadRole(profileResult.data.role)
    const destination = destinationForRole(role, options.redirectTo ?? undefined)
    if (import.meta.env.DEV) console.debug('[AuthRoute] role resolved', { userId: user.id, role, destination })
    return { destination, role, profileLoaded: true }
  } catch {
    if (import.meta.env.DEV) console.debug('[AuthRoute] profile load threw an unexpected error', { userId: user.id })
    return { destination: null, role: null, profileLoaded: false }
  }
}

/** Builds the sign-in URL while retaining the local route the visitor requested. */
export function authUrlForCurrentRoute() {
  const requestedPath = `${window.location.pathname}${window.location.search}${window.location.hash}`
  return `/auth?redirect=${encodeURIComponent(requestedPath)}`
}

/**
 * Only accept same-origin, path-based destinations so the redirect query
 * cannot send a signed-in visitor to an external site.
 */
export function getAuthRedirectDestination() {
  const redirect = new URLSearchParams(window.location.search).get('redirect')

  // Without a requested path, the role must choose the default destination.
  // Returning `/app` here would make an admin appear to have chosen the user space.
  if (!redirect?.startsWith('/')) return null

  try {
    const destination = new URL(redirect, window.location.origin)
    if (destination.origin === window.location.origin) {
      return `${destination.pathname}${destination.search}${destination.hash}`
    }
  } catch {
    // Invalid input is treated as no requested path, so the role picks the destination.
  }

  return null
}

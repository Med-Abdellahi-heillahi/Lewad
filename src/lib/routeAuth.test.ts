import { describe, expect, it, vi } from 'vitest'

vi.mock('./db1', () => ({ getProfileByIdWithRetry: vi.fn() }))
vi.mock('./supabaseClient', () => ({ supabase: { auth: { getUser: vi.fn() } } }))

import { defaultDestinationForRole, normalizeLewadRole } from './routeAuth'

describe('admin route role normalization', () => {
  it('never promotes an unknown role', () => {
    expect(normalizeLewadRole('super-admin')).toBe('user')
    expect(normalizeLewadRole(null)).toBe('user')
  })

  it('keeps super admins on their dedicated destination', () => {
    expect(defaultDestinationForRole('super_admin')).toBe('/super-admin')
    expect(defaultDestinationForRole('admin')).toBe('/admin')
  })
})

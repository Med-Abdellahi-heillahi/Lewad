import { supabase } from './supabaseClient'

export type RechargeOfferCode = 'starter_10' | 'regular_30' | 'advanced_100'

/**
 * Public display mirror of the offer codes resolved by
 * `create_recharge_request` in PostgreSQL. The RPC remains authoritative for
 * every actual recharge request; this lets public and authenticated screens
 * show the same reviewed catalogue without inventing a second set of prices.
 */
export const rechargeOffers = [
  { code: 'starter_10', points: 10, amountMro: 50, featured: false },
  { code: 'regular_30', points: 30, amountMro: 100, featured: true },
  { code: 'advanced_100', points: 100, amountMro: 500, featured: false },
] as const satisfies readonly {
  code: RechargeOfferCode
  points: number
  amountMro: number
  featured: boolean
}[]

export type RechargeRequest = {
  id: string
  offerLabel: string
  requestedPoints: number
  amountMro: number
}

export type CreateRechargeRequestResult = {
  ok: boolean
  status: 'created' | 'duplicate' | 'unauthenticated' | 'invalid_offer' | 'error'
  request: RechargeRequest | null
}

const errorResult: CreateRechargeRequestResult = { ok: false, status: 'error', request: null }

/**
 * The offer code is the only client input. PostgreSQL resolves it to the
 * approved points/price pair and scopes the row to `auth.uid()`.
 */
export async function createRechargeRequest(offerCode: RechargeOfferCode): Promise<CreateRechargeRequestResult> {
  const { data, error } = await supabase.rpc('create_recharge_request', { p_offer_code: offerCode })
  if (error || !data || typeof data !== 'object') return errorResult

  const response = data as Record<string, unknown>
  const status = response.status
  const requestId = response.request_id
  const offerLabel = response.offer_label
  const requestedPoints = response.requested_points
  const amountMro = response.amount_mro

  if (
    response.ok !== true
    || (status !== 'created' && status !== 'duplicate')
    || typeof requestId !== 'string'
    || typeof offerLabel !== 'string'
    || typeof requestedPoints !== 'number'
    || typeof amountMro !== 'number'
  ) {
    return {
      ok: false,
      status: status === 'unauthenticated' || status === 'invalid_offer' ? status : 'error',
      request: null,
    }
  }

  return {
    ok: true,
    status,
    request: { id: requestId, offerLabel, requestedPoints, amountMro },
  }
}

import { supabase } from './supabaseClient'

export type ClientEstablishment = {
  id: string
  name: string
  nameAr: string | null
  category: string | null
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended'
  isVerified: boolean
  createdAt: string
  verifiedAt: string | null
  approvedAt: string | null
  subscriptionAmountMro: number | null
  subscriptionPeriodMonths: number | null
  submissionWebsite: string | null
  branchCount: number
  searchAppearances: number | null
  mainPhone: string | null
  mainWhatsapp: string | null
  mainLocation: string | null
  latitude: number | null
  longitude: number | null
}

export type ClientEstablishmentsResult = {
  items: ClientEstablishment[]
}

type JsonRecord = Record<string, unknown>

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function booleanValue(value: unknown): boolean {
  return value === true
}

function statusValue(value: unknown): ClientEstablishment['status'] | null {
  return value === 'draft' || value === 'pending' || value === 'approved' || value === 'rejected' || value === 'suspended'
    ? value
    : null
}

function readItem(value: unknown): ClientEstablishment | null {
  if (!isRecord(value)) return null

  const id = stringValue(value.id)
  const name = stringValue(value.name)
  const status = statusValue(value.status)
  const createdAt = stringValue(value.created_at)
  const branchCount = numberValue(value.branch_count)
  if (!id || !name || !status || !createdAt || branchCount === null) return null

  return {
    id,
    name,
    nameAr: stringValue(value.name_ar),
    category: stringValue(value.category),
    status,
    isVerified: booleanValue(value.is_verified),
    createdAt,
    verifiedAt: stringValue(value.verified_at),
    approvedAt: stringValue(value.approved_at),
    subscriptionAmountMro: numberValue(value.subscription_amount_mro),
    subscriptionPeriodMonths: numberValue(value.subscription_period_months),
    submissionWebsite: stringValue(value.submission_website),
    branchCount,
    searchAppearances: numberValue(value.search_appearances),
    mainPhone: stringValue(value.main_phone),
    mainWhatsapp: stringValue(value.main_whatsapp),
    mainLocation: stringValue(value.main_location),
    latitude: numberValue(value.latitude),
    longitude: numberValue(value.longitude),
  }
}

export async function getMyEstablishmentsWithStats(): Promise<ClientEstablishmentsResult> {
  const { data, error } = await supabase.rpc('get_my_establishments_with_stats')
  if (error || !isRecord(data) || !Array.isArray(data.items)) throw new Error('Unable to load establishments')

  return {
    items: data.items.flatMap((item) => {
      const parsed = readItem(item)
      return parsed ? [parsed] : []
    }),
  }
}

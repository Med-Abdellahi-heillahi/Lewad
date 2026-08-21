import { supabase } from './supabaseClient'
import { isAllowedAvatarFile, isAvatarFileTooLarge } from './validation'
import { paginatedResult, resolvePagination, type PaginatedResult, type PaginationParams } from './pagination'

export type Db1Profile = {
  id: string
  full_name: string | null
  full_name_ar: string | null
  email: string | null
  phone: string | null
  avatar_url: string | null
  role: 'user' | 'admin' | 'super_admin'
  status: 'active' | 'suspended' | 'deleted'
  created_at: string
  updated_at: string
}

export type Db1Wallet = {
  id: string
  user_id: string
  balance: number
  created_at: string
  updated_at: string
}

export type CreditLedgerType = 'welcome_bonus' | 'search_debit' | 'recharge_credit' | 'admin_adjustment' | 'referral_bonus'
export type CreditLedgerDisplayType = CreditLedgerType | 'unknown'

export type Db1CreditLedgerEntry = {
  id: string
  user_id: string
  wallet_id: string
  amount: number
  type: CreditLedgerDisplayType
  reason: string | null
  reference_type: string | null
  reference_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

/**
 * A deliberately narrow profile patch.  It can never alter identity, role or
 * account status, and omitting a property leaves its persisted value intact.
 */
export type SafeProfileUpdate = Partial<Pick<Db1Profile, 'full_name' | 'full_name_ar' | 'phone' | 'avatar_url'>>

export type ProfileUpdateError = 'duplicate_phone' | 'unauthenticated' | 'unknown'

export type ProfileUpdateResult = {
  data: Db1Profile | null
  error: ProfileUpdateError | null
}

export type AvatarUploadError = 'invalid_file' | 'file_too_large' | 'unauthenticated' | 'upload_failed'

export type AvatarUploadResult = {
  data: string | null
  error: AvatarUploadError | null
}

type Db1Result<T> = {
  data: T | null
  error: boolean
}

export type MyAccountSummary = {
  profile: Db1Profile | null
  wallet: Db1Wallet | null
  profileError: boolean
  walletError: boolean
  error: boolean
}

const profileFields = 'id, full_name, full_name_ar, email, phone, avatar_url, role, status, created_at, updated_at'
const walletFields = 'id, user_id, balance, created_at, updated_at'
const ledgerFields = 'id, user_id, wallet_id, amount, type, reason, reference_type, reference_id, metadata, created_at'
const creditLedgerTypes = new Set<CreditLedgerType>(['welcome_bonus', 'search_debit', 'recharge_credit', 'admin_adjustment', 'referral_bonus'])

type RawCreditLedgerEntry = Omit<Db1CreditLedgerEntry, 'amount' | 'type' | 'metadata'> & {
  amount: unknown
  type: unknown
  metadata: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

/** `balance` is an integer in DB1, but normalise it at the API boundary. */
function normalizeWallet(value: unknown): Db1Wallet | null {
  if (!isRecord(value)) return null

  const balance = typeof value.balance === 'number' ? value.balance : Number(value.balance)
  if (!Number.isFinite(balance)) return null

  return { ...value, balance } as Db1Wallet
}

/**
 * Supabase returns trusted DB rows in normal conditions, but the presentation
 * layer must stay renderable if an older row has an unexpected value.
 */
function normalizeCreditLedgerEntry(entry: RawCreditLedgerEntry): Db1CreditLedgerEntry {
  const parsedAmount = typeof entry.amount === 'number' ? entry.amount : Number(entry.amount)
  const type = typeof entry.type === 'string' && creditLedgerTypes.has(entry.type as CreditLedgerType)
    ? entry.type as CreditLedgerType
    : 'unknown'

  return {
    ...entry,
    amount: Number.isFinite(parsedAmount) ? parsedAmount : 0,
    type,
    metadata: isRecord(entry.metadata) ? entry.metadata : {},
  }
}

export async function getProfileById(userId: string): Promise<Db1Result<Db1Profile>> {
  const { data, error } = await supabase
    .from('profiles')
    .select(profileFields)
    .eq('id', userId)
    .maybeSingle()
  return { data: (data as Db1Profile | null) ?? null, error: Boolean(error) }
}

/**
 * The DB1 profile is created by an Auth trigger. Right after the first session
 * is issued, that row can take a moment to become visible through RLS.
 */
export async function getProfileByIdWithRetry(userId: string, attempts = 3): Promise<Db1Result<Db1Profile>> {
  let lastResult: Db1Result<Db1Profile> = { data: null, error: false }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    lastResult = await getProfileById(userId)
    if (lastResult.data) return lastResult

    if (import.meta.env.DEV) {
      console.debug('[AuthRoute] profile unavailable', { userId, attempt, error: lastResult.error })
    }

    if (attempt < attempts) await new Promise<void>((resolve) => window.setTimeout(resolve, 250))
  }

  return lastResult
}

export async function getMyProfile(): Promise<Db1Result<Db1Profile>> {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return { data: null, error: true }
  return getProfileById(authData.user.id)
}

export async function updateMyProfile(update: SafeProfileUpdate): Promise<ProfileUpdateResult> {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return { data: null, error: 'unauthenticated' }

  const { data, error } = await supabase
    .from('profiles')
    .update(update)
    .eq('id', authData.user.id)
    .select(profileFields)
    .maybeSingle()

  if (error) {
    return { data: null, error: error.code === '23505' ? 'duplicate_phone' : 'unknown' }
  }

  return { data: (data as Db1Profile | null) ?? null, error: null }
}

const avatarBucket = 'avatars'

function avatarExtension(file: File): 'jpg' | 'png' | null {
  if (file.type === 'image/jpeg') return 'jpg'
  if (file.type === 'image/png') return 'png'
  return null
}

/**
 * Uploads a new immutable avatar object and returns its public URL. The
 * timestamped path means browsers never reuse a stale image response.
 */
export async function uploadMyAvatar(file: File): Promise<AvatarUploadResult> {
  if (isAvatarFileTooLarge(file)) return { data: null, error: 'file_too_large' }
  if (!isAllowedAvatarFile(file)) return { data: null, error: 'invalid_file' }

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError || !authData.user) return { data: null, error: 'unauthenticated' }

  const extension = avatarExtension(file)
  if (!extension) return { data: null, error: 'invalid_file' }

  const path = `${authData.user.id}/avatar-${Date.now()}.${extension}`
  const contentType = extension === 'jpg' ? 'image/jpeg' : 'image/png'
  const { error } = await supabase.storage.from(avatarBucket).upload(path, file, {
    cacheControl: '31536000',
    contentType,
    upsert: false,
  })
  if (error) return { data: null, error: 'upload_failed' }

  const { data } = supabase.storage.from(avatarBucket).getPublicUrl(path)
  return data.publicUrl ? { data: data.publicUrl, error: null } : { data: null, error: 'upload_failed' }
}

export async function getMyWallet(): Promise<Db1Result<Db1Wallet>> {
  const { data, error } = await supabase.from('wallets').select(walletFields).maybeSingle()
  const wallet = normalizeWallet(data)
  const hasInvalidShape = data !== null && wallet === null

  if ((error || hasInvalidShape) && import.meta.env.DEV) {
    console.debug('[Account] wallet load failed')
  }

  return { data: wallet, error: Boolean(error) || hasInvalidShape }
}

export async function getMyCreditLedger(
  pagination: PaginationParams = {},
): Promise<PaginatedResult<Db1CreditLedgerEntry> & { error: boolean }> {
  const { page, pageSize, from, to } = resolvePagination(pagination)
  const { data, error, count } = await supabase
    .from('credit_ledger')
    .select(ledgerFields, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)
  const entries = ((data as RawCreditLedgerEntry[] | null) ?? []).map(normalizeCreditLedgerEntry)
  return { ...paginatedResult(entries, count, { page, pageSize }), error: Boolean(error) }
}

export async function getMyAccountSummary(userId?: string): Promise<MyAccountSummary> {
  const profileRequest = userId ? getProfileByIdWithRetry(userId) : getMyProfile()
  const [profileResult, walletResult] = await Promise.all([profileRequest, getMyWallet()])
  return {
    profile: profileResult.data,
    wallet: walletResult.data,
    profileError: profileResult.error,
    walletError: walletResult.error,
    error: profileResult.error || walletResult.error,
  }
}

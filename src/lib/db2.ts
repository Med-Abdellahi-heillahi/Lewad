import { supabase } from './supabaseClient'
import { readPlaceTypeKeys, type PlaceTypeKey } from './placeTypes'

export type Db2Category = {
  id: string
  name: string
  slug: string
  icon: string | null
}

export type Db2Branch = {
  id: string
  establishment_id: string
  name: string
  phone: string | null
  whatsapp: string | null
  address: string | null
  city: string | null
  neighborhood: string | null
  latitude: number | null
  longitude: number | null
  is_main: boolean
  status: 'active' | 'hidden' | 'closed'
}

type Db2EstablishmentBase = {
  id: string
  name: string
  name_ar: string | null
  slug: string
  description: string | null
  phone: string | null
  whatsapp: string | null
  website: string | null
  status: 'draft' | 'pending' | 'approved' | 'rejected' | 'suspended'
  is_verified: boolean
  place_types: PlaceTypeKey[]
  category: Db2Category | null
}

type Db2EstablishmentRecord = Omit<Db2EstablishmentBase, 'category' | 'name_ar' | 'place_types'> & {
  name_ar: unknown
  place_types: unknown
  category: Db2Category | Db2Category[] | null
}

export type Db2Establishment = Db2EstablishmentBase & {
  branches: Db2Branch[]
  branchesError: boolean
}

type Db2Result<T> = {
  data: T
  error: boolean
}

const categoryFields = 'id, name, slug, icon'
const branchFields = 'id, establishment_id, name, phone, whatsapp, address, city, neighborhood, latitude, longitude, is_main, status'
const establishmentFields = `
  id, name, name_ar, slug, description, phone, whatsapp, website, status, is_verified, place_types,
  category:categories (${categoryFields})
`

export async function getActiveCategories(): Promise<Db2Result<Db2Category[]>> {
  const { data, error } = await supabase
    .from('categories')
    .select(categoryFields)
    .eq('status', 'active')
    .order('sort_order')
    .order('name')

  return { data: (data as Db2Category[] | null) ?? [], error: Boolean(error) }
}

export async function getBranchesForEstablishment(establishmentId: string): Promise<Db2Result<Db2Branch[]>> {
  const { data, error } = await supabase
    .from('branches')
    .select(branchFields)
    .eq('establishment_id', establishmentId)
    .eq('status', 'active')
    .order('is_main', { ascending: false })
    .order('name')

  return { data: (data as Db2Branch[] | null) ?? [], error: Boolean(error) }
}

async function withBranches(establishments: Db2EstablishmentBase[]): Promise<Db2Establishment[]> {
  const branchResults = await Promise.all(establishments.map((establishment) => getBranchesForEstablishment(establishment.id)))

  return establishments.map((establishment, index) => ({
    ...establishment,
    branches: branchResults[index].data,
    branchesError: branchResults[index].error,
  }))
}

function normalizeEstablishment(record: Db2EstablishmentRecord): Db2EstablishmentBase {
  return {
    ...record,
    name_ar: typeof record.name_ar === 'string' ? record.name_ar : null,
    place_types: readPlaceTypeKeys(record.place_types),
    category: Array.isArray(record.category) ? record.category[0] ?? null : record.category,
  }
}

export async function searchEstablishments(query: string): Promise<Db2Result<Db2Establishment[]>> {
  const trimmedQuery = query.trim()
  if (!trimmedQuery) return { data: [], error: false }

  const { data, error } = await supabase
    .from('establishments')
    .select(establishmentFields)
    .eq('status', 'approved')
    .ilike('name', `%${trimmedQuery}%`)
    .order('name')

  if (error) return { data: [], error: true }

  const establishments = ((data as Db2EstablishmentRecord[] | null) ?? []).map(normalizeEstablishment)
  return { data: await withBranches(establishments), error: false }
}

export async function getEstablishmentBySlug(slug: string): Promise<Db2Result<Db2Establishment | null>> {
  const { data, error } = await supabase
    .from('establishments')
    .select(establishmentFields)
    .eq('slug', slug.trim())
    .eq('status', 'approved')
    .maybeSingle()

  if (error || !data) return { data: null, error: Boolean(error) }

  const establishmentBase = normalizeEstablishment(data as Db2EstablishmentRecord)
  const [establishment] = await withBranches([establishmentBase])
  return { data: establishment, error: false }
}

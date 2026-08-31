import type { PlaceTypeKey } from './placeTypes'
import { isValidMauritanianPhone, normalizeMauritanianPhone } from './validation'

export type AdminExternalPlaceImportField =
  | 'correctedName'
  | 'verificationPlace'
  | 'phone'
  | 'whatsapp'
  | 'label'
  | 'parentMinistry'
  | 'parentAdministration'
  | 'notes'

export type AdminExternalPlaceImportDetails = Record<AdminExternalPlaceImportField, string>

export type AdminExternalPlaceImportInput = {
  discoveryId: string
  selectedTypes: PlaceTypeKey[]
  details: AdminExternalPlaceImportDetails
}

export type AdminExternalPlaceImportDraft = Omit<AdminExternalPlaceImportInput, 'discoveryId'>

export type AdminExternalPlaceImportSubmitResult = {
  error: string | null
  status: string
}

export const ADMIN_EXTERNAL_PLACE_IMPORT_MAX_LENGTH = {
  correctedName: 320,
  verificationPlace: 500,
  phone: 32,
  whatsapp: 32,
  label: 160,
  parentMinistry: 160,
  parentAdministration: 160,
  notes: 2000,
} as const satisfies Record<AdminExternalPlaceImportField, number>

const commonFields = [
  'correctedName',
  'verificationPlace',
  'whatsapp',
  'label',
  'notes',
] as const satisfies readonly AdminExternalPlaceImportField[]

const businessFields = ['phone'] as const satisfies readonly AdminExternalPlaceImportField[]
const publicServiceFields = [
  'parentMinistry',
  'parentAdministration',
] as const satisfies readonly AdminExternalPlaceImportField[]

export const PLACE_TYPE_IMPORT_CONFIG = {
  establishment: [],
  company: businessFields,
  region: publicServiceFields,
  moughataa: publicServiceFields,
  wilaya: publicServiceFields,
  sports_hall: businessFields,
  restaurant: businessFields,
  hall: businessFields,
  administration: publicServiceFields,
  private: businessFields,
  public: publicServiceFields,
} as const satisfies Record<PlaceTypeKey, readonly AdminExternalPlaceImportField[]>

const privatePlaceTypes = new Set<PlaceTypeKey>([
  'company',
  'sports_hall',
  'restaurant',
  'hall',
  'private',
])

const publicServiceTypes = new Set<PlaceTypeKey>([
  'region',
  'moughataa',
  'wilaya',
  'administration',
  'public',
])

export const ADMIN_EXTERNAL_PLACE_IMPORT_FIELD_ORDER = [
  'correctedName',
  'verificationPlace',
  'phone',
  'whatsapp',
  'label',
  'parentMinistry',
  'parentAdministration',
  'notes',
] as const satisfies readonly AdminExternalPlaceImportField[]

export function createAdminExternalPlaceImportDetails(): AdminExternalPlaceImportDetails {
  return {
    correctedName: '',
    verificationPlace: '',
    phone: '',
    whatsapp: '',
    label: '',
    parentMinistry: '',
    parentAdministration: '',
    notes: '',
  }
}

export function toggleAdminExternalPlaceType(
  selectedTypes: PlaceTypeKey[],
  type: PlaceTypeKey,
): PlaceTypeKey[] {
  return selectedTypes.includes(type)
    ? selectedTypes.filter((selectedType) => selectedType !== type)
    : [...selectedTypes, type]
}

export function visibleAdminExternalPlaceImportFields(
  selectedTypes: readonly PlaceTypeKey[],
): AdminExternalPlaceImportField[] {
  const visibleFields = new Set<AdminExternalPlaceImportField>(commonFields)
  selectedTypes.forEach((type) => {
    PLACE_TYPE_IMPORT_CONFIG[type].forEach((field) => visibleFields.add(field))
  })
  return ADMIN_EXTERNAL_PLACE_IMPORT_FIELD_ORDER.filter((field) => visibleFields.has(field))
}

export function validateAdminExternalPlaceImportTypes(selectedTypes: readonly PlaceTypeKey[]) {
  if (selectedTypes.length === 0) return 'types_required' as const
  const hasPrivateType = selectedTypes.some((type) => privatePlaceTypes.has(type))
  const hasPublicType = selectedTypes.some((type) => publicServiceTypes.has(type))
  return hasPrivateType && hasPublicType ? 'conflicting_natures' as const : null
}

export function validateAdminExternalPlaceImportDetails(
  selectedTypes: readonly PlaceTypeKey[],
  details: AdminExternalPlaceImportDetails,
) {
  const visibleFields = new Set(visibleAdminExternalPlaceImportFields(selectedTypes))
  if (visibleFields.has('phone') && details.phone.trim() && !isValidMauritanianPhone(details.phone)) {
    return 'invalid_phone' as const
  }
  if (visibleFields.has('whatsapp') && details.whatsapp.trim() && !isValidMauritanianPhone(details.whatsapp)) {
    return 'invalid_whatsapp' as const
  }
  return null
}

const rpcFieldNames = {
  correctedName: 'corrected_name',
  verificationPlace: 'verification_place',
  phone: 'phone',
  whatsapp: 'whatsapp',
  label: 'label',
  parentMinistry: 'parent_ministry',
  parentAdministration: 'parent_administration',
  notes: 'notes',
} as const satisfies Record<AdminExternalPlaceImportField, string>

type AdminExternalPlaceImportRpcField = (typeof rpcFieldNames)[AdminExternalPlaceImportField]

export type AdminExternalPlaceImportDetailsPayload = Partial<Record<AdminExternalPlaceImportRpcField, string>>

export function toAdminExternalPlaceImportDetailsPayload(
  selectedTypes: readonly PlaceTypeKey[],
  details: AdminExternalPlaceImportDetails,
): AdminExternalPlaceImportDetailsPayload {
  const visibleFields = new Set(visibleAdminExternalPlaceImportFields(selectedTypes))
  const payload: AdminExternalPlaceImportDetailsPayload = {}

  ADMIN_EXTERNAL_PLACE_IMPORT_FIELD_ORDER.forEach((field) => {
    if (!visibleFields.has(field)) return
    const value = details[field].trim()
    if (!value) return
    payload[rpcFieldNames[field]] = field === 'phone' || field === 'whatsapp'
      ? normalizeMauritanianPhone(value)
      : value
  })

  return payload
}

export function toAdminExternalPlaceImportRpcParams(input: AdminExternalPlaceImportInput) {
  const details = toAdminExternalPlaceImportDetailsPayload(input.selectedTypes, input.details)
  const baseParams = {
    p_discovery_id: input.discoveryId,
    p_selected_types: input.selectedTypes,
  }

  if (Object.keys(details).length === 0) return baseParams
  return {
    ...baseParams,
    p_details: details,
  }
}

export function resolvedAdminExternalPlaceName(
  providerDisplayName: string,
  details: Pick<AdminExternalPlaceImportDetails, 'correctedName'>,
) {
  return details.correctedName.trim() || providerDisplayName.trim()
}

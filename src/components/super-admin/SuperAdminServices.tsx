import { lazy, Suspense, useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  Archive,
  Building2,
  CheckCircle2,
  Eye,
  FilePenLine,
  FilterX,
  MapPin,
  Plus,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Store,
} from 'lucide-react'
import { useI18n, type Dictionary } from '../../i18n'
import { formatDate, formatNumber } from '../../lib/format'
import { PLACE_TYPE_KEYS, type PlaceTypeKey } from '../../lib/placeTypes'
import { paginatedResult, type PaginatedResult } from '../../lib/pagination'
import {
  archiveSuperAdminEstablishment,
  createSuperAdminEstablishment,
  getSuperAdminEstablishmentDetails,
  getSuperAdminEstablishmentOptions,
  getSuperAdminEstablishments,
  reactivateSuperAdminEstablishment,
  updateSuperAdminEstablishment,
  type SuperAdminEstablishment,
  type SuperAdminEstablishmentDetails,
  type SuperAdminEstablishmentInput,
  type SuperAdminEstablishmentOptions,
  type SuperAdminEstablishmentSource,
  type SuperAdminEstablishmentStatus,
  type SuperAdminEstablishmentType,
  type SuperAdminFailure,
} from '../../lib/superAdmin'
import { btnGhost, card, cardMuted, field, fieldHint, fieldLabel, pill } from '../../lib/ui'
import { AdminActionButton, AdminEmptyState, AdminModal, AdminSectionHeader } from '../admin/AdminUi'
import { adminCopy } from '../admin/adminCopy'
import type { MapCoordinates } from '../map/MapLocationPicker'
import { InlineAlert, LoadingCard, Skeleton } from '../system/States'
import { PaginationControls } from '../ui/PaginationControls'

const MapLocationPicker = lazy(async () => {
  const module = await import('../map/MapLocationPicker')
  return { default: module.MapLocationPicker }
})

type ServicesCopy = Dictionary['superAdminServices']

type FilterState = {
  search: string
  status: '' | SuperAdminEstablishmentStatus
  placeType: '' | PlaceTypeKey
  establishmentType: '' | SuperAdminEstablishmentType
  verified: '' | 'true' | 'false'
  source: '' | SuperAdminEstablishmentSource
  categoryId: string
}

type Feedback = { tone: 'error' | 'success'; text: string } | null

type DialogState =
  | { kind: 'details'; establishment: SuperAdminEstablishment }
  | { kind: 'add' }
  | { kind: 'edit'; establishment: SuperAdminEstablishmentDetails }
  | { kind: 'transition'; establishment: SuperAdminEstablishment; action: 'archive' | 'reactivate' }
  | null

const STATUS_KEYS: SuperAdminEstablishmentStatus[] = ['draft', 'pending', 'approved', 'rejected', 'suspended']
const ESTABLISHMENT_TYPE_KEYS: SuperAdminEstablishmentType[] = ['private', 'public', 'administrative']
const SOURCE_KEYS: SuperAdminEstablishmentSource[] = ['admin_created', 'client_submission', 'map_discovery', 'unknown']

const EMPTY_FILTERS: FilterState = {
  search: '',
  status: '',
  placeType: '',
  establishmentType: '',
  verified: '',
  source: '',
  categoryId: '',
}

const FALLBACK_OPTIONS: SuperAdminEstablishmentOptions = {
  categories: [],
  establishmentTypes: ESTABLISHMENT_TYPE_KEYS,
  placeTypes: [...PLACE_TYPE_KEYS],
}

function emptyPage(pageSize: 10 | 20): PaginatedResult<SuperAdminEstablishment> {
  return paginatedResult([], 0, { pageSize })
}

function displayName(establishment: SuperAdminEstablishment, locale: 'fr' | 'ar' | 'en') {
  return locale === 'ar' && establishment.nameAr?.trim()
    ? establishment.nameAr.trim()
    : establishment.name.trim()
}

function alternateName(establishment: SuperAdminEstablishment, locale: 'fr' | 'ar' | 'en') {
  if (locale === 'ar' && establishment.nameAr?.trim()) return establishment.name
  return establishment.nameAr?.trim() || null
}

function locationLabel(establishment: SuperAdminEstablishment, fallback: string) {
  const parts = [establishment.location, establishment.wilaya]
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
  return [...new Set(parts)].join(' · ') || fallback
}

function statusTone(status: SuperAdminEstablishmentStatus) {
  if (status === 'approved') return 'bg-answer-bg text-answer'
  if (status === 'suspended' || status === 'rejected') return 'bg-ask-bg text-ask'
  if (status === 'pending') return 'bg-brand-soft text-brand-deep'
  return 'bg-surface-2 text-ink-soft'
}

function StatusBadge({ status, copy }: { status: SuperAdminEstablishmentStatus; copy: ServicesCopy }) {
  return <span className={`${pill} ${statusTone(status)}`}>{copy.statuses[status]}</span>
}

function VerifiedBadge({ verified, copy }: { verified: boolean; copy: ServicesCopy }) {
  return (
    <span className={`${pill} ${verified ? 'bg-answer-bg text-answer' : 'bg-surface-2 text-ink-soft'}`}>
      {verified ? copy.verifiedOnly : copy.unverifiedOnly}
    </span>
  )
}

function TypeBadges({ establishment, copy }: { establishment: SuperAdminEstablishment; copy: ServicesCopy }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className={`${pill} bg-tint-4/60 text-tint-ink-4`}>{copy.scopes[establishment.establishmentType]}</span>
      {establishment.placeTypes.map((type) => (
        <span key={type} className={`${pill} bg-surface-2 text-ink-soft`}>{copy.typeOptions[type]}</span>
      ))}
    </div>
  )
}

function FailureAlert({ failure, copy, onRetry }: { failure: SuperAdminFailure; copy: ServicesCopy; onRetry: () => void }) {
  const title = failure === 'not-connected'
    ? copy.moduleNotConnected
    : failure === 'access-denied'
      ? copy.accessDenied
      : copy.serverError
  const text = failure === 'not-connected'
    ? copy.migrationHint
    : failure === 'access-denied'
      ? copy.loadError
      : `${copy.loadError} ${copy.loadErrorHint}`

  return (
    <InlineAlert
      tone="error"
      title={title}
      action={<button type="button" className={btnGhost} onClick={onRetry}>{copy.retry}</button>}
    >
      {text}
    </InlineAlert>
  )
}

function EstablishmentIdentity({ establishment }: { establishment: SuperAdminEstablishment }) {
  const { locale } = useI18n()
  const secondary = alternateName(establishment, locale)

  return (
    <div className="min-w-0">
      <p dir="auto" className="break-words text-sm font-bold text-ink">{displayName(establishment, locale)}</p>
      {secondary && <p dir="auto" className="mt-0.5 break-words text-xs text-muted">{secondary}</p>}
      <p className="mt-1 break-words text-xs text-muted">{establishment.categoryName ?? '—'}</p>
    </div>
  )
}

function EstablishmentActions({
  establishment,
  copy,
  disabled,
  compact = false,
  onDetails,
  onEdit,
  onTransition,
}: {
  establishment: SuperAdminEstablishment
  copy: ServicesCopy
  disabled: boolean
  compact?: boolean
  onDetails: () => void
  onEdit: () => void
  onTransition: (action: 'archive' | 'reactivate') => void
}) {
  const transition = establishment.status === 'approved'
    ? { action: 'archive' as const, icon: Archive, label: copy.archive, tone: 'danger' as const }
    : establishment.status === 'suspended'
      ? { action: 'reactivate' as const, icon: RotateCcw, label: copy.reactivate, tone: 'success' as const }
      : null

  return (
    <div className={`flex flex-wrap gap-2 ${compact ? 'justify-end' : ''}`}>
      <AdminActionButton icon={Eye} label={copy.details} iconOnly={compact} disabled={disabled} onClick={onDetails} />
      <AdminActionButton icon={FilePenLine} label={copy.edit} iconOnly={compact} disabled={disabled} onClick={onEdit} />
      {transition && (
        <AdminActionButton
          icon={transition.icon}
          label={transition.label}
          iconOnly={compact}
          tone={transition.tone}
          disabled={disabled}
          onClick={() => onTransition(transition.action)}
        />
      )}
    </div>
  )
}

function MobileEstablishmentCard({
  establishment,
  copy,
  disabled,
  onDetails,
  onEdit,
  onTransition,
}: {
  establishment: SuperAdminEstablishment
  copy: ServicesCopy
  disabled: boolean
  onDetails: () => void
  onEdit: () => void
  onTransition: (action: 'archive' | 'reactivate') => void
}) {
  const { locale } = useI18n()
  const contact = establishment.phone ?? establishment.whatsapp ?? copy.noContact
  const location = locationLabel(establishment, copy.noLocation)

  return (
    <li className={`${cardMuted} min-w-0 p-4`}>
      <div className="flex items-start justify-between gap-3">
        <EstablishmentIdentity establishment={establishment} />
        <StatusBadge status={establishment.status} copy={copy} />
      </div>
      <div className="mt-3"><TypeBadges establishment={establishment} copy={copy} /></div>
      <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-muted">{copy.contact}</dt>
          <dd className="ltr-isolate mt-1 break-words font-semibold text-ink">{contact}</dd>
        </div>
        <div>
          <dt className="text-muted">{copy.location}</dt>
          <dd dir="auto" className="mt-1 break-words font-semibold text-ink">{location}</dd>
        </div>
        <div>
          <dt className="text-muted">{copy.branches}</dt>
          <dd className="tabular mt-1 font-semibold text-ink">{formatNumber(establishment.branchCount, locale)}</dd>
        </div>
        <div>
          <dt className="text-muted">{copy.source}</dt>
          <dd className="mt-1 font-semibold text-ink">{copy.sources[establishment.source]}</dd>
        </div>
      </dl>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
        <VerifiedBadge verified={establishment.isVerified} copy={copy} />
        <time className="text-xs text-muted" dateTime={establishment.createdAt}>{formatDate(establishment.createdAt, locale)}</time>
      </div>
      <div className="mt-4">
        <EstablishmentActions establishment={establishment} copy={copy} disabled={disabled} onDetails={onDetails} onEdit={onEdit} onTransition={onTransition} />
      </div>
    </li>
  )
}

function EstablishmentsTable({
  establishments,
  copy,
  busyId,
  onDetails,
  onEdit,
  onTransition,
}: {
  establishments: SuperAdminEstablishment[]
  copy: ServicesCopy
  busyId: string | null
  onDetails: (establishment: SuperAdminEstablishment) => void
  onEdit: (establishment: SuperAdminEstablishment) => void
  onTransition: (establishment: SuperAdminEstablishment, action: 'archive' | 'reactivate') => void
}) {
  const { locale } = useI18n()

  return (
    <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface xl:block">
      <table className="w-full table-fixed border-collapse">
        <thead className="border-b border-line bg-page-alt text-[11px] font-bold tracking-[0.08em] text-muted uppercase rtl:tracking-normal rtl:normal-case">
          <tr>
            <th className="w-[20%] px-3 py-2 text-start">{copy.name}</th>
            <th className="w-[19%] px-3 py-2 text-start">{copy.types}</th>
            <th className="w-[18%] px-3 py-2 text-start">{copy.contact}</th>
            <th className="w-[16%] px-3 py-2 text-start">{copy.status}</th>
            <th className="w-[12%] px-3 py-2 text-start">{copy.branches}</th>
            <th className="w-[15%] px-3 py-2 text-end">{copy.actions}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {establishments.map((establishment) => {
            const location = locationLabel(establishment, copy.noLocation)
            return (
              <tr key={establishment.id} className="transition-colors hover:bg-surface-2/60 focus-within:bg-surface-2">
                <td className="px-3 py-3 align-top"><EstablishmentIdentity establishment={establishment} /></td>
                <td className="px-3 py-3 align-top"><TypeBadges establishment={establishment} copy={copy} /></td>
                <td className="px-3 py-3 align-top text-xs">
                  <p className="ltr-isolate break-words font-semibold text-ink">{establishment.phone ?? establishment.whatsapp ?? copy.noContact}</p>
                  <p dir="auto" className="mt-1 break-words text-muted">{location}</p>
                </td>
                <td className="px-3 py-3 align-top">
                  <div className="flex flex-wrap gap-1.5"><StatusBadge status={establishment.status} copy={copy} /><VerifiedBadge verified={establishment.isVerified} copy={copy} /></div>
                  <p className="mt-2 text-xs text-muted">{copy.sources[establishment.source]}</p>
                </td>
                <td className="px-3 py-3 align-top text-xs">
                  <p className="tabular font-bold text-ink">{formatNumber(establishment.branchCount, locale)}</p>
                  <time className="mt-1 block text-muted" dateTime={establishment.createdAt}>{formatDate(establishment.createdAt, locale)}</time>
                </td>
                <td className="px-3 py-3 align-top">
                  <EstablishmentActions
                    establishment={establishment}
                    copy={copy}
                    compact
                    disabled={busyId !== null}
                    onDetails={() => onDetails(establishment)}
                    onEdit={() => onEdit(establishment)}
                    onTransition={(action) => onTransition(establishment, action)}
                  />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DetailValue({ label, children, ltr = false }: { label: string; children: ReactNode; ltr?: boolean }) {
  return (
    <div className="min-w-0 bg-surface px-3 py-3.5">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd dir={ltr ? 'ltr' : 'auto'} className={`mt-1.5 break-words text-sm font-semibold text-ink ${ltr ? 'ltr-isolate' : ''}`}>{children}</dd>
    </div>
  )
}

function EstablishmentDetailsModal({
  details,
  loading,
  failure,
  copy,
  onClose,
  onRetry,
}: {
  details: SuperAdminEstablishmentDetails | null
  loading: boolean
  failure: SuperAdminFailure | null
  copy: ServicesCopy
  onClose: () => void
  onRetry: () => void
}) {
  const { locale } = useI18n()

  return (
    <AdminModal title={copy.detailsTitle} subtitle={copy.detailsSubtitle} closeLabel={copy.close} onClose={onClose} size="lg">
      <div className="mt-5 space-y-4">
        {loading && <LoadingCard label={copy.detailsLoading} lines={5} />}
        {!loading && failure && <FailureAlert failure={failure} copy={copy} onRetry={onRetry} />}
        {!loading && !failure && details && (
          <>
            <section className={`${cardMuted} overflow-hidden`}>
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line p-4">
                <div className="min-w-0">
                  <h3 dir="auto" className="break-words text-lg font-bold text-ink">{displayName(details, locale)}</h3>
                  {alternateName(details, locale) && <p dir="auto" className="mt-1 break-words text-sm text-muted">{alternateName(details, locale)}</p>}
                </div>
                <div className="flex flex-wrap gap-2"><StatusBadge status={details.status} copy={copy} /><VerifiedBadge verified={details.isVerified} copy={copy} /></div>
              </div>
              <dl className="grid gap-px bg-line sm:grid-cols-2">
                <DetailValue label={copy.category}>{details.categoryName ?? copy.noCategory}</DetailValue>
                <DetailValue label={copy.scope}>{copy.scopes[details.establishmentType]}</DetailValue>
                <DetailValue label={copy.phone} ltr>{details.phone ?? copy.noContact}</DetailValue>
                <DetailValue label={copy.whatsapp} ltr>{details.whatsapp ?? copy.noContact}</DetailValue>
                <DetailValue label={copy.location}>{details.location ?? copy.noLocation}</DetailValue>
                <DetailValue label={copy.wilaya}>{details.wilaya ?? copy.noLocation}</DetailValue>
                <DetailValue label={copy.source}>{copy.sources[details.source]}</DetailValue>
                <DetailValue label={copy.branches}>{formatNumber(details.branchCount, locale)}</DetailValue>
                <DetailValue label={copy.createdAt}>{formatDate(details.createdAt, locale)}</DetailValue>
                <DetailValue label={copy.updatedAt}>{formatDate(details.updatedAt, locale)}</DetailValue>
                <DetailValue label={copy.openingDate}>{details.openingDate ? formatDate(details.openingDate, locale) : '—'}</DetailValue>
                <DetailValue label={copy.closingDate}>{details.closingDate ? formatDate(details.closingDate, locale) : '—'}</DetailValue>
                <DetailValue label={copy.website} ltr>{details.website ?? '—'}</DetailValue>
                <DetailValue label={copy.imageUrl} ltr>{details.imageUrl ?? '—'}</DetailValue>
              </dl>
              {details.description && <p dir="auto" className="border-t border-line p-4 text-sm leading-6 text-ink-soft">{details.description}</p>}
              <div className="border-t border-line p-4"><TypeBadges establishment={details} copy={copy} /></div>
            </section>

            <section>
              <h3 className="text-sm font-bold text-ink">{copy.branches}</h3>
              {details.branchCount > details.branches.length && (
                <p className="mt-1 text-xs leading-5 text-muted">
                  {copy.branchPreview
                    .replace('{shown}', formatNumber(details.branches.length, locale))
                    .replace('{total}', formatNumber(details.branchCount, locale))}
                </p>
              )}
              {details.branches.length === 0 ? (
                <div className={`${cardMuted} mt-3 p-4 text-sm text-muted`}>{copy.noBranches}</div>
              ) : (
                <ul className="mt-3 grid list-none gap-3 sm:grid-cols-2">
                  {details.branches.map((branch) => (
                    <li key={branch.id} className={`${cardMuted} min-w-0 p-4`}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p dir="auto" className="break-words text-sm font-bold text-ink">{branch.name}</p>
                        {branch.isMain && <span className={`${pill} bg-brand-soft text-brand-deep`}>{copy.mainBranch}</span>}
                      </div>
                      <dl className="mt-3 grid gap-2 text-xs">
                        <div><dt className="text-muted">{copy.location}</dt><dd dir="auto" className="mt-0.5 break-words text-ink-soft">{branch.address ?? copy.noLocation}</dd></div>
                        <div><dt className="text-muted">{copy.wilaya}</dt><dd dir="auto" className="mt-0.5 break-words text-ink-soft">{branch.wilaya ?? copy.noLocation}</dd></div>
                        <div><dt className="text-muted">{copy.contact}</dt><dd className="ltr-isolate mt-0.5 break-words text-ink-soft">{branch.phone ?? branch.whatsapp ?? copy.noContact}</dd></div>
                        <div><dt className="text-muted">{copy.coordinates}</dt><dd className="ltr-isolate mt-0.5 text-ink-soft">{branch.latitude !== null && branch.longitude !== null ? `${branch.latitude.toFixed(5)}, ${branch.longitude.toFixed(5)}` : '—'}</dd></div>
                      </dl>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
        {!loading && !failure && !details && (
          <InlineAlert tone="error" title={copy.detailsError}>{copy.loadErrorHint}</InlineAlert>
        )}
        <div className="flex justify-end border-t border-line pt-4">
          <button type="button" className={btnGhost} onClick={onClose}>{copy.close}</button>
        </div>
      </div>
    </AdminModal>
  )
}

type FormState = {
  name: string
  nameAr: string
  categoryId: string
  establishmentType: SuperAdminEstablishmentType
  placeTypes: PlaceTypeKey[]
  description: string
  phone: string
  whatsapp: string
  website: string
  imageUrl: string
  isVerified: boolean
  openingDate: string
  closingDate: string
  branchName: string
  location: string
  wilaya: string
  neighborhood: string
  coordinates: MapCoordinates | null
}

function dateInputValue(value: string | null | undefined) {
  return value?.slice(0, 10) ?? ''
}

function formState(details?: SuperAdminEstablishmentDetails): FormState {
  const mainBranch = details?.branches.find((branch) => branch.isMain) ?? details?.branches[0]
  const coordinates = mainBranch?.latitude !== null
    && mainBranch?.latitude !== undefined
    && mainBranch?.longitude !== null
    && mainBranch?.longitude !== undefined
    ? { latitude: mainBranch.latitude, longitude: mainBranch.longitude }
    : null

  return {
    name: details?.name ?? '',
    nameAr: details?.nameAr ?? '',
    categoryId: details?.categoryId ?? '',
    establishmentType: details?.establishmentType ?? 'private',
    placeTypes: details?.placeTypes ?? ['establishment'],
    description: details?.description ?? '',
    phone: details?.phone ?? '',
    whatsapp: details?.whatsapp ?? '',
    website: details?.website ?? '',
    imageUrl: details?.imageUrl ?? '',
    isVerified: details?.isVerified ?? false,
    openingDate: dateInputValue(details?.openingDate),
    closingDate: dateInputValue(details?.closingDate),
    branchName: mainBranch?.name ?? details?.name ?? '',
    location: mainBranch?.address ?? details?.location ?? '',
    wilaya: mainBranch?.wilaya ?? details?.wilaya ?? '',
    neighborhood: mainBranch?.neighborhood ?? '',
    coordinates,
  }
}

function trimmed(value: string) {
  return value.trim() || null
}

function inputFromForm(state: FormState): SuperAdminEstablishmentInput {
  return {
    name: state.name.trim(),
    nameAr: trimmed(state.nameAr),
    categoryId: state.categoryId || null,
    establishmentType: state.establishmentType,
    placeTypes: state.placeTypes,
    description: trimmed(state.description),
    phone: trimmed(state.phone),
    whatsapp: trimmed(state.whatsapp),
    website: trimmed(state.website),
    imageUrl: trimmed(state.imageUrl),
    isVerified: state.isVerified,
    openingDate: state.openingDate || null,
    closingDate: state.closingDate || null,
    branchName: trimmed(state.branchName),
    location: trimmed(state.location),
    wilaya: trimmed(state.wilaya),
    neighborhood: trimmed(state.neighborhood),
    latitude: state.coordinates?.latitude ?? null,
    longitude: state.coordinates?.longitude ?? null,
  }
}

function FormField({
  id,
  label,
  value,
  onChange,
  disabled,
  dir = 'auto',
  type = 'text',
  required = false,
  error,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
  dir?: 'auto' | 'ltr' | 'rtl'
  type?: 'text' | 'tel' | 'url' | 'date'
  required?: boolean
  error?: string
}) {
  const errorId = `${id}-error`
  return (
    <div>
      <label htmlFor={id} className={fieldLabel}>{label}{required && <span className="text-ask" aria-hidden> *</span>}</label>
      <input
        id={id}
        type={type}
        dir={dir}
        value={value}
        required={required}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={`${field} ${error ? 'border-ask focus:border-ask focus:ring-ask/15' : ''}`}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && <p id={errorId} className="mt-1.5 text-xs font-medium text-ask">{error}</p>}
    </div>
  )
}

function EstablishmentFormModal({
  details,
  options,
  copy,
  saving,
  submitError,
  onClose,
  onSave,
}: {
  details?: SuperAdminEstablishmentDetails
  options: SuperAdminEstablishmentOptions
  copy: ServicesCopy
  saving: boolean
  submitError: string | null
  onClose: () => void
  onSave: (input: SuperAdminEstablishmentInput) => void
}) {
  const { locale } = useI18n()
  const copyMap = adminCopy[locale].establishmentForm
  const fieldPrefix = useId()
  const [state, setState] = useState<FormState>(() => formState(details))
  const [errors, setErrors] = useState<{ name?: string; placeTypes?: string }>({})
  const title = details ? copy.editTitle : copy.addTitle
  const subtitle = details ? copy.editSubtitle : copy.addSubtitle

  const update = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setState((current) => ({ ...current, [key]: value }))
    if (key === 'name' || key === 'placeTypes') {
      setErrors((current) => ({ ...current, [key]: undefined }))
    }
  }

  const toggleType = (type: PlaceTypeKey) => {
    const next = state.placeTypes.includes(type)
      ? state.placeTypes.filter((value) => value !== type)
      : [...state.placeTypes, type]
    update('placeTypes', next)
  }

  const submit = () => {
    const nextErrors = {
      name: state.name.trim() ? undefined : copy.nameRequired,
      placeTypes: state.placeTypes.length ? undefined : copy.typeRequired,
    }
    setErrors(nextErrors)
    if (nextErrors.name || nextErrors.placeTypes) return
    onSave(inputFromForm(state))
  }

  const id = (name: string) => `${fieldPrefix}-${name}`

  return (
    <AdminModal title={title} subtitle={subtitle} closeLabel={copy.close} onClose={onClose} size="lg">
      <form
        className="mt-5 space-y-5"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
      >
        <fieldset className={`${cardMuted} p-4`} disabled={saving}>
          <legend className="px-1 text-sm font-bold text-ink">{copy.name}</legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <FormField id={id('name')} label={copy.name} value={state.name} required error={errors.name} disabled={saving} onChange={(value) => update('name', value)} />
            <FormField id={id('name-ar')} label={copy.nameAr} value={state.nameAr} disabled={saving} onChange={(value) => update('nameAr', value)} />
            <div>
              <label htmlFor={id('scope')} className={fieldLabel}>{copy.scope}</label>
              <select id={id('scope')} className={field} value={state.establishmentType} disabled={saving} onChange={(event) => update('establishmentType', event.target.value as SuperAdminEstablishmentType)}>
                {options.establishmentTypes.map((type) => <option key={type} value={type}>{copy.scopes[type]}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor={id('category')} className={fieldLabel}>{copy.category}</label>
              <select id={id('category')} className={field} value={state.categoryId} disabled={saving} onChange={(event) => update('categoryId', event.target.value)}>
                <option value="">{copy.noCategory}</option>
                {options.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
            </div>
          </div>
        </fieldset>

        <fieldset className={`${cardMuted} p-4`} disabled={saving}>
          <legend className="px-1 text-sm font-bold text-ink">{copy.types}<span className="text-ask" aria-hidden> *</span></legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {options.placeTypes.map((type) => (
              <label key={type} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink has-[:checked]:border-brand-deep has-[:checked]:bg-brand-soft">
                <input type="checkbox" value={type} checked={state.placeTypes.includes(type)} onChange={() => toggleType(type)} />
                <span>{copy.typeOptions[type]}</span>
              </label>
            ))}
          </div>
          {errors.placeTypes && <p className="mt-2 text-xs font-medium text-ask">{errors.placeTypes}</p>}
          <p className={fieldHint}>{copy.placeTypesHelp}</p>
        </fieldset>

        <fieldset className={`${cardMuted} p-4`} disabled={saving}>
          <legend className="px-1 text-sm font-bold text-ink">{copy.contact}</legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <FormField id={id('phone')} label={copy.phone} value={state.phone} type="tel" dir="ltr" disabled={saving} onChange={(value) => update('phone', value)} />
            <FormField id={id('whatsapp')} label={copy.whatsapp} value={state.whatsapp} type="tel" dir="ltr" disabled={saving} onChange={(value) => update('whatsapp', value)} />
            <FormField id={id('website')} label={copy.website} value={state.website} type="url" dir="ltr" disabled={saving} onChange={(value) => update('website', value)} />
            <FormField id={id('image')} label={copy.imageUrl} value={state.imageUrl} type="url" dir="ltr" disabled={saving} onChange={(value) => update('imageUrl', value)} />
            <div className="sm:col-span-2">
              <label htmlFor={id('description')} className={fieldLabel}>{copy.description}</label>
              <textarea id={id('description')} value={state.description} disabled={saving} rows={3} className={`${field} h-auto min-h-24 py-3`} onChange={(event) => update('description', event.target.value)} />
            </div>
            <FormField id={id('opening-date')} label={copy.openingDate} value={state.openingDate} type="date" disabled={saving} onChange={(value) => update('openingDate', value)} />
            <FormField id={id('closing-date')} label={copy.closingDate} value={state.closingDate} type="date" disabled={saving} onChange={(value) => update('closingDate', value)} />
          </div>
          <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface px-3 py-2.5 text-sm text-ink">
            <input type="checkbox" className="mt-1" checked={state.isVerified} disabled={saving} onChange={(event) => update('isVerified', event.target.checked)} />
            <span><strong className="block font-semibold">{copy.verified}</strong><span className="mt-0.5 block text-xs leading-5 text-muted">{copy.verifiedHelp}</span></span>
          </label>
        </fieldset>

        <fieldset className={`${cardMuted} p-4`} disabled={saving}>
          <legend className="px-1 text-sm font-bold text-ink">{copy.mainBranch}</legend>
          <div className="mt-2 grid gap-4 sm:grid-cols-2">
            <FormField id={id('branch-name')} label={copy.branchName} value={state.branchName} disabled={saving} onChange={(value) => update('branchName', value)} />
            <FormField id={id('location')} label={copy.location} value={state.location} disabled={saving} onChange={(value) => update('location', value)} />
            <FormField id={id('wilaya')} label={copy.wilaya} value={state.wilaya} disabled={saving} onChange={(value) => update('wilaya', value)} />
            <FormField id={id('neighborhood')} label={copy.neighborhood} value={state.neighborhood} disabled={saving} onChange={(value) => update('neighborhood', value)} />
          </div>
          <div className="mt-5 border-t border-line pt-4">
            <Suspense fallback={<LoadingCard label={copyMap.mapLoading} lines={3} />}>
              <MapLocationPicker copy={copyMap} value={state.coordinates} onChange={(coordinates) => update('coordinates', coordinates)} />
            </Suspense>
          </div>
        </fieldset>

        {submitError && <InlineAlert tone="error" title={copy.actionError}>{submitError}</InlineAlert>}
        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <button type="button" className={btnGhost} disabled={saving} onClick={onClose}>{copy.cancel}</button>
          <AdminActionButton icon={details ? FilePenLine : Plus} label={saving ? copy.saving : copy.save} type="submit" tone="primary" disabled={saving} className="justify-center" />
        </div>
      </form>
    </AdminModal>
  )
}

function TransitionModal({
  establishment,
  action,
  copy,
  saving,
  error,
  onClose,
  onConfirm,
}: {
  establishment: SuperAdminEstablishment
  action: 'archive' | 'reactivate'
  copy: ServicesCopy
  saving: boolean
  error: string | null
  onClose: () => void
  onConfirm: () => void
}) {
  const { locale } = useI18n()
  const isArchive = action === 'archive'
  const name = displayName(establishment, locale)

  return (
    <AdminModal
      title={`${isArchive ? copy.archiveTitle : copy.reactivateTitle} — ${name}`}
      closeLabel={copy.close}
      onClose={onClose}
    >
      <div className="mt-5 space-y-4">
        <div className={`rounded-xl border p-4 ${isArchive ? 'border-ask/30 bg-ask-bg text-ask' : 'border-answer/30 bg-answer-bg text-answer'}`}>
          <p dir="auto" className="font-bold">{name}</p>
          <p className="mt-2 text-sm leading-6">{isArchive ? copy.archiveText : copy.reactivateText}</p>
        </div>
        {error && <InlineAlert tone="error" title={copy.actionError}>{error}</InlineAlert>}
        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <button type="button" className={btnGhost} disabled={saving} onClick={onClose}>{copy.cancel}</button>
          <AdminActionButton
            icon={isArchive ? Archive : RotateCcw}
            label={saving ? copy.saving : isArchive ? copy.archive : copy.reactivate}
            tone={isArchive ? 'danger' : 'success'}
            disabled={saving}
            className="justify-center"
            onClick={onConfirm}
          />
        </div>
      </div>
    </AdminModal>
  )
}

function FilterSelect({
  id,
  label,
  value,
  disabled,
  onChange,
  children,
}: {
  id: string
  label: string
  value: string
  disabled: boolean
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <div>
      <label htmlFor={id} className={`${fieldLabel} mb-1.5 text-xs`}>{label}</label>
      <select id={id} value={value} disabled={disabled} className={`${field} h-11 text-sm`} onChange={(event) => onChange(event.target.value)}>
        {children}
      </select>
    </div>
  )
}

export function SuperAdminServices() {
  const { locale, t } = useI18n()
  const copy = t.superAdminServices
  const filterId = useId()
  const requestId = useRef(0)
  const detailsRequestId = useRef(0)
  const editRequestId = useRef(0)
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS)
  const [searchDraft, setSearchDraft] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<10 | 20>(10)
  const [establishments, setEstablishments] = useState<PaginatedResult<SuperAdminEstablishment>>(() => emptyPage(10))
  const [options, setOptions] = useState<SuperAdminEstablishmentOptions>(FALLBACK_OPTIONS)
  const [loading, setLoading] = useState(true)
  const [failure, setFailure] = useState<SuperAdminFailure | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [dialog, setDialog] = useState<DialogState>(null)
  const [details, setDetails] = useState<SuperAdminEstablishmentDetails | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsFailure, setDetailsFailure] = useState<SuperAdminFailure | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const loadOptions = useCallback(async () => {
    const result = await getSuperAdminEstablishmentOptions()
    if (!result.error && result.data) setOptions(result.data)
  }, [])

  const loadEstablishments = useCallback(async () => {
    const currentRequest = ++requestId.current
    setLoading(true)
    setFailure(null)
    const result = await getSuperAdminEstablishments({
      page,
      pageSize,
      search: filters.search || undefined,
      status: filters.status || undefined,
      placeType: filters.placeType || undefined,
      establishmentType: filters.establishmentType || undefined,
      verified: filters.verified === '' ? undefined : filters.verified === 'true',
      source: filters.source || undefined,
      categoryId: filters.categoryId || undefined,
    })
    if (currentRequest !== requestId.current) return
    const lastPage = Math.max(1, result.data.totalPages)
    if (page > lastPage) {
      setPage(lastPage)
      return
    }
    setEstablishments(result.data)
    setFailure(result.error)
    setLoading(false)
  }, [filters, page, pageSize])

  useEffect(() => { void loadOptions() }, [loadOptions])
  useEffect(() => { void loadEstablishments() }, [loadEstablishments])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const search = searchDraft.trim().slice(0, 120)
      setFilters((current) => current.search === search ? current : { ...current, search })
      setPage(1)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [searchDraft])

  const activeFilterCount = useMemo(
    () => Object.entries(filters).filter(([key, value]) => key !== 'search' && value !== '').length + (filters.search ? 1 : 0),
    [filters],
  )

  const setFilter = <Key extends keyof FilterState>(key: Key, value: FilterState[Key]) => {
    setPage(1)
    setFilters((current) => ({ ...current, [key]: value }))
  }

  const clearFilters = () => {
    setSearchDraft('')
    setFilters(EMPTY_FILTERS)
    setPage(1)
  }

  const loadDetails = useCallback(async (establishment: SuperAdminEstablishment) => {
    const currentRequest = ++detailsRequestId.current
    setDetailsLoading(true)
    setDetailsFailure(null)
    setDetails(null)
    const result = await getSuperAdminEstablishmentDetails(establishment.id)
    if (currentRequest !== detailsRequestId.current) return
    setDetails(result.data)
    setDetailsFailure(result.error)
    setDetailsLoading(false)
  }, [])

  const openDetails = (establishment: SuperAdminEstablishment) => {
    editRequestId.current += 1
    setBusyId(null)
    setActionError(null)
    setDialog({ kind: 'details', establishment })
    void loadDetails(establishment)
  }

  const openEdit = async (establishment: SuperAdminEstablishment) => {
    detailsRequestId.current += 1
    const currentRequest = ++editRequestId.current
    setBusyId(establishment.id)
    setFeedback(null)
    const result = await getSuperAdminEstablishmentDetails(establishment.id)
    if (currentRequest !== editRequestId.current) return
    setBusyId(null)
    if (result.error || !result.data) {
      setFeedback({ tone: 'error', text: copy.detailsError })
      return
    }
    setActionError(null)
    setDialog({ kind: 'edit', establishment: result.data })
  }

  const closeDialog = () => {
    detailsRequestId.current += 1
    editRequestId.current += 1
    setBusyId(null)
    setDetails(null)
    setDetailsFailure(null)
    setDialog(null)
  }

  const openAdd = () => {
    detailsRequestId.current += 1
    editRequestId.current += 1
    setBusyId(null)
    setActionError(null)
    setDialog({ kind: 'add' })
  }

  const openTransition = (establishment: SuperAdminEstablishment, action: 'archive' | 'reactivate') => {
    if (action === 'archive' && establishment.status !== 'approved') return
    if (action === 'reactivate' && establishment.status !== 'suspended') return
    detailsRequestId.current += 1
    editRequestId.current += 1
    setBusyId(null)
    setActionError(null)
    setDialog({ kind: 'transition', establishment, action })
  }

  const saveForm = async (input: SuperAdminEstablishmentInput) => {
    const editing = dialog?.kind === 'edit' ? dialog.establishment : null
    setSaving(true)
    setActionError(null)
    const result = editing
      ? await updateSuperAdminEstablishment(editing.id, input)
      : await createSuperAdminEstablishment(input)
    setSaving(false)

    if (result.error || !result.data?.ok) {
      setActionError(copy.actionError)
      return
    }

    setDialog(null)
    setFeedback({ tone: 'success', text: editing ? copy.updateSuccess : copy.createSuccess })
    void loadEstablishments()
    void loadOptions()
  }

  const saveTransition = async () => {
    if (dialog?.kind !== 'transition') return
    const { establishment, action } = dialog
    if (action === 'archive' && establishment.status !== 'approved') return
    if (action === 'reactivate' && establishment.status !== 'suspended') return

    setSaving(true)
    setBusyId(establishment.id)
    setActionError(null)
    const result = action === 'archive'
      ? await archiveSuperAdminEstablishment(establishment.id)
      : await reactivateSuperAdminEstablishment(establishment.id)
    setSaving(false)
    setBusyId(null)

    if (result.error || !result.data?.ok) {
      setActionError(copy.actionError)
      return
    }

    setDialog(null)
    setFeedback({ tone: 'success', text: action === 'archive' ? copy.archiveSuccess : copy.reactivateSuccess })
    void loadEstablishments()
  }

  const listContent = loading ? (
    <div className="grid gap-3" role="status" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className={`${cardMuted} p-4`}>
          <Skeleton className="h-4 w-2/5" />
          <Skeleton className="mt-3 h-3 w-3/5" />
          <Skeleton className="mt-4 h-11 w-full" />
        </div>
      ))}
      <span className="sr-only">{copy.loading}</span>
    </div>
  ) : establishments.data.length === 0 ? (
    <AdminEmptyState icon={Store} title={copy.emptyTitle} text={copy.emptyText} />
  ) : (
    <>
      <ul className="grid list-none gap-3 xl:hidden">
        {establishments.data.map((establishment) => (
          <MobileEstablishmentCard
            key={establishment.id}
            establishment={establishment}
            copy={copy}
            disabled={busyId !== null}
            onDetails={() => openDetails(establishment)}
            onEdit={() => void openEdit(establishment)}
            onTransition={(action) => openTransition(establishment, action)}
          />
        ))}
      </ul>
      <EstablishmentsTable
        establishments={establishments.data}
        copy={copy}
        busyId={busyId}
        onDetails={openDetails}
        onEdit={(establishment) => void openEdit(establishment)}
        onTransition={openTransition}
      />
    </>
  )

  return (
    <div className="space-y-5">
      <header className={`${card} border-brand/45 p-5 sm:p-6`}>
        <AdminSectionHeader
          icon={Building2}
          title={copy.title}
          text={copy.subtitle}
          actions={<AdminActionButton icon={Plus} label={copy.add} tone="primary" disabled={loading || failure !== null || busyId !== null} onClick={openAdd} />}
        />
      </header>

      {feedback && <InlineAlert tone={feedback.tone} title={feedback.text} />}
      {failure && <FailureAlert failure={failure} copy={copy} onRetry={() => { void loadEstablishments(); void loadOptions() }} />}

      <section className={`${card} p-4 sm:p-5`} aria-labelledby={`${filterId}-title`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 id={`${filterId}-title`} className="flex items-center gap-2 text-sm font-bold text-ink">
            <SlidersHorizontal size={17} aria-hidden />
            {copy.filters}
            {activeFilterCount > 0 && <span className={`${pill} bg-brand-soft text-brand-deep`}>{formatNumber(activeFilterCount, locale)}</span>}
          </h3>
          {activeFilterCount > 0 && <AdminActionButton icon={FilterX} label={copy.clearFilters} onClick={clearFilters} />}
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <div className="sm:col-span-2">
            <label htmlFor={`${filterId}-search`} className={`${fieldLabel} mb-1.5 text-xs`}>{copy.searchLabel}</label>
            <div className="relative">
              <Search size={17} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
              <input id={`${filterId}-search`} type="search" value={searchDraft} placeholder={copy.searchPlaceholder} className={`${field} h-11 ps-10 text-sm`} onChange={(event) => setSearchDraft(event.target.value)} />
            </div>
          </div>
          <FilterSelect id={`${filterId}-status`} label={copy.statusFilter} value={filters.status} disabled={loading} onChange={(value) => setFilter('status', value as FilterState['status'])}>
            <option value="">{copy.allStatuses}</option>
            {STATUS_KEYS.map((status) => <option key={status} value={status}>{copy.statuses[status]}</option>)}
          </FilterSelect>
          <FilterSelect id={`${filterId}-type`} label={copy.typeFilter} value={filters.placeType} disabled={loading} onChange={(value) => setFilter('placeType', value as FilterState['placeType'])}>
            <option value="">{copy.allTypes}</option>
            {options.placeTypes.map((type) => <option key={type} value={type}>{copy.typeOptions[type]}</option>)}
          </FilterSelect>
          <FilterSelect id={`${filterId}-scope`} label={copy.scopeFilter} value={filters.establishmentType} disabled={loading} onChange={(value) => setFilter('establishmentType', value as FilterState['establishmentType'])}>
            <option value="">{copy.allScopes}</option>
            {options.establishmentTypes.map((type) => <option key={type} value={type}>{copy.scopes[type]}</option>)}
          </FilterSelect>
          <FilterSelect id={`${filterId}-verified`} label={copy.verifiedFilter} value={filters.verified} disabled={loading} onChange={(value) => setFilter('verified', value as FilterState['verified'])}>
            <option value="">{copy.allVerification}</option>
            <option value="true">{copy.verifiedOnly}</option>
            <option value="false">{copy.unverifiedOnly}</option>
          </FilterSelect>
          <FilterSelect id={`${filterId}-source`} label={copy.sourceFilter} value={filters.source} disabled={loading} onChange={(value) => setFilter('source', value as FilterState['source'])}>
            <option value="">{copy.allSources}</option>
            {SOURCE_KEYS.map((source) => <option key={source} value={source}>{copy.sources[source]}</option>)}
          </FilterSelect>
          <FilterSelect id={`${filterId}-category`} label={copy.categoryFilter} value={filters.categoryId} disabled={loading} onChange={(value) => setFilter('categoryId', value)}>
            <option value="">{copy.allCategories}</option>
            {options.categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </FilterSelect>
        </div>
      </section>

      <section className={`${card} min-w-0 p-3 sm:p-4`} aria-live="polite">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3 px-1">
          <p className="text-sm font-semibold text-ink-soft">{copy.resultCount.replace('{count}', formatNumber(establishments.totalCount, locale))}</p>
          <div className="min-w-40">
            <label htmlFor={`${filterId}-page-size`} className={`${fieldLabel} mb-1 text-xs`}>{copy.pageSize}</label>
            <select
              id={`${filterId}-page-size`}
              value={pageSize}
              disabled={loading}
              className={`${field} h-10 text-sm`}
              onChange={(event) => {
                setPageSize(Number(event.target.value) as 10 | 20)
                setPage(1)
              }}
            >
              <option value={10}>{copy.pageSize10}</option>
              <option value={20}>{copy.pageSize20}</option>
            </select>
          </div>
        </div>
        {listContent}
        {!loading && establishments.totalCount > 0 && (
          <PaginationControls
            {...establishments}
            labels={adminCopy[locale].pagination}
            disabled={loading}
            onPageChange={setPage}
          />
        )}
      </section>

      {dialog?.kind === 'details' && (
        <EstablishmentDetailsModal
          details={details}
          loading={detailsLoading}
          failure={detailsFailure}
          copy={copy}
          onClose={closeDialog}
          onRetry={() => void loadDetails(dialog.establishment)}
        />
      )}
      {dialog?.kind === 'add' && (
        <EstablishmentFormModal options={options} copy={copy} saving={saving} submitError={actionError} onClose={() => !saving && closeDialog()} onSave={(input) => void saveForm(input)} />
      )}
      {dialog?.kind === 'edit' && (
        <EstablishmentFormModal details={dialog.establishment} options={options} copy={copy} saving={saving} submitError={actionError} onClose={() => !saving && closeDialog()} onSave={(input) => void saveForm(input)} />
      )}
      {dialog?.kind === 'transition' && (
        <TransitionModal
          establishment={dialog.establishment}
          action={dialog.action}
          copy={copy}
          saving={saving}
          error={actionError}
          onClose={() => !saving && closeDialog()}
          onConfirm={() => void saveTransition()}
        />
      )}
    </div>
  )
}

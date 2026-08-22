import { lazy, Suspense, useId, useState } from 'react'
import { CalendarDays, CheckCircle, ImageIcon, Info, MapPin, Phone, Plus, Signpost, Type } from 'lucide-react'
import { useI18n } from '../../i18n'
import type { AdminCreateEstablishmentParams, AdminCreateEstablishmentResponse, AdminEstablishmentType } from '../../lib/admin'
import { btnGhost, cardMuted, field, fieldHint, fieldLabel } from '../../lib/ui'
import {
  isAllowedEstablishmentImagePath,
  isRequiredArabicName,
  isValidMauritanianPhone,
  normalizeMauritanianPhone,
} from '../../lib/validation'
import { AdminActionButton, AdminModal } from './AdminUi'
import { adminCopy } from './adminCopy'
import type { MapCoordinates } from '../map/MapLocationPicker'

const MapLocationPicker = lazy(async () => {
  const module = await import('../map/MapLocationPicker')
  return { default: module.MapLocationPicker }
})

type EstablishmentDraft = {
  nameFr: string
  nameAr: string
  phone: string
  image: string
  location: string
  nearestPlace: string
  openingDate: string
  closingDate: string
  mapLocation: MapCoordinates | null
}

type FieldName = 'nameFr' | 'nameAr' | 'phone' | 'image' | 'location' | 'mapLocation'

const emptyDraft: EstablishmentDraft = {
  nameFr: '', nameAr: '', phone: '', image: '', location: '', nearestPlace: '', openingDate: '', closingDate: '', mapLocation: null,
}

function validate(draft: EstablishmentDraft, type: AdminEstablishmentType, copy: (typeof adminCopy)['fr']['establishmentForm']) {
  const errors: Partial<Record<FieldName, string>> = {}

  if (!draft.nameFr.trim()) errors.nameFr = copy.errorNameFr
  if (type === 'private') {
    if (!draft.nameAr.trim()) errors.nameAr = copy.errorNameAr
    else if (!isRequiredArabicName(draft.nameAr)) errors.nameAr = copy.errorNameArScript
    if (!isValidMauritanianPhone(draft.phone)) errors.phone = copy.errorPhone
    if (!isAllowedEstablishmentImagePath(draft.image)) errors.image = copy.errorImage
  } else if (!draft.location.trim()) {
    errors.location = copy.locationRequired
  }
  if (!draft.mapLocation) errors.mapLocation = copy.errorMapLocation

  return errors
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return <p id={id} className="mt-1.5 text-xs font-medium leading-5 text-ask">{message}</p>
}

function creationErrorMessage(status: string | undefined, copy: (typeof adminCopy)['fr']['establishmentForm']) {
  if (status === 'invalid_type') return copy.typeQuestion
  if (status === 'invalid_location') return copy.locationRequired
  if (status === 'invalid_name_fr') return copy.errorNameFr
  if (status === 'invalid_name_ar') return copy.errorNameArScript
  if (status === 'invalid_phone') return copy.errorPhone
  if (status === 'invalid_image_url') return copy.errorImage
  if (status === 'forbidden' || status === 'unauthenticated') return copy.adminAccessRequired
  return copy.creationFailed
}

type AdminAddEstablishmentFormProps = {
  onClose: () => void
  initialNameFr?: string
  sourceRequestId?: string | null
  onCreated?: () => void
  onCreate: (params: AdminCreateEstablishmentParams) => Promise<AdminCreateEstablishmentResponse | null>
}

export function AdminAddEstablishmentForm({
  onClose,
  initialNameFr = '',
  sourceRequestId = null,
  onCreated,
  onCreate,
}: AdminAddEstablishmentFormProps) {
  const { locale } = useI18n()
  const copy = adminCopy[locale].establishmentForm
  const fieldId = useId()
  const [draft, setDraft] = useState<EstablishmentDraft>(() => ({ ...emptyDraft, nameFr: initialNameFr }))
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({})
  const [created, setCreated] = useState<AdminCreateEstablishmentResponse | null>(null)
  const [type, setType] = useState<AdminEstablishmentType | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const update = (key: keyof EstablishmentDraft, value: string) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setSubmitError(null)
    // L'erreur d'un champ disparaît dès qu'on le corrige : la revalidation
    // complète attend la soumission, pour ne pas signaler un champ non encore saisi.
    setErrors((current) => {
      if (!(key in current)) return current
      const next = { ...current }
      delete next[key as FieldName]
      return next
    })
  }

  const selectMapLocation = (coordinates: MapCoordinates) => {
    setDraft((current) => ({ ...current, mapLocation: coordinates }))
    setSubmitError(null)
    setErrors((current) => {
      if (!current.mapLocation) return current
      const { mapLocation: _mapLocation, ...remaining } = current
      return remaining
    })
  }

  const submit = async () => {
    if (!type) return
    const nextErrors = validate(draft, type, copy)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    setSubmitError(null)
    const result = await onCreate({
      nameFr: draft.nameFr.trim(),
      nameAr: type === 'private' ? draft.nameAr.trim() : '',
      phone: type === 'private' ? normalizeMauritanianPhone(draft.phone) : '',
      imageUrl: draft.image.trim() || null,
      location: draft.location.trim() || null,
      nearestPlace: draft.nearestPlace.trim() || null,
      openingDate: draft.openingDate || null,
      closingDate: draft.closingDate || null,
      sourceRequestId,
      establishmentType: type,
      latitude: draft.mapLocation?.latitude ?? null,
      longitude: draft.mapLocation?.longitude ?? null,
    })
    setSaving(false)

    if (!result?.ok) {
      setSubmitError(creationErrorMessage(result?.status, copy))
      return
    }

    setCreated(result)
    onCreated?.()
  }

  const addAnother = () => {
    setDraft(emptyDraft)
    setType(null)
    setErrors({})
    setSubmitError(null)
    setCreated(null)
  }

  const inputId = (name: string) => `${fieldId}-${name}`
  const errorId = (name: FieldName) => `${fieldId}-${name}-error`

  const required = [
    { name: 'nameFr' as const, label: copy.nameFr, icon: Type, type: 'text', dir: 'auto' as const, placeholder: undefined, hint: undefined },
    { name: 'nameAr' as const, label: copy.nameAr, icon: Type, type: 'text', dir: 'rtl' as const, placeholder: undefined, hint: undefined },
    { name: 'phone' as const, label: copy.phone, icon: Phone, type: 'tel', dir: 'ltr' as const, placeholder: copy.phonePlaceholder, hint: copy.phoneHint },
  ]

  const optionalText = [
    { name: 'image' as const, label: copy.image, icon: ImageIcon, dir: 'ltr' as const, placeholder: copy.imagePlaceholder, hint: copy.imageHint },
    { name: 'location' as const, label: copy.location, icon: MapPin, dir: 'auto' as const, placeholder: copy.locationPlaceholder, hint: undefined },
    { name: 'nearestPlace' as const, label: copy.nearestPlace, icon: Signpost, dir: 'auto' as const, placeholder: copy.nearestPlacePlaceholder, hint: undefined },
  ]

  const optionalDates = [
    { name: 'openingDate' as const, label: copy.openingDate },
    { name: 'closingDate' as const, label: copy.closingDate },
  ]

  return (
    <AdminModal title={copy.title} subtitle={copy.subtitle} closeLabel={copy.cancel} onClose={onClose} size="lg">
      {!type ? (
        <div className="mt-5 grid gap-4">
          <fieldset>
            <legend className="text-sm font-bold text-ink">{copy.typeQuestion}</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-3">
              {([
                ['private', copy.typePrivate],
                ['public', copy.typePublic],
                ['administrative', copy.typeAdministrative],
              ] as const).map(([value, label]) => (
                <label key={value} className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink has-[:checked]:border-brand-deep has-[:checked]:bg-brand-soft">
                  <input type="radio" name="establishment-type" value={value} onChange={() => setType(value)} />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
          <p className="text-sm leading-6 text-muted">{copy.typeHelp}</p>
          <div className="flex justify-end border-t border-line pt-4">
            <button type="button" className={btnGhost} onClick={onClose}>{copy.cancel}</button>
          </div>
        </div>
      ) : created ? (
        <div className="mt-5 space-y-4">
          <section role="status" className="rounded-2xl border border-answer/30 bg-answer-bg p-4 text-answer">
            <CheckCircle size={22} aria-hidden />
            <h3 className="mt-3 text-base font-bold">{copy.createdTitle}</h3>
            <p className="mt-1 text-sm leading-6">{copy.createdText}</p>
            <p className="mt-3 text-xs leading-5">{copy.searchEstablishment}</p>
          </section>

          {submitError && <p role="alert" className="rounded-xl border border-ask/30 bg-ask-bg px-3 py-2.5 text-xs font-semibold leading-5 text-ask">{submitError}</p>}

          <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
            <button type="button" className={btnGhost} onClick={onClose}>{copy.cancel}</button>
            {!sourceRequestId && <AdminActionButton icon={Plus} label={copy.addAnother} tone="primary" className="justify-center" onClick={addAnother} />}
          </div>
        </div>
      ) : (
      <form
        className="mt-4 space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <fieldset className={`${cardMuted} p-3`}>
          <legend className="px-1 text-xs font-bold text-ink">{copy.requiredSection}</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {(type === 'private' ? required : required.filter((item) => item.name === 'nameFr')).map(({ name, label, icon: LeadIcon, type: inputType, dir, placeholder, hint }) => (
              <div key={name} className={name === 'phone' ? 'sm:col-span-2' : ''}>
                <label className={`${fieldLabel} mb-1.5 flex items-center gap-1.5 text-xs`} htmlFor={inputId(name)}>
                  <LeadIcon size={14} aria-hidden />
                  {label} <span className="text-ask" aria-hidden>*</span>
                </label>
                <input
                  id={inputId(name)}
                  type={inputType}
                  dir={dir}
                  required
                  value={draft[name]}
                  placeholder={placeholder}
                  aria-invalid={errors[name] ? true : undefined}
                  aria-describedby={errors[name] ? errorId(name) : undefined}
                  disabled={saving}
                  onChange={(event) => update(name, event.target.value)}
                  onBlur={name === 'phone' ? () => update('phone', normalizeMauritanianPhone(draft.phone)) : undefined}
                  className={`${field} h-11 text-sm ${errors[name] ? 'border-ask focus:border-ask focus:ring-ask/15' : ''}`}
                />
                {hint && !errors[name] && <p className={`${fieldHint} mt-1.5`}>{hint}</p>}
                <FieldError id={errorId(name)} message={errors[name]} />
              </div>
            ))}
          </div>
        </fieldset>

        <Suspense fallback={<div className="grid min-h-64 place-items-center rounded-xl border border-line bg-page-alt text-sm text-muted sm:min-h-72" role="status">{copy.mapLoading}</div>}>
          <MapLocationPicker
            copy={copy}
            value={draft.mapLocation}
            onChange={selectMapLocation}
            error={errors.mapLocation}
          />
        </Suspense>

        <fieldset className={`${cardMuted} p-3`}>
          <legend className="px-1 text-xs font-bold text-ink">{copy.optionalSection}</legend>
          <div className="mt-2 grid gap-3 sm:grid-cols-2">
            {optionalText.filter(({ name }) => type === 'private' || name === 'image' || name === 'location').map(({ name, label, icon: LeadIcon, dir, placeholder, hint }) => (
              <div key={name} className={name === 'image' ? 'sm:col-span-2' : ''}>
                <label className={`${fieldLabel} mb-1.5 flex items-center gap-1.5 text-xs`} htmlFor={inputId(name)}>
                  <LeadIcon size={14} aria-hidden />
                  {label}
                </label>
                <input
                  id={inputId(name)}
                  type="text"
                  dir={dir}
                  value={draft[name]}
                  placeholder={placeholder}
                  aria-invalid={name === 'image' && errors.image ? true : undefined}
                  aria-describedby={name === 'image' && errors.image ? errorId('image') : undefined}
                  disabled={saving}
                  onChange={(event) => update(name, event.target.value)}
                  className={`${field} h-11 text-sm ${name === 'image' && errors.image ? 'border-ask focus:border-ask focus:ring-ask/15' : ''}`}
                />
                {hint && !(name === 'image' && errors.image) && <p className={`${fieldHint} mt-1.5`}>{hint}</p>}
                {name === 'image' && <FieldError id={errorId('image')} message={errors.image} />}
                {name === 'location' && <FieldError id={errorId('location')} message={errors.location} />}
              </div>
            ))}
            {type === 'private' && optionalDates.map(({ name, label }) => (
              <div key={name}>
                <label className={`${fieldLabel} mb-1.5 flex items-center gap-1.5 text-xs`} htmlFor={inputId(name)}>
                  <CalendarDays size={14} aria-hidden />
                  {label}
                </label>
                <input
                  id={inputId(name)}
                  type="date"
                  value={draft[name]}
                  disabled={saving}
                  onChange={(event) => update(name, event.target.value)}
                  className={`${field} h-11 text-sm`}
                />
              </div>
            ))}
          </div>
        </fieldset>

        <p className="flex items-start gap-2 text-xs leading-5 text-muted">
          <span className="mt-px shrink-0"><Info size={14} aria-hidden /></span>
          {copy.requiredHint}
        </p>

        {Object.keys(errors).length > 0 && (
          <p role="alert" className="rounded-xl border border-ask/30 bg-ask-bg px-3 py-2.5 text-xs font-semibold leading-5 text-ask">
            {copy.errorsTitle}
          </p>
        )}

        {submitError && <p role="alert" className="rounded-xl border border-ask/30 bg-ask-bg px-3 py-2.5 text-xs font-semibold leading-5 text-ask">{submitError}</p>}

        <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <button type="button" className={`${btnGhost} sm:w-auto`} disabled={saving} onClick={() => setType(null)}>{copy.back}</button>
          <AdminActionButton icon={Plus} label={saving ? copy.creating : copy.submit} tone="primary" className="justify-center sm:w-auto" disabled={saving} onClick={() => void submit()} />
        </div>
      </form>
      )}
    </AdminModal>
  )
}

import { useCallback, useEffect, useId, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useI18n } from '../../i18n'
import {
  ADMIN_EXTERNAL_PLACE_IMPORT_MAX_LENGTH,
  createAdminExternalPlaceImportDetails,
  resolvedAdminExternalPlaceName,
  toAdminExternalPlaceImportDetailsPayload,
  toggleAdminExternalPlaceType,
  validateAdminExternalPlaceImportDetails,
  validateAdminExternalPlaceImportTypes,
  visibleAdminExternalPlaceImportFields,
  type AdminExternalPlaceImportDraft,
  type AdminExternalPlaceImportField,
  type AdminExternalPlaceImportSubmitResult,
} from '../../lib/adminExternalPlaceImport'
import type { AdminExternalPlaceDiscovery } from '../../lib/admin'
import { PLACE_TYPE_KEYS } from '../../lib/placeTypes'
import { btnGhost, btnPrimary, field, fieldHint, fieldLabel } from '../../lib/ui'
import { InlineAlert } from '../system/States'
import { AdminModal } from './AdminUi'
import { adminCopy } from './adminCopy'

function OptionalTextField({
  fieldKey,
  label,
  optionalLabel,
  value,
  inputId,
  notesHint,
  onChange,
}: {
  fieldKey: AdminExternalPlaceImportField
  label: string
  optionalLabel: string
  value: string
  inputId: string
  notesHint?: string
  onChange: (value: string) => void
}) {
  const isNotes = fieldKey === 'notes'
  const isPhone = fieldKey === 'phone' || fieldKey === 'whatsapp'
  const inputProps = {
    id: inputId,
    value,
    onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
    className: isNotes ? `${field} h-28 resize-y py-3` : field,
    'aria-describedby': notesHint ? `${inputId}-hint` : undefined,
    dir: isPhone ? 'ltr' as const : 'auto' as const,
    maxLength: ADMIN_EXTERNAL_PLACE_IMPORT_MAX_LENGTH[fieldKey],
  }

  return (
    <div className={isNotes ? 'sm:col-span-2' : undefined}>
      <label className={fieldLabel} htmlFor={inputId}>
        {label} <span className="font-normal text-muted">({optionalLabel})</span>
      </label>
      {isNotes
        ? <textarea {...inputProps} />
        : <input {...inputProps} type={isPhone ? 'tel' : 'text'} inputMode={isPhone ? 'tel' : 'text'} />}
      {notesHint && <p id={`${inputId}-hint`} className={fieldHint}>{notesHint}</p>}
    </div>
  )
}

export function AdminExternalPlaceImportModal({
  discovery,
  onClose,
  onSubmit,
  onComplete,
}: {
  discovery: AdminExternalPlaceDiscovery
  onClose: () => void
  onSubmit: (draft: AdminExternalPlaceImportDraft) => Promise<AdminExternalPlaceImportSubmitResult>
  onComplete: (status: string) => void
}) {
  const { locale } = useI18n()
  const copy = adminCopy[locale].discoveries
  const formId = useId()
  const stepPanel = useRef<HTMLElement>(null)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [draft, setDraft] = useState<AdminExternalPlaceImportDraft>(() => ({
    selectedTypes: [],
    details: createAdminExternalPlaceImportDetails(),
  }))
  const [typeError, setTypeError] = useState<'types_required' | 'conflicting_natures' | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const visibleFields = useMemo(
    () => visibleAdminExternalPlaceImportFields(draft.selectedTypes),
    [draft.selectedTypes],
  )
  const effectiveName = resolvedAdminExternalPlaceName(discovery.display_name, draft.details)
  const detailPayload = toAdminExternalPlaceImportDetailsPayload(draft.selectedTypes, draft.details)
  const completedDetails = visibleFields.filter((fieldKey) => draft.details[fieldKey].trim())
  const stepLabels = [copy.stepTypes, copy.stepDetails, copy.stepConfirm]

  const fieldLabels = copy.fields satisfies Record<AdminExternalPlaceImportField, string>

  useEffect(() => {
    if (step === 1) return
    const frame = window.requestAnimationFrame(() => stepPanel.current?.focus())
    return () => window.cancelAnimationFrame(frame)
  }, [step])

  const guardedClose = useCallback(() => {
    if (!saving) onClose()
  }, [onClose, saving])

  const updateDetail = (fieldKey: AdminExternalPlaceImportField, value: string) => {
    setSubmitError(null)
    setDraft((current) => ({
      ...current,
      details: { ...current.details, [fieldKey]: value },
    }))
  }

  const continueFlow = () => {
    setSubmitError(null)
    if (step === 1) {
      const invalid = validateAdminExternalPlaceImportTypes(draft.selectedTypes)
      setTypeError(invalid)
      if (invalid) return
      setStep(2)
      return
    }
    if (step === 2) {
      const invalid = validateAdminExternalPlaceImportDetails(draft.selectedTypes, draft.details)
      if (invalid) {
        setSubmitError(invalid === 'invalid_phone' ? copy.invalidPhone : copy.invalidWhatsapp)
        return
      }
      setStep(3)
    }
  }

  const goBack = () => {
    setSubmitError(null)
    setStep((current) => current === 3 ? 2 : 1)
  }

  const submit = async () => {
    setSaving(true)
    setSubmitError(null)
    let completedStatus: string | null = null
    try {
      const result = await onSubmit(draft)
      if (result.error) setSubmitError(result.error)
      else completedStatus = result.status
    } catch {
      setSubmitError(copy.actionFailed)
    } finally {
      setSaving(false)
    }
    if (completedStatus !== null) onComplete(completedStatus)
  }

  return (
    <AdminModal
      title={copy.importConfirmTitle}
      subtitle={copy.importConfirmText}
      closeLabel={copy.close}
      closeDisabled={saving}
      size="lg"
      onClose={guardedClose}
    >
      <div className="mt-4 rounded-xl border border-line bg-page-alt px-3 py-2.5">
        <p dir="auto" className="break-words text-sm font-semibold text-ink">{discovery.display_name}</p>
        <p className="mt-1 text-xs text-muted">
          {discovery.provider === 'photon' ? 'Photon' : 'Nominatim'}
          {(discovery.wilaya || discovery.country) && ` · ${[discovery.wilaya, discovery.country].filter(Boolean).join(', ')}`}
        </p>
      </div>

      <ol className="mt-5 grid grid-cols-3 gap-1.5" aria-label={copy.stepsLabel}>
        {stepLabels.map((label, index) => {
          const number = index + 1
          const active = number === step
          const complete = number < step
          return (
            <li key={label} className={`min-w-0 rounded-lg border px-2 py-2 text-center text-xs font-semibold ${active ? 'border-brand bg-brand-soft text-brand-deep' : complete ? 'border-answer/30 bg-answer-bg text-answer' : 'border-line bg-page-alt text-muted'}`} aria-current={active ? 'step' : undefined}>
              <span className="tabular block text-[11px]">{number}/3</span>
              <span className="mt-0.5 block break-words">{label}</span>
            </li>
          )
        })}
      </ol>

      <p className="mt-4 text-sm font-medium text-muted" aria-live="polite">{copy.stepProgress.replace('{current}', String(step))}</p>

      {step === 1 && (
        <fieldset className="mt-4">
          <legend className="text-base font-bold text-ink">{copy.chooseTypeTitle}</legend>
          <p className="mt-1 text-sm leading-6 text-muted">{copy.chooseTypeHelp}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {PLACE_TYPE_KEYS.map((type) => (
              <label key={type} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-line bg-surface px-3 text-sm text-ink-soft transition-colors has-checked:border-brand has-checked:bg-brand-soft">
                <input
                  type="checkbox"
                  checked={draft.selectedTypes.includes(type)}
                  onChange={() => {
                    setTypeError(null)
                    setDraft((current) => ({ ...current, selectedTypes: toggleAdminExternalPlaceType(current.selectedTypes, type) }))
                  }}
                  className="size-4 accent-brand"
                />
                {copy.typeOptions[type]}
              </label>
            ))}
          </div>
          {typeError && <p className="mt-2 text-sm font-medium text-ask" role="alert">{typeError === 'types_required' ? copy.chooseTypeError : copy.conflictingTypesError}</p>}
        </fieldset>
      )}

      {step === 2 && (
        <section ref={stepPanel} tabIndex={-1} className="mt-4 outline-none" aria-labelledby={`${formId}-details-title`}>
          <h3 id={`${formId}-details-title`} className="text-base font-bold text-ink">{copy.optionalDetailsTitle}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{copy.optionalDetailsText}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {visibleFields.map((fieldKey) => (
              <OptionalTextField
                key={fieldKey}
                fieldKey={fieldKey}
                label={fieldLabels[fieldKey]}
                optionalLabel={copy.optional}
                value={draft.details[fieldKey]}
                inputId={`${formId}-${fieldKey}`}
                notesHint={fieldKey === 'notes' ? copy.notesPublicHint : undefined}
                onChange={(value) => updateDetail(fieldKey, value)}
              />
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section ref={stepPanel} tabIndex={-1} className="mt-4 outline-none" aria-labelledby={`${formId}-confirm-title`}>
          <h3 id={`${formId}-confirm-title`} className="text-base font-bold text-ink">{copy.confirmDetailsTitle}</h3>
          <p className="mt-1 text-sm leading-6 text-muted">{copy.confirmDetailsText}</p>
          <dl className="mt-4 divide-y divide-line rounded-xl border border-line bg-page-alt px-3">
            <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
              <dt className="text-xs font-semibold text-muted">{copy.importedName}</dt>
              <dd dir="auto" className="break-words text-sm font-semibold text-ink">{effectiveName}</dd>
            </div>
            <div className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
              <dt className="text-xs font-semibold text-muted">{copy.fields.type}</dt>
              <dd className="flex flex-wrap gap-1.5">{draft.selectedTypes.map((type) => <span key={type} className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-semibold text-ink-soft">{copy.typeOptions[type]}</span>)}</dd>
            </div>
            {completedDetails.filter((fieldKey) => fieldKey !== 'correctedName').map((fieldKey) => (
              <div key={fieldKey} className="grid gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-3">
                <dt className="text-xs font-semibold text-muted">{fieldLabels[fieldKey]}</dt>
                <dd dir="auto" className="whitespace-pre-wrap break-words text-sm text-ink">{draft.details[fieldKey].trim()}</dd>
              </div>
            ))}
          </dl>
          {Object.keys(detailPayload).length === 0 && <p className="mt-3 text-sm text-muted">{copy.noExtraDetails}</p>}
        </section>
      )}

      {submitError && <InlineAlert tone="error" className="mt-4">{submitError}</InlineAlert>}

      <div className="mt-5 grid grid-cols-2 gap-2 border-t border-line pt-4">
        <button type="button" className={btnGhost} disabled={saving} onClick={step === 1 ? guardedClose : goBack}>
          {step === 1 ? copy.cancel : copy.back}
        </button>
        {step < 3
          ? <button type="button" className={btnPrimary} disabled={saving} onClick={continueFlow}>{copy.continue}</button>
          : <button type="button" className={btnPrimary} disabled={saving} onClick={() => void submit()}>{saving ? copy.importing : copy.confirmImport}</button>}
      </div>
    </AdminModal>
  )
}

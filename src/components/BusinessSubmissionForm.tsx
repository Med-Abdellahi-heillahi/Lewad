import { lazy, type FormEvent, Suspense, useEffect, useRef, useState } from 'react'
import { useI18n } from '../i18n'
import { useAccount } from '../hooks/useAccount'
import { createBusinessSubmission } from '../lib/businessSubmissions'
import { businessSubmissionOffer, contact, paymentApps } from '../lib/content'
import { getActiveCategories, type Db2Category } from '../lib/db2'
import { formatCurrency, formatNumber } from '../lib/format'
import { isValidMauritanianPhone, normalizeMauritanianPhone, isValidArabicName } from '../lib/validation'
import { btnGhost, btnPrimary, card, field, fieldHint, fieldLabel } from '../lib/ui'
import { Icon } from './Icon'
import type { MapCoordinates } from './map/MapLocationPicker'
import { InlineAlert } from './system/States'

type FormState = 'idle' | 'submitting' | 'success' | 'error'

type SuccessResult = {
  submissionId: string | null
  amountMro: number | null
  periodMonths: number | null
}

const MapLocationPicker = lazy(async () => {
  const module = await import('./map/MapLocationPicker')
  return { default: module.MapLocationPicker }
})

export function BusinessSubmissionForm() {
  const { t, locale } = useI18n()
  const { user, profile, authFullName } = useAccount()
  const copy = t.businessSubmission
  /** « 3 mois » / « 3 أشهر » — la durée vient du serveur, jamais du navigateur. */
  const periodLabel = (months: number) => copy.periodMonthsValue.replace('{months}', formatNumber(months, locale))
  const [formState, setFormState] = useState<FormState>('idle')
  const [successResult, setSuccessResult] = useState<SuccessResult | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  const [ownerFirstName, setOwnerFirstName] = useState('')
  const [ownerLastName, setOwnerLastName] = useState('')
  const [ownerPhone, setOwnerPhone] = useState('')
  const [businessNameFr, setBusinessNameFr] = useState('')
  const [businessNameAr, setBusinessNameAr] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [website, setWebsite] = useState('')
  const [category, setCategory] = useState('')
  const [categories, setCategories] = useState<Db2Category[]>([])
  const [location, setLocation] = useState('')
  const [nearestPlace, setNearestPlace] = useState('')
  const [mapLocation, setMapLocation] = useState<MapCoordinates | null>(null)
  const [step, setStep] = useState(1)
  const [senderPhone, setSenderPhone] = useState('')
  const [bankingApp, setBankingApp] = useState('')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const prefilledUserId = useRef<string | null>(null)

  useEffect(() => {
    let isCurrent = true

    void getActiveCategories().then(({ data }) => {
      if (isCurrent) setCategories(data)
    })

    return () => {
      isCurrent = false
    }
  }, [])

  useEffect(() => {
    if (!user?.id || prefilledUserId.current === user.id || (!profile && !authFullName)) return
    const fullName = profile?.full_name?.trim() || authFullName?.trim() || ''
    const nameParts = fullName.split(/\s+/).filter(Boolean)
    setOwnerFirstName((current) => current || nameParts[0] || '')
    setOwnerLastName((current) => current || nameParts.slice(1).join(' '))
    setOwnerPhone((current) => current || profile?.phone || '')
    prefilledUserId.current = user.id
  }, [authFullName, profile, user?.id])

  function validate(): boolean {
    const next: Record<string, string> = {}

    if (!ownerFirstName.trim()) next.ownerFirstName = copy.errors.ownerFirstName
    if (!ownerLastName.trim()) next.ownerLastName = copy.errors.ownerLastName
    if (!ownerPhone.trim()) {
      next.ownerPhone = copy.errors.ownerPhone
    } else if (!isValidMauritanianPhone(ownerPhone)) {
      next.ownerPhone = copy.errors.ownerPhoneInvalid
    }

    if (!businessNameFr.trim()) next.businessNameFr = copy.errors.businessNameFr
    if (!businessNameAr.trim()) {
      next.businessNameAr = copy.errors.businessNameAr
    } else if (!isValidArabicName(businessNameAr)) {
      next.businessNameAr = copy.errors.businessNameArInvalid
    }

    if (!businessPhone.trim()) {
      next.businessPhone = copy.errors.businessPhone
    } else if (!isValidMauritanianPhone(businessPhone)) {
      next.businessPhone = copy.errors.businessPhoneInvalid
    }

    if (website.trim() && !website.trim().match(/^https?:\/\/.+/)) {
      next.website = copy.errors.websiteInvalid
    }

    if (!mapLocation) next.mapLocation = copy.errors.mapPickerRequired

    setErrors(next)
    return Object.keys(next).length === 0
  }

  function selectMapLocation(coordinates: MapCoordinates) {
    setMapLocation(coordinates)
    setErrors((current) => {
      if (!current.mapLocation) return current
      const { mapLocation: _mapLocation, ...remaining } = current
      return remaining
    })
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (step === 1) {
      if (validate()) setStep(2)
      return
    }
    if (step === 2) {
      const paymentErrors: Record<string, string> = {}
      if (!senderPhone.trim()) paymentErrors.senderPhone = copy.paymentValidation
      if (!bankingApp) paymentErrors.bankingApp = copy.paymentValidation
      setErrors(paymentErrors)
      if (Object.keys(paymentErrors).length === 0) setStep(3)
      return
    }
    if (!validate() || !mapLocation) return

    setFormState('submitting')
    setServerError(null)

    const result = await createBusinessSubmission({
      ownerFirstName: ownerFirstName.trim(),
      ownerLastName: ownerLastName.trim(),
      ownerPhone: normalizeMauritanianPhone(ownerPhone),
      businessNameFr: businessNameFr.trim(),
      businessNameAr: businessNameAr.trim(),
      businessPhone: normalizeMauritanianPhone(businessPhone),
      whatsapp: whatsapp.trim() || undefined,
      website: website.trim() || undefined,
      categoryId: category.trim() || undefined,
      location: location.trim() || undefined,
      nearestPlace: nearestPlace.trim() || undefined,
      latitude: mapLocation.latitude,
      longitude: mapLocation.longitude,
    })

    if (result.status === 'missing_backend') {
      setFormState('error')
      setServerError(copy.backendUnavailable)
      return
    }

    if (result.status === 'duplicate') {
      setFormState('error')
      setServerError(copy.duplicate)
      return
    }

    if (result.status === 'rate_limited') {
      setFormState('error')
      setServerError(copy.rateLimit)
      return
    }

    if (!result.ok || result.status === 'error') {
      setFormState('error')
      setServerError(result.message ?? copy.genericError)
      return
    }

    setSuccessResult({ submissionId: result.submissionId, amountMro: result.amountMro, periodMonths: result.periodMonths })
    const whatsappMessage = [
      copy.whatsappIntro,
      '',
      `${copy.clientName}: ${ownerFirstName.trim()} ${ownerLastName.trim()}`,
      `${copy.establishmentName}: ${businessNameFr.trim()}`,
      `${copy.establishmentPhone}: ${businessPhone.trim()}`,
      whatsapp.trim() ? `${copy.establishmentWhatsapp}: ${whatsapp.trim()}` : null,
      `${copy.amountSent}: ${formatCurrency(result.amountMro ?? businessSubmissionOffer.amountMro, locale)}`,
      `${copy.durationRequested}: ${periodLabel(result.periodMonths ?? businessSubmissionOffer.periodMonths)}`,
      `${copy.senderPhone}: ${senderPhone.trim()}`,
      `${copy.bankingApp}: ${bankingApp}`,
      `${copy.paymentNumberLabel}: ${contact.paymentNumber}`,
      '',
      copy.whatsappThanks,
    ].filter((line): line is string => Boolean(line)).join('\n')
    window.open(`${contact.whatsappHref}?text=${encodeURIComponent(whatsappMessage)}`, '_blank', 'noopener,noreferrer')
    setFormState('success')
  }

  const submissionWhatsAppHref = successResult
    ? `${contact.whatsappHref}?text=${encodeURIComponent([
      copy.whatsappIntro,
      '',
      `${copy.clientName}: ${ownerFirstName.trim()} ${ownerLastName.trim()}`,
      `${copy.establishmentName}: ${businessNameFr.trim()}`,
      `${copy.establishmentPhone}: ${businessPhone.trim()}`,
      whatsapp.trim() ? `${copy.establishmentWhatsapp}: ${whatsapp.trim()}` : null,
      `${copy.amountSent}: ${formatCurrency(successResult.amountMro ?? businessSubmissionOffer.amountMro, locale)}`,
      `${copy.durationRequested}: ${periodLabel(successResult.periodMonths ?? businessSubmissionOffer.periodMonths)}`,
      `${copy.senderPhone}: ${senderPhone.trim()}`,
      `${copy.bankingApp}: ${bankingApp}`,
      `${copy.paymentNumberLabel}: ${contact.paymentNumber}`,
      '',
      copy.whatsappThanks,
    ].filter((line): line is string => Boolean(line)).join('\n'))}`
    : contact.whatsappHref

  if (formState === 'success' && successResult) {
    return (
      <section className={`${card} mx-auto max-w-2xl p-6 sm:p-8`} aria-labelledby="success-title">
        <span className="grid size-12 place-items-center rounded-2xl bg-answer-bg text-answer">
          <Icon name="check" size={24} />
        </span>
        <h1 id="success-title" className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">{copy.successTitle}</h1>
        <p className="mt-3 text-sm leading-7 text-muted sm:text-base">{copy.successText}</p>

        <dl className="mt-6 grid gap-3 rounded-xl border border-line bg-page-alt p-4 sm:p-5">
          {successResult.submissionId && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-sm text-muted">{copy.submissionId}</dt>
              <dd className="font-mono text-sm font-semibold text-ink ltr-isolate">{successResult.submissionId}</dd>
            </div>
          )}
          {successResult.amountMro !== null && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-sm text-muted">{copy.amountSection}</dt>
              <dd className="tabular text-sm font-semibold text-ink">{formatCurrency(successResult.amountMro, locale)}</dd>
            </div>
          )}
          {successResult.periodMonths !== null && (
            <div className="flex items-center justify-between gap-3">
              <dt className="text-sm text-muted">{copy.periodSection}</dt>
              <dd className="tabular text-sm font-semibold text-ink">{periodLabel(successResult.periodMonths)}</dd>
            </div>
          )}
          <div className="flex items-center justify-between gap-3">
            <dt className="text-sm text-muted">{copy.pendingReview}</dt>
            <dd>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand-deep">
                <span className="size-1.5 rounded-full bg-brand-deep motion-safe:animate-pulse" aria-hidden="true" />
                {copy.pendingReview}
              </span>
            </dd>
          </div>
        </dl>

        {/* Le paiement se règle avec l'équipe, hors application : on transmet le
            numéro de demande pour que l'équipe retrouve la soumission. */}
        <div className="mt-6 flex flex-wrap gap-3">
          <a
            href={submissionWhatsAppHref}
            target="_blank"
            rel="noreferrer"
            className={btnPrimary}
          >
            {copy.whatsappContact}
            <Icon name="message" size={17} />
          </a>
          <a href="/" className={btnGhost}>{copy.backHome}<span className="rtl:rotate-180"><Icon name="arrow" size={17} /></span></a>
        </div>
      </section>
    )
  }

  return (
    <section className={`${card} mx-auto max-w-2xl p-6 sm:p-8`} aria-labelledby="add-business-title">
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-deep dark:text-brand">
        <Icon name="plus" size={24} />
      </span>
      <h1 id="add-business-title" className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">{copy.title}</h1>
      <p className="mt-3 text-sm leading-7 text-muted sm:text-base">{copy.subtitle}</p>

      <div className="mt-6 flex flex-wrap gap-2" aria-label={copy.stepsLabel}>
        {[copy.stepOne, copy.stepTwo, copy.stepThree].map((label, index) => <span key={label} className={`rounded-full px-3 py-1.5 text-xs font-bold ${step === index + 1 ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-muted'}`}>{label}</span>)}
      </div>

      <div className="mt-6 rounded-xl border border-line bg-page-alt p-4 sm:p-5">
        <h2 className="text-sm font-bold text-ink">{copy.introTitle}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{copy.introText}</p>
      </div>

      {serverError && (
        <div className="mt-5">
          <InlineAlert tone="error">{serverError}</InlineAlert>
        </div>
      )}

      <form className="mt-8 grid gap-6" onSubmit={(e) => void handleSubmit(e)} noValidate>
        <div className={step === 1 ? 'grid gap-6' : 'hidden'}>
        {/* Owner */}
        <fieldset className="grid gap-4">
          <legend className="text-sm font-bold text-ink">{copy.ownerSection}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="owner-first-name" label={copy.ownerFirstName} value={ownerFirstName} onChange={setOwnerFirstName} error={errors.ownerFirstName} autoComplete="given-name" />
            <Field id="owner-last-name" label={copy.ownerLastName} value={ownerLastName} onChange={setOwnerLastName} error={errors.ownerLastName} autoComplete="family-name" />
          </div>
          <Field id="owner-phone" label={copy.ownerPhone} value={ownerPhone} onChange={setOwnerPhone} error={errors.ownerPhone} hint={copy.ownerPhoneHint} autoComplete="tel" inputMode="tel" />
        </fieldset>

        {/* Business */}
        <fieldset className="grid gap-4">
          <legend className="text-sm font-bold text-ink">{copy.businessSection}</legend>
          <Field id="business-name-fr" label={copy.businessNameFr} value={businessNameFr} onChange={setBusinessNameFr} error={errors.businessNameFr} hint={copy.businessNameFrHint} autoComplete="organization" />
          <Field id="business-name-ar" label={copy.businessNameAr} value={businessNameAr} onChange={setBusinessNameAr} error={errors.businessNameAr} hint={copy.businessNameArHint} lang="ar" dir="auto" />
          <Field id="business-phone" label={copy.businessPhone} value={businessPhone} onChange={setBusinessPhone} error={errors.businessPhone} hint={copy.businessPhoneHint} autoComplete="tel" inputMode="tel" />
        </fieldset>

        <Suspense fallback={<div className="grid min-h-64 place-items-center rounded-xl border border-line bg-page-alt text-sm text-muted sm:min-h-72" role="status">{copy.mapLoading}</div>}>
          <MapLocationPicker copy={copy} value={mapLocation} onChange={selectMapLocation} error={errors.mapLocation} />
        </Suspense>

        {/* Optional details */}
        <fieldset className="grid gap-4">
          <legend className="text-sm font-bold text-ink">{copy.optionalSection}</legend>
          <Field id="whatsapp" label={copy.whatsapp} value={whatsapp} onChange={setWhatsapp} hint={copy.whatsappHint} inputMode="tel" />
          <Field id="website" label={copy.website} value={website} onChange={setWebsite} error={errors.website} hint={copy.websiteHint} type="url" />
          <div>
            <label htmlFor="category" className={fieldLabel}>{copy.category}</label>
            <select id="category" value={category} onChange={(event) => setCategory(event.target.value)} className={field}>
              <option value="">{copy.category}</option>
              {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <p className={fieldHint}>{copy.categoryHint}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="location" label={copy.location} value={location} onChange={setLocation} hint={copy.locationHint} />
            <Field id="nearest-place" label={copy.nearestPlace} value={nearestPlace} onChange={setNearestPlace} hint={copy.nearestPlaceHint} />
          </div>
        </fieldset>

        <div className="rounded-xl border border-line bg-page-alt p-4 sm:p-5">
          <h2 className="text-sm font-bold text-ink">{copy.amountSection}</h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {copy.amountText
              .replace('{amount}', formatCurrency(businessSubmissionOffer.amountMro, locale))
              .replace('{months}', formatNumber(businessSubmissionOffer.periodMonths, locale))}
          </p>
        </div>
        </div>

        {step === 2 && <div className="grid gap-5">
          <div>
            <h2 className="text-lg font-bold">{copy.paymentTitle}</h2>
            <p className="mt-3 rounded-xl border border-line bg-page-alt px-4 py-3 text-sm font-semibold text-ink">{copy.paymentInstruction.replace('{number}', contact.paymentNumber)}</p>
          </div>
          <div><label className={fieldLabel} htmlFor="business-sender-phone">{copy.senderPhone}</label><input id="business-sender-phone" className={`${field} mt-2`} value={senderPhone} onChange={(event) => setSenderPhone(event.target.value)} inputMode="tel" aria-invalid={Boolean(errors.senderPhone) || undefined} />{errors.senderPhone && <p className="mt-1 text-xs text-ask" role="alert">{errors.senderPhone}</p>}</div>
          <div><label className={fieldLabel} htmlFor="business-banking-app">{copy.bankingApp}</label><select id="business-banking-app" className={`${field} mt-2`} value={bankingApp} onChange={(event) => setBankingApp(event.target.value)} aria-invalid={Boolean(errors.bankingApp) || undefined}><option value="">{copy.chooseBankingApp}</option>{paymentApps.map((app) => <option key={app} value={app}>{app}</option>)}</select>{errors.bankingApp && <p className="mt-1 text-xs text-ask" role="alert">{errors.bankingApp}</p>}</div>
        </div>}

        {step === 3 && <div className="rounded-xl border border-line bg-page-alt p-4 sm:p-5">
          <h2 className="text-lg font-bold">{copy.reviewTitle}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">{copy.paymentInstruction.replace('{number}', contact.paymentNumber)}</p>
          <dl className="mt-4 grid gap-2 text-sm"><div className="flex justify-between gap-3"><dt className="text-muted">{copy.businessNameFr}</dt><dd className="font-semibold" dir="auto">{businessNameFr}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted">{copy.businessPhone}</dt><dd className="font-semibold" dir="auto">{businessPhone}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted">{copy.senderPhone}</dt><dd className="font-semibold" dir="auto">{senderPhone}</dd></div><div className="flex justify-between gap-3"><dt className="text-muted">{copy.bankingApp}</dt><dd className="font-semibold">{bankingApp}</dd></div></dl>
        </div>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
        {step > 1 && <button type="button" className={`${btnGhost} w-full sm:w-auto`} onClick={() => { setErrors({}); setStep(step - 1) }}>{copy.back}</button>}
        <button type="submit" className={`${btnPrimary} w-full`} disabled={formState === 'submitting'}>
          {formState === 'submitting' ? copy.submitting : step === 3 ? copy.whatsappSend : copy.continue}
          <span className="rtl:rotate-180"><Icon name="arrow" size={17} /></span>
        </button>
        </div>
      </form>
    </section>
  )
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  hint,
  autoComplete,
  inputMode,
  type = 'text',
  lang,
  dir,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  error?: string
  hint?: string
  autoComplete?: string
  inputMode?: string
  type?: string
  lang?: string
  dir?: string
}) {
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  return (
    <div>
      <label htmlFor={id} className={fieldLabel}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        inputMode={inputMode as React.InputHTMLAttributes<HTMLInputElement>['inputMode']}
        lang={lang}
        dir={dir}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error) || undefined}
        className={`${field} ${error ? 'border-ask focus:border-ask focus:ring-ask/15' : ''}`}
      />
      {hint && !error && <p id={hintId} className={fieldHint}>{hint}</p>}
      {error && <p id={errorId} className="mt-1 text-xs text-ask" role="alert">{error}</p>}
    </div>
  )
}

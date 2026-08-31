import { useEffect, useId, useState, type ReactNode } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { Check, EllipsisVertical, Plus, Smartphone, X } from 'lucide-react'
import { useI18n } from '../i18n'
import { ease } from '../lib/motion'
import { useInstallInvitation } from '../lib/useInstallPrompt'
import { Logo, LogoAppIcon } from './Logo'

const STEP_DURATION = 2000

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex gap-1.5" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <span
          key={index}
          className={`block h-1.5 rounded-full transition-all duration-300 ${
            index === current ? 'w-6 bg-brand' : 'w-1.5 bg-surface-2'
          }`}
        />
      ))}
    </div>
  )
}

function BrowserBar({ highlightMenu = false }: { highlightMenu?: boolean }) {
  return (
    <div className="flex h-7 items-center gap-1.5 border-b border-line bg-page-alt px-2.5">
      <span className="size-1.5 rounded-full bg-muted/50" />
      <span className="size-1.5 rounded-full bg-muted/50" />
      <span className="size-1.5 rounded-full bg-muted/50" />
      <span className="ms-1 h-2 flex-1 rounded-full bg-surface-2" />
      <span
        className={`grid size-6 place-items-center rounded-md text-brand-ink ${
          highlightMenu ? 'bg-brand ring-2 ring-brand/35 ring-offset-2 ring-offset-page-alt' : 'bg-surface-2 text-muted'
        }`}
      >
        <EllipsisVertical size={14} aria-hidden />
      </span>
    </div>
  )
}

function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative mx-auto h-[124px] w-52 overflow-hidden rounded-[1.35rem] border-4 border-panel bg-page shadow-lg shadow-black/[0.12]">
      <span aria-hidden="true" className="absolute top-1.5 left-1/2 z-10 h-1.5 w-10 -translate-x-1/2 rounded-full bg-panel" />
      {children}
    </div>
  )
}

function StepScene({ step }: { step: number }) {
  if (step === 0) {
    return (
      <PhoneFrame>
        <BrowserBar />
        <div className="grid gap-2 p-3 pt-4">
          <div className="flex items-center gap-2 rounded-xl bg-surface p-2 shadow-sm">
            <Logo compact />
            <span className="grid min-w-0 flex-1 gap-1.5">
              <span className="h-2.5 w-16 rounded-full bg-ink" />
              <span className="h-1.5 w-24 rounded-full bg-surface-2" />
            </span>
          </div>
          <span className="h-8 rounded-lg bg-brand-soft" />
          <span className="h-3 w-4/5 rounded-full bg-surface-2" />
        </div>
      </PhoneFrame>
    )
  }

  if (step === 1) {
    return (
      <PhoneFrame>
        <BrowserBar highlightMenu />
        <div className="grid gap-2 p-3 pt-4">
          <span className="h-8 rounded-lg bg-brand-soft" />
          <span className="h-3 w-4/5 rounded-full bg-surface-2" />
          <span className="h-3 w-3/5 rounded-full bg-surface-2" />
        </div>
        <div className="absolute top-9 end-2.5 w-28 rounded-lg border border-line bg-surface p-2 shadow-xl shadow-black/[0.16]">
          <div className="flex items-center gap-1.5 rounded-md bg-brand-soft px-1.5 py-1.5">
            <Plus size={11} className="text-brand-deep" aria-hidden />
            <span className="h-1.5 flex-1 rounded-full bg-brand-deep/35" />
          </div>
          <span className="mt-2 block h-1.5 w-3/4 rounded-full bg-surface-2" />
          <span className="mt-1.5 block h-1.5 w-1/2 rounded-full bg-surface-2" />
        </div>
      </PhoneFrame>
    )
  }

  return (
    <PhoneFrame>
      <div className="grid h-full grid-cols-4 content-start gap-2 bg-page-alt p-4 pt-8">
        {Array.from({ length: 8 }, (_, index) => (
          <span key={index} className="size-6 rounded-lg bg-surface-2" />
        ))}
      </div>
      <div className="absolute inset-x-0 top-8 grid place-items-center">
        {/* L'icône posée sur l'écran d'accueil : l'emblème occupe toute la tuile,
            comme le fera la vraie icône installée. */}
        <m.div
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, ease }}
          className="shadow-lg shadow-black/20"
        >
          <LogoAppIcon className="size-[3.25rem] rounded-2xl" />
        </m.div>
        <span className="mt-1.5 h-1.5 w-11 rounded-full bg-ink/25" />
      </div>
    </PhoneFrame>
  )
}

function StepVisual({ step, reduce }: { step: number; reduce: boolean }) {
  return (
    <div className="h-[124px] overflow-hidden" aria-hidden="true">
      <AnimatePresence mode="wait">
        <m.div
          key={step}
          initial={reduce ? undefined : { opacity: 0, scale: 0.94 }}
          animate={reduce ? undefined : { opacity: 1, scale: 1 }}
          exit={reduce ? undefined : { opacity: 0, scale: 0.94 }}
          transition={{ duration: 0.3, ease }}
        >
          <StepScene step={step} />
        </m.div>
      </AnimatePresence>
    </div>
  )
}

export function InstallPromptModal() {
  const { t } = useI18n()
  const copy = t.installPrompt
  const reduce = useReducedMotion()
  const { open, dismiss } = useInstallInvitation()
  const [currentStep, setCurrentStep] = useState(0)
  const titleId = useId()
  const stepLabels = [copy.step1Label, copy.step2Label, copy.step3Label]
  const displayedStep = reduce ? 0 : currentStep
  const seeGuide = () => {
    dismiss()
    window.requestAnimationFrame(() => {
      document.getElementById('install')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
    })
  }

  useEffect(() => {
    if (reduce || !open) return
    const timer = window.setInterval(() => setCurrentStep((step) => (step + 1) % stepLabels.length), STEP_DURATION)
    return () => window.clearInterval(timer)
  }, [open, reduce, stepLabels.length])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [dismiss, open])

  return (
    <AnimatePresence>
      {open && (
        <m.aside
          role="region"
          aria-labelledby={titleId}
          initial={reduce ? undefined : { opacity: 0, y: 20 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: 20 }}
          transition={{ duration: 0.35, ease }}
          className="fixed bottom-4 start-3 z-50 w-[calc(100%-24px)] max-w-[380px] rounded-2xl border border-line bg-page p-4 shadow-xl shadow-black/[0.14]"
        >
          <button
            type="button"
            onClick={dismiss}
            aria-label={copy.closeLabel}
            title={copy.closeLabel}
            className="absolute top-1 end-1 inline-flex size-11 items-center justify-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <X size={17} aria-hidden />
          </button>

          <StepVisual step={displayedStep} reduce={Boolean(reduce)} />

          <h2 id={titleId} className="mt-3 pe-9 text-base leading-snug font-bold text-ink">
            {copy.title}
          </h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted">{copy.description}</p>
          <p className="mt-2 text-xs leading-relaxed text-muted">{copy.storeNote}</p>

          <p className="mt-3 flex min-h-10 items-center gap-2 rounded-xl bg-page-alt px-2.5 py-2 text-[13px] leading-snug font-semibold text-ink-soft">
            <span className="tabular grid size-6 shrink-0 place-items-center rounded-lg bg-brand text-xs font-bold text-brand-ink">
              {displayedStep + 1}
            </span>
            {stepLabels[displayedStep]}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <StepIndicator current={displayedStep} />
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={seeGuide}
                className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-ink transition-colors hover:bg-surface-2"
              >
                {copy.seeSteps}
              </button>
              <button
                type="button"
                onClick={dismiss}
                className="inline-flex min-h-11 items-center rounded-xl bg-brand px-3 text-xs font-semibold text-brand-ink transition-colors hover:bg-brand/85"
              >
                {copy.gotIt}
              </button>
            </div>
          </div>
        </m.aside>
      )}
    </AnimatePresence>
  )
}

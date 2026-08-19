import { useState } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../i18n'
import { demoResult } from '../../lib/content'
import { ease } from '../../lib/motion'
import { btnGhost, sectionPad, wrap } from '../../lib/ui'
import { Alert } from '../Alert'
import { Icon } from '../Icon'
import { Logo } from '../Logo'
import { Reveal } from '../Reveal'
import { SectionHeading } from '../SectionHeading'

/** Carte fictive de résultat, réutilisée par les écrans 3 et 4. */
function ResultCard({ full }: { full: boolean }) {
  const { t } = useI18n()
  const ui = t.demo.ui

  return (
    <div className="rounded-xl border border-line bg-surface p-3.5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-deep">
          <Icon name="wallet" size={18} />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-ink">{demoResult.name}</span>
            <span className="shrink-0 rounded-full bg-answer-bg px-2 py-0.5 text-[10px] font-semibold text-answer">
              {ui.open}
            </span>
          </div>
          <span className="mt-0.5 block truncate text-xs text-muted">{ui.category}</span>
        </div>
      </div>

      {full && (
        <>
          <div className="mt-3.5 grid grid-cols-3 gap-2">
            {(
              [
                { icon: 'phone', label: ui.call },
                { icon: 'message', label: ui.whatsapp },
                { icon: 'globe', label: ui.website },
              ] as const
            ).map((action) => (
              <span
                key={action.label}
                className="flex flex-col items-center gap-1.5 rounded-lg border border-line px-2 py-2.5 text-[11px] font-medium text-ink-soft"
              >
                <Icon name={action.icon} size={16} />
                {action.label}
              </span>
            ))}
          </div>

          <p className="mt-2.5 text-center text-[11px] text-muted ltr-isolate">{demoResult.phone}</p>

          {/* Mini-carte dessinée en CSS — aucune tuile chargée. */}
          <div className="relative mt-3 h-24 overflow-hidden rounded-lg bg-tint-2">
            <div
              aria-hidden="true"
              className="absolute inset-0 opacity-70"
              style={{
                backgroundImage:
                  'linear-gradient(115deg, transparent 46%, var(--surface) 47% 53%, transparent 54%), linear-gradient(35deg, transparent 46%, var(--surface) 47% 52%, transparent 53%)',
                backgroundSize: '120px 80px, 100px 90px',
              }}
            />
            <span className="absolute start-3 top-2.5 rounded bg-surface/85 px-2 py-1 text-[10px] font-semibold text-ink">
              {demoResult.district}
            </span>
            <span className="absolute start-1/2 top-1/2 grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand-deep text-brand">
              <Icon name="pin" size={13} />
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2.5">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-deep">
              <Icon name="route" size={15} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-semibold text-ink">{ui.nearest}</span>
              <span className="block truncate text-[11px] text-muted">
                {demoResult.branch} · {demoResult.distance}
              </span>
            </span>
            <span className="ms-auto shrink-0 rounded-lg bg-surface-2 px-2.5 py-1.5 text-[11px] font-semibold text-ink">
              {ui.directions}
            </span>
          </div>

          <div className="mt-3 rounded-lg bg-brand py-2 text-center text-xs font-bold text-brand-ink">{ui.confirm}</div>
        </>
      )}
    </div>
  )
}

/** Les quatre maquettes temporaires, de la recherche jusqu'à la fiche complète. */
function DemoScreen({ index }: { index: number }) {
  const { t } = useI18n()
  const ui = t.demo.ui

  return (
    <div className="flex min-h-[420px] flex-col rounded-2xl border border-line bg-surface-2 sm:min-h-[440px]">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <Logo compact />
        <span className="flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand-deep">
          <Icon name="sparkle" size={12} />
          <span className="tabular">{demoResult.points}</span>
          <span>{ui.points}</span>
        </span>
        <span className="grid size-7 place-items-center rounded-full bg-tint-4 text-[11px] font-bold text-tint-ink-4">
          {demoResult.initial}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        {/* Barre de recherche : vide à l'étape 1, remplie ensuite. */}
        <div className="flex items-center gap-2.5 rounded-xl border border-line bg-surface px-3.5 py-3">
          <span className="text-muted">
            <Icon name="search" size={17} />
          </span>
          {index === 0 ? (
            <span className="text-sm text-muted">{ui.searchPlaceholder}</span>
          ) : (
            <span className="flex items-center text-sm text-ink">
              {ui.query}
              {index === 1 && (
                <span aria-hidden="true" className="ms-0.5 inline-block h-4 w-px animate-pulse bg-ink" />
              )}
            </span>
          )}
        </div>

        {index === 0 && (
          <div className="flex flex-wrap gap-2">
            {ui.suggestions.map((suggestion) => (
              <span
                key={suggestion}
                className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs text-muted"
              >
                {suggestion}
              </span>
            ))}
          </div>
        )}

        {index === 1 && (
          <div className="space-y-2">
            {[100, 78, 60].map((width, row) => (
              <div key={width} className="flex items-center gap-3 rounded-xl border border-line bg-surface p-3">
                <span className="size-8 shrink-0 rounded-lg bg-surface-2" />
                <span className="flex-1 space-y-1.5">
                  <span className="block h-2 rounded bg-surface-2" style={{ width: `${width - row * 8}%` }} />
                  <span className="block h-2 w-1/3 rounded bg-surface-2" />
                </span>
              </div>
            ))}
          </div>
        )}

        {index >= 2 && (
          <>
            <span className="text-[11px] font-semibold tracking-wide text-muted uppercase rtl:tracking-normal rtl:normal-case">
              {ui.results}
            </span>
            <ResultCard full={index === 3} />
          </>
        )}
      </div>
    </div>
  )
}

export function Demo() {
  const { t, isRtl } = useI18n()
  const reduce = useReducedMotion()
  const [step, setStep] = useState(0)
  const [direction, setDirection] = useState(1)

  const steps = t.demo.steps
  const last = steps.length - 1

  const go = (next: number) => {
    setDirection(next > step ? 1 : -1)
    setStep(Math.min(last, Math.max(0, next)))
  }

  // En RTL, « suivant » doit visuellement glisser depuis le côté opposé.
  const offset = 32 * (isRtl ? -1 : 1)

  return (
    <section id="demo" className={`${wrap} scroll-mt-24 ${sectionPad}`}>
      <SectionHeading eyebrow={t.demo.eyebrow} title={t.demo.title} text={t.demo.text} />

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,380px)_1fr] lg:items-center lg:gap-14">
        <Reveal className="order-2 lg:order-1">
          <div className="overflow-hidden">
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <m.div
                key={step}
                custom={direction}
                initial={reduce ? false : { opacity: 0, x: direction * offset }}
                animate={{ opacity: 1, x: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, x: direction * -offset }}
                transition={{ duration: 0.28, ease }}
              >
                <DemoScreen index={step} />
              </m.div>
            </AnimatePresence>
          </div>
        </Reveal>

        <Reveal delay={0.06} className="order-1 lg:order-2">
          <ol className="list-none space-y-3">
            {steps.map((item, index) => {
              const active = index === step
              return (
                <li key={item.title}>
                  <button
                    type="button"
                    onClick={() => go(index)}
                    aria-current={active}
                    className={`flex w-full items-start gap-3.5 rounded-xl border p-4 text-start transition-colors duration-200 ${
                      active
                        ? 'border-brand/60 bg-brand-soft'
                        : 'border-line bg-surface text-muted hover:border-line-strong'
                    }`}
                  >
                    <span
                      className={`tabular grid size-7 shrink-0 place-items-center rounded-lg text-xs font-bold ${
                        active ? 'bg-brand text-brand-ink' : 'bg-surface-2 text-muted'
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span>
                      <span className={`block text-sm font-semibold ${active ? 'text-ink' : 'text-ink-soft'}`}>
                        {item.title}
                      </span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-muted">{item.caption}</span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          <div className="mt-6 flex items-center gap-3">
            <button type="button" className={btnGhost} onClick={() => go(step - 1)} disabled={step === 0}>
              <span className="rtl:rotate-180">
                <Icon name="chevronLeft" size={16} />
              </span>
              {t.demo.prev}
            </button>

            <span aria-live="polite" className="tabular text-sm font-semibold text-muted">
              <span className="sr-only">{t.demo.stepLabel} </span>
              {step + 1} / {steps.length}
            </span>

            <button type="button" className={`${btnGhost} ms-auto`} onClick={() => go(step + 1)} disabled={step === last}>
              {t.demo.next}
              <span className="rtl:rotate-180">
                <Icon name="chevronRight" size={16} />
              </span>
            </button>
          </div>

          <Alert className="mt-5">{t.alerts.demoTemp}</Alert>
        </Reveal>
      </div>
    </section>
  )
}

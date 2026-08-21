import { useState } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../i18n'
import { howToShots, type ShotShape } from '../../lib/assets'
import { ease } from '../../lib/motion'
import { btnGhost, sectionPad, wrap } from '../../lib/ui'
import { Icon } from '../Icon'
import { Reveal } from '../Reveal'
import { SectionHeading } from '../SectionHeading'

/**
 * Captures réelles de Lewad, une par étape de la démonstration. L'ordre suit
 * `t.demo.steps` : écran de recherche, saisie et suggestions, fiche du service,
 * itinéraire. Elles remplacent les maquettes CSS temporaires que cette section
 * affichait jusqu'ici.
 */
const shots: { src: string; shape: ShotShape }[] = [
  { src: howToShots.search, shape: 'portrait' },
  { src: howToShots.suggestions, shape: 'portrait' },
  { src: howToShots.details, shape: 'landscape' },
  { src: howToShots.directions, shape: 'landscape' },
]

/**
 * Cadre de présentation d'une capture.
 *
 * Les captures mobiles sont en portrait, celles de la fiche et de l'itinéraire
 * en paysage. Un cadre de hauteur fixe avec `object-contain` les accueille
 * toutes sans jamais les étirer ni les rogner, et évite que la mise en page
 * saute d'une étape à l'autre. Le fond discret tient lieu de passe-partout.
 */
function DemoShot({ index, alt }: { index: number; alt: string }) {
  const shot = shots[index] ?? shots[0]

  return (
    <div className="flex h-[380px] items-center justify-center overflow-hidden rounded-2xl border border-line bg-page-alt p-3 sm:h-[440px] sm:p-4">
      <img
        src={shot.src}
        alt={alt}
        loading="lazy"
        decoding="async"
        className={`max-h-full w-auto max-w-full rounded-lg object-contain ${
          shot.shape === 'portrait' ? 'shadow-md shadow-black/10' : 'border border-line shadow-sm'
        }`}
      />
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

      <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr] lg:items-center lg:gap-14">
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
                <DemoShot index={step} alt={steps[step].title} />
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
        </Reveal>
      </div>
    </section>
  )
}

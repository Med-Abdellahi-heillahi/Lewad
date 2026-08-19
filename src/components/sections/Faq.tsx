import { useId, useState } from 'react'
import { AnimatePresence, m, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../i18n'
import type { FaqItem } from '../../i18n/fr'
import { ease } from '../../lib/motion'
import { sectionPad, wrap } from '../../lib/ui'
import { Icon } from '../Icon'
import { Reveal } from '../Reveal'
import { SectionHeading } from '../SectionHeading'

function FaqRow({ item, index }: { item: FaqItem; index: number }) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const id = useId()

  return (
    <Reveal as="li" delay={0.03 * index} className="overflow-hidden rounded-2xl border border-line bg-surface">
      <h3>
        <button
          type="button"
          id={`${id}-btn`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center gap-3 p-4 text-start transition-colors duration-200 hover:bg-surface-2 sm:gap-4 sm:p-5"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-ask-bg text-ask">
            <Icon name="help" size={17} />
          </span>
          <span className="flex-1 text-[15px] leading-snug font-semibold text-ink sm:text-base">{item.q}</span>
          <span className="shrink-0 text-muted">
            <Icon name={open ? 'chevronUp' : 'chevronDown'} size={18} />
          </span>
        </button>
      </h3>

      <AnimatePresence initial={false}>
        {open && (
          <m.div
            key="panel"
            id={`${id}-panel`}
            role="region"
            aria-labelledby={`${id}-btn`}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease }}
            className="overflow-hidden"
          >
            <div className="flex gap-3 border-t border-line px-4 py-4 sm:gap-4 sm:px-5 sm:py-5">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-answer-bg text-answer">
                <Icon name="check" size={17} />
              </span>

              <div className="min-w-0 flex-1 space-y-3 text-[14px] leading-relaxed text-muted sm:text-[15px]">
                {item.a.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}

                {item.steps && (
                  <ol className="tabular ms-4 list-decimal space-y-1.5 marker:font-semibold marker:text-ink-soft">
                    {item.steps.map((step) => (
                      <li key={step} className="ps-1">
                        {step}
                      </li>
                    ))}
                  </ol>
                )}

                {item.link && (
                  <a
                    href="#offers"
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-deep underline underline-offset-4 hover:no-underline"
                  >
                    {t.faq.seeOffers}
                    <span className="rtl:rotate-180">
                      <Icon name="arrow" size={15} />
                    </span>
                  </a>
                )}
              </div>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </Reveal>
  )
}

export function Faq() {
  const { t } = useI18n()

  return (
    <section id="faq" className={`${wrap} scroll-mt-24 ${sectionPad}`}>
      <SectionHeading eyebrow={t.faq.eyebrow} title={t.faq.title} text={t.faq.text} />

      <ul className="mx-auto mt-10 grid max-w-3xl list-none gap-3">
        {t.faq.items.map((item, index) => (
          <FaqRow key={item.q} item={item} index={index} />
        ))}
      </ul>
    </section>
  )
}

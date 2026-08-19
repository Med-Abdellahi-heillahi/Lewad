import { useI18n } from '../../i18n'
import { btnPrimary, card, eyebrow, sectionPad, wrap } from '../../lib/ui'
import { Icon } from '../Icon'
import { Reveal } from '../Reveal'

const icons = ['map', 'search', 'pin'] as const

export function WhatWeDo() {
  const { t } = useI18n()

  return (
    <section id="what" className={`${wrap} scroll-mt-24 ${sectionPad}`}>
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <Reveal>
          <span className={eyebrow}>{t.what.eyebrow}</span>
          <h2 className="mt-4 text-3xl leading-[1.1] font-bold tracking-[-0.03em] text-balance sm:text-4xl lg:text-[44px]">
            {t.what.title}
          </h2>
          <p className="mt-5 text-base leading-relaxed font-medium text-ink-soft sm:text-lg">{t.what.lead}</p>
          <p className="mt-4 text-[15px] leading-relaxed text-muted">{t.what.text}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="#service" className={btnPrimary}>
              {t.what.secondary}
            </a>
          </div>
        </Reveal>

        <div className="grid gap-3">
          {t.what.points.map((point, index) => (
            <Reveal key={point.title} delay={0.06 * index} as="article" className={`${card} flex items-start gap-4 p-5`}>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-deep">
                <Icon name={icons[index] ?? 'sparkle'} size={19} />
              </span>
              <span>
                <span className="block font-display text-base font-semibold text-ink">{point.title}</span>
                <span className="mt-1 block text-sm leading-relaxed text-muted">{point.text}</span>
              </span>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}

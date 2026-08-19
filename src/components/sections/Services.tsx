import { useI18n } from '../../i18n'
import { card, sectionPad, wrap } from '../../lib/ui'
import { Icon, type IconName } from '../Icon'
import { Reveal } from '../Reveal'
import { SectionHeading } from '../SectionHeading'

const icons: IconName[] = ['store', 'phone', 'message', 'pin', 'globe', 'route', 'map']

export function Services() {
  const { t } = useI18n()

  return (
    <section id="service" className={`${wrap} scroll-mt-24 ${sectionPad}`}>
      <SectionHeading eyebrow={t.service.eyebrow} title={t.service.title} />

      <Reveal delay={0.05} className="mt-6 max-w-3xl">
        <p className="text-base leading-relaxed font-medium text-ink-soft sm:text-lg">{t.service.lead}</p>
        <p className="mt-3 text-[15px] leading-relaxed text-muted">{t.service.text}</p>
      </Reveal>

      <ul className="mt-10 grid list-none gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {t.service.items.map((item, index) => (
          <Reveal
            key={item.title}
            as="li"
            delay={0.04 * index}
            className={`${card} p-5 transition-colors duration-200 hover:border-line-strong`}
          >
            <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-deep">
              <Icon name={icons[index] ?? 'sparkle'} size={19} />
            </span>
            <h3 className="mt-4 text-base font-semibold text-ink">{item.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{item.text}</p>
          </Reveal>
        ))}
      </ul>
    </section>
  )
}

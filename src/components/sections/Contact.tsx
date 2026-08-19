import { useI18n } from '../../i18n'
import { contact } from '../../lib/content'
import { btnPrimary, card, sectionPad, wrap } from '../../lib/ui'
import { Icon, type IconName } from '../Icon'
import { Reveal } from '../Reveal'
import { SectionHeading } from '../SectionHeading'

export function Contact() {
  const { t } = useI18n()

  const channels: { icon: IconName; label: string; value: string; href: string }[] = [
    { icon: 'phone', label: t.contact.phone, value: contact.phoneDisplay, href: contact.phoneHref },
    { icon: 'message', label: t.contact.whatsapp, value: contact.whatsappDisplay, href: contact.whatsappHref },
    { icon: 'globe', label: t.contact.email, value: contact.email, href: contact.emailHref },
  ]

  return (
    <section id="contact" className={`${wrap} scroll-mt-24 ${sectionPad}`}>
      <SectionHeading eyebrow={t.contact.eyebrow} title={t.contact.title} text={t.contact.text} />

      <div className="mt-10 grid gap-4 lg:grid-cols-[1fr_0.85fr] lg:items-stretch">
        <ul className="grid list-none gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {channels.map((channel, index) => (
            <Reveal key={channel.label} as="li" delay={0.05 * index}>
              <a
                href={channel.href}
                className={`${card} flex h-full items-center gap-3.5 p-4 transition-colors duration-200 hover:border-line-strong hover:bg-surface-2`}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-deep">
                  <Icon name={channel.icon} size={18} />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-muted">{channel.label}</span>
                  <span className="ltr-isolate mt-0.5 block truncate text-sm font-semibold text-ink">
                    {channel.value}
                  </span>
                </span>
                <span className="ms-auto shrink-0 text-muted rtl:rotate-180">
                  <Icon name="arrow" size={16} />
                </span>
              </a>
            </Reveal>
          ))}
        </ul>

        {/* Message aux établissements qui veulent rejoindre Lewad. */}
        <Reveal delay={0.1} className="flex flex-col justify-center rounded-2xl bg-panel p-7 text-panel-ink sm:p-9">
          <span className="grid size-11 place-items-center rounded-xl bg-brand text-brand-ink">
            <Icon name="store" size={20} />
          </span>
          <h3 className="mt-5 text-xl font-semibold text-panel-ink sm:text-2xl">{t.contact.businessTitle}</h3>
          <p className="mt-3 text-sm leading-relaxed text-panel-muted">{t.contact.businessText}</p>
          <a
            href={contact.whatsappHref}
            className={`${btnPrimary} mt-6 w-max`}
            target="_blank"
            rel="noreferrer noopener"
          >
            {t.contact.businessCta}
            <span className="rtl:rotate-180">
              <Icon name="arrow" size={17} />
            </span>
          </a>
        </Reveal>
      </div>
    </section>
  )
}

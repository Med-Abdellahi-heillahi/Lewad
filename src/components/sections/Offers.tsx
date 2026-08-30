import { useI18n } from '../../i18n'
import { formatCurrency, formatNumber } from '../../lib/format'
import { rechargeOffers } from '../../lib/recharge'
import { btnBase, sectionPad, wrap } from '../../lib/ui'
import { Icon, type IconName } from '../Icon'
import { Reveal } from '../Reveal'
import { SectionHeading } from '../SectionHeading'

const icons: IconName[] = ['sparkle', 'wallet', 'share']

export function Offers() {
  const { locale, t } = useI18n()

  return (
    <section id="offers" className={`${wrap} scroll-mt-24 ${sectionPad}`}>
      <SectionHeading eyebrow={t.offers.eyebrow} title={t.offers.title} text={t.offers.text} />

      <ul className="mt-10 grid list-none gap-4 md:grid-cols-3">
        {rechargeOffers.map((rechargeOffer, index) => {
          const offer = t.offers.cards[index]
          if (!offer) return null

          return (
            <Reveal
              key={offer.name}
              as="li"
              delay={0.06 * index}
              className="flex flex-col rounded-2xl border border-line bg-surface p-6"
            >
              <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-deep">
                <Icon name={icons[index] ?? 'sparkle'} size={19} />
              </span>

              <h3 className="mt-5 text-lg font-semibold text-ink">{offer.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{offer.tagline}</p>

              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="tabular font-display text-3xl font-bold text-ink">{formatNumber(rechargeOffer.points, locale)}</span>
                <span className="text-sm text-muted">{t.offers.pointsLabel}</span>
              </p>
              <p className="mt-1 text-sm font-semibold text-brand-deep">{formatCurrency(rechargeOffer.amountMro, locale)}</p>

              <ul className="mt-5 flex-1 list-none space-y-2.5 border-t border-line pt-5">
                {offer.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted">
                    <span className="mt-0.5 shrink-0 text-answer">
                      <Icon name="check" size={15} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <a href="/auth?mode=signup&redirect=%2Frecharge" className={`${btnBase} mt-6 w-full bg-brand text-brand-ink hover:bg-brand-deep`}>
                {t.offers.startCta}
              </a>
            </Reveal>
          )
        })}
      </ul>
    </section>
  )
}

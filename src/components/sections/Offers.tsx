import { useI18n } from '../../i18n'
import { btnBase, sectionPad, wrap } from '../../lib/ui'
import { Alert } from '../Alert'
import { Icon, type IconName } from '../Icon'
import { Reveal } from '../Reveal'
import { SectionHeading } from '../SectionHeading'

const icons: IconName[] = ['sparkle', 'wallet', 'share']

export function Offers() {
  const { t } = useI18n()

  return (
    <section id="offers" className={`${wrap} scroll-mt-24 ${sectionPad}`}>
      <SectionHeading eyebrow={t.offers.eyebrow} title={t.offers.title} text={t.offers.text} />

      <ul className="mt-10 grid list-none gap-4 md:grid-cols-3">
        {t.offers.cards.map((offer, index) => (
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
              <span className="tabular font-display text-3xl font-bold text-ink">{offer.points}</span>
              <span className="text-sm text-muted">{t.offers.pointsLabel}</span>
            </p>

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

            {/* Aucun parcours de paiement : le bouton est volontairement inactif. */}
            <button type="button" disabled className={`${btnBase} mt-6 w-full border border-line bg-surface-2 text-muted`}>
              {t.offers.soon}
            </button>
          </Reveal>
        ))}
      </ul>

      <Reveal delay={0.1} className="mx-auto mt-6 max-w-2xl">
        <Alert variant="info" icon="alert">
          {t.alerts.offersNotFinal}
        </Alert>
      </Reveal>
    </section>
  )
}

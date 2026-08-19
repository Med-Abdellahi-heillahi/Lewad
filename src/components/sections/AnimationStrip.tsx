import { useI18n } from '../../i18n'
import { stripIcons } from '../../lib/content'
import { sectionPad, wrap } from '../../lib/ui'
import { Icon, type IconName } from '../Icon'
import { SectionHeading } from '../SectionHeading'

const tints = [
  'bg-tint-1 text-tint-ink-1',
  'bg-tint-2 text-tint-ink-2',
  'bg-tint-3 text-tint-ink-3',
  'bg-tint-4 text-tint-ink-4',
  'bg-tint-5 text-tint-ink-5',
]

/**
 * Visuel temporaire d'une carte du bandeau. Les vraies images arriveront plus tard :
 * il suffira de remplacer le corps de ce composant par
 * `<img src={…} alt={alt} className="size-full object-cover" />`.
 */
function StripVisual({ icon, label, alt, index }: { icon: IconName; label: string; alt: string; index: number }) {
  return (
    <figure
      className={`me-4 flex h-32 w-52 shrink-0 flex-col justify-between overflow-hidden rounded-2xl p-4 sm:h-36 sm:w-60 ${
        tints[index % tints.length]
      }`}
      role="img"
      aria-label={alt}
    >
      <span className="grid size-10 place-items-center rounded-xl bg-white/55 dark:bg-white/10">
        <Icon name={icon} size={20} />
      </span>
      <figcaption className="font-display text-[15px] leading-tight font-semibold tracking-[-0.01em]">
        {label}
      </figcaption>
    </figure>
  )
}

export function AnimationStrip() {
  const { t } = useI18n()
  const items = t.strip.items

  return (
    <section id="strip" className={`scroll-mt-24 ${sectionPad}`}>
      <div className={wrap}>
        <SectionHeading eyebrow={t.strip.eyebrow} title={t.strip.title} text={t.strip.text} />
      </div>

      {/*
        Défilement de droite à gauche, en CSS pur (aucun travail JS par image).
        Sous `prefers-reduced-motion`, l'animation est coupée et le bandeau
        devient une bande simplement scrollable au doigt ou au clavier.
      */}
      <div
        className="edge-fade mt-10 overflow-x-auto motion-safe:overflow-hidden [scrollbar-width:none] motion-reduce:overscroll-x-contain"
        tabIndex={0}
        role="group"
        aria-label={t.strip.title}
      >
        {/* Aucun padding ici : la piste doit faire exactement 2× le contenu
            pour que translateX(-50%) reboucle sans décalage. */}
        <div className="flex w-max py-1 hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] motion-safe:animate-[marquee_46s_linear_infinite]">
          {items.map((item, index) => (
            <StripVisual
              key={`a-${item.label}`}
              icon={stripIcons[index] as IconName}
              label={item.label}
              alt={item.alt}
              index={index}
            />
          ))}
          {/* Copie masquée aux lecteurs d'écran : sert uniquement à boucler sans couture. */}
          <div className="flex motion-reduce:hidden" aria-hidden="true">
            {items.map((item, index) => (
              <StripVisual
                key={`b-${item.label}`}
                icon={stripIcons[index] as IconName}
                label={item.label}
                alt=""
                index={index}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

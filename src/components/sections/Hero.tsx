import { m, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../i18n'
import { ease } from '../../lib/motion'
import { btnGhost, btnPrimary, eyebrow, wrap } from '../../lib/ui'
import { demoResult } from '../../lib/content'
import { Icon } from '../Icon'

export function Hero() {
  const { t } = useI18n()
  const reduce = useReducedMotion()

  const rise = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.55, ease, delay },
        }

  return (
    <section id="top" className="relative overflow-hidden pt-24 pb-14 sm:pt-36 sm:pb-24">
      {/* Halo discret derrière le titre. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-[460px] max-w-3xl rounded-full bg-brand/18 blur-[130px] dark:bg-brand/10"
      />

      <div className={`${wrap} relative text-center`}>
        <m.span {...rise(0)} className={eyebrow}>
          <span className="size-1.5 rounded-full bg-brand-deep" />
          {t.hero.eyebrow}
        </m.span>

        <m.h1
          {...rise(0.06)}
          className="mx-auto mt-5 max-w-3xl text-[32px] leading-[1.08] font-bold tracking-[-0.035em] text-balance sm:text-5xl lg:text-6xl"
        >
          {t.hero.title}
        </m.h1>

        <m.p {...rise(0.12)} className="mx-auto mt-5 max-w-xl text-[15px] leading-relaxed text-muted sm:text-lg">
          {t.hero.text}
        </m.p>

        {/* Le premier bouton mène à l'inscription : la landing doit ouvrir sur
            le produit réel, pas seulement sur son explication. */}
        <m.div {...rise(0.18)} className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap">
          <a href="/auth" className={`${btnPrimary} w-full sm:w-auto`}>
            {t.hero.primary}
            <span className="rtl:rotate-180">
              <Icon name="arrow" size={16} />
            </span>
          </a>
          <a href="#what" className={`${btnGhost} w-full sm:w-auto`}>
            {t.hero.secondary}
          </a>
        </m.div>

        <m.p
          {...rise(0.21)}
          className="mt-4 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[13px] text-muted"
        >
          <span className="inline-flex items-center gap-1.5 font-semibold text-ink-soft">
            <Icon name="sparkle" size={14} />
            {t.hero.bonus}
          </span>
          <span aria-hidden="true" className="text-muted/60">·</span>
          <span>{t.hero.pointRule}</span>
        </m.p>

        {/* Boucle produit : chercher → trouver → contacter */}
        <m.ol
          {...rise(0.24)}
          className="mt-9 flex list-none flex-wrap items-center justify-center gap-x-2 gap-y-2 text-[13px] font-medium text-muted"
        >
          {t.hero.steps.map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-full border border-line bg-surface px-3 py-1.5">{step}</span>
              {index < t.hero.steps.length - 1 && (
                <span aria-hidden="true" className="text-muted/60 rtl:rotate-180">
                  <Icon name="chevronRight" size={14} />
                </span>
              )}
            </li>
          ))}
        </m.ol>

        {/* Aperçu : barre de recherche + première réponse */}
        <m.div
          {...rise(0.3)}
          className="mx-auto mt-10 w-full max-w-lg rounded-2xl border border-line bg-surface p-2 shadow-xl shadow-black/[0.06] dark:shadow-black/30 sm:mt-12"
        >
          <div className="flex items-center gap-2.5 rounded-xl bg-surface-2 px-3.5 py-3">
            <span className="text-muted">
              <Icon name="search" size={18} />
            </span>
            <span className="text-sm text-ink">{demoResult.name}</span>
            <span className="ms-auto flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[11px] font-semibold text-brand-deep">
              <Icon name="sparkle" size={12} />
              <span className="tabular">{demoResult.points}</span>
            </span>
          </div>

          <div className="mt-2 flex items-center gap-3 rounded-xl px-3.5 py-3 text-start">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-deep">
              <Icon name="wallet" size={17} />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-ink">{demoResult.name}</span>
              <span className="block truncate text-xs text-muted">{t.demo.ui.category}</span>
            </span>
            <span className="ms-auto shrink-0 text-muted rtl:rotate-180">
              <Icon name="arrow" size={16} />
            </span>
          </div>
        </m.div>
      </div>
    </section>
  )
}

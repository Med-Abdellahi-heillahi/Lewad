import { m, useReducedMotion } from 'framer-motion'
import { Check, EllipsisVertical, Home, Plus, Share, Smartphone } from 'lucide-react'
import { useI18n } from '../../i18n'
import { ease } from '../../lib/motion'
import { btnGhost, btnPrimary, card, sectionPad, wrap } from '../../lib/ui'
import { useInstallPrompt } from '../../lib/useInstallPrompt'
import { Logo, LogoAppIcon } from '../Logo'
import { Reveal } from '../Reveal'
import { SectionHeading } from '../SectionHeading'

/**
 * Maquette de téléphone. Purement décorative : `aria-hidden`, les mêmes
 * informations étant déjà lisibles dans la liste d'étapes à côté.
 *
 * La largeur est plafonnée à 240px pour qu'à 320px l'appareil reste dans la
 * colonne sans jamais déborder.
 */
function PhoneMockup({ labels }: { labels: { menu: string; addToHome: string; homeScreen: string } }) {
  const reduce = useReducedMotion()

  const float = reduce
    ? {}
    : { animate: { y: [0, -6, 0] }, transition: { duration: 5, ease: 'easeInOut' as const, repeat: Infinity } }

  const pulse = reduce
    ? {}
    : { animate: { opacity: [0.45, 0, 0.45], scale: [1, 1.35, 1] }, transition: { duration: 3.2, ease: 'easeInOut' as const, repeat: Infinity } }

  return (
    <div aria-hidden="true" className="relative mx-auto w-full max-w-[240px]">
      {/* Halo doux, dans la même famille que celui du hero. */}
      <div className="pointer-events-none absolute inset-x-0 -top-8 mx-auto h-56 w-40 rounded-full bg-brand/25 blur-[70px] dark:bg-brand/12" />

      <div className="relative rounded-[2rem] border border-line-strong bg-page p-2 shadow-xl shadow-black/[0.07] dark:shadow-black/40">
        <div className="overflow-hidden rounded-[1.5rem] border border-line bg-surface">
          {/* Barre de navigateur */}
          <div className="flex items-center gap-2 border-b border-line bg-page-alt px-2.5 py-2">
            <Logo compact />
            <span className="ms-auto grid size-6 place-items-center rounded-md bg-brand-soft text-brand-deep">
              <EllipsisVertical size={13} />
            </span>
          </div>

          {/* Contenu applicatif suggéré, volontairement muet. */}
          <div className="space-y-2 px-2.5 py-3">
            <div className="h-7 rounded-lg bg-surface-2" />
            <div className="h-12 rounded-lg bg-surface-2" />
            <div className="h-12 rounded-lg bg-surface-2 opacity-70" />
          </div>

          {/* Aperçu d'écran d'accueil : l'icône Lewad posée parmi d'autres. */}
          <div className="border-t border-line bg-page-alt px-2.5 pt-2 pb-3">
            <p className="text-[11px] font-semibold tracking-[0.08em] text-muted uppercase rtl:tracking-normal rtl:normal-case">
              {labels.homeScreen}
            </p>
            <div className="mt-2 flex items-end gap-2.5">
              {/* L'icône Lewad telle qu'elle apparaîtra sur l'écran d'accueil. */}
              <span className="relative shrink-0">
                <LogoAppIcon className="size-9 rounded-[10px]" />
                <m.span {...pulse} className="absolute inset-0 rounded-[10px] ring-2 ring-brand" />
              </span>
              <span className="size-9 rounded-[10px] bg-surface-2" />
              <span className="size-9 rounded-[10px] bg-surface-2" />
            </div>
          </div>
        </div>
      </div>

      {/* Carte flottante : l'option que l'utilisateur doit chercher dans son navigateur. */}
      <m.div
        {...float}
        className={`${card} absolute -bottom-4 -end-3 flex max-w-[190px] items-center gap-2 p-2.5 shadow-lg shadow-black/[0.08] dark:shadow-black/40`}
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand-deep">
          <Plus size={14} />
        </span>
        <span className="min-w-0 text-[11px] leading-tight font-semibold text-ink">{labels.addToHome}</span>
        <span className="shrink-0 text-answer">
          <Check size={14} />
        </span>
      </m.div>
    </div>
  )
}

export function InstallApp() {
  const { t } = useI18n()
  const copy = t.install
  const { canInstall, promptInstall } = useInstallPrompt()

  return (
    <section id="install" className={`${wrap} scroll-mt-24 ${sectionPad}`}>
      <div className="grid gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16">
        <div className="min-w-0">
          <SectionHeading eyebrow={copy.eyebrow} title={copy.title} text={copy.text} />

          <Reveal delay={0.06} className="mt-7 flex flex-wrap gap-3">
            {/* Le bouton d'installation n'apparaît que si le navigateur l'a
                réellement proposé : sinon on renvoie vers les étapes manuelles. */}
            {canInstall ? (
              <button type="button" className={btnPrimary} onClick={() => void promptInstall()}>
                <Smartphone size={16} aria-hidden />
                {copy.installCta}
              </button>
            ) : (
              <a href="#install-steps" className={btnPrimary}>
                <Smartphone size={16} aria-hidden />
                {copy.guideCta}
              </a>
            )}
          </Reveal>

          <Reveal delay={0.1} as="section" className="mt-9">
            <h3 className="text-[11px] font-semibold tracking-[0.09em] text-muted uppercase rtl:tracking-normal rtl:normal-case">
              {copy.stepsLabel}
            </h3>
            <ol id="install-steps" className="mt-3 grid list-none scroll-mt-24 gap-2.5">
              {copy.steps.map((step, index) => (
                <li key={step} className={`${card} flex items-start gap-3 p-3.5`}>
                  <span className="tabular grid size-7 shrink-0 place-items-center rounded-lg bg-brand-soft text-[12px] font-bold text-brand-deep">
                    {index + 1}
                  </span>
                  <span className="min-w-0 pt-0.5 text-[15px] leading-snug font-medium text-ink-soft">{step}</span>
                </li>
              ))}
            </ol>
          </Reveal>

          <Reveal delay={0.14} className="mt-5 space-y-2.5">
            <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted">
              <span className="mt-0.5 shrink-0">
                <Share size={15} aria-hidden />
              </span>
              {copy.browsers}
            </p>
            {/* Rappel explicite : Lewad est une application web, pas une application de magasin. */}
            <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted">
              <span className="mt-0.5 shrink-0">
                <Home size={15} aria-hidden />
              </span>
              {copy.webAppNote}
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.08} className="min-w-0 pb-6 lg:pb-0">
          <PhoneMockup labels={copy.mockup} />
        </Reveal>
      </div>
    </section>
  )
}

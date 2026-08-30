import { Home, Share, Smartphone } from 'lucide-react'
import { useI18n } from '../../i18n'
import { btnPrimary, card, sectionPad, wrap } from '../../lib/ui'
import { useInstallPrompt } from '../../lib/useInstallPrompt'
import { SectionHeading } from '../SectionHeading'

const androidScreenshots = [
  '/assets/install_app_image/android/android-1-menu.jpeg',
  '/assets/install_app_image/android/android-2-installer-raccourci.jpeg',
] as const

const iphoneScreenshots = [
  '/assets/install_app_image/iphone/1.jpeg',
] as const

type PlatformCopy = {
  title: string
  steps: readonly string[]
  visuals: readonly string[]
}

function PlatformGuide({ id, copy, screenshots }: { id: 'android' | 'iphone'; copy: PlatformCopy; screenshots: readonly string[] }) {
  return (
    <section className={`${card} min-w-0 p-5 sm:p-6`} aria-labelledby={`install-${id}`}>
      <h3 id={`install-${id}`} className="text-lg font-bold tracking-tight text-ink">{copy.title}</h3>

      <ol className="mt-5 grid list-none gap-2.5">
        {copy.steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3 rounded-xl bg-page-alt p-3">
            <span className="tabular grid size-7 shrink-0 place-items-center rounded-lg bg-brand-soft text-[12px] font-bold text-brand-deep">
              {index + 1}
            </span>
            <span className="min-w-0 pt-0.5 text-sm leading-snug font-medium text-ink-soft">{step}</span>
          </li>
        ))}
      </ol>

      {screenshots.length > 0 && (
        <div className="mt-5 -me-1 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 pe-3 md:grid md:grid-cols-3 md:overflow-visible md:pe-0">
          {screenshots.map((src, index) => (
            <figure key={src} className="w-[min(76vw,18rem)] shrink-0 snap-start overflow-hidden rounded-2xl border border-line bg-page-alt md:w-auto">
              <img
                src={src}
                alt={copy.visuals[index] ?? copy.steps[index] ?? copy.title}
                width={591}
                height={1280}
                loading="lazy"
                decoding="async"
                className="h-[28rem] w-full bg-page object-contain sm:h-[31rem] md:h-[25rem]"
              />
              <figcaption className="border-t border-line px-3 py-2.5 text-xs leading-relaxed font-medium text-muted">
                {copy.visuals[index] ?? copy.steps[index]}
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </section>
  )
}

export function InstallApp() {
  const { t } = useI18n()
  const copy = t.install
  const { canInstall, promptInstall } = useInstallPrompt()

  return (
    <section id="install" className={`${wrap} scroll-mt-24 ${sectionPad}`}>
      <div className="min-w-0">
        <SectionHeading eyebrow={copy.eyebrow} title={copy.title} text={copy.text} />

        <div className="mt-7 flex flex-wrap gap-3">
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
        </div>

        <div id="install-steps" className="mt-9 grid min-w-0 gap-5 lg:grid-cols-2 lg:gap-6">
          <div className="min-w-0">
            <PlatformGuide id="android" copy={copy.platforms.android} screenshots={androidScreenshots} />
          </div>
          <div className="min-w-0">
            <PlatformGuide id="iphone" copy={copy.platforms.iphone} screenshots={iphoneScreenshots} />
          </div>
        </div>

        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted">
            <Share className="mt-0.5 shrink-0" size={15} aria-hidden />
            {copy.browsers}
          </p>
          <p className="flex items-start gap-2.5 text-[13px] leading-relaxed text-muted">
            <Home className="mt-0.5 shrink-0" size={15} aria-hidden />
            {copy.webAppNote}
          </p>
        </div>
      </div>
    </section>
  )
}

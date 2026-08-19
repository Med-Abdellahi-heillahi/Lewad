import { useI18n } from '../i18n'
import { sectionIds } from '../lib/content'
import { wrap } from '../lib/ui'
import { Logo } from './Logo'

export function Footer() {
  const { t } = useI18n()

  return (
    <footer className="border-t border-line bg-page-alt">
      <div className={`${wrap} py-10 sm:py-12`}>
        <div className="flex flex-col gap-8 border-b border-line pb-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-sm text-muted">{t.footer.tagline}</p>
          </div>

          <nav aria-label={t.nav.menu}>
            <ul className="grid list-none grid-cols-2 gap-x-8 gap-y-2.5 text-sm sm:grid-cols-1 sm:gap-y-2">
              {sectionIds.map((id) => (
                <li key={id}>
                  <a href={`#${id}`} className="text-muted transition-colors hover:text-ink">
                    {t.nav.sections[id]}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Fait par · copyright · version */}
        <div className="mt-6 flex flex-col items-center gap-3 text-[13px] text-muted sm:flex-row sm:justify-between sm:gap-4">
          <span className="font-medium text-ink-soft">{t.footer.madeBy}</span>
          <span className="order-last sm:order-none">{t.footer.rights}</span>
          <span className="tabular ltr-isolate rounded-full border border-line px-2.5 py-1 text-xs">
            {t.footer.version}
          </span>
        </div>
      </div>
    </footer>
  )
}

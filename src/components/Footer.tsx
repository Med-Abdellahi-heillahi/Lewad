import { useI18n } from '../i18n'
import { contact, sectionIds } from '../lib/content'
import { wrap } from '../lib/ui'
import { Icon, type IconName } from './Icon'
import { Logo } from './Logo'
import { LanguageMenu } from './shell/LanguageMenu'

/**
 * Pied de page de la landing : colonnes sur desktop, empilement sur mobile.
 * La barre basse porte les trois mentions imposées (Wasla Soft · copyright · version).
 */
export function Footer() {
  const { t } = useI18n()

  const half = Math.ceil(sectionIds.length / 2)
  const columns = [sectionIds.slice(0, half), sectionIds.slice(half)]

  const channels: { icon: IconName; label: string; value: string; href: string }[] = [
    { icon: 'phone', label: t.contact.phone, value: contact.phoneDisplay, href: contact.phoneHref },
    { icon: 'message', label: t.contact.whatsapp, value: contact.whatsappDisplay, href: contact.whatsappHref },
    { icon: 'globe', label: t.contact.email, value: contact.email, href: contact.emailHref },
  ]

  return (
    <footer className="border-t border-line bg-page-alt">
      <div className={`${wrap} py-12 lg:py-16`}>
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] lg:gap-8">
          {/* Marque */}
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">{t.footer.tagline}</p>
            <div className="mt-5">
              <LanguageMenu />
            </div>
          </div>

          {/* Sections, réparties sur deux colonnes en desktop */}
          {columns.map((column, index) => (
            <nav key={index} aria-label={index === 0 ? t.nav.navigate : undefined}>
              <h2 className={`text-[11px] font-bold tracking-[0.09em] text-ink uppercase rtl:tracking-normal rtl:normal-case ${index === 1 ? 'sm:hidden' : ''}`}>
                {t.nav.navigate}
              </h2>
              <ul className={`list-none space-y-2.5 text-sm ${index === 0 ? 'mt-4' : 'mt-4 lg:mt-9'}`}>
                {column.map((id) => (
                  <li key={id}>
                    <a href={`#${id}`} className="text-muted transition-colors hover:text-ink">
                      {t.nav.sections[id]}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Contact */}
          <div>
            <h2 className="text-[11px] font-bold tracking-[0.09em] text-ink uppercase rtl:tracking-normal rtl:normal-case">
              {t.contact.eyebrow}
            </h2>
            <ul className="mt-4 list-none space-y-3">
              {channels.map((channel) => (
                <li key={channel.label}>
                  <a href={channel.href} className="group flex items-center gap-2.5 text-sm">
                    <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-line bg-surface text-muted transition-colors group-hover:text-ink">
                      <Icon name={channel.icon} size={15} />
                    </span>
                    <span className="ltr-isolate truncate text-muted transition-colors group-hover:text-ink">
                      {channel.value}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Fait par · copyright · version */}
        <div className="mt-10 flex flex-col items-center gap-3 border-t border-line pt-6 text-[13px] text-muted sm:flex-row sm:justify-between sm:gap-4">
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

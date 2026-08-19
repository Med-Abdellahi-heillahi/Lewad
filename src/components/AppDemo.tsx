import { useEffect, useRef, useState } from 'react'
import { dictionaries, locales, type Locale, useI18n } from '../i18n'
import { useTheme } from '../lib/theme'
import { useDismiss } from '../lib/useDismiss'
import { btnGhost, btnPrimary, card, iconBtn, wrap } from '../lib/ui'
import { Icon, type IconName } from './Icon'
import { Logo } from './Logo'

type SearchState = 'initial' | 'validation' | 'loading' | 'found' | 'unavailable' | 'requested'

const appCopy = {
  fr: {
    title: 'Recherche publique', language: 'Choisir la langue', menu: 'Ouvrir le menu', closeMenu: 'Fermer le menu',
    items: { profile: 'Profil', contact: 'Contact', settings: 'Paramètres', search: 'Faire une recherche', recharge: 'Recharger mon compte' },
    welcome: 'Que cherchez-vous aujourd’hui ?', description: 'Recherchez un service, une agence ou un établissement local en Mauritanie.',
    input: 'Rechercher un service', placeholder: 'Ex. Bankily, pharmacie, restaurant…', submit: 'Rechercher', examples: 'Exemples',
    chips: ['Bankily', 'Pharmacie', 'Salle de sport', 'Restaurant'], initialTitle: 'Commencez votre recherche', initialText: 'Testez Lewad sans compte avec un service local.',
    empty: 'Veuillez saisir le nom d’un service.', loading: 'Recherche en cours…', demo: 'Résultat de démonstration', category: 'Services financiers',
    phone: 'Téléphone', website: 'Site web', location: 'Localisation', city: 'Nouakchott, Mauritanie', nearby: 'Agences proches', nearbyCount: '3 agences proches', nearest: 'La plus proche',
    call: 'Appeler', whatsapp: 'WhatsApp', directions: 'Itinéraire', ok: 'OK', note: 'Données de démonstration pour la V1.',
    unavailableTitle: 'Ce service n’est pas disponible pour le moment.', unavailableText: 'Veuillez demander à l’équipe Lewad de l’ajouter.', request: 'Demander l’ajout',
    requestedTitle: 'Demande préparée', requestedText: 'Votre demande a été préparée. L’équipe Lewad pourra bientôt recevoir ce type de demande.', reset: 'Nouvelle recherche',
    version: 'Version 1.0.0', by: 'By Wasla', mapLabel: 'Carte illustrative des agences Bankily',
  },
  ar: {
    title: 'البحث العام', language: 'اختيار اللغة', menu: 'فتح القائمة', closeMenu: 'إغلاق القائمة',
    items: { profile: 'الملف الشخصي', contact: 'التواصل', settings: 'الإعدادات', search: 'إجراء بحث', recharge: 'شحن حسابي' },
    welcome: 'ماذا تبحث عنه اليوم؟', description: 'ابحث عن خدمة أو وكالة أو مؤسسة محلية في موريتانيا.',
    input: 'ابحث عن خدمة', placeholder: 'مثال: Bankily أو صيدلية أو مطعم…', submit: 'ابحث', examples: 'أمثلة',
    chips: ['Bankily', 'صيدلية', 'قاعة رياضية', 'مطعم'], initialTitle: 'ابدأ بحثك', initialText: 'جرّب لواد دون حساب باستخدام خدمة محلية.',
    empty: 'يرجى إدخال اسم خدمة.', loading: 'جارٍ البحث…', demo: 'نتيجة تجريبية', category: 'خدمات مالية',
    phone: 'الهاتف', website: 'الموقع الإلكتروني', location: 'الموقع', city: 'نواكشوط، موريتانيا', nearby: 'وكالات قريبة', nearbyCount: '3 وكالات قريبة', nearest: 'الأقرب',
    call: 'اتصال', whatsapp: 'واتساب', directions: 'الاتجاهات', ok: 'حسنًا', note: 'بيانات تجريبية للنسخة الأولى.',
    unavailableTitle: 'هذه الخدمة غير متاحة حاليًا.', unavailableText: 'يرجى طلب إضافتها من فريق لواد.', request: 'طلب الإضافة',
    requestedTitle: 'تم تجهيز الطلب', requestedText: 'تم تجهيز طلبك. سيتمكن فريق لواد قريبًا من استلام هذا النوع من الطلبات.', reset: 'بحث جديد',
    version: 'الإصدار 1.0.0', by: 'By Wasla', mapLabel: 'خريطة توضيحية لوكالات Bankily',
  },
  en: {
    title: 'Public search', language: 'Choose language', menu: 'Open menu', closeMenu: 'Close menu',
    items: { profile: 'Profile', contact: 'Contact', settings: 'Settings', search: 'Search', recharge: 'Recharge my account' },
    welcome: 'What are you looking for today?', description: 'Search for a local service, agency or business in Mauritania.',
    input: 'Search for a service', placeholder: 'E.g. Bankily, pharmacy, restaurant…', submit: 'Search', examples: 'Examples',
    chips: ['Bankily', 'Pharmacy', 'Gym', 'Restaurant'], initialTitle: 'Start your search', initialText: 'Try Lewad without an account using a local service.',
    empty: 'Please enter a service name.', loading: 'Searching…', demo: 'Demo result', category: 'Financial services',
    phone: 'Phone', website: 'Website', location: 'Location', city: 'Nouakchott, Mauritania', nearby: 'Nearby agencies', nearbyCount: '3 nearby agencies', nearest: 'Nearest',
    call: 'Call', whatsapp: 'WhatsApp', directions: 'Directions', ok: 'OK', note: 'Demo data for V1.',
    unavailableTitle: 'This service is not available yet.', unavailableText: 'Please ask the Lewad team to add it.', request: 'Request addition',
    requestedTitle: 'Request prepared', requestedText: 'Your request has been prepared. The Lewad team will soon be able to receive this type of request.', reset: 'New search',
    version: 'Version 1.0.0', by: 'By Wasla', mapLabel: 'Illustrative map of Bankily agencies',
  },
} as const

const agencies = [
  { name: 'Tevragh Zeina', distance: '1.2 km' },
  { name: 'Ksar', distance: '2.4 km' },
  { name: 'Arafat', distance: '4.8 km' },
] as const

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase()
}

function AppDemoNavbar({ onSearch }: { onSearch: () => void }) {
  const { locale, setLocale, t } = useI18n()
  const { theme, toggleTheme } = useTheme()
  const copy = appCopy[locale]
  const [menuOpen, setMenuOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const langRef = useRef<HTMLDivElement>(null)

  useDismiss(menuOpen, menuRef, () => setMenuOpen(false))
  useDismiss(langOpen, langRef, () => setLangOpen(false))

  const items: { id: keyof typeof copy.items; href: string; icon: IconName }[] = [
    { id: 'profile', href: '#app-search', icon: 'user' },
    { id: 'contact', href: '/#contact', icon: 'message' },
    { id: 'settings', href: '#app-search', icon: 'info' },
    { id: 'search', href: '#app-search', icon: 'search' },
    { id: 'recharge', href: '#app-search', icon: 'wallet' },
  ]

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/90 backdrop-blur-md">
      <div className={`${wrap} grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-2 sm:h-[72px]`}>
        <a href="/" aria-label="Lewad" className="w-max rounded-lg"><Logo /></a>

        <div className="flex items-center gap-2">
          <div className="relative" ref={langRef}>
            <button type="button" className={`${iconBtn} w-auto gap-1.5 px-2.5 text-xs font-bold`} aria-label={copy.language} aria-expanded={langOpen} aria-haspopup="true" onClick={() => { setLangOpen((open) => !open); setMenuOpen(false) }}>
              <Icon name="globe" size={18} />
              <span aria-hidden="true">{dictionaries[locale].meta.short}</span>
            </button>
            {langOpen && <ul className="absolute start-1/2 top-[calc(100%+8px)] z-50 w-40 -translate-x-1/2 list-none rounded-xl border border-line bg-surface p-1.5 shadow-lg shadow-black/10 rtl:translate-x-1/2">
              {locales.map((item) => <li key={item}><button type="button" lang={item} aria-current={item === locale} onClick={() => { setLocale(item); setLangOpen(false) }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-start text-sm ${item === locale ? 'bg-surface-2 font-semibold text-ink' : 'text-muted hover:bg-surface-2'}`}>
                {dictionaries[item].meta.label}{item === locale && <Icon name="check" size={15} />}
              </button></li>)}
            </ul>}
          </div>
          <button type="button" className={iconBtn} onClick={toggleTheme} aria-label={theme === 'light' ? t.nav.toDark : t.nav.toLight}><Icon name={theme === 'light' ? 'moon' : 'sun'} size={18} /></button>
        </div>

        <div className="relative justify-self-end" ref={menuRef}>
          <button type="button" className={iconBtn} aria-label={menuOpen ? copy.closeMenu : copy.menu} aria-expanded={menuOpen} aria-haspopup="true" aria-controls="app-demo-menu" onClick={() => { setMenuOpen((open) => !open); setLangOpen(false) }}><Icon name={menuOpen ? 'close' : 'menu'} size={19} /></button>
          {menuOpen && <nav id="app-demo-menu" aria-label={copy.menu} className="absolute end-0 top-[calc(100%+8px)] z-50 w-64 rounded-2xl border border-line bg-surface p-1.5 shadow-xl shadow-black/10">
            <ul className="list-none">{items.map((item) => <li key={item.id}><a href={item.href} onClick={() => { setMenuOpen(false); if (item.id === 'search') window.setTimeout(onSearch, 0) }} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-ink-soft transition-colors hover:bg-surface-2 hover:text-ink"><Icon name={item.icon} size={18} />{copy.items[item.id]}</a></li>)}</ul>
          </nav>}
        </div>
      </div>
    </header>
  )
}

function MockMap({ copy }: { copy: (typeof appCopy)[Locale] }) {
  return <div className="relative min-h-72 overflow-hidden rounded-2xl border border-line bg-[#dcebd2] dark:bg-[#1b2d24]" role="img" aria-label={copy.mapLabel}>
    <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(30deg,transparent_45%,rgba(48,92,55,.32)_46%,rgba(48,92,55,.32)_49%,transparent_50%),linear-gradient(120deg,transparent_42%,rgba(255,255,255,.8)_43%,rgba(255,255,255,.8)_47%,transparent_48%),radial-gradient(rgba(43,74,60,.35)_1px,transparent_1px)] [background-size:170px_110px,210px_170px,13px_13px]" />
    <svg className="absolute inset-0 size-full" viewBox="0 0 440 310" fill="none" aria-hidden="true"><path d="M61 242C122 213 125 155 196 173c59 15 92-76 182-112" stroke="rgba(43,74,60,.58)" strokeWidth="5" strokeDasharray="9 8" /><path d="M61 242C122 213 125 155 196 173c59 15 92-76 182-112" stroke="rgba(255,253,248,.82)" strokeWidth="2" /></svg>
    <span className="absolute start-[11%] top-[70%] grid size-9 place-items-center rounded-full border-4 border-surface bg-brand-deep text-brand"><Icon name="pin" size={17} /></span>
    <span className="absolute start-[43%] top-[48%] grid size-9 place-items-center rounded-full border-4 border-surface bg-[#6a65c9] text-white"><Icon name="pin" size={17} /></span>
    <span className="absolute end-[12%] top-[18%] grid size-9 place-items-center rounded-full border-4 border-surface bg-[#ce8e62] text-white"><Icon name="pin" size={17} /></span>
    <span className="absolute start-4 top-4 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-bold text-ink shadow-sm">{copy.nearbyCount}</span>
    <span className="absolute bottom-4 end-4 rounded-full border border-white/60 bg-surface/90 px-3 py-1.5 text-xs font-bold text-ink shadow-sm">{copy.nearest} · Tevragh Zeina</span>
  </div>
}

export function PublicSearchDemo() {
  const { locale } = useI18n()
  const copy = appCopy[locale]
  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState>('initial')
  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(() => {
    document.title = `${copy.title} — Lewad`
  }, [copy.title])
  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current) }, [])

  const focusSearch = () => inputRef.current?.focus()
  const runSearch = (raw = query) => {
    const value = normalize(raw)
    if (!value) { setState('validation'); focusSearch(); return }
    if (timerRef.current) window.clearTimeout(timerRef.current)
    setState('loading')
    timerRef.current = window.setTimeout(() => setState(value === 'bankily' || value === 'bankilly' ? 'found' : 'unavailable'), 420)
  }
  const reset = () => { setQuery(''); setState('initial'); window.setTimeout(focusSearch, 0) }

  return <div className="min-h-screen bg-page text-ink">
    <AppDemoNavbar onSearch={focusSearch} />
    <a href="#app-search" className="sr-only focus:not-sr-only focus:fixed focus:start-3 focus:top-3 focus:z-60 focus:rounded-lg focus:bg-brand focus:px-4 focus:py-2.5 focus:text-sm focus:font-semibold focus:text-brand-ink">{copy.input}</a>
    <main id="app-search" className={`${wrap} py-10 sm:py-14 lg:py-18`}>
      <section className="mx-auto max-w-4xl" aria-labelledby="app-demo-title">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] text-muted uppercase rtl:tracking-normal rtl:normal-case"><span className="size-1.5 rounded-full bg-brand-deep dark:bg-brand" />Lewad V1</span>
          <h1 id="app-demo-title" className="mt-5 text-4xl leading-[1.08] font-bold tracking-[-0.045em] text-ink sm:text-5xl">{copy.welcome}</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-muted sm:text-lg">{copy.description}</p>
        </div>

        <form className="mt-8" onSubmit={(event) => { event.preventDefault(); runSearch() }} noValidate>
          <label htmlFor="service-search" className="mb-2 block text-sm font-semibold text-ink">{copy.input}</label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1"><Icon name="search" size={20} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" /><input ref={inputRef} id="service-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={copy.placeholder} className="h-12 w-full rounded-xl border border-line bg-surface py-3 pe-4 ps-11 text-base text-ink shadow-sm outline-none placeholder:text-muted focus:border-brand-deep" autoComplete="off" /></div>
            <button className={`${btnPrimary} h-12 sm:min-w-35`} type="submit" disabled={state === 'loading'}>{state === 'loading' ? copy.loading : <><Icon name="search" size={18} />{copy.submit}</>}</button>
          </div>
          {state === 'validation' && <p className="mt-3 flex items-center gap-2 rounded-xl border border-ask/25 bg-ask-bg px-3 py-2.5 text-sm font-medium text-ask" role="alert"><Icon name="alert" size={17} />{copy.empty}</p>}
        </form>

        <div className="mt-5 flex flex-wrap items-center gap-2"><span className="me-1 text-xs font-semibold text-muted">{copy.examples}</span>{copy.chips.map((chip) => <button type="button" key={chip} onClick={() => { setQuery(chip); runSearch(chip) }} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-soft transition-colors hover:border-brand-deep hover:bg-brand-soft">{chip}</button>)}</div>

        <div className="mt-10" aria-live="polite">
          {(state === 'initial' || state === 'validation') && <section className={`${card} grid min-h-48 place-items-center border-dashed px-6 py-10 text-center`}><div><span className="mx-auto grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-deep"><Icon name="search" size={21} /></span><h2 className="mt-4 text-xl font-bold">{copy.initialTitle}</h2><p className="mt-2 max-w-sm text-sm leading-6 text-muted">{copy.initialText}</p></div></section>}
          {state === 'loading' && <section className={`${card} overflow-hidden p-5 sm:p-7`} role="status"><div className="h-5 w-40 animate-pulse rounded bg-surface-2" /><div className="mt-5 grid gap-4 lg:grid-cols-2"><div className="h-58 animate-pulse rounded-2xl bg-surface-2" /><div className="h-58 animate-pulse rounded-2xl bg-surface-2" /></div><span className="sr-only">{copy.loading}</span></section>}
          {state === 'found' && <BankilyResult copy={copy} onReset={reset} />}
          {state === 'unavailable' && <section className={`${card} p-6 sm:p-8`}><span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-deep"><Icon name="search" size={21} /></span><h2 className="mt-5 text-2xl font-bold tracking-tight">{copy.unavailableTitle}</h2><p className="mt-2 max-w-xl text-base leading-7 text-muted">{copy.unavailableText}</p><button type="button" className={`${btnPrimary} mt-6`} onClick={() => setState('requested')}><Icon name="plus" size={18} />{copy.request}</button></section>}
          {state === 'requested' && <section className={`${card} border-answer/25 bg-answer-bg p-6 sm:p-8`} role="status"><span className="grid size-11 place-items-center rounded-xl bg-answer text-white"><Icon name="check" size={22} /></span><h2 className="mt-5 text-2xl font-bold tracking-tight">{copy.requestedTitle}</h2><p className="mt-2 max-w-xl text-base leading-7 text-ink-soft">{copy.requestedText}</p><button type="button" className={`${btnGhost} mt-6`} onClick={reset}>{copy.reset}</button></section>}
        </div>
      </section>
    </main>
    <footer className="border-t border-line"><div className={`${wrap} flex flex-wrap items-center justify-between gap-3 py-5 text-sm text-muted`}><span className="tabular">{copy.version}</span><span className="font-semibold text-ink-soft">{copy.by}</span></div></footer>
  </div>
}

function BankilyResult({ copy, onReset }: { copy: (typeof appCopy)[Locale]; onReset: () => void }) {
  return <article className={`${card} overflow-hidden`} aria-label="Bankily">
    <div className="border-b border-line p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-brand text-brand-ink"><Icon name="wallet" size={24} /></span><div><span className="text-xs font-bold tracking-[0.08em] text-muted uppercase rtl:tracking-normal rtl:normal-case">{copy.demo}</span><h2 className="mt-1 text-2xl font-bold tracking-tight">Bankily</h2><p className="mt-1 text-sm text-muted">{copy.category}</p></div></div><span className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink">{copy.nearbyCount}</span></div></div>
    <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[.9fr_1.1fr]">
      <div><dl className="grid gap-3 text-sm"><div className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-3"><Icon name="phone" size={18} className="text-brand-deep dark:text-brand" /><div><dt className="text-xs font-semibold text-muted">{copy.phone}</dt><dd className="ltr-isolate mt-0.5 font-semibold text-ink">+222 36 XX XX XX</dd></div></div><div className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-3"><Icon name="message" size={18} className="text-brand-deep dark:text-brand" /><div><dt className="text-xs font-semibold text-muted">WhatsApp</dt><dd className="ltr-isolate mt-0.5 font-semibold text-ink">+222 36 XX XX XX</dd></div></div><div className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-3"><Icon name="globe" size={18} className="text-brand-deep dark:text-brand" /><div><dt className="text-xs font-semibold text-muted">{copy.website}</dt><dd className="ltr-isolate mt-0.5 font-semibold text-ink">bankily.mr</dd></div></div><div className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-3"><Icon name="pin" size={18} className="text-brand-deep dark:text-brand" /><div><dt className="text-xs font-semibold text-muted">{copy.location}</dt><dd className="mt-0.5 font-semibold text-ink">{copy.city}</dd></div></div></dl>
        <div className="mt-5 grid grid-cols-2 gap-2"><a className={btnPrimary} href="tel:+22236000000"><Icon name="phone" size={17} />{copy.call}</a><a className={btnGhost} href="https://wa.me/22236000000" target="_blank" rel="noreferrer"><Icon name="message" size={17} />{copy.whatsapp}</a><a className={`${btnGhost} col-span-2`} href="#nearby-agencies"><Icon name="route" size={17} />{copy.directions}</a></div>
      </div>
      <MockMap copy={copy} />
    </div>
    <div id="nearby-agencies" className="border-t border-line bg-page-alt p-5 sm:p-7"><div className="flex items-center justify-between gap-3"><h3 className="text-base font-bold">{copy.nearby}</h3><span className="text-xs font-semibold text-muted">{copy.nearbyCount}</span></div><ol className="mt-4 grid gap-2 sm:grid-cols-3">{agencies.map((agency, index) => <li key={agency.name} className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-3"><span className={`size-2.5 rounded-full ${index === 0 ? 'bg-brand-deep dark:bg-brand' : index === 1 ? 'bg-[#6a65c9]' : 'bg-[#ce8e62]'}`} /><div><p className="text-sm font-semibold text-ink">{agency.name}</p><p className="mt-0.5 text-xs text-muted">{agency.distance}</p></div></li>)}</ol></div>
    <div className="flex flex-col gap-4 border-t border-line p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7"><p className="flex items-center gap-2 text-sm text-muted"><Icon name="info" size={17} />{copy.note}</p><button type="button" className={btnPrimary} onClick={onReset}>{copy.ok}<Icon name="check" size={17} /></button></div>
  </article>
}

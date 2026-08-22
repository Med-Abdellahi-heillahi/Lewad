import { type KeyboardEvent, useEffect, useMemo, useRef, useState, lazy, Suspense } from 'react'
import { type Locale, useI18n } from '../i18n'
import { type Db2Branch, type Db2Establishment } from '../lib/db2'
import { searchServicesWithCredit } from '../lib/db3a'
import { createMissingServiceRequest } from '../lib/db3b'
import { formatNumber } from '../lib/format'
import { isAdminRole } from '../lib/routeAuth'
import { findClosestSearchMatch, normalizeSearchText } from '../lib/searchMatching'
import { SUGGESTION_MIN_LENGTH, type ServiceSuggestion, suggestServices } from '../lib/searchSuggestions'
import { appPad, appWrap, btnGhost, btnPrimary, card } from '../lib/ui'
import { useAccount } from '../hooks/useAccount'
import { Icon, type IconName } from './Icon'
import { AppShell } from './shell/AppShell'
import { hasCoordinates, directionsUrl } from './maps/mapUtils'
const ServiceMapSheet = lazy(() => import('./maps/ServiceMapSheet').then((m) => ({ default: m.ServiceMapSheet })))

type SearchState = 'initial' | 'loading' | 'found' | 'unavailable' | 'insufficient' | 'requested'
type ValidationMessage = 'empty' | 'minimum' | null
type RequestState = 'idle' | 'loading' | 'created' | 'duplicate' | 'error'

const appCopy = {
  fr: {
    title: 'Recherche', language: 'Choisir la langue', menu: 'Ouvrir le menu', closeMenu: 'Fermer le menu',
    items: { profile: 'Profil', credits: 'Crédits', contact: 'Contact', settings: 'Paramètres', search: 'Recherche', recharge: 'Recharger' },
    auth: 'Connexion', signOut: 'Se déconnecter', account: 'Mon compte', greeting: 'Bonjour',
    pointsUnit: 'points', pointsUnavailable: 'Points indisponibles',
    welcome: 'Que cherchez-vous aujourd’hui ?', description: 'Recherchez un service, une agence ou un établissement local en Mauritanie.',
    input: 'Rechercher un service', placeholder: 'Ex. Bankily, pharmacie, restaurant…', submit: 'Rechercher', examples: 'Exemples',
    chips: ['Bankily', 'Pharmacie', 'Salle de sport', 'Restaurant'], initialTitle: 'Commencez votre recherche', initialText: 'Recherchez un service local.',
    empty: 'Veuillez saisir le nom d’un service.', minimum: 'Saisissez au moins 2 caractères pour lancer la recherche.', loading: 'Recherche en cours…',
    dataFromLewad: 'Données Lewad', verified: 'Vérifié', categoryUnavailable: 'Catégorie non renseignée',
    phone: 'Téléphone', website: 'Site web', location: 'Localisation', nearby: 'Agences', agenciesFound: 'agences trouvées', nearest: 'La plus proche', mainBranch: 'Agence principale',
    call: 'Appeler', whatsapp: 'WhatsApp', directions: 'Voir les agences', ok: 'Nouvelle recherche', notAvailable: 'Non renseigné', noBranches: 'Aucune agence active disponible.', branchesError: 'Les agences sont momentanément indisponibles.',
    unavailableTitle: 'Ce service n’est pas encore disponible sur Lewad.', unavailableText: 'Vous pouvez préparer une demande pour que notre équipe l’ajoute.', request: 'Demander l’ajout',
    searchErrorTitle: 'La recherche est momentanément indisponible.', searchErrorText: 'Réessayez dans quelques instants.',
    insufficientTitle: 'Points insuffisants', insufficientText: 'Vous n’avez pas assez de points pour effectuer cette recherche.', recharge: 'Recharger mes points', debitNotice: '1 point a été utilisé pour cette recherche.', unlimitedMode: 'Mode admin : recherches illimitées', unlimitedNotice: 'Recherche illimitée — aucun point débité.',
    balance: 'Solde', currentBalance: 'Solde actuel', costPerSearch: '1 point = 1 recherche.', emptyWallet: 'Vous n’avez plus de points. Rechargez votre compte pour continuer vos recherches.', viewCredits: 'Voir mes crédits', searchedQuery: '« {query} »',
    requesting: 'Envoi de la demande…', retryRequest: 'Réessayer', requestError: 'Impossible d’envoyer la demande pour le moment.',
    requestedTitle: 'Demande envoyée', requestedText: 'Votre demande a été envoyée à l’équipe Lewad.', requestDuplicateTitle: 'Demande déjà en attente', requestDuplicateText: 'Une demande pour ce service est déjà en attente.', reset: 'Nouvelle recherche',
    version: 'Version 1.0.0', by: 'By Wasla', mapLabel: 'Carte illustrative des agences',
    nearbyPlace: 'Lieu proche', viewOnMap: 'Voir sur la carte', directionsLink: 'Itinéraire', locationUnavailable: 'Localisation exacte non disponible',
    mapSheetTitle: 'Emplacement', mapCloseLabel: 'Fermer la carte', mapLoading: 'Chargement de la carte…',
    mapUnavailable: "La carte n'a pas pu être chargée.", openExternalMap: 'Ouvrir dans une carte',
  },
  ar: {
    title: 'البحث', language: 'اختيار اللغة', menu: 'فتح القائمة', closeMenu: 'إغلاق القائمة',
    items: { profile: 'الملف الشخصي', credits: 'النقاط', contact: 'التواصل', settings: 'الإعدادات', search: 'بحث', recharge: 'شحن' },
    auth: 'تسجيل الدخول', signOut: 'تسجيل الخروج', account: 'حسابي', greeting: 'مرحبًا',
    pointsUnit: 'نقاط', pointsUnavailable: 'النقاط غير متاحة',
    welcome: 'ماذا تبحث عنه اليوم؟', description: 'ابحث عن خدمة أو وكالة أو مؤسسة محلية في موريتانيا.',
    input: 'ابحث عن خدمة', placeholder: 'مثال: Bankily أو صيدلية أو مطعم…', submit: 'ابحث', examples: 'أمثلة',
    chips: ['بنكيلي', 'صيدلية', 'قاعة رياضة', 'مطعم'], initialTitle: 'ابدأ بحثك', initialText: 'ابحث عن خدمة محلية.',
    empty: 'يرجى إدخال اسم خدمة.', minimum: 'أدخل حرفين على الأقل لبدء البحث.', loading: 'جارٍ البحث…',
    dataFromLewad: 'بيانات لواد', verified: 'موثّق', categoryUnavailable: 'فئة غير محددة',
    phone: 'الهاتف', website: 'الموقع الإلكتروني', location: 'الموقع', nearby: 'الوكالات', agenciesFound: 'وكالات موجودة', nearest: 'الأقرب', mainBranch: 'الوكالة الرئيسية',
    call: 'اتصال', whatsapp: 'واتساب', directions: 'عرض الوكالات', ok: 'بحث جديد', notAvailable: 'غير متاح', noBranches: 'لا توجد وكالة نشطة حاليًا.', branchesError: 'الوكالات غير متاحة مؤقتًا.',
    unavailableTitle: 'هذه الخدمة غير متاحة بعد على لواد.', unavailableText: 'يمكنك تجهيز طلب ليضيفها فريقنا.', request: 'طلب الإضافة',
    searchErrorTitle: 'البحث غير متاح مؤقتًا.', searchErrorText: 'حاول مرة أخرى بعد قليل.',
    insufficientTitle: 'النقاط غير كافية', insufficientText: 'ليس لديك نقاط كافية لإجراء هذا البحث.', recharge: 'شحن نقاطي', debitNotice: 'تم استخدام نقطة واحدة لهذا البحث.', unlimitedMode: 'وضع الإدارة: بحث غير محدود', unlimitedNotice: 'بحث غير محدود — لم يتم خصم أي نقطة.',
    balance: 'الرصيد', currentBalance: 'الرصيد الحالي', costPerSearch: 'نقطة واحدة = عملية بحث واحدة.', emptyWallet: 'لم تعد لديك نقاط. أعد شحن حسابك لمتابعة البحث.', viewCredits: 'عرض نقاطي', searchedQuery: '«‏ {query} ‏»',
    requesting: 'جارٍ إرسال الطلب…', retryRequest: 'أعد المحاولة', requestError: 'تعذّر إرسال الطلب حاليًا.',
    requestedTitle: 'تم إرسال الطلب', requestedText: 'تم إرسال طلبك إلى فريق لواد.', requestDuplicateTitle: 'الطلب قيد الانتظار بالفعل', requestDuplicateText: 'يوجد طلب قيد الانتظار لهذه الخدمة بالفعل.', reset: 'بحث جديد',
    version: 'الإصدار 1.0.0', by: 'By Wasla', mapLabel: 'خريطة توضيحية للوكالات',
    nearbyPlace: 'المكان القريب', viewOnMap: 'عرض على الخريطة', directionsLink: 'الاتجاهات', locationUnavailable: 'الموقع الدقيق غير متوفر',
    mapSheetTitle: 'الموقع', mapCloseLabel: 'إغلاق الخريطة', mapLoading: 'جارٍ تحميل الخريطة…',
    mapUnavailable: 'تعذر تحميل الخريطة.', openExternalMap: 'فتح في الخرائط',
  },
  en: {
    title: 'Search', language: 'Choose language', menu: 'Open menu', closeMenu: 'Close menu',
    items: { profile: 'Profile', credits: 'Credits', contact: 'Contact', settings: 'Settings', search: 'Search', recharge: 'Recharge' },
    auth: 'Sign in', signOut: 'Sign out', account: 'My account', greeting: 'Hello',
    pointsUnit: 'points', pointsUnavailable: 'Points unavailable',
    welcome: 'What are you looking for today?', description: 'Search for a local service, agency or business in Mauritania.',
    input: 'Search for a service', placeholder: 'E.g. Bankily, pharmacy, restaurant…', submit: 'Search', examples: 'Examples',
    chips: ['Bankily', 'Pharmacy', 'Gym', 'Restaurant'], initialTitle: 'Start your search', initialText: 'Search for a local service.',
    empty: 'Please enter a service name.', minimum: 'Enter at least 2 characters to search.', loading: 'Searching…',
    dataFromLewad: 'Lewad data', verified: 'Verified', categoryUnavailable: 'Category unavailable',
    phone: 'Phone', website: 'Website', location: 'Location', nearby: 'Agencies', agenciesFound: 'agencies found', nearest: 'Nearest', mainBranch: 'Main agency',
    call: 'Call', whatsapp: 'WhatsApp', directions: 'View agencies', ok: 'New search', notAvailable: 'Not available', noBranches: 'No active agency is available.', branchesError: 'Agencies are temporarily unavailable.',
    unavailableTitle: 'This service is not available on Lewad yet.', unavailableText: 'You can prepare a request for our team to add it.', request: 'Request addition',
    searchErrorTitle: 'Search is temporarily unavailable.', searchErrorText: 'Please try again in a moment.',
    insufficientTitle: 'Insufficient points', insufficientText: 'You do not have enough points to run this search.', recharge: 'Recharge my points', debitNotice: '1 point was used for this search.', unlimitedMode: 'Admin mode: unlimited searches', unlimitedNotice: 'Unlimited search — no point was debited.',
    balance: 'Balance', currentBalance: 'Current balance', costPerSearch: '1 point = 1 search.', emptyWallet: 'You have no points left. Recharge your account to continue searching.', viewCredits: 'View my credits', searchedQuery: '“{query}”',
    requesting: 'Sending request…', retryRequest: 'Try again', requestError: 'Unable to send the request right now.',
    requestedTitle: 'Request sent', requestedText: 'Your request was sent to the Lewad team.', requestDuplicateTitle: 'Request already pending', requestDuplicateText: 'A request for this service is already pending.', reset: 'New search',
    version: 'Version 1.0.0', by: 'By Wasla', mapLabel: 'Illustrative agency map',
    nearbyPlace: 'Nearby place', viewOnMap: 'View on map', directionsLink: 'Directions', locationUnavailable: 'Exact location unavailable',
    mapSheetTitle: 'Location', mapCloseLabel: 'Close the map', mapLoading: 'Loading the map…',
    mapUnavailable: 'The map could not be loaded.', openExternalMap: 'Open in maps',
  },
} as const

type AppCopy = (typeof appCopy)[Locale]

const pinPositions = ['start-[11%] top-[70%]', 'start-[43%] top-[48%]', 'end-[12%] top-[18%]'] as const
const pinColors = ['bg-brand text-brand-ink', 'bg-[var(--pin-2)] text-white', 'bg-[var(--pin-3)] text-white'] as const

function formatLocation(branch: Db2Branch | undefined, fallback: string) {
  if (!branch) return fallback
  return branch.neighborhood ?? branch.address ?? branch.city ?? fallback
}

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^+\d]/g, '')}`
}

function isActionablePhone(phone: string) {
  return /^[+\d\s().-]+$/.test(phone) && phone.replace(/\D/g, '').length >= 8
}

function whatsappHref(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, '')}`
}

function websiteHref(website: string) {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`
}

function MockMap({ copy, branches }: { copy: AppCopy; branches: Db2Branch[] }) {
  const mappableBranches = branches.filter((branch) => branch.latitude !== null && branch.longitude !== null).slice(0, 3)
  const nearestBranch = branches.find((branch) => branch.is_main) ?? branches[0]

  return <div className="relative min-h-72 overflow-hidden rounded-2xl border border-line bg-[var(--map-bg)]" role="img" aria-label={copy.mapLabel}>
    <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(30deg,transparent_45%,var(--map-line)_46%,var(--map-line)_49%,transparent_50%),linear-gradient(120deg,transparent_42%,var(--map-road)_43%,var(--map-road)_47%,transparent_48%),radial-gradient(var(--map-line)_1px,transparent_1px)] [background-size:170px_110px,210px_170px,13px_13px]" />
    <svg className="absolute inset-0 size-full" viewBox="0 0 440 310" fill="none" aria-hidden="true"><path d="M61 242C122 213 125 155 196 173c59 15 92-76 182-112" stroke="var(--map-line)" strokeWidth="5" strokeDasharray="9 8" /><path d="M61 242C122 213 125 155 196 173c59 15 92-76 182-112" stroke="var(--map-road)" strokeWidth="2" /></svg>
    {mappableBranches.map((branch, index) => <span key={branch.id} title={branch.name} className={`absolute grid size-9 place-items-center rounded-full border-4 border-surface ${pinPositions[index]} ${pinColors[index]}`}><Icon name="pin" size={17} /></span>)}
    <span className="absolute start-4 top-4 rounded-full bg-surface/90 px-3 py-1.5 text-xs font-bold text-ink shadow-sm">{branches.length} {copy.agenciesFound}</span>
    {nearestBranch && <span className="absolute bottom-4 end-4 max-w-[72%] truncate rounded-full border border-line bg-surface/90 px-3 py-1.5 text-xs font-bold text-ink shadow-sm">{copy.nearest} · {nearestBranch.name}</span>}
  </div>
}

/**
 * Panneau de solde. C'est le contrat de la recherche : ce qu'il reste, ce
 * qu'une recherche coûte, et comment recharger. Sur mobile il se glisse sous
 * le champ ; à partir de `lg` il occupe la colonne de droite.
 */
function WalletPanel({ copy, balance, loading, unlimited }: { copy: AppCopy; balance: number | null; loading: boolean; unlimited: boolean }) {
  const { locale } = useI18n()
  const empty = balance === 0

  return (
    <aside className={`${card} p-5`} aria-label={copy.balance}>
      <p className="text-xs font-semibold text-muted">{copy.balance}</p>

      {loading && balance === null ? (
        <span aria-hidden="true" className="mt-2 block h-9 w-28 rounded-lg bg-surface-2 motion-safe:animate-pulse" />
      ) : balance === null ? (
        <p className="mt-2 text-base font-semibold text-muted">{copy.pointsUnavailable}</p>
      ) : (
        <p className="mt-1 flex flex-wrap items-baseline gap-2">
          <span className="tabular text-3xl leading-none font-bold tracking-tight text-ink">{formatNumber(balance, locale)}</span>
          <span className="text-sm font-semibold text-muted">{copy.pointsUnit}</span>
        </p>
      )}

      {unlimited ? (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-answer/25 bg-answer-bg px-3 py-2.5 text-sm font-semibold leading-6 text-answer" role="status">
          <span className="mt-0.5 shrink-0">
            <Icon name="sparkle" size={16} />
          </span>
          {copy.unlimitedMode}
        </p>
      ) : (
        <p className="mt-3 flex items-start gap-2 text-sm leading-6 text-muted">
          <span className="mt-0.5 shrink-0 text-muted">
            <Icon name="info" size={16} />
          </span>
          {copy.costPerSearch}
        </p>
      )}

      {empty && !unlimited && (
        <p className="mt-3 flex items-start gap-2 rounded-xl border border-ask/25 bg-ask-bg px-3 py-2.5 text-sm font-medium text-ask" role="status">
          <span className="mt-0.5 shrink-0">
            <Icon name="alert" size={16} />
          </span>
          {copy.emptyWallet}
        </p>
      )}

      <div className="mt-4 grid gap-2">
        <a href="/recharge" className={`${empty && !unlimited ? btnPrimary : btnGhost} w-full`}>
          {copy.recharge}
        </a>
        <a href="/credits" className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-muted transition-colors hover:text-ink">
          {copy.viewCredits}
        </a>
      </div>
    </aside>
  )
}

/** Points épuisés : l'écran explique la situation et donne la seule sortie utile. */
function InsufficientCredits({ copy, balance }: { copy: AppCopy; balance: number | null }) {
  const { locale } = useI18n()

  return (
    <section className={`${card} p-6 sm:p-8`} role="status">
      <span className="grid size-11 place-items-center rounded-xl bg-ask-bg text-ask">
        <Icon name="wallet" size={21} />
      </span>
      <h2 className="mt-5 text-xl font-bold tracking-tight sm:text-2xl">{copy.insufficientTitle}</h2>
      <p className="mt-2 max-w-xl text-[15px] leading-7 text-muted sm:text-base">{copy.insufficientText}</p>

      <p className="mt-5 inline-flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm">
        <span className="font-semibold text-muted">{copy.currentBalance}</span>
        <span className="tabular font-bold text-ink">
          {balance === null ? copy.pointsUnavailable : `${formatNumber(balance, locale)} ${copy.pointsUnit}`}
        </span>
      </p>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <a href="/recharge" className={`${btnPrimary} w-full sm:w-auto`}>
          {copy.recharge}
          <span className="rtl:rotate-180">
            <Icon name="arrow" size={17} />
          </span>
        </a>
        <a href="/credits" className={`${btnGhost} w-full sm:w-auto`}>
          {copy.viewCredits}
        </a>
      </div>
    </section>
  )
}

export function PublicSearchDemo() {
  const { locale, t } = useI18n()
  const { wallet, profile, loading: accountLoading, refresh, applyWalletBalance } = useAccount()
  const copy = appCopy[locale]
  const searchCopy = t.appSearch
  const [query, setQuery] = useState('')
  const [state, setState] = useState<SearchState>('initial')
  const [validation, setValidation] = useState<ValidationMessage>(null)
  const [results, setResults] = useState<Db2Establishment[]>([])
  const [didYouMean, setDidYouMean] = useState<ServiceSuggestion | null>(null)
  const [suggestionsOpen, setSuggestionsOpen] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)
  const [debited, setDebited] = useState(false)
  const [unlimitedSearch, setUnlimitedSearch] = useState(false)
  const [lastNotFoundQuery, setLastNotFoundQuery] = useState<string | null>(null)
  const [lastSearchLogId, setLastSearchLogId] = useState<string | null>(null)
  const [requestState, setRequestState] = useState<RequestState>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionListRef = useRef<HTMLDivElement>(null)
  const searchIdRef = useRef(0)

  const [suggestions, setSuggestions] = useState<ServiceSuggestion[]>([])
  const [suggestionsLoading, setSuggestionsLoading] = useState(false)
  const suggestionQuery = useMemo(() => normalizeSearchText(query), [query])
  const hasSuggestionQuery = suggestionQuery.length >= SUGGESTION_MIN_LENGTH
  const balance = wallet?.balance ?? null
  const hasUnlimitedSearches = isAdminRole(profile?.role)
  const focusSearch = () => inputRef.current?.focus()
  const suggestionOptions = () =>
    Array.from(suggestionListRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [])

  /*
   * Navigation clavier dans la liste : flèches pour parcourir, Échap pour
   * revenir au champ. Sans cela, la seule façon de choisir une suggestion
   * serait la souris ou une longue série de tabulations.
   */
  const moveSuggestionFocus = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp' && event.key !== 'Escape') return
    event.preventDefault()

    if (event.key === 'Escape') {
      setSuggestionsOpen(false)
      focusSearch()
      return
    }

    const options = suggestionOptions()
    const current = options.indexOf(event.currentTarget)
    if (current === -1) return

    if (event.key === 'ArrowUp' && current === 0) {
      focusSearch()
      return
    }

    const next = event.key === 'ArrowDown' ? current + 1 : current - 1
    options[next]?.focus()
  }

  /*
   * Autocomplétion : `suggest_services` est en lecture seule et ne débite
   * jamais un point — seule la recherche soumise coûte un crédit. On attend
   * 220 ms après la dernière frappe pour ne pas lancer une requête par
   * caractère, et chaque réponse obsolète est ignorée via l'AbortController.
   */
  useEffect(() => {
    if (!hasSuggestionQuery) {
      setSuggestions([])
      setSuggestionsLoading(false)
      return
    }

    const controller = new AbortController()
    setSuggestionsLoading(true)

    const timer = window.setTimeout(() => {
      void suggestServices(suggestionQuery, controller.signal).then((response) => {
        if (controller.signal.aborted) return
        setSuggestions(response.items)
        setSuggestionsLoading(false)
      })
    }, 220)

    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [hasSuggestionQuery, suggestionQuery])

  const clearSearchState = () => {
    setResults([])
    setDidYouMean(null)
    setSearchFailed(false)
    setDebited(false)
    setUnlimitedSearch(false)
    setLastNotFoundQuery(null)
    setLastSearchLogId(null)
    setRequestState('idle')
  }

  const runSearch = async (raw = query) => {
    const requestedQuery = raw.trim()
    const normalizedQuery = normalizeSearchText(raw)
    const searchId = ++searchIdRef.current

    if (!normalizedQuery || normalizedQuery.length < 2) {
      clearSearchState()
      setValidation(normalizedQuery ? 'minimum' : 'empty')
      setState('initial')
      focusSearch()
      return
    }

    setValidation(null)
    setSuggestionsOpen(false)
    clearSearchState()
    setState('loading')
    const result = await searchServicesWithCredit(requestedQuery)

    if (searchId !== searchIdRef.current) return

    // The RPC debits atomically and returns the post-debit balance. Reflect it
    // immediately in the shared account state so the page and AppBar never
    // wait for a second network round-trip to show the new value.
    if (result.balance !== null) applyWalletBalance(result.balance)

    // Re-read the wallet after any debit (or a confirmed insufficient balance)
    // to keep the UI aligned with DB1 without ever mutating it from the client.
    if (result.debitedPoints > 0 || result.status === 'insufficient_credits') void refresh()

    if (result.status === 'invalid_query') {
      setValidation('minimum')
      setState('initial')
      return
    }

    if (result.status === 'insufficient_credits') {
      if (hasUnlimitedSearches || result.unlimited) {
        setSearchFailed(true)
        setState('unavailable')
        return
      }
      setState('insufficient')
      return
    }

    if (!result.ok || result.status === 'unauthenticated' || result.status === 'error') {
      setSearchFailed(true)
      setState('unavailable')
      return
    }

    setResults(result.results)
    setDebited(result.debitedPoints === 1)
    setUnlimitedSearch(result.unlimited)

    if (result.status === 'success' && result.results.length) {
      setState('found')
      return
    }

    setLastNotFoundQuery(requestedQuery)
    setLastSearchLogId(result.searchLogId)
    setState('unavailable')

    // La correction orthographique ne doit jamais proposer un nom qui n'existe
    // pas : cliquer « Oui » relance une recherche payante. On sonde donc les
    // vraies suggestions sur un préfixe court — la correspondance par
    // sous-chaîne vient d'échouer — puis on ne garde qu'un nom assez proche.
    const probe = await suggestServices(normalizedQuery.slice(0, 2))
    if (searchId !== searchIdRef.current) return
    setDidYouMean(findClosestSearchMatch(probe.items, normalizedQuery))
  }

  const handleRequestMissingService = async () => {
    if (!lastNotFoundQuery || requestState === 'loading') return

    setDidYouMean(null)
    setRequestState('loading')
    const result = await createMissingServiceRequest({
      query: lastNotFoundQuery,
      message: null,
      searchLogId: lastSearchLogId,
    })

    if (result.status === 'created' || result.status === 'duplicate') {
      setRequestState(result.status)
      setState('requested')
      return
    }

    setRequestState('error')
  }

  const reset = () => {
    searchIdRef.current += 1
    setQuery('')
    setValidation(null)
    setSuggestionsOpen(false)
    clearSearchState()
    setState('initial')
    window.setTimeout(focusSearch, 0)
  }

  /** Remplit le champ sans rien débiter : l'utilisateur lance la recherche lui-même. */
  const applySuggestion = (suggestion: ServiceSuggestion) => {
    setQuery(suggestion.name)
    setValidation(null)
    // On rend le focus AVANT de fermer : au clavier, l'option a le focus, et
    // `focusSearch()` déclenche le `onFocus` du champ qui rouvre la liste. En
    // fermant après, c'est bien la fermeture qui gagne.
    focusSearch()
    setSuggestionsOpen(false)
  }

  /** Action explicite « Oui » de la correction : là, la recherche payante est voulue. */
  const acceptDidYouMean = (suggestion: ServiceSuggestion) => {
    setQuery(suggestion.name)
    void runSearch(suggestion.name)
  }

  const didYouMeanLabel = didYouMean ? searchCopy.didYouMean.replace('{name}', didYouMean.name) : ''
  const searchedQueryLabel = lastNotFoundQuery ? copy.searchedQuery.replace('{query}', lastNotFoundQuery) : ''

  return (
    <AppShell active="search" documentTitle={copy.title} skipLabel={copy.input}>
      <main id="app-main" className={`${appWrap} ${appPad}`}>
        {/* Desktop : la recherche garde la colonne large, le solde tient une
            colonne dédiée qui reste visible pendant qu'on lit un résultat.
            Mobile : une seule colonne, le solde juste sous le champ. */}
        <div className="mx-auto max-w-3xl lg:grid lg:max-w-6xl lg:grid-cols-[minmax(0,1fr)_19rem] lg:items-start lg:gap-8">
          <header className="min-w-0 lg:col-start-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] text-muted uppercase rtl:tracking-normal rtl:normal-case">
              <span className="size-1.5 rounded-full bg-brand-deep dark:bg-brand" />
              Lewad V1
            </span>
            <h1 id="app-demo-title" className="mt-4 text-[30px] leading-[1.12] font-bold tracking-[-0.04em] text-ink sm:mt-5 sm:text-4xl">
              {copy.welcome}
            </h1>
            <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted sm:mt-4 sm:text-lg">{copy.description}</p>
          </header>

          <form
            className="mt-7 min-w-0 sm:mt-8 lg:col-start-1"
            onSubmit={(event) => {
              event.preventDefault()
              void runSearch()
            }}
            noValidate
          >
            <label htmlFor="service-search" className="mb-2 block text-sm font-semibold text-ink">
              {copy.input}
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
              <div className="relative flex-1">
                <Icon name="search" size={20} className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted" />
                <input
                  ref={inputRef}
                  id="service-search"
                  value={query}
                  onFocus={() => setSuggestionsOpen(true)}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    setValidation(null)
                    setDidYouMean(null)
                    setState('initial')
                    setSuggestionsOpen(true)
                  }}
                  placeholder={copy.placeholder}
                  className="h-13 w-full rounded-xl border border-line bg-surface py-3 pe-4 ps-11 text-base text-ink shadow-sm outline-none transition-colors placeholder:text-muted focus:border-brand-deep focus:ring-2 focus:ring-brand-deep/15"
                  autoComplete="off"
                  enterKeyHint="search"
                  aria-autocomplete="list"
                  aria-controls="service-suggestions"
                  aria-expanded={suggestionsOpen && hasSuggestionQuery}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      setSuggestionsOpen(false)
                      return
                    }
                    // Flèche bas : on entre dans la liste au clavier, sans souris.
                    if (event.key === 'ArrowDown' && suggestionsOpen && suggestions.length) {
                      event.preventDefault()
                      suggestionOptions()[0]?.focus()
                    }
                  }}
                />
                {suggestionsOpen && hasSuggestionQuery && (
                  <div
                    id="service-suggestions"
                    ref={suggestionListRef}
                    role="listbox"
                    aria-label={searchCopy.suggestions}
                    aria-busy={suggestionsLoading}
                    className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto overscroll-contain rounded-xl border border-line bg-surface p-1 shadow-lg"
                  >
                    <p className="px-3 py-2 text-xs font-bold tracking-[0.08em] text-muted uppercase rtl:tracking-normal rtl:normal-case">
                      {searchCopy.suggestions}
                    </p>
                    {suggestions.length ? (
                      suggestions.map((suggestion) => {
                        // En arabe, on affiche le nom arabe quand il existe : le
                        // lecteur ne doit pas devoir déchiffrer un nom latin.
                        const label = locale === 'ar' ? suggestion.nameAr ?? suggestion.name : suggestion.name
                        const context = [suggestion.categoryName, suggestion.neighborhood].filter(Boolean).join(' · ')

                        return (
                          <button
                            key={suggestion.id}
                            type="button"
                            role="option"
                            aria-selected={false}
                            className="flex min-h-11 w-full items-start gap-3 rounded-lg px-3 py-2 text-start transition-colors hover:bg-brand-soft focus:bg-brand-soft focus:outline-none"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => applySuggestion(suggestion)}
                            onKeyDown={(event) => moveSuggestionFocus(event)}
                          >
                            <Icon name="store" size={17} className="mt-0.5 shrink-0 text-brand-deep dark:text-brand" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink">{label}</span>
                              {context && <span className="block truncate text-xs font-medium text-muted">{context}</span>}
                            </span>
                          </button>
                        )
                      })
                    ) : suggestionsLoading ? (
                      <p className="px-3 py-3 text-sm text-muted">{searchCopy.suggestionsLoading}</p>
                    ) : (
                      <p className="px-3 py-3 text-sm text-muted">{searchCopy.noSuggestions}</p>
                    )}
                  </div>
                )}
              </div>
              <button className={`${btnPrimary} h-13 sm:min-w-36`} type="submit" disabled={state === 'loading'}>
                {state === 'loading' ? copy.loading : <><Icon name="search" size={18} />{copy.submit}</>}
              </button>
            </div>
            {validation && (
              <p className="mt-3 flex items-center gap-2 rounded-xl border border-ask/25 bg-ask-bg px-3.5 py-3 text-sm font-medium text-ask" role="alert">
                <Icon name="alert" size={17} />
                {copy[validation]}
              </p>
            )}
          </form>

          <div className="-mx-4 mt-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 lg:col-start-1">
            <span className="shrink-0 text-xs font-semibold text-muted">{copy.examples}</span>
            {copy.chips.map((chip) => (
              <button
                type="button"
                key={chip}
                onClick={() => {
                  setQuery(chip)
                  void runSearch(chip)
                }}
                className="min-h-11 shrink-0 rounded-full border border-line bg-surface px-4 text-sm text-ink transition-colors hover:border-brand-deep hover:bg-brand-soft"
              >
                {chip}
              </button>
            ))}
          </div>

          <div className="mt-6 min-w-0 sm:mt-8 lg:col-start-1" aria-live="polite">
            {state === 'initial' && (
              <section className={`${card} grid min-h-48 place-items-center border-dashed px-6 py-10 text-center`}>
                <div>
                  <span className="mx-auto grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-deep">
                    <Icon name="search" size={21} />
                  </span>
                  <h2 className="mt-4 text-xl font-bold">{copy.initialTitle}</h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{copy.initialText}</p>
                </div>
              </section>
            )}

            {state === 'loading' && (
              <section className={`${card} p-5 sm:p-7`} role="status" aria-busy="true">
                <span aria-hidden="true" className="block h-5 w-40 rounded bg-surface-2 motion-safe:animate-pulse" />
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <span aria-hidden="true" className="block h-52 rounded-2xl bg-surface-2 motion-safe:animate-pulse" />
                  <span aria-hidden="true" className="block h-52 rounded-2xl bg-surface-2 motion-safe:animate-pulse" />
                </div>
                <span className="sr-only">{copy.loading}</span>
              </section>
            )}

            {state === 'insufficient' && <InsufficientCredits copy={copy} balance={balance} />}

            {state === 'found' && (
              <div className="grid gap-4">
                {unlimitedSearch ? (
                  <p className="flex items-center gap-2 rounded-xl border border-answer/25 bg-answer-bg px-3.5 py-3 text-sm font-medium text-answer" role="status">
                    <Icon name="sparkle" size={17} />
                    {copy.unlimitedNotice}
                  </p>
                ) : debited && (
                  <p className="flex items-center gap-2 rounded-xl border border-answer/25 bg-answer-bg px-3.5 py-3 text-sm font-medium text-answer" role="status">
                    <Icon name="check" size={17} />
                    {copy.debitNotice}
                  </p>
                )}
                <div className="grid gap-6">
                  {results.map((establishment) => (
                    <EstablishmentResult key={establishment.id} establishment={establishment} copy={copy} onReset={reset} />
                  ))}
                </div>
              </div>
            )}

            {state === 'unavailable' && (
              <section className={`${card} p-6 sm:p-8`}>
                <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-deep">
                  <Icon name="search" size={21} />
                </span>

                {unlimitedSearch && (
                  <p className="mt-5 flex items-center gap-2 rounded-xl border border-answer/25 bg-answer-bg px-3.5 py-3 text-sm font-medium text-answer" role="status">
                    <Icon name="sparkle" size={17} />
                    {copy.unlimitedNotice}
                  </p>
                )}

                {didYouMean ? (
                  <>
                    <h2 className="mt-5 text-xl font-bold tracking-tight sm:text-2xl">{didYouMeanLabel}</h2>
                    <p className="mt-2 max-w-xl text-[15px] leading-7 text-muted sm:text-base">{searchCopy.demoNote}</p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <button type="button" className={`${btnPrimary} w-full sm:w-auto`} onClick={() => acceptDidYouMean(didYouMean)}>
                        {searchCopy.yes}
                      </button>
                      <button type="button" className={`${btnGhost} w-full sm:w-auto`} onClick={() => setDidYouMean(null)}>
                        {searchCopy.no}
                      </button>
                    </div>
                    {lastNotFoundQuery && (
                      <button type="button" className={`${btnGhost} mt-3 w-full sm:w-auto`} onClick={() => void handleRequestMissingService()}>
                        <Icon name="plus" size={18} />
                        {copy.request}
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    <h2 className="mt-5 text-xl font-bold tracking-tight sm:text-2xl">
                      {searchFailed ? copy.searchErrorTitle : copy.unavailableTitle}
                    </h2>

                    {/* Rappeler le terme cherché : l'utilisateur voit tout de
                        suite s'il s'agit d'une faute de frappe. */}
                    {!searchFailed && lastNotFoundQuery && (
                      <p dir="auto" className="mt-3 inline-flex max-w-full items-center gap-2 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm">
                        <span className="shrink-0 text-muted">
                          <Icon name="search" size={15} />
                        </span>
                        <span className="truncate font-semibold text-ink">{searchedQueryLabel}</span>
                      </p>
                    )}

                    <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted sm:text-base">
                      {searchFailed ? copy.searchErrorText : copy.unavailableText}
                    </p>

                    {requestState === 'error' && (
                      <p className="mt-4 flex items-center gap-2 text-sm font-medium text-ask" role="alert">
                        <Icon name="alert" size={17} />
                        {copy.requestError}
                      </p>
                    )}

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      {lastNotFoundQuery && (
                        <button
                          type="button"
                          className={`${btnPrimary} w-full sm:w-auto`}
                          disabled={requestState === 'loading'}
                          onClick={() => void handleRequestMissingService()}
                        >
                          <Icon name={requestState === 'loading' ? 'clock' : 'plus'} size={18} />
                          {requestState === 'loading' ? copy.requesting : requestState === 'error' ? copy.retryRequest : copy.request}
                        </button>
                      )}
                      <button type="button" className={`${btnGhost} w-full sm:w-auto`} onClick={reset}>
                        {copy.reset}
                      </button>
                    </div>
                  </>
                )}
              </section>
            )}

            {state === 'requested' && (
              <section className={`${card} border-answer/25 bg-answer-bg p-6 sm:p-8`} role="status">
                <span className="grid size-11 place-items-center rounded-xl bg-answer text-white">
                  <Icon name="check" size={22} />
                </span>
                <h2 className="mt-5 text-xl font-bold tracking-tight sm:text-2xl">
                  {requestState === 'duplicate' ? copy.requestDuplicateTitle : copy.requestedTitle}
                </h2>
                <p className="mt-2 max-w-xl text-[15px] leading-7 text-ink-soft sm:text-base">
                  {requestState === 'duplicate' ? copy.requestDuplicateText : copy.requestedText}
                </p>
                <button type="button" className={`${btnGhost} mt-6 w-full sm:w-auto`} onClick={reset}>
                  {copy.reset}
                </button>
              </section>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  )
}

function SimpleEstablishmentResult({
  copy,
  establishment,
  demoNote,
  onReset,
}: {
  copy: AppCopy
  establishment: Db2Establishment
  demoNote: string
  onReset: () => void
}) {
  return (
    <article className={`${card} p-5 sm:p-7`} aria-label={establishment.name}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand text-brand-ink">
            <Icon name="store" size={24} />
          </span>
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{establishment.name}</h2>
            <p className="mt-1 text-sm text-muted">{establishment.category?.name ?? copy.categoryUnavailable}</p>
          </div>
        </div>
        <span className="rounded-full border border-line bg-page-alt px-3 py-1.5 text-xs font-bold text-muted">
          {copy.notAvailable}
        </span>
      </div>
      <p className="mt-5 max-w-2xl text-sm leading-6 text-muted">{demoNote}</p>
      <button type="button" className={`${btnGhost} mt-6 w-full sm:w-auto`} onClick={onReset}>
        {copy.ok}
      </button>
    </article>
  )
}

function ContactRow({ copy, icon, label, value, href, external = false }: { copy: AppCopy; icon: IconName; label: string; value: string | null; href?: string; external?: boolean }) {
  return <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-3"><Icon name={icon} size={18} className="text-brand-deep dark:text-brand" /><div className="min-w-0"><dt className="text-xs font-semibold text-muted">{label}</dt><dd className="ltr-isolate mt-0.5 truncate font-semibold text-ink">{value ? (href ? <a className="hover:text-brand-deep hover:underline dark:hover:text-brand" href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>{value}</a> : value) : copy.notAvailable}</dd></div></div>
}

function EstablishmentResult({ copy, establishment, onReset }: { copy: AppCopy; establishment: Db2Establishment; onReset: () => void }) {
  const mainBranch = establishment.branches.find((branch) => branch.is_main) ?? establishment.branches[0]
  const phone = establishment.phone
  const whatsapp = establishment.whatsapp
  const canCall = Boolean(phone && isActionablePhone(phone))
  const canWhatsApp = Boolean(whatsapp && isActionablePhone(whatsapp))
  const [mapOpen, setMapOpen] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<Db2Branch | null>(null)
  const mappableBranches = establishment.branches.filter(hasCoordinates)
  const firstMappable = mappableBranches[0]
  const openMap = (branch: Db2Branch) => {
    setSelectedBranch(branch)
    setMapOpen(true)
  }

  return <article className={`${card} overflow-hidden`} aria-label={establishment.name}>
    <div className="border-b border-line p-5 sm:p-7"><div className="flex flex-wrap items-start justify-between gap-4"><div className="flex items-center gap-4"><span className="grid size-12 place-items-center rounded-2xl bg-brand text-brand-ink"><Icon name="store" size={24} /></span><div><span className="text-xs font-bold tracking-[0.08em] text-muted uppercase rtl:tracking-normal rtl:normal-case">{copy.dataFromLewad}</span><div className="mt-1 flex flex-wrap items-center gap-2"><h2 className="text-2xl font-bold tracking-tight">{establishment.name}</h2>{establishment.is_verified && <span className="inline-flex items-center gap-1 rounded-full bg-answer-bg px-2 py-1 text-xs font-bold text-answer"><Icon name="check" size={14} />{copy.verified}</span>}</div><p className="mt-1 text-sm text-muted">{establishment.category?.name ?? copy.categoryUnavailable}</p></div></div><span className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink">{establishment.branches.length} {copy.agenciesFound}</span></div>{establishment.description && <p className="mt-5 max-w-3xl text-sm leading-6 text-muted">{establishment.description}</p>}</div>
    <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[.9fr_1.1fr]"><div><dl className="grid gap-3"><ContactRow copy={copy} icon="phone" label={copy.phone} value={phone} href={canCall && phone ? phoneHref(phone) : undefined} /><ContactRow copy={copy} icon="message" label={copy.whatsapp} value={whatsapp} href={canWhatsApp && whatsapp ? whatsappHref(whatsapp) : undefined} external /><ContactRow copy={copy} icon="globe" label={copy.website} value={establishment.website} href={establishment.website ? websiteHref(establishment.website) : undefined} external /><ContactRow copy={copy} icon="pin" label={copy.location} value={formatLocation(mainBranch, copy.notAvailable)} /></dl>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {canCall && phone ? <a className={btnPrimary} href={phoneHref(phone)}><Icon name="phone" size={17} />{copy.call}</a> : <span className={`${btnPrimary} cursor-not-allowed opacity-50`}><Icon name="phone" size={17} />{copy.call}</span>}
          {canWhatsApp && whatsapp ? <a className={btnGhost} href={whatsappHref(whatsapp)} target="_blank" rel="noreferrer"><Icon name="message" size={17} />{copy.whatsapp}</a> : <span className={`${btnGhost} cursor-not-allowed opacity-50`}><Icon name="message" size={17} />{copy.whatsapp}</span>}
          {firstMappable && <button type="button" className={btnGhost} onClick={() => openMap(firstMappable)} aria-label={copy.viewOnMap}><Icon name="pin" size={17} />{copy.viewOnMap}</button>}
          {firstMappable && <a className={btnGhost} href={directionsUrl(firstMappable.latitude!, firstMappable.longitude!)} target="_blank" rel="noreferrer" aria-label={copy.directionsLink}><Icon name="route" size={17} />{copy.directionsLink}</a>}
        </div>
        {!firstMappable && <p className="mt-3 text-xs text-muted">{copy.locationUnavailable}</p>}
      </div>
      <div className="hidden lg:block"><div className="relative grid min-h-72 place-items-center overflow-hidden rounded-2xl border border-line bg-surface-2 p-4 text-center">{firstMappable ? <button type="button" className={`${btnGhost} flex-col`} onClick={() => openMap(firstMappable)} aria-label={copy.viewOnMap}><Icon name="pin" size={24} />{copy.viewOnMap}</button> : <p className="text-xs text-muted">{copy.locationUnavailable}</p>}</div></div>
    </div>
    <div id={`branches-${establishment.id}`} className="border-t border-line bg-page-alt p-5 sm:p-7"><div className="flex items-center justify-between gap-3"><h3 className="text-base font-bold">{copy.nearby}</h3><span className="text-xs font-semibold text-muted">{establishment.branches.length} {copy.agenciesFound}</span></div>{establishment.branchesError ? <p className="mt-4 text-sm text-muted">{copy.branchesError}</p> : establishment.branches.length ? <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{establishment.branches.map((branch, index) => <BranchCard key={branch.id} branch={branch} establishment={establishment} copy={copy} index={index} onViewMap={openMap} />)}</ol> : <p className="mt-4 text-sm text-muted">{copy.noBranches}</p>}</div>
    <div className="flex justify-end border-t border-line p-5 sm:p-7"><button type="button" className={btnPrimary} onClick={onReset}>{copy.ok}<Icon name="check" size={17} /></button></div>
    {mapOpen && <Suspense fallback={null}><ServiceMapSheet copy={copy} branches={establishment.branches} selectedBranchId={selectedBranch?.id} onClose={() => setMapOpen(false)} /></Suspense>}
  </article>
}

function BranchCard({ branch, establishment, copy, index, onViewMap }: { branch: Db2Branch; establishment: Db2Establishment; copy: AppCopy; index: number; onViewMap: (branch: Db2Branch) => void }) {
  const phone = branch.phone ?? establishment.phone
  const whatsapp = branch.whatsapp ?? establishment.whatsapp
  const mappable = hasCoordinates(branch)

  return <li className="rounded-xl border border-line bg-surface px-3 py-3"><div className="flex items-start gap-3"><span className={`mt-1 size-2.5 shrink-0 rounded-full ${pinColors[index % pinColors.length].split(' ')[0]}`} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-1.5"><p className="text-sm font-semibold text-ink">{branch.name}</p>{branch.is_main && <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand-deep dark:text-brand">{copy.mainBranch}</span>}</div><p className="mt-1 text-xs text-muted"><span className="font-semibold text-ink-soft">{copy.nearbyPlace}</span>{' · '}{formatLocation(branch, copy.notAvailable)}</p><p className="mt-2 ltr-isolate text-xs font-medium text-ink">{phone ?? copy.notAvailable}</p>{whatsapp && isActionablePhone(whatsapp) && <a className="mt-1 inline-block text-xs font-semibold text-brand-deep hover:underline dark:text-brand" href={whatsappHref(whatsapp)} target="_blank" rel="noreferrer">{copy.whatsapp}</a>}{mappable ? <div className="mt-3 grid grid-cols-2 gap-2"><button type="button" className={`${btnGhost} min-h-11 px-2 text-xs`} onClick={() => onViewMap(branch)} aria-label={copy.viewOnMap}><Icon name="pin" size={15} />{copy.viewOnMap}</button><a className={`${btnGhost} min-h-11 px-2 text-xs`} href={directionsUrl(branch.latitude!, branch.longitude!)} target="_blank" rel="noreferrer" aria-label={copy.directionsLink}><Icon name="route" size={15} />{copy.directionsLink}</a></div> : <p className="mt-3 text-xs text-muted">{copy.locationUnavailable}</p>}</div></div></li>
}

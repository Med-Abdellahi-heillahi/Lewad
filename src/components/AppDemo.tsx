import {
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
  lazy,
  Suspense,
} from "react";
import { type Dictionary, type Locale, useI18n } from "../i18n";
import { type Db2Branch, type Db2Establishment } from "../lib/db2";
import {
  hydrateApprovedClientSearchPlaceTypes,
  searchServicesWithCredit,
} from "../lib/db3a";
import { createMissingServiceRequest } from "../lib/db3b";
import {
  type ClientSearchResultPage,
  formatClientSearchChoiceLocation,
  getAutoSelectedClientSearchResult,
  getClientSearchResultPage,
  rankClientSearchResults,
  shouldOfferClientSearchMapOption,
} from "../lib/clientSearchResults";
import {
  type ExternalPlace,
  searchExternalPlace,
} from "../lib/externalPlaceSearch";
import { formatNumber } from "../lib/format";
import { isAdminRole } from "../lib/routeAuth";
import {
  findClosestSearchMatch,
  normalizeSearchText,
} from "../lib/searchMatching";
import {
  dismissSearchLocationPrompt,
  MAURITANIA_WILAYAS,
  readSearchLocationContext,
  saveSearchCoordinates,
  saveSearchWilaya,
  type MauritaniaWilaya,
  type SearchCoordinates,
} from "../lib/searchLocationContext";
import {
  APPROVED_SUGGESTION_LIMIT,
  SUGGESTION_MIN_LENGTH,
  getApprovedServiceSuggestions,
  type ServiceSuggestion,
  suggestServices,
} from "../lib/searchSuggestions";
import { appPad, appWrap, btnGhost, btnPrimary, card } from "../lib/ui";
import { useAccount } from "../hooks/useAccount";
import { Icon, type IconName } from "./Icon";
import { AppShell } from "./shell/AppShell";
import { directionsUrl, hasCoordinates, mapUrl } from "./maps/mapUtils";
import { PaginationControls } from "./ui/PaginationControls";
const ServiceMapSheet = lazy(() =>
  import("./maps/ServiceMapSheet").then((m) => ({
    default: m.ServiceMapSheet,
  })),
);

type SearchState =
  | "initial"
  | "loading"
  | "found"
  | "unavailable"
  | "insufficient"
  | "requested"
  | "externalFound";
type ValidationMessage = "empty" | "minimum" | null;
type RequestState = "idle" | "loading" | "created" | "duplicate" | "error";
type ExternalFallbackState =
  | "idle"
  | "askingLocation"
  | "choosingWilaya"
  | "searching"
  | "noResult"
  | "error";
type ExternalFallbackOrigin = "not_found" | "explicit_choice";
type LocationPermissionState = "idle" | "requesting" | "allowed" | "denied" | "unavailable";

function debugLocationFallback(event: string, details: Record<string, unknown> = {}) {
  if (import.meta.env.DEV) {
    console.debug(`[location-fallback] ${event}`, details);
  }
}

const appCopy = {
  fr: {
    title: "Recherche",
    pointsUnit: "points",
    pointsUnavailable: "Points indisponibles",
    welcome: "Que cherchez-vous aujourd’hui ?",
    description:
      "Recherchez un service, une agence ou un établissement local en Mauritanie.",
    input: "Rechercher un service",
    placeholder: "Nom d’un établissement ou d’un lieu…",
    submit: "Rechercher",
    initialTitle: "Commencez votre recherche",
    initialText: "Recherchez un service local.",
    empty: "Veuillez saisir le nom d’un service.",
    minimum: "Saisissez au moins 2 caractères pour lancer la recherche.",
    loading: "Recherche en cours…",
    dataFromLewad: "Données Lewad",
    categoryUnavailable: "Catégorie non renseignée",
    phone: "Téléphone",
    website: "Site web",
    location: "Localisation",
    nearby: "Agences",
    chooseBranch: "Choisissez une agence",
    agenciesFound: "agences trouvées",
    mainBranch: "Agence principale",
    call: "Appeler",
    whatsapp: "WhatsApp",
    ok: "Nouvelle recherche",
    notAvailable: "Non renseigné",
    noBranches: "Aucune agence active disponible.",
    branchesError: "Les agences sont momentanément indisponibles.",
    unavailableTitle: "Ce service n’est pas encore disponible sur Lewad.",
    unavailableText:
      "Vous pouvez préparer une demande pour que notre équipe l’ajoute.",
    request: "Demander l’ajout",
    searchErrorTitle: "La recherche est momentanément indisponible.",
    searchErrorText: "Réessayez dans quelques instants.",
    insufficientTitle: "Points insuffisants",
    insufficientText:
      "Vous n’avez pas assez de points pour effectuer cette recherche.",
    recharge: "Recharger mes points",
    debitNotice: "1 point a été utilisé pour cette recherche.",
    unlimitedNotice: "Recherche illimitée — aucun point débité.",
    currentBalance: "Solde actuel",
    viewCredits: "Voir mes crédits",
    searchedQuery: "« {query} »",
    requesting: "Envoi de la demande…",
    retryRequest: "Réessayer",
    requestError: "Impossible d’envoyer la demande pour le moment.",
    requestedTitle: "Demande envoyée",
    requestedText: "Votre demande a été envoyée à l’équipe Lewad.",
    requestDuplicateTitle: "Demande déjà en attente",
    requestDuplicateText: "Une demande pour ce service est déjà en attente.",
    reset: "Nouvelle recherche",
    nearbyPlace: "Lieu proche",
    viewOnMap: "Voir sur la carte",
    directionsLink: "Itinéraire",
    locationUnavailable: "Localisation exacte non disponible",
    mapSheetTitle: "Emplacement",
    mapCloseLabel: "Fermer la carte",
    mapLoading: "Chargement de la carte…",
    mapUnavailable: "La carte n'a pas pu être chargée.",
    openExternalMap: "Ouvrir dans une carte",
  },
  ar: {
    title: "البحث",
    pointsUnit: "نقاط",
    pointsUnavailable: "النقاط غير متاحة",
    welcome: "ماذا تبحث عنه اليوم؟",
    description: "ابحث عن خدمة أو وكالة أو مؤسسة محلية في موريتانيا.",
    input: "ابحث عن خدمة",
    placeholder: "اسم مؤسسة أو مكان…",
    submit: "ابحث",
    initialTitle: "ابدأ بحثك",
    initialText: "ابحث عن خدمة محلية.",
    empty: "يرجى إدخال اسم خدمة.",
    minimum: "أدخل حرفين على الأقل لبدء البحث.",
    loading: "جارٍ البحث…",
    dataFromLewad: "بيانات لواد",
    categoryUnavailable: "فئة غير محددة",
    phone: "الهاتف",
    website: "الموقع الإلكتروني",
    location: "الموقع",
    nearby: "الوكالات",
    chooseBranch: "اختر فرعًا",
    agenciesFound: "وكالات موجودة",
    mainBranch: "الوكالة الرئيسية",
    call: "اتصال",
    whatsapp: "واتساب",
    ok: "بحث جديد",
    notAvailable: "غير متاح",
    noBranches: "لا توجد وكالة نشطة حاليًا.",
    branchesError: "الوكالات غير متاحة مؤقتًا.",
    unavailableTitle: "هذه الخدمة غير متاحة بعد على لواد.",
    unavailableText: "يمكنك تجهيز طلب ليضيفها فريقنا.",
    request: "طلب الإضافة",
    searchErrorTitle: "البحث غير متاح مؤقتًا.",
    searchErrorText: "حاول مرة أخرى بعد قليل.",
    insufficientTitle: "النقاط غير كافية",
    insufficientText: "ليس لديك نقاط كافية لإجراء هذا البحث.",
    recharge: "شحن نقاطي",
    debitNotice: "تم استخدام نقطة واحدة لهذا البحث.",
    unlimitedNotice: "بحث غير محدود — لم يتم خصم أي نقطة.",
    currentBalance: "الرصيد الحالي",
    viewCredits: "عرض نقاطي",
    searchedQuery: "«‏ {query} ‏»",
    requesting: "جارٍ إرسال الطلب…",
    retryRequest: "أعد المحاولة",
    requestError: "تعذّر إرسال الطلب حاليًا.",
    requestedTitle: "تم إرسال الطلب",
    requestedText: "تم إرسال طلبك إلى فريق لواد.",
    requestDuplicateTitle: "الطلب قيد الانتظار بالفعل",
    requestDuplicateText: "يوجد طلب قيد الانتظار لهذه الخدمة بالفعل.",
    reset: "بحث جديد",
    nearbyPlace: "المكان القريب",
    viewOnMap: "عرض على الخريطة",
    directionsLink: "الاتجاهات",
    locationUnavailable: "الموقع الدقيق غير متوفر",
    mapSheetTitle: "الموقع",
    mapCloseLabel: "إغلاق الخريطة",
    mapLoading: "جارٍ تحميل الخريطة…",
    mapUnavailable: "تعذر تحميل الخريطة.",
    openExternalMap: "فتح في الخرائط",
  },
  en: {
    title: "Search",
    pointsUnit: "points",
    pointsUnavailable: "Points unavailable",
    welcome: "What are you looking for today?",
    description:
      "Search for a local service, agency or business in Mauritania.",
    input: "Search for a service",
    placeholder: "Establishment or place name…",
    submit: "Search",
    initialTitle: "Start your search",
    initialText: "Search for a local service.",
    empty: "Please enter a service name.",
    minimum: "Enter at least 2 characters to search.",
    loading: "Searching…",
    dataFromLewad: "Lewad data",
    categoryUnavailable: "Category unavailable",
    phone: "Phone",
    website: "Website",
    location: "Location",
    nearby: "Agencies",
    chooseBranch: "Choose a branch",
    agenciesFound: "agencies found",
    mainBranch: "Main agency",
    call: "Call",
    whatsapp: "WhatsApp",
    ok: "New search",
    notAvailable: "Not available",
    noBranches: "No active agency is available.",
    branchesError: "Agencies are temporarily unavailable.",
    unavailableTitle: "This service is not available on Lewad yet.",
    unavailableText: "You can prepare a request for our team to add it.",
    request: "Request addition",
    searchErrorTitle: "Search is temporarily unavailable.",
    searchErrorText: "Please try again in a moment.",
    insufficientTitle: "Insufficient points",
    insufficientText: "You do not have enough points to run this search.",
    recharge: "Recharge my points",
    debitNotice: "1 point was used for this search.",
    unlimitedNotice: "Unlimited search — no point was debited.",
    currentBalance: "Current balance",
    viewCredits: "View my credits",
    searchedQuery: "“{query}”",
    requesting: "Sending request…",
    retryRequest: "Try again",
    requestError: "Unable to send the request right now.",
    requestedTitle: "Request sent",
    requestedText: "Your request was sent to the Lewad team.",
    requestDuplicateTitle: "Request already pending",
    requestDuplicateText: "A request for this service is already pending.",
    reset: "New search",
    nearbyPlace: "Nearby place",
    viewOnMap: "View on map",
    directionsLink: "Directions",
    locationUnavailable: "Exact location unavailable",
    mapSheetTitle: "Location",
    mapCloseLabel: "Close the map",
    mapLoading: "Loading the map…",
    mapUnavailable: "The map could not be loaded.",
    openExternalMap: "Open in maps",
  },
} as const;

type AppCopy = (typeof appCopy)[Locale];
type AppSearchCopy = Dictionary["appSearch"];

const pinColors = [
  "bg-brand text-brand-ink",
  "bg-[var(--pin-2)] text-white",
  "bg-[var(--pin-3)] text-white",
] as const;

function formatLocation(branch: Db2Branch | undefined, fallback: string) {
  if (!branch) return fallback;
  return branch.neighborhood ?? branch.address ?? branch.city ?? fallback;
}

function getPrimaryBranch(establishment: Db2Establishment) {
  return (
    establishment.branches.find((branch) => branch.is_main) ??
    establishment.branches[0]
  );
}

function phoneHref(phone: string) {
  return `tel:${phone.replace(/[^+\d]/g, "")}`;
}

function isActionablePhone(phone: string) {
  return /^[+\d\s().-]+$/.test(phone) && phone.replace(/\D/g, "").length >= 8;
}

function whatsappHref(phone: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}

function websiteHref(website: string) {
  return /^https?:\/\//i.test(website) ? website : `https://${website}`;
}

/** Points épuisés : l'écran explique la situation et donne la seule sortie utile. */
function InsufficientCredits({
  copy,
  balance,
}: {
  copy: AppCopy;
  balance: number | null;
}) {
  const { locale } = useI18n();

  return (
    <section className={`${card} p-6 sm:p-8`} role="status">
      <span className="grid size-11 place-items-center rounded-xl bg-ask-bg text-ask">
        <Icon name="wallet" size={21} />
      </span>
      <h2 className="mt-5 text-xl font-bold tracking-tight sm:text-2xl">
        {copy.insufficientTitle}
      </h2>
      <p className="mt-2 max-w-xl text-[15px] leading-7 text-muted sm:text-base">
        {copy.insufficientText}
      </p>

      <p className="mt-5 inline-flex items-center gap-2 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm">
        <span className="font-semibold text-muted">{copy.currentBalance}</span>
        <span className="tabular font-bold text-ink">
          {balance === null
            ? copy.pointsUnavailable
            : `${formatNumber(balance, locale)} ${copy.pointsUnit}`}
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
  );
}

export function PublicSearchDemo() {
  const { locale, t } = useI18n();
  const {
    wallet,
    profile,
    loading: accountLoading,
    refresh,
    applyWalletBalance,
  } = useAccount();
  const copy = appCopy[locale];
  const searchCopy = t.appSearch;
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>("initial");
  const [validation, setValidation] = useState<ValidationMessage>(null);
  const [results, setResults] = useState<Db2Establishment[]>([]);
  const [selectedResult, setSelectedResult] =
    useState<Db2Establishment | null>(null);
  const [resultChoiceRequired, setResultChoiceRequired] = useState(false);
  const [resultPage, setResultPage] = useState(1);
  const [resultQuery, setResultQuery] = useState<string | null>(null);
  const [resultMapChoiceAvailable, setResultMapChoiceAvailable] =
    useState(false);
  const [didYouMean, setDidYouMean] = useState<ServiceSuggestion | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [searchFailed, setSearchFailed] = useState(false);
  const [debited, setDebited] = useState(false);
  const [unlimitedSearch, setUnlimitedSearch] = useState(false);
  const [lastNotFoundQuery, setLastNotFoundQuery] = useState<string | null>(
    null,
  );
  const [lastSearchLogId, setLastSearchLogId] = useState<string | null>(null);
  const [requestState, setRequestState] = useState<RequestState>("idle");
  const [externalFallbackState, setExternalFallbackState] =
    useState<ExternalFallbackState>("idle");
  const [externalFallbackOrigin, setExternalFallbackOrigin] =
    useState<ExternalFallbackOrigin>("not_found");
  const [externalFallbackQuery, setExternalFallbackQuery] = useState<
    string | null
  >(null);
  const storedSearchLocation = useMemo(() => readSearchLocationContext(), []);
  const [locationPermissionState, setLocationPermissionState] =
    useState<LocationPermissionState>(
      storedSearchLocation.coordinates ? "allowed" : "idle",
    );
  const [selectedWilaya, setSelectedWilaya] = useState<MauritaniaWilaya | "">(
    storedSearchLocation.wilaya ?? "",
  );
  const [currentLocation, setCurrentLocation] = useState<SearchCoordinates | null>(
    storedSearchLocation.coordinates,
  );
  const [locationPromptVisible, setLocationPromptVisible] = useState(
    !storedSearchLocation.coordinates &&
      !storedSearchLocation.wilaya &&
      !storedSearchLocation.promptDismissed,
  );
  const [searchLocationPickerOpen, setSearchLocationPickerOpen] = useState(false);
  const [searchInMauritania, setSearchInMauritania] = useState(true);
  const [externalPlace, setExternalPlace] = useState<ExternalPlace | null>(
    null,
  );
  const [externalSearchError, setExternalSearchError] = useState<
    "rate_limited" | "error" | null
  >(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionListRef = useRef<HTMLDivElement>(null);
  const searchIdRef = useRef(0);
  const externalSearchIdRef = useRef(0);
  const locationRequestIdRef = useRef(0);
  const externalLocationFlowIdRef = useRef(0);
  const missingServiceRequestIdRef = useRef(0);

  const [suggestions, setSuggestions] = useState<ServiceSuggestion[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [approvedSuggestions, setApprovedSuggestions] = useState<
    ServiceSuggestion[]
  >([]);
  const suggestionQuery = useMemo(() => normalizeSearchText(query), [query]);
  const hasSuggestionQuery = suggestionQuery.length >= SUGGESTION_MIN_LENGTH;
  const balance = wallet?.balance ?? null;
  const hasUnlimitedSearches = isAdminRole(profile?.role);
  const resultPagination = useMemo(
    () => getClientSearchResultPage(results, resultPage),
    [resultPage, results],
  );
  const focusSearch = () => inputRef.current?.focus();
  const suggestionOptions = () =>
    Array.from(
      suggestionListRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="option"]',
      ) ?? [],
    );

  useEffect(() => {
    if (accountLoading) return;

    const controller = new AbortController();
    void getApprovedServiceSuggestions(controller.signal).then((items) => {
      if (controller.signal.aborted) return;
      setApprovedSuggestions(items.slice(0, APPROVED_SUGGESTION_LIMIT));
    });

    return () => controller.abort();
  }, [accountLoading]);

  useEffect(() => {
    const promptReason = locationPromptVisible
      ? "no_saved_context"
      : currentLocation
        ? "current_location_available"
        : selectedWilaya
          ? "wilaya_selected"
          : "dismissed";
    debugLocationFallback("location prompt rendered or skipped", {
      rendered: !hasUnlimitedSearches && locationPromptVisible,
      reason: promptReason,
      accountLoading,
    });
  }, [
    accountLoading,
    currentLocation,
    hasUnlimitedSearches,
    locationPromptVisible,
    selectedWilaya,
  ]);

  useEffect(() => {
    if (selectedResult && resultChoiceRequired) {
      document.getElementById("client-search-back-to-results")?.focus();
    }
  }, [resultChoiceRequired, selectedResult]);

  useEffect(() => {
    if (externalFallbackOrigin !== "explicit_choice") return;

    const headingId =
      state === "externalFound"
        ? "client-search-map-result-heading"
        : state === "unavailable"
          ? "client-search-map-fallback-heading"
          : null;
    if (!headingId) return;

    const timer = window.setTimeout(() => {
      document.getElementById(headingId)?.focus();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [externalFallbackOrigin, externalFallbackState, state]);

  /*
   * Navigation clavier dans la liste : flèches pour parcourir, Échap pour
   * revenir au champ. Sans cela, la seule façon de choisir une suggestion
   * serait la souris ou une longue série de tabulations.
   */
  const moveSuggestionFocus = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (
      event.key !== "ArrowDown" &&
      event.key !== "ArrowUp" &&
      event.key !== "Escape"
    )
      return;
    event.preventDefault();

    if (event.key === "Escape") {
      setSuggestionsOpen(false);
      focusSearch();
      return;
    }

    const options = suggestionOptions();
    const current = options.indexOf(event.currentTarget);
    if (current === -1) return;

    if (event.key === "ArrowUp" && current === 0) {
      focusSearch();
      return;
    }

    const next = event.key === "ArrowDown" ? current + 1 : current - 1;
    options[next]?.focus();
  };

  /*
   * Autocomplétion : `suggest_services` est en lecture seule et ne débite
   * jamais un point — seule la recherche soumise coûte un crédit. On attend
   * 220 ms après la dernière frappe pour ne pas lancer une requête par
   * caractère, et chaque réponse obsolète est ignorée via l'AbortController.
   */
  useEffect(() => {
    if (!hasSuggestionQuery) {
      setSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }

    const controller = new AbortController();
    setSuggestionsLoading(true);

    const timer = window.setTimeout(() => {
      void suggestServices(suggestionQuery, controller.signal).then(
        (response) => {
          if (controller.signal.aborted) return;
          setSuggestions(response.items);
          setSuggestionsLoading(false);
        },
      );
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [hasSuggestionQuery, suggestionQuery]);

  const clearSearchState = () => {
    setResults([]);
    setSelectedResult(null);
    setResultChoiceRequired(false);
    setResultPage(1);
    setResultQuery(null);
    setResultMapChoiceAvailable(false);
    setDidYouMean(null);
    setSearchFailed(false);
    setDebited(false);
    setUnlimitedSearch(false);
    setLastNotFoundQuery(null);
    setLastSearchLogId(null);
    setRequestState("idle");
    externalSearchIdRef.current += 1;
    externalLocationFlowIdRef.current += 1;
    missingServiceRequestIdRef.current += 1;
    setExternalFallbackState("idle");
    setExternalFallbackOrigin("not_found");
    setExternalFallbackQuery(null);
    setSearchInMauritania(true);
    setExternalPlace(null);
    setExternalSearchError(null);
  };

  const runSearch = async (raw = query) => {
    const requestedQuery = raw.trim();
    const normalizedQuery = normalizeSearchText(raw);
    const searchId = ++searchIdRef.current;
    debugLocationFallback("search submitted", { query: requestedQuery });

    if (!normalizedQuery || normalizedQuery.length < 2) {
      clearSearchState();
      setValidation(normalizedQuery ? "minimum" : "empty");
      setState("initial");
      focusSearch();
      return;
    }

    setValidation(null);
    setSuggestionsOpen(false);
    clearSearchState();
    setState("loading");

    // The account badge may be old when another tab or a previously completed
    // search changed the wallet. Reconcile it before this paid action so the
    // visual change for this search is exactly the one-point server debit.
    // A failure here is non-blocking: DB3A remains the authority for whether
    // the search is allowed and returns the post-debit balance below.
    await refresh();
    if (searchId !== searchIdRef.current) return;

    let result: Awaited<ReturnType<typeof searchServicesWithCredit>>;
    try {
      result = await searchServicesWithCredit(requestedQuery);
    } catch {
      if (searchId !== searchIdRef.current) return;
      debugLocationFallback("internal search failed", { query: requestedQuery });
      setSearchFailed(true);
      setState("unavailable");
      return;
    }

    if (searchId !== searchIdRef.current) return;
    debugLocationFallback("internal search status", {
      query: requestedQuery,
      status: result.status,
      resultsCount: result.resultsCount,
    });

    // The RPC debits atomically and returns the post-debit balance. Reflect it
    // immediately in the shared account state so the page and AppBar never
    // wait for a second network round-trip to show the new value.
    if (result.balance !== null) applyWalletBalance(result.balance);

    if (result.status === "invalid_query") {
      setValidation("minimum");
      setState("initial");
      return;
    }

    if (result.status === "insufficient_credits") {
      if (hasUnlimitedSearches || result.unlimited) {
        setSearchFailed(true);
        setState("unavailable");
        return;
      }
      setState("insufficient");
      return;
    }

    if (
      !result.ok ||
      result.status === "unauthenticated" ||
      result.status === "error"
    ) {
      setSearchFailed(true);
      setState("unavailable");
      return;
    }

    setDebited(result.debitedPoints === 1);
    setUnlimitedSearch(result.unlimited);

    if (result.status === "success" && result.results.length) {
      const hydratedResults = await hydrateApprovedClientSearchPlaceTypes(
        result.results,
      );
      if (searchId !== searchIdRef.current) return;
      const rankedResults = rankClientSearchResults(
        hydratedResults,
        requestedQuery,
      );
      const autoSelectedResult = getAutoSelectedClientSearchResult(
        rankedResults,
        result.resultsCount,
        requestedQuery,
      );
      setResults(rankedResults);
      setSelectedResult(autoSelectedResult);
      setResultChoiceRequired(autoSelectedResult === null);
      setResultPage(1);
      setResultQuery(requestedQuery);
      setResultMapChoiceAvailable(
        shouldOfferClientSearchMapOption(
          rankedResults,
          result.resultsCount,
          requestedQuery,
        ),
      );
      setState("found");
      return;
    }

    setResults([]);

    if (result.status !== "not_found") {
      setSearchFailed(true);
      setState("unavailable");
      return;
    }

    setLastNotFoundQuery(requestedQuery);
    setExternalFallbackOrigin("not_found");
    setExternalFallbackQuery(requestedQuery);
    setLastSearchLogId(result.searchLogId);
    setState("unavailable");
    setExternalFallbackState("askingLocation");

    if (currentLocation || selectedWilaya) {
      debugLocationFallback("fallback started after not_found", {
        query: requestedQuery,
        wilaya: selectedWilaya || null,
        country: "Mauritania",
        hasLocation: Boolean(currentLocation),
      });
      void runExternalSearch(currentLocation, requestedQuery, true);
    }

    // La correction orthographique ne doit jamais proposer un nom qui n'existe
    // pas : cliquer « Oui » relance une recherche payante. On sonde donc les
    // vraies suggestions sur un préfixe court — la correspondance par
    // sous-chaîne vient d'échouer — puis on ne garde qu'un nom assez proche.
    const probe = await suggestServices(normalizedQuery.slice(0, 2));
    if (searchId !== searchIdRef.current) return;
    setDidYouMean(findClosestSearchMatch(probe.items, normalizedQuery));
  };

  const runExternalSearch = async (
    location: SearchCoordinates | null = currentLocation,
    fallbackQuery = externalFallbackQuery,
    searchAllowed = searchInMauritania,
  ) => {
    if (
      !fallbackQuery ||
      !searchAllowed ||
      externalFallbackState === "searching"
    ) {
      debugLocationFallback("fallback skipped", {
        hasQuery: Boolean(fallbackQuery),
        searchInMauritania: searchAllowed,
        alreadySearching: externalFallbackState === "searching",
      });
      return;
    }

    const externalSearchId = ++externalSearchIdRef.current;
    setExternalSearchError(null);
    setExternalFallbackState("searching");
    debugLocationFallback("geocode payload", {
      query: fallbackQuery,
      wilaya: selectedWilaya || null,
      country: "Mauritania",
      hasLocation: Boolean(location),
    });
    let response: Awaited<ReturnType<typeof searchExternalPlace>>;
    try {
      response = await searchExternalPlace({
        query: fallbackQuery,
        wilaya: selectedWilaya || null,
        location,
      });
    } catch {
      if (externalSearchId !== externalSearchIdRef.current) return;
      debugLocationFallback("geocode error", { query: fallbackQuery });
      setExternalSearchError("error");
      setExternalFallbackState("error");
      return;
    }

    if (externalSearchId !== externalSearchIdRef.current) return;

    if (response.status === "found" && response.place) {
      debugLocationFallback("geocode success", {
        query: fallbackQuery,
        discoveryStatus: response.place.discoveryStatus,
      });
      setExternalPlace(response.place);
      setExternalFallbackState("idle");
      setState("externalFound");
      return;
    }

    if (response.status === "not_found") {
      debugLocationFallback("geocode no result", { query: fallbackQuery });
      setExternalFallbackState("noResult");
      return;
    }

    debugLocationFallback("geocode error", {
      query: fallbackQuery,
      status: response.status,
    });
    setExternalSearchError(
      response.status === "rate_limited" ? "rate_limited" : "error",
    );
    setExternalFallbackState("error");
  };

  const requestCurrentLocation = (
    onAllowed?: (coordinates: SearchCoordinates) => void,
    onUnavailable?: () => void,
  ) => {
    const locationRequestId = ++locationRequestIdRef.current;
    if (!navigator.geolocation) {
      setLocationPermissionState("unavailable");
      setLocationPromptVisible(false);
      onUnavailable?.();
      return;
    }

    setLocationPermissionState("requesting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (locationRequestId !== locationRequestIdRef.current) return;
        const coordinates = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        };
        saveSearchCoordinates(coordinates);
        setCurrentLocation(coordinates);
        setLocationPermissionState("allowed");
        setLocationPromptVisible(false);
        onAllowed?.(coordinates);
      },
      (error) => {
        if (locationRequestId !== locationRequestIdRef.current) return;
        setLocationPermissionState(error.code === 1 ? "denied" : "unavailable");
        setLocationPromptVisible(false);
        onUnavailable?.();
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  };

  const requestLocationForSearchContext = () => {
    debugLocationFallback("allow location clicked", { source: "search_context" });
    requestCurrentLocation(undefined, () => setSearchLocationPickerOpen(true));
  };

  const requestLocationForExternalSearch = () => {
    const fallbackQuery = externalFallbackQuery;
    if (!fallbackQuery) return;

    const flowId = ++externalLocationFlowIdRef.current;
    debugLocationFallback("allow location clicked", { source: "fallback" });
    setSearchInMauritania(true);
    requestCurrentLocation(
      (coordinates) => {
        if (flowId !== externalLocationFlowIdRef.current) return;
        void runExternalSearch(coordinates, fallbackQuery, true);
      },
      () => {
        if (flowId !== externalLocationFlowIdRef.current) return;
        setExternalFallbackState("choosingWilaya");
      },
    );
  };

  const useWilayaFallback = () => {
    externalLocationFlowIdRef.current += 1;
    missingServiceRequestIdRef.current += 1;
    debugLocationFallback("choose wilaya clicked", { source: "fallback" });
    setLocationPromptVisible(false);
    setExternalFallbackState("choosingWilaya");
  };

  const handleMauritaniaChoice = (isInMauritania: boolean) => {
    setSearchInMauritania(isInMauritania);
    if (!isInMauritania) setExternalFallbackState("noResult");
  };

  const handleWilayaChange = (value: string) => {
    const wilaya = MAURITANIA_WILAYAS.find((item) => item === value) ?? "";
    debugLocationFallback("wilaya selected", { wilaya: wilaya || null });
    setSelectedWilaya(wilaya);
    saveSearchWilaya(wilaya || null);
    setLocationPromptVisible(false);
    setSearchLocationPickerOpen(false);
    setSearchInMauritania(true);
  };

  const dismissInitialLocationPrompt = () => {
    debugLocationFallback("location prompt dismissed");
    dismissSearchLocationPrompt();
    setLocationPromptVisible(false);
  };

  const handleRequestMissingService = async () => {
    if (!lastNotFoundQuery || requestState === "loading") return;

    const requestedQuery = lastNotFoundQuery;
    const requestId = ++missingServiceRequestIdRef.current;
    setDidYouMean(null);
    setRequestState("loading");
    const result = await createMissingServiceRequest({
      query: requestedQuery,
      message: null,
      searchLogId: lastSearchLogId,
    });
    if (requestId !== missingServiceRequestIdRef.current) return;

    if (result.status === "created" || result.status === "duplicate") {
      setRequestState(result.status);
      setState("requested");
      return;
    }

    setRequestState("error");
  };

  const reset = () => {
    searchIdRef.current += 1;
    setQuery("");
    setValidation(null);
    setSuggestionsOpen(false);
    clearSearchState();
    setState("initial");
    window.setTimeout(focusSearch, 0);
  };

  const editSearchQuery = (value: string) => {
    if (state === "loading") return;

    searchIdRef.current += 1;
    externalSearchIdRef.current += 1;
    externalLocationFlowIdRef.current += 1;
    missingServiceRequestIdRef.current += 1;
    setExternalFallbackState("idle");
    setExternalFallbackOrigin("not_found");
    setExternalFallbackQuery(null);
    setExternalPlace(null);
    setExternalSearchError(null);
    setRequestState("idle");
    setQuery(value);
    setValidation(null);
    setDidYouMean(null);
    setState("initial");
    setSuggestionsOpen(true);
  };

  /** Remplit le champ sans rien débiter : l'utilisateur lance la recherche lui-même. */
  const applySuggestion = (suggestion: ServiceSuggestion) => {
    setQuery(suggestion.name);
    setValidation(null);
    // On rend le focus AVANT de fermer : au clavier, l'option a le focus, et
    // `focusSearch()` déclenche le `onFocus` du champ qui rouvre la liste. En
    // fermant après, c'est bien la fermeture qui gagne.
    focusSearch();
    setSuggestionsOpen(false);
  };

  /** Action explicite « Oui » de la correction : là, la recherche payante est voulue. */
  const acceptDidYouMean = (suggestion: ServiceSuggestion) => {
    setQuery(suggestion.name);
    void runSearch(suggestion.name);
  };

  const didYouMeanLabel = didYouMean
    ? searchCopy.didYouMean.replace("{name}", didYouMean.name)
    : "";
  const searchedQueryLabel = lastNotFoundQuery
    ? copy.searchedQuery.replace("{query}", lastNotFoundQuery)
    : "";
  const externalFallbackQueryLabel = externalFallbackQuery
    ? copy.searchedQuery.replace("{query}", externalFallbackQuery)
    : "";
  const selectedWilayaLabel = selectedWilaya
    ? searchCopy.wilayas[selectedWilaya]
    : null;
  const searchContextMessage = selectedWilayaLabel
    ? searchCopy.searchContextWilaya.replace("{wilaya}", selectedWilayaLabel)
    : currentLocation
      ? searchCopy.searchContextCurrentLocation
      : searchCopy.searchContextUnknown;

  const openSearchLocationPicker = () => {
    debugLocationFallback("change wilaya clicked", { source: "search_context" });
    setLocationPromptVisible(false);
    setSearchLocationPickerOpen(true);
  };

  const selectSearchResult = (establishment: Db2Establishment) => {
    setSelectedResult(establishment);
  };

  const searchResultQueryOnMap = () => {
    if (!resultQuery) return;

    externalSearchIdRef.current += 1;
    externalLocationFlowIdRef.current += 1;
    setExternalFallbackOrigin("explicit_choice");
    setExternalFallbackQuery(resultQuery);
    setExternalFallbackState("askingLocation");
    setSearchInMauritania(true);
    setExternalPlace(null);
    setExternalSearchError(null);
    setState("unavailable");

    if (currentLocation || selectedWilaya) {
      void runExternalSearch(currentLocation, resultQuery, true);
    }
  };

  const returnToInternalResults = () => {
    externalSearchIdRef.current += 1;
    externalLocationFlowIdRef.current += 1;
    setExternalFallbackState("idle");
    setExternalFallbackOrigin("not_found");
    setExternalFallbackQuery(null);
    setSearchInMauritania(true);
    setExternalPlace(null);
    setExternalSearchError(null);
    setState("found");
    window.setTimeout(() => {
      document.getElementById("client-search-map-choice")?.focus();
    }, 0);
  };

  const returnToSearchResults = () => {
    const selectedResultId = selectedResult?.id;
    setSelectedResult(null);
    window.setTimeout(() => {
      if (selectedResultId) {
        document
          .getElementById(`client-search-result-choice-${selectedResultId}`)
          ?.focus();
      }
    }, 0);
  };

  const changeResultPage = (page: number) => {
    setResultPage(page);
    window.setTimeout(() => {
      document.getElementById("client-search-results-heading")?.focus();
    }, 0);
  };

  return (
    <AppShell active="search" documentTitle={copy.title} skipLabel={copy.input}>
      <main id="app-main" className={`${appWrap} ${appPad}`}>
        <div className="relative isolate mx-auto max-w-4xl before:pointer-events-none before:absolute before:inset-x-[-1rem] before:-top-8 before:-z-10 before:h-72 before:rounded-[2.5rem] before:bg-gradient-to-br before:from-tint-5/55 before:via-tint-1/30 before:to-tint-3/25 before:blur-2xl sm:before:inset-x-[-2rem]">
          <header className="relative min-w-0 overflow-hidden rounded-t-3xl border border-b-0 border-line bg-gradient-to-br from-surface via-surface to-tint-5/45 px-5 pt-6 pb-3 sm:px-7 sm:pt-8 sm:pb-4">
            <span aria-hidden="true" className="pointer-events-none absolute -top-16 end-[-3rem] size-44 rounded-full bg-tint-3/45 blur-3xl" />
            <span className="relative inline-flex items-center gap-2 rounded-full border border-tint-ink-5/15 bg-tint-5/65 px-3 py-1.5 text-[11px] font-bold tracking-[0.08em] text-tint-ink-5 uppercase rtl:tracking-normal rtl:normal-case">
              <span className="size-1.5 rounded-full bg-tint-ink-5" />
              {t.brandName} V1
            </span>
            <h1
              id="app-demo-title"
              className="relative mt-4 text-[30px] leading-[1.12] font-bold tracking-[-0.04em] text-ink sm:mt-5 sm:text-4xl"
            >
              {copy.welcome}
            </h1>
            <p className="relative mt-3 max-w-xl text-[15px] leading-7 text-muted sm:mt-4 sm:text-lg">
              {copy.description}
            </p>
          </header>

          <form
            className="relative z-20 min-w-0 rounded-b-3xl border border-t-0 border-line bg-surface/95 px-5 pt-2 pb-5 card-elevated sm:px-7 sm:pb-7"
            onSubmit={(event) => {
              event.preventDefault();
              void runSearch();
            }}
            noValidate
          >
            <label
              htmlFor="service-search"
              className="mb-2 block text-sm font-semibold text-ink"
            >
              {copy.input}
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-3">
              <div className="relative flex-1">
                <Icon
                  name="search"
                  size={20}
                  className="pointer-events-none absolute start-4 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  ref={inputRef}
                  id="service-search"
                  value={query}
                  disabled={state === "loading"}
                  onFocus={() => setSuggestionsOpen(true)}
                  onChange={(event) => editSearchQuery(event.target.value)}
                  placeholder={copy.placeholder}
                  className="h-14 w-full rounded-2xl border border-line bg-page py-3 pe-4 ps-11 text-base text-ink shadow-sm outline-none transition-colors placeholder:text-muted hover:border-line-strong focus:border-brand-deep focus:ring-2 focus:ring-brand-deep/15 disabled:cursor-wait disabled:opacity-70"
                  autoComplete="off"
                  enterKeyHint="search"
                  aria-autocomplete="list"
                  aria-controls="service-suggestions"
                  aria-expanded={suggestionsOpen && hasSuggestionQuery}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") {
                      setSuggestionsOpen(false);
                      return;
                    }
                    // Flèche bas : on entre dans la liste au clavier, sans souris.
                    if (
                      event.key === "ArrowDown" &&
                      suggestionsOpen &&
                      suggestions.length
                    ) {
                      event.preventDefault();
                      suggestionOptions()[0]?.focus();
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
                    className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto overscroll-contain rounded-2xl border border-line bg-surface p-1.5 card-elevated"
                  >
                    <p className="rounded-xl bg-tint-1/35 px-3 py-2 text-xs font-bold tracking-[0.08em] text-tint-ink-1 uppercase rtl:tracking-normal rtl:normal-case">
                      {searchCopy.suggestions}
                    </p>
                    {suggestions.length ? (
                      suggestions.map((suggestion) => {
                        // En arabe, on affiche le nom arabe quand il existe : le
                        // lecteur ne doit pas devoir déchiffrer un nom latin.
                        const label =
                          locale === "ar"
                            ? (suggestion.nameAr ?? suggestion.name)
                            : suggestion.name;
                        const context = [
                          suggestion.categoryName,
                          suggestion.neighborhood,
                        ]
                          .filter(Boolean)
                          .join(" · ");

                        return (
                          <button
                            key={suggestion.id}
                            type="button"
                            role="option"
                            aria-selected={false}
                            className="flex min-h-12 w-full items-start gap-3 rounded-xl px-3 py-2.5 text-start transition-colors hover:bg-tint-5/45 focus:bg-tint-5/45 focus:outline-none"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => applySuggestion(suggestion)}
                            onKeyDown={(event) => moveSuggestionFocus(event)}
                          >
                            <Icon
                              name="store"
                              size={17}
                              className="mt-0.5 shrink-0 text-tint-ink-5"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-ink">
                                {label}
                              </span>
                              {context && (
                                <span className="block truncate text-xs font-medium text-muted">
                                  {context}
                                </span>
                              )}
                            </span>
                          </button>
                        );
                      })
                    ) : suggestionsLoading ? (
                      <p className="px-3 py-3 text-sm text-muted">
                        {searchCopy.suggestionsLoading}
                      </p>
                    ) : (
                      <p className="px-3 py-3 text-sm text-muted">
                        {searchCopy.noSuggestions}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <button
                className={`${btnPrimary} h-14 rounded-2xl sm:min-w-36`}
                type="submit"
                disabled={state === "loading"}
              >
                {state === "loading" ? (
                  copy.loading
                ) : (
                  <>
                    <Icon name="search" size={18} />
                    {copy.submit}
                  </>
                )}
              </button>
            </div>
            {validation && (
              <p
                className="mt-3 flex items-center gap-2 rounded-xl border border-ask/25 bg-ask-bg px-3.5 py-3 text-sm font-medium text-ask"
                role="alert"
              >
                <Icon name="alert" size={17} />
                {copy[validation]}
              </p>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-tint-ink-1/15 bg-tint-1/45 px-3.5 py-3 text-sm text-ink-soft">
              <p className="flex min-w-0 items-center gap-2 leading-6">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-surface text-tint-ink-1 shadow-sm">
                  <Icon name="pin" size={16} />
                </span>
                <span>{searchContextMessage}</span>
              </p>
              <button
                type="button"
                className="min-h-11 shrink-0 rounded-xl px-2.5 text-sm font-semibold text-tint-ink-1 underline-offset-4 hover:bg-surface/70 hover:underline focus:outline-none focus:ring-2 focus:ring-tint-ink-1/25"
                onClick={openSearchLocationPicker}
              >
                {searchCopy.changeWilaya}
              </button>
            </div>

            {searchLocationPickerOpen && (
              <div className="mt-3 rounded-2xl border border-tint-ink-1/15 bg-gradient-to-br from-surface to-tint-1/25 p-3.5 card-elevated sm:max-w-md">
                <label
                  className="block text-sm font-semibold text-ink"
                  htmlFor="search-context-wilaya"
                >
                  {searchCopy.selectWilaya}
                </label>
                <select
                  id="search-context-wilaya"
                  value={selectedWilaya}
                  onChange={(event) => handleWilayaChange(event.target.value)}
                  className="mt-2 min-h-12 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none focus:border-tint-ink-1 focus:ring-2 focus:ring-tint-ink-1/15"
                >
                  <option value="">{searchCopy.allMauritania}</option>
                  {MAURITANIA_WILAYAS.map((wilaya) => (
                    <option key={wilaya} value={wilaya}>
                      {searchCopy.wilayas[wilaya]}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {!hasUnlimitedSearches &&
              locationPromptVisible && (
                <section
                  className={`${card} mt-4 border-tint-ink-5/20 bg-tint-5/45 p-4 sm:p-5`}
                  role="status"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface text-tint-ink-5 shadow-sm">
                      <Icon name="pin" size={19} />
                    </span>
                    <p className="pt-1 text-sm leading-6 text-ink">
                      {searchCopy.initialLocationPrompt}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                    <button
                      type="button"
                      className={`${btnPrimary} w-full sm:w-auto`}
                      disabled={locationPermissionState === "requesting"}
                      onClick={requestLocationForSearchContext}
                    >
                      <Icon
                        name={locationPermissionState === "requesting" ? "clock" : "pin"}
                        size={18}
                      />
                      {locationPermissionState === "requesting"
                        ? searchCopy.locating
                        : searchCopy.allowLocation}
                    </button>
                    <button
                      type="button"
                      className={`${btnGhost} w-full sm:w-auto`}
                      onClick={openSearchLocationPicker}
                    >
                      <Icon name="map" size={18} />
                      {searchCopy.chooseWilaya}
                    </button>
                    <button
                      type="button"
                      className="min-h-11 self-center px-2 text-sm font-semibold text-muted underline-offset-4 hover:text-ink hover:underline"
                      onClick={dismissInitialLocationPrompt}
                    >
                      {searchCopy.dismissLocationPrompt}
                    </button>
                  </div>
                </section>
              )}
          </form>

          {approvedSuggestions.length > 0 && (
            <section
              className="mt-4 min-w-0"
              aria-label={searchCopy.suggestions}
            >
              <p className="text-xs font-semibold text-muted">
                {searchCopy.suggestions}
              </p>
              <div className="mt-2 flex min-w-0 flex-wrap gap-2">
                {approvedSuggestions.map((suggestion) => (
                  <button
                    type="button"
                    key={suggestion.id}
                    onClick={() => {
                      setQuery(suggestion.name);
                      void runSearch(suggestion.name);
                    }}
                    className="min-h-11 max-w-full rounded-full border border-line bg-surface/90 px-4 text-sm text-ink transition-colors hover:border-tint-ink-3/30 hover:bg-tint-3/40"
                  >
                    <bdi dir="auto" className="block max-w-full truncate">
                      {suggestion.name}
                    </bdi>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div
            className="mt-6 min-w-0 sm:mt-8"
            aria-live={selectedResult && resultChoiceRequired ? "off" : "polite"}
          >
            {state === "initial" && (
              <section
                className={`${card} grid min-h-48 place-items-center border-dashed bg-gradient-to-br from-surface via-surface to-tint-5/30 px-6 py-10 text-center`}
              >
                <div>
                  <span className="mx-auto grid size-11 place-items-center rounded-xl bg-tint-5 text-tint-ink-5">
                    <Icon name="search" size={21} />
                  </span>
                  <h2 className="mt-4 text-xl font-bold">
                    {copy.initialTitle}
                  </h2>
                  <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
                    {copy.initialText}
                  </p>
                </div>
              </section>
            )}

            {state === "loading" && (
              <section
                className={`${card} p-5 sm:p-7`}
                role="status"
                aria-busy="true"
              >
                <span
                  aria-hidden="true"
                  className="block h-5 w-40 rounded bg-surface-2 motion-safe:animate-pulse"
                />
                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <span
                    aria-hidden="true"
                    className="block h-52 rounded-2xl bg-surface-2 motion-safe:animate-pulse"
                  />
                  <span
                    aria-hidden="true"
                    className="block h-52 rounded-2xl bg-surface-2 motion-safe:animate-pulse"
                  />
                </div>
                <span className="sr-only">{copy.loading}</span>
              </section>
            )}

            {state === "insufficient" && (
              <InsufficientCredits copy={copy} balance={balance} />
            )}

            {state === "found" && (
              <div className="grid gap-4">
                {unlimitedSearch ? (
                  <p
                    className="flex items-center gap-2 rounded-xl border border-answer/25 bg-answer-bg px-3.5 py-3 text-sm font-medium text-answer"
                    role="status"
                  >
                    <Icon name="sparkle" size={17} />
                    {copy.unlimitedNotice}
                  </p>
                ) : (
                  debited && (
                    <p
                      className="flex items-center gap-2 rounded-xl border border-answer/25 bg-answer-bg px-3.5 py-3 text-sm font-medium text-answer"
                      role="status"
                    >
                      <Icon name="check" size={17} />
                      {copy.debitNotice}
                    </p>
                  )
                )}
                {selectedResult ? (
                  <div className="grid gap-4">
                    {resultChoiceRequired && (
                      <button
                        id="client-search-back-to-results"
                        type="button"
                        className={`${btnGhost} w-full justify-self-start sm:w-auto`}
                        onClick={returnToSearchResults}
                        aria-label={`${searchCopy.backToResults}: ${selectedResult.name}`}
                      >
                        <span className="rtl:rotate-180">
                          <Icon name="arrow" size={17} className="rotate-180" />
                        </span>
                        {searchCopy.backToResults}
                      </button>
                    )}
                    <EstablishmentResult
                      establishment={selectedResult}
                      copy={copy}
                      onReset={reset}
                    />
                  </div>
                ) : (
                  <SearchResultChoices
                    copy={copy}
                    searchCopy={searchCopy}
                    query={resultQuery ?? ""}
                    pagination={resultPagination}
                    onPageChange={changeResultPage}
                    onSelect={selectSearchResult}
                    onSearchMap={searchResultQueryOnMap}
                    showMapSearch={resultMapChoiceAvailable}
                  />
                )}
              </div>
            )}

            {state === "externalFound" && externalPlace && (
              <section className={`${card} relative overflow-hidden bg-gradient-to-br from-surface via-surface to-tint-1/35`}>
                <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-tint-ink-1 via-brand to-answer opacity-60" />
                {debited && (
                  <p
                    className="m-5 flex items-center gap-2 rounded-xl border border-answer/25 bg-answer-bg px-3.5 py-3 text-sm font-medium text-answer sm:m-7"
                    role="status"
                  >
                    <Icon name="check" size={17} />
                    {copy.debitNotice}
                  </p>
                )}
                <div className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-tint-1 px-3 py-1.5 text-xs font-bold text-tint-ink-1">
                        <Icon name="map" size={14} />
                        {searchCopy.foundOnMap}
                      </span>
                      <h2
                        id="client-search-map-result-heading"
                        dir="auto"
                        tabIndex={-1}
                        className="mt-4 text-2xl font-bold tracking-tight text-ink"
                      >
                        {externalPlace.displayName}
                      </h2>
                      <p dir="auto" className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                        {externalPlace.address}
                      </p>
                    </div>
                  </div>
                  {externalPlace.discoveryStatus === "error" && (
                    <p className="mt-5 text-sm font-medium text-muted" role="status">
                      {searchCopy.mapResultSaveWarning}
                    </p>
                  )}

                  <div className="mt-6 grid gap-3 sm:flex sm:flex-wrap">
                    <a
                      className={`${btnPrimary} w-full sm:w-auto`}
                      href={mapUrl(externalPlace.latitude, externalPlace.longitude)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="map" size={18} />
                      {copy.viewOnMap}
                    </a>
                    <a
                      className={`${btnGhost} w-full sm:w-auto`}
                      href={directionsUrl(externalPlace.latitude, externalPlace.longitude)}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <Icon name="route" size={18} />
                      {searchCopy.openDirections}
                    </a>
                    {externalFallbackOrigin === "explicit_choice" && (
                      <button
                        type="button"
                        className={`${btnGhost} w-full sm:w-auto`}
                        onClick={returnToInternalResults}
                      >
                        <span className="rtl:rotate-180">
                          <Icon name="arrow" size={17} className="rotate-180" />
                        </span>
                        {searchCopy.backToLewadResults}
                      </button>
                    )}
                    <button
                      type="button"
                      className={`${btnGhost} w-full sm:w-auto`}
                      onClick={reset}
                    >
                      {copy.reset}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {state === "unavailable" && (
              <section className={`${card} relative overflow-hidden bg-gradient-to-br from-surface via-surface to-tint-3/20 p-6 sm:p-8`}>
                <div aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-tint-ink-3 via-brand to-tint-ink-5 opacity-45" />
                {externalFallbackOrigin === "explicit_choice" && (
                  <button
                    type="button"
                    className={`${btnGhost} w-full sm:w-auto`}
                    onClick={returnToInternalResults}
                  >
                    <span className="rtl:rotate-180">
                      <Icon name="arrow" size={17} className="rotate-180" />
                    </span>
                    {searchCopy.backToLewadResults}
                  </button>
                )}
                <span className={`${externalFallbackOrigin === "explicit_choice" ? "mt-5 " : ""}grid size-11 place-items-center rounded-xl bg-tint-3 text-tint-ink-3`}>
                  <Icon name="search" size={21} />
                </span>

                {unlimitedSearch && (
                  <p
                    className="mt-5 flex items-center gap-2 rounded-xl border border-answer/25 bg-answer-bg px-3.5 py-3 text-sm font-medium text-answer"
                    role="status"
                  >
                    <Icon name="sparkle" size={17} />
                    {copy.unlimitedNotice}
                  </p>
                )}

                {externalFallbackState === "askingLocation" ? (
                  <>
                    <h2
                      id="client-search-map-fallback-heading"
                      tabIndex={-1}
                      className="mt-5 text-xl font-bold tracking-tight sm:text-2xl"
                    >
                      {externalFallbackOrigin === "explicit_choice"
                        ? searchCopy.searchOnMap
                        : copy.unavailableTitle}
                    </h2>
                    {externalFallbackQuery && (
                      <p
                        dir="auto"
                        className="mt-3 inline-flex max-w-full items-center gap-2 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm"
                      >
                        <Icon name="search" size={15} className="shrink-0 text-muted" />
                        <span className="truncate font-semibold text-ink">
                          {externalFallbackQueryLabel}
                        </span>
                      </p>
                    )}
                    <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted sm:text-base">
                      {searchCopy.locationPrompt}
                    </p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        className={`${btnPrimary} w-full sm:w-auto`}
                        disabled={locationPermissionState === "requesting"}
                        onClick={requestLocationForExternalSearch}
                      >
                        <Icon
                          name={locationPermissionState === "requesting" ? "clock" : "pin"}
                          size={18}
                        />
                        {locationPermissionState === "requesting"
                          ? searchCopy.locating
                          : searchCopy.allowLocation}
                      </button>
                      <button
                        type="button"
                        className={`${btnGhost} w-full sm:w-auto`}
                        onClick={useWilayaFallback}
                      >
                        <Icon name="map" size={18} />
                        {searchCopy.chooseWilaya}
                      </button>
                    </div>
                  </>
                ) : externalFallbackState === "choosingWilaya" ? (
                  <>
                    <h2
                      id="client-search-map-fallback-heading"
                      tabIndex={-1}
                      className="mt-5 text-xl font-bold tracking-tight sm:text-2xl"
                    >
                      {searchCopy.chooseWilaya}
                    </h2>
                    {locationPermissionState === "denied" && (
                      <p className="mt-3 text-sm leading-6 text-muted" role="status">
                        {searchCopy.locationPermissionDenied}
                      </p>
                    )}
                    {locationPermissionState === "unavailable" && (
                      <p className="mt-3 text-sm leading-6 text-muted" role="status">
                        {searchCopy.locationUnavailable}
                      </p>
                    )}
                    <label className="mt-5 flex min-h-11 items-center gap-3 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-sm font-semibold text-ink">
                      <input
                        type="checkbox"
                        checked={searchInMauritania}
                        onChange={(event) => handleMauritaniaChoice(event.target.checked)}
                        className="size-4 accent-[var(--brand-deep)]"
                      />
                      <span>{searchCopy.isInMauritania}</span>
                    </label>
                    <p className="mt-2 text-sm text-muted">
                      {searchCopy.searchInMauritania}
                    </p>
                    <label className="mt-5 block text-sm font-semibold text-ink" htmlFor="external-place-wilaya">
                      {searchCopy.selectWilaya}
                    </label>
                    <select
                      id="external-place-wilaya"
                      value={selectedWilaya}
                      onChange={(event) => handleWilayaChange(event.target.value)}
                      className="mt-2 min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-base text-ink outline-none focus:border-brand-deep focus:ring-2 focus:ring-brand-deep/15 sm:max-w-sm"
                    >
                      <option value="">{searchCopy.allMauritania}</option>
                      {MAURITANIA_WILAYAS.map((wilaya) => (
                        <option key={wilaya} value={wilaya}>
                          {searchCopy.wilayas[wilaya]}
                        </option>
                      ))}
                    </select>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        className={`${btnPrimary} w-full sm:w-auto`}
                        disabled={!searchInMauritania}
                        onClick={() => void runExternalSearch()}
                      >
                        <Icon name="map" size={18} />
                        {searchCopy.searchOnMap}
                      </button>
                      <button
                        type="button"
                        className={`${btnGhost} w-full sm:w-auto`}
                        onClick={reset}
                      >
                        {copy.reset}
                      </button>
                    </div>
                  </>
                ) : externalFallbackState === "searching" ? (
                  <div
                    id="client-search-map-fallback-heading"
                    className="py-4"
                    role="status"
                    aria-busy="true"
                    tabIndex={-1}
                  >
                    <span className="block h-5 w-40 rounded bg-surface-2 motion-safe:animate-pulse" />
                    <p className="mt-4 text-sm font-medium text-muted">
                      {searchCopy.searchingMaps}
                    </p>
                  </div>
                ) : externalFallbackState === "noResult" ? (
                  <>
                    <h2
                      id="client-search-map-fallback-heading"
                      tabIndex={-1}
                      className="mt-5 text-xl font-bold tracking-tight sm:text-2xl"
                    >
                      {searchCopy.noMapResultFound}
                    </h2>
                    <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted sm:text-base">
                      {searchInMauritania
                        ? externalFallbackOrigin === "explicit_choice"
                          ? searchCopy.explicitMapNoResult
                          : copy.unavailableText
                        : searchCopy.mauritaniaOnly}
                    </p>
                    {requestState === "error" && (
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
                          disabled={requestState === "loading"}
                          onClick={() => void handleRequestMissingService()}
                        >
                          <Icon name={requestState === "loading" ? "clock" : "plus"} size={18} />
                          {requestState === "loading" ? copy.requesting : copy.request}
                        </button>
                      )}
                      <button
                        type="button"
                        className={`${btnGhost} w-full sm:w-auto`}
                        onClick={useWilayaFallback}
                      >
                        <Icon name="map" size={18} />
                        {searchCopy.changeWilaya}
                      </button>
                      <button
                        type="button"
                        className={`${btnGhost} w-full sm:w-auto`}
                        onClick={reset}
                      >
                        {copy.reset}
                      </button>
                    </div>
                  </>
                ) : externalFallbackState === "error" ? (
                  <>
                    <h2
                      id="client-search-map-fallback-heading"
                      tabIndex={-1}
                      className="mt-5 text-xl font-bold tracking-tight sm:text-2xl"
                    >
                      {copy.searchErrorTitle}
                    </h2>
                    <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted sm:text-base">
                      {externalSearchError === "rate_limited"
                        ? searchCopy.mapSearchRateLimited
                        : searchCopy.mapSearchError}
                    </p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        className={`${btnPrimary} w-full sm:w-auto`}
                        onClick={useWilayaFallback}
                      >
                        <Icon name="map" size={18} />
                        {searchCopy.changeWilaya}
                      </button>
                      <button
                        type="button"
                        className={`${btnGhost} w-full sm:w-auto`}
                        onClick={reset}
                      >
                        {copy.reset}
                      </button>
                    </div>
                  </>
                ) : didYouMean ? (
                  <>
                    <h2 className="mt-5 text-xl font-bold tracking-tight sm:text-2xl">
                      {didYouMeanLabel}
                    </h2>
                    <p className="mt-2 max-w-xl text-[15px] leading-7 text-muted sm:text-base">
                      {searchCopy.demoNote}
                    </p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <button
                        type="button"
                        className={`${btnPrimary} w-full sm:w-auto`}
                        onClick={() => acceptDidYouMean(didYouMean)}
                      >
                        {searchCopy.yes}
                      </button>
                      <button
                        type="button"
                        className={`${btnGhost} w-full sm:w-auto`}
                        onClick={() => setDidYouMean(null)}
                      >
                        {searchCopy.no}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <h2 className="mt-5 text-xl font-bold tracking-tight sm:text-2xl">
                      {searchFailed
                        ? copy.searchErrorTitle
                        : copy.unavailableTitle}
                    </h2>

                    {/* Rappeler le terme cherché : l'utilisateur voit tout de
                        suite s'il s'agit d'une faute de frappe. */}
                    {!searchFailed && lastNotFoundQuery && (
                      <p
                        dir="auto"
                        className="mt-3 inline-flex max-w-full items-center gap-2 rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm"
                      >
                        <span className="shrink-0 text-muted">
                          <Icon name="search" size={15} />
                        </span>
                        <span className="truncate font-semibold text-ink">
                          {searchedQueryLabel}
                        </span>
                      </p>
                    )}

                    <p className="mt-3 max-w-xl text-[15px] leading-7 text-muted sm:text-base">
                      {searchFailed
                        ? copy.searchErrorText
                        : copy.unavailableText}
                    </p>

                    {requestState === "error" && (
                      <p
                        className="mt-4 flex items-center gap-2 text-sm font-medium text-ask"
                        role="alert"
                      >
                        <Icon name="alert" size={17} />
                        {copy.requestError}
                      </p>
                    )}

                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      {lastNotFoundQuery && (
                        <button
                          type="button"
                          className={`${btnPrimary} w-full sm:w-auto`}
                          disabled={requestState === "loading"}
                          onClick={() => void handleRequestMissingService()}
                        >
                          <Icon
                            name={requestState === "loading" ? "clock" : "plus"}
                            size={18}
                          />
                          {requestState === "loading"
                            ? copy.requesting
                            : requestState === "error"
                              ? copy.retryRequest
                              : copy.request}
                        </button>
                      )}
                      <button
                        type="button"
                        className={`${btnGhost} w-full sm:w-auto`}
                        onClick={reset}
                      >
                        {copy.reset}
                      </button>
                    </div>
                  </>
                )}
              </section>
            )}

            {state === "requested" && (
              <section
                className={`${card} border-answer/25 bg-answer-bg p-6 sm:p-8`}
                role="status"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-answer text-white">
                  <Icon name="check" size={22} />
                </span>
                <h2 className="mt-5 text-xl font-bold tracking-tight sm:text-2xl">
                  {requestState === "duplicate"
                    ? copy.requestDuplicateTitle
                    : copy.requestedTitle}
                </h2>
                <p className="mt-2 max-w-xl text-[15px] leading-7 text-ink-soft sm:text-base">
                  {requestState === "duplicate"
                    ? copy.requestDuplicateText
                    : copy.requestedText}
                </p>
                <button
                  type="button"
                  className={`${btnGhost} mt-6 w-full sm:w-auto`}
                  onClick={reset}
                >
                  {copy.reset}
                </button>
              </section>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function SearchQueryLabel({ template, query }: { template: string; query: string }) {
  const placeholder = "{query}";
  const placeholderIndex = template.indexOf(placeholder);
  if (placeholderIndex === -1) return <>{template}</>;

  return (
    <>
      {template.slice(0, placeholderIndex)}
      <bdi dir="auto">{query}</bdi>
      {template.slice(placeholderIndex + placeholder.length)}
    </>
  );
}

function SearchResultChoices({
  copy,
  searchCopy,
  query,
  pagination,
  onPageChange,
  onSelect,
  onSearchMap,
  showMapSearch,
}: {
  copy: AppCopy;
  searchCopy: AppSearchCopy;
  query: string;
  pagination: ClientSearchResultPage<Db2Establishment>;
  onPageChange: (page: number) => void;
  onSelect: (establishment: Db2Establishment) => void;
  onSearchMap: () => void;
  showMapSearch: boolean;
}) {
  const isLastPage = pagination.page >= pagination.totalPages;

  return (
    <section className={`${card} relative overflow-hidden bg-gradient-to-br from-surface via-surface to-tint-1/25 p-4 sm:p-6`} aria-labelledby="client-search-results-heading">
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-tint-ink-1 via-brand to-answer opacity-55" />
      <p className="text-xs font-bold tracking-[0.08em] text-tint-ink-1 uppercase rtl:tracking-normal rtl:normal-case">
        {searchCopy.resultsFound}
      </p>
      <h2
        id="client-search-results-heading"
        tabIndex={-1}
        className="mt-2 text-xl font-bold tracking-tight text-ink sm:text-2xl"
      >
        {searchCopy.chooseResult}
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
        {searchCopy.chooseMatchingResult}
      </p>

      {showMapSearch && (
        <div className="mt-4 rounded-2xl border border-tint-ink-1/15 bg-tint-1/35 p-3.5">
          <p className="text-sm leading-6 text-muted">{searchCopy.searchQueryOnMapHint}</p>
          <button
            id="client-search-map-choice"
            type="button"
            className={`${btnGhost} mt-3 w-full whitespace-normal text-center leading-5 sm:w-auto`}
            onClick={onSearchMap}
          >
            <Icon name="map" size={17} />
            <span className="min-w-0 break-words [overflow-wrap:anywhere]">
              <SearchQueryLabel template={searchCopy.searchQueryOnMap} query={query} />
            </span>
          </button>
        </div>
      )}

      <ol className="mt-5 grid gap-3" aria-live="off">
        {pagination.items.map((establishment) => (
          <SearchResultChoice
            key={establishment.id}
            copy={copy}
            searchCopy={searchCopy}
            establishment={establishment}
            onSelect={onSelect}
          />
        ))}
      </ol>

      {pagination.totalPages > 1 && (
        <PaginationControls
          page={pagination.page}
          totalPages={pagination.totalPages}
          totalCount={pagination.totalCount}
          labels={searchCopy.pagination}
          onPageChange={onPageChange}
        />
      )}

      {pagination.totalPages > 1 && isLastPage && (
        <p className="mt-3 text-center text-sm font-medium text-muted" role="status">
          {searchCopy.noMoreResults}
        </p>
      )}
    </section>
  );
}

function SearchResultChoice({
  copy,
  searchCopy,
  establishment,
  onSelect,
}: {
  copy: AppCopy;
  searchCopy: AppSearchCopy;
  establishment: Db2Establishment;
  onSelect: (establishment: Db2Establishment) => void;
}) {
  const { t } = useI18n();
  const primaryBranch = getPrimaryBranch(establishment);
  const mappableBranch = primaryBranch && hasCoordinates(primaryBranch)
    ? primaryBranch
    : establishment.branches.find(hasCoordinates);
  const location = primaryBranch
    ? formatClientSearchChoiceLocation(primaryBranch)
    : "";
  const phone = establishment.phone ?? primaryBranch?.phone ?? null;
  const whatsapp = establishment.whatsapp ?? primaryBranch?.whatsapp ?? null;
  const canCall = Boolean(phone && isActionablePhone(phone));
  const canWhatsApp = Boolean(whatsapp && isActionablePhone(whatsapp));
  const choiceLabel = `${searchCopy.chooseThisResult}: ${establishment.name}`;
  const placeTypeLabels = establishment.place_types.map(
    (type) => t.superAdminServices.typeOptions[type],
  );

  return (
    <li>
      <article className="overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-surface via-surface to-tint-5/20 card-elevated transition-colors hover:border-line-strong">
        <div className="flex min-w-0 items-start gap-3 p-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-tint-5 text-tint-ink-5">
            <Icon name="store" size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 dir="auto" className="break-words text-base font-bold leading-6 text-ink">
              {establishment.name}
            </h3>
            {establishment.category && (
              <p dir="auto" className="mt-1 break-words text-sm text-muted">
                {establishment.category.name}
              </p>
            )}
            {placeTypeLabels.length > 0 && (
              <p dir="auto" className="mt-1 break-words text-sm font-medium text-ink-soft">
                {placeTypeLabels.join(" · ")}
              </p>
            )}
            {location && (
              <p dir="auto" className="mt-2 flex items-start gap-1.5 break-words text-xs leading-5 text-muted">
                <Icon name="pin" size={14} className="mt-0.5 shrink-0" />
                <span dir="auto">{location}</span>
              </p>
            )}
            {phone && (
              <p className="mt-2 text-xs leading-5 text-muted">
                <span className="font-semibold text-ink-soft">{copy.phone}</span>
                {" · "}
                <span className="ltr-isolate text-ink">{phone}</span>
              </p>
            )}
            {whatsapp && whatsapp !== phone && (
              <p className="text-xs leading-5 text-muted">
                <span className="font-semibold text-ink-soft">{copy.whatsapp}</span>
                {" · "}
                <span className="ltr-isolate text-ink">{whatsapp}</span>
              </p>
            )}
          </div>
        </div>

        <div className="border-t border-line bg-page-alt/75 p-3">
          <button
            id={`client-search-result-choice-${establishment.id}`}
            type="button"
            className={`${btnPrimary} w-full whitespace-normal text-center leading-5`}
            onClick={() => onSelect(establishment)}
            aria-label={choiceLabel}
          >
            {searchCopy.chooseThisResult}
            <span className="rtl:rotate-180">
              <Icon name="arrow" size={16} />
            </span>
          </button>

          {(canCall || canWhatsApp || mappableBranch) && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {canCall && phone && (
                <a
                  className={`${btnGhost} min-w-0 whitespace-normal px-2 text-center text-xs leading-5`}
                  href={phoneHref(phone)}
                  aria-label={`${copy.call}: ${establishment.name}`}
                >
                  <Icon name="phone" size={15} />
                  {copy.call}
                </a>
              )}
              {canWhatsApp && whatsapp && (
                <a
                  className={`${btnGhost} min-w-0 whitespace-normal px-2 text-center text-xs leading-5`}
                  href={whatsappHref(whatsapp)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${copy.whatsapp}: ${establishment.name}`}
                >
                  <Icon name="message" size={15} />
                  {copy.whatsapp}
                </a>
              )}
              {mappableBranch && (
                <a
                  className={`${btnGhost} min-w-0 whitespace-normal px-2 text-center text-xs leading-5`}
                  href={mapUrl(mappableBranch.latitude!, mappableBranch.longitude!)}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${copy.viewOnMap}: ${establishment.name}`}
                >
                  <Icon name="map" size={15} />
                  {copy.viewOnMap}
                </a>
              )}
              {mappableBranch && (
                <a
                  className={`${btnGhost} min-w-0 whitespace-normal px-2 text-center text-xs leading-5`}
                  href={directionsUrl(
                    mappableBranch.latitude!,
                    mappableBranch.longitude!,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${copy.directionsLink}: ${establishment.name}`}
                >
                  <Icon name="route" size={15} />
                  {copy.directionsLink}
                </a>
              )}
            </div>
          )}
        </div>
      </article>
    </li>
  );
}

function ContactRow({
  copy,
  icon,
  label,
  value,
  href,
  external = false,
}: {
  copy: AppCopy;
  icon: IconName;
  label: string;
  value: string | null;
  href?: string;
  external?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-line/70 bg-page-alt/75 px-3 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-tint-5/70 text-tint-ink-5">
        <Icon name={icon} size={17} />
      </span>
      <div className="min-w-0">
        <dt className="text-xs font-semibold text-muted">{label}</dt>
        <dd className="ltr-isolate mt-0.5 truncate font-semibold text-ink">
          {value ? (
            href ? (
              <a
                className="hover:text-brand-deep hover:underline dark:hover:text-brand"
                href={href}
                target={external ? "_blank" : undefined}
                rel={external ? "noreferrer" : undefined}
              >
                {value}
              </a>
            ) : (
              value
            )
          ) : (
            copy.notAvailable
          )}
        </dd>
      </div>
    </div>
  );
}

function EstablishmentResult({
  copy,
  establishment,
  onReset,
}: {
  copy: AppCopy;
  establishment: Db2Establishment;
  onReset: () => void;
}) {
  const mainBranch = getPrimaryBranch(establishment);
  const phone = establishment.phone ?? mainBranch?.phone ?? null;
  const whatsapp = establishment.whatsapp ?? mainBranch?.whatsapp ?? null;
  const canCall = Boolean(phone && isActionablePhone(phone));
  const canWhatsApp = Boolean(whatsapp && isActionablePhone(whatsapp));
  const [mapOpen, setMapOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Db2Branch | null>(null);
  const mappableBranches = establishment.branches.filter(hasCoordinates);
  const hasMultipleBranches = establishment.branches.length >= 2;
  const firstMappable = mappableBranches[0];
  const openMap = (branch: Db2Branch) => {
    setSelectedBranch(branch);
    setMapOpen(true);
  };

  return (
    <article
      className={`${card} relative overflow-hidden bg-gradient-to-br from-surface via-surface to-tint-5/20`}
      aria-label={establishment.name}
    >
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-tint-ink-5 via-brand to-tint-ink-1 opacity-55"
      />
      <div className="border-b border-line p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid size-12 place-items-center rounded-2xl bg-tint-5 text-tint-ink-5">
              <Icon name="store" size={24} />
            </span>
            <div>
              <span className="text-xs font-bold tracking-[0.08em] text-muted uppercase rtl:tracking-normal rtl:normal-case">
                {copy.dataFromLewad}
              </span>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h2 dir="auto" className="text-2xl font-bold tracking-tight">
                  {establishment.name}
                </h2>
              </div>
              <p dir="auto" className="mt-1 text-sm text-muted">
                {establishment.category?.name ?? copy.categoryUnavailable}
              </p>
            </div>
          </div>
          {hasMultipleBranches && (
            <span className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-bold text-ink">
              {establishment.branches.length} {copy.agenciesFound}
            </span>
          )}
        </div>
        {establishment.description && (
          <p dir="auto" className="mt-5 max-w-3xl text-sm leading-6 text-muted">
            {establishment.description}
          </p>
        )}
      </div>
      <div className="grid gap-7 p-5 sm:p-7 lg:grid-cols-[.9fr_1.1fr]">
        <div>
          <dl className="grid gap-3">
            <ContactRow
              copy={copy}
              icon="phone"
              label={copy.phone}
              value={phone}
              href={canCall && phone ? phoneHref(phone) : undefined}
            />
            <ContactRow
              copy={copy}
              icon="message"
              label={copy.whatsapp}
              value={whatsapp}
              href={
                canWhatsApp && whatsapp ? whatsappHref(whatsapp) : undefined
              }
              external
            />
            <ContactRow
              copy={copy}
              icon="globe"
              label={copy.website}
              value={establishment.website}
              href={
                establishment.website
                  ? websiteHref(establishment.website)
                  : undefined
              }
              external
            />
            <ContactRow
              copy={copy}
              icon="pin"
              label={copy.location}
              value={formatLocation(mainBranch, copy.notAvailable)}
            />
          </dl>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {canCall && phone ? (
              <a className={btnPrimary} href={phoneHref(phone)}>
                <Icon name="phone" size={17} />
                {copy.call}
              </a>
            ) : (
              <span className={`${btnPrimary} cursor-not-allowed opacity-50`}>
                <Icon name="phone" size={17} />
                {copy.call}
              </span>
            )}
            {canWhatsApp && whatsapp ? (
              <a
                className={btnGhost}
                href={whatsappHref(whatsapp)}
                target="_blank"
                rel="noreferrer"
              >
                <Icon name="message" size={17} />
                {copy.whatsapp}
              </a>
            ) : (
              <span className={`${btnGhost} cursor-not-allowed opacity-50`}>
                <Icon name="message" size={17} />
                {copy.whatsapp}
              </span>
            )}
            {firstMappable && (
              <button
                type="button"
                className={btnGhost}
                onClick={() => openMap(firstMappable)}
                aria-label={copy.viewOnMap}
              >
                <Icon name="pin" size={17} />
                {copy.viewOnMap}
              </button>
            )}
            {firstMappable && (
              <a
                className={btnGhost}
                href={directionsUrl(
                  firstMappable.latitude!,
                  firstMappable.longitude!,
                )}
                target="_blank"
                rel="noreferrer"
                aria-label={copy.directionsLink}
              >
                <Icon name="route" size={17} />
                {copy.directionsLink}
              </a>
            )}
          </div>
          {!firstMappable && (
            <p className="mt-3 text-xs text-muted">
              {copy.locationUnavailable}
            </p>
          )}
        </div>
        <div className="hidden lg:block">
          <div className="relative grid min-h-72 place-items-center overflow-hidden rounded-2xl border border-tint-ink-1/15 bg-gradient-to-br from-tint-1/50 via-surface-2 to-tint-5/35 p-4 text-center">
            {firstMappable ? (
              <button
                type="button"
                className={`${btnGhost} flex-col`}
                onClick={() => openMap(firstMappable)}
                aria-label={copy.viewOnMap}
              >
                <Icon name="pin" size={24} />
                {copy.viewOnMap}
              </button>
            ) : (
              <p className="text-xs text-muted">{copy.locationUnavailable}</p>
            )}
          </div>
        </div>
      </div>
      {establishment.branchesError ? (
        <div className="border-t border-line bg-page-alt p-5 sm:p-7">
          <p className="text-sm text-muted">{copy.branchesError}</p>
        </div>
      ) : hasMultipleBranches ? (
        <div
          id={`branches-${establishment.id}`}
          className="border-t border-line bg-page-alt p-5 sm:p-7"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-base font-bold">{copy.chooseBranch}</h3>
            <span className="text-xs font-semibold text-muted">
              {establishment.branches.length} {copy.agenciesFound}
            </span>
          </div>
          <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {establishment.branches.map((branch, index) => (
              <BranchCard
                key={branch.id}
                branch={branch}
                establishment={establishment}
                copy={copy}
                index={index}
                onViewMap={openMap}
              />
            ))}
          </ol>
        </div>
      ) : null}
      <div className="flex justify-end border-t border-line p-5 sm:p-7">
        <button type="button" className={btnPrimary} onClick={onReset}>
          {copy.ok}
          <Icon name="check" size={17} />
        </button>
      </div>
      {mapOpen && (
        <Suspense fallback={null}>
          <ServiceMapSheet
            copy={copy}
            branches={establishment.branches}
            selectedBranchId={selectedBranch?.id}
            onClose={() => setMapOpen(false)}
          />
        </Suspense>
      )}
    </article>
  );
}

function BranchCard({
  branch,
  establishment,
  copy,
  index,
  onViewMap,
}: {
  branch: Db2Branch;
  establishment: Db2Establishment;
  copy: AppCopy;
  index: number;
  onViewMap: (branch: Db2Branch) => void;
}) {
  const phone = branch.phone ?? establishment.phone;
  const whatsapp = branch.whatsapp ?? establishment.whatsapp;
  const mappable = hasCoordinates(branch);

  return (
    <li className="card-elevated rounded-xl border border-line bg-surface px-3 py-3">
      <div className="flex items-start gap-3">
        <span
          className={`mt-1 size-2.5 shrink-0 rounded-full ${pinColors[index % pinColors.length].split(" ")[0]}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="text-sm font-semibold text-ink" dir="auto">{establishment.name} — {branch.name}</p>
            {branch.is_main && (
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand-deep dark:text-brand">
                {copy.mainBranch}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">
            <span className="font-semibold text-ink-soft">
              {copy.nearbyPlace}
            </span>
            {" · "}
            {formatLocation(branch, copy.notAvailable)}
          </p>
          <p className="mt-2 ltr-isolate text-xs font-medium text-ink">
            {phone ?? copy.notAvailable}
          </p>
          {whatsapp && isActionablePhone(whatsapp) && (
            <a
              className="mt-1 inline-block text-xs font-semibold text-brand-deep hover:underline dark:text-brand"
              href={whatsappHref(whatsapp)}
              target="_blank"
              rel="noreferrer"
            >
              {copy.whatsapp}
            </a>
          )}
          {mappable ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`${btnGhost} min-h-11 px-2 text-xs`}
                onClick={() => onViewMap(branch)}
                aria-label={copy.viewOnMap}
              >
                <Icon name="pin" size={15} />
                {copy.viewOnMap}
              </button>
              <a
                className={`${btnGhost} min-h-11 px-2 text-xs`}
                href={directionsUrl(branch.latitude!, branch.longitude!)}
                target="_blank"
                rel="noreferrer"
                aria-label={copy.directionsLink}
              >
                <Icon name="route" size={15} />
                {copy.directionsLink}
              </a>
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted">
              {copy.locationUnavailable}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

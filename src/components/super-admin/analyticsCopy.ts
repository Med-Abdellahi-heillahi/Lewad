import type { Locale } from '../../i18n'
import type { AnalyticsDeviceType, AnalyticsEventType, AnalyticsLocale } from '../../lib/analytics'

type SuperAdminAnalyticsCopy = {
  title: string
  text: string
  badge: string
  refresh: string
  refreshing: string
  loading: string
  unavailableTitle: string
  unavailableText: string
  retry: string
  empty: string
  metrics: {
    totalVisits: string
    activeNow: string
    today: string
    week: string
    month: string
    uniqueSessions: string
    estimated: string
    estimatedHint: string
    authenticated: string
    anonymous: string
  }
  sections: {
    topPages: string
    topPagesText: string
    eventTypes: string
    eventTypesText: string
    devices: string
    devicesText: string
    locales: string
    localesText: string
    recent: string
    recentText: string
  }
  eventLabels: Record<AnalyticsEventType, string>
  deviceLabels: Record<AnalyticsDeviceType, string>
  localeLabels: Record<AnalyticsLocale, string>
}

export const analyticsCopy: Record<Locale, SuperAdminAnalyticsCopy> = {
  fr: {
    title: 'Analytique de la plateforme',
    text: 'Activité agrégée de Lewad, sans identifiants ni métadonnées personnelles.',
    badge: 'Lecture seule',
    refresh: 'Actualiser',
    refreshing: 'Actualisation…',
    loading: 'Chargement de l’analytique',
    unavailableTitle: 'Analytique indisponible',
    unavailableText: 'Les données agrégées ne peuvent pas être chargées pour le moment.',
    retry: 'Réessayer',
    empty: 'Aucune activité sur cette période',
    metrics: {
      totalVisits: 'Total des visites',
      activeNow: 'Sessions actives maintenant',
      today: 'Visites aujourd’hui',
      week: 'Visites sur 7 jours',
      month: 'Visites sur 30 jours',
      uniqueSessions: 'Visiteurs uniques',
      estimated: 'Visites estimées',
      estimatedHint: 'Estimation publique basée sur l’activité récente.',
      authenticated: 'Visites authentifiées',
      anonymous: 'Visites anonymes',
    },
    sections: {
      topPages: 'Pages les plus visitées',
      topPagesText: 'Répartition des vues par chemin public sûr.',
      eventTypes: 'Types d’événements',
      eventTypesText: 'Actions agrégées suivies sur la plateforme.',
      devices: 'Appareils',
      devicesText: 'Répartition par catégorie d’appareil.',
      locales: 'Langues',
      localesText: 'Répartition selon la langue de l’interface.',
      recent: 'Activité récente',
      recentText: 'Flux agrégé sans identifiant ni métadonnée brute, avec heure regroupée par tranches de cinq minutes.',
    },
    eventLabels: {
      page_view: 'Vue de page',
      search_started: 'Recherche démarrée',
      search_completed: 'Recherche terminée',
      external_map_lookup: 'Recherche cartographique externe',
      add_business_started: 'Ajout d’établissement démarré',
      recharge_started: 'Recharge démarrée',
      install_prompt_viewed: 'Invite d’installation affichée',
    },
    deviceLabels: { mobile: 'Mobile', tablet: 'Tablette', desktop: 'Ordinateur', unknown: 'Inconnu' },
    localeLabels: { fr: 'Français', ar: 'Arabe', en: 'Anglais', unknown: 'Inconnue' },
  },
  ar: {
    title: 'تحليلات المنصة',
    text: 'نشاط لواد المجمّع من دون معرّفات أو بيانات وصفية شخصية.',
    badge: 'للقراءة فقط',
    refresh: 'تحديث',
    refreshing: 'جارٍ التحديث…',
    loading: 'جارٍ تحميل التحليلات',
    unavailableTitle: 'التحليلات غير متاحة',
    unavailableText: 'تعذر تحميل البيانات المجمّعة حالياً.',
    retry: 'إعادة المحاولة',
    empty: 'لا يوجد نشاط خلال هذه الفترة',
    metrics: {
      totalVisits: 'إجمالي الزيارات',
      activeNow: 'الجلسات النشطة الآن',
      today: 'زيارات اليوم',
      week: 'زيارات خلال 7 أيام',
      month: 'زيارات خلال 30 يوماً',
      uniqueSessions: 'الزوار الفريدون',
      estimated: 'زيارات تقديرية',
      estimatedHint: 'تقدير عام مبني على النشاط الأخير.',
      authenticated: 'زيارات مسجّلة الدخول',
      anonymous: 'زيارات مجهولة',
    },
    sections: {
      topPages: 'الصفحات الأكثر زيارة',
      topPagesText: 'توزيع المشاهدات حسب المسارات العامة الآمنة.',
      eventTypes: 'أنواع الأحداث',
      eventTypesText: 'الإجراءات المجمّعة المتتبعة على المنصة.',
      devices: 'الأجهزة',
      devicesText: 'التوزيع حسب فئة الجهاز.',
      locales: 'اللغات',
      localesText: 'التوزيع حسب لغة الواجهة.',
      recent: 'النشاط الأخير',
      recentText: 'تدفق مجمّع بلا معرّفات أو بيانات وصفية خام، مع تجميع الوقت في فترات من خمس دقائق.',
    },
    eventLabels: {
      page_view: 'عرض صفحة',
      search_started: 'بدء بحث',
      search_completed: 'اكتمال بحث',
      external_map_lookup: 'بحث خارجي على الخريطة',
      add_business_started: 'بدء إضافة مؤسسة',
      recharge_started: 'بدء إعادة شحن',
      install_prompt_viewed: 'عرض دعوة التثبيت',
    },
    deviceLabels: { mobile: 'هاتف', tablet: 'جهاز لوحي', desktop: 'حاسوب', unknown: 'غير معروف' },
    localeLabels: { fr: 'الفرنسية', ar: 'العربية', en: 'الإنجليزية', unknown: 'غير معروفة' },
  },
  en: {
    title: 'Platform analytics',
    text: 'Aggregated Lewad activity without personal identifiers or raw metadata.',
    badge: 'Read only',
    refresh: 'Refresh',
    refreshing: 'Refreshing…',
    loading: 'Loading analytics',
    unavailableTitle: 'Analytics unavailable',
    unavailableText: 'Aggregated data cannot be loaded right now.',
    retry: 'Try again',
    empty: 'No activity in this period',
    metrics: {
      totalVisits: 'Total visits',
      activeNow: 'Active sessions now',
      today: 'Visits today',
      week: 'Visits over 7 days',
      month: 'Visits over 30 days',
      uniqueSessions: 'Unique visitors',
      estimated: 'Estimated visits',
      estimatedHint: 'Public estimate based on recent activity.',
      authenticated: 'Authenticated visits',
      anonymous: 'Anonymous visits',
    },
    sections: {
      topPages: 'Top pages',
      topPagesText: 'View distribution across safe public paths.',
      eventTypes: 'Event types',
      eventTypesText: 'Aggregated actions tracked across the platform.',
      devices: 'Devices',
      devicesText: 'Distribution by device category.',
      locales: 'Languages',
      localesText: 'Distribution by interface language.',
      recent: 'Recent activity',
      recentText: 'Aggregated feed without identifiers or raw metadata, with time grouped into five-minute buckets.',
    },
    eventLabels: {
      page_view: 'Page view',
      search_started: 'Search started',
      search_completed: 'Search completed',
      external_map_lookup: 'External map lookup',
      add_business_started: 'Business submission started',
      recharge_started: 'Recharge started',
      install_prompt_viewed: 'Install prompt viewed',
    },
    deviceLabels: { mobile: 'Mobile', tablet: 'Tablet', desktop: 'Desktop', unknown: 'Unknown' },
    localeLabels: { fr: 'French', ar: 'Arabic', en: 'English', unknown: 'Unknown' },
  },
}

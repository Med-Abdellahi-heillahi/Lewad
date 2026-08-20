import type { Locale } from '../../i18n'
import type { AdminAlertId } from '../../lib/admin'

export type AdminTabId = 'dashboard' | 'requests' | 'users' | 'credits' | 'search-logs' | 'services' | 'system'
export type SuperAdminTabId = 'overview' | 'admins' | 'users' | 'audit' | 'security' | 'settings'

type AlertText = { title: string; text: string }

type AdminMetricsCopy = {
  title: string
  subtitle: string
  totalUsers: string
  activeUsers: string
  totalWallets: string
  totalPoints: string
  pointsHint: string
  totalSearches: string
  successfulSearches: string
  notFoundSearches: string
  pendingRequests: string
  approvedEstablishments: string
  activeBranches: string
  activeCategories: string
}

type AdminAlertsCopy = {
  title: string
  subtitle: string
  none: string
  items: Record<AdminAlertId, AlertText>
}

type AdminRechargeCopy = {
  title: string
  subtitle: string
  emptyTitle: string
  emptyText: string
  badge: string
  placeholderNotice: string
  totalRequests: string
  pending: string
  confirmed: string
  amountExpected: string
  amountCollected: string
  manualPayments: string
}

type AdminChartsCopy = {
  window: string
  empty: string
  searchesTitle: string
  searchesSubtitle: string
  searchesLegend: string
  notFoundLegend: string
  usersTitle: string
  usersSubtitle: string
  signupsLegend: string
  rolesTitle: string
  rolesSubtitle: string
  requestsTitle: string
  requestsSubtitle: string
  rechargeTitle: string
  rechargeSubtitle: string
  today: string
  thisMonth: string
  verified: string
  normalUsers: string
  admins: string
  superAdmins: string
  suspended: string
}

type AdminActionsCopy = {
  view: string
  edit: string
  add: string
  remove: string
  adjust: string
  soon: string
  soonTitle: string
}

type AdminUsersCopy = {
  title: string
  subtitle: string
  searchLabel: string
  searchPlaceholder: string
  roleFilter: string
  statusFilter: string
  all: string
  viewDetails: string
  changeStatus: string
  changeRole: string
  superAdminRequired: string
  deletionDisabled: string
  suspendAccount: string
  reactivateAccount: string
  visit: string
  suspend: string
  reactivate: string
  actions: string
  name: string
  role: string
  status: string
  image: string
  lastLogin: string
  notAvailable: string
  detailsTitle: string
  close: string
  fullName: string
  arabicFullName: string
  email: string
  phone: string
  avatarUrl: string
  noAvatar: string
  createdAt: string
  updatedAt: string
  statusConfirmTitle: string
  roleConfirmTitle: string
  statusConfirmText: string
  roleConfirmText: string
  roleWarning: string
  currentValue: string
  newValue: string
  confirm: string
  cancel: string
  saving: string
  userUpdated: string
  userUpdateFailed: string
  alerts: {
    roleSecurityTitle: string
    roleSecurityText: string
    deletionTitle: string
    deletionText: string
    dismiss: string
  }
  stats: {
    title: string
    total: string
    normalUsers: string
    admins: string
    superAdmins: string
    active: string
    suspended: string
  }
}

type AdminCreditsCopy = {
  title: string
  subtitle: string
  user: string
  balance: string
  addCredits: string
  recharges: string
  actions: string
  visit: string
  walletMissing: string
  points: string
  noRecharge: string
  pendingRequest: string
  rechargeApproved: string
  rechargeRejected: string
  moduleNotConnected: string
  noPendingRequest: string
  approveRecharge: string
  rejectRecharge: string
  approving: string
  rejecting: string
  approved: string
  rejected: string
  decisionFailed: string
  alreadyHandled: string
  requestedPoints: string
  amount: string
  offer: string
  requestedOn: string
  financeTitle: string
  currentBalance: string
  creditsReceived: string
  creditsSpent: string
  searchCount: string
  rechargeCount: string
  recentSearches: string
  noSearches: string
  lastRechargeStatus: string
  partialTotals: string
  loadingFinance: string
  financeUnavailable: string
  downloadPdf: string
  print: string
  close: string
  reportTitle: string
  reportGenerated: string
}

type AdminRequestsCopy = {
  title: string
  subtitle: string
  addEstablishment: string
  addEstablishmentShort: string
  addThisService: string
  viewDetails: string
  markReviewed: string
  markDuplicate: string
  markRejected: string
  markAdded: string
  editNote: string
  alreadyInStatus: string
  detailsTitle: string
  noteTitle: string
  noteSubtitle: string
  notePreview: string
  noNote: string
  requestQuery: string
  normalizedQuery: string
  userMessage: string
  requestUpdated: string
  requestUpdateFailed: string
  serviceAddedSuccess: string
  serviceAddFailed: string
  requestMarkedAdded: string
  close: string
  dismiss: string
  reviewActions: string
}

type AdminEstablishmentFormCopy = {
  title: string
  subtitle: string
  requiredSection: string
  optionalSection: string
  nameFr: string
  nameAr: string
  phone: string
  image: string
  location: string
  nearestPlace: string
  openingDate: string
  closingDate: string
  phonePlaceholder: string
  phoneHint: string
  imagePlaceholder: string
  imageHint: string
  locationPlaceholder: string
  nearestPlacePlaceholder: string
  requiredHint: string
  submit: string
  creating: string
  cancel: string
  createdTitle: string
  createdText: string
  creationFailed: string
  addAnother: string
  searchEstablishment: string
  adminAccessRequired: string
  errorsTitle: string
  errorNameFr: string
  errorNameAr: string
  errorNameArScript: string
  errorPhone: string
  errorImage: string
}

type AdminSidebarCopy = {
  menu: string
  collapse: string
  expand: string
  title: string
  adminNavigation: string
  recharges: string
  userNavigation: string
  userSpace: string
  search: string
  profile: string
  credits: string
  recharge: string
  settings: string
  contact: string
  superAdminSpace: string
}

type SuperAdminCopy = {
  title: string
  intro: string
  navigation: string
  accessOnly: string
  tabs: Record<SuperAdminTabId, string>
  goToAdmin: string
  backToApp: string
  overview: {
    title: string
    text: string
    totalUsers: string
    admins: string
    superAdmins: string
    activeUsers: string
    suspendedUsers: string
    totalSearches: string
    pendingRequests: string
    pendingRecharges: string
    approvedServices: string
    unavailable: string
  }
  platformAnalytics: { title: string; text: string }
  people: {
    adminsTitle: string
    adminsText: string
    usersTitle: string
    usersText: string
  }
  audit: { title: string; text: string; unavailable: string }
  security: { title: string; text: string; checklist: string[] }
  settings: { title: string; text: string; items: string[] }
}

type AdminContentCopy = {
  unknownUser: string
  unnamedUser: string
  partialProfilesUnavailable: string
  loading: {
    requests: string
    users: string
    credits: string
    searches: string
    services: string
  }
  empty: {
    requestsTitle: string
    requestsText: string
    usersTitle: string
    creditsTitle: string
    searchesTitle: string
    searchesText: string
    servicesTitle: string
  }
  table: {
    request: string
    user: string
    email: string
    status: string
    linkedLog: string
    teamNote: string
    action: string
    phone: string
    role: string
    createdAt: string
    balance: string
    lastMovement: string
    updatedAt: string
    movement: string
    reason: string
    date: string
    search: string
    points: string
    results: string
    name: string
    slug: string
    order: string
    category: string
    verified: string
    establishment: string
    branch: string
    city: string
    main: string
  }
  filters: {
    searchLabel: string
    searchPlaceholder: string
    statusLabel: string
    dateLabel: string
    allStatuses: string
  }
  sections: {
    wallets: string
    recentMovements: string
    categories: string
    establishments: string
    branches: string
    categoriesEmpty: string
    establishmentsEmpty: string
    branchesEmpty: string
  }
  status: Record<string, string>
}

type AdminCopy = {
  tabs: Record<AdminTabId, string>
  access: {
    unavailableTitle: string
    deniedTitle: string
    unavailableText: string
    deniedText: string
    retry: string
    backHome: string
    backToApp: string
    checking: string
    redirecting: string
  }
  header: {
    product: string
    admin: string
    superAdmin: string
    subtitle: string
    userSpace: string
    refresh: string
    refreshing: string
    dataErrorTitle: string
    dataErrorText: string
  }
  dashboard: {
    loading: string
    unavailableTitle: string
    unavailableText: string
    pendingRequests: string
    users: string
    wallets: string
    searches: string
    establishments: string
    categories: string
  }
  metrics: AdminMetricsCopy
  alerts: AdminAlertsCopy
  recharge: AdminRechargeCopy
  actions: AdminActionsCopy
  charts: AdminChartsCopy
  sidebar: AdminSidebarCopy
  users: AdminUsersCopy
  credits: AdminCreditsCopy
  requests: AdminRequestsCopy
  establishmentForm: AdminEstablishmentFormCopy
  content: AdminContentCopy
  mobile: {
    user: string
    createdAt: string
    linkedLog: string
    requestStatus: string
    teamNote: string
    notePlaceholder: string
    save: string
    saving: string
    phone: string
    role: string
    balance: string
    lastMovement: string
    updatedAt: string
    movement: string
    reason: string
    date: string
    points: string
    results: string
    slug: string
    order: string
    category: string
    verified: string
    establishment: string
    city: string
    main: string
    yes: string
    no: string
  }
  pagination: {
    previous: string
    next: string
    page: string
    of: string
    items: string
  }
  superSpace: SuperAdminCopy
  system: {
    title: string
    eyebrow: string
    intro: string
    permanentNotice: string
    securityNotice: string
    futureNotice: string
    futureAction: string
    noDestructiveAction: string
    overview: string
    totalUsers: string
    pendingRequests: string
    activeCategories: string
    blocks: {
      adminManagement: { title: string; text: string }
      roleManagement: { title: string; text: string }
      securityOverview: { title: string; text: string }
      backupRecovery: { title: string; text: string }
      systemSettings: { title: string; text: string }
      dangerousActions: { title: string; text: string }
    }
    securityChecklist: string[]
  }
}

export const adminCopy: Record<Locale, AdminCopy> = {
  fr: {
    tabs: { dashboard: 'Tableau de bord', requests: 'Demandes', users: 'Utilisateurs', credits: 'Crédits', 'search-logs': 'Recherches', services: 'Services', system: 'Système' },
    access: {
      unavailableTitle: 'Impossible de vérifier l’accès', deniedTitle: 'Accès refusé',
      unavailableText: 'Votre profil n’a pas pu être chargé. Réessayez dans un instant.', deniedText: 'Cette page est réservée à l’équipe Lewad.',
      retry: 'Réessayer', backHome: 'Retour à l’accueil', backToApp: 'Retour à Lewad', checking: 'Vérification de votre espace…', redirecting: 'Redirection vers votre espace…',
    },
    header: {
      product: 'Espace Admin', admin: 'Admin', superAdmin: 'Super Admin', subtitle: 'Vue sécurisée des opérations Lewad', userSpace: 'Voir l’espace utilisateur',
      refresh: 'Actualiser', refreshing: 'Actualisation…', dataErrorTitle: 'Accès aux données admin impossible',
      dataErrorText: 'Vérifiez que la migration Admin V1 est appliquée et que votre compte a un rôle admin actif.',
    },
    dashboard: {
      loading: 'Chargement des données admin', unavailableTitle: 'Données indisponibles', unavailableText: 'Les compteurs d’administration ne sont pas accessibles actuellement.',
      pendingRequests: 'Demandes en attente', users: 'Utilisateurs', wallets: 'Portefeuilles', searches: 'Recherches exécutées', establishments: 'Établissements approuvés', categories: 'Catégories actives',
    },
    metrics: {
      title: 'Indicateurs', subtitle: 'Compteurs lus dans votre portée d’administration.',
      totalUsers: 'Utilisateurs', activeUsers: 'Comptes actifs', totalWallets: 'Portefeuilles',
      totalPoints: 'Points en circulation', pointsHint: 'Somme des soldes, sans valeur monétaire.',
      totalSearches: 'Recherches', successfulSearches: 'Recherches abouties', notFoundSearches: 'Sans résultat',
      pendingRequests: 'Demandes en attente', approvedEstablishments: 'Établissements approuvés',
      activeBranches: 'Agences actives', activeCategories: 'Catégories actives',
    },
    alerts: {
      title: 'Points d’attention', subtitle: 'Signaux calculés à partir des données déjà chargées.',
      none: 'Aucun point d’attention pour le moment.',
      items: {
        pendingRequests: { title: 'Demandes de service en attente', text: 'Des demandes attendent une revue dans l’onglet Demandes.' },
        emptyWallets: { title: 'Comptes sans points', text: 'Ces utilisateurs ne peuvent plus lancer de recherche.' },
        notFoundRate: { title: 'Beaucoup de recherches sans résultat', text: 'Le catalogue ne couvre probablement pas la demande réelle.' },
        searchErrors: { title: 'Erreurs de recherche', text: 'Des recherches se sont terminées en erreur. À vérifier côté base.' },
        establishmentsWithoutBranch: { title: 'Établissements sans agence', text: 'Approuvés mais sans agence : introuvables sur la carte.' },
        branchesWithoutCoordinates: { title: 'Agences sans coordonnées', text: 'Sans latitude ni longitude, l’itinéraire reste indisponible.' },
        rechargeManual: { title: 'Recharge encore manuelle', text: 'La validation des recharges se fait par WhatsApp, sans workflow automatisé.' },
        businessSubmissions: { title: 'Dépôt d’établissement non actif', text: 'La soumission par les professionnels n’est pas encore connectée.' },
        backupCheck: { title: 'Sauvegarde à vérifier', text: 'Testez une restauration avant la mise en production.' },
      },
    },
    recharge: {
      title: 'Recharges', subtitle: 'Suivi des demandes de recharge et des montants.',
      emptyTitle: 'Le module de recharge réelle n’est pas encore connecté.',
      emptyText: 'Les montants encaissés et les demandes de recharge seront disponibles après la création du workflow de paiement/recharge.',
      badge: 'Prévu pour la phase DB4 / Paiement',
      placeholderNotice: 'Les montants seront calculés après l’ajout du système réel de recharge. Aucun chiffre financier n’est affiché ici.',
      totalRequests: 'Demandes de recharge', pending: 'En attente', confirmed: 'Confirmées',
      amountExpected: 'Montant attendu', amountCollected: 'Montant encaissé', manualPayments: 'Paiements WhatsApp manuels',
    },
    actions: {
      view: 'Voir', edit: 'Modifier', add: 'Ajouter', remove: 'Supprimer', adjust: 'Ajuster',
      soon: 'Bientôt disponible', soonTitle: 'Disponible après validation de la sécurité côté base.',
    },
    charts: {
      window: '30 derniers jours', empty: 'Aucune donnée sur la période.',
      searchesTitle: 'Recherches', searchesSubtitle: 'Activité de recherche par jour.',
      searchesLegend: 'recherches', notFoundLegend: 'sans résultat',
      usersTitle: 'Inscriptions', usersSubtitle: 'Nouveaux comptes par jour.', signupsLegend: 'nouveaux comptes',
      rolesTitle: 'Rôles', rolesSubtitle: 'Répartition des comptes.',
      requestsTitle: 'Demandes', requestsSubtitle: 'Répartition par statut de traitement.',
      rechargeTitle: 'Recharges', rechargeSubtitle: 'Disponible après le workflow de paiement.',
      today: 'Recherches aujourd’hui', thisMonth: 'Recherches ce mois', verified: 'Services vérifiés',
      normalUsers: 'Utilisateurs', admins: 'Admins', superAdmins: 'Super admins', suspended: 'Comptes suspendus',
    },
    sidebar: {
      menu: 'Ouvrir la navigation admin', collapse: 'Réduire la navigation admin', expand: 'Développer la navigation admin', title: 'Navigation admin', adminNavigation: 'Administration', recharges: 'Recharges et paiements',
      userNavigation: 'Espace utilisateur', userSpace: 'Espace utilisateur', search: 'Recherche', profile: 'Profil', credits: 'Mes crédits', recharge: 'Recharger', settings: 'Paramètres', contact: 'Contact', superAdminSpace: 'Aller à Super Admin',
    },
    users: {
      title: 'Utilisateurs', subtitle: 'Gérez les comptes, les rôles et les statuts des utilisateurs Lewad.',
      searchLabel: 'Rechercher un utilisateur', searchPlaceholder: 'Nom, e-mail ou téléphone', roleFilter: 'Rôle', statusFilter: 'Statut', all: 'Tous',
      viewDetails: 'Voir détails', changeStatus: 'Modifier statut', changeRole: 'Modifier rôle', superAdminRequired: 'Accès super admin requis', deletionDisabled: 'Suppression désactivée', suspendAccount: 'Suspendre le compte', reactivateAccount: 'Réactiver le compte',
      visit: 'Visiter', suspend: 'Suspendre', reactivate: 'Réactiver', actions: 'Actions', name: 'Nom', role: 'Rôle', status: 'Statut', image: 'Image', lastLogin: 'Date de dernière connexion', notAvailable: 'Non disponible',
      detailsTitle: 'Détails de l’utilisateur', close: 'Fermer', fullName: 'Nom complet', arabicFullName: 'Nom complet arabe', email: 'E-mail', phone: 'Téléphone', avatarUrl: 'URL de l’avatar', noAvatar: 'Aucun avatar', createdAt: 'Créé le', updatedAt: 'Mis à jour le',
      statusConfirmTitle: 'Confirmer le changement de statut', roleConfirmTitle: 'Confirmer le changement de rôle', statusConfirmText: 'Cette action modifie les droits d’accès de cet utilisateur.', roleConfirmText: 'Cette action modifie les droits d’accès de cet utilisateur.', roleWarning: 'Changer un rôle peut donner accès à des zones sensibles de Lewad.', currentValue: 'Valeur actuelle', newValue: 'Nouvelle valeur',
      confirm: 'Confirmer', cancel: 'Annuler', saving: 'Mise à jour…', userUpdated: 'Utilisateur mis à jour.', userUpdateFailed: 'Impossible de mettre à jour l’utilisateur.',
      alerts: {
        roleSecurityTitle: 'Rôles protégés', roleSecurityText: 'Les changements de rôle sont réservés aux Super Admins.',
        deletionTitle: 'Suppression indisponible', deletionText: 'La suppression d’utilisateurs est désactivée dans cette version.', dismiss: 'Fermer la notification',
      },
      stats: { title: 'Statistiques de la page actuelle', total: 'Total utilisateurs', normalUsers: 'Utilisateurs', admins: 'Admins', superAdmins: 'Super Admins', active: 'Actifs', suspended: 'Suspendus' },
    },
    credits: {
      title: 'Crédits', subtitle: 'Soldes des comptes et approbation des recharges.',
      user: 'Utilisateur', balance: 'Solde', addCredits: 'Ajouter crédits', recharges: 'Recharges', actions: 'Actions', visit: 'Visiter',
      walletMissing: 'Wallet manquant', points: 'points',
      noRecharge: 'Aucune recharge', pendingRequest: 'Demande en attente', rechargeApproved: 'Recharge confirmée', rechargeRejected: 'Recharge rejetée',
      moduleNotConnected: 'Module recharge non connecté',
      noPendingRequest: 'Aucune demande de recharge en attente pour cet utilisateur.',
      approveRecharge: 'Approuver la recharge', rejectRecharge: 'Rejeter la recharge', approving: 'Approbation…', rejecting: 'Rejet…',
      approved: 'Recharge approuvée.', rejected: 'Recharge rejetée.', decisionFailed: 'Impossible de traiter la recharge.', alreadyHandled: 'Cette demande a déjà été traitée.',
      requestedPoints: 'Points demandés', amount: 'Montant', offer: 'Offre', requestedOn: 'Demandée le',
      financeTitle: 'Fiche financière', currentBalance: 'Solde actuel', creditsReceived: 'Total crédits reçus', creditsSpent: 'Total crédits dépensés',
      searchCount: 'Nombre de recherches', rechargeCount: 'Nombre de recharges', recentSearches: 'Recherches récentes', noSearches: 'Aucune recherche',
      lastRechargeStatus: 'Statut recharge récente', partialTotals: 'Totaux calculés sur les mouvements les plus récents.',
      loadingFinance: 'Chargement de la fiche…', financeUnavailable: 'Fiche financière indisponible.',
      downloadPdf: 'Télécharger PDF', print: 'Imprimer', close: 'Fermer',
      reportTitle: 'Rapport de recherches Lewad', reportGenerated: 'Généré le',
    },
    requests: {
      title: 'Demandes', subtitle: 'Services recherchés sans résultat, à traiter par l’équipe.',
      addEstablishment: 'Ajouter un établissement', addEstablishmentShort: 'Ajouter', addThisService: 'Ajouter ce service',
      viewDetails: 'Voir les détails', markReviewed: 'Marquer comme examinée', markDuplicate: 'Marquer comme doublon', markRejected: 'Rejeter la demande', markAdded: 'Marquer comme ajoutée', editNote: 'Modifier la note interne',
      alreadyInStatus: 'La demande est déjà dans cet état.',
      detailsTitle: 'Détail de la demande', noteTitle: 'Note interne', noteSubtitle: 'Visible uniquement par l’équipe Lewad.', notePreview: 'Note', noNote: 'Aucune note',
      requestQuery: 'Recherche', normalizedQuery: 'Requête normalisée', userMessage: 'Message de l’utilisateur',
      requestUpdated: 'Demande mise à jour.', requestUpdateFailed: 'Impossible de mettre à jour la demande.', serviceAddedSuccess: 'Service ajouté avec succès.', serviceAddFailed: 'Impossible d’ajouter ce service.', requestMarkedAdded: 'Demande marquée comme ajoutée.',
      close: 'Fermer', dismiss: 'Fermer la notification', reviewActions: 'Actions de traitement',
    },
    establishmentForm: {
      title: 'Ajouter un établissement', subtitle: 'Créez la fiche d’un service local à partir d’une demande.',
      requiredSection: 'Informations obligatoires', optionalSection: 'Informations complémentaires',
      nameFr: 'Nom en français', nameAr: 'Nom en arabe', phone: 'Téléphone',
      image: 'Image', location: 'Localisation', nearestPlace: 'Lieu le plus proche', openingDate: 'Date d’ouverture', closingDate: 'Date de fermeture',
      phonePlaceholder: '2X XX XX XX', phoneHint: '8 chiffres, commençant par 2, 3 ou 4.',
      imagePlaceholder: 'https://… .jpg', imageHint: 'Lien vers une image déjà hébergée (.png, .jpg, .jpeg). L’envoi de fichiers arrivera plus tard.',
      locationPlaceholder: 'Quartier, ville', nearestPlacePlaceholder: 'Repère connu à proximité',
      requiredHint: 'Les champs marqués d’un astérisque sont obligatoires.',
      submit: 'Ajouter', creating: 'Création…', cancel: 'Annuler',
      createdTitle: 'Service ajouté avec succès', createdText: 'La fiche et son agence principale sont maintenant disponibles dans Lewad.',
      creationFailed: 'Impossible d’ajouter ce service.', addAnother: 'Ajouter un autre établissement',
      searchEstablishment: 'Vous pouvez maintenant rechercher cet établissement dans Lewad.', adminAccessRequired: 'Un accès administrateur actif est requis.',
      errorsTitle: 'Corrigez les champs signalés',
      errorNameFr: 'Le nom en français est obligatoire.', errorNameAr: 'Le nom en arabe est obligatoire.', errorNameArScript: 'Le nom en arabe doit être écrit en caractères arabes.',
      errorPhone: 'Numéro invalide : 8 chiffres commençant par 2, 3 ou 4.', errorImage: 'Format d’image accepté : .png, .jpg ou .jpeg.',
    },
    content: {
      unknownUser: 'Utilisateur inconnu', unnamedUser: 'Utilisateur sans nom', partialProfilesUnavailable: 'Profils partiellement indisponibles',
      loading: { requests: 'Chargement des demandes', users: 'Chargement des utilisateurs', credits: 'Chargement des crédits', searches: 'Chargement des recherches', services: 'Chargement des services' },
      empty: {
        requestsTitle: 'Aucune demande', requestsText: 'Les demandes de services manquants apparaîtront ici.', usersTitle: 'Aucun utilisateur trouvé.', creditsTitle: 'Aucun portefeuille',
        searchesTitle: 'Aucune recherche', searchesText: 'Aucun journal ne correspond aux filtres.', servicesTitle: 'Services indisponibles',
      },
      table: {
        request: 'Demande', user: 'Utilisateur', email: 'E-mail', status: 'État', linkedLog: 'Journal lié', teamNote: 'Note équipe', action: 'Action', phone: 'Téléphone', role: 'Rôle', createdAt: 'Créé le',
        balance: 'Solde', lastMovement: 'Dernier mouvement visible', updatedAt: 'Mis à jour', movement: 'Mouvement', reason: 'Motif', date: 'Date', search: 'Recherche', points: 'Points', results: 'Résultats',
        name: 'Nom', slug: 'Slug', order: 'Ordre', category: 'Catégorie', verified: 'Vérifié', establishment: 'Établissement', branch: 'Succursale', city: 'Ville', main: 'Principale',
      },
      filters: { searchLabel: 'Filtrer par recherche', searchPlaceholder: 'Filtrer par recherche…', statusLabel: 'Filtrer par statut', dateLabel: 'Filtrer par date', allStatuses: 'Tous les statuts' },
      sections: { wallets: 'Portefeuilles', recentMovements: 'Mouvements récents', categories: 'Catégories', establishments: 'Établissements', branches: 'Succursales', categoriesEmpty: 'Aucune catégorie', establishmentsEmpty: 'Aucun établissement', branchesEmpty: 'Aucune succursale' },
      status: { active: 'actif', approved: 'approuvé', added: 'ajouté', success: 'réussi', pending: 'en attente', reviewed: 'revu', draft: 'brouillon', rejected: 'rejeté', suspended: 'suspendu', deleted: 'supprimé', error: 'erreur', insufficient_credits: 'points insuffisants', closed: 'fermé', duplicate: 'doublon', not_found: 'sans résultat', invalid_query: 'requête invalide', admin: 'admin', super_admin: 'super admin', user: 'utilisateur', welcome_bonus: 'bonus de bienvenue', search_debit: 'recherche', recharge_credit: 'recharge', admin_adjustment: 'ajustement', referral_bonus: 'partage Lewad' },
    },
    mobile: {
      user: 'Utilisateur', createdAt: 'Créée le', linkedLog: 'Journal lié', requestStatus: 'État de la demande', teamNote: 'Note de l’équipe', notePlaceholder: 'Ajouter une note interne…', save: 'Enregistrer', saving: 'Enregistrement…',
      phone: 'Téléphone', role: 'Rôle', balance: 'Solde', lastMovement: 'Dernier mouvement', updatedAt: 'Mis à jour', movement: 'Mouvement', reason: 'Motif', date: 'Date', points: 'Points', results: 'Résultats',
      slug: 'Slug', order: 'Ordre', category: 'Catégorie', verified: 'Vérifié', establishment: 'Établissement', city: 'Ville', main: 'Principale', yes: 'Oui', no: 'Non',
    },
    pagination: { previous: 'Précédent', next: 'Suivant', page: 'Page', of: 'sur', items: 'éléments' },
    superSpace: {
      title: 'Espace Super Admin', intro: 'Pilotage global, sécurité et gestion des accès de la plateforme.', navigation: 'Navigation Super Admin', accessOnly: 'Accès réservé au super admin',
      tabs: { overview: 'Vue globale', admins: 'Gestion des admins', users: 'Utilisateurs', audit: 'Audit', security: 'Sécurité', settings: 'Paramètres système' },
      goToAdmin: 'Retour Admin', backToApp: 'Retour App',
      overview: { title: 'Vue globale de la plateforme', text: 'Indicateurs issus de votre portée d’administration existante.', totalUsers: 'Total utilisateurs', admins: 'Admins', superAdmins: 'Super admins', activeUsers: 'Utilisateurs actifs', suspendedUsers: 'Utilisateurs suspendus', totalSearches: 'Total recherches', pendingRequests: 'Demandes en attente', pendingRecharges: 'Recharges en attente', approvedServices: 'Services approuvés', unavailable: 'Indisponible' },
      platformAnalytics: { title: 'Analytique plateforme', text: 'Lecture globale des opérations Lewad.' },
      people: { adminsTitle: 'Gestion des admins', adminsText: 'Promouvez, rétrogradez ou suspendez les comptes autorisés via les RPC sécurisées.', usersTitle: 'Utilisateurs', usersText: 'Gérez les rôles et états des comptes dans les limites appliquées par la base.' },
      audit: { title: 'Journal d’audit', text: 'Les événements d’administration sont conservés côté base.', unavailable: 'Journal d’audit bientôt disponible dans cette interface.' },
      security: { title: 'Sécurité', text: 'Rappels opérationnels sans exposer de secret ni de configuration distante.', checklist: ['Les changements de rôle passent par une RPC super-admin', 'Les changements de statut sont contrôlés par la base', 'Les actions sensibles produisent un événement d’audit', 'La migration et les réglages Auth distants restent à vérifier par l’équipe'] },
      settings: { title: 'Paramètres système', text: 'Ces rappels sont des espaces réservés V1 : aucun réglage de plateforme n’est modifiable depuis le navigateur.', items: ['État des migrations à vérifier dans Supabase', 'Réglages Auth à vérifier dans Supabase', 'État PWA visible côté client'] },
    },
    system: {
      title: 'Système', eyebrow: 'Super Admin', intro: 'Aperçu préparatoire des fonctions sensibles de Lewad.',
      permanentNotice: 'La gestion des rôles, des admins et des paramètres sensibles sera activée dans une prochaine étape.',
      securityNotice: 'Les futures actions Super Admin devront être protégées par is_super_admin(), une RLS dédiée, des RPC sécurisées et des audit logs.',
      futureNotice: 'Cette action sera disponible uniquement après validation de la sécurité.', futureAction: 'Action future',
      noDestructiveAction: 'Cette section est préparée pour les futures actions sensibles. Aucune action destructive n’est activée dans cette version.',
      overview: 'Aperçu système', totalUsers: 'Utilisateurs', pendingRequests: 'Demandes en attente', activeCategories: 'Catégories actives',
      blocks: {
        adminManagement: { title: 'Gestion des admins', text: 'La gestion des accès administrateurs sera ajoutée après validation de la sécurité.' },
        roleManagement: { title: 'Gestion des rôles', text: 'La modification des rôles reste indisponible dans cette version.' },
        securityOverview: { title: 'Aperçu sécurité', text: 'Les contrôles affichés décrivent la préparation requise avant toute action sensible.' },
        backupRecovery: { title: 'Sauvegarde et restauration', text: 'Les sauvegardes sont gérées dans la console Supabase. La date du dernier test de restauration reste à renseigner par l’équipe.' },
        systemSettings: { title: 'Paramètres système', text: 'Les paramètres globaux ne seront exposés qu’après validation de leur modèle de sécurité.' },
        dangerousActions: { title: 'Actions sensibles', text: 'Aucune action irréversible ou destructive n’est disponible dans cette version.' },
      },
      securityChecklist: ['RLS active sur les tables administrées', 'Aucune clé service-role dans le client', 'Lectures admin limitées au moindre privilège', 'La fonction is_admin() ne distingue pas encore super_admin'],
    },
  },
  ar: {
    tabs: { dashboard: 'لوحة التحكم', requests: 'الطلبات', users: 'المستخدمون', credits: 'النقاط', 'search-logs': 'عمليات البحث', services: 'الخدمات', system: 'النظام' },
    access: {
      unavailableTitle: 'تعذر التحقق من الوصول', deniedTitle: 'تم رفض الوصول',
      unavailableText: 'تعذر تحميل ملفك الشخصي. أعد المحاولة لاحقاً.', deniedText: 'هذه الصفحة مخصصة لفريق لواد.',
      retry: 'إعادة المحاولة', backHome: 'العودة إلى الرئيسية', backToApp: 'العودة إلى لواد', checking: 'جارٍ التحقق من مساحتك…', redirecting: 'جارٍ تحويلك إلى مساحتك…',
    },
    header: {
      product: 'مساحة الإدارة', admin: 'مشرف', superAdmin: 'مشرف عام', subtitle: 'عرض آمن لعمليات لواد', userSpace: 'عرض مساحة المستخدم',
      refresh: 'تحديث', refreshing: 'جارٍ التحديث…', dataErrorTitle: 'تعذر الوصول إلى بيانات الإدارة',
      dataErrorText: 'تحقق من تطبيق ترحيل إدارة الإصدار الأول ومن أن لحسابك دور مشرف نشط.',
    },
    dashboard: {
      loading: 'جارٍ تحميل بيانات الإدارة', unavailableTitle: 'البيانات غير متاحة', unavailableText: 'يتعذر الوصول إلى مؤشرات الإدارة حالياً.',
      pendingRequests: 'طلبات معلقة', users: 'المستخدمون', wallets: 'المحافظ', searches: 'عمليات بحث منفذة', establishments: 'مؤسسات معتمدة', categories: 'فئات نشطة',
    },
    metrics: {
      title: 'المؤشرات', subtitle: 'عدادات مقروءة ضمن نطاق صلاحياتك الإدارية.',
      totalUsers: 'المستخدمون', activeUsers: 'حسابات نشطة', totalWallets: 'المحافظ',
      totalPoints: 'النقاط المتداولة', pointsHint: 'مجموع الأرصدة، دون قيمة مالية.',
      totalSearches: 'عمليات البحث', successfulSearches: 'عمليات ناجحة', notFoundSearches: 'بلا نتيجة',
      pendingRequests: 'طلبات معلقة', approvedEstablishments: 'مؤسسات معتمدة',
      activeBranches: 'وكالات نشطة', activeCategories: 'فئات نشطة',
    },
    alerts: {
      title: 'نقاط تستدعي الانتباه', subtitle: 'إشارات محسوبة من البيانات المحمّلة أصلاً.',
      none: 'لا توجد نقاط تستدعي الانتباه حالياً.',
      items: {
        pendingRequests: { title: 'طلبات خدمة معلقة', text: 'هناك طلبات تنتظر المراجعة في تبويب الطلبات.' },
        emptyWallets: { title: 'حسابات بلا نقاط', text: 'لم يعد بإمكان هؤلاء المستخدمين إجراء أي بحث.' },
        notFoundRate: { title: 'عمليات بحث كثيرة بلا نتيجة', text: 'الدليل على الأرجح لا يغطي الطلب الفعلي.' },
        searchErrors: { title: 'أخطاء في البحث', text: 'انتهت بعض عمليات البحث بخطأ. يلزم التحقق من جهة القاعدة.' },
        establishmentsWithoutBranch: { title: 'مؤسسات بلا وكالة', text: 'معتمدة لكن بلا وكالة: لا تظهر على الخريطة.' },
        branchesWithoutCoordinates: { title: 'وكالات بلا إحداثيات', text: 'بدون خط الطول والعرض يبقى الطريق غير متاح.' },
        rechargeManual: { title: 'الشحن ما زال يدوياً', text: 'تتم المصادقة على الشحن عبر واتساب، دون مسار آلي.' },
        businessSubmissions: { title: 'إضافة المؤسسات غير مفعّلة', text: 'لم يُربط بعد إرسال الطلبات من أصحاب المؤسسات.' },
        backupCheck: { title: 'النسخ الاحتياطي يحتاج تحققاً', text: 'اختبر عملية استعادة قبل الإطلاق.' },
      },
    },
    recharge: {
      title: 'الشحن', subtitle: 'متابعة طلبات الشحن والمبالغ.',
      emptyTitle: 'وحدة الشحن الحقيقية غير مرتبطة بعد.',
      emptyText: 'ستتوفر المبالغ المحصّلة وطلبات الشحن بعد إنشاء مسار الدفع والشحن.',
      badge: 'مبرمج لمرحلة DB4 / الدفع',
      placeholderNotice: 'ستُحتسب المبالغ بعد إضافة نظام الشحن الفعلي. لا يُعرض هنا أي رقم مالي.',
      totalRequests: 'طلبات الشحن', pending: 'معلقة', confirmed: 'مؤكدة',
      amountExpected: 'المبلغ المتوقع', amountCollected: 'المبلغ المحصّل', manualPayments: 'مدفوعات واتساب يدوية',
    },
    actions: {
      view: 'عرض', edit: 'تعديل', add: 'إضافة', remove: 'حذف', adjust: 'تعديل الرصيد',
      soon: 'قريباً', soonTitle: 'يتاح بعد التحقق الأمني على مستوى القاعدة.',
    },
    charts: {
      window: 'آخر 30 يوماً', empty: 'لا توجد بيانات في هذه الفترة.',
      searchesTitle: 'عمليات البحث', searchesSubtitle: 'نشاط البحث يومياً.',
      searchesLegend: 'عملية بحث', notFoundLegend: 'بلا نتيجة',
      usersTitle: 'التسجيلات', usersSubtitle: 'حسابات جديدة يومياً.', signupsLegend: 'حسابات جديدة',
      rolesTitle: 'الأدوار', rolesSubtitle: 'توزيع الحسابات.',
      requestsTitle: 'الطلبات', requestsSubtitle: 'التوزيع حسب حالة المعالجة.',
      rechargeTitle: 'إعادة الشحن', rechargeSubtitle: 'متاح بعد إنشاء مسار الدفع.',
      today: 'عمليات البحث اليوم', thisMonth: 'عمليات البحث هذا الشهر', verified: 'خدمات موثّقة',
      normalUsers: 'المستخدمون', admins: 'المشرفون', superAdmins: 'المشرفون العامون', suspended: 'حسابات موقوفة',
    },
    sidebar: {
      menu: 'فتح تنقل الإدارة', collapse: 'طيّ تنقل الإدارة', expand: 'توسيع تنقل الإدارة', title: 'تنقل الإدارة', adminNavigation: 'الإدارة', recharges: 'الشحن والمدفوعات',
      userNavigation: 'مساحة المستخدم', userSpace: 'مساحة المستخدم', search: 'البحث', profile: 'الملف الشخصي', credits: 'نقاطي', recharge: 'شحن', settings: 'الإعدادات', contact: 'التواصل', superAdminSpace: 'الانتقال إلى المدير الأعلى',
    },
    users: {
      title: 'المستخدمون', subtitle: 'أدر حسابات مستخدمي لواد وأدوارهم وحالاتهم.',
      searchLabel: 'البحث عن مستخدم', searchPlaceholder: 'الاسم أو البريد الإلكتروني أو الهاتف', roleFilter: 'الدور', statusFilter: 'الحالة', all: 'الكل',
      viewDetails: 'عرض التفاصيل', changeStatus: 'تغيير الحالة', changeRole: 'تغيير الدور', superAdminRequired: 'يتطلب صلاحية المشرف العام', deletionDisabled: 'الحذف معطّل', suspendAccount: 'تعليق الحساب', reactivateAccount: 'إعادة تفعيل الحساب',
      visit: 'عرض', suspend: 'تعليق', reactivate: 'إعادة التفعيل', actions: 'الإجراءات', name: 'الاسم', role: 'الدور', status: 'الحالة', image: 'الصورة', lastLogin: 'آخر تسجيل دخول', notAvailable: 'غير متوفر',
      detailsTitle: 'تفاصيل المستخدم', close: 'إغلاق', fullName: 'الاسم الكامل', arabicFullName: 'الاسم الكامل بالعربية', email: 'البريد الإلكتروني', phone: 'الهاتف', avatarUrl: 'رابط الصورة الشخصية', noAvatar: 'لا توجد صورة شخصية', createdAt: 'تاريخ الإنشاء', updatedAt: 'آخر تحديث',
      statusConfirmTitle: 'تأكيد تغيير الحالة', roleConfirmTitle: 'تأكيد تغيير الدور', statusConfirmText: 'يغيّر هذا الإجراء صلاحيات وصول هذا المستخدم.', roleConfirmText: 'يغيّر هذا الإجراء صلاحيات وصول هذا المستخدم.', roleWarning: 'قد يمنح تغيير الدور الوصول إلى مناطق حساسة في لواد.', currentValue: 'القيمة الحالية', newValue: 'القيمة الجديدة',
      confirm: 'تأكيد', cancel: 'إلغاء', saving: 'جارٍ التحديث…', userUpdated: 'تم تحديث المستخدم.', userUpdateFailed: 'تعذر تحديث المستخدم.',
      alerts: {
        roleSecurityTitle: 'الأدوار محمية', roleSecurityText: 'تغييرات الأدوار مخصصة للمشرفين العامين فقط.',
        deletionTitle: 'الحذف غير متاح', deletionText: 'حذف المستخدمين معطّل في هذه النسخة.', dismiss: 'إغلاق الإشعار',
      },
      stats: { title: 'إحصاءات الصفحة الحالية', total: 'إجمالي المستخدمين', normalUsers: 'المستخدمون', admins: 'المشرفون', superAdmins: 'المشرفون العامون', active: 'نشطون', suspended: 'موقوفون' },
    },
    credits: {
      title: 'النقاط', subtitle: 'أرصدة الحسابات واعتماد طلبات إعادة الشحن.',
      user: 'المستخدم', balance: 'الرصيد', addCredits: 'إضافة نقاط', recharges: 'إعادة الشحن', actions: 'الإجراءات', visit: 'عرض',
      walletMissing: 'لا توجد محفظة', points: 'نقاط',
      noRecharge: 'لا توجد إعادة شحن', pendingRequest: 'طلب معلق', rechargeApproved: 'تم تأكيد إعادة الشحن', rechargeRejected: 'تم رفض إعادة الشحن',
      moduleNotConnected: 'وحدة إعادة الشحن غير متصلة',
      noPendingRequest: 'لا توجد طلبات إعادة شحن معلقة لهذا المستخدم.',
      approveRecharge: 'تأكيد إعادة الشحن', rejectRecharge: 'رفض إعادة الشحن', approving: 'جارٍ التأكيد…', rejecting: 'جارٍ الرفض…',
      approved: 'تم تأكيد إعادة الشحن.', rejected: 'تم رفض إعادة الشحن.', decisionFailed: 'تعذّر معالجة إعادة الشحن.', alreadyHandled: 'تمت معالجة هذا الطلب من قبل.',
      requestedPoints: 'النقاط المطلوبة', amount: 'المبلغ', offer: 'العرض', requestedOn: 'تاريخ الطلب',
      financeTitle: 'البطاقة المالية', currentBalance: 'الرصيد الحالي', creditsReceived: 'إجمالي النقاط المستلمة', creditsSpent: 'إجمالي النقاط المصروفة',
      searchCount: 'عدد عمليات البحث', rechargeCount: 'عدد مرات إعادة الشحن', recentSearches: 'عمليات البحث الأخيرة', noSearches: 'لا توجد عمليات بحث',
      lastRechargeStatus: 'حالة آخر إعادة شحن', partialTotals: 'حُسبت الإجماليات من أحدث الحركات.',
      loadingFinance: 'جارٍ تحميل البطاقة…', financeUnavailable: 'البطاقة المالية غير متاحة.',
      downloadPdf: 'تحميل PDF', print: 'طباعة', close: 'إغلاق',
      reportTitle: 'تقرير عمليات البحث في لواد', reportGenerated: 'أُنشئ في',
    },
    requests: {
      title: 'الطلبات', subtitle: 'خدمات بُحث عنها ولم تُوجد، بانتظار معالجة الفريق.',
      addEstablishment: 'إضافة مؤسسة', addEstablishmentShort: 'إضافة', addThisService: 'إضافة هذه الخدمة',
      viewDetails: 'عرض التفاصيل', markReviewed: 'وضع علامة تمت المراجعة', markDuplicate: 'وضع علامة مكرر', markRejected: 'رفض الطلب', markAdded: 'وضع علامة تمت الإضافة', editNote: 'تعديل الملاحظة الداخلية',
      alreadyInStatus: 'الطلب في هذه الحالة بالفعل.',
      detailsTitle: 'تفاصيل الطلب', noteTitle: 'ملاحظة داخلية', noteSubtitle: 'مرئية لفريق لواد فقط.', notePreview: 'ملاحظة', noNote: 'لا توجد ملاحظة',
      requestQuery: 'البحث', normalizedQuery: 'الصيغة الموحّدة', userMessage: 'رسالة المستخدم',
      requestUpdated: 'تم تحديث الطلب.', requestUpdateFailed: 'تعذر تحديث الطلب.', serviceAddedSuccess: 'تمت إضافة الخدمة بنجاح.', serviceAddFailed: 'تعذر إضافة هذه الخدمة.', requestMarkedAdded: 'تم تعليم الطلب كمضاف.',
      close: 'إغلاق', dismiss: 'إغلاق الإشعار', reviewActions: 'إجراءات المعالجة',
    },
    establishmentForm: {
      title: 'إضافة مؤسسة', subtitle: 'أنشئ بطاقة خدمة محلية انطلاقًا من طلب.',
      requiredSection: 'معلومات إلزامية', optionalSection: 'معلومات إضافية',
      nameFr: 'الاسم بالفرنسية', nameAr: 'الاسم بالعربية', phone: 'الهاتف',
      image: 'الصورة', location: 'الموقع', nearestPlace: 'أقرب مَعلَم', openingDate: 'تاريخ الافتتاح', closingDate: 'تاريخ الإغلاق',
      phonePlaceholder: '2X XX XX XX', phoneHint: '٨ أرقام تبدأ بـ 2 أو 3 أو 4.',
      imagePlaceholder: 'https://… .jpg', imageHint: 'رابط صورة مستضافة مسبقًا (‎.png أو ‎.jpg أو ‎.jpeg). رفع الملفات سيأتي لاحقًا.',
      locationPlaceholder: 'الحي، المدينة', nearestPlacePlaceholder: 'مَعلَم معروف قريب',
      requiredHint: 'الحقول المعلَّمة بنجمة إلزامية.',
      submit: 'إضافة', creating: 'جارٍ الإنشاء…', cancel: 'إلغاء',
      createdTitle: 'تمت إضافة الخدمة بنجاح', createdText: 'أصبحت البطاقة ووكالتها الرئيسية متاحتين الآن على لواد.',
      creationFailed: 'تعذر إضافة هذه الخدمة.', addAnother: 'إضافة مؤسسة أخرى',
      searchEstablishment: 'يمكنك الآن البحث عن هذه المؤسسة في لواد.', adminAccessRequired: 'يلزم حساب مشرف نشط.',
      errorsTitle: 'صحّح الحقول المشار إليها',
      errorNameFr: 'الاسم بالفرنسية إلزامي.', errorNameAr: 'الاسم بالعربية إلزامي.', errorNameArScript: 'يجب كتابة الاسم بالعربية بحروف عربية.',
      errorPhone: 'رقم غير صالح: ٨ أرقام تبدأ بـ 2 أو 3 أو 4.', errorImage: 'صيغ الصور المقبولة: ‎.png أو ‎.jpg أو ‎.jpeg.',
    },
    content: {
      unknownUser: 'مستخدم غير معروف', unnamedUser: 'مستخدم بلا اسم', partialProfilesUnavailable: 'ملفات بعض المستخدمين غير متاحة',
      loading: { requests: 'جارٍ تحميل الطلبات', users: 'جارٍ تحميل المستخدمين', credits: 'جارٍ تحميل النقاط', searches: 'جارٍ تحميل عمليات البحث', services: 'جارٍ تحميل الخدمات' },
      empty: {
        requestsTitle: 'لا توجد طلبات', requestsText: 'ستظهر هنا طلبات الخدمات غير المتوفرة.', usersTitle: 'لم يتم العثور على مستخدمين.', creditsTitle: 'لا توجد محفظة',
        searchesTitle: 'لا توجد عمليات بحث', searchesText: 'لا يوجد سجل يطابق عوامل التصفية.', servicesTitle: 'الخدمات غير متاحة',
      },
      table: {
        request: 'الطلب', user: 'المستخدم', email: 'البريد الإلكتروني', status: 'الحالة', linkedLog: 'سجل مرتبط', teamNote: 'ملاحظة الفريق', action: 'إجراء', phone: 'الهاتف', role: 'الدور', createdAt: 'تاريخ الإنشاء',
        balance: 'الرصيد', lastMovement: 'آخر حركة ظاهرة', updatedAt: 'آخر تحديث', movement: 'الحركة', reason: 'السبب', date: 'التاريخ', search: 'البحث', points: 'النقاط', results: 'النتائج',
        name: 'الاسم', slug: 'المعرّف', order: 'الترتيب', category: 'الفئة', verified: 'تم التحقق', establishment: 'المؤسسة', branch: 'الوكالة', city: 'المدينة', main: 'الرئيسية',
      },
      filters: { searchLabel: 'تصفية حسب البحث', searchPlaceholder: 'تصفية حسب البحث…', statusLabel: 'تصفية حسب الحالة', dateLabel: 'تصفية حسب التاريخ', allStatuses: 'كل الحالات' },
      sections: { wallets: 'المحافظ', recentMovements: 'أحدث الحركات', categories: 'الفئات', establishments: 'المؤسسات', branches: 'الوكالات', categoriesEmpty: 'لا توجد فئات', establishmentsEmpty: 'لا توجد مؤسسات', branchesEmpty: 'لا توجد وكالات' },
      status: { active: 'نشط', approved: 'معتمد', added: 'أضيف', success: 'ناجح', pending: 'معلّق', reviewed: 'تمت المراجعة', draft: 'مسودة', rejected: 'مرفوض', suspended: 'موقوف', deleted: 'محذوف', error: 'خطأ', insufficient_credits: 'نقاط غير كافية', closed: 'مغلق', duplicate: 'مكرر', not_found: 'بلا نتيجة', invalid_query: 'طلب غير صالح', admin: 'مشرف', super_admin: 'مشرف عام', user: 'مستخدم', welcome_bonus: 'مكافأة ترحيب', search_debit: 'بحث', recharge_credit: 'شحن', admin_adjustment: 'تعديل', referral_bonus: 'مشاركة لواد' },
    },
    mobile: {
      user: 'المستخدم', createdAt: 'تاريخ الإنشاء', linkedLog: 'سجل مرتبط', requestStatus: 'حالة الطلب', teamNote: 'ملاحظة الفريق', notePlaceholder: 'أضف ملاحظة داخلية…', save: 'حفظ', saving: 'جارٍ الحفظ…',
      phone: 'الهاتف', role: 'الدور', balance: 'الرصيد', lastMovement: 'آخر حركة', updatedAt: 'آخر تحديث', movement: 'الحركة', reason: 'السبب', date: 'التاريخ', points: 'النقاط', results: 'النتائج',
      slug: 'المعرّف', order: 'الترتيب', category: 'الفئة', verified: 'تم التحقق', establishment: 'المؤسسة', city: 'المدينة', main: 'الرئيسية', yes: 'نعم', no: 'لا',
    },
    pagination: { previous: 'السابق', next: 'التالي', page: 'الصفحة', of: 'من', items: 'عنصر' },
    superSpace: {
      title: 'مساحة المدير الأعلى', intro: 'إدارة شاملة للمنصة والأمان وصلاحيات الوصول.', navigation: 'تنقل المدير الأعلى', accessOnly: 'الوصول مخصص للمدير الأعلى فقط',
      tabs: { overview: 'نظرة عامة', admins: 'إدارة المدراء', users: 'المستخدمون', audit: 'سجل التدقيق', security: 'الأمان', settings: 'إعدادات النظام' },
      goToAdmin: 'العودة إلى الإدارة', backToApp: 'العودة إلى التطبيق',
      overview: { title: 'نظرة عامة على المنصة', text: 'مؤشرات من نطاق الإدارة المتاح لحسابك.', totalUsers: 'إجمالي المستخدمين', admins: 'المدراء', superAdmins: 'المدراء الأعلى', activeUsers: 'المستخدمون النشطون', suspendedUsers: 'المستخدمون الموقوفون', totalSearches: 'إجمالي عمليات البحث', pendingRequests: 'طلبات معلقة', pendingRecharges: 'عمليات شحن معلقة', approvedServices: 'خدمات معتمدة', unavailable: 'غير متاح' },
      platformAnalytics: { title: 'تحليلات المنصة', text: 'عرض شامل لعمليات لواد.' },
      people: { adminsTitle: 'إدارة المدراء', adminsText: 'يمكن ترقية الحسابات أو خفض دورها أو تعليقها عبر عمليات RPC الآمنة.', usersTitle: 'المستخدمون', usersText: 'أدر الأدوار والحالات ضمن الحدود التي تفرضها قاعدة البيانات.' },
      audit: { title: 'سجل التدقيق', text: 'تُحفَظ أحداث الإدارة في قاعدة البيانات.', unavailable: 'سجل التدقيق سيتوفر قريباً في هذه الواجهة.' },
      security: { title: 'الأمان', text: 'تذكيرات تشغيلية من دون كشف أسرار أو إعدادات بعيدة.', checklist: ['تغييرات الأدوار تمر عبر RPC للمدير الأعلى', 'تغييرات الحالة تخضع للتحقق في قاعدة البيانات', 'الإجراءات الحساسة تنتج حدث تدقيق', 'يجب أن يتحقق الفريق من الترحيلات وإعدادات Auth البعيدة'] },
      settings: { title: 'إعدادات النظام', text: 'هذه التذكيرات عناصر نائبـة في V1: لا يمكن تعديل أي إعداد للمنصة من المتصفح.', items: ['تحقق من حالة الترحيلات في Supabase', 'تحقق من إعدادات Auth في Supabase', 'حالة PWA ظاهرة من جهة العميل'] },
    },
    system: {
      title: 'النظام', eyebrow: 'المشرف العام', intro: 'نظرة تحضيرية لوظائف لواد الحساسة.',
      permanentNotice: 'ستُفعَّل إدارة الأدوار والمشرفين والإعدادات الحسّاسة في مرحلة لاحقة.',
      securityNotice: 'يجب حماية إجراءات المشرف العام المستقبلية عبر is_super_admin() وسياسات RLS مخصصة وعمليات RPC آمنة وسجلات تدقيق.',
      futureNotice: 'لن يتوفر هذا الإجراء إلا بعد التحقق الأمني.', futureAction: 'إجراء مستقبلي',
      noDestructiveAction: 'هذه المساحة معدّة للإجراءات الحساسة مستقبلاً. لا يوجد أي إجراء تدميري مفعّل في هذه النسخة.',
      overview: 'نظرة عامة على النظام', totalUsers: 'المستخدمون', pendingRequests: 'طلبات معلقة', activeCategories: 'فئات نشطة',
      blocks: {
        adminManagement: { title: 'إدارة المشرفين', text: 'ستُضاف إدارة صلاحيات المشرفين بعد التحقق الأمني.' },
        roleManagement: { title: 'إدارة الأدوار', text: 'تعديل الأدوار غير متاح في هذه النسخة.' },
        securityOverview: { title: 'نظرة أمنية', text: 'تصف الضوابط المعروضة ما يلزم قبل أي إجراء حساس.' },
        backupRecovery: { title: 'النسخ الاحتياطي والاستعادة', text: 'تُدار النسخ الاحتياطية في وحدة تحكم Supabase، ويُسجَّل تاريخ آخر اختبار استعادة من الفريق.' },
        systemSettings: { title: 'إعدادات النظام', text: 'لن تُعرض الإعدادات العامة إلا بعد اعتماد نموذجها الأمني.' },
        dangerousActions: { title: 'إجراءات حساسة', text: 'لا يوجد أي إجراء غير قابل للعكس أو تدميري في هذه النسخة.' },
      },
      securityChecklist: ['سياسات RLS مفعّلة على الجداول الإدارية', 'لا توجد خدمة-role key في العميل', 'قراءات الإدارة تعمل بأقل قدر من الصلاحيات', 'دالة is_admin() لا تميّز super_admin بعد'],
    },
  },
  en: {
    tabs: { dashboard: 'Dashboard', requests: 'Requests', users: 'Users', credits: 'Credits', 'search-logs': 'Search logs', services: 'Services', system: 'System' },
    access: {
      unavailableTitle: 'Unable to verify access', deniedTitle: 'Access denied',
      unavailableText: 'Your profile could not be loaded. Please try again later.', deniedText: 'This page is reserved for the Lewad team.',
      retry: 'Try again', backHome: 'Back to home', backToApp: 'Back to Lewad', checking: 'Checking your space…', redirecting: 'Redirecting to your space…',
    },
    header: {
      product: 'Admin Space', admin: 'Admin', superAdmin: 'Super Admin', subtitle: 'Secure view of Lewad operations', userSpace: 'View user space',
      refresh: 'Refresh', refreshing: 'Refreshing…', dataErrorTitle: 'Unable to access admin data',
      dataErrorText: 'Check that the Admin V1 migration is applied and that your account has an active admin role.',
    },
    dashboard: {
      loading: 'Loading admin data', unavailableTitle: 'Data unavailable', unavailableText: 'Administration counters are currently unavailable.',
      pendingRequests: 'Pending requests', users: 'Users', wallets: 'Wallets', searches: 'Completed searches', establishments: 'Approved establishments', categories: 'Active categories',
    },
    metrics: {
      title: 'Metrics', subtitle: 'Counters read within your administration scope.',
      totalUsers: 'Users', activeUsers: 'Active accounts', totalWallets: 'Wallets',
      totalPoints: 'Points in circulation', pointsHint: 'Sum of balances, no monetary value.',
      totalSearches: 'Searches', successfulSearches: 'Successful searches', notFoundSearches: 'No result',
      pendingRequests: 'Pending requests', approvedEstablishments: 'Approved establishments',
      activeBranches: 'Active branches', activeCategories: 'Active categories',
    },
    alerts: {
      title: 'Needs attention', subtitle: 'Signals derived from data already loaded.',
      none: 'Nothing needs attention right now.',
      items: {
        pendingRequests: { title: 'Pending service requests', text: 'Requests are waiting for review in the Requests tab.' },
        emptyWallets: { title: 'Accounts with no points', text: 'These users can no longer run a search.' },
        notFoundRate: { title: 'Many searches return nothing', text: 'The directory likely does not cover real demand.' },
        searchErrors: { title: 'Search errors', text: 'Some searches ended in an error. Worth checking on the database side.' },
        establishmentsWithoutBranch: { title: 'Establishments without a branch', text: 'Approved but with no branch: not findable on the map.' },
        branchesWithoutCoordinates: { title: 'Branches without coordinates', text: 'Without latitude and longitude, directions stay unavailable.' },
        rechargeManual: { title: 'Recharge is still manual', text: 'Recharges are validated over WhatsApp, with no automated workflow.' },
        businessSubmissions: { title: 'Business submission not active', text: 'Submission by business owners is not connected yet.' },
        backupCheck: { title: 'Backup needs verifying', text: 'Run a restore test before going to production.' },
      },
    },
    recharge: {
      title: 'Recharges', subtitle: 'Recharge requests and amounts.',
      emptyTitle: 'The real recharge module is not connected yet.',
      emptyText: 'Collected amounts and recharge requests will be available once the payment/recharge workflow exists.',
      badge: 'Planned for the DB4 / Payment phase',
      placeholderNotice: 'Amounts will be computed once the real recharge system is added. No financial figure is shown here.',
      totalRequests: 'Recharge requests', pending: 'Pending', confirmed: 'Confirmed',
      amountExpected: 'Expected amount', amountCollected: 'Collected amount', manualPayments: 'Manual WhatsApp payments',
    },
    actions: {
      view: 'View', edit: 'Edit', add: 'Add', remove: 'Delete', adjust: 'Adjust',
      soon: 'Coming soon', soonTitle: 'Available after a database-side security review.',
    },
    charts: {
      window: 'Last 30 days', empty: 'No data for this period.',
      searchesTitle: 'Searches', searchesSubtitle: 'Search activity per day.',
      searchesLegend: 'searches', notFoundLegend: 'with no result',
      usersTitle: 'Sign-ups', usersSubtitle: 'New accounts per day.', signupsLegend: 'new accounts',
      rolesTitle: 'Roles', rolesSubtitle: 'Account distribution.',
      requestsTitle: 'Requests', requestsSubtitle: 'Distribution by review status.',
      rechargeTitle: 'Recharges', rechargeSubtitle: 'Available once the payment workflow exists.',
      today: 'Searches today', thisMonth: 'Searches this month', verified: 'Verified services',
      normalUsers: 'Users', admins: 'Admins', superAdmins: 'Super admins', suspended: 'Suspended accounts',
    },
    sidebar: {
      menu: 'Open admin navigation', collapse: 'Collapse admin navigation', expand: 'Expand admin navigation', title: 'Admin navigation', adminNavigation: 'Administration', recharges: 'Recharges & payments',
      userNavigation: 'User space', userSpace: 'User space', search: 'Search', profile: 'Profile', credits: 'My credits', recharge: 'Recharge', settings: 'Settings', contact: 'Contact', superAdminSpace: 'Go to Super Admin',
    },
    users: {
      title: 'Users', subtitle: 'Manage Lewad user accounts, roles and statuses.',
      searchLabel: 'Search for a user', searchPlaceholder: 'Name, email or phone', roleFilter: 'Role', statusFilter: 'Status', all: 'All',
      viewDetails: 'View details', changeStatus: 'Change status', changeRole: 'Change role', superAdminRequired: 'Super-admin access required', deletionDisabled: 'Deletion disabled', suspendAccount: 'Suspend account', reactivateAccount: 'Reactivate account',
      visit: 'Visit', suspend: 'Suspend', reactivate: 'Reactivate', actions: 'Actions', name: 'Name', role: 'Role', status: 'Status', image: 'Image', lastLogin: 'Last login', notAvailable: 'Not available',
      detailsTitle: 'User details', close: 'Close', fullName: 'Full name', arabicFullName: 'Arabic full name', email: 'Email', phone: 'Phone', avatarUrl: 'Avatar URL', noAvatar: 'No avatar', createdAt: 'Created', updatedAt: 'Updated',
      statusConfirmTitle: 'Confirm status change', roleConfirmTitle: 'Confirm role change', statusConfirmText: 'This action changes this user’s access rights.', roleConfirmText: 'This action changes this user’s access rights.', roleWarning: 'Changing a role can grant access to sensitive Lewad areas.', currentValue: 'Current value', newValue: 'New value',
      confirm: 'Confirm', cancel: 'Cancel', saving: 'Updating…', userUpdated: 'User updated.', userUpdateFailed: 'Unable to update the user.',
      alerts: {
        roleSecurityTitle: 'Roles are protected', roleSecurityText: 'Role changes are reserved for Super Admins.',
        deletionTitle: 'Deletion unavailable', deletionText: 'User deletion is disabled in this version.', dismiss: 'Dismiss notification',
      },
      stats: { title: 'Current page statistics', total: 'Total users', normalUsers: 'Users', admins: 'Admins', superAdmins: 'Super Admins', active: 'Active', suspended: 'Suspended' },
    },
    credits: {
      title: 'Credits', subtitle: 'Account balances and recharge approvals.',
      user: 'User', balance: 'Balance', addCredits: 'Add credits', recharges: 'Recharges', actions: 'Actions', visit: 'Visit',
      walletMissing: 'Wallet missing', points: 'points',
      noRecharge: 'No recharge', pendingRequest: 'Pending request', rechargeApproved: 'Recharge approved', rechargeRejected: 'Recharge rejected',
      moduleNotConnected: 'Recharge module not connected',
      noPendingRequest: 'No pending recharge request for this user.',
      approveRecharge: 'Approve recharge', rejectRecharge: 'Reject recharge', approving: 'Approving…', rejecting: 'Rejecting…',
      approved: 'Recharge approved.', rejected: 'Recharge rejected.', decisionFailed: 'Unable to process the recharge.', alreadyHandled: 'This request has already been handled.',
      requestedPoints: 'Requested points', amount: 'Amount', offer: 'Offer', requestedOn: 'Requested on',
      financeTitle: 'Financial record', currentBalance: 'Current balance', creditsReceived: 'Total credits received', creditsSpent: 'Total credits spent',
      searchCount: 'Search count', rechargeCount: 'Recharge count', recentSearches: 'Recent searches', noSearches: 'No searches',
      lastRechargeStatus: 'Latest recharge status', partialTotals: 'Totals computed from the most recent movements.',
      loadingFinance: 'Loading record…', financeUnavailable: 'Financial record unavailable.',
      downloadPdf: 'Download PDF', print: 'Print', close: 'Close',
      reportTitle: 'Lewad search report', reportGenerated: 'Generated on',
    },
    requests: {
      title: 'Requests', subtitle: 'Services searched for without a result, waiting for the team.',
      addEstablishment: 'Add establishment', addEstablishmentShort: 'Add', addThisService: 'Add this service',
      viewDetails: 'View details', markReviewed: 'Mark as reviewed', markDuplicate: 'Mark as duplicate', markRejected: 'Reject request', markAdded: 'Mark as added', editNote: 'Edit internal note',
      alreadyInStatus: 'The request already has this status.',
      detailsTitle: 'Request details', noteTitle: 'Internal note', noteSubtitle: 'Visible to the Lewad team only.', notePreview: 'Note', noNote: 'No note',
      requestQuery: 'Search', normalizedQuery: 'Normalized query', userMessage: 'User message',
      requestUpdated: 'Request updated.', requestUpdateFailed: 'Could not update request.', serviceAddedSuccess: 'Service added successfully.', serviceAddFailed: 'Could not add this service.', requestMarkedAdded: 'Request marked as added.',
      close: 'Close', dismiss: 'Dismiss notification', reviewActions: 'Review actions',
    },
    establishmentForm: {
      title: 'Add establishment', subtitle: 'Create a local service listing from a request.',
      requiredSection: 'Required information', optionalSection: 'Additional information',
      nameFr: 'Name in French', nameAr: 'Name in Arabic', phone: 'Phone',
      image: 'Image', location: 'Location', nearestPlace: 'Nearest place', openingDate: 'Opening date', closingDate: 'Closing date',
      phonePlaceholder: '2X XX XX XX', phoneHint: '8 digits, starting with 2, 3 or 4.',
      imagePlaceholder: 'https://… .jpg', imageHint: 'Link to an already hosted image (.png, .jpg, .jpeg). File upload will come later.',
      locationPlaceholder: 'Neighbourhood, city', nearestPlacePlaceholder: 'Well-known nearby landmark',
      requiredHint: 'Fields marked with an asterisk are required.',
      submit: 'Add', creating: 'Creating…', cancel: 'Cancel',
      createdTitle: 'Service added successfully', createdText: 'The listing and its main branch are now available in Lewad.',
      creationFailed: 'Could not add this service.', addAnother: 'Add another establishment',
      searchEstablishment: 'You can now search for this establishment in Lewad.', adminAccessRequired: 'An active admin account is required.',
      errorsTitle: 'Fix the highlighted fields',
      errorNameFr: 'The French name is required.', errorNameAr: 'The Arabic name is required.', errorNameArScript: 'The Arabic name must be written in Arabic characters.',
      errorPhone: 'Invalid number: 8 digits starting with 2, 3 or 4.', errorImage: 'Accepted image formats: .png, .jpg or .jpeg.',
    },
    content: {
      unknownUser: 'Unknown user', unnamedUser: 'Unnamed user', partialProfilesUnavailable: 'Some profiles are unavailable',
      loading: { requests: 'Loading requests', users: 'Loading users', credits: 'Loading credits', searches: 'Loading searches', services: 'Loading services' },
      empty: {
        requestsTitle: 'No requests', requestsText: 'Missing-service requests will appear here.', usersTitle: 'No users found.', creditsTitle: 'No wallets',
        searchesTitle: 'No searches', searchesText: 'No log matches the selected filters.', servicesTitle: 'Services unavailable',
      },
      table: {
        request: 'Request', user: 'User', email: 'Email', status: 'Status', linkedLog: 'Linked log', teamNote: 'Team note', action: 'Action', phone: 'Phone', role: 'Role', createdAt: 'Created',
        balance: 'Balance', lastMovement: 'Latest visible movement', updatedAt: 'Updated', movement: 'Movement', reason: 'Reason', date: 'Date', search: 'Search', points: 'Points', results: 'Results',
        name: 'Name', slug: 'Slug', order: 'Order', category: 'Category', verified: 'Verified', establishment: 'Establishment', branch: 'Branch', city: 'City', main: 'Main',
      },
      filters: { searchLabel: 'Filter by search', searchPlaceholder: 'Filter by search…', statusLabel: 'Filter by status', dateLabel: 'Filter by date', allStatuses: 'All statuses' },
      sections: { wallets: 'Wallets', recentMovements: 'Recent movements', categories: 'Categories', establishments: 'Establishments', branches: 'Branches', categoriesEmpty: 'No categories', establishmentsEmpty: 'No establishments', branchesEmpty: 'No branches' },
      status: { active: 'active', approved: 'approved', added: 'added', success: 'successful', pending: 'pending', reviewed: 'reviewed', draft: 'draft', rejected: 'rejected', suspended: 'suspended', deleted: 'deleted', error: 'error', insufficient_credits: 'insufficient points', closed: 'closed', duplicate: 'duplicate', not_found: 'no result', invalid_query: 'invalid query', admin: 'admin', super_admin: 'super admin', user: 'user', welcome_bonus: 'welcome bonus', search_debit: 'search', recharge_credit: 'recharge', admin_adjustment: 'adjustment', referral_bonus: 'Lewad sharing' },
    },
    mobile: {
      user: 'User', createdAt: 'Created', linkedLog: 'Linked log', requestStatus: 'Request status', teamNote: 'Team note', notePlaceholder: 'Add an internal note…', save: 'Save', saving: 'Saving…',
      phone: 'Phone', role: 'Role', balance: 'Balance', lastMovement: 'Latest movement', updatedAt: 'Updated', movement: 'Movement', reason: 'Reason', date: 'Date', points: 'Points', results: 'Results',
      slug: 'Slug', order: 'Order', category: 'Category', verified: 'Verified', establishment: 'Establishment', city: 'City', main: 'Main', yes: 'Yes', no: 'No',
    },
    pagination: { previous: 'Previous', next: 'Next', page: 'Page', of: 'of', items: 'items' },
    superSpace: {
      title: 'Super Admin Space', intro: 'Platform control, security and access management.', navigation: 'Super Admin navigation', accessOnly: 'Super admin access only',
      tabs: { overview: 'Overview', admins: 'Admin Management', users: 'Users', audit: 'Audit', security: 'Security', settings: 'System Settings' },
      goToAdmin: 'Back to Admin', backToApp: 'Back to App',
      overview: { title: 'Platform overview', text: 'Counters from your existing administration scope.', totalUsers: 'Total users', admins: 'Admins', superAdmins: 'Super admins', activeUsers: 'Active users', suspendedUsers: 'Suspended users', totalSearches: 'Total searches', pendingRequests: 'Pending requests', pendingRecharges: 'Pending recharges', approvedServices: 'Approved services', unavailable: 'Unavailable' },
      platformAnalytics: { title: 'Platform analytics', text: 'Global view of Lewad operations.' },
      people: { adminsTitle: 'Admin management', adminsText: 'Promote, demote or suspend permitted accounts through the secure RPCs.', usersTitle: 'Users', usersText: 'Manage account roles and states within the limits enforced by the database.' },
      audit: { title: 'Audit events', text: 'Administrative events are retained in the database.', unavailable: 'Audit log coming soon in this interface.' },
      security: { title: 'Security', text: 'Operational reminders without exposing secrets or remote configuration.', checklist: ['Role changes use a super-admin RPC', 'Status changes are controlled by the database', 'Sensitive actions create an audit event', 'The team must still verify remote migrations and Auth settings'] },
      settings: { title: 'System settings', text: 'These V1 reminders are placeholders: no platform setting is editable from the browser.', items: ['Verify migration status in Supabase', 'Verify Auth settings in Supabase', 'PWA status is visible in the client'] },
    },
    system: {
      title: 'System', eyebrow: 'Super Admin', intro: 'A preparatory view of Lewad sensitive capabilities.',
      permanentNotice: 'Role, admin and sensitive-settings management will be enabled in a later phase.',
      securityNotice: 'Future Super Admin actions will require is_super_admin(), dedicated RLS, secure RPCs and audit logs.',
      futureNotice: 'This action will only become available after a security review.', futureAction: 'Future action',
      noDestructiveAction: 'This section is prepared for future sensitive actions. No destructive action is enabled in this version.',
      overview: 'System overview', totalUsers: 'Users', pendingRequests: 'Pending requests', activeCategories: 'Active categories',
      blocks: {
        adminManagement: { title: 'Admin management', text: 'Administrator access management will be added after security validation.' },
        roleManagement: { title: 'Role management', text: 'Role editing is unavailable in this version.' },
        securityOverview: { title: 'Security overview', text: 'The displayed controls describe what is required before any sensitive action.' },
        backupRecovery: { title: 'Backup & recovery', text: 'Backups are managed in the Supabase console. The team must record the date of the last verified restore test.' },
        systemSettings: { title: 'System settings', text: 'Global settings will only be exposed after their security model is validated.' },
        dangerousActions: { title: 'Dangerous actions', text: 'No irreversible or destructive action is available in this version.' },
      },
      securityChecklist: ['RLS is active on administered tables', 'No service-role key in the client', 'Admin reads use least privilege', 'is_admin() does not yet separate super_admin'],
    },
  },
}

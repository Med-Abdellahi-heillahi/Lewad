/** Une question de la FAQ. `steps` rend une liste numérotée, `link` ajoute un lien vers les offres. */
export type FaqItem = {
  q: string;
  a: string[];
  steps?: string[];
  link?: boolean;
};
/** Une étape du carrousel de démonstration. */
export type DemoStep = { title: string; caption: string };
/** Une offre de rechargement (visuelle uniquement, aucun tarif engagé). */
export type Offer = {
  name: string;
  tagline: string;
  points: string;
  features: string[];
};
/** Une carte du bandeau animé. */
export type StripItem = { label: string; alt: string };

export const fr = {
  meta: {
    label: "Français",
    short: "FR",
    description:
      "Lewad est une application web de recherche locale en Mauritanie : trouvez un établissement ou un service et obtenez le téléphone, WhatsApp, la localisation et l’itinéraire.",
  },

  backButton: {
    label: "Retour",
  },

  nav: {
    skip: "Aller au contenu",
    menu: "Menu",
    openMenu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    language: "Changer de langue",
    signIn: "Connexion",
    login: "Connexion",
    account: "Mon compte",
    signUp: "Inscription",
    mySpace: "Mon espace",
    signOut: "Déconnexion",
    signingOut: "Déconnexion…",
    backToTop: "Retour en haut",
    createAccount: "Créer un compte",
    navigate: "Navigation",
    toLight: "Activer le mode clair",
    toDark: "Activer le mode sombre",
    switchToArabic: "Changer vers arabe",
    switchToFrench: "Changer vers français",
    switchToEnglish: "Changer vers anglais",
    sections: {
      what: "On fait quoi ?",
      strip: "Animation",
      service: "Service",
      demo: "Démo",
      install: "Application",
      faq: "Questions",
      offers: "Offres",
      contact: "Contact",
    },
  },

  hero: {
    eyebrow: "Recherche locale · Mauritanie",
    title: "Trouvez rapidement les services autour de vous.",
    text: "Chercher, trouver, contacter ou s’y rendre. Lewad réunit les informations utiles des établissements et services en Mauritanie.",
    secondary: "Voir comment ça marche",
    primary: "Inscription",
    bonus: "5 points offerts à l’inscription",
    pointRule: "1 point = 1 recherche",
    steps: ["Chercher", "Trouver", "Contacter"],
  },

  what: {
    eyebrow: "On fait quoi ?",
    title: "Une recherche locale qui simplifie votre quotidien.",
    lead: "Lewad est une application web de recherche locale qui facilite votre quotidien.",
    text: "Au lieu d’appeler vos proches ou de chercher longtemps pour trouver une boutique, un marché, une salle de sport, un hôpital, un supermarché ou n’importe quel service en Mauritanie, Lewad vous aide à obtenir les informations utiles en quelques secondes.",
    secondary: "Voir comment ça marche",
    points: [
      {
        title: "Un seul endroit",
        text: "Les informations locales rassemblées, au lieu d’être dispersées.",
      },
      {
        title: "En quelques secondes",
        text: "Un nom, un besoin, et la réponse s’affiche.",
      },
      {
        title: "Pensé pour la Mauritanie",
        text: "Des usages locaux, pas un annuaire importé.",
      },
    ],
  },

  strip: {
    eyebrow: "Animation",
    title: "Tout ce que vous cherchez au quotidien.",
    text: "Boutiques, marchés, santé, sport, restaurants, services : Lewad couvre la vie locale.",
    items: [
      {
        label: "Recherche locale",
        alt: "Illustration d’une barre de recherche Lewad",
      },
      {
        label: "Cartes & itinéraire",
        alt: "Illustration d’une carte avec un repère de localisation",
      },
      { label: "Boutiques", alt: "Illustration d’une devanture de boutique" },
      { label: "Marchés", alt: "Illustration d’un étal de marché local" },
      { label: "Salles de sport", alt: "Illustration d’une salle de sport" },
      { label: "Restaurants", alt: "Illustration d’un restaurant" },
      { label: "Hôpitaux", alt: "Illustration d’un établissement de santé" },
      { label: "Supermarchés", alt: "Illustration d’un supermarché" },
      {
        label: "Téléphone & WhatsApp",
        alt: "Illustration d’un contact par téléphone et WhatsApp",
      },
      {
        label: "Services locaux",
        alt: "Illustration de services locaux variés",
      },
    ] as StripItem[],
  },

  service: {
    eyebrow: "Service",
    title: "Les informations qu’il vous faut pour agir.",
    lead: "Lewad vous donne les informations essentielles pour communiquer avec l’établissement ou vous y rendre.",
    text: "Vous pouvez voir le nom, le numéro d’appel, le numéro WhatsApp, la localisation, le site web s’il existe, et l’agence la plus proche si vous activez votre localisation.",
    items: [
      {
        title: "Nom de l’établissement",
        text: "Le nom exact, pour être sûr d’être au bon endroit.",
      },
      { title: "Numéro d’appel", text: "Le téléphone pour un appel direct." },
      {
        title: "Numéro WhatsApp",
        text: "Pour écrire quand appeler n’est pas pratique.",
      },
      { title: "Localisation", text: "L’adresse et le repère sur la carte." },
      {
        title: "Site web",
        text: "Le site officiel de l’établissement s’il existe.",
      },
      {
        title: "Agence la plus proche",
        text: "Si vous activez votre localisation, Lewad vous indique la plus proche.",
      },
      {
        title: "Position sur la carte",
        text: "Sans localisation activée, la position reste visible sur la carte.",
      },
    ],
  },

  demo: {
    eyebrow: "Démo",
    title: "Comment utiliser Lewad.",
    text: "Quatre étapes, de la recherche jusqu’aux informations de contact.",
    prev: "Précédent",
    next: "Suivant",
    stepLabel: "Étape",
    steps: [
      {
        title: "Ouvrir Lewad",
        caption:
          "Vous arrivez sur l’écran de recherche, avec vos points disponibles.",
      },
      {
        title: "Saisir un service",
        caption:
          "Tapez le nom du service recherché : Bankily, salle de sport, pharmacie…",
      },
      {
        title: "Voir le résultat",
        caption:
          "Si le service existe dans Lewad, sa fiche s’affiche directement.",
      },
      {
        title: "Contacter ou y aller",
        caption:
          "Téléphone, WhatsApp, site web, carte et agence la plus proche.",
      },
    ] as DemoStep[],
    ui: {
      searchPlaceholder: "Rechercher un service",
      query: "Bankily",
      points: "points",
      results: "Résultat trouvé",
      open: "Ouvert",
      category: "Services financiers · Nouakchott",
      call: "Appeler",
      whatsapp: "WhatsApp",
      website: "Site web",
      nearest: "Agence la plus proche",
      directions: "Itinéraire",
      confirm: "OK",
      suggestions: ["Salle de sport", "Pharmacie", "Supermarché"],
    },
  },

  install: {
    eyebrow: "Sur votre téléphone",
    title: "Ajoutez Lewad à votre téléphone",
    text: "Lewad fonctionne directement depuis le navigateur, mais vous pouvez aussi l’ajouter à l’écran d’accueil de votre téléphone pour l’ouvrir comme une application.",
    stepsLabel: "Trois étapes",
    steps: [
      "Ouvrez Lewad dans votre navigateur",
      "Appuyez sur le menu de votre navigateur",
      "Choisissez « Ajouter à l’écran d’accueil »",
    ],
    installCta: "Installer Lewad",
    guideCta: "Voir comment l’ajouter",
    browsers:
      "Sur Android, l’option apparaît souvent dans le menu du navigateur. Sur iPhone, utilisez le bouton de partage puis « Sur l’écran d’accueil ».",
    webAppNote:
      "Lewad s’ajoute à l’écran d’accueil comme application web : rien à télécharger depuis un magasin d’applications.",
    mockup: {
      menu: "Menu du navigateur",
      addToHome: "Ajouter à l’écran d’accueil",
      homeScreen: "Écran d’accueil",
    },
  },

  installPrompt: {
    title: "Ajoutez Lewad à votre téléphone",
    description: "Ouvrez Lewad rapidement depuis votre écran d'accueil.",
    storeNote: "Rien à télécharger depuis un magasin d'applications.",
    seeSteps: "Voir étapes",
    gotIt: "Compris",
    step1Label: "Ouvrez Lewad dans votre navigateur",
    step2Label: "Appuyez sur le menu du navigateur",
    step3Label: "Ajoutez Lewad à l'écran d'accueil",
    closeLabel: "Fermer",
  },

  faq: {
    eyebrow: "Questions",
    title: "Les questions que vous vous posez.",
    text: "L’essentiel sur Lewad, les points et l’ajout d’un établissement.",
    seeOffers: "Voir les offres",
    items: [
      {
        q: "C’est quoi Lewad ? Et il sert à quoi ?",
        a: [
          "Lewad est une application web qui facilite votre recherche de services en Mauritanie.",
          "Au lieu de faire plusieurs appels ou de demander à vos parents, amis ou proches où trouver une boutique, un marché, une salle de sport ou n’importe quel service, vous pouvez le faire avec un simple clic dans Lewad.",
        ],
      },
      {
        q: "Moi comme utilisateur, je suis obligé de faire quoi ?",
        a: [
          "Rien de compliqué.",
          "Il suffit de créer un compte avec votre adresse e-mail et un mot de passe. La connexion par téléphone avec un code OTP pourra être proposée ultérieurement.",
        ],
      },
      {
        q: "Comment je peux avoir ce que je cherche ?",
        a: [
          "Après la création du compte ou la connexion, vous pouvez rechercher facilement un service par son nom. Si le service existe dans Lewad, les informations utiles s’affichent directement.",
        ],
      },
      {
        q: "Et si le service que je cherche n’existe pas encore ?",
        a: [
          "Lewad vous propose alors de demander son ajout, en un clic, depuis l’écran de recherche.",
          "La demande part à l’équipe Lewad, qui se charge d’ajouter le service à l’annuaire.",
        ],
      },
      {
        q: "Comme utilisateur Lewad, j’obtiens quoi ?",
        a: [
          "Vous obtenez 5 points bonus gratuits lors de votre première inscription pour tester Lewad et effectuer vos premières recherches.",
        ],
      },
      {
        q: "Les points représentent quoi ?",
        a: [
          "Les points représentent votre crédit de recherche dans Lewad.",
          "Un point = une recherche.",
        ],
      },
      {
        q: "Comment je peux obtenir des points ?",
        a: ["Vous avez plusieurs façons d’obtenir des points :"],
        steps: [
          "Choisir une offre prête à recharger depuis la section Offres.",
          "Acheter le nombre de points que vous voulez.",
          "Partager Lewad : chaque partage peut vous donner un point.",
        ],
        link: true,
      },
      {
        q: "J’ai un établissement, comment je peux le mettre dans Lewad ?",
        a: [
          "L’ajout d’un établissement par son propriétaire arrive prochainement.",
          "Vous remplirez un formulaire depuis votre compte, puis l’équipe Lewad vérifiera les informations avant la mise en ligne.",
          "En attendant, écrivez-nous depuis la section Contact et nous ajoutons votre établissement.",
        ],
      },
    ] as FaqItem[],
  },

  offers: {
    eyebrow: "Offres",
    title: "Recharger vos points.",
    text: "Choisissez une offre prête à l’emploi ou le nombre de points qui vous convient.",
    soon: "Bientôt disponible",
    pointsLabel: "points",
    cards: [
      {
        name: "Offre Découverte",
        tagline: "Pour tester Lewad et faire vos premières recherches.",
        points: "—",
        features: [
          "Idéale pour démarrer",
          "Recherches ponctuelles",
          "Points valables sur tous les services",
        ],
      },
      {
        name: "Offre Standard",
        tagline: "Pour des recherches régulières au quotidien.",
        points: "—",
        features: [
          "Le meilleur rapport points/prix",
          "Pour un usage fréquent",
          "Points valables sur tous les services",
        ],
      },
      {
        name: "Offre Flexible",
        tagline: "Vous choisissez vous-même le nombre de points.",
        points: "—",
        features: [
          "Montant libre",
          "Vous payez ce dont vous avez besoin",
          "Points valables sur tous les services",
        ],
      },
    ] as Offer[],
  },

  contact: {
    eyebrow: "Contact",
    title: "Une question ? Écrivez-nous.",
    text: "L’équipe Lewad répond aux utilisateurs comme aux établissements.",
    cta: "Nous contacter",
    phone: "Téléphone",
    whatsapp: "WhatsApp",
    email: "Email",
    businessTitle: "Vous avez un établissement ?",
    businessText:
      "Rejoignez Lewad et permettez à vos clients de vous trouver, de vous appeler ou de venir directement chez vous.",
    businessCta: "Nous écrire sur WhatsApp",
  },

  history: {
    title: "Historique",
    subtitle:
      "Tout ce que vous avez fait sur Lewad, du plus récent au plus ancien.",
    pointsNote:
      "Chaque recherche réussie peut utiliser 1 point. Vous pouvez voir ici où vos points ont été utilisés ou ajoutés.",
    whereMyPoints: "Où sont passés mes points ?",
    refresh: "Actualiser",
    loading: "Chargement de votre historique…",
    unavailable: "Votre historique est momentanément indisponible.",
    incomplete:
      "Une partie de votre historique n’a pas pu être chargée. Réessayez dans un instant.",
    empty: "Aucun historique pour le moment.",
    emptyText:
      "Vos recherches, vos recharges et vos demandes apparaîtront ici.",
    previous: "Précédent",
    next: "Suivant",
    page: "Page",
    of: "sur",
    items: "éléments",
    searchDone: "Recherche effectuée",
    searchNoResult: "Recherche sans résultat",
    searchedFor: "Vous avez recherché « {query} »",
    noResultFound: "Aucun résultat trouvé",
    pointUsed: "{count} point utilisé",
    pointsUsed: "{count} points utilisés",
    noPointUsed: "Aucun point utilisé",
    pointsAdded: "Points ajoutés",
    pointsAddedCount: "{count} points ajoutés à votre compte",
    pointAddedCount: "{count} point ajouté à votre compte",
    reasonWelcome: "Bonus de bienvenue",
    reasonRecharge: "Recharge approuvée",
    reasonAdjustment: "Ajustement par l’équipe Lewad",
    reasonReferral: "Bonus de parrainage",
    reasonOther: "Ajout de points",
    rechargeRequested: "Recharge demandée",
    rechargeAsked: "Vous avez demandé {count} points",
    businessRequested: "Demande d’ajout d’établissement",
    businessAsked: "Vous avez demandé l’ajout de « {name} »",
    amountLabel: "Montant",
    durationLabel: "Durée",
    durationMonths: "{months} mois",
    statusLabel: "Statut",
    statusPending: "En attente",
    statusApproved: "Approuvée",
    statusRejected: "Refusée",
    statusCancelled: "Annulée",
  },

  appSearch: {
    suggestions: "Suggestions",
    noSuggestions: "Aucune suggestion",
    suggestionsLoading: "Recherche de suggestions…",
    didYouMean: "Voulez-vous dire « {name} » ?",
    yes: "Oui",
    no: "Non",
    addEstablishment: "Ajouter un établissement",
    addEstablishmentMessage:
      "La demande d’ajout d’un établissement sera disponible prochainement.",
    unavailable: "Ce service n’est pas encore disponible sur Lewad.",
    requestAddition: "Demander l’ajout",
    demoNote:
      "Ce nom proche vient de l’annuaire Lewad. Répondre « Oui » lance une nouvelle recherche.",
    locationPrompt:
      "Lewad peut utiliser votre position pour chercher ce lieu autour de vous.",
    initialLocationPrompt:
      "Lewad peut utiliser votre position pour chercher les services autour de vous.",
    allowLocation: "Autoriser la position",
    chooseWilaya: "Choisir une wilaya",
    dismissLocationPrompt: "Plus tard",
    locationPermissionDenied:
      "L’accès à votre position a été refusé. Choisissez une wilaya pour continuer.",
    locationUnavailable:
      "Votre position n’est pas disponible. Choisissez une wilaya pour continuer.",
    locating: "Localisation en cours…",
    isInMauritania: "Ce lieu est-il en Mauritanie ?",
    searchInMauritania: "Oui, chercher en Mauritanie",
    mauritaniaOnly:
      "La recherche sur carte est actuellement disponible en Mauritanie.",
    selectWilaya: "Sélectionner une wilaya",
    allMauritania: "Toute la Mauritanie",
    searchContextCurrentLocation:
      "La recherche peut utiliser votre position actuelle.",
    searchContextWilaya:
      "La recherche sera effectuée dans la wilaya : {wilaya}.",
    searchContextUnknown:
      "Choisissez votre wilaya pour améliorer les résultats.",
    changeWilaya: "Changer la wilaya",
    wilayas: {
      Adrar: "Adrar",
      Assaba: "Assaba",
      Brakna: "Brakna",
      "Dakhlet Nouadhibou": "Dakhlet Nouadhibou",
      Gorgol: "Gorgol",
      Guidimaka: "Guidimaka",
      "Hodh Ech Chargui": "Hodh Ech Chargui",
      "Hodh El Gharbi": "Hodh El Gharbi",
      Inchiri: "Inchiri",
      "Nouakchott Nord": "Nouakchott Nord",
      "Nouakchott Ouest": "Nouakchott Ouest",
      "Nouakchott Sud": "Nouakchott Sud",
      Tagant: "Tagant",
      "Tiris Zemmour": "Tiris Zemmour",
      Trarza: "Trarza",
    },
    searchOnMap: "Rechercher sur la carte",
    searchingMaps: "Recherche sur la carte…",
    foundOnMap: "Trouvé sur la carte",
    mapResultSaveWarning:
      "Le résultat est affiché, mais il n’a pas pu être enregistré pour le moment.",
    noMapResultFound: "Aucun résultat trouvé sur la carte.",
    mapSearchError:
      "Impossible de chercher sur la carte pour le moment. Réessayez.",
    mapSearchRateLimited:
      "Vous avez effectué plusieurs recherches sur la carte. Réessayez dans un instant.",
    openDirections: "Ouvrir l’itinéraire",
  },

  profileAvatar: {
    uploadAvatar: "Choisir une photo",
    avatarHint: "PNG, JPG ou JPEG, 2 Mo maximum.",
    fileTooLarge: "L’image ne doit pas dépasser 2 Mo.",
    unsupportedImage: "Choisissez une image PNG, JPG ou JPEG.",
    uploadFailed:
      "Impossible d’envoyer l’image. Vérifiez le format ou réessayez.",
    uploadingAvatar: "Téléversement de l’image…",
    profileImageUpdated: "Photo de profil mise à jour.",
    phoneAlreadyUsed: "Ce numéro est déjà utilisé par un autre compte.",
    invalidPhone:
      "Le numéro doit contenir 8 chiffres et commencer par 2, 3 ou 4.",
    saveProfile: "Enregistrer les modifications",
    savingProfile: "Enregistrement…",
    profileSaved: "Profil mis à jour.",
    noChangesToSave: "Aucune modification à enregistrer.",
    fullNameTooLong: "Le nom ne peut pas dépasser 120 caractères.",
    editMyInformation: "Modifier mes informations",
    editProfile: "Modifier le profil",
  },

  settings: {
    title: "Paramètres",
    subtitle: "Personnalisez Lewad selon vos préférences.",
    preferences: "Préférences",
    language: "Langue",
    appearance: "Apparence",
    theme: "Thème",
    light: "Clair",
    dark: "Sombre",
    system: "Système",
    textSize: "Taille du texte",
    small: "Petit",
    normal: "Normal",
    large: "Grand",
    extraLarge: "Très grand",
    accountSecurity: "Sécurité du compte",
    changePassword: "Changer mon mot de passe",
    passwordResetDescription:
      "Nous vous enverrons un e-mail pour réinitialiser votre mot de passe.",
    sendResetEmail: "Envoyer l’e-mail",
    sendingResetEmail: "Envoi de l’e-mail…",
    resetEmailSent: "E-mail de réinitialisation envoyé.",
    noEmailFound: "Aucun e-mail associé à ce compte.",
    resetEmailFailed:
      "Impossible d’envoyer l’e-mail de réinitialisation pour le moment. Réessayez plus tard.",
    backToMySpace: "Retour à mon espace",
    saved: "Enregistré sur cet appareil.",
  },

  footer: {
    madeBy: "Fait par Wasla Soft",
    rights: "© 2026 — Tous droits réservés",
    version: "Version v1.0.0",
    tagline: "La recherche locale en Mauritanie.",
  },

  alerts: {
    demoTemp:
      "Les visuels de cette démonstration sont temporaires et seront remplacés par de vraies captures.",
    offersNotFinal:
      "Les offres et les tarifs ne sont pas définitifs. Ils seront confirmés avant le lancement.",
    comingSoon: "Fonctionnalité bientôt disponible.",
  },

  superAdminManagement: {
    title: "Gestion des admins",
    subtitle:
      "Gérez les comptes administrateur avec des actions contrôlées par le serveur.",
    loadError: "Impossible de charger la gestion des admins.",
    loadErrorHint: "Réessayez dans un instant.",
    serverError: "Erreur serveur",
    moduleNotConnected: "Module non connecté",
    migrationHint:
      "Le module de gestion des admins n’est pas encore connecté à la base. Appliquez la migration Super Admin Admin Management.",
    accessDenied:
      "Une session super admin active est requise pour accéder à ce module.",
    retry: "Réessayer",
    addAdmin: "Ajouter un admin",
    totalAdmins: "Total admins",
    activeAdmins: "Admins actifs",
    suspendedAdmins: "Admins suspendus",
    establishmentsAdded: "Établissements ajoutés",
    actionsThisWeek: "Actions admin cette semaine",
    pendingIssues: "Incidents admin en attente",
    comingSoon: "Bientôt disponible",
    searchLabel: "Rechercher un admin",
    searchPlaceholder: "Nom complet, e-mail ou téléphone…",
    fullName: "Nom complet",
    arabicFullName: "Nom en arabe",
    email: "E-mail",
    phone: "Téléphone",
    status: "Statut",
    role: "Rôle",
    actions: "Actions",
    createdAt: "Créé le",
    visit: "Visiter",
    edit: "Modifier",
    suspend: "Suspendre",
    reactivate: "Réactiver",
    activeAdmin: "Admin actif",
    suspendedAdmin: "Admin suspendu",
    noAdmins: "Aucun admin ne correspond à cette recherche.",
    loading: "Chargement des admins…",
    close: "Fermer",
    cancel: "Annuler",
    confirm: "Confirmer",
    save: "Enregistrer",
    saving: "Enregistrement…",
    adminDetails: "Profil de l’admin",
    recentActions: "Actions récentes",
    noRecentActions: "Aucune action récente",
    editAdmin: "Modifier l’admin",
    editHelp: "Seuls les champs de profil sûrs peuvent être modifiés ici.",
    updateSuccess: "Profil admin mis à jour.",
    updateError: "Impossible de mettre à jour cet admin.",
    statusConfirmTitle: "Confirmer le changement de statut",
    suspendConfirm:
      "Cet admin ne pourra plus utiliser les espaces d’administration tant qu’il est suspendu.",
    reactivateConfirm:
      "Cet admin retrouvera l’accès à son espace opérationnel.",
    statusSuccess: "Statut admin mis à jour.",
    statusError: "Impossible de modifier le statut de cet admin.",
    invitationTitle: "Invitation admin",
    invitationHelp:
      "Cette action enregistre une invitation en attente. Aucun compte Auth n’est créé depuis le navigateur.",
    createInvitation: "Créer l’invitation",
    invitationCreated: "Invitation admin créée.",
    invitationError: "Impossible de créer l’invitation admin.",
    required: "Obligatoire",
    auditLog: "Journal d’audit",
    auditSubtitle:
      "Actions administratives enregistrées par la base de données.",
    auditActor: "Par",
    auditTarget: "Cible",
    metadata: "Métadonnées",
    auditEmpty: "Aucun événement d’audit à afficher.",
    auditLoading: "Chargement du journal d’audit…",
  },

  system: {
    loading: "Préparation de Lewad",
    accountLoading: "Chargement de votre espace…",
    backHome: "Retour à l’accueil",
    retry: "Réessayer",
    offlineTitle: "Connexion interrompue",
    offlineText:
      "Impossible de joindre Lewad. Vérifiez votre connexion, puis réessayez.",
    errorLabel: "Erreur",
  },

  businessSubmission: {
    title: "Ajouter mon établissement",
    subtitle:
      "Soumettez votre établissement pour apparaitre dans les résultats de recherche Lewad.",
    introTitle: "Comment ça marche ?",
    introText:
      "Remplissez le formulaire ci-dessous. Notre équipe vérifiera votre demande et créera votre établissement sur Lewad. Vous serez contacté pour finaliser l'inscription.",
    stepsLabel: 'Étapes', stepOne: 'Étape 1', stepTwo: 'Étape 2', stepThree: 'Étape 3', continue: 'Continuer', back: 'Retour', paymentTitle: 'Informations de paiement', paymentInstruction: 'Envoyez 200 MRO au numéro Lewad : {number}', senderPhone: 'Numéro utilisé pour l’envoi', bankingApp: 'Application bancaire', chooseBankingApp: 'Choisissez une application', acceptedBankingApps: 'Applications acceptées', reviewTitle: 'Vérifiez votre demande', whatsappSend: 'Envoyer ma demande sur WhatsApp', paymentValidation: 'Veuillez renseigner ce champ.', whatsappIntro: 'Bonjour l’équipe Lewad,\nJe souhaite ajouter un établissement.', clientName: 'Nom du client', establishmentName: 'Nom de l’établissement', establishmentPhone: 'Téléphone établissement', establishmentWhatsapp: 'WhatsApp établissement', amountSent: 'Montant envoyé', durationRequested: 'Durée demandée', paymentNumberLabel: 'Numéro Lewad payé', whatsappThanks: 'Merci.',
    ownerSection: "Informations du propriétaire",
    ownerFirstName: "Prénom",
    ownerLastName: "Nom de famille",
    ownerPhone: "Téléphone du propriétaire",
    ownerPhoneHint: "8 chiffres, commençant par 2, 3 ou 4.",
    businessSection: "Informations de l'établissement",
    businessNameFr: "Nom en français",
    businessNameFrHint:
      "Nom tel qu'il apparaitra dans les résultats de recherche.",
    businessNameAr: "Nom en arabe",
    businessNameArHint: "Nom en arabe pour les utilisateurs en langue arabe.",
    businessPhone: "Téléphone de l'établissement",
    businessPhoneHint:
      "Numéro public que les clients utiliseront pour vous contacter.",
    optionalSection: "Détails optionnels",
    whatsapp: "WhatsApp",
    whatsappHint: "Numéro WhatsApp pour la messagerie directe.",
    website: "Site web",
    websiteHint: "URL complète, ex. : https://exemple.mr",
    category: "Catégorie",
    categoryHint: "Type d'activité de votre établissement.",
    location: "Adresse / Ville",
    locationHint: "Adresse ou quartier de votre établissement.",
    nearestPlace: "Lieu le plus proche",
    nearestPlaceHint: "Point de repère facilite la localisation.",
    mapPickerLabel: "Emplacement sur la carte",
    mapPickerHelper:
      "Pas besoin de connaître la latitude ou la longitude. Touchez simplement la carte.",
    mapPickerKeyboardHint:
      "Utilisez les flèches pour déplacer la carte, puis Entrée ou Espace pour placer le marqueur.",
    markerPlaced: "Emplacement sélectionné.",
    placeMarker: "Placer le marqueur ici",
    mapLoading: "Chargement de la carte…",
    zoomIn: "Agrandir la carte",
    zoomOut: "Réduire la carte",
    attribution: "© OpenStreetMap",
    useCurrentPosition: "Utiliser ma position actuelle",
    locatingCurrentPosition: "Localisation en cours…",
    currentPositionDenied:
      "L’accès à votre position a été refusé. Sélectionnez un emplacement sur la carte.",
    currentPositionUnavailable:
      "Votre position ne peut pas être obtenue. Sélectionnez un emplacement sur la carte.",
    amountSection: "Montant à payer",
    amountText:
      "L'inscription de votre établissement coûte {amount} pour {months} mois de publication. Le paiement est manuel : notre équipe vous contacte sur WhatsApp après vérification de votre demande.",
    periodSection: "Durée de publication",
    periodMonthsValue: "{months} mois",
    submit: "Soumettre la demande",
    submitting: "Envoi en cours…",
    successTitle: "Demande envoyée",
    successText:
      "Votre demande a été enregistrée. Notre équipe l'examinera dans les plus brefs délais.",
    submissionId: "Numéro de la demande",
    pendingReview: "En attente de validation",
    whatsappContact: "Contacter sur WhatsApp",
    duplicate: "Une demande similaire existe déjà pour cet établissement.",
    rateLimit:
      "Vous avez envoyé une demande récemment. Veuillez patienter avant de soumettre une nouvelle demande.",
    backendUnavailable:
      "Le service de soumission n'est pas encore activé. Réessayez plus tard.",
    historyTitle: "Mes demandes d’établissement",
    historySoon: "Historique bientôt disponible",
    genericError:
      "Une erreur est survenue lors de l'envoi. Veuillez réessayer.",
    backHome: "Retour à l'accueil",
    errors: {
      ownerFirstName: "Veuillez saisir le prénom du propriétaire.",
      ownerLastName: "Veuillez saisir le nom du propriétaire.",
      ownerPhone: "Veuillez saisir un numéro de téléphone valide.",
      ownerPhoneInvalid:
        "Le numéro doit contenir exactement 8 chiffres et commencer par 2, 3 ou 4.",
      businessNameFr: "Veuillez saisir le nom de l'établissement en français.",
      businessNameAr: "Veuillez saisir le nom de l'établissement en arabe.",
      businessNameArInvalid:
        "Le nom en arabe doit contenir uniquement des caractères arabes.",
      businessPhone:
        "Veuillez saisir le numéro de téléphone de l'établissement.",
      businessPhoneInvalid:
        "Le numéro doit contenir exactement 8 chiffres et commencer par 2, 3 ou 4.",
      websiteInvalid:
        "Veuillez saisir une URL valide commençant par http:// ou https://.",
      coordinates: "Veuillez sélectionner l’emplacement sur la carte.",
      mapPickerRequired: "Veuillez sélectionner l’emplacement sur la carte.",
    },
  },

  errors: {
    "400": ["Requête invalide", "Cette demande n’a pas pu être traitée."],
    "401": ["Connexion requise", "Connectez-vous pour accéder à cette page."],
    "402": [
      "Points insuffisants",
      "Cette action nécessite des points ou un paiement.",
    ],
    "403": [
      "Accès refusé",
      "Vous n’avez pas l’autorisation d’ouvrir cette page.",
    ],
    "404": ["Page introuvable", "Cette page n’existe pas ou a été déplacée."],
    "408": [
      "Délai d’attente dépassé",
      "Le service met plus de temps que prévu à répondre.",
    ],
    "429": [
      "Trop de requêtes",
      "Vous allez un peu vite. Patientez quelques instants avant de réessayer.",
    ],
    "500": [
      "Erreur serveur",
      "Un problème est survenu de notre côté. Nous y travaillons.",
    ],
    "502": [
      "Service injoignable",
      "Lewad ne parvient pas à joindre l’un de ses services.",
    ],
    "503": [
      "Service momentanément indisponible",
      "Lewad est en maintenance. Nous revenons très vite.",
    ],
    "504": [
      "Réponse trop lente",
      "Le serveur met trop de temps à répondre. Réessayez dans un instant.",
    ],
    network: [
      "Connexion interrompue",
      "Impossible de joindre Lewad. Vérifiez votre connexion, puis réessayez.",
    ],
  },
};

export type Dictionary = typeof fr;

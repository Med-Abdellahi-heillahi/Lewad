/** Une question de la FAQ. `steps` rend une liste numérotée, `link` ajoute un lien vers les offres. */
export type FaqItem = { q: string; a: string[]; steps?: string[]; link?: boolean }
/** Une étape du carrousel de démonstration. */
export type DemoStep = { title: string; caption: string }
/** Une offre de rechargement (visuelle uniquement, aucun tarif engagé). */
export type Offer = { name: string; tagline: string; points: string; features: string[] }
/** Une carte du bandeau animé. */
export type StripItem = { label: string; alt: string }

export const fr = {
  meta: {
    label: 'Français',
    short: 'FR',
    description:
      'Lewad est une application web de recherche locale en Mauritanie : trouvez un établissement ou un service et obtenez le téléphone, WhatsApp, la localisation et l’itinéraire.',
  },

  nav: {
    skip: 'Aller au contenu',
    menu: 'Menu',
    openMenu: 'Ouvrir le menu',
    closeMenu: 'Fermer le menu',
    language: 'Changer de langue',
    signIn: 'Connexion',
    login: 'Connexion',
    account: 'Mon compte',
    signUp: 'Inscription',
    mySpace: 'Mon espace',
    signOut: 'Déconnexion',
    signingOut: 'Déconnexion…',
    backToTop: 'Retour en haut',
    createAccount: 'Créer un compte',
    navigate: 'Navigation',
    toLight: 'Activer le mode clair',
    toDark: 'Activer le mode sombre',
    sections: {
      what: 'On fait quoi ?',
      strip: 'Animation',
      service: 'Service',
      demo: 'Démo',
      faq: 'Questions',
      offers: 'Offres',
      contact: 'Contact',
    },
  },

  hero: {
    eyebrow: 'Recherche locale · Mauritanie',
    title: 'Trouvez rapidement les services autour de vous.',
    text: 'Chercher, trouver, contacter ou s’y rendre. Lewad réunit les informations utiles des établissements et services en Mauritanie.',
    secondary: 'Voir comment ça marche',
    primary: 'Inscription',
    bonus: '5 points offerts à l’inscription',
    pointRule: '1 point = 1 recherche',
    steps: ['Chercher', 'Trouver', 'Contacter'],
  },

  what: {
    eyebrow: 'On fait quoi ?',
    title: 'Une recherche locale qui simplifie votre quotidien.',
    lead: 'Lewad est une application web de recherche locale qui facilite votre quotidien.',
    text: 'Au lieu d’appeler vos proches ou de chercher longtemps pour trouver une boutique, un marché, une salle de sport, un hôpital, un supermarché ou n’importe quel service en Mauritanie, Lewad vous aide à obtenir les informations utiles en quelques secondes.',
    secondary: 'Voir comment ça marche',
    points: [
      { title: 'Un seul endroit', text: 'Les informations locales rassemblées, au lieu d’être dispersées.' },
      { title: 'En quelques secondes', text: 'Un nom, un besoin, et la réponse s’affiche.' },
      { title: 'Pensé pour la Mauritanie', text: 'Des usages locaux, pas un annuaire importé.' },
    ],
  },

  strip: {
    eyebrow: 'Animation',
    title: 'Tout ce que vous cherchez au quotidien.',
    text: 'Boutiques, marchés, santé, sport, restaurants, services : Lewad couvre la vie locale.',
    items: [
      { label: 'Recherche locale', alt: 'Illustration d’une barre de recherche Lewad' },
      { label: 'Cartes & itinéraire', alt: 'Illustration d’une carte avec un repère de localisation' },
      { label: 'Boutiques', alt: 'Illustration d’une devanture de boutique' },
      { label: 'Marchés', alt: 'Illustration d’un étal de marché local' },
      { label: 'Salles de sport', alt: 'Illustration d’une salle de sport' },
      { label: 'Restaurants', alt: 'Illustration d’un restaurant' },
      { label: 'Hôpitaux', alt: 'Illustration d’un établissement de santé' },
      { label: 'Supermarchés', alt: 'Illustration d’un supermarché' },
      { label: 'Téléphone & WhatsApp', alt: 'Illustration d’un contact par téléphone et WhatsApp' },
      { label: 'Services locaux', alt: 'Illustration de services locaux variés' },
    ] as StripItem[],
  },

  service: {
    eyebrow: 'Service',
    title: 'Les informations qu’il vous faut pour agir.',
    lead: 'Lewad vous donne les informations essentielles pour communiquer avec l’établissement ou vous y rendre.',
    text: 'Vous pouvez voir le nom, le numéro d’appel, le numéro WhatsApp, la localisation, le site web s’il existe, et l’agence la plus proche si vous activez votre localisation.',
    items: [
      { title: 'Nom de l’établissement', text: 'Le nom exact, pour être sûr d’être au bon endroit.' },
      { title: 'Numéro d’appel', text: 'Le téléphone pour un appel direct.' },
      { title: 'Numéro WhatsApp', text: 'Pour écrire quand appeler n’est pas pratique.' },
      { title: 'Localisation', text: 'L’adresse et le repère sur la carte.' },
      { title: 'Site web', text: 'Le site officiel de l’établissement s’il existe.' },
      { title: 'Agence la plus proche', text: 'Si vous activez votre localisation, Lewad vous indique la plus proche.' },
      { title: 'Position sur la carte', text: 'Sans localisation activée, la position reste visible sur la carte.' },
    ],
  },

  demo: {
    eyebrow: 'Démo',
    title: 'Comment utiliser Lewad.',
    text: 'Quatre étapes, de la recherche jusqu’aux informations de contact.',
    prev: 'Précédent',
    next: 'Suivant',
    stepLabel: 'Étape',
    steps: [
      {
        title: 'Ouvrir Lewad',
        caption: 'Vous arrivez sur l’écran de recherche, avec vos points disponibles.',
      },
      {
        title: 'Saisir un service',
        caption: 'Tapez le nom du service recherché : Bankily, salle de sport, pharmacie…',
      },
      {
        title: 'Voir le résultat',
        caption: 'Si le service existe dans Lewad, sa fiche s’affiche directement.',
      },
      {
        title: 'Contacter ou y aller',
        caption: 'Téléphone, WhatsApp, site web, carte et agence la plus proche.',
      },
    ] as DemoStep[],
    ui: {
      searchPlaceholder: 'Rechercher un service',
      query: 'Bankily',
      points: 'points',
      results: 'Résultat trouvé',
      open: 'Ouvert',
      category: 'Services financiers · Nouakchott',
      call: 'Appeler',
      whatsapp: 'WhatsApp',
      website: 'Site web',
      nearest: 'Agence la plus proche',
      directions: 'Itinéraire',
      confirm: 'OK',
      suggestions: ['Salle de sport', 'Pharmacie', 'Supermarché'],
    },
  },

  faq: {
    eyebrow: 'Questions',
    title: 'Les questions que vous vous posez.',
    text: 'L’essentiel sur Lewad, les points et l’ajout d’un établissement.',
    seeOffers: 'Voir les offres',
    items: [
      {
        q: 'C’est quoi Lewad ? Et il sert à quoi ?',
        a: [
          'Lewad est une application web qui facilite votre recherche de services en Mauritanie.',
          'Au lieu de faire plusieurs appels ou de demander à vos parents, amis ou proches où trouver une boutique, un marché, une salle de sport ou n’importe quel service, vous pouvez le faire avec un simple clic dans Lewad.',
        ],
      },
      {
        q: 'Moi comme utilisateur, je suis obligé de faire quoi ?',
        a: [
          'Rien de compliqué.',
          'Il suffit de créer un compte avec votre adresse e-mail et un mot de passe. La connexion par téléphone avec un code OTP pourra être proposée ultérieurement.',
        ],
      },
      {
        q: 'Comment je peux avoir ce que je cherche ?',
        a: [
          'Après la création du compte ou la connexion, vous pouvez rechercher facilement un service par son nom. Si le service existe dans Lewad, les informations utiles s’affichent directement.',
        ],
      },
      {
        q: 'Et si le service que je cherche n’existe pas encore ?',
        a: [
          'Lewad vous propose alors de demander son ajout, en un clic, depuis l’écran de recherche.',
          'La demande part à l’équipe Lewad, qui se charge d’ajouter le service à l’annuaire.',
        ],
      },
      {
        q: 'Comme utilisateur Lewad, j’obtiens quoi ?',
        a: [
          'Vous obtenez 5 points bonus gratuits lors de votre première inscription pour tester Lewad et effectuer vos premières recherches.',
        ],
      },
      {
        q: 'Les points représentent quoi ?',
        a: ['Les points représentent votre crédit de recherche dans Lewad.', 'Un point = une recherche.'],
      },
      {
        q: 'Comment je peux obtenir des points ?',
        a: ['Vous avez plusieurs façons d’obtenir des points :'],
        steps: [
          'Choisir une offre prête à recharger depuis la section Offres.',
          'Acheter le nombre de points que vous voulez.',
          'Partager Lewad : chaque partage peut vous donner un point.',
        ],
        link: true,
      },
      {
        q: 'J’ai un établissement, comment je peux le mettre dans Lewad ?',
        a: [
          'L’ajout d’un établissement par son propriétaire arrive prochainement.',
          'Vous remplirez un formulaire depuis votre compte, puis l’équipe Lewad vérifiera les informations avant la mise en ligne.',
          'En attendant, écrivez-nous depuis la section Contact et nous ajoutons votre établissement.',
        ],
      },
    ] as FaqItem[],
  },

  offers: {
    eyebrow: 'Offres',
    title: 'Recharger vos points.',
    text: 'Choisissez une offre prête à l’emploi ou le nombre de points qui vous convient.',
    soon: 'Bientôt disponible',
    pointsLabel: 'points',
    cards: [
      {
        name: 'Offre Découverte',
        tagline: 'Pour tester Lewad et faire vos premières recherches.',
        points: '—',
        features: ['Idéale pour démarrer', 'Recherches ponctuelles', 'Points valables sur tous les services'],
      },
      {
        name: 'Offre Standard',
        tagline: 'Pour des recherches régulières au quotidien.',
        points: '—',
        features: ['Le meilleur rapport points/prix', 'Pour un usage fréquent', 'Points valables sur tous les services'],
      },
      {
        name: 'Offre Flexible',
        tagline: 'Vous choisissez vous-même le nombre de points.',
        points: '—',
        features: ['Montant libre', 'Vous payez ce dont vous avez besoin', 'Points valables sur tous les services'],
      },
    ] as Offer[],
  },

  contact: {
    eyebrow: 'Contact',
    title: 'Une question ? Écrivez-nous.',
    text: 'L’équipe Lewad répond aux utilisateurs comme aux établissements.',
    cta: 'Nous contacter',
    phone: 'Téléphone',
    whatsapp: 'WhatsApp',
    email: 'Email',
    businessTitle: 'Vous avez un établissement ?',
    businessText:
      'Rejoignez Lewad et permettez à vos clients de vous trouver, de vous appeler ou de venir directement chez vous.',
    businessCta: 'Nous écrire sur WhatsApp',
  },

  appSearch: {
    suggestions: 'Suggestions',
    noSuggestions: 'Aucune suggestion',
    didYouMean: 'Voulez-vous dire « {name} » ?',
    yes: 'Oui',
    no: 'Non',
    addEstablishment: 'Ajouter un établissement',
    addEstablishmentMessage: 'La demande d’ajout d’un établissement sera disponible prochainement.',
    unavailable: 'Ce service n’est pas encore disponible sur Lewad.',
    requestAddition: 'Demander l’ajout',
    demoNote: 'Catalogue de démonstration local : les informations affichées ne proviennent pas encore de l’annuaire Lewad.',
  },

  profileAvatar: {
    uploadAvatar: 'Choisir une photo',
    avatarHint: 'PNG, JPG, JPEG ou WebP, 2 Mo maximum.',
    fileTooLarge: 'L’image ne doit pas dépasser 2 Mo.',
    unsupportedImage: 'Choisissez une image PNG, JPG, JPEG ou WebP.',
    uploadFailed: 'Impossible de téléverser l’image pour le moment. Réessayez dans un instant.',
    uploadingAvatar: 'Téléversement de l’image…',
    profileImageUpdated: 'Photo de profil mise à jour.',
    phoneAlreadyUsed: 'Ce numéro est déjà utilisé par un autre compte.',
    invalidPhone: 'Le numéro doit contenir 8 chiffres et commencer par 2, 3 ou 4.',
    saveProfile: 'Enregistrer le profil',
    savingProfile: 'Enregistrement…',
    profileSaved: 'Profil mis à jour.',
  },

  footer: {
    madeBy: 'Fait par Wasla Soft',
    rights: '© 2026 — Tous droits réservés',
    version: 'Version v1.0.0',
    tagline: 'La recherche locale en Mauritanie.',
  },

  alerts: {
    demoTemp: 'Les visuels de cette démonstration sont temporaires et seront remplacés par de vraies captures.',
    offersNotFinal: 'Les offres et les tarifs ne sont pas définitifs. Ils seront confirmés avant le lancement.',
    comingSoon: 'Fonctionnalité bientôt disponible.',
  },

  system: {
    loading: 'Préparation de Lewad',
    backHome: 'Retour à l’accueil',
    retry: 'Réessayer',
    offlineTitle: 'Connexion interrompue',
    offlineText: 'Impossible de joindre Lewad. Vérifiez votre connexion, puis réessayez.',
    errorLabel: 'Erreur',
  },

  errors: {
    '400': ['Requête invalide', 'Cette demande n’a pas pu être traitée.'],
    '401': ['Connexion requise', 'Connectez-vous pour accéder à cette page.'],
    '402': ['Points insuffisants', 'Cette action nécessite des points ou un paiement.'],
    '403': ['Accès refusé', 'Vous n’avez pas l’autorisation d’ouvrir cette page.'],
    '404': ['Page introuvable', 'Cette page n’existe pas ou a été déplacée.'],
    '408': ['Délai d’attente dépassé', 'Le service met plus de temps que prévu à répondre.'],
    '429': ['Trop de requêtes', 'Vous allez un peu vite. Patientez quelques instants avant de réessayer.'],
    '500': ['Erreur serveur', 'Un problème est survenu de notre côté. Nous y travaillons.'],
    '502': ['Service injoignable', 'Lewad ne parvient pas à joindre l’un de ses services.'],
    '503': ['Service momentanément indisponible', 'Lewad est en maintenance. Nous revenons très vite.'],
    '504': ['Réponse trop lente', 'Le serveur met trop de temps à répondre. Réessayez dans un instant.'],
    network: ['Connexion interrompue', 'Impossible de joindre Lewad. Vérifiez votre connexion, puis réessayez.'],
  },
}

export type Dictionary = typeof fr

import type { Dictionary, DemoStep, FaqItem, Offer, StripItem } from './fr'

export const en: Dictionary = {
  meta: {
    label: 'English',
    short: 'EN',
    description:
      'Lewad is a local search web app for Mauritania: find a business or service and get the phone number, WhatsApp, location and directions.',
  },

  nav: {
    skip: 'Skip to content',
    menu: 'Menu',
    openMenu: 'Open menu',
    closeMenu: 'Close menu',
    language: 'Change language',
    signIn: 'Sign in',
    login: 'Login',
    account: 'My account',
    signUp: 'Sign up',
    mySpace: 'My space',
    signOut: 'Sign out',
    signingOut: 'Signing out…',
    backToTop: 'Back to top',
    createAccount: 'Create an account',
    navigate: 'Navigation',
    toLight: 'Switch to light mode',
    toDark: 'Switch to dark mode',
    sections: {
      what: 'What we do',
      strip: 'Overview',
      service: 'Service',
      demo: 'Demo',
      faq: 'Questions',
      offers: 'Offers',
      contact: 'Contact',
    },
  },

  hero: {
    eyebrow: 'Local search · Mauritania',
    title: 'Find the services around you, fast.',
    text: 'Search, find, then call or go. Lewad brings together the useful details of businesses and services across Mauritania.',
    secondary: 'See how it works',
    primary: 'Sign up',
    bonus: '5 free points when you sign up',
    pointRule: '1 point = 1 search',
    steps: ['Search', 'Find', 'Contact'],
  },

  what: {
    eyebrow: 'What we do',
    title: 'Local search that makes everyday life simpler.',
    lead: 'Lewad is a local search web app that makes your day-to-day easier.',
    text: 'Instead of calling relatives or searching for ages to find a shop, a market, a gym, a hospital, a supermarket or any other service in Mauritania, Lewad gets you the details you need in seconds.',
    secondary: 'See how it works',
    points: [
      { title: 'One single place', text: 'Local information gathered together instead of scattered around.' },
      { title: 'In seconds', text: 'A name, a need — and the answer shows up.' },
      { title: 'Built for Mauritania', text: 'Local habits, not an imported directory.' },
    ],
  },

  strip: {
    eyebrow: 'Overview',
    title: 'Everything you look for, every day.',
    text: 'Shops, markets, health, sport, restaurants, services — Lewad covers local life.',
    items: [
      { label: 'Local search', alt: 'Illustration of the Lewad search bar' },
      { label: 'Maps & directions', alt: 'Illustration of a map with a location marker' },
      { label: 'Shops', alt: 'Illustration of a shop front' },
      { label: 'Markets', alt: 'Illustration of a local market stall' },
      { label: 'Gyms', alt: 'Illustration of a gym' },
      { label: 'Restaurants', alt: 'Illustration of a restaurant' },
      { label: 'Hospitals', alt: 'Illustration of a health facility' },
      { label: 'Supermarkets', alt: 'Illustration of a supermarket' },
      { label: 'Phone & WhatsApp', alt: 'Illustration of contact by phone and WhatsApp' },
      { label: 'Local services', alt: 'Illustration of assorted local services' },
    ] as StripItem[],
  },

  service: {
    eyebrow: 'Service',
    title: 'The details you need to act.',
    lead: 'Lewad gives you the essential information to contact a business or get there.',
    text: 'You can see the name, the phone number, the WhatsApp number, the location, the website if there is one, and the nearest branch if you turn on your location.',
    items: [
      { title: 'Business name', text: 'The exact name, so you know you are in the right place.' },
      { title: 'Phone number', text: 'The number for a direct call.' },
      { title: 'WhatsApp number', text: 'For a message when calling is not convenient.' },
      { title: 'Location', text: 'The address and the marker on the map.' },
      { title: 'Website', text: 'The official website of the business, if it has one.' },
      { title: 'Nearest branch', text: 'Turn on your location and Lewad points you to the closest one.' },
      { title: 'Map position', text: 'Without location enabled, the position stays visible on the map.' },
    ],
  },

  demo: {
    eyebrow: 'Demo',
    title: 'How to use Lewad.',
    text: 'Four steps, from the search to the contact details.',
    prev: 'Previous',
    next: 'Next',
    stepLabel: 'Step',
    steps: [
      { title: 'Open Lewad', caption: 'You land on the search screen, with your available points.' },
      { title: 'Type a service', caption: 'Enter what you are looking for: Bankily, a gym, a pharmacy…' },
      { title: 'See the result', caption: 'If the service exists in Lewad, its card appears straight away.' },
      { title: 'Contact or go', caption: 'Phone, WhatsApp, website, map and the nearest branch.' },
    ] as DemoStep[],
    ui: {
      searchPlaceholder: 'Search for a service',
      query: 'Bankily',
      points: 'points',
      results: 'Result found',
      open: 'Open',
      category: 'Financial services · Nouakchott',
      call: 'Call',
      whatsapp: 'WhatsApp',
      website: 'Website',
      nearest: 'Nearest branch',
      directions: 'Directions',
      confirm: 'OK',
      suggestions: ['Gym', 'Pharmacy', 'Supermarket'],
    },
  },

  faq: {
    eyebrow: 'Questions',
    title: 'The questions you are asking.',
    text: 'The essentials about Lewad, points and adding a business.',
    seeOffers: 'See the offers',
    items: [
      {
        q: 'What is Lewad, and what is it for?',
        a: [
          'Lewad is a web app that makes searching for services in Mauritania easier.',
          'Instead of making several calls or asking your parents, friends or relatives where to find a shop, a market, a gym or any other service, you can do it with a single click in Lewad.',
        ],
      },
      {
        q: 'As a user, what do I have to do?',
        a: [
          'Nothing complicated.',
          'Just create an account with your email address and a password. Phone sign-in with an OTP code may be offered in the future.',
        ],
      },
      {
        q: 'How do I get what I am looking for?',
        a: [
          'Once your account is created, or once you are signed in, you can easily search for a service by name. If the service exists in Lewad, the useful information is shown right away.',
        ],
      },
      {
        q: 'What if the service I am looking for is not there yet?',
        a: [
          'Lewad then offers to request it, in one click, straight from the search screen.',
          'The request goes to the Lewad team, who add the service to the directory.',
        ],
      },
      {
        q: 'As a Lewad user, what do I get?',
        a: ['You get 5 free bonus points when you first sign up, so you can try Lewad and run your first searches.'],
      },
      {
        q: 'What do the points represent?',
        a: ['Points are your search credit in Lewad.', 'One point = one search.'],
      },
      {
        q: 'How can I get points?',
        a: ['There are several ways to get points:'],
        steps: [
          'Pick a ready-made top-up offer from the Offers section.',
          'Buy the number of points you want.',
          'Share Lewad — each share can earn you a point.',
        ],
        link: true,
      },
      {
        q: 'I own a business — how do I add it to Lewad?',
        a: [
          'Adding a business yourself is coming soon.',
          'You will fill in a form from your account, then the Lewad team will check the details before it goes live.',
          'In the meantime, write to us from the Contact section and we will add your business.',
        ],
      },
    ] as FaqItem[],
  },

  offers: {
    eyebrow: 'Offers',
    title: 'Top up your points.',
    text: 'Pick a ready-made offer, or the number of points that suits you.',
    soon: 'Coming soon',
    pointsLabel: 'points',
    cards: [
      {
        name: 'Starter offer',
        tagline: 'To try Lewad and run your first searches.',
        points: '—',
        features: ['Ideal to get started', 'Occasional searches', 'Points valid across all services'],
      },
      {
        name: 'Standard offer',
        tagline: 'For regular, everyday searching.',
        points: '—',
        features: ['Best points-to-price ratio', 'For frequent use', 'Points valid across all services'],
      },
      {
        name: 'Flexible offer',
        tagline: 'You choose the number of points yourself.',
        points: '—',
        features: ['Any amount', 'Pay for what you need', 'Points valid across all services'],
      },
    ] as Offer[],
  },

  contact: {
    eyebrow: 'Contact',
    title: 'A question? Write to us.',
    text: 'The Lewad team answers users and business owners alike.',
    cta: 'Contact us',
    phone: 'Phone',
    whatsapp: 'WhatsApp',
    email: 'Email',
    businessTitle: 'Do you own a business?',
    businessText: 'Join Lewad and let your customers find you, call you, or come to you directly.',
    businessCta: 'Message us on WhatsApp',
  },

  appSearch: {
    suggestions: 'Suggestions',
    noSuggestions: 'No suggestions',
    didYouMean: 'Did you mean “{name}”?',
    yes: 'Yes',
    no: 'No',
    addEstablishment: 'Add an establishment',
    addEstablishmentMessage: 'The establishment-addition request will be available soon.',
    unavailable: 'This service is not available on Lewad yet.',
    requestAddition: 'Request addition',
    demoNote: 'Local demo catalogue: the information shown does not yet come from the Lewad directory.',
  },

  profileAvatar: {
    uploadAvatar: 'Choose a photo',
    avatarHint: 'PNG, JPG, JPEG or WebP, up to 2 MB.',
    fileTooLarge: 'The image must not exceed 2 MB.',
    unsupportedImage: 'Choose a PNG, JPG, JPEG, or WebP image.',
    uploadFailed: 'We could not upload the image right now. Please try again shortly.',
    uploadingAvatar: 'Uploading image…',
    profileImageUpdated: 'Profile image updated.',
    phoneAlreadyUsed: 'This phone number is already used by another account.',
    invalidPhone: 'The number must contain 8 digits and start with 2, 3, or 4.',
    saveProfile: 'Save profile',
    savingProfile: 'Saving…',
    profileSaved: 'Profile updated.',
  },

  footer: {
    madeBy: 'Made by Wasla Soft',
    rights: '© 2026 — All rights reserved',
    version: 'Version v1.0.0',
    tagline: 'Local search in Mauritania.',
  },

  alerts: {
    demoTemp: 'The visuals in this demo are temporary and will be replaced with real screenshots.',
    offersNotFinal: 'Offers and prices are not final. They will be confirmed before launch.',
    comingSoon: 'This feature is coming soon.',
  },

  system: {
    loading: 'Preparing Lewad',
    backHome: 'Back to home',
    retry: 'Try again',
    offlineTitle: 'Connection interrupted',
    offlineText: 'We can’t reach Lewad. Check your connection, then try again.',
    errorLabel: 'Error',
  },

  errors: {
    '400': ['Invalid request', 'This request could not be processed.'],
    '401': ['Sign in required', 'Sign in to open this page.'],
    '402': ['Not enough points', 'This action requires points or a payment.'],
    '403': ['Access denied', 'You do not have permission to open this page.'],
    '404': ['Page not found', 'This page does not exist or has moved.'],
    '408': ['Request timed out', 'The service is taking longer than expected to respond.'],
    '429': ['Too many requests', 'You’re going a little fast. Wait a moment, then try again.'],
    '500': ['Server error', 'Something went wrong on our side. We’re on it.'],
    '502': ['Service unreachable', 'Lewad cannot reach one of its services right now.'],
    '503': ['Temporarily unavailable', 'Lewad is under maintenance. We’ll be back very soon.'],
    '504': ['Response too slow', 'The server is taking too long to respond. Try again in a moment.'],
    network: ['Connection interrupted', 'We can’t reach Lewad. Check your connection, then try again.'],
  },
}

import type { Db2Establishment } from './db2'

/**
 * Contenu non traduit. Source unique des coordonnées officielles de l'équipe
 * Lewad : la landing, le pied de page, `/contact`, le relais WhatsApp de
 * recharge et celui de soumission d'établissement lisent tous cet objet. Ne
 * jamais recopier un numéro ou un e-mail dans un composant.
 */

export const contact = {
  phoneDisplay: '+222 42 01 54 64',
  phoneHref: 'tel:+22242015464',
  whatsappDisplay: '+222 42 01 54 64',
  whatsappHref: 'https://wa.me/22242015464',
  paymentNumber: '42015464',
  email: 'lewad.help@gmail.com',
  emailHref: 'mailto:lewad.help@gmail.com',
}

export const paymentApps = ['Bankily', 'Sedad', 'Masrivi', 'Bimbank', 'Gazapay', 'Bamis Digital', 'Barid Cash', 'Click'] as const

/**
 * Offre publiée pour l'inscription d'un établissement, affichée **avant** la
 * soumission — au moment où aucune réponse serveur n'existe encore.
 *
 * Le serveur reste seul décideur : `create_business_submission` fixe lui-même
 * le montant et la durée, et l'écran de succès, le message WhatsApp et l'espace
 * admin n'affichent que les valeurs renvoyées par la base. Ces deux constantes
 * ne servent qu'à l'affichage et sont verrouillées sur la migration par
 * `tests/businessSubmissionsContracts.test.ts`.
 */
export const businessSubmissionOffer = {
  amountMro: 200,
  periodMonths: 3,
}

/** Sections de la landing, dans l'ordre. Sert d'ancre ET de source du menu déroulant. */
export const sectionIds = ['what', 'strip', 'service', 'demo', 'install', 'faq', 'offers', 'contact'] as const
export type SectionId = (typeof sectionIds)[number]

/**
 * Sous-ensemble affiché en clair dans la navbar desktop. Les sept sections
 * restent accessibles via le tiroir mobile et le pied de page : une barre
 * desktop à sept liens serait surchargée.
 */
export const primarySectionIds = ['what', 'service', 'demo', 'offers', 'contact'] as const satisfies readonly SectionId[]

/** Icône associée à chaque carte du bandeau animé, dans l'ordre de `t.strip.items`. */
export const stripIcons = [
  'search',
  'map',
  'store',
  'basket',
  'dumbbell',
  'utensils',
  'health',
  'cart',
  'phone',
  'sparkle',
] as const

/** Fiche fictive utilisée par le carrousel de démonstration. */
export const demoResult = {
  user: 'Nasser',
  initial: 'N',
  points: 309,
  name: 'Bankily',
  website: 'bankily.mr',
  phone: '+222 36 XX XX XX',
  district: 'Tevragh Zeina',
  branch: 'Agence Ksar',
  distance: '1,4 km',
}

/**
 * Temporary local catalogue for the member-search experience. It deliberately
 * has no Supabase dependency: until DB2 is officially live, searches must not
 * debit a wallet, write a log, or imply that these are verified listings.
 */
export const searchDemoEstablishments: readonly Db2Establishment[] = [
  {
    id: 'demo-bankily', name: 'Bankily', slug: 'bankily',
    description: null, phone: null, whatsapp: null, website: null,
    status: 'approved', is_verified: false,
    category: { id: 'demo-finance', name: 'Services financiers', slug: 'financial-services', icon: null },
    branches: [
      {
        id: 'demo-bankily-centre', establishment_id: 'demo-bankily', name: 'Agence de démonstration',
        phone: null, whatsapp: null, address: null, city: null, neighborhood: null,
        latitude: null, longitude: null, is_main: true, status: 'active',
      },
    ],
    branchesError: false,
  },
  {
    id: 'demo-sedad', name: 'Sedad', slug: 'sedad', description: null, phone: null, whatsapp: null, website: null,
    status: 'approved', is_verified: false,
    category: { id: 'demo-finance', name: 'Services financiers', slug: 'financial-services', icon: null }, branches: [], branchesError: false,
  },
  {
    id: 'demo-masrivi', name: 'Masrivi', slug: 'masrivi', description: null, phone: null, whatsapp: null, website: null,
    status: 'approved', is_verified: false,
    category: { id: 'demo-finance', name: 'Services financiers', slug: 'financial-services', icon: null }, branches: [], branchesError: false,
  },
  {
    id: 'demo-sehdini', name: 'SehDini', slug: 'sehdini', description: null, phone: null, whatsapp: null, website: null,
    status: 'approved', is_verified: false,
    category: { id: 'demo-health', name: 'Santé', slug: 'health', icon: null }, branches: [], branchesError: false,
  },
  {
    id: 'demo-carapp', name: 'CarApp', slug: 'carapp', description: null, phone: null, whatsapp: null, website: null,
    status: 'approved', is_verified: false,
    category: { id: 'demo-mobility', name: 'Mobilité', slug: 'mobility', icon: null }, branches: [], branchesError: false,
  },
  {
    id: 'demo-islah', name: 'Islah', slug: 'islah', description: null, phone: null, whatsapp: null, website: null,
    status: 'approved', is_verified: false,
    category: { id: 'demo-services', name: 'Services', slug: 'services', icon: null }, branches: [], branchesError: false,
  },
  {
    id: 'demo-gym', name: 'Gym', slug: 'gym', description: null, phone: null, whatsapp: null, website: null,
    status: 'approved', is_verified: false,
    category: { id: 'demo-sport', name: 'Sport', slug: 'sport', icon: null }, branches: [], branchesError: false,
  },
  {
    id: 'demo-pharmacie-centrale', name: 'Pharmacie Centrale', slug: 'pharmacie-centrale', description: null, phone: null, whatsapp: null, website: null,
    status: 'approved', is_verified: false,
    category: { id: 'demo-health', name: 'Santé', slug: 'health', icon: null }, branches: [], branchesError: false,
  },
  {
    id: 'demo-restaurant-salam', name: 'Restaurant Salam', slug: 'restaurant-salam', description: null, phone: null, whatsapp: null, website: null,
    status: 'approved', is_verified: false,
    category: { id: 'demo-food', name: 'Restaurants', slug: 'restaurants', icon: null }, branches: [], branchesError: false,
  },
]

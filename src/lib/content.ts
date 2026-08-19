import type { Db2Establishment } from './db2'

/**
 * Contenu non traduit. Les coordonnées sont des espaces réservés :
 * à remplacer par les vraies avant le lancement.
 */

export const contact = {
  phoneDisplay: '+222 36 00 00 00',
  phoneHref: 'tel:+22236000000',
  whatsappDisplay: '+222 36 00 00 00',
  whatsappHref: 'https://wa.me/22236000000',
  email: 'contact@lewad.mr',
  emailHref: 'mailto:contact@lewad.mr',
}

/** Sections de la landing, dans l'ordre. Sert d'ancre ET de source du menu déroulant. */
export const sectionIds = ['what', 'strip', 'service', 'demo', 'faq', 'offers', 'contact'] as const
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

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

/**
 * Ressources servies depuis `public/`. Vite expose ce dossier à la racine du
 * site : `public/assets/x.png` devient `/assets/x.png`. On ne fait jamais
 * d'import relatif vers `public/` — ce dossier n'est pas traité par le bundler.
 */

import type { Locale } from '../i18n'

/** Logo de marque complet : emblème + « Lewad » + « لواد » + signature. */
export const logoSrc = '/assets/logo_lewad.png'

/**
 * Découpe de l'emblème (le chameau et le point d'interrogation) dans le logo
 * complet, pour les contextes courts — barre de navigation, tuile d'accueil —
 * où le mot-symbole et la signature deviendraient illisibles.
 *
 * Les bandes du fichier 500×500 ont été mesurées une fois :
 *
 * | Bande     | y         | Contenu                          |
 * | --------- | --------- | -------------------------------- |
 * | emblème   | 72 → 258  | chameau, point d'interrogation   |
 * | mot-symb. | 260 → 317 | « Lewad »                        |
 * | arabe     | 327 → 377 | « لواد »                          |
 * | signature | 386 → 400 | « Trouvez, contactez, avancez »   |
 *
 * Une seule ligne sépare l'emblème du mot-symbole : un cadrage carré centré sur
 * l'emblème mordrait forcément sur le « Lewad ». Le cadrage retenu est donc en
 * 4/3 — x 125,5 → 381,5 · y 67 → 259 — soit l'emblème entier, une marge égale à
 * gauche et à droite, et rien du mot-symbole. La marge visuelle manquante en
 * bas est rendue par la pastille qui entoure l'emblème (voir `Logo.tsx`).
 *
 * Traduit en `background-size` / `background-position`, ce cadrage vaut pour
 * n'importe quelle taille de conteneur — d'où l'usage d'un fond plutôt que
 * d'une `<img>` positionnée en pixels. Le conteneur doit porter le ratio 4/3,
 * sans quoi le dessin serait déformé.
 *
 * Si `logo_lewad.png` est remplacé par un fichier composé autrement, ce sont
 * ces valeurs — et elles seules — qu'il faut recalculer.
 */
export const logoEmblemCrop = {
  backgroundImage: `url('${logoSrc}')`,
  backgroundSize: '195.31% 260.42%',
  backgroundPosition: '51.43% 21.75%',
  backgroundRepeat: 'no-repeat',
} as const

/**
 * Drapeaux du sélecteur de langue.
 *
 * `mauritanie` et `england` sont livrés en SVG ; ils sont référencés en `.svg`
 * car un SVG servi en `image/png` ne s'affiche pas dans une `<img>`. Les
 * fichiers `.png` d'origine sont conservés tels quels dans `public/assets/`.
 */
export const localeFlagSrc: Record<Locale, string> = {
  fr: '/assets/france.png',
  ar: '/assets/mauritanie.svg',
  en: '/assets/england.svg',
}

/** Captures d'écran réelles utilisées par la section « Comment utiliser Lewad ». */
export const howToShots = {
  search: '/assets/landing/ui_user_1.png',
  suggestions: '/assets/landing/ui_user_2.png',
  details: '/assets/landing/ui_user_3.png',
  directions: '/assets/landing/ui_user_4_maps.png',
} as const

/**
 * Orientation de chaque capture. Les deux premières sont des écrans mobiles en
 * portrait, les deux suivantes des vues larges : elles ne se cadrent pas de la
 * même façon dans une carte.
 */
export type ShotShape = 'portrait' | 'landscape'

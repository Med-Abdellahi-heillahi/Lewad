import type { Locale } from '../../i18n'
import { useI18n } from '../../i18n'
import { SessionLoading } from './SessionLoading'

/**
 * Libellé d'attente du lot d'administration.
 *
 * Les trois chaînes vivent ici plutôt que dans `adminCopy` : ce texte s'affiche
 * *avant* que le lot admin ne soit téléchargé, donc il doit rester dans le lot
 * principal — y importer le dictionnaire d'administration remettrait 50 ko de
 * copie dans le bundle que l'on cherche précisément à alléger.
 */
const labels: Record<Locale, string> = {
  fr: 'Chargement de l’espace admin…',
  ar: 'جارٍ تحميل مساحة الإدارة…',
  en: 'Loading admin space…',
}

/**
 * Même écran que le garde de session : le passage « chargement du lot » →
 * « vérification du rôle » ne produit aucun saut de mise en page.
 */
export function AdminLoading() {
  const { locale } = useI18n()

  return <SessionLoading label={labels[locale]} />
}

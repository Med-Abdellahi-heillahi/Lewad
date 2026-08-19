import type { Locale } from '../i18n'
import type { Db1Profile } from './db1'

/**
 * Étiquette monétaire locale. En arabe l'ouguiya s'écrit en toutes lettres :
 * « MRO » est un sigle latin illisible au milieu d'une phrase arabe.
 */
const currencyLabels: Record<Locale, string> = { fr: 'MRO', en: 'MRO', ar: 'أوقية' }

/**
 * Chiffres latins dans les trois langues (`-u-nu-latn` pour l'arabe) : un solde
 * et un prix doivent rester lisibles d'un coup d'œil, y compris pour un
 * utilisateur arabophone habitué aux chiffres occidentaux en Mauritanie.
 */
const numberLocales: Record<Locale, string> = { fr: 'fr-FR', en: 'en-US', ar: 'ar-u-nu-latn' }

/** Nom de la monnaie dans la langue courante — « MRO » ou « أوقية ». */
export function currencyLabel(locale: Locale) {
  return currencyLabels[locale]
}

export function formatNumber(value: number, locale: Locale) {
  return new Intl.NumberFormat(numberLocales[locale]).format(value)
}

/** `50 MRO` en français/anglais, `50 أوقية` en arabe. */
export function formatCurrency(amount: number, locale: Locale) {
  return `${formatNumber(amount, locale)} ${currencyLabels[locale]}`
}

/** `10 points` / `10 نقاط` — l'unité vient de la page appelante. */
export function formatPoints(amount: number, locale: Locale, unit: string) {
  return `${formatNumber(amount, locale)} ${unit}`
}

/** Mouvement de grand livre : le signe précède toujours le nombre. */
export function formatSignedPoints(amount: number, locale: Locale, unit: string) {
  const sign = amount > 0 ? '+' : amount < 0 ? '−' : ''
  return `${sign}${formatNumber(Math.abs(amount), locale)} ${unit}`
}

export function formatDate(iso: string, locale: Locale) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat(numberLocales[locale], { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}

/**
 * Règle d'affichage du nom, valable partout dans l'application :
 * en arabe on privilégie `full_name_ar` quand il existe, sinon on retombe sur
 * le nom latin, puis sur le nom fourni à l'inscription.
 */
export function profileDisplayName(profile: Db1Profile | null, locale: Locale, authFallback?: string | null) {
  const arabicName = profile?.full_name_ar?.trim()
  if (locale === 'ar' && arabicName) return arabicName

  const latinName = profile?.full_name?.trim()
  if (latinName) return latinName

  const fallback = authFallback?.trim()
  return fallback || null
}

/** Initiale de l'avatar. `Array.from` pour ne pas couper un caractère arabe. */
export function initialOf(name: string) {
  const first = Array.from(name.trim())[0]
  return first ? first.toLocaleUpperCase() : '?'
}

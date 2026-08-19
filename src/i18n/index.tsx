import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fr, type Dictionary } from './fr'
import { ar } from './ar'
import { en } from './en'

export type Locale = 'fr' | 'ar' | 'en'
export type Direction = 'ltr' | 'rtl'
export type { Dictionary }

export const locales: Locale[] = ['fr', 'ar', 'en']
export const dictionaries: Record<Locale, Dictionary> = { fr, ar, en }

const STORAGE_KEY = 'lewad-locale'

export function directionOf(locale: Locale): Direction {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

function readLocale(): Locale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored && locales.includes(stored as Locale)) return stored as Locale
  } catch {
    /* storage unavailable (private mode) — fall back to default */
  }
  return 'fr'
}

type I18nValue = {
  locale: Locale
  setLocale: (locale: Locale) => void
  t: Dictionary
  dir: Direction
  isRtl: boolean
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readLocale)

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const dir = directionOf(locale)
    document.documentElement.lang = locale
    document.documentElement.dir = dir
    document.documentElement.setAttribute('data-locale', locale)
    const meta = document.querySelector('meta[name="description"]')
    if (meta) meta.setAttribute('content', dictionaries[locale].meta.description)
  }, [locale])

  const value = useMemo<I18nValue>(
    () => ({
      locale,
      setLocale,
      t: dictionaries[locale],
      dir: directionOf(locale),
      isRtl: locale === 'ar',
    }),
    [locale, setLocale],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>')
  return value
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export const textSizes = ['sm', 'base', 'lg', 'xl'] as const
export type AppTextSize = (typeof textSizes)[number]

const STORAGE_KEY = 'lewad-text-size'

function readTextSize(): AppTextSize {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (textSizes.includes(stored as AppTextSize)) return stored as AppTextSize
  } catch {
    /* Storage may be unavailable; normal is the accessible, stable fallback. */
  }
  return 'base'
}

type TextSizeValue = {
  textSize: AppTextSize
  setTextSize: (size: AppTextSize) => void
}

const TextSizeContext = createContext<TextSizeValue | null>(null)

/** Persists the reader's preferred app-wide text scale on the document root. */
export function TextSizeProvider({ children }: { children: ReactNode }) {
  const [textSize, setTextSizeState] = useState<AppTextSize>(readTextSize)

  const setTextSize = useCallback((next: AppTextSize) => {
    setTextSizeState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      /* A temporary preference is still useful when storage is blocked. */
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize
  }, [textSize])

  const value = useMemo<TextSizeValue>(() => ({ textSize, setTextSize }), [textSize, setTextSize])

  return <TextSizeContext.Provider value={value}>{children}</TextSizeContext.Provider>
}

export function useTextSize(): TextSizeValue {
  const value = useContext(TextSizeContext)
  if (!value) throw new Error('useTextSize must be used inside <TextSizeProvider>')
  return value
}

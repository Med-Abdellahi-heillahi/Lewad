import { useEffect, useState } from 'react'
import { useI18n } from '../../i18n'
import { getMyEstablishmentsWithStats } from '../../lib/clientEstablishments'
import { Icon } from '../Icon'
import { appShellCopy } from './appNav'

export function EstablishmentsButton() {
  const { locale } = useI18n()
  const copy = appShellCopy[locale]
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    getMyEstablishmentsWithStats()
      .then((result) => { if (active) setCount(result.items.length) })
      .catch(() => { if (active) setCount(0) })
    return () => { active = false }
  }, [])

  if (count === null || count === 0) return null

  return (
    <a
      href="/profile#establishments"
      className="pointer-events-auto mx-auto flex min-h-11 w-max max-w-full items-center justify-center gap-2 rounded-full border border-brand/35 bg-surface/95 px-4 text-xs font-semibold text-brand-deep backdrop-blur-xl transition-colors card-elevated hover:border-brand/60 hover:bg-brand-soft dark:text-brand"
    >
      <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft">
        <Icon name="store" size={15} />
      </span>
      <span className="min-w-0 truncate">{copy.myEstablishments}</span>
    </a>
  )
}

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
      className="flex items-center justify-center gap-2 bg-brand-soft/60 px-3 py-2 text-xs font-semibold text-brand-deep transition-colors hover:bg-brand-soft"
    >
      <Icon name="store" size={16} />
      {copy.myEstablishments}
    </a>
  )
}

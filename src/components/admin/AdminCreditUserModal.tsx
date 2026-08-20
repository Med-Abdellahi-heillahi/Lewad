import { useEffect, useRef, useState } from 'react'
import { FileDown, Printer, X } from 'lucide-react'
import { useI18n, type Locale } from '../../i18n'
import { getAdminUserFinance, type AdminUserFinance } from '../../lib/admin'
import { formatDate, formatNumber } from '../../lib/format'
import { btnGhost, btnPrimary, cardMuted, iconBtn } from '../../lib/ui'
import { InlineAlert, Skeleton } from '../system/States'
import { adminCopy } from './adminCopy'

type CreditUser = {
  userId: string
  name: string
  email: string | null
  phone: string | null
  balance: number | null
  rechargeStatusLabel: string
}

/**
 * Rapport imprimable. Le navigateur reste le seul moteur PDF : « Télécharger
 * PDF » et « Imprimer » ouvrent la même boîte d'impression, où *Enregistrer au
 * format PDF* fait le travail. Aucune dépendance de génération n'est ajoutée
 * pour une page de tableau.
 */
function openSearchReport({
  user,
  finance,
  labels,
  locale,
  direction,
}: {
  user: CreditUser
  finance: AdminUserFinance
  labels: (typeof adminCopy)[keyof typeof adminCopy]['credits']
  locale: Locale
  direction: 'ltr' | 'rtl'
}) {
  const reportWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!reportWindow) return false

  const escape = (value: string) =>
    value.replace(/[&<>"']/g, (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character,
    )

  const balance = user.balance === null ? labels.walletMissing : `${formatNumber(user.balance, locale)} ${labels.points}`
  const rows = finance.recentSearches
    .map(
      (search) => `<tr>
        <td>${escape(search.query)}</td>
        <td>${escape(search.status)}</td>
        <td class="num">-${formatNumber(search.debited_points, locale)}</td>
        <td>${escape(formatDate(search.created_at, locale))}</td>
      </tr>`,
    )
    .join('')

  reportWindow.document.write(`<!doctype html>
<html lang="${escape(locale)}" dir="${direction}">
<head>
<meta charset="utf-8">
<title>${escape(labels.reportTitle)} — ${escape(user.name)}</title>
<style>
  :root { color-scheme: light; }
  body { font-family: system-ui, -apple-system, 'Segoe UI', sans-serif; color: #191d18; margin: 32px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p { margin: 2px 0; font-size: 13px; color: #5c6159; }
  dl { display: grid; grid-template-columns: auto auto; gap: 4px 16px; margin: 20px 0; font-size: 13px; }
  dt { color: #5c6159; }
  dd { margin: 0; font-weight: 600; }
  h2 { font-size: 14px; margin: 24px 0 8px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th, td { border-bottom: 1px solid #d8d8d2; padding: 6px 8px; text-align: start; }
  th { background: #f1f1ec; font-size: 11px; text-transform: uppercase; letter-spacing: .06em; }
  .num { font-variant-numeric: tabular-nums; }
  .empty { color: #5c6159; font-size: 13px; }
</style>
</head>
<body>
  <h1>${escape(labels.reportTitle)}</h1>
  <p>${escape(labels.reportGenerated)} ${escape(formatDate(new Date().toISOString(), locale))}</p>
  <dl>
    <dt>${escape(labels.user)}</dt><dd>${escape(user.name)}</dd>
    <dt>${escape(labels.currentBalance)}</dt><dd>${escape(balance)}</dd>
    <dt>${escape(labels.searchCount)}</dt><dd class="num">${formatNumber(finance.searchCount, locale)}</dd>
  </dl>
  <h2>${escape(labels.recentSearches)}</h2>
  ${rows ? `<table><thead><tr><th>${escape(labels.recentSearches)}</th><th>${escape(labels.lastRechargeStatus)}</th><th>${escape(labels.points)}</th><th>${escape(labels.requestedOn)}</th></tr></thead><tbody>${rows}</tbody></table>` : `<p class="empty">${escape(labels.noSearches)}</p>`}
</body>
</html>`)
  reportWindow.document.close()
  reportWindow.focus()
  reportWindow.print()
  return true
}

/**
 * Fiche financière d'un compte. Lecture seule : aucune valeur affichée ici
 * n'est modifiable, et aucun total n'est inventé — ils sont sommés à partir des
 * mouvements réellement lisibles par l'appelant.
 */
export function AdminCreditUserModal({ user, onClose }: { user: CreditUser; onClose: () => void }) {
  const { locale, dir } = useI18n()
  const labels = adminCopy[locale].credits
  const [finance, setFinance] = useState<AdminUserFinance | null>(null)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)
  const closeButton = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    let active = true
    setLoading(true)
    setFailed(false)

    void getAdminUserFinance(user.userId).then((result) => {
      if (!active) return
      setFinance(result.data)
      setFailed(Boolean(result.error))
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [user.userId])

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const focusTimer = window.setTimeout(() => closeButton.current?.focus(), 20)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      previousFocus.current?.focus?.()
    }
  }, [onClose])

  const balanceLabel = user.balance === null
    ? labels.walletMissing
    : `${formatNumber(user.balance, locale)} ${labels.points}`

  const stats = finance
    ? [
      { label: labels.currentBalance, value: balanceLabel },
      { label: labels.creditsReceived, value: `${formatNumber(finance.creditsReceived, locale)} ${labels.points}` },
      { label: labels.creditsSpent, value: `${formatNumber(finance.creditsSpent, locale)} ${labels.points}` },
      { label: labels.searchCount, value: formatNumber(finance.searchCount, locale) },
      { label: labels.rechargeCount, value: formatNumber(finance.rechargeCount, locale) },
      { label: labels.lastRechargeStatus, value: user.rechargeStatusLabel },
    ]
    : []

  const report = () => {
    if (finance) openSearchReport({ user, finance, labels, locale, direction: dir })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-credit-modal-title"
      className="fixed inset-0 z-60 grid place-items-end bg-ink/40 backdrop-blur-[2px] sm:place-items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="max-h-[calc(100dvh-1rem)] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="admin-credit-modal-title" className="text-lg font-bold tracking-tight text-ink sm:text-xl">{labels.financeTitle}</h2>
            <p dir="auto" className="mt-1 truncate text-sm font-semibold text-ink-soft">{user.name}</p>
            <p className="ltr-isolate truncate text-xs text-muted">{user.email ?? '—'}</p>
            {user.phone && <p className="ltr-isolate truncate text-xs text-muted">{user.phone}</p>}
          </div>
          <button ref={closeButton} type="button" className={iconBtn} aria-label={labels.close} title={labels.close} onClick={onClose}>
            <X size={19} aria-hidden />
          </button>
        </div>

        {loading ? (
          <div className="mt-5 grid gap-2" role="status" aria-busy="true">
            {[0, 1, 2].map((row) => <Skeleton key={row} className="h-12 w-full" />)}
            <span className="sr-only">{labels.loadingFinance}</span>
          </div>
        ) : !finance || failed ? (
          <InlineAlert tone="error" className="mt-5">{labels.financeUnavailable}</InlineAlert>
        ) : (
          <>
            <dl className="mt-5 grid gap-2 sm:grid-cols-2">
              {stats.map((stat) => (
                <div key={stat.label} className={`${cardMuted} p-3`}>
                  <dt className="text-[11px] font-semibold text-muted">{stat.label}</dt>
                  <dd className="tabular mt-1 text-sm font-bold text-ink">{stat.value}</dd>
                </div>
              ))}
            </dl>

            {finance.totalsTruncated && <p className="mt-2 text-[11px] text-muted">{labels.partialTotals}</p>}

            <h3 className="mt-5 text-sm font-bold text-ink">{labels.recentSearches}</h3>
            {finance.recentSearches.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{labels.noSearches}</p>
            ) : (
              <ul className="mt-2 grid list-none gap-2">
                {finance.recentSearches.map((search) => (
                  <li key={search.id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
                    <div className="min-w-0">
                      <p dir="auto" className="truncate text-sm font-semibold text-ink">{search.query}</p>
                      <p className="mt-0.5 text-xs text-muted">
                        {adminCopy[locale].content.status[search.status] ?? search.status}
                        <span aria-hidden="true"> · </span>
                        <time dateTime={search.created_at}>{formatDate(search.created_at, locale)}</time>
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-sm font-bold text-ask">−{formatNumber(search.debited_points, locale)}</span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
          <button type="button" className={btnGhost} disabled={!finance} onClick={report}>
            <FileDown size={16} aria-hidden />
            {labels.downloadPdf}
          </button>
          <button type="button" className={btnGhost} disabled={!finance} onClick={report}>
            <Printer size={16} aria-hidden />
            {labels.print}
          </button>
          <button type="button" className={btnPrimary} onClick={onClose}>{labels.close}</button>
        </div>
      </section>
    </div>
  )
}

export type { CreditUser }

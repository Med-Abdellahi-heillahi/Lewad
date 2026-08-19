import type { Locale } from '../../i18n'
import type { AdminOverview } from '../../lib/admin'
import { formatNumber } from '../../lib/format'
import { btnGhost, card, pill } from '../../lib/ui'
import { Icon, type IconName } from '../Icon'
import { InlineAlert, LoadingCard } from '../system/States'
import { adminCopy } from './adminCopy'

type SuperAdminPanelProps = {
  locale: Locale
  overview: AdminOverview | null
  loading: boolean
}

const blockIcons: IconName[] = ['user', 'shield', 'lock', 'clock', 'gear', 'alert']

/**
 * Présentation uniquement : les actions super admin restent volontairement
 * inertes tant qu'elles n'ont pas une protection serveur dédiée.
 */
export function SuperAdminPanel({ locale, overview, loading }: SuperAdminPanelProps) {
  const copy = adminCopy[locale].system
  const blocks = [
    copy.blocks.adminManagement,
    copy.blocks.roleManagement,
    copy.blocks.securityOverview,
    copy.blocks.backupRecovery,
    copy.blocks.systemSettings,
    copy.blocks.dangerousActions,
  ]
  const overviewStats: Array<[string, number]> = overview
    ? [
        [copy.totalUsers, overview.totalUsers],
        [copy.pendingRequests, overview.pendingRequests],
        [copy.activeCategories, overview.activeCategories],
      ]
    : []

  return (
    <div className="space-y-5">
      <header className={`${card} border-brand/45 p-5 sm:p-6`}>
        <span className={`${pill} bg-brand-soft text-brand-deep`}><Icon name="shield" size={14} /> {copy.eyebrow}</span>
        <h2 className="mt-4 text-xl font-bold text-ink">{copy.title}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{copy.intro}</p>
      </header>

      <InlineAlert tone="info" title={copy.title}>{copy.permanentNotice}</InlineAlert>
      <InlineAlert tone="neutral" title={copy.noDestructiveAction}>{copy.securityNotice}</InlineAlert>

      {loading ? (
        <LoadingCard label={copy.overview} lines={3} />
      ) : overview ? (
        <section aria-labelledby="system-overview" className={`${card} p-4 sm:p-5`}>
          <h3 id="system-overview" className="text-base font-bold text-ink">{copy.overview}</h3>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            {overviewStats.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-line bg-page-alt p-3.5">
                <dt className="text-xs font-medium text-muted">{label}</dt>
                <dd className="mt-1 text-xl font-bold tabular text-ink">{formatNumber(value, locale)}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {blocks.map((block, index) => (
          <article key={block.title} className={`${card} flex flex-col p-4 sm:p-5`}>
            <span className="grid size-9 place-items-center rounded-lg bg-surface-2 text-ink-soft"><Icon name={blockIcons[index]} size={18} /></span>
            <h3 className="mt-4 text-base font-bold text-ink">{block.title}</h3>
            <p className="mt-2 flex-1 text-sm leading-6 text-muted">{block.text}</p>
            {index === 2 && (
              <ul className="mt-4 list-none space-y-2 border-t border-line pt-4 text-xs leading-5 text-muted">
                {copy.securityChecklist.map((item) => <li key={item} className="flex gap-2"><Icon name="check" size={15} className="mt-0.5 shrink-0 text-answer" />{item}</li>)}
              </ul>
            )}
            <p className="mt-4 text-xs leading-5 text-muted">{copy.futureNotice}</p>
            <button type="button" disabled className={`${btnGhost} mt-3 w-full`}>{copy.futureAction}</button>
          </article>
        ))}
      </div>
    </div>
  )
}

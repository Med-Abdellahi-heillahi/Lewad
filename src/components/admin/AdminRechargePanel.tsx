import { CircleDollarSign, Info } from 'lucide-react'
import { useI18n } from '../../i18n'
import { AdminEmptyState, AdminSectionHeader } from './AdminUi'
import { adminCopy } from './adminCopy'

/**
 * Entry point for the active manual-payment recharge workflow. Amount totals
 * stay out of this dashboard card because the source of truth is the
 * per-account approval flow in the Credits section.
 */
export function AdminRechargePanel() {
  const { locale } = useI18n()
  const copy = adminCopy[locale].recharge

  return (
    <section id="admin-recharges" className="scroll-mt-24 space-y-4">
      <AdminSectionHeader icon={CircleDollarSign} title={copy.title} text={copy.subtitle} />

      <AdminEmptyState icon={CircleDollarSign} title={copy.emptyTitle} text={copy.emptyText} badge={copy.badge} />

      <p className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[13px] leading-relaxed text-muted">
        <span className="mt-px shrink-0">
          <Info size={16} aria-hidden />
        </span>
        {copy.placeholderNotice}
      </p>
    </section>
  )
}

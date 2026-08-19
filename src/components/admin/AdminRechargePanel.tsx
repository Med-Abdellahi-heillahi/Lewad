import { CircleDollarSign, Clock, FileText, Info, Wallet } from 'lucide-react'
import { useI18n } from '../../i18n'
import { card } from '../../lib/ui'
import { AdminEmptyState, AdminSectionHeader } from './AdminUi'
import { adminCopy } from './adminCopy'

/**
 * Bloc « Recharges ».
 *
 * Aucune table de demandes de recharge n'existe : le paiement passe encore par
 * WhatsApp, hors application. On affiche donc un état de préparation explicite
 * plutôt que des totaux financiers inventés — un chiffre d'encaissement faux
 * serait pire qu'une absence de chiffre.
 */
export function AdminRechargePanel() {
  const { locale } = useI18n()
  const copy = adminCopy[locale].recharge

  const placeholders = [
    { icon: FileText, label: copy.totalRequests },
    { icon: Clock, label: copy.pending },
    { icon: CircleDollarSign, label: copy.amountExpected },
    { icon: Wallet, label: copy.amountCollected },
  ]

  return (
    <section id="admin-recharges" className="scroll-mt-24 space-y-4">
      <AdminSectionHeader icon={CircleDollarSign} title={copy.title} text={copy.subtitle} />

      <AdminEmptyState icon={CircleDollarSign} title={copy.emptyTitle} text={copy.emptyText} badge={copy.badge} />

      {/* Cadres des futurs compteurs : la valeur reste « — », jamais un nombre. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {placeholders.map(({ icon: LeadIcon, label }) => (
          <article key={label} className={`${card} p-4 opacity-60`}>
            <span className="grid size-9 place-items-center rounded-xl bg-surface-2 text-muted">
              <LeadIcon size={18} aria-hidden />
            </span>
            <p className="mt-3 text-2xl font-bold text-muted" aria-hidden>
              —
            </p>
            <p className="mt-1 text-sm font-medium text-muted">{label}</p>
          </article>
        ))}
      </div>

      <p className="flex items-start gap-2.5 rounded-xl border border-line bg-surface-2 px-3.5 py-3 text-[13px] leading-relaxed text-muted">
        <span className="mt-px shrink-0">
          <Info size={16} aria-hidden />
        </span>
        {copy.placeholderNotice}
      </p>
    </section>
  )
}

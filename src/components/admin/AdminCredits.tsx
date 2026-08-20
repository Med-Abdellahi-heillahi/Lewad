import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle, Eye, Plus, X } from 'lucide-react'
import { useI18n } from '../../i18n'
import {
  adminApproveRechargeRequest,
  adminRejectRechargeRequest,
  type AdminRechargeModule,
  type AdminRechargeRequest,
  type AdminWallet,
} from '../../lib/admin'
import { formatCurrency, formatDate, formatNumber } from '../../lib/format'
import type { PaginatedResult } from '../../lib/pagination'
import { btnGhost, btnPrimary, card, cardMuted, iconBtn, pill } from '../../lib/ui'
import { EmptyState, InlineAlert, LoadingCard } from '../system/States'
import { PaginationControls } from '../ui/PaginationControls'
import { adminCopy } from './adminCopy'
import { AdminActionButton } from './AdminUi'
import { AdminCreditUserModal, type CreditUser } from './AdminCreditUserModal'

type CreditsCopy = (typeof adminCopy)[keyof typeof adminCopy]['credits']

type AdminCreditsProps = {
  wallets: AdminWallet[]
  pagination: PaginatedResult<AdminWallet>
  loading: boolean
  recharges: AdminRechargeRequest[]
  rechargeModule: AdminRechargeModule
  onPageChange: (page: number) => void
  /** Re-reads wallets and recharge requests after an approval. */
  onRefresh: () => void
  displayName: (user: AdminWallet['user']) => string
}

type Dialog = { kind: 'recharge'; wallet: AdminWallet } | { kind: 'visit'; user: CreditUser } | null
type Notice = { tone: 'success' | 'error'; text: string } | null

/** État de recharge le plus récent d'un compte, tel qu'il s'affiche en badge. */
function rechargeStateOf(userId: string, recharges: AdminRechargeRequest[]) {
  const own = recharges.filter((request) => request.user_id === userId)
  const pending = own.find((request) => request.status === 'pending')
  if (pending) return { status: 'pending' as const, request: pending }
  const latest = own[0]
  if (!latest) return { status: 'none' as const, request: null }
  return { status: latest.status, request: latest }
}

function RechargeBadge({ status, copy, module }: { status: string; copy: CreditsCopy; module: AdminRechargeModule }) {
  if (module === 'not-connected') {
    return <span className={`${pill} border border-line bg-surface-2 text-muted`}>{copy.moduleNotConnected}</span>
  }

  const tones: Record<string, string> = {
    pending: 'border-brand/30 bg-brand-soft text-brand-deep',
    approved: 'border-answer/30 bg-answer-bg text-answer',
    rejected: 'border-ask/30 bg-ask-bg text-ask',
    cancelled: 'border-line bg-surface-2 text-muted',
    none: 'border-line bg-surface-2 text-muted',
  }
  const texts: Record<string, string> = {
    pending: copy.pendingRequest,
    approved: copy.rechargeApproved,
    rejected: copy.rechargeRejected,
    cancelled: copy.noRecharge,
    none: copy.noRecharge,
  }

  return <span className={`${pill} border ${tones[status] ?? tones.none}`}>{texts[status] ?? copy.noRecharge}</span>
}

function BalanceValue({ balance, copy }: { balance: number | null; copy: CreditsCopy }) {
  const { locale } = useI18n()
  // Un solde à zéro est une information, pas une absence : seul un portefeuille
  // introuvable justifie de ne pas afficher de nombre.
  if (balance === null) return <span className="text-sm text-muted">{copy.walletMissing}</span>
  return <span className="tabular text-base font-bold text-ink">{formatNumber(balance, locale)} {copy.points}</span>
}

/**
 * Fenêtre « Ajouter crédits ».
 *
 * Il n'y a volontairement aucun champ de saisie : l'administrateur ne crée pas
 * de points, il approuve une demande existante dont le montant est déjà fixé.
 * Sans demande en attente, la fenêtre ne propose qu'une explication.
 */
function RechargeDecisionModal({
  wallet,
  request,
  module,
  displayName,
  onClose,
  onDone,
}: {
  wallet: AdminWallet
  request: AdminRechargeRequest | null
  module: AdminRechargeModule
  displayName: (user: AdminWallet['user']) => string
  onClose: () => void
  onDone: (notice: Notice) => void
}) {
  const { locale } = useI18n()
  const copy = adminCopy[locale].credits
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    previousFocus.current = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const focusTimer = window.setTimeout(() => closeButton.current?.focus(), 20)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(focusTimer)
      document.body.style.overflow = previousOverflow
      previousFocus.current?.focus?.()
    }
  }, [busy, onClose])

  const decide = async (kind: 'approve' | 'reject') => {
    if (!request) return
    setBusy(kind)
    const result = kind === 'approve'
      ? await adminApproveRechargeRequest(request.id)
      : await adminRejectRechargeRequest(request.id)
    setBusy(null)

    if (result.ok) {
      onDone({ tone: 'success', text: kind === 'approve' ? copy.approved : copy.rejected })
      return
    }
    if (result.status === 'not_pending') {
      onDone({ tone: 'error', text: copy.alreadyHandled })
      return
    }
    if (result.status === 'not-connected') {
      onDone({ tone: 'error', text: copy.moduleNotConnected })
      return
    }
    onDone({ tone: 'error', text: copy.decisionFailed })
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-recharge-modal-title"
      className="fixed inset-0 z-60 grid place-items-end bg-ink/40 backdrop-blur-[2px] sm:place-items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <section className="max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 id="admin-recharge-modal-title" className="text-lg font-bold tracking-tight text-ink">{copy.addCredits}</h2>
            <p dir="auto" className="mt-1 truncate text-sm text-ink-soft">{displayName(wallet.user)}</p>
          </div>
          <button ref={closeButton} type="button" className={iconBtn} aria-label={copy.close} title={copy.close} disabled={Boolean(busy)} onClick={onClose}>
            <X size={19} aria-hidden />
          </button>
        </div>

        {module === 'not-connected' ? (
          <InlineAlert tone="neutral" className="mt-5">{copy.moduleNotConnected}</InlineAlert>
        ) : !request ? (
          <InlineAlert tone="neutral" className="mt-5">{copy.noPendingRequest}</InlineAlert>
        ) : (
          <>
            <dl className={`${cardMuted} mt-5 grid gap-2 p-4 text-sm`}>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">{copy.requestedPoints}</dt>
                <dd className="tabular font-bold text-ink">{formatNumber(request.requested_points, locale)} {copy.points}</dd>
              </div>
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">{copy.amount}</dt>
                <dd className="tabular font-semibold text-ink-soft">{formatCurrency(request.amount_mro, locale)}</dd>
              </div>
              {request.offer_label && (
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted">{copy.offer}</dt>
                  <dd className="font-semibold text-ink-soft">{request.offer_label}</dd>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <dt className="text-muted">{copy.requestedOn}</dt>
                <dd className="text-ink-soft"><time dateTime={request.created_at}>{formatDate(request.created_at, locale)}</time></dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" className={btnGhost} disabled={Boolean(busy)} onClick={() => void decide('reject')}>
                {busy === 'reject' ? copy.rejecting : copy.rejectRecharge}
              </button>
              <button type="button" className={btnPrimary} disabled={Boolean(busy)} onClick={() => void decide('approve')}>
                <CheckCircle size={16} aria-hidden />
                {busy === 'approve' ? copy.approving : copy.approveRecharge}
              </button>
            </div>
          </>
        )}

        {(module === 'not-connected' || !request) && (
          <div className="mt-6 flex justify-end">
            <button type="button" className={btnPrimary} onClick={onClose}>{copy.close}</button>
          </div>
        )}
      </section>
    </div>
  )
}

export function AdminCredits({
  wallets,
  pagination,
  loading,
  recharges,
  rechargeModule,
  onPageChange,
  onRefresh,
  displayName,
}: AdminCreditsProps) {
  const { locale } = useI18n()
  const copy = adminCopy[locale].credits
  const [dialog, setDialog] = useState<Dialog>(null)
  const [notice, setNotice] = useState<Notice>(null)

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const states = useMemo(
    () => new Map(wallets.map((wallet) => [wallet.user_id, rechargeStateOf(wallet.user_id, recharges)])),
    [recharges, wallets],
  )

  const badgeTextOf = (userId: string) => {
    if (rechargeModule === 'not-connected') return copy.moduleNotConnected
    const labels: Record<string, string> = {
      pending: copy.pendingRequest,
      approved: copy.rechargeApproved,
      rejected: copy.rechargeRejected,
    }
    return labels[states.get(userId)?.status ?? 'none'] ?? copy.noRecharge
  }

  const openVisit = (wallet: AdminWallet) => {
    setDialog({
      kind: 'visit',
      user: {
        userId: wallet.user_id,
        name: displayName(wallet.user),
        email: wallet.user?.email ?? null,
        phone: null,
        balance: wallet.balance,
        rechargeStatusLabel: badgeTextOf(wallet.user_id),
      },
    })
  }

  const finishDecision = (result: Notice) => {
    setDialog(null)
    setNotice(result)
    if (result?.tone === 'success') onRefresh()
  }

  const actions = (wallet: AdminWallet, mobile = false) => (
    <div className={mobile ? 'mt-3 flex items-center gap-2 border-t border-line pt-3' : 'flex items-center justify-end gap-1.5'}>
      <AdminActionButton
        icon={Plus}
        label={copy.addCredits}
        title={copy.addCredits}
        tone="warning"
        iconOnly={!mobile}
        className={mobile ? 'flex-1 justify-center' : ''}
        onClick={() => setDialog({ kind: 'recharge', wallet })}
      />
      <AdminActionButton
        icon={Eye}
        label={copy.visit}
        title={copy.visit}
        tone="primary"
        iconOnly={!mobile}
        className={mobile ? 'flex-1 justify-center' : ''}
        onClick={() => openVisit(wallet)}
      />
    </div>
  )

  if (loading) return <LoadingCard label={adminCopy[locale].content.loading.credits} lines={5} />

  return (
    <div className="space-y-4">
      <header className={`${card} p-4 sm:p-5`}>
        <h2 className="text-lg font-bold tracking-tight text-ink">{copy.title}</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted lg:text-xs lg:leading-5">{copy.subtitle}</p>
      </header>

      {notice && <InlineAlert tone={notice.tone === 'success' ? 'success' : 'error'}>{notice.text}</InlineAlert>}

      {rechargeModule === 'not-connected' && <InlineAlert tone="neutral">{copy.moduleNotConnected}</InlineAlert>}

      {wallets.length === 0 ? (
        <EmptyState icon="wallet" title={adminCopy[locale].content.empty.creditsTitle} />
      ) : (
        <>
          {/* Mobile : nom, e-mail, solde, état de recharge, deux actions. */}
          <ul className="grid list-none gap-3 lg:hidden">
            {wallets.map((wallet) => (
              <li key={wallet.id} className={`${card} min-w-0 p-3`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p dir="auto" className="truncate text-sm font-semibold text-ink">{displayName(wallet.user)}</p>
                    <p className="ltr-isolate mt-0.5 truncate text-xs text-muted">{wallet.user?.email ?? '—'}</p>
                  </div>
                  <RechargeBadge status={states.get(wallet.user_id)?.status ?? 'none'} copy={copy} module={rechargeModule} />
                </div>
                <p className="mt-2"><BalanceValue balance={wallet.balance} copy={copy} /></p>
                {actions(wallet, true)}
              </li>
            ))}
          </ul>

          {/* Desktop : Utilisateur · Solde · Ajouter crédits · Recharges · Actions. */}
          <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface lg:block">
            <table className="w-full table-fixed border-collapse">
              <thead className="border-b border-line bg-page-alt text-start text-[11px] font-bold tracking-[0.08em] text-muted uppercase rtl:tracking-normal rtl:normal-case">
                <tr>
                  <th className="w-[34%] px-3 py-2 text-start">{copy.user}</th>
                  <th className="w-[16%] px-3 py-2 text-start">{copy.balance}</th>
                  <th className="w-[16%] px-3 py-2 text-start">{copy.addCredits}</th>
                  <th className="w-[20%] px-3 py-2 text-start">{copy.recharges}</th>
                  <th className="w-[14%] px-3 py-2 text-end">{copy.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {wallets.map((wallet) => (
                  <tr key={wallet.id} className="transition-colors hover:bg-surface-2/70 focus-within:bg-surface-2">
                    <td className="px-3 py-2 align-middle">
                      <p dir="auto" className="truncate text-xs font-semibold text-ink">{displayName(wallet.user)}</p>
                      <p className="ltr-isolate mt-0.5 truncate text-[11px] text-muted">{wallet.user?.email ?? '—'}</p>
                    </td>
                    <td className="px-3 py-2 align-middle"><BalanceValue balance={wallet.balance} copy={copy} /></td>
                    <td className="px-3 py-2 align-middle">
                      <AdminActionButton
                        icon={Plus}
                        label={copy.addCredits}
                        title={copy.addCredits}
                        tone="warning"
                        onClick={() => setDialog({ kind: 'recharge', wallet })}
                      />
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <RechargeBadge status={states.get(wallet.user_id)?.status ?? 'none'} copy={copy} module={rechargeModule} />
                    </td>
                    <td className="px-3 py-2 align-middle">
                      <AdminActionButton icon={Eye} label={copy.visit} title={copy.visit} tone="primary" iconOnly onClick={() => openVisit(wallet)} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <PaginationControls {...pagination} labels={adminCopy[locale].pagination} disabled={loading} onPageChange={onPageChange} />

      {dialog?.kind === 'recharge' && (
        <RechargeDecisionModal
          wallet={dialog.wallet}
          request={states.get(dialog.wallet.user_id)?.request ?? null}
          module={rechargeModule}
          displayName={displayName}
          onClose={() => setDialog(null)}
          onDone={finishDecision}
        />
      )}

      {dialog?.kind === 'visit' && <AdminCreditUserModal user={dialog.user} onClose={() => setDialog(null)} />}
    </div>
  )
}

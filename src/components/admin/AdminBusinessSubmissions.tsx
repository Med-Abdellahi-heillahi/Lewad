import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarDays, Check, Eye, Phone, X } from 'lucide-react'
import { useI18n } from '../../i18n'
import { formatDate } from '../../lib/format'
import { btnGhost, btnPrimary, card, field, fieldLabel, iconBtn } from '../../lib/ui'
import type { BusinessSubmissionSummary } from '../../lib/businessSubmissions'
import { EmptyState, LoadingCard } from '../system/States'
import { PaginationControls } from '../ui/PaginationControls'
import { AdminActionButton, AdminModal, AdminStatusBadge } from './AdminUi'
import { adminCopy } from './adminCopy'
import type { PaginatedResult } from '../../lib/pagination'

type AdminBusinessSubmissionsProps = {
  submissions: BusinessSubmissionSummary[]
  pagination: PaginatedResult<BusinessSubmissionSummary>
  loading: boolean
  onApprove: (submission: BusinessSubmissionSummary) => Promise<string | null>
  onReject: (submission: BusinessSubmissionSummary, adminNote: string) => Promise<string | null>
  onPageChange: (page: number) => void
}

type Dialog =
  | { kind: 'details'; submission: BusinessSubmissionSummary }
  | { kind: 'approve'; submission: BusinessSubmissionSummary }
  | { kind: 'reject'; submission: BusinessSubmissionSummary }
  | null

type Notice = { tone: 'success' | 'error'; text: string } | null

function SubmissionNotice({ tone, text, dismissLabel, onDismiss }: { tone: 'success' | 'error'; text: string; dismissLabel: string; onDismiss: () => void }) {
  const IconComp = tone === 'success' ? Check : AlertTriangle
  return (
    <section
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${tone === 'success' ? 'border-answer/30 bg-answer-bg text-answer' : 'border-ask/30 bg-ask-bg text-ask'}`}
    >
      <IconComp size={16} aria-hidden className="shrink-0" />
      <p className="min-w-0 flex-1 text-xs font-medium leading-5">{text}</p>
      <button type="button" className={`${iconBtn} -my-1.5 size-11 shrink-0 rounded-lg`} aria-label={dismissLabel} title={dismissLabel} onClick={onDismiss}>
        <X size={15} aria-hidden />
      </button>
    </section>
  )
}

export function AdminBusinessSubmissions({ submissions, pagination, loading, onApprove, onReject, onPageChange }: AdminBusinessSubmissionsProps) {
  const { locale, t } = useI18n()
  /** La durée vient du serveur ; elle reste absente tant que 20260821000004 n'est pas appliqué. */
  const periodLabel = (months: number) => t.businessSubmission.periodMonthsValue.replace('{months}', String(months))
  const copy = adminCopy[locale]
  const subCopy = copy.businessSubmissions
  const [dialog, setDialog] = useState<Dialog>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  useEffect(() => {
    if (dialog?.kind === 'reject') setNoteDraft('')
  }, [dialog])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const handleApprove = async (submission: BusinessSubmissionSummary) => {
    setSaving(true)
    const error = await onApprove(submission)
    setSaving(false)
    setNotice({ tone: error ? 'error' : 'success', text: error ?? subCopy.submissionApproved })
    if (!error) setDialog(null)
  }

  const handleReject = async (submission: BusinessSubmissionSummary) => {
    if (!noteDraft.trim()) return
    setSaving(true)
    const error = await onReject(submission, noteDraft.trim())
    setSaving(false)
    setNotice({ tone: error ? 'error' : 'success', text: error ?? subCopy.submissionRejected })
    if (!error) setDialog(null)
  }

  const detailSubmission = dialog?.kind === 'details' ? dialog.submission : null
  const approveSubmission = dialog?.kind === 'approve' ? dialog.submission : null
  const rejectSubmission = dialog?.kind === 'reject' ? dialog.submission : null

  return (
    <div className="space-y-4">
      <header className={`${card} flex flex-wrap items-start justify-between gap-3 p-3.5 sm:p-4`}>
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-ink">{subCopy.title}</h2>
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted">{subCopy.subtitle}</p>
        </div>
      </header>

      {notice && <SubmissionNotice tone={notice.tone} text={notice.text} dismissLabel={copy.requests.dismiss} onDismiss={() => setNotice(null)} />}

      {loading ? (
        <LoadingCard label={copy.content.loading.requests} lines={5} />
      ) : submissions.length === 0 ? (
        <EmptyState icon="store" title={subCopy.emptyTitle} text={subCopy.emptyText} />
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="grid list-none gap-2 lg:hidden">
            {submissions.map((sub) => (
              <li key={sub.id} className={`${card} min-w-0 p-3`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 break-words text-sm font-semibold leading-tight text-ink" dir="auto">{sub.businessNameFr}</p>
                  <AdminStatusBadge value={sub.status} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-tight text-muted">
                  <span className="inline-flex items-center gap-1"><CalendarDays size={12} aria-hidden /><time dateTime={sub.createdAt}>{formatDate(sub.createdAt, locale)}</time></span>
                  <span className="inline-flex items-center gap-1"><Phone size={12} aria-hidden />{sub.ownerPhone}</span>
                </div>
                <div className="mt-2.5 border-t border-line pt-2.5 flex flex-wrap items-center gap-1.5">
                  <AdminActionButton icon={Eye} label={subCopy.viewDetails} title={subCopy.viewDetails} tone="primary" iconOnly onClick={() => setDialog({ kind: 'details', submission: sub })} />
                  {sub.status === 'pending_review' && (
                    <>
                      <AdminActionButton icon={Check} label={subCopy.approve} title={subCopy.approve} tone="success" iconOnly disabled={saving} onClick={() => setDialog({ kind: 'approve', submission: sub })} />
                      <AdminActionButton icon={X} label={subCopy.reject} title={subCopy.reject} tone="danger" iconOnly disabled={saving} onClick={() => setDialog({ kind: 'reject', submission: sub })} />
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>

          {/* Desktop: table */}
          <div className="hidden lg:block">
            <div className={`${card} overflow-hidden`}>
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full border-collapse">
                  <thead className="border-b border-line bg-page-alt text-start text-[11px] font-bold tracking-[0.08em] text-muted uppercase rtl:tracking-normal rtl:normal-case">
                    <tr>
                      <th className="px-4 py-3">{subCopy.businessName}</th>
                      <th className="px-4 py-3">{subCopy.ownerName}</th>
                      <th className="px-4 py-3">{subCopy.ownerPhone}</th>
                      <th className="px-4 py-3">{subCopy.status}</th>
                      <th className="px-4 py-3">{subCopy.amount}</th>
                      <th className="px-4 py-3">{subCopy.date}</th>
                      <th className="px-4 py-3">{subCopy.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {submissions.map((sub) => (
                      <tr key={sub.id}>
                        <td className="px-4 py-3.5 align-top text-sm text-ink-soft">
                          <p className="font-semibold text-ink" dir="auto">{sub.businessNameFr}</p>
                          {sub.businessNameAr && <p className="mt-0.5 text-xs text-muted" dir="auto">{sub.businessNameAr}</p>}
                        </td>
                        <td className="px-4 py-3.5 align-top text-sm text-ink-soft">{sub.ownerFirstName} {sub.ownerLastName}</td>
                        <td className="px-4 py-3.5 align-top text-sm text-ink-soft ltr-isolate">{sub.ownerPhone}</td>
                        <td className="px-4 py-3.5 align-top"><AdminStatusBadge value={sub.status} /></td>
                        <td className="px-4 py-3.5 align-top text-sm text-ink-soft tabular">
                          <p>{`${sub.amountMro} MRO`}</p>
                          {sub.periodMonths !== null && <p className="mt-0.5 text-xs text-muted">{periodLabel(sub.periodMonths)}</p>}
                        </td>
                        <td className="px-4 py-3.5 align-top text-sm text-ink-soft"><time dateTime={sub.createdAt}>{formatDate(sub.createdAt, locale)}</time></td>
                        <td className="px-4 py-3.5 align-top">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <AdminActionButton icon={Eye} label={subCopy.viewDetails} title={subCopy.viewDetails} tone="primary" iconOnly onClick={() => setDialog({ kind: 'details', submission: sub })} />
                            {sub.status === 'pending_review' && (
                              <>
                                <AdminActionButton icon={Check} label={subCopy.approve} title={subCopy.approve} tone="success" iconOnly disabled={saving} onClick={() => setDialog({ kind: 'approve', submission: sub })} />
                                <AdminActionButton icon={X} label={subCopy.reject} title={subCopy.reject} tone="danger" iconOnly disabled={saving} onClick={() => setDialog({ kind: 'reject', submission: sub })} />
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {pagination.totalPages > 1 && (
            <PaginationControls
              page={pagination.page}
              totalPages={pagination.totalPages}
              totalCount={pagination.totalCount}
              labels={copy.pagination}
              disabled={loading}
              onPageChange={onPageChange}
            />
          )}
        </>
      )}

      {/* Details modal */}
      {detailSubmission && (
        <AdminModal title={subCopy.detailsTitle} closeLabel={subCopy.close} onClose={() => setDialog(null)} size="lg">
          <div className="mt-4 grid gap-4 text-sm">
            <FieldGroup title={subCopy.ownerSection}>
              <FieldRow label={copy.users.fullName} value={`${detailSubmission.ownerFirstName} ${detailSubmission.ownerLastName}`} />
              <FieldRow label={subCopy.ownerPhone} value={detailSubmission.ownerPhone} mono />
              <FieldRow label={subCopy.businessPhone} value={detailSubmission.businessPhone} mono />
            </FieldGroup>

            <FieldGroup title={subCopy.businessSection}>
              <FieldRow label={subCopy.businessName} value={detailSubmission.businessNameFr} />
              <FieldRow label={copy.users.arabicFullName} value={detailSubmission.businessNameAr} dir="auto" />
            </FieldGroup>

            <FieldGroup title={subCopy.contactSection}>
              {detailSubmission.whatsapp && <FieldRow label={subCopy.whatsapp} value={detailSubmission.whatsapp} mono />}
              {detailSubmission.categoryName && <FieldRow label={subCopy.category} value={detailSubmission.categoryName} />}
            </FieldGroup>

            <FieldGroup title={subCopy.adminSection}>
              <FieldRow label={subCopy.status} value={<AdminStatusBadge value={detailSubmission.status} />} />
              <FieldRow label={subCopy.amount} value={`${detailSubmission.amountMro} MRO`} />
              {detailSubmission.periodMonths !== null && (
                <FieldRow label={subCopy.period} value={periodLabel(detailSubmission.periodMonths)} />
              )}
            </FieldGroup>
          </div>

          {detailSubmission.status === 'pending_review' && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
              <AdminActionButton icon={Check} label={subCopy.approve} tone="success" disabled={saving} onClick={() => setDialog({ kind: 'approve', submission: detailSubmission })} className="flex-1 justify-center" />
              <AdminActionButton icon={X} label={subCopy.reject} tone="danger" disabled={saving} onClick={() => setDialog({ kind: 'reject', submission: detailSubmission })} className="flex-1 justify-center" />
            </div>
          )}
        </AdminModal>
      )}

      {/* Approve confirmation */}
      {approveSubmission && (
        <AdminModal title={subCopy.approveConfirmTitle} closeLabel={subCopy.close} onClose={() => setDialog(null)}>
          <p className="mt-4 text-sm leading-relaxed text-muted">{subCopy.approveConfirmText}</p>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <button type="button" className={`${btnGhost} flex-1`} disabled={saving} onClick={() => setDialog(null)}>{subCopy.cancel}</button>
            <button type="button" className={`${btnPrimary} flex-1`} disabled={saving} onClick={() => void handleApprove(approveSubmission)}>{saving ? subCopy.approving : subCopy.confirm}</button>
          </div>
        </AdminModal>
      )}

      {/* Reject confirmation */}
      {rejectSubmission && (
        <AdminModal title={subCopy.rejectConfirmTitle} closeLabel={subCopy.close} onClose={() => setDialog(null)}>
          <p className="mt-4 text-sm leading-relaxed text-muted">{subCopy.rejectConfirmText}</p>
          <div className="mt-4">
            <label htmlFor="reject-note" className={fieldLabel}>{subCopy.adminNote}</label>
            <textarea
              id="reject-note"
              rows={3}
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              placeholder={subCopy.adminNotePlaceholder}
              className={`${field} min-h-[4.5rem] resize-y`}
            />
            {!noteDraft.trim() && <p className="mt-1 text-xs text-ask" role="alert">{subCopy.rejectionReasonRequired}</p>}
          </div>
          <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4">
            <button type="button" className={`${btnGhost} flex-1`} disabled={saving} onClick={() => setDialog(null)}>{subCopy.cancel}</button>
            <button type="button" className={`${btnPrimary} flex-1`} disabled={saving || !noteDraft.trim()} onClick={() => void handleReject(rejectSubmission)}>{saving ? subCopy.rejecting : subCopy.confirm}</button>
          </div>
        </AdminModal>
      )}
    </div>
  )
}

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-page-alt p-3 sm:p-4">
      <h3 className="text-xs font-bold text-muted uppercase rtl:normal-case">{title}</h3>
      <dl className="mt-2 grid gap-2">{children}</dl>
    </div>
  )
}

function FieldRow({ label, value, mono = false, dir }: { label: string; value: React.ReactNode; mono?: boolean; dir?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] items-start gap-2">
      <dt className="text-xs text-muted">{label}</dt>
      <dd className={`min-w-0 break-words text-sm text-ink-soft ${mono ? 'ltr-isolate font-mono' : ''}`} dir={dir}>{value || '—'}</dd>
    </div>
  )
}

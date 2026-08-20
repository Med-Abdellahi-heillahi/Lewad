import { useEffect, useState } from 'react'
import { AlertTriangle, CalendarDays, Check, CheckCircle, ClipboardCheck, Copy, Eye, Mail, Plus, StickyNote, X, XCircle } from 'lucide-react'
import { useI18n } from '../../i18n'
import type { AdminCreateEstablishmentParams, AdminCreateEstablishmentResponse, AdminMissingRequest, AdminUser } from '../../lib/admin'
import type { MissingServiceRequestStatus } from '../../lib/db3b'
import { formatDate } from '../../lib/format'
import type { PaginatedResult } from '../../lib/pagination'
import { btnGhost, card, field, fieldLabel, iconBtn } from '../../lib/ui'
import { EmptyState, LoadingCard } from '../system/States'
import { PaginationControls } from '../ui/PaginationControls'
import { AdminAddEstablishmentForm } from './AdminAddEstablishmentForm'
import { AdminActionButton, AdminModal, AdminStatusBadge, type AdminIcon } from './AdminUi'
import { adminCopy } from './adminCopy'

type AdminRequestsProps = {
  requests: AdminMissingRequest[]
  pagination: PaginatedResult<AdminMissingRequest>
  loading: boolean
  onSave: (request: AdminMissingRequest, status: MissingServiceRequestStatus, adminNote: string) => Promise<string | null>
  onCreateEstablishment: (params: AdminCreateEstablishmentParams) => Promise<AdminCreateEstablishmentResponse | null>
  onPageChange: (page: number) => void
  displayName: (user: AdminUser | null) => string
}

type RequestDialog =
  | { kind: 'details'; request: AdminMissingRequest }
  | { kind: 'note'; request: AdminMissingRequest }
  | { kind: 'add'; request?: AdminMissingRequest }
  | null

type Notice = { tone: 'success' | 'error'; text: string } | null

type StatusAction = {
  status: MissingServiceRequestStatus
  icon: AdminIcon
  label: string
  tone: 'success' | 'warning' | 'danger'
}

/** Les deux décisions les plus fréquentes restent dans la ligne ; les autres vivent dans le détail. */
const rowStatuses: MissingServiceRequestStatus[] = ['added', 'rejected']

function useStatusActions(): StatusAction[] {
  const { locale } = useI18n()
  const copy = adminCopy[locale].requests
  return [
    { status: 'added', icon: CheckCircle, label: copy.markAdded, tone: 'success' },
    { status: 'reviewed', icon: ClipboardCheck, label: copy.markReviewed, tone: 'success' },
    { status: 'duplicate', icon: Copy, label: copy.markDuplicate, tone: 'warning' },
    { status: 'rejected', icon: XCircle, label: copy.markRejected, tone: 'danger' },
  ]
}

function RequestNotice({ tone, text, dismissLabel, onDismiss }: { tone: 'success' | 'error'; text: string; dismissLabel: string; onDismiss: () => void }) {
  const NoticeIcon = tone === 'success' ? Check : AlertTriangle
  return (
    <section
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 ${tone === 'success' ? 'border-answer/30 bg-answer-bg text-answer' : 'border-ask/30 bg-ask-bg text-ask'}`}
    >
      <NoticeIcon size={16} aria-hidden className="shrink-0" />
      <p className="min-w-0 flex-1 text-xs font-medium leading-5">{text}</p>
      <button type="button" className={`${iconBtn} -my-1.5 size-11 shrink-0 rounded-lg`} aria-label={dismissLabel} title={dismissLabel} onClick={onDismiss}>
        <X size={15} aria-hidden />
      </button>
    </section>
  )
}

export function AdminRequests({ requests, pagination, loading, onSave, onCreateEstablishment, onPageChange, displayName }: AdminRequestsProps) {
  const { locale } = useI18n()
  const copy = adminCopy[locale]
  const requestCopy = copy.requests
  const statusActions = useStatusActions()
  const [dialog, setDialog] = useState<RequestDialog>(null)
  const [noteDraft, setNoteDraft] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)
  const [notice, setNotice] = useState<Notice>(null)

  useEffect(() => {
    if (dialog?.kind === 'note') setNoteDraft(dialog.request.admin_note ?? '')
  }, [dialog])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const apply = async (request: AdminMissingRequest, status: MissingServiceRequestStatus, adminNote: string) => {
    setSavingId(request.id)
    const error = await onSave(request, status, adminNote)
    setSavingId(null)
    setNotice({ tone: error ? 'error' : 'success', text: error ? requestCopy.requestUpdateFailed : requestCopy.requestUpdated })
    return error
  }

  const changeStatus = (request: AdminMissingRequest, status: MissingServiceRequestStatus) => {
    void apply(request, status, request.admin_note ?? '')
  }

  const saveNote = async (request: AdminMissingRequest) => {
    const error = await apply(request, request.status, noteDraft)
    if (!error) setDialog(null)
  }

  /** Une action d'état déjà appliquée reste visible mais inerte : l'admin voit où en est la demande. */
  const statusButtons = (request: AdminMissingRequest, actions: StatusAction[], iconOnly: boolean) =>
    actions.map(({ status, icon, label, tone }) => (
      <AdminActionButton
        key={status}
        icon={icon}
        label={label}
        title={request.status === status ? requestCopy.alreadyInStatus : label}
        tone={tone}
        iconOnly={iconOnly}
        disabled={savingId === request.id || request.status === status}
        onClick={() => changeStatus(request, status)}
        className={iconOnly ? '' : 'justify-center'}
      />
    ))

  const rowActions = (request: AdminMissingRequest) => (
    <div className="flex flex-wrap items-center gap-1.5">
      <AdminActionButton icon={Eye} label={requestCopy.viewDetails} title={requestCopy.viewDetails} tone="primary" iconOnly onClick={() => setDialog({ kind: 'details', request })} />
      {statusButtons(request, statusActions.filter((action) => rowStatuses.includes(action.status)), true)}
      <AdminActionButton icon={StickyNote} label={requestCopy.editNote} title={requestCopy.editNote} iconOnly disabled={savingId === request.id} onClick={() => setDialog({ kind: 'note', request })} />
      <AdminActionButton icon={Plus} label={requestCopy.addThisService} title={requestCopy.addThisService} tone="success" iconOnly disabled={savingId === request.id} onClick={() => setDialog({ kind: 'add', request })} />
    </div>
  )

  const notePreview = (request: AdminMissingRequest) => (request.admin_note?.trim()
    ? <span className="line-clamp-2 break-words" dir="auto">{request.admin_note}</span>
    : <span className="text-muted">{requestCopy.noNote}</span>)
  const addRequest = dialog?.kind === 'add' ? dialog.request : undefined

  return (
    <div className="space-y-4">
      <header className={`${card} flex flex-wrap items-start justify-between gap-3 p-3.5 sm:p-4`}>
        <div className="min-w-0">
          <h2 className="text-base font-bold tracking-tight text-ink">{requestCopy.title}</h2>
          <p className="mt-1 max-w-xl text-xs leading-5 text-muted">{requestCopy.subtitle}</p>
        </div>
        <AdminActionButton
          icon={Plus}
          label={requestCopy.addEstablishment}
          title={requestCopy.addEstablishment}
          tone="primary"
          className="w-full justify-center sm:w-auto"
          onClick={() => setDialog({ kind: 'add' })}
        />
      </header>

      {notice && <RequestNotice tone={notice.tone} text={notice.text} dismissLabel={requestCopy.dismiss} onDismiss={() => setNotice(null)} />}

      {loading ? <LoadingCard label={copy.content.loading.requests} lines={5} /> : requests.length === 0 ? (
        <EmptyState icon="message" title={copy.content.empty.requestsTitle} text={copy.content.empty.requestsText} />
      ) : (
        <>
          <ul className="grid list-none gap-2 lg:hidden">
            {requests.map((request) => (
              <li key={request.id} className={`${card} min-w-0 p-3`}>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 break-words text-sm font-semibold leading-tight text-ink" dir="auto">{request.query}</p>
                  <AdminStatusBadge value={request.status} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] leading-tight text-muted">
                  <span className="inline-flex items-center gap-1"><CalendarDays size={12} aria-hidden /><time dateTime={request.created_at}>{formatDate(request.created_at, locale)}</time></span>
                  <span className="ltr-isolate inline-flex min-w-0 items-center gap-1 break-all"><Mail size={12} aria-hidden />{request.user?.email ?? displayName(request.user)}</span>
                </div>
                <p className="mt-2 border-t border-line pt-2 text-[11px] leading-5 text-ink-soft">
                  <span className="me-1.5 font-semibold text-muted">{requestCopy.notePreview}:</span>
                  {notePreview(request)}
                </p>
                <div className="mt-2.5 border-t border-line pt-2.5">{rowActions(request)}</div>
              </li>
            ))}
          </ul>

          <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface lg:block">
            <table className="w-full table-fixed border-collapse">
              <thead className="border-b border-line bg-page-alt text-[11px] font-bold tracking-[0.08em] text-muted uppercase rtl:tracking-normal rtl:normal-case">
                <tr>
                  <th className="w-[25%] px-3 py-2 text-start">{copy.content.table.request}</th>
                  <th className="w-[19%] px-3 py-2 text-start">{copy.content.table.user}</th>
                  <th className="w-[12%] px-3 py-2 text-start">{copy.content.table.status}</th>
                  <th className="w-[12%] px-3 py-2 text-start">{copy.content.table.date}</th>
                  <th className="w-[12%] px-3 py-2 text-start">{copy.content.table.teamNote}</th>
                  <th className="w-[20%] px-3 py-2 text-start">{copy.content.table.action}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {requests.map((request) => (
                  <tr key={request.id} className="transition-colors hover:bg-surface-2/70 focus-within:bg-surface-2">
                    <td className="px-3 py-2 align-top">
                      <p className="break-words text-xs font-semibold leading-tight text-ink" dir="auto">{request.query}</p>
                      <p className="mt-0.5 break-words text-[11px] leading-tight text-muted" dir="auto">{request.normalized_query}</p>
                    </td>
                    <td className="px-3 py-2 align-top">
                      <p className="text-xs leading-tight text-ink-soft" dir="auto">{displayName(request.user)}</p>
                      <p className="ltr-isolate mt-0.5 break-all text-[11px] leading-tight text-muted">{request.user?.email ?? '—'}</p>
                    </td>
                    <td className="px-3 py-2 align-top"><AdminStatusBadge value={request.status} /></td>
                    <td className="px-3 py-2 align-top text-[11px] leading-tight text-ink-soft">
                      <time dateTime={request.created_at}>{formatDate(request.created_at, locale)}</time>
                    </td>
                    <td className="px-3 py-2 align-top text-[11px] leading-5 text-ink-soft">{notePreview(request)}</td>
                    <td className="px-3 py-2 align-top">{rowActions(request)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {pagination.totalCount > 0 && <PaginationControls {...pagination} labels={copy.pagination} disabled={loading} onPageChange={onPageChange} />}

      {dialog?.kind === 'details' && (
        <AdminModal title={requestCopy.detailsTitle} closeLabel={requestCopy.close} onClose={() => setDialog(null)}>
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AdminStatusBadge value={dialog.request.status} />
              <time className="text-xs text-muted" dateTime={dialog.request.created_at}>{formatDate(dialog.request.created_at, locale)}</time>
            </div>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="sm:col-span-2"><dt className={fieldLabel}>{requestCopy.requestQuery}</dt><dd dir="auto" className="break-words text-ink-soft">{dialog.request.query}</dd></div>
              <div><dt className={fieldLabel}>{requestCopy.normalizedQuery}</dt><dd dir="auto" className="break-words text-ink-soft">{dialog.request.normalized_query}</dd></div>
              <div><dt className={fieldLabel}>{copy.content.table.user}</dt><dd dir="auto" className="break-words text-ink-soft">{displayName(dialog.request.user)}<span className="ltr-isolate mt-1 block break-all text-xs text-muted">{dialog.request.user?.email ?? '—'}</span></dd></div>
              <div className="sm:col-span-2"><dt className={fieldLabel}>{requestCopy.userMessage}</dt><dd dir="auto" className="break-words text-ink-soft">{dialog.request.message?.trim() || '—'}</dd></div>
              <div className="sm:col-span-2"><dt className={fieldLabel}>{copy.content.table.linkedLog}</dt><dd className="text-ink-soft">{dialog.request.search_log ? <span dir="auto">{dialog.request.search_log.query}<span className="ms-2 inline-block align-middle"><AdminStatusBadge value={dialog.request.search_log.status} /></span></span> : '—'}</dd></div>
              <div className="sm:col-span-2"><dt className={fieldLabel}>{requestCopy.noteTitle}</dt><dd className="text-sm text-ink-soft">{notePreview(dialog.request)}</dd></div>
            </dl>
            <div className="border-t border-line pt-4">
              <p className={`${fieldLabel} text-xs`}>{requestCopy.reviewActions}</p>
              <div className="grid gap-2 sm:grid-cols-2">{statusButtons(dialog.request, statusActions, false)}</div>
            </div>
            <div className="flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <button type="button" className={btnGhost} onClick={() => setDialog(null)}>{requestCopy.close}</button>
              <AdminActionButton icon={Plus} label={requestCopy.addThisService} tone="success" className="justify-center" onClick={() => setDialog({ kind: 'add', request: dialog.request })} />
              <AdminActionButton icon={StickyNote} label={requestCopy.editNote} tone="neutral" className="justify-center" onClick={() => setDialog({ kind: 'note', request: dialog.request })} />
            </div>
          </div>
        </AdminModal>
      )}

      {dialog?.kind === 'note' && (
        <AdminModal title={requestCopy.noteTitle} subtitle={requestCopy.noteSubtitle} closeLabel={requestCopy.close} onClose={() => setDialog(null)}>
          <div className="mt-4">
            <p className="text-xs leading-5 text-muted" dir="auto"><span className="font-semibold text-ink-soft">{requestCopy.requestQuery}:</span> {dialog.request.query}</p>
            <label className={`${fieldLabel} mt-4 text-xs`} htmlFor="admin-request-note">{requestCopy.noteTitle}</label>
            <textarea
              id="admin-request-note"
              value={noteDraft}
              dir="auto"
              placeholder={copy.mobile.notePlaceholder}
              onChange={(event) => setNoteDraft(event.target.value)}
              className={`${field} h-28 py-2.5 text-sm`}
            />
            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-line pt-4 sm:flex-row sm:justify-end">
              <button type="button" className={btnGhost} disabled={savingId === dialog.request.id} onClick={() => setDialog(null)}>{copy.users.cancel}</button>
              <AdminActionButton
                icon={Check}
                label={savingId === dialog.request.id ? copy.mobile.saving : copy.mobile.save}
                tone="primary"
                className="justify-center"
                disabled={savingId === dialog.request.id}
                onClick={() => void saveNote(dialog.request)}
              />
            </div>
          </div>
        </AdminModal>
      )}

      {dialog?.kind === 'add' && (
        <AdminAddEstablishmentForm
          onClose={() => setDialog(null)}
          initialNameFr={addRequest?.query}
          sourceRequestId={addRequest?.id}
          onCreate={onCreateEstablishment}
          onCreated={() => setNotice({ tone: 'success', text: addRequest ? requestCopy.requestMarkedAdded : requestCopy.serviceAddedSuccess })}
        />
      )}
    </div>
  )
}

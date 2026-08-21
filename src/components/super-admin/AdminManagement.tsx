import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Ban, Building2, Check, CheckCircle, ClipboardList, Eye, Mail, Pencil, Phone, Plus, Search, UserRoundCog } from 'lucide-react'
import { useI18n } from '../../i18n'
import { formatDate, formatNumber, initialOf } from '../../lib/format'
import { DEFAULT_PAGE_SIZE, paginatedResult, type PaginatedResult } from '../../lib/pagination'
import {
  createSuperAdminInvitation,
  getSuperAdminAdminDetails,
  getSuperAdminAdmins,
  getSuperAdminAdminStats,
  getSuperAdminAuditEvents,
  updateSuperAdminAdminProfile,
  updateSuperAdminAdminStatus,
  type SuperAdminAdmin,
  type SuperAdminAdminDetails,
  type SuperAdminAdminStats,
  type SuperAdminAuditEvent,
  type SuperAdminFailure,
} from '../../lib/superAdmin'
import { isValidMauritanianPhone } from '../../lib/validation'
import { btnGhost, card, cardMuted, field, fieldLabel } from '../../lib/ui'
import { adminCopy } from '../admin/adminCopy'
import { AdminActionButton, AdminMetricCard, AdminModal, AdminSectionHeader } from '../admin/AdminUi'
import { AdminUserRoleBadge, AdminUserStatusBadge } from '../admin/AdminUserUi'
import { InlineAlert, LoadingCard } from '../system/States'
import { PaginationControls } from '../ui/PaginationControls'

type Dialog =
  | { kind: 'details'; admin: SuperAdminAdmin }
  | { kind: 'edit'; admin: SuperAdminAdmin }
  | { kind: 'status'; admin: SuperAdminAdmin; nextStatus: 'active' | 'suspended' }
  | { kind: 'invite' }
  | null

type Notice = { tone: 'success' | 'error'; text: string } | null

function emptyAdminsPage(): PaginatedResult<SuperAdminAdmin> {
  return paginatedResult([], 0, { pageSize: DEFAULT_PAGE_SIZE })
}

function AdminManagementLoadError({ failure, onRetry }: { failure: SuperAdminFailure; onRetry: () => void }) {
  const { t } = useI18n()
  const copy = t.superAdminManagement
  const title = failure === 'not-connected'
    ? copy.moduleNotConnected
    : failure === 'access-denied'
      ? copy.accessDenied
      : copy.serverError
  const text = failure === 'not-connected'
    ? copy.migrationHint
    : failure === 'access-denied'
      ? copy.accessDenied
      : `${copy.loadError} ${copy.loadErrorHint}`

  return <InlineAlert tone="error" title={title} className="mb-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><span>{text}</span><button type="button" className={btnGhost} onClick={onRetry}>{copy.retry}</button></div>
  </InlineAlert>
}

function displayName(admin: SuperAdminAdmin, locale: 'fr' | 'ar' | 'en') {
  if (locale === 'ar' && admin.full_name_ar?.trim()) return admin.full_name_ar.trim()
  return admin.full_name?.trim() || admin.full_name_ar?.trim() || admin.email || '—'
}

function Avatar({ admin, locale, size = 'md' }: { admin: SuperAdminAdmin; locale: 'fr' | 'ar' | 'en'; size?: 'md' | 'lg' }) {
  const name = displayName(admin, locale)
  const className = size === 'lg' ? 'size-14 text-lg' : 'size-9 text-sm'

  if (admin.avatar_url) {
    return <img src={admin.avatar_url} alt="" className={`${className} shrink-0 rounded-full border border-line object-cover`} />
  }

  return <span aria-hidden className={`${className} grid shrink-0 place-items-center rounded-full bg-brand-soft font-bold text-brand-deep`}>{initialOf(name)}</span>
}

function AdminIdentity({ admin, locale, compact = false }: { admin: SuperAdminAdmin; locale: 'fr' | 'ar' | 'en'; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar admin={admin} locale={locale} />
      <div className="min-w-0">
        <p dir="auto" className={`${compact ? 'text-xs' : 'text-sm'} truncate font-semibold text-ink`}>{displayName(admin, locale)}</p>
        {!compact && <p className="ltr-isolate mt-0.5 truncate text-xs text-muted">{admin.email ?? '—'}</p>}
      </div>
    </div>
  )
}

function AdminActions({ admin, mobile = false, onVisit, onEdit, onStatus }: {
  admin: SuperAdminAdmin
  mobile?: boolean
  onVisit: () => void
  onEdit: () => void
  onStatus: () => void
}) {
  const { t } = useI18n()
  const copy = t.superAdminManagement
  const active = admin.status === 'active'

  return (
    <div className={mobile ? 'mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3' : 'flex items-center justify-end gap-1.5'}>
      <AdminActionButton icon={Eye} label={copy.visit} title={copy.visit} tone="primary" iconOnly={!mobile} onClick={onVisit} className={mobile ? 'justify-center' : ''} />
      <AdminActionButton icon={Pencil} label={copy.edit} title={copy.edit} tone="warning" iconOnly={!mobile} onClick={onEdit} className={mobile ? 'justify-center' : ''} />
      <AdminActionButton icon={active ? Ban : CheckCircle} label={active ? copy.suspend : copy.reactivate} title={active ? copy.suspend : copy.reactivate} tone={active ? 'danger' : 'success'} iconOnly={!mobile} onClick={onStatus} className={mobile ? 'justify-center' : ''} />
    </div>
  )
}

function AdminDetailsModal({ admin, details, loading, onClose }: {
  admin: SuperAdminAdmin
  details: SuperAdminAdminDetails | null
  loading: boolean
  onClose: () => void
}) {
  const { locale, t } = useI18n()
  const copy = t.superAdminManagement
  const view = details ?? admin

  return (
    <AdminModal title={copy.adminDetails} closeLabel={copy.close} onClose={onClose} size="lg">
      {loading ? <LoadingCard label={copy.loading} lines={5} /> : <div className="mt-5 space-y-5">
        <div className={`${cardMuted} flex items-center gap-4 p-4`}>
          <Avatar admin={view} locale={locale} size="lg" />
          <div className="min-w-0">
            <p dir="auto" className="text-base font-bold text-ink">{displayName(view, locale)}</p>
            <p className="ltr-isolate mt-1 flex items-center gap-1.5 break-all text-xs text-muted"><Mail size={13} aria-hidden />{view.email ?? '—'}</p>
          </div>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div><dt className={fieldLabel}>{copy.fullName}</dt><dd dir="auto" className="break-words text-ink-soft">{view.full_name ?? '—'}</dd></div>
          <div><dt className={fieldLabel}>{copy.arabicFullName}</dt><dd dir="rtl" className="break-words text-ink-soft">{view.full_name_ar ?? '—'}</dd></div>
          <div><dt className={fieldLabel}>{copy.email}</dt><dd className="ltr-isolate break-all text-ink-soft">{view.email ?? '—'}</dd></div>
          <div><dt className={fieldLabel}>{copy.phone}</dt><dd className="ltr-isolate inline-flex items-center gap-1.5 text-ink-soft"><Phone size={14} aria-hidden />{view.phone ?? '—'}</dd></div>
          <div><dt className={fieldLabel}>{copy.role}</dt><dd><AdminUserRoleBadge role={view.role} /></dd></div>
          <div><dt className={fieldLabel}>{copy.status}</dt><dd><AdminUserStatusBadge status={view.status} /></dd></div>
          <div><dt className={fieldLabel}>{copy.createdAt}</dt><dd className="text-ink-soft"><time dateTime={view.created_at}>{formatDate(view.created_at, locale)}</time></dd></div>
          <div><dt className={fieldLabel}>{copy.establishmentsAdded}</dt><dd className="inline-flex items-center gap-1.5 tabular text-ink-soft"><Building2 size={14} aria-hidden />{formatNumber(view.establishmentsAdded, locale)}</dd></div>
        </dl>

        <section className="border-t border-line pt-4">
          <h3 className="text-sm font-bold text-ink">{copy.recentActions}</h3>
          {details?.recentActions.length ? <ul className="mt-3 list-none space-y-2">
            {details.recentActions.map((event) => <li key={event.id} className={`${cardMuted} flex flex-wrap items-center justify-between gap-2 p-3 text-xs`}><span className="font-semibold text-ink-soft">{event.action}</span><time className="tabular text-muted" dateTime={event.createdAt}>{formatDate(event.createdAt, locale)}</time></li>)}
          </ul> : <p className="mt-3 text-sm text-muted">{copy.noRecentActions}</p>}
        </section>
      </div>}
    </AdminModal>
  )
}

function EditAdminModal({ admin, saving, onClose, onSave }: {
  admin: SuperAdminAdmin
  saving: boolean
  onClose: () => void
  onSave: (values: { fullName: string; fullNameAr: string; phone: string }) => void
}) {
  const { t } = useI18n()
  const copy = t.superAdminManagement
  const [fullName, setFullName] = useState(admin.full_name ?? '')
  const [fullNameAr, setFullNameAr] = useState(admin.full_name_ar ?? '')
  const [phone, setPhone] = useState(admin.phone ?? '')
  const [invalidPhone, setInvalidPhone] = useState(false)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (phone.trim() && !isValidMauritanianPhone(phone)) {
      setInvalidPhone(true)
      return
    }
    onSave({ fullName, fullNameAr, phone })
  }

  return <AdminModal title={copy.editAdmin} subtitle={copy.editHelp} closeLabel={copy.close} onClose={onClose}>
    <form className="mt-5 space-y-4" onSubmit={submit}>
      <div><label className={fieldLabel} htmlFor="admin-edit-name">{copy.fullName}</label><input id="admin-edit-name" className={field} value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={120} required /></div>
      <div><label className={fieldLabel} htmlFor="admin-edit-name-ar">{copy.arabicFullName}</label><input id="admin-edit-name-ar" className={field} value={fullNameAr} onChange={(event) => setFullNameAr(event.target.value)} maxLength={120} /></div>
      <div><label className={fieldLabel} htmlFor="admin-edit-phone">{copy.phone}</label><input id="admin-edit-phone" className={field} value={phone} onChange={(event) => { setPhone(event.target.value); setInvalidPhone(false) }} inputMode="tel" maxLength={16} aria-invalid={invalidPhone || undefined} /></div>
      {invalidPhone && <p className="text-xs text-ask">{copy.updateError}</p>}
      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end"><button type="button" className={btnGhost} disabled={saving} onClick={onClose}>{copy.cancel}</button><button type="submit" className={btnGhost} disabled={saving}>{saving ? copy.saving : copy.save}</button></div>
    </form>
  </AdminModal>
}

function StatusModal({ admin, nextStatus, saving, onClose, onConfirm }: {
  admin: SuperAdminAdmin
  nextStatus: 'active' | 'suspended'
  saving: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const { locale, t } = useI18n()
  const copy = t.superAdminManagement
  const suspending = nextStatus === 'suspended'

  return <AdminModal title={copy.statusConfirmTitle} closeLabel={copy.close} onClose={onClose}>
    <div className="mt-5">
      <p className="text-sm leading-6 text-muted">{suspending ? copy.suspendConfirm : copy.reactivateConfirm}</p>
      <div className={`${cardMuted} mt-4 flex items-center justify-between gap-3 p-4`}><AdminIdentity admin={admin} locale={locale} /><AdminUserStatusBadge status={nextStatus} /></div>
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className={btnGhost} disabled={saving} onClick={onClose}>{copy.cancel}</button><AdminActionButton icon={Check} label={saving ? copy.saving : copy.confirm} disabled={saving} onClick={onConfirm} tone={suspending ? 'danger' : 'success'} /></div>
    </div>
  </AdminModal>
}

function InvitationModal({ saving, onClose, onCreate }: {
  saving: boolean
  onClose: () => void
  onCreate: (values: { fullName: string; fullNameAr: string; email: string; phone: string }) => void
}) {
  const { t } = useI18n()
  const copy = t.superAdminManagement
  const [fullName, setFullName] = useState('')
  const [fullNameAr, setFullNameAr] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [invalidPhone, setInvalidPhone] = useState(false)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isValidMauritanianPhone(phone)) {
      setInvalidPhone(true)
      return
    }
    onCreate({ fullName, fullNameAr, email, phone })
  }

  return <AdminModal title={copy.invitationTitle} subtitle={copy.invitationHelp} closeLabel={copy.close} onClose={onClose}>
    <form className="mt-5 space-y-4" onSubmit={submit}>
      <div><label className={fieldLabel} htmlFor="admin-invite-name">{copy.fullName} <span className="text-ask">*</span></label><input id="admin-invite-name" className={field} value={fullName} onChange={(event) => setFullName(event.target.value)} maxLength={120} required /></div>
      <div><label className={fieldLabel} htmlFor="admin-invite-name-ar">{copy.arabicFullName}</label><input id="admin-invite-name-ar" className={field} value={fullNameAr} onChange={(event) => setFullNameAr(event.target.value)} maxLength={120} /></div>
      <div><label className={fieldLabel} htmlFor="admin-invite-email">{copy.email} <span className="text-ask">*</span></label><input id="admin-invite-email" className={field} type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /></div>
      <div><label className={fieldLabel} htmlFor="admin-invite-phone">{copy.phone} <span className="text-ask">*</span></label><input id="admin-invite-phone" className={field} value={phone} onChange={(event) => { setPhone(event.target.value); setInvalidPhone(false) }} inputMode="tel" maxLength={16} aria-invalid={invalidPhone || undefined} required /></div>
      {invalidPhone && <p className="text-xs text-ask">{copy.invitationError}</p>}
      <div className="flex flex-col-reverse gap-3 border-t border-line pt-5 sm:flex-row sm:justify-end"><button type="button" className={btnGhost} disabled={saving} onClick={onClose}>{copy.cancel}</button><AdminActionButton type="submit" icon={Plus} label={saving ? copy.saving : copy.createInvitation} disabled={saving} tone="success" /></div>
    </form>
  </AdminModal>
}

/** Dedicated screen: data flow stays RPC-only and never falls back to profile table reads. */
export function AdminManagement() {
  const { locale, t } = useI18n()
  const copy = t.superAdminManagement
  const [admins, setAdmins] = useState<PaginatedResult<SuperAdminAdmin>>(() => emptyAdminsPage())
  const [stats, setStats] = useState<SuperAdminAdminStats | null>(null)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [error, setError] = useState<SuperAdminFailure | null>(null)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [detail, setDetail] = useState<SuperAdminAdminDetails | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const loadRequestId = useRef(0)
  const detailRequestId = useRef(0)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const loadData = useCallback(async () => {
    const requestId = ++loadRequestId.current
    setLoading(true)
    setStatsLoading(true)
    setError(null)
    const [adminsResult, statsResult] = await Promise.all([
      getSuperAdminAdmins({ search: debouncedSearch, page, pageSize: DEFAULT_PAGE_SIZE }),
      getSuperAdminAdminStats(),
    ])
    if (requestId !== loadRequestId.current) return
    setAdmins(adminsResult.data)
    setStats(statsResult.data)
    setError(adminsResult.error ?? statsResult.error)
    setLoading(false)
    setStatsLoading(false)
  }, [debouncedSearch, page])

  useEffect(() => { void loadData() }, [loadData])

  const openDetails = async (admin: SuperAdminAdmin) => {
    const requestId = ++detailRequestId.current
    setDialog({ kind: 'details', admin })
    setDetail(null)
    setDetailLoading(true)
    const result = await getSuperAdminAdminDetails(admin.id)
    if (requestId !== detailRequestId.current) return
    setDetail(result.data)
    setError((current) => current ?? result.error)
    setDetailLoading(false)
  }

  const saveProfile = async (admin: SuperAdminAdmin, values: { fullName: string; fullNameAr: string; phone: string }) => {
    setSaving(true)
    const result = await updateSuperAdminAdminProfile({ adminId: admin.id, ...values })
    setSaving(false)
    if (result.error || !result.data) {
      setNotice({ tone: 'error', text: copy.updateError })
      return
    }
    setDialog(null)
    setNotice({ tone: 'success', text: copy.updateSuccess })
    void loadData()
  }

  const saveStatus = async (admin: SuperAdminAdmin, status: 'active' | 'suspended') => {
    setSaving(true)
    const result = await updateSuperAdminAdminStatus(admin.id, status)
    setSaving(false)
    if (result.error || !result.data) {
      setNotice({ tone: 'error', text: copy.statusError })
      return
    }
    setDialog(null)
    setNotice({ tone: 'success', text: copy.statusSuccess })
    void loadData()
  }

  const createInvitation = async (values: { fullName: string; fullNameAr: string; email: string; phone: string }) => {
    setSaving(true)
    const result = await createSuperAdminInvitation(values)
    setSaving(false)
    if (result.error || !result.data) {
      setNotice({ tone: 'error', text: copy.invitationError })
      return
    }
    setDialog(null)
    setNotice({ tone: 'success', text: copy.invitationCreated })
  }

  const statCards = [
    { icon: UserRoundCog, label: copy.totalAdmins, value: stats?.totalAdmins },
    { icon: CheckCircle, label: copy.activeAdmins, value: stats?.activeAdmins },
    { icon: Ban, label: copy.suspendedAdmins, value: stats?.suspendedAdmins, tone: 'attention' as const },
    { icon: Building2, label: copy.establishmentsAdded, value: stats?.establishmentsAdded },
    { icon: ClipboardList, label: copy.actionsThisWeek, value: stats?.adminActionsThisWeek },
  ]
  const metricValue = (value: number | undefined) => {
    if (statsLoading) return copy.loading
    if (error === 'not-connected') return copy.moduleNotConnected
    return value ?? '—'
  }

  return <div className="space-y-5">
    <header className={`${card} border-brand/45 p-5 sm:p-6`}>
      <AdminSectionHeader icon={UserRoundCog} title={copy.title} text={copy.subtitle} actions={<AdminActionButton icon={Plus} label={copy.addAdmin} tone="success" onClick={() => setDialog({ kind: 'invite' })} />} />
    </header>

    {notice && <InlineAlert tone={notice.tone} title={notice.tone === 'success' ? copy.title : t.system.errorLabel} className="mb-5">{notice.text}</InlineAlert>}
    {error && <AdminManagementLoadError failure={error} onRetry={() => void loadData()} />}

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {statCards.map(({ icon, label, value, tone }) => <AdminMetricCard key={label} icon={icon} label={label} value={metricValue(value)} tone={tone} />)}
      <AdminMetricCard icon={ClipboardList} label={copy.pendingIssues} value={copy.comingSoon} />
    </section>

    <section className={`${card} p-3 sm:p-4`}>
      <div className="relative">
        <label className="sr-only" htmlFor="super-admin-search">{copy.searchLabel}</label>
        <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" size={17} aria-hidden />
        <input id="super-admin-search" className={`${field} ps-10`} value={search} placeholder={copy.searchPlaceholder} onChange={(event) => setSearch(event.target.value)} />
      </div>

      <div className="mt-4 min-w-0">
        {loading ? <LoadingCard label={copy.loading} lines={5} /> : admins.data.length === 0 ? <div className={`${cardMuted} p-6 text-center text-sm text-muted`}>{copy.noAdmins}</div> : <>
          <ul className="grid list-none gap-3 lg:hidden">
            {admins.data.map((admin) => <li key={admin.id} className={`${cardMuted} min-w-0 p-3`}>
              <div className="flex items-start justify-between gap-3"><AdminIdentity admin={admin} locale={locale} /><AdminUserStatusBadge status={admin.status} /></div>
              <dl className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-muted">{copy.establishmentsAdded}</dt><dd className="tabular mt-1 font-bold text-ink">{formatNumber(admin.establishmentsAdded, locale)}</dd></div><div><dt className="text-muted">{copy.phone}</dt><dd className="ltr-isolate mt-1 truncate font-semibold text-ink">{admin.phone ?? '—'}</dd></div></dl>
              <AdminActions admin={admin} mobile onVisit={() => void openDetails(admin)} onEdit={() => setDialog({ kind: 'edit', admin })} onStatus={() => setDialog({ kind: 'status', admin, nextStatus: admin.status === 'active' ? 'suspended' : 'active' })} />
            </li>)}
          </ul>

          <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface lg:block">
            <table className="w-full table-fixed border-collapse">
              <thead className="border-b border-line bg-page-alt text-start text-[11px] font-bold tracking-[0.08em] text-muted uppercase rtl:tracking-normal rtl:normal-case"><tr><th className="w-[28%] px-3 py-2 text-start">{copy.fullName}</th><th className="w-[25%] px-3 py-2 text-start">{copy.email}</th><th className="w-[15%] px-3 py-2 text-start">{copy.status}</th><th className="w-[15%] px-3 py-2 text-start">{copy.establishmentsAdded}</th><th className="w-[17%] px-3 py-2 text-end">{copy.actions}</th></tr></thead>
              <tbody className="divide-y divide-line">{admins.data.map((admin) => <tr key={admin.id} className="transition-colors hover:bg-surface-2/70 focus-within:bg-surface-2"><td className="px-3 py-2"><AdminIdentity admin={admin} locale={locale} compact /></td><td className="ltr-isolate break-all px-3 py-2 text-xs text-ink-soft">{admin.email ?? '—'}</td><td className="px-3 py-2"><AdminUserStatusBadge status={admin.status} /></td><td className="tabular px-3 py-2 text-sm font-semibold text-ink">{formatNumber(admin.establishmentsAdded, locale)}</td><td className="px-3 py-2"><AdminActions admin={admin} onVisit={() => void openDetails(admin)} onEdit={() => setDialog({ kind: 'edit', admin })} onStatus={() => setDialog({ kind: 'status', admin, nextStatus: admin.status === 'active' ? 'suspended' : 'active' })} /></td></tr>)}</tbody>
            </table>
          </div>
        </>}
        <PaginationControls {...admins} labels={adminCopy[locale].pagination} disabled={loading} onPageChange={setPage} />
      </div>
    </section>

    {dialog?.kind === 'details' && <AdminDetailsModal admin={dialog.admin} details={detail} loading={detailLoading} onClose={() => setDialog(null)} />}
    {dialog?.kind === 'edit' && <EditAdminModal admin={dialog.admin} saving={saving} onClose={() => !saving && setDialog(null)} onSave={(values) => void saveProfile(dialog.admin, values)} />}
    {dialog?.kind === 'status' && <StatusModal admin={dialog.admin} nextStatus={dialog.nextStatus} saving={saving} onClose={() => !saving && setDialog(null)} onConfirm={() => void saveStatus(dialog.admin, dialog.nextStatus)} />}
    {dialog?.kind === 'invite' && <InvitationModal saving={saving} onClose={() => !saving && setDialog(null)} onCreate={(values) => void createInvitation(values)} />}
  </div>
}

export function SuperAdminAuditLog() {
  const { locale, t } = useI18n()
  const copy = t.superAdminManagement
  const [events, setEvents] = useState<PaginatedResult<SuperAdminAuditEvent>>(() => paginatedResult([], 0, { pageSize: DEFAULT_PAGE_SIZE }))
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<SuperAdminFailure | null>(null)

  const loadEvents = useCallback(async () => {
    setLoading(true)
    const result = await getSuperAdminAuditEvents({ page, pageSize: DEFAULT_PAGE_SIZE })
    setEvents(result.data)
    setError(result.error)
    setLoading(false)
  }, [page])

  useEffect(() => { void loadEvents() }, [loadEvents])

  const metadata = (event: SuperAdminAuditEvent) => Object.keys(event.metadata).length ? JSON.stringify(event.metadata) : '—'

  return <div className="space-y-5">
    <header className={`${card} border-brand/45 p-5 sm:p-6`}><AdminSectionHeader icon={ClipboardList} title={copy.auditLog} text={copy.auditSubtitle} /></header>
    {error && <AdminManagementLoadError failure={error} onRetry={() => void loadEvents()} />}
    <section className={`${card} p-3 sm:p-4`}>
      {loading ? <LoadingCard label={copy.auditLoading} lines={5} /> : events.data.length === 0 ? <div className={`${cardMuted} p-6 text-center text-sm text-muted`}>{copy.auditEmpty}</div> : <>
        <ul className="grid list-none gap-3 lg:hidden">{events.data.map((event) => <li key={event.id} className={`${cardMuted} min-w-0 p-3`}><div className="flex items-start justify-between gap-3"><p className="break-words text-sm font-bold text-ink">{event.action}</p><time className="tabular shrink-0 text-xs text-muted" dateTime={event.createdAt}>{formatDate(event.createdAt, locale)}</time></div><dl className="mt-3 grid gap-2 text-xs"><div><dt className="text-muted">{copy.auditActor}</dt><dd className="mt-0.5 text-ink-soft">{event.actorName || '—'}</dd></div><div><dt className="text-muted">{copy.auditTarget}</dt><dd className="ltr-isolate mt-0.5 break-all text-ink-soft">{event.targetType}: {event.targetId}</dd></div><div><dt className="text-muted">{copy.metadata}</dt><dd className="ltr-isolate mt-0.5 break-all text-ink-soft">{metadata(event)}</dd></div></dl></li>)}</ul>
        <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface lg:block"><table className="w-full table-fixed border-collapse"><thead className="border-b border-line bg-page-alt text-start text-[11px] font-bold tracking-[0.08em] text-muted uppercase rtl:tracking-normal rtl:normal-case"><tr><th className="w-[19%] px-3 py-2 text-start">{copy.auditActor}</th><th className="w-[21%] px-3 py-2 text-start">{copy.actions}</th><th className="w-[24%] px-3 py-2 text-start">{copy.auditTarget}</th><th className="w-[18%] px-3 py-2 text-start">{copy.createdAt}</th><th className="w-[18%] px-3 py-2 text-start">{copy.metadata}</th></tr></thead><tbody className="divide-y divide-line">{events.data.map((event) => <tr key={event.id}><td className="px-3 py-2 text-xs text-ink-soft">{event.actorName || '—'}</td><td className="px-3 py-2 text-xs font-semibold text-ink">{event.action}</td><td className="ltr-isolate break-all px-3 py-2 text-xs text-ink-soft">{event.targetType}: {event.targetId}</td><td className="px-3 py-2 text-xs text-muted"><time dateTime={event.createdAt}>{formatDate(event.createdAt, locale)}</time></td><td className="ltr-isolate break-all px-3 py-2 text-xs text-muted">{metadata(event)}</td></tr>)}</tbody></table></div>
      </>}
      <PaginationControls {...events} labels={adminCopy[locale].pagination} disabled={loading} onPageChange={setPage} />
    </section>
  </div>
}

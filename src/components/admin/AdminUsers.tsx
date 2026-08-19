import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AlertTriangle, Ban, CalendarDays, Check, CheckCircle, Eye, Filter, Info, Mail, Phone, Search, Shield, ShieldAlert, ShieldCheck, UserCog, UserRound, UsersRound, X, type LucideIcon } from 'lucide-react'
import { useI18n } from '../../i18n'
import type { AdminUser, AdminUserRoleFilter, AdminUserStatusFilter } from '../../lib/admin'
import { formatDate, formatNumber } from '../../lib/format'
import { btnGhost, card, cardMuted, field, fieldLabel, iconBtn } from '../../lib/ui'
import type { PaginatedResult } from '../../lib/pagination'
import { LoadingCard } from '../system/States'
import { PaginationControls } from '../ui/PaginationControls'
import { adminCopy } from './adminCopy'
import { AdminActionButton } from './AdminUi'
import { AdminUserRoleBadge, AdminUserStatusBadge } from './AdminUserUi'

type UserFilters = {
  search: string
  role: AdminUserRoleFilter
  status: AdminUserStatusFilter
}

type UserDialog =
  | { kind: 'details'; user: AdminUser }
  | { kind: 'status'; user: AdminUser; status: 'active' | 'suspended' }
  | { kind: 'role'; user: AdminUser }
  | null

type Notice = { tone: 'success' | 'error'; text: string } | null
type UserAdvisoryId = 'role-security' | 'deletion'

type AdminUsersProps = {
  users: AdminUser[]
  pagination: PaginatedResult<AdminUser>
  loading: boolean
  currentRole: 'admin' | 'super_admin'
  filters: UserFilters
  onFiltersChange: (filters: UserFilters) => void
  onPageChange: (page: number) => void
  onStatusChange: (user: AdminUser, status: 'active' | 'suspended') => Promise<string | null>
  onRoleChange: (user: AdminUser, role: AdminUser['role']) => Promise<string | null>
  displayName: (user: AdminUser) => string
}

const roles: AdminUserRoleFilter[] = ['all', 'user', 'admin', 'super_admin']
const statuses: AdminUserStatusFilter[] = ['all', 'active', 'suspended', 'deleted']

function canChangeStatus(currentRole: 'admin' | 'super_admin', user: AdminUser) {
  if (user.status === 'deleted') return false
  return currentRole === 'super_admin' ? user.role !== 'super_admin' : user.role === 'user'
}

function UserModal({
  title,
  onClose,
  children,
}: {
  title: string
  onClose: () => void
  children: ReactNode
}) {
  const { locale } = useI18n()
  const copy = adminCopy[locale].users
  const closeButton = useRef<HTMLButtonElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-user-modal-title"
      className="fixed inset-0 z-60 grid place-items-end bg-ink/40 p-0 backdrop-blur-[2px] sm:place-items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="max-h-[calc(100dvh-1rem)] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="admin-user-modal-title" className="text-xl font-bold tracking-tight text-ink">{title}</h2>
          <button ref={closeButton} type="button" className={iconBtn} aria-label={copy.close} title={copy.close} onClick={onClose}><X size={19} aria-hidden /></button>
        </div>
        {children}
      </section>
    </div>
  )
}

function UserAvatar({ avatarUrl }: { avatarUrl: AdminUser['avatar_url'] }) {
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    setImageFailed(false)
  }, [avatarUrl])

  return (
    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-brand-soft text-brand-deep">
      {avatarUrl && !imageFailed ? <img src={avatarUrl} alt="" className="size-full object-cover" loading="lazy" onError={() => setImageFailed(true)} /> : <UserRound size={18} aria-hidden />}
    </span>
  )
}

function UserIdentity({ user, displayName, compact = false }: { user: AdminUser; displayName: (user: AdminUser) => string; compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <UserAvatar avatarUrl={user.avatar_url} />
      <div className="min-w-0">
        <p dir="auto" className={`${compact ? 'text-xs' : 'text-sm'} font-semibold leading-tight text-ink`}>{displayName(user)}</p>
        {user.full_name_ar?.trim() && user.full_name_ar.trim() !== user.full_name?.trim() && <p dir="rtl" className={`${compact ? 'text-[11px]' : 'text-xs'} mt-1 leading-tight text-muted`}>{user.full_name_ar.trim()}</p>}
        <p className={`ltr-isolate mt-1 flex items-center gap-1.5 break-all ${compact ? 'text-[11px]' : 'text-xs'} leading-tight text-muted`}><Mail size={13} aria-hidden />{user.email ?? '—'}</p>
      </div>
    </div>
  )
}

function TopNotice({
  icon: LeadIcon,
  title,
  text,
  dismissLabel,
  tone = 'info',
  onDismiss,
}: {
  icon: LucideIcon
  title: string
  text: string
  dismissLabel: string
  tone?: 'error' | 'info' | 'success' | 'warning'
  onDismiss: () => void
}) {
  const toneClass = tone === 'error' || tone === 'warning'
    ? 'border-ask/30 bg-ask-bg text-ask'
    : tone === 'success'
      ? 'border-answer/30 bg-answer-bg text-answer'
      : 'border-line bg-surface text-ink-soft'

  return (
    <section role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-xl border px-3 py-2.5 ${toneClass}`}>
      <span className="mt-0.5 shrink-0"><LeadIcon size={17} aria-hidden /></span>
      <div className="min-w-0 flex-1 text-xs leading-5">
        <h3 className="font-bold text-ink">{title}</h3>
        <p className="mt-0.5">{text}</p>
      </div>
      <button type="button" className={`${iconBtn} -my-1.5 size-11 rounded-lg`} aria-label={dismissLabel} title={dismissLabel} onClick={onDismiss}><X size={16} aria-hidden /></button>
    </section>
  )
}

function UserStats({ users, className = '' }: { users: AdminUser[]; className?: string }) {
  const { locale } = useI18n()
  const copy = adminCopy[locale].users.stats
  const stats = [
    { label: copy.total, value: users.length, icon: UsersRound },
    { label: copy.normalUsers, value: users.filter((user) => user.role === 'user').length, icon: UserRound },
    { label: copy.admins, value: users.filter((user) => user.role === 'admin').length, icon: Shield },
    { label: copy.superAdmins, value: users.filter((user) => user.role === 'super_admin').length, icon: ShieldCheck },
    { label: copy.active, value: users.filter((user) => user.status === 'active').length, icon: CheckCircle },
    { label: copy.suspended, value: users.filter((user) => user.status === 'suspended').length, icon: Ban },
  ]

  return (
    <section className={`${card} p-3 ${className}`}>
      <h3 className="px-1 text-xs font-bold text-ink">{copy.title}</h3>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {stats.map(({ label, value, icon: StatIcon }) => (
          <article key={label} className="rounded-xl border border-line bg-page-alt p-3">
            <span className="grid size-7 place-items-center rounded-lg bg-surface-2 text-ink-soft"><StatIcon size={14} aria-hidden /></span>
            <p className="tabular mt-2 text-lg font-bold leading-none text-ink">{formatNumber(value, locale)}</p>
            <p className="mt-1 text-[11px] font-medium leading-tight text-muted">{label}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

export function AdminUsers({
  users,
  pagination,
  loading,
  currentRole,
  filters,
  onFiltersChange,
  onPageChange,
  onStatusChange,
  onRoleChange,
  displayName,
}: AdminUsersProps) {
  const { locale } = useI18n()
  const copy = adminCopy[locale]
  const [dialog, setDialog] = useState<UserDialog>(null)
  const [roleDraft, setRoleDraft] = useState<AdminUser['role']>('user')
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [dismissedAdvisories, setDismissedAdvisories] = useState<Set<UserAdvisoryId>>(() => new Set())

  useEffect(() => {
    if (dialog?.kind === 'role') setRoleDraft(dialog.user.role)
  }, [dialog])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDismissedAdvisories(new Set<UserAdvisoryId>(['role-security', 'deletion']))
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const updateFilters = (next: Partial<UserFilters>) => {
    onFiltersChange({ ...filters, ...next })
  }

  const closeDialog = () => {
    if (!saving) setDialog(null)
  }

  const saveStatus = async (user: AdminUser, status: 'active' | 'suspended') => {
    setSaving(true)
    const error = await onStatusChange(user, status)
    setSaving(false)
    if (error) {
      setNotice({ tone: 'error', text: copy.users.userUpdateFailed })
      return
    }
    setNotice({ tone: 'success', text: copy.users.userUpdated })
    setDialog(null)
  }

  const saveRole = async (user: AdminUser) => {
    setSaving(true)
    const error = await onRoleChange(user, roleDraft)
    setSaving(false)
    if (error) {
      setNotice({ tone: 'error', text: copy.users.userUpdateFailed })
      return
    }
    setNotice({ tone: 'success', text: copy.users.userUpdated })
    setDialog(null)
  }

  const userActions = (user: AdminUser, mobile = false) => {
    const statusAllowed = canChangeStatus(currentRole, user)
    const status = user.status === 'active' ? 'suspended' : 'active'
    const statusAction = user.status === 'active'
      ? { icon: Ban, label: copy.users.suspendAccount, tone: 'danger' as const }
      : { icon: CheckCircle, label: copy.users.reactivateAccount, tone: 'success' as const }

    return (
      <div className={mobile ? 'mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3' : 'flex flex-wrap items-center gap-1.5'}>
        <AdminActionButton icon={Eye} label={copy.users.viewDetails} title={copy.users.viewDetails} onClick={() => setDialog({ kind: 'details', user })} tone="primary" iconOnly />
        {statusAllowed && <AdminActionButton icon={statusAction.icon} label={statusAction.label} title={statusAction.label} onClick={() => setDialog({ kind: 'status', user, status })} tone={statusAction.tone} iconOnly />}
        {currentRole === 'super_admin' && user.status !== 'deleted' && <AdminActionButton icon={UserCog} label={copy.users.changeRole} title={copy.users.changeRole} onClick={() => setDialog({ kind: 'role', user })} tone="warning" iconOnly />}
      </div>
    )
  }

  const advisories = [
    { id: 'role-security' as const, icon: ShieldAlert, tone: 'warning' as const, title: copy.users.alerts.roleSecurityTitle, text: copy.users.alerts.roleSecurityText },
    { id: 'deletion' as const, icon: Info, tone: 'info' as const, title: copy.users.alerts.deletionTitle, text: copy.users.alerts.deletionText },
  ]

  const dismissAdvisory = (id: UserAdvisoryId) => {
    setDismissedAdvisories((current) => new Set(current).add(id))
  }

  return (
    <div className="space-y-5">
      <header className={`${card} p-4 sm:p-5`}>
        <h2 className="text-lg font-bold tracking-tight text-ink">{copy.users.title}</h2>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted lg:text-xs lg:leading-5">{copy.users.subtitle}</p>
      </header>

      <div className="space-y-2">
        {notice && <TopNotice icon={notice.tone === 'success' ? Check : AlertTriangle} tone={notice.tone} title={notice.tone === 'success' ? copy.users.userUpdated : copy.users.userUpdateFailed} text={notice.text} dismissLabel={copy.users.alerts.dismiss} onDismiss={() => setNotice(null)} />}
        {advisories.filter(({ id }) => !dismissedAdvisories.has(id)).map((advisory) => <TopNotice key={advisory.id} {...advisory} dismissLabel={copy.users.alerts.dismiss} onDismiss={() => dismissAdvisory(advisory.id)} />)}
      </div>

      <UserStats users={users} />

      <div className="min-w-0 space-y-4">
        <form className={`${cardMuted} grid gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_140px_140px] lg:gap-2 lg:p-2.5`} onSubmit={(event) => event.preventDefault()}>
            <div className="relative">
              <label className="sr-only" htmlFor="admin-users-search">{copy.users.searchLabel}</label>
              <Search className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" size={17} aria-hidden />
              <input id="admin-users-search" value={filters.search} onChange={(event) => updateFilters({ search: event.target.value })} className={`${field} ps-10 lg:h-10 lg:text-xs`} placeholder={copy.users.searchPlaceholder} />
            </div>
            <div className="relative">
              <label className="sr-only" htmlFor="admin-users-role">{copy.users.roleFilter}</label>
              <Filter className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden />
              <select id="admin-users-role" value={filters.role} onChange={(event) => updateFilters({ role: event.target.value as AdminUserRoleFilter })} className={`${field} ps-10 lg:h-10 lg:text-xs`}>
                {roles.map((role) => <option key={role} value={role}>{role === 'all' ? copy.users.all : copy.content.status[role]}</option>)}
              </select>
            </div>
            <div className="relative">
              <label className="sr-only" htmlFor="admin-users-status">{copy.users.statusFilter}</label>
              <Filter className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted" size={16} aria-hidden />
              <select id="admin-users-status" value={filters.status} onChange={(event) => updateFilters({ status: event.target.value as AdminUserStatusFilter })} className={`${field} ps-10 lg:h-10 lg:text-xs`}>
                {statuses.map((status) => <option key={status} value={status}>{status === 'all' ? copy.users.all : copy.content.status[status]}</option>)}
              </select>
            </div>
          </form>

        {loading ? <LoadingCard label={copy.content.loading.users} lines={5} /> : users.length === 0 ? <div className={`${card} p-6 text-center text-sm text-muted`}>{copy.content.empty.usersTitle}</div> : <>
            <ul className="grid list-none gap-3 lg:hidden">
              {users.map((user) => <li key={user.id} className={`${card} min-w-0 p-3`}>
                <div className="flex items-start justify-between gap-3"><UserIdentity user={user} displayName={displayName} /><div className="flex shrink-0 flex-wrap justify-end gap-2"><AdminUserRoleBadge role={user.role} /><AdminUserStatusBadge status={user.status} /></div></div>
                <dl className="mt-3 grid gap-1.5 border-t border-line pt-2.5 text-xs">
                  <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3"><dt className="text-muted">{copy.mobile.phone}</dt><dd className="ltr-isolate inline-flex items-center justify-self-end gap-1.5 break-words text-end text-ink-soft"><Phone size={14} aria-hidden />{user.phone ?? '—'}</dd></div>
                  <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-3"><dt className="text-muted">{copy.mobile.createdAt}</dt><dd className="inline-flex items-center justify-self-end gap-1.5 text-end text-ink-soft"><CalendarDays size={14} aria-hidden /><time dateTime={user.created_at}>{formatDate(user.created_at, locale)}</time></dd></div>
                </dl>
                {userActions(user, true)}
              </li>)}
            </ul>
            <div className="hidden overflow-hidden rounded-2xl border border-line bg-surface lg:block"><table className="w-full table-fixed border-collapse"><thead className="border-b border-line bg-page-alt text-start text-[11px] font-bold tracking-[0.08em] text-muted uppercase rtl:tracking-normal rtl:normal-case"><tr><th className="w-[31%] px-3 py-2 text-start">{copy.content.table.user}</th><th className="w-[15%] px-3 py-2 text-start">{copy.content.table.phone}</th><th className="w-[13%] px-3 py-2 text-start">{copy.content.table.role}</th><th className="w-[13%] px-3 py-2 text-start">{copy.content.table.status}</th><th className="w-[16%] px-3 py-2 text-start">{copy.content.table.createdAt}</th><th className="w-[12%] px-3 py-2 text-start">{copy.content.table.action}</th></tr></thead><tbody className="divide-y divide-line">{users.map((user) => <tr key={user.id} className="transition-colors hover:bg-surface-2/70 focus-within:bg-surface-2"><td className="px-3 py-2 align-top"><UserIdentity user={user} displayName={displayName} compact /></td><td className="ltr-isolate px-3 py-2 align-top text-xs leading-tight text-ink-soft"><span className="inline-flex break-words"><Phone className="me-1.5 shrink-0" size={13} aria-hidden />{user.phone ?? '—'}</span></td><td className="px-3 py-2 align-top"><AdminUserRoleBadge role={user.role} /></td><td className="px-3 py-2 align-top"><AdminUserStatusBadge status={user.status} /></td><td className="px-3 py-2 align-top text-xs leading-tight text-ink-soft"><time className="inline-flex items-start gap-1.5" dateTime={user.created_at}><CalendarDays className="mt-0.5 shrink-0" size={13} aria-hidden />{formatDate(user.created_at, locale)}</time></td><td className="px-3 py-2 align-top">{userActions(user)}</td></tr>)}</tbody></table></div>
        </>}

        <PaginationControls {...pagination} labels={copy.pagination} disabled={loading} onPageChange={onPageChange} />
      </div>

      {dialog?.kind === 'details' && <UserModal title={copy.users.detailsTitle} onClose={closeDialog}>
        <div className="mt-5 space-y-4">
          <div className={`${cardMuted} p-4`}><UserIdentity user={dialog.user} displayName={displayName} /></div>
          <div className="flex flex-wrap gap-2"><AdminUserRoleBadge role={dialog.user.role} /><AdminUserStatusBadge status={dialog.user.status} /></div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div><dt className={fieldLabel}>{copy.users.fullName}</dt><dd dir="auto" className="break-words text-ink-soft">{dialog.user.full_name ?? '—'}</dd></div>
            <div><dt className={fieldLabel}>{copy.users.arabicFullName}</dt><dd dir="rtl" className="break-words text-ink-soft">{dialog.user.full_name_ar ?? '—'}</dd></div>
            <div><dt className={fieldLabel}>{copy.users.email}</dt><dd className="ltr-isolate break-all text-ink-soft">{dialog.user.email ?? '—'}</dd></div>
            <div><dt className={fieldLabel}>{copy.users.phone}</dt><dd className="ltr-isolate break-words text-ink-soft">{dialog.user.phone ?? '—'}</dd></div>
            <div><dt className={fieldLabel}>{copy.users.createdAt}</dt><dd className="text-ink-soft"><time dateTime={dialog.user.created_at}>{formatDate(dialog.user.created_at, locale)}</time></dd></div>
            <div><dt className={fieldLabel}>{copy.users.updatedAt}</dt><dd className="text-ink-soft"><time dateTime={dialog.user.updated_at}>{formatDate(dialog.user.updated_at, locale)}</time></dd></div>
          </dl>
          <div><p className={fieldLabel}>{copy.users.avatarUrl}</p>{dialog.user.avatar_url ? <a href={dialog.user.avatar_url} target="_blank" rel="noreferrer" className="ltr-isolate break-all text-sm text-brand-deep underline underline-offset-2">{dialog.user.avatar_url}</a> : <p className="text-sm text-muted">{copy.users.noAvatar}</p>}</div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            {canChangeStatus(currentRole, dialog.user) && <AdminActionButton icon={dialog.user.status === 'active' ? Ban : CheckCircle} label={dialog.user.status === 'active' ? copy.users.suspendAccount : copy.users.reactivateAccount} title={dialog.user.status === 'active' ? copy.users.suspendAccount : copy.users.reactivateAccount} onClick={() => setDialog({ kind: 'status', user: dialog.user, status: dialog.user.status === 'active' ? 'suspended' : 'active' })} tone={dialog.user.status === 'active' ? 'danger' : 'success'} />}
            <button type="button" className={btnGhost} onClick={closeDialog}>{copy.users.close}</button>
          </div>
        </div>
      </UserModal>}

      {dialog?.kind === 'status' && <UserModal title={copy.users.statusConfirmTitle} onClose={closeDialog}>
        <div className="mt-5"><p className="text-sm leading-6 text-muted">{copy.users.statusConfirmText}</p><div className={`${cardMuted} mt-4 grid gap-4 p-4 sm:grid-cols-[minmax(0,1fr)_auto]`}><UserIdentity user={dialog.user} displayName={displayName} /><dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs font-semibold text-muted">{copy.users.currentValue}</dt><dd className="mt-1"><AdminUserStatusBadge status={dialog.user.status} /></dd></div><div><dt className="text-xs font-semibold text-muted">{copy.users.newValue}</dt><dd className="mt-1"><AdminUserStatusBadge status={dialog.status} /></dd></div></dl></div><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className={btnGhost} disabled={saving} onClick={closeDialog}>{copy.users.cancel}</button><AdminActionButton icon={Check} label={saving ? copy.users.saving : copy.users.confirm} disabled={saving} onClick={() => void saveStatus(dialog.user, dialog.status)} tone="primary" /></div></div>
      </UserModal>}

      {dialog?.kind === 'role' && <UserModal title={copy.users.roleConfirmTitle} onClose={closeDialog}>
        <div className="mt-5"><p className="text-sm leading-6 text-muted">{copy.users.roleConfirmText}</p><p className="mt-3 rounded-xl border border-ask/30 bg-ask-bg px-3 py-2 text-sm leading-6 text-ask">{copy.users.roleWarning}</p><div className={`${cardMuted} mt-4 flex items-center justify-between gap-3 p-4`}><UserIdentity user={dialog.user} displayName={displayName} /><div><p className="text-xs font-semibold text-muted">{copy.users.currentValue}</p><div className="mt-1"><AdminUserRoleBadge role={dialog.user.role} /></div></div></div><label className={`${fieldLabel} mt-5`} htmlFor="admin-user-role-choice">{copy.users.newValue}</label><select id="admin-user-role-choice" value={roleDraft} onChange={(event) => setRoleDraft(event.target.value as AdminUser['role'])} className={field}>{roles.filter((role): role is AdminUser['role'] => role !== 'all').map((role) => <option key={role} value={role}>{copy.content.status[role]}</option>)}</select><div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" className={btnGhost} disabled={saving} onClick={closeDialog}>{copy.users.cancel}</button><AdminActionButton icon={Check} label={saving ? copy.users.saving : copy.users.confirm} disabled={saving || roleDraft === dialog.user.role} onClick={() => void saveRole(dialog.user)} tone="primary" /></div></div>
      </UserModal>}
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useI18n } from '../i18n'
import { useAccount } from '../hooks/useAccount'
import { AccountLoading } from './system/AccountLoading'
import { signOut } from '../lib/auth'
import {
  adminCreateEstablishment,
  adminImportExternalPlaceDiscovery,
  adminRejectExternalPlaceDiscovery,
  adminUpdateUserStatus,
  getAdminMissingRequests,
  getAdminExternalPlaceDiscoveries,
  getAdminAnalytics,
  getAdminOverview,
  getAdminSearchLogs,
  getAdminServices,
  getAdminUsers,
  getAdminWallets,
  getAdminRechargeStates,
  updateMissingRequestStatus,
  type AdminCreateEstablishmentParams,
  type AdminMissingRequest,
  type AdminExternalPlaceDiscovery,
  type AdminAnalytics,
  type AdminOverview,
  type AdminSearchLog,
  type AdminServices,
  type AdminUser,
  type AdminUserRoleFilter,
  type AdminUserStatusFilter,
  type AdminWallet,
  type AdminRechargeModule,
  type AdminRechargeRequest,
} from '../lib/admin'
import {
  adminListBusinessSubmissions,
  adminApproveBusinessSubmission,
  adminRejectBusinessSubmission,
  type BusinessSubmissionSummary,
} from '../lib/businessSubmissions'
import type { MissingServiceRequestStatus } from '../lib/db3b'
import { formatDate, formatNumber } from '../lib/format'
import type {
  AdminExternalPlaceImportInput,
  AdminExternalPlaceImportSubmitResult,
} from '../lib/adminExternalPlaceImport'
import { appWrap, btnGhost, btnPrimary, card, cardMuted, field, pill } from '../lib/ui'
import { AppShell } from './shell/AppShell'
import { EmptyState, InlineAlert, LoadingCard } from './system/States'
import { adminCopy, type AdminTabId } from './admin/adminCopy'
export { RequireAdmin } from './admin/AdminAccess'
import { AdminDashboard } from './admin/AdminDashboard'
import { AdminBottomNav } from './admin/AdminBottomNav'
import { AdminActionButton, AdminModal, type AdminIcon } from './admin/AdminUi'
import { AdminSidebar } from './admin/AdminSidebar'
import { AdminUsers } from './admin/AdminUsers'
import { AdminRequests } from './admin/AdminRequests'
import { AdminCredits } from './admin/AdminCredits'
import { AdminBusinessSubmissions } from './admin/AdminBusinessSubmissions'
import { AdminExternalPlaceImportModal } from './admin/AdminExternalPlaceImportModal'
import { PaginationControls } from './ui/PaginationControls'
import { Building2, Check, Eye, LayoutDashboard, ListChecks, MapPinned, Plus, Search, Users, Wallet, X } from 'lucide-react'
import { DEFAULT_PAGE_SIZE, paginatedResult, type PaginatedResult } from '../lib/pagination'
import type { PlaceTypeKey } from '../lib/placeTypes'

type AdminTab = AdminTabId
type AdminListPage = 'requests' | 'discoveries' | 'users' | 'wallets' | 'ledger' | 'searchLogs' | 'categories' | 'establishments' | 'branches' | 'submissions'

type DisplayUser = {
  full_name: string | null
  full_name_ar: string | null
  email: string | null
}

const tabs: { id: AdminTab; icon: AdminIcon }[] = [
  { id: 'dashboard', icon: LayoutDashboard },
  { id: 'requests', icon: ListChecks },
  { id: 'discoveries', icon: MapPinned },
  { id: 'users', icon: Users },
  { id: 'credits', icon: Wallet },
  { id: 'search-logs', icon: Search },
  { id: 'services', icon: Building2 },
  { id: 'submissions', icon: Building2 },
]

function emptyPage<T>(): PaginatedResult<T> {
  return paginatedResult([], 0, { pageSize: DEFAULT_PAGE_SIZE })
}

function personName(user: DisplayUser | null, locale: 'fr' | 'ar' | 'en') {
  const content = adminCopy[locale].content
  if (!user) return content.unknownUser
  if (locale === 'ar' && user.full_name_ar?.trim()) return user.full_name_ar.trim()
  return user.full_name?.trim() || user.full_name_ar?.trim() || user.email || content.unnamedUser
}

function statusClass(status: string) {
  if (['active', 'approved', 'added', 'success'].includes(status)) return 'bg-answer-bg text-answer'
  if (['pending', 'reviewed', 'draft'].includes(status)) return 'bg-brand-soft text-brand-deep'
  if (['rejected', 'suspended', 'error', 'insufficient_credits', 'closed'].includes(status)) return 'bg-ask-bg text-ask'
  return 'bg-surface-2 text-ink-soft'
}

function StatusBadge({ value }: { value: string }) {
  const { locale } = useI18n()
  return <span className={`${pill} ${statusClass(value)}`}>{adminCopy[locale].content.status[value] ?? value.replaceAll('_', ' ')}</span>
}

function TableWrap({ children }: { children: ReactNode }) {
  return <div className={`${card} overflow-hidden`}><div className="overflow-x-auto">{children}</div></div>
}

function TableHeader({ children }: { children: ReactNode }) {
  return <thead className="border-b border-line bg-page-alt text-start text-[11px] font-bold tracking-[0.08em] text-muted uppercase rtl:tracking-normal rtl:normal-case"><tr>{children}</tr></thead>
}

function TableCell({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <td className={`px-4 py-3.5 align-top text-sm text-ink-soft ${className}`}>{children}</td>
}

function TableTitle({ children }: { children: ReactNode }) {
  return <h3 className="font-semibold text-ink" dir="auto">{children}</h3>
}

/** Les tableaux restent denses au bureau ; sous `lg`, une ligne devient une carte lisible au pouce. */
function MobileCardList({ children }: { children: ReactNode }) {
  return <ul className="grid list-none gap-3 lg:hidden">{children}</ul>
}

function MobileCard({ children }: { children: ReactNode }) {
  return <li className={`${card} min-w-0 p-3`}>{children}</li>
}

function MobileDetails({ children }: { children: ReactNode }) {
  return <dl className="mt-3 grid gap-1.5 border-t border-line pt-2.5 text-xs">{children}</dl>
}

function MobileDetail({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-start gap-3">
    <dt className="text-muted">{label}</dt>
    <dd className="min-w-0 break-words text-end text-ink-soft">{children}</dd>
  </div>
}

function SearchLogsView({
  logs,
  pagination,
  loading,
  onPageChange,
}: {
  logs: AdminSearchLog[]
  pagination: PaginatedResult<AdminSearchLog>
  loading: boolean
  onPageChange: (page: number) => void
}) {
  const { locale } = useI18n()
  const copy = adminCopy[locale]
  const { mobile, content } = copy
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [date, setDate] = useState('')
  const filteredLogs = useMemo(() => logs.filter((entry) => {
    const matchesQuery = !query.trim() || `${entry.query} ${entry.normalized_query}`.toLowerCase().includes(query.trim().toLowerCase())
    const matchesStatus = status === 'all' || entry.status === status
    const matchesDate = !date || entry.created_at.startsWith(date)
    return matchesQuery && matchesStatus && matchesDate
  }), [date, logs, query, status])
  if (loading) return <LoadingCard label={content.loading.searches} lines={5} />
  return <div className="space-y-4">
    <div className={`${cardMuted} grid gap-3 p-3 sm:grid-cols-[minmax(0,1fr)_180px_180px]`}><div><label className="sr-only" htmlFor="admin-search-query">{content.filters.searchLabel}</label><input id="admin-search-query" value={query} onChange={(event) => setQuery(event.target.value)} className={field} placeholder={content.filters.searchPlaceholder} /></div><div><label className="sr-only" htmlFor="admin-search-status">{content.filters.statusLabel}</label><select id="admin-search-status" value={status} onChange={(event) => setStatus(event.target.value)} className={field}><option value="all">{content.filters.allStatuses}</option><option value="success">{content.status.success}</option><option value="not_found">{content.status.not_found}</option><option value="insufficient_credits">{content.status.insufficient_credits}</option><option value="invalid_query">{content.status.invalid_query}</option><option value="error">{content.status.error}</option></select></div><div><label className="sr-only" htmlFor="admin-search-date">{content.filters.dateLabel}</label><input id="admin-search-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={field} /></div></div>
    {filteredLogs.length === 0 ? <EmptyState icon="search" title={content.empty.searchesTitle} text={content.empty.searchesText} /> : <>
      <MobileCardList>{filteredLogs.map((entry) => <MobileCard key={entry.id}>
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><TableTitle>{entry.query}</TableTitle><p className="mt-1 break-words text-xs text-muted">{entry.normalized_query}</p></div><StatusBadge value={entry.status} /></div>
        <MobileDetails>
          <MobileDetail label={mobile.user}><span dir="auto">{personName(entry.user, locale)}</span><span className="ltr-isolate mt-1 block text-xs text-muted">{entry.user?.email ?? '—'}</span></MobileDetail>
          <MobileDetail label={mobile.points}><span className="tabular">−{formatNumber(entry.debited_points, locale)}</span></MobileDetail>
          <MobileDetail label={mobile.results}><span className="tabular">{formatNumber(entry.results_count, locale)}</span></MobileDetail>
          <MobileDetail label={mobile.date}><time dateTime={entry.created_at}>{formatDate(entry.created_at, locale)}</time></MobileDetail>
        </MobileDetails>
      </MobileCard>)}</MobileCardList>
      <div className="hidden lg:block"><TableWrap><table className="min-w-[920px] w-full border-collapse"><TableHeader><th className="px-4 py-3">{content.table.search}</th><th className="px-4 py-3">{content.table.user}</th><th className="px-4 py-3">{content.table.status}</th><th className="px-4 py-3">{content.table.points}</th><th className="px-4 py-3">{content.table.results}</th><th className="px-4 py-3">{content.table.date}</th></TableHeader><tbody className="divide-y divide-line">{filteredLogs.map((entry) => <tr key={entry.id}><TableCell><TableTitle>{entry.query}</TableTitle><p className="mt-1 text-xs text-muted">{entry.normalized_query}</p></TableCell><TableCell><p dir="auto">{personName(entry.user, locale)}</p><p className="ltr-isolate mt-1 text-xs text-muted">{entry.user?.email ?? '—'}</p></TableCell><TableCell><StatusBadge value={entry.status} /></TableCell><TableCell className="tabular">−{formatNumber(entry.debited_points, locale)}</TableCell><TableCell className="tabular">{formatNumber(entry.results_count, locale)}</TableCell><TableCell><time dateTime={entry.created_at}>{formatDate(entry.created_at, locale)}</time></TableCell></tr>)}</tbody></table></TableWrap></div>
    </>}
    {logs.length > 0 && <PaginationControls {...pagination} labels={copy.pagination} disabled={loading} onPageChange={onPageChange} />}
  </div>
}

function DiscoveryContext({ discovery }: { discovery: AdminExternalPlaceDiscovery }) {
  return <span dir="auto">{[discovery.wilaya, discovery.country].filter(Boolean).join(' · ')}</span>
}

function DiscoveryCoordinates({ discovery }: { discovery: AdminExternalPlaceDiscovery }) {
  return <span className="ltr-isolate tabular">{discovery.latitude.toFixed(6)}, {discovery.longitude.toFixed(6)}</span>
}

function DiscoveryTypeLabels({ types }: { types: PlaceTypeKey[] }) {
  const { locale } = useI18n()
  const copy = adminCopy[locale].discoveries
  if (types.length === 0) return null
  return <span dir="auto">{types.map((type) => copy.typeOptions[type]).join(' · ')}</span>
}

function AdminDiscoveriesView({
  discoveries,
  pagination,
  loading,
  onPageChange,
  onImport,
  onReject,
}: {
  discoveries: AdminExternalPlaceDiscovery[]
  pagination: PaginatedResult<AdminExternalPlaceDiscovery>
  loading: boolean
  onPageChange: (page: number) => void
  onImport: (
    discovery: AdminExternalPlaceDiscovery,
    input: Omit<AdminExternalPlaceImportInput, 'discoveryId'>,
  ) => Promise<AdminExternalPlaceImportSubmitResult>
  onReject: (discovery: AdminExternalPlaceDiscovery) => Promise<string | null>
}) {
  const { locale } = useI18n()
  const copy = adminCopy[locale].discoveries
  const [dialog, setDialog] = useState<{ action: 'import' | 'reject'; discovery: AdminExternalPlaceDiscovery } | null>(null)
  const [saving, setSaving] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 3000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const errorText = (status: string) => {
    if (status === 'invalid_types') return copy.chooseTypeError
    if (status === 'conflicting_natures') return copy.conflictingTypesError
    if (status === 'invalid_phone') return copy.invalidPhone
    if (status === 'invalid_whatsapp') return copy.invalidWhatsapp
    if (status === 'backend_update_required') return copy.backendUpdateRequired
    if (status === 'invalid_discovery' || status === 'invalid_coordinates') return copy.invalidDiscovery
    if (status === 'not_pending' || status === 'already_imported') return copy.alreadyHandled
    return copy.actionFailed
  }

  const openReview = (action: 'import' | 'reject', discovery: AdminExternalPlaceDiscovery) => {
    setDialog({ action, discovery })
  }

  const submitReject = async () => {
    if (!dialog || dialog.action !== 'reject') return
    setSaving(true)
    try {
      const error = await onReject(dialog.discovery)
      setNotice({
        tone: error ? 'error' : 'success',
        text: error ? errorText(error) : copy.rejectedSuccess,
      })
      if (!error) setDialog(null)
    } catch {
      setNotice({ tone: 'error', text: copy.actionFailed })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <LoadingCard label={copy.title} lines={5} />
  if (discoveries.length === 0) return <EmptyState icon="map" title={copy.emptyTitle} text={copy.emptyText} />

  return <div className="space-y-4">
    <section className={`${cardMuted} p-4`}>
      <h2 className="text-base font-bold text-ink">{copy.title}</h2>
      <p className="mt-1 text-sm leading-6 text-muted">{copy.subtitle}</p>
      <p className="mt-3 text-sm font-medium text-muted">{copy.adminOnlyNotice}</p>
    </section>
    {notice && <InlineAlert tone={notice.tone}>{notice.text}</InlineAlert>}
    <MobileCardList>{discoveries.map((discovery) => <MobileCard key={discovery.id}>
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><TableTitle>{discovery.display_name}</TableTitle><p className="mt-1 text-xs text-muted">{discovery.searched_query}</p></div><StatusBadge value={discovery.source_status} /></div>
      <MobileDetails>
        <MobileDetail label={copy.provider}>{discovery.provider === 'photon' ? 'Photon' : 'Nominatim'}</MobileDetail>
        <MobileDetail label={copy.context}><DiscoveryContext discovery={discovery} /></MobileDetail>
        <MobileDetail label={copy.coordinates}><DiscoveryCoordinates discovery={discovery} /></MobileDetail>
        {discovery.place_types.length > 0 && <MobileDetail label={copy.types}><DiscoveryTypeLabels types={discovery.place_types} /></MobileDetail>}
        <MobileDetail label={copy.user}>{personName(discovery.user, locale)}</MobileDetail>
        <MobileDetail label={copy.date}><time dateTime={discovery.created_at}>{formatDate(discovery.created_at, locale)}</time></MobileDetail>
      </MobileDetails>
      {discovery.source_status === 'pending_review' && <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
        <AdminActionButton icon={Check} label={copy.importAction} tone="success" disabled={saving} onClick={() => openReview('import', discovery)} />
        <AdminActionButton icon={X} label={copy.rejectAction} tone="danger" disabled={saving} onClick={() => openReview('reject', discovery)} />
      </div>}
    </MobileCard>)}</MobileCardList>
    <div className="hidden lg:block"><TableWrap><table className="min-w-[1200px] w-full border-collapse"><TableHeader><th className="px-4 py-3">{copy.searchedQuery}</th><th className="px-4 py-3">{copy.place}</th><th className="px-4 py-3">{copy.provider}</th><th className="px-4 py-3">{copy.context}</th><th className="px-4 py-3">{copy.coordinates}</th><th className="px-4 py-3">{copy.user}</th><th className="px-4 py-3">{copy.status}</th><th className="px-4 py-3">{copy.date}</th><th className="px-4 py-3">{copy.actions}</th></TableHeader><tbody className="divide-y divide-line">{discoveries.map((discovery) => <tr key={discovery.id}><TableCell><span dir="auto">{discovery.searched_query}</span></TableCell><TableCell><TableTitle>{discovery.display_name}</TableTitle>{discovery.place_types.length > 0 && <p className="mt-1 text-xs text-muted"><DiscoveryTypeLabels types={discovery.place_types} /></p>}</TableCell><TableCell>{discovery.provider === 'photon' ? 'Photon' : 'Nominatim'}</TableCell><TableCell><DiscoveryContext discovery={discovery} /></TableCell><TableCell><DiscoveryCoordinates discovery={discovery} /></TableCell><TableCell>{personName(discovery.user, locale)}</TableCell><TableCell><StatusBadge value={discovery.source_status} /></TableCell><TableCell><time dateTime={discovery.created_at}>{formatDate(discovery.created_at, locale)}</time></TableCell><TableCell>{discovery.source_status === 'pending_review' && <div className="flex flex-wrap gap-1.5"><AdminActionButton icon={Check} label={copy.importAction} title={copy.importAction} tone="success" iconOnly disabled={saving} onClick={() => openReview('import', discovery)} /><AdminActionButton icon={X} label={copy.rejectAction} title={copy.rejectAction} tone="danger" iconOnly disabled={saving} onClick={() => openReview('reject', discovery)} /></div>}</TableCell></tr>)}</tbody></table></TableWrap></div>
    {pagination.totalCount > 0 && <PaginationControls {...pagination} labels={adminCopy[locale].pagination} disabled={loading} onPageChange={onPageChange} />}
    {dialog?.action === 'import' && <AdminExternalPlaceImportModal
      discovery={dialog.discovery}
      onClose={() => setDialog(null)}
      onSubmit={async ({ selectedTypes, details }) => {
        const result = await onImport(dialog.discovery, { selectedTypes, details })
        return result.error ? { ...result, error: errorText(result.error) } : result
      }}
      onComplete={(status) => {
        setNotice({ tone: 'success', text: status === 'imported_existing' ? copy.linkedExistingSuccess : copy.approvedSuccess })
        setDialog(null)
      }}
    />}
    {dialog?.action === 'reject' && <AdminModal title={copy.rejectConfirmTitle} closeLabel={copy.close} onClose={() => !saving && setDialog(null)}>
      <p className="mt-4 text-sm leading-6 text-muted">{copy.rejectConfirmText}</p>
      <p dir="auto" className="mt-3 rounded-lg bg-page-alt px-3 py-2 text-sm font-semibold text-ink">{dialog.discovery.display_name}</p>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-line pt-4"><button type="button" className={`${btnGhost} flex-1`} disabled={saving} onClick={() => setDialog(null)}>{copy.cancel}</button><button type="button" className={`${btnPrimary} flex-1`} disabled={saving} onClick={() => void submitReject()}>{saving ? copy.rejecting : copy.confirm}</button></div>
    </AdminModal>}
  </div>
}

function ServicesView({
  services,
  loading,
  onCategoryPageChange,
  onEstablishmentPageChange,
  onBranchPageChange,
}: {
  services: AdminServices | null
  loading: boolean
  onCategoryPageChange: (page: number) => void
  onEstablishmentPageChange: (page: number) => void
  onBranchPageChange: (page: number) => void
}) {
  const { locale } = useI18n()
  const copy = adminCopy[locale]
  const { actions, content, mobile } = copy

  if (loading) return <LoadingCard label={content.loading.services} lines={5} />
  if (!services) return <EmptyState icon="store" title={content.empty.servicesTitle} />

  const sections = [
    { id: 'categories', title: content.sections.categories, emptyIcon: 'sparkle' as const, emptyTitle: content.sections.categoriesEmpty, result: services.categories, onPageChange: onCategoryPageChange },
    { id: 'establishments', title: content.sections.establishments, emptyIcon: 'store' as const, emptyTitle: content.sections.establishmentsEmpty, result: services.establishments, onPageChange: onEstablishmentPageChange },
    { id: 'branches', title: content.sections.branches, emptyIcon: 'pin' as const, emptyTitle: content.sections.branchesEmpty, result: services.branches, onPageChange: onBranchPageChange },
  ] as const

  return <div className="space-y-6">
    {sections.map((section) => (
      <section key={section.id}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-ink">{section.title}</h2>
          <div className="flex flex-wrap gap-2"><AdminActionButton icon={Eye} label={actions.view} disabled title={actions.soonTitle} /><AdminActionButton icon={Plus} label={actions.add} disabled title={actions.soonTitle} /></div>
        </div>
        {section.result.data.length === 0 ? <EmptyState icon={section.emptyIcon} title={section.emptyTitle} /> : section.id === 'categories' ? <>
          <MobileCardList>{section.result.data.map((category) => <MobileCard key={category.id}><div className="flex items-start justify-between gap-3"><TableTitle>{category.name}</TableTitle><StatusBadge value={category.status} /></div><MobileDetails><MobileDetail label={mobile.slug}><span className="ltr-isolate">{category.slug}</span></MobileDetail><MobileDetail label={mobile.order}><span className="tabular">{formatNumber(category.sort_order, locale)}</span></MobileDetail></MobileDetails></MobileCard>)}</MobileCardList>
          <div className="hidden lg:block"><TableWrap><table className="min-w-[620px] w-full border-collapse"><TableHeader><th className="px-4 py-3">{content.table.name}</th><th className="px-4 py-3">{content.table.slug}</th><th className="px-4 py-3">{content.table.status}</th><th className="px-4 py-3">{content.table.order}</th></TableHeader><tbody className="divide-y divide-line">{section.result.data.map((category) => <tr key={category.id}><TableCell><TableTitle>{category.name}</TableTitle></TableCell><TableCell>{category.slug}</TableCell><TableCell><StatusBadge value={category.status} /></TableCell><TableCell className="tabular">{formatNumber(category.sort_order, locale)}</TableCell></tr>)}</tbody></table></TableWrap></div>
        </> : section.id === 'establishments' ? <>
          <MobileCardList>{section.result.data.map((establishment) => <MobileCard key={establishment.id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><TableTitle>{establishment.name}</TableTitle><p className="mt-1 break-all text-xs text-muted">{establishment.slug}</p></div><StatusBadge value={establishment.status} /></div><MobileDetails><MobileDetail label={mobile.category}>{establishment.category?.name ?? '—'}</MobileDetail><MobileDetail label={mobile.verified}>{establishment.is_verified ? <span className="text-answer">{mobile.yes}</span> : <span className="text-muted">{mobile.no}</span>}</MobileDetail><MobileDetail label={mobile.createdAt}><time dateTime={establishment.created_at}>{formatDate(establishment.created_at, locale)}</time></MobileDetail></MobileDetails></MobileCard>)}</MobileCardList>
          <div className="hidden lg:block"><TableWrap><table className="min-w-[760px] w-full border-collapse"><TableHeader><th className="px-4 py-3">{content.table.establishment}</th><th className="px-4 py-3">{content.table.category}</th><th className="px-4 py-3">{content.table.status}</th><th className="px-4 py-3">{content.table.verified}</th><th className="px-4 py-3">{content.table.createdAt}</th></TableHeader><tbody className="divide-y divide-line">{section.result.data.map((establishment) => <tr key={establishment.id}><TableCell><TableTitle>{establishment.name}</TableTitle><p className="mt-1 text-xs text-muted">{establishment.slug}</p></TableCell><TableCell>{establishment.category?.name ?? '—'}</TableCell><TableCell><StatusBadge value={establishment.status} /></TableCell><TableCell>{establishment.is_verified ? <span className="text-answer">{mobile.yes}</span> : <span className="text-muted">{mobile.no}</span>}</TableCell><TableCell><time dateTime={establishment.created_at}>{formatDate(establishment.created_at, locale)}</time></TableCell></tr>)}</tbody></table></TableWrap></div>
        </> : <>
          <MobileCardList>{section.result.data.map((branch) => <MobileCard key={branch.id}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><TableTitle>{branch.name}</TableTitle><p className="mt-1 break-words text-xs text-muted">{branch.neighborhood ?? '—'}</p></div><StatusBadge value={branch.status} /></div><MobileDetails><MobileDetail label={mobile.establishment}>{branch.establishment?.name ?? '—'}</MobileDetail><MobileDetail label={mobile.city}>{branch.city ?? '—'}</MobileDetail><MobileDetail label={mobile.main}>{branch.is_main ? <span className="text-answer">{mobile.yes}</span> : <span className="text-muted">{mobile.no}</span>}</MobileDetail></MobileDetails></MobileCard>)}</MobileCardList>
          <div className="hidden lg:block"><TableWrap><table className="min-w-[760px] w-full border-collapse"><TableHeader><th className="px-4 py-3">{content.table.branch}</th><th className="px-4 py-3">{content.table.establishment}</th><th className="px-4 py-3">{content.table.city}</th><th className="px-4 py-3">{content.table.status}</th><th className="px-4 py-3">{content.table.main}</th></TableHeader><tbody className="divide-y divide-line">{section.result.data.map((branch) => <tr key={branch.id}><TableCell><TableTitle>{branch.name}</TableTitle><p className="mt-1 text-xs text-muted">{branch.neighborhood ?? '—'}</p></TableCell><TableCell>{branch.establishment?.name ?? '—'}</TableCell><TableCell>{branch.city ?? '—'}</TableCell><TableCell><StatusBadge value={branch.status} /></TableCell><TableCell>{branch.is_main ? <span className="text-answer">{mobile.yes}</span> : <span className="text-muted">{mobile.no}</span>}</TableCell></tr>)}</tbody></table></TableWrap></div>
        </>}
        {section.result.totalCount > 0 && <PaginationControls {...section.result} labels={copy.pagination} disabled={loading} onPageChange={section.onPageChange} />}
      </section>
    ))}
  </div>
}

export function AdminPage() {
  const { locale } = useI18n()
  const { profile, loading: accountLoading } = useAccount()

  if (accountLoading) return <AccountLoading />
  const [activeTab, setActiveTab] = useState<AdminTab>(() => {
    const requested = new URLSearchParams(window.location.search).get('tab')
    return tabs.some((tab) => tab.id === requested) ? requested as AdminTab : 'dashboard'
  })
  const [loading, setLoading] = useState<Partial<Record<AdminTab, boolean>>>({})
  const [errors, setErrors] = useState<Partial<Record<AdminTab, string>>>({})
  const [warnings, setWarnings] = useState<Partial<Record<AdminTab, string>>>({})
  const [overview, setOverview] = useState<AdminOverview | null>(null)
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null)
  const [requests, setRequests] = useState<PaginatedResult<AdminMissingRequest>>(() => emptyPage())
  const [discoveries, setDiscoveries] = useState<PaginatedResult<AdminExternalPlaceDiscovery>>(() => emptyPage())
  const [users, setUsers] = useState<PaginatedResult<AdminUser>>(() => emptyPage())
  const [userFilters, setUserFilters] = useState<{
    search: string
    role: AdminUserRoleFilter
    status: AdminUserStatusFilter
  }>({ search: '', role: 'all', status: 'all' })
  const [wallets, setWallets] = useState<PaginatedResult<AdminWallet>>(() => emptyPage())
  const [recharges, setRecharges] = useState<AdminRechargeRequest[]>([])
  const [rechargeModule, setRechargeModule] = useState<AdminRechargeModule>('not-connected')
  const [searchLogs, setSearchLogs] = useState<PaginatedResult<AdminSearchLog>>(() => emptyPage())
  const [services, setServices] = useState<AdminServices | null>(null)
  const [submissions, setSubmissions] = useState<PaginatedResult<BusinessSubmissionSummary>>(() => emptyPage())
  const [pages, setPages] = useState<Record<AdminListPage, number>>({
    requests: 1, discoveries: 1, users: 1, wallets: 1, ledger: 1, searchLogs: 1, categories: 1, establishments: 1, branches: 1, submissions: 1,
  })
  const [rechargeRequested, setRechargeRequested] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const isSuperAdmin = profile?.role === 'super_admin'
  const copy = adminCopy[locale]

  const setPage = useCallback((target: AdminListPage, page: number) => {
    setPages((current) => ({ ...current, [target]: page }))
  }, [])

  const setUsersFilters = useCallback((filters: {
    search: string
    role: AdminUserRoleFilter
    status: AdminUserStatusFilter
  }) => {
    setUserFilters(filters)
    setPage('users', 1)
  }, [setPage])

  const load = useCallback(async (target: AdminTab) => {
    setLoading((value) => ({ ...value, [target]: true }))
    setErrors((value) => ({ ...value, [target]: undefined }))
    setWarnings((value) => ({ ...value, [target]: undefined }))
    if (target === 'dashboard') {
      // Les services alimentent deux alertes (établissements sans agence, agences
      // sans coordonnées). Leur échec ne doit pas masquer les compteurs.
      const [result, servicesResult, analyticsResult] = await Promise.all([
        getAdminOverview(),
        getAdminServices(),
        getAdminAnalytics(),
      ])
      setOverview(result.data)
      if (servicesResult.data) setServices(servicesResult.data)
      // Les analytics sont un complément : leur échec ne doit pas vider le tableau de bord.
      setAnalytics(analyticsResult.data)
      if (result.error) {
        const error = result.error
        setErrors((value) => ({ ...value, dashboard: error }))
      }
    }
    if (target === 'requests') {
      const result = await getAdminMissingRequests({ page: pages.requests, pageSize: DEFAULT_PAGE_SIZE })
      setRequests(result.data)
      if (result.warning) {
        const warning = result.warning
        setWarnings((value) => ({ ...value, requests: warning }))
      }
      if (result.error) {
        const error = result.error
        setErrors((value) => ({ ...value, requests: error }))
      }
    }
    if (target === 'discoveries') {
      const result = await getAdminExternalPlaceDiscoveries({ page: pages.discoveries, pageSize: DEFAULT_PAGE_SIZE })
      setDiscoveries(result.data)
      if (result.warning) {
        const warning = result.warning
        setWarnings((value) => ({ ...value, discoveries: warning }))
      }
      if (result.error) {
        const error = result.error
        setErrors((value) => ({ ...value, discoveries: error }))
      }
    }
    if (target === 'users') {
      const result = await getAdminUsers({ page: pages.users, pageSize: DEFAULT_PAGE_SIZE, ...userFilters })
      setUsers(result.data)
      if (result.error) {
        const error = result.error
        setErrors((value) => ({ ...value, users: error }))
      }
    }
    if (target === 'credits') {
      const walletResult = await getAdminWallets({ page: pages.wallets, pageSize: DEFAULT_PAGE_SIZE })
      const rechargeResult = await getAdminRechargeStates(walletResult.data.data.map((wallet) => wallet.user_id))
      setWallets(walletResult.data)
      setRecharges(rechargeResult.data)
      setRechargeModule(rechargeResult.module)
      if (walletResult.warning) {
        const warning = walletResult.warning
        setWarnings((value) => ({ ...value, credits: warning }))
      }
      const error = walletResult.error ?? rechargeResult.error
      if (error) setErrors((value) => ({ ...value, credits: error }))
    }
    if (target === 'search-logs') {
      const result = await getAdminSearchLogs({ page: pages.searchLogs, pageSize: DEFAULT_PAGE_SIZE })
      setSearchLogs(result.data)
      if (result.warning) {
        const warning = result.warning
        setWarnings((value) => ({ ...value, 'search-logs': warning }))
      }
      if (result.error) {
        const error = result.error
        setErrors((value) => ({ ...value, 'search-logs': error }))
      }
    }
    if (target === 'services') {
      const result = await getAdminServices({
        categories: { page: pages.categories, pageSize: DEFAULT_PAGE_SIZE },
        establishments: { page: pages.establishments, pageSize: DEFAULT_PAGE_SIZE },
        branches: { page: pages.branches, pageSize: DEFAULT_PAGE_SIZE },
      })
      setServices(result.data)
      if (result.error) {
        const error = result.error
        setErrors((value) => ({ ...value, services: error }))
      }
    }
    if (target === 'submissions') {
      const result = await adminListBusinessSubmissions({ page: pages.submissions, pageSize: DEFAULT_PAGE_SIZE })
      setSubmissions(result.data)
      if (result.error) {
        const error = result.error
        setErrors((value) => ({ ...value, submissions: error }))
      }
    }
    setLoading((value) => ({ ...value, [target]: false }))
  }, [pages, userFilters])

  useEffect(() => {
    void load(activeTab)
  }, [activeTab, load])

  useEffect(() => {
    if (!rechargeRequested || activeTab !== 'dashboard' || loading.dashboard) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('admin-recharges')?.scrollIntoView({ block: 'start' })
      setRechargeRequested(false)
    })
    return () => window.cancelAnimationFrame(frame)
  }, [activeTab, loading.dashboard, rechargeRequested])

  /** Renvoie le message d'erreur pour que la vue Demandes affiche son propre retour inline. */
  const saveRequest = async (request: AdminMissingRequest, status: MissingServiceRequestStatus, adminNote: string) => {
    const result = await updateMissingRequestStatus({ id: request.id, status, adminNote })
    if (result.error || !result.data) {
      const message = copy.requests.requestUpdateFailed
      setErrors((value) => ({ ...value, requests: message }))
      return message
    }
    setRequests((value) => ({
      ...value,
      data: value.data.map((item) => item.id === request.id ? result.data as AdminMissingRequest : item),
    }))
    if (result.warning) {
      const warning = result.warning
      setWarnings((value) => ({ ...value, requests: warning }))
    }
    void load('dashboard')
    return null
  }

  const createEstablishment = async (params: AdminCreateEstablishmentParams) => {
    const result = await adminCreateEstablishment(params)
    if (result.error || !result.data) {
      setErrors((value) => ({ ...value, requests: copy.requests.serviceAddFailed }))
      return null
    }

    if (params.sourceRequestId) await load('requests')
    void load('services')
    void load('dashboard')
    return result.data
  }

  const saveUserStatus = async (user: AdminUser, status: 'active' | 'suspended') => {
    const result = await adminUpdateUserStatus({ userId: user.id, status })
    if (result.error || !result.data) return result.error ?? 'User status update failed.'

    setUsers((value) => ({ ...value, data: value.data.map((item) => item.id === user.id ? result.data as AdminUser : item) }))
    void load('dashboard')
    return null
  }

  const approveSubmission = async (submission: BusinessSubmissionSummary) => {
    const result = await adminApproveBusinessSubmission(submission.id)
    if (result.error) return result.error
    setSubmissions((value) => ({
      ...value,
      data: value.data.map((item) => item.id === submission.id ? { ...item, status: 'approved' } : item),
    }))
    void load('dashboard')
    return null
  }

  const rejectSubmission = async (submission: BusinessSubmissionSummary, adminNote: string) => {
    const result = await adminRejectBusinessSubmission(submission.id, adminNote)
    if (result.error) return result.error
    setSubmissions((value) => ({
      ...value,
      data: value.data.map((item) => item.id === submission.id ? { ...item, status: 'rejected' } : item),
    }))
    void load('dashboard')
    return null
  }

  const importDiscovery = async (
    discovery: AdminExternalPlaceDiscovery,
    input: Omit<AdminExternalPlaceImportInput, 'discoveryId'>,
  ): Promise<AdminExternalPlaceImportSubmitResult> => {
    const result = await adminImportExternalPlaceDiscovery({ discoveryId: discovery.id, ...input })
    if (result.error || !result.data.ok) {
      return { error: result.data.status || 'unavailable', status: result.data.status || 'unavailable' }
    }

    setDiscoveries((value) => ({
      ...value,
      data: value.data.map((item) => item.id === discovery.id ? {
        ...item,
        source_status: 'imported',
        place_types: input.selectedTypes,
      } : item),
    }))
    if (result.data.status === 'imported') void load('services')
    void load('dashboard')
    return { error: null, status: result.data.status }
  }

  const rejectDiscovery = async (discovery: AdminExternalPlaceDiscovery) => {
    const result = await adminRejectExternalPlaceDiscovery(discovery.id)
    if (result.error || !result.data.ok) return result.data.status || 'unavailable'

    setDiscoveries((value) => ({
      ...value,
      data: value.data.map((item) => item.id === discovery.id ? { ...item, source_status: 'rejected' } : item),
    }))
    void load('dashboard')
    return null
  }

  const activeLabel = copy.tabs[activeTab]
  const adminRole = isSuperAdmin ? copy.header.superAdmin : copy.header.admin
  const activeError = errors[activeTab]
  let activeErrorText = activeError
  if (activeTab === 'discoveries' && activeError) {
    activeErrorText = activeError === 'backend_update_required'
      ? copy.discoveries.backendUpdateRequired
      : copy.discoveries.actionFailed
  }
  const openRechargePanel = () => {
    setRechargeRequested(true)
    setActiveTab('dashboard')
  }

  const endSession = async () => {
    setSigningOut(true)
    await signOut()
    window.location.replace('/')
  }

  return (
    <AppShell
      documentTitle={copy.header.product}
      adminBar={{
        productLabel: copy.header.product,
        sectionLabel: activeLabel,
        roleLabel: adminRole,
        sidebarCollapsed,
        mobileSidebarOpen,
        desktopToggleLabel: sidebarCollapsed ? copy.sidebar.expand : copy.sidebar.collapse,
        mobileToggleLabel: copy.sidebar.menu,
        onDesktopSidebarToggle: () => setSidebarCollapsed((value) => !value),
        onMobileSidebarToggle: () => setMobileSidebarOpen(true),
      }}
    >
      <>
      <main id="app-main" className={`${appWrap} pb-24 pt-4 sm:pt-5 lg:pb-12 lg:pt-5`}>
        <div className={`lg:grid lg:items-start lg:gap-6 ${sidebarCollapsed ? 'lg:grid-cols-[5rem_minmax(0,1fr)]' : 'lg:grid-cols-[17rem_minmax(0,1fr)]'}`}>
          <AdminSidebar tabs={tabs} activeTab={activeTab} collapsed={sidebarCollapsed} mobileOpen={mobileSidebarOpen} isSuperAdmin={isSuperAdmin} signingOut={signingOut} onMobileOpenChange={setMobileSidebarOpen} onSelectTab={setActiveTab} onSelectRecharge={openRechargePanel} onSignOut={() => void endSession()} superAdminHref={isSuperAdmin ? '/super-admin' : undefined} />

          <section className="min-w-0" aria-label={activeLabel}>
          {activeErrorText && <InlineAlert tone="error" title={copy.header.dataErrorTitle} className="mb-5">{activeErrorText} {copy.header.dataErrorText}</InlineAlert>}
          {warnings[activeTab] && <InlineAlert tone="info" title={copy.content.partialProfilesUnavailable} className="mb-5">{warnings[activeTab]}</InlineAlert>}
          {activeTab === 'dashboard' && <AdminDashboard overview={overview} services={services} analytics={analytics} loading={Boolean(loading.dashboard)} />}
          {activeTab === 'requests' && <AdminRequests requests={requests.data} pagination={requests} loading={Boolean(loading.requests)} onSave={saveRequest} onCreateEstablishment={createEstablishment} onPageChange={(page) => setPage('requests', page)} displayName={(user) => personName(user, locale)} />}
          {activeTab === 'discoveries' && <AdminDiscoveriesView discoveries={discoveries.data} pagination={discoveries} loading={Boolean(loading.discoveries)} onPageChange={(page) => setPage('discoveries', page)} onImport={importDiscovery} onReject={rejectDiscovery} />}
          {activeTab === 'users' && <AdminUsers users={users.data} pagination={users} loading={Boolean(loading.users)} currentRole="admin" filters={userFilters} onFiltersChange={setUsersFilters} onPageChange={(page) => setPage('users', page)} onStatusChange={saveUserStatus} onRoleChange={async () => copy.users.superAdminRequired} displayName={(user) => personName(user, locale)} />}
          {activeTab === 'credits' && <AdminCredits wallets={wallets.data} pagination={wallets} loading={Boolean(loading.credits)} recharges={recharges} rechargeModule={rechargeModule} onPageChange={(page) => setPage('wallets', page)} onRefresh={() => void load('credits')} displayName={(user) => personName(user, locale)} />}
          {activeTab === 'search-logs' && <SearchLogsView logs={searchLogs.data} pagination={searchLogs} loading={Boolean(loading['search-logs'])} onPageChange={(page) => setPage('searchLogs', page)} />}
          {activeTab === 'services' && <ServicesView services={services} loading={Boolean(loading.services)} onCategoryPageChange={(page) => setPage('categories', page)} onEstablishmentPageChange={(page) => setPage('establishments', page)} onBranchPageChange={(page) => setPage('branches', page)} />}
          {activeTab === 'submissions' && <AdminBusinessSubmissions submissions={submissions.data} pagination={submissions} loading={Boolean(loading.submissions)} onApprove={approveSubmission} onReject={rejectSubmission} onPageChange={(page) => setPage('submissions', page)} />}
          </section>
        </div>
      </main>
      <AdminBottomNav activeTab={activeTab} signingOut={signingOut} onSelectTab={setActiveTab} onSignOut={() => void endSession()} />
      </>
    </AppShell>
  )
}

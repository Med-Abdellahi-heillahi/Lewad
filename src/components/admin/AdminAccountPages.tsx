import { useState } from 'react'
import { CalendarDays, Home, Mail, Phone, Shield, ShieldCheck, UserRound } from 'lucide-react'
import { useI18n } from '../../i18n'
import { useAccount } from '../../hooks/useAccount'
import { signOut } from '../../lib/auth'
import { contact } from '../../lib/content'
import type { Db1Profile } from '../../lib/db1'
import { formatDate, initialOf, profileDisplayName } from '../../lib/format'
import { appWrap, btnGhost, card, pill } from '../../lib/ui'
import { AppShell } from '../shell/AppShell'
import { InlineAlert, Skeleton } from '../system/States'
import { AppearanceSettings, PasswordResetSettings } from '../settings/SettingsControls'
import { adminCopy } from './adminCopy'
import { AdminBottomNav } from './AdminBottomNav'
import { SuperAdminBottomNav } from '../super-admin/SuperAdminBottomNav'

/**
 * Pages compte des espaces admin et super admin.
 *
 * Un membre de l'équipe qui ouvre « Profil » ou « Paramètres » depuis `/admin`
 * ou `/super-admin` doit rester dans son espace : ces pages gardent le bandeau
 * d'administration et proposent un retour explicite vers l'espace concerné,
 * plus un unique pont assumé vers l'espace membre (« Espace user »).
 *
 * Le profil est en lecture seule : l'édition reste dans `/profile`, la seule
 * page qui écrit le profil, via `updateMyProfile`. Aucune écriture n'est
 * ajoutée ici — ni rôle, ni statut, ni profil.
 */

export type AdminAccountSpace = 'admin' | 'super-admin'
export type AdminAccountPageName = 'profile' | 'settings'

function roleLabel(role: Db1Profile['role'], status: Record<string, string>) {
  return status[role] ?? role.replaceAll('_', ' ')
}

function DetailRow({ icon: LeadIcon, label, value, ltr = false }: { icon: typeof Mail; label: string; value: string; ltr?: boolean }) {
  return (
    <div className="bg-surface px-4 py-3.5">
      <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted">
        <LeadIcon size={13} aria-hidden />
        {label}
      </dt>
      <dd dir={ltr ? undefined : 'auto'} className={`mt-1.5 text-sm font-semibold break-words text-ink ${ltr ? 'ltr-isolate' : ''}`}>{value}</dd>
    </div>
  )
}

function AdminIdentityCard({ profile, displayName, email }: { profile: Db1Profile; displayName: string; email: string | null }) {
  const { locale } = useI18n()
  const copy = adminCopy[locale].account
  const statusLabels = adminCopy[locale].content.status
  const active = profile.status === 'active'
  const none = copy.notProvided

  return (
    <section className={`${card} overflow-hidden`} aria-label={copy.identity}>
      <div className="flex items-center gap-4 border-b border-line bg-page-alt p-5 sm:p-6">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand text-2xl font-bold text-brand-ink">
          {profile.avatar_url
            ? <img src={profile.avatar_url} alt="" className="size-full object-cover" />
            : initialOf(displayName)}
        </span>
        <div className="min-w-0">
          <h2 dir="auto" className="truncate text-lg font-bold text-ink sm:text-xl">{displayName}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`${pill} bg-surface-2 text-ink-soft`}>
              <Shield size={12} aria-hidden />
              {roleLabel(profile.role, statusLabels)}
            </span>
            <span className={`${pill} ${active ? 'bg-answer-bg text-answer' : 'bg-ask-bg text-ask'}`}>
              <span aria-hidden className={`size-1.5 rounded-full ${active ? 'bg-answer' : 'bg-ask'}`} />
              {statusLabels[profile.status] ?? profile.status}
            </span>
          </div>
        </div>
      </div>

      <dl className="grid gap-px bg-line sm:grid-cols-2">
        <DetailRow icon={UserRound} label={copy.fullName} value={profile.full_name?.trim() || none} />
        <DetailRow icon={UserRound} label={copy.arabicName} value={profile.full_name_ar?.trim() || none} />
        <DetailRow icon={Mail} label={copy.email} value={email ?? none} ltr />
        <DetailRow icon={Phone} label={copy.phone} value={profile.phone?.trim() || none} ltr />
        <DetailRow icon={CalendarDays} label={copy.createdAt} value={formatDate(profile.created_at, locale)} />
      </dl>
    </section>
  )
}

export function AdminAccountPage({ space, page }: { space: AdminAccountSpace; page: AdminAccountPageName }) {
  const { locale } = useI18n()
  const { user, profile, loading, profileError, refresh, authFullName } = useAccount()
  const copy = adminCopy[locale]
  const account = copy.account
  const isSuperAdminSpace = space === 'super-admin'
  const [signingOut, setSigningOut] = useState(false)

  const title = page === 'profile'
    ? (isSuperAdminSpace ? account.superAdminProfile : account.adminProfile)
    : (isSuperAdminSpace ? account.superAdminSettings : account.adminSettings)
  const subtitle = page === 'profile' ? account.profileSubtitle : account.settingsSubtitle
  const backHref = isSuperAdminSpace ? '/super-admin' : '/admin'
  const backLabel = isSuperAdminSpace ? account.backToSuperAdmin : account.backToAdmin

  const displayName = profileDisplayName(profile, locale, authFullName) ?? user?.email ?? copy.content.unnamedUser
  const email = profile?.email ?? user?.email ?? null
  const statusLabels = copy.content.status

  const endSession = async () => {
    setSigningOut(true)
    await signOut()
    window.location.replace('/')
  }

  return (
    <AppShell
      documentTitle={title}
      skipLabel={title}
      adminBar={{
        productLabel: isSuperAdminSpace ? copy.superSpace.title : copy.header.product,
        sectionLabel: title,
        roleLabel: isSuperAdminSpace ? copy.header.superAdmin : copy.header.admin,
      }}
    >
      <main id="app-main" className={`${appWrap} pb-24 pt-5 sm:pt-6`}>
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-[26px] leading-tight font-bold tracking-tight text-ink sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{subtitle}</p>
          </div>
          {/* Retour vers l'espace d'origine, puis l'unique pont vers l'espace membre. */}
          <div className="flex shrink-0 flex-wrap gap-2">
            <a href={backHref} className={btnGhost}>
              <span className="rtl:rotate-180"><ShieldCheck size={16} aria-hidden /></span>
              {backLabel}
            </a>
            <a href="/app" className={btnGhost}>
              <Home size={16} aria-hidden />
              {account.userSpace}
            </a>
          </div>
        </header>

        <div className="mt-6 grid gap-5">
          {page === 'profile' ? (
            loading && !profile ? (
              <div className={`${card} p-6`} role="status" aria-busy="true">
                <Skeleton className="size-16 rounded-2xl" />
                <Skeleton className="mt-5 h-5 w-40" />
                <Skeleton className="mt-3 h-4 w-52" />
              </div>
            ) : !profile ? (
              <InlineAlert
                tone="error"
                action={<button type="button" className={btnGhost} onClick={() => void refresh()}>{copy.access.retry}</button>}
              >
                {profileError ? copy.access.unavailableText : copy.content.unknownUser}
              </InlineAlert>
            ) : (
              <>
                <AdminIdentityCard profile={profile} displayName={displayName} email={email} />

                {isSuperAdminSpace && (
                  <section className={`${card} p-5 sm:p-6`}>
                    <h2 className="text-base font-bold text-ink">{account.platformRole}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted">{account.platformRoleText}</p>
                  </section>
                )}

                <p className="text-xs leading-5 text-muted">{account.editHint}</p>
              </>
            )
          ) : (
            <>
              {/* Admin Account Identity */}
              <section className={`${card} overflow-hidden`} aria-label={account.identity}>
                <div className="flex items-center gap-4 border-b border-line bg-page-alt p-5 sm:p-6">
                  <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand text-2xl font-bold text-brand-ink">
                    {profile?.avatar_url
                      ? <img src={profile.avatar_url} alt="" className="size-full object-cover" />
                      : initialOf(displayName)}
                  </span>
                  <div className="min-w-0">
                    <h2 dir="auto" className="truncate text-lg font-bold text-ink sm:text-xl">{displayName}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`${pill} bg-surface-2 text-ink-soft`}>
                        <Shield size={12} aria-hidden />
                        {roleLabel(profile?.role ?? 'admin', statusLabels)}
                      </span>
                      {profile?.status && (
                        <span className={`${pill} ${profile.status === 'active' ? 'bg-answer-bg text-answer' : 'bg-ask-bg text-ask'}`}>
                          <span aria-hidden className={`size-1.5 rounded-full ${profile.status === 'active' ? 'bg-answer' : 'bg-ask'}`} />
                          {statusLabels[profile.status] ?? profile.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid gap-px bg-line sm:grid-cols-2">
                  {email && (
                    <div className="bg-surface px-4 py-3.5">
                      <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Mail size={13} aria-hidden />{account.email}</dt>
                      <dd className="mt-1.5 text-sm font-semibold break-words text-ink ltr-isolate">{email}</dd>
                    </div>
                  )}
                  {profile?.phone && (
                    <div className="bg-surface px-4 py-3.5">
                      <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Phone size={13} aria-hidden />{account.phone}</dt>
                      <dd className="mt-1.5 text-sm font-semibold break-words text-ink ltr-isolate">{profile.phone}</dd>
                    </div>
                  )}
                  {profile?.created_at && (
                    <div className="bg-surface px-4 py-3.5">
                      <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><CalendarDays size={13} aria-hidden />{account.createdAt}</dt>
                      <dd className="mt-1.5 text-sm font-semibold break-words text-ink">{formatDate(profile.created_at, locale)}</dd>
                    </div>
                  )}
                </div>
                <div className="border-t border-line bg-page-alt px-4 py-3">
                  <a href="/admin/profile" className={btnGhost}>
                    <ShieldCheck size={16} aria-hidden />
                    {account.backToAdmin} — {account.platformRole}
                  </a>
                </div>
              </section>

              <AppearanceSettings />
              <PasswordResetSettings userEmail={email} />

              {/* Lewad Contact */}
              <section className={`${card} p-5 sm:p-6`}>
                <h2 className="text-lg font-bold tracking-tight text-ink">{locale === 'ar' ? 'التواصل' : locale === 'en' ? 'Contact' : 'Contact'}</h2>
                <p className="mt-1 text-sm text-muted">{locale === 'ar' ? 'معلومات التواصل مع فريق لواد.' : locale === 'en' ? 'Lewad team contact details.' : 'Coordonnées de l\'équipe Lewad.'}</p>
                <dl className="mt-4 grid gap-px bg-line sm:grid-cols-2">
                  <div className="bg-surface px-4 py-3.5">
                    <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Phone size={13} aria-hidden />{locale === 'ar' ? 'الهاتف' : locale === 'en' ? 'Phone' : 'Téléphone'}</dt>
                    <dd className="mt-1.5 text-sm font-semibold text-ink ltr-isolate">{contact.phoneDisplay}</dd>
                  </div>
                  <div className="bg-surface px-4 py-3.5">
                    <dt className="flex items-center gap-1.5 text-xs font-semibold text-muted"><Mail size={13} aria-hidden />{locale === 'ar' ? 'البريد الإلكتروني' : locale === 'en' ? 'Email' : 'E-mail'}</dt>
                    <dd className="mt-1.5 text-sm font-semibold text-ink ltr-isolate">{contact.email}</dd>
                  </div>
                </dl>
              </section>

              {/* System Info */}
              <section className={`${card} p-5 sm:p-6`}>
                <h2 className="text-lg font-bold tracking-tight text-ink">{locale === 'ar' ? 'معلومات النظام' : locale === 'en' ? 'System info' : 'Informations système'}</h2>
                <p className="mt-1 text-sm text-muted">{locale === 'ar' ? 'معلومات تقنية عن النسخة الحالية.' : locale === 'en' ? 'Technical details about the current version.' : 'Informations techniques sur la version actuelle.'}</p>
                <dl className="mt-4 grid gap-px bg-line sm:grid-cols-2">
                  <div className="bg-surface px-4 py-3.5">
                    <dt className="text-xs font-semibold text-muted">{locale === 'ar' ? 'الإصدار' : locale === 'en' ? 'Version' : 'Version'}</dt>
                    <dd className="mt-1.5 text-sm font-semibold text-ink">Lewad V1</dd>
                  </div>
                  <div className="bg-surface px-4 py-3.5">
                    <dt className="text-xs font-semibold text-muted">{locale === 'ar' ? 'دورك' : locale === 'en' ? 'Your role' : 'Votre rôle'}</dt>
                    <dd className="mt-1.5 text-sm font-semibold text-ink">{roleLabel(profile?.role ?? 'admin', statusLabels)}</dd>
                  </div>
                </dl>
              </section>
            </>
          )}
        </div>
      </main>

      {/* Mobile bottom nav — context-aware: admin or super-admin space. */}
      {isSuperAdminSpace ? (
        <SuperAdminBottomNav activeTab="settings" signingOut={signingOut} onSelectTab={() => {}} onSignOut={() => void endSession()} activeItem={page} />
      ) : (
        <AdminBottomNav activeTab="dashboard" signingOut={signingOut} onSelectTab={() => {}} onSignOut={() => void endSession()} activeItem={page} />
      )}
    </AppShell>
  )
}

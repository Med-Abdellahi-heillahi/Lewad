import { useEffect, type ReactNode } from 'react'
import { useI18n } from '../../i18n'
import { useAccount } from '../../hooks/useAccount'
import { appPad, appWrap, btnGhost, btnPrimary, card } from '../../lib/ui'
import { Icon } from '../Icon'
import { AppShell } from '../shell/AppShell'
import { SessionLoading } from '../system/SessionLoading'
import { adminCopy } from './adminCopy'

function AdminAccessPage({ unavailable = false, onRetry }: { unavailable?: boolean; onRetry?: () => void }) {
  const { locale } = useI18n()
  const copy = adminCopy[locale].access
  const title = unavailable ? copy.unavailableTitle : copy.deniedTitle
  const text = unavailable ? copy.unavailableText : copy.deniedText

  return (
    <AppShell documentTitle={title}>
      <main id="app-main" className={`${appWrap} ${appPad}`}>
        <section className={`${card} mx-auto max-w-xl p-6 text-center sm:p-8`}>
          <span className="mx-auto grid size-12 place-items-center rounded-2xl bg-ask-bg text-ask">
            <Icon name={unavailable ? 'alert' : 'shield'} size={23} />
          </span>
          <h1 className="mt-5 text-2xl font-bold text-ink">{title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted">{text}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {unavailable && onRetry && <button type="button" className={btnPrimary} onClick={onRetry}>{copy.retry}</button>}
            <a href={unavailable ? '/' : '/app'} className={unavailable ? btnGhost : btnPrimary}>{unavailable ? copy.backHome : copy.backToApp}</a>
          </div>
        </section>
      </main>
    </AppShell>
  )
}

/** UI guard only: all reads and mutations remain governed by database policies and RPC checks. */
export function RequireAdmin({ children }: { children: ReactNode }) {
  const { loading, profile, profileError, refresh } = useAccount()
  const { locale } = useI18n()

  if (loading) return <SessionLoading label={adminCopy[locale].access.checking} />
  if (profileError || !profile) return <AdminAccessPage unavailable onRetry={() => void refresh()} />
  if ((profile.role !== 'admin' && profile.role !== 'super_admin') || profile.status !== 'active') return <AdminAccessPage />

  return <>{children}</>
}

function RedirectToRoleSpace({ destination }: { destination: '/admin' | '/app' }) {
  const { locale } = useI18n()

  useEffect(() => {
    window.location.replace(destination)
  }, [destination])

  return <SessionLoading label={adminCopy[locale].access.redirecting} />
}

/** Super-admin route UX guard; privileged role changes are still enforced by PostgreSQL. */
export function RequireSuperAdmin({ children }: { children: ReactNode }) {
  const { loading, profile, profileError, refresh } = useAccount()
  const { locale } = useI18n()

  if (loading) return <SessionLoading label={adminCopy[locale].access.checking} />
  if (profileError || !profile) return <AdminAccessPage unavailable onRetry={() => void refresh()} />
  if (profile.role === 'super_admin' && profile.status === 'active') return <>{children}</>

  return <RedirectToRoleSpace destination={profile.role === 'admin' && profile.status === 'active' ? '/admin' : '/app'} />
}

import { Shield, ShieldCheck, UserRound } from 'lucide-react'
import { useI18n } from '../../i18n'
import type { AdminUser } from '../../lib/admin'
import { pill } from '../../lib/ui'
import { adminCopy } from './adminCopy'

export function AdminUserRoleBadge({ role }: { role: AdminUser['role'] }) {
  const { locale } = useI18n()
  const label = adminCopy[locale].content.status[role] ?? role.replaceAll('_', ' ')
  const RoleIcon = role === 'super_admin' ? ShieldCheck : role === 'admin' ? Shield : UserRound
  const tone = role === 'super_admin'
    ? 'border-brand/30 bg-brand text-brand-ink'
    : role === 'admin'
      ? 'border-brand/20 bg-brand-soft text-brand-deep'
      : 'border-line bg-surface-2 text-ink-soft'

  return <span className={`${pill} border ${tone}`}><RoleIcon size={13} aria-hidden />{label}</span>
}

export function AdminUserStatusBadge({ status }: { status: AdminUser['status'] }) {
  const { locale } = useI18n()
  const label = adminCopy[locale].content.status[status] ?? status.replaceAll('_', ' ')
  const tone = status === 'active'
    ? 'border-answer/30 bg-answer-bg text-answer'
    : status === 'suspended'
      ? 'border-ask/30 bg-ask-bg text-ask'
      : 'border-line bg-surface-2 text-ink-soft'

  return <span className={`${pill} border ${tone}`}>{label}</span>
}

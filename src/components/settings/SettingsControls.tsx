import React, { useState } from 'react'
import { Sun, Moon, CheckCircle2, AlertCircle, KeyRound, Send } from 'lucide-react'
import { dictionaries, locales, useI18n } from '../../i18n'
import { FlagIcon } from '../FlagIcon'
import { card } from '../../lib/ui'
import { requestPasswordReset, updateUserPassword } from '../../lib/auth'
import { isValidLewadSignUpPassword } from '../../lib/validation'

function SettingsSection({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className={`${card} p-5 sm:p-6`}>
      <div className="mb-5">
        <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      </div>
      {children}
    </section>
  )
}

function OptionGroup({ label, columns, children }: { label: string; columns: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-ink-soft">{label}</p>
      <div className={`grid ${columns} gap-1 p-1 bg-surface-2 rounded-xl border border-line/60`} role="group" aria-label={label}>
        {children}
      </div>
    </div>
  )
}

function OptionButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-all duration-200 ${selected ? 'bg-surface text-brand-deep shadow-sm border border-line/50' : 'text-muted hover:text-ink hover:bg-surface border border-transparent'}`}
    >
      {children}
    </button>
  )
}

export function AppearanceSettings({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useI18n()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [textSize, setTextSize] = useState<'sm' | 'base' | 'lg' | 'xl'>('base')

  const textSizes = [
    { id: 'sm', label: locale === 'ar' ? 'صغير' : locale === 'en' ? 'Small' : 'Petit' },
    { id: 'base', label: locale === 'ar' ? 'عادي' : locale === 'en' ? 'Normal' : 'Normal' },
    { id: 'lg', label: locale === 'ar' ? 'كبير' : locale === 'en' ? 'Large' : 'Grand' },
    { id: 'xl', label: locale === 'ar' ? 'كبير جداً' : locale === 'en' ? 'Very large' : 'Très grand' },
  ] as const

  return (
    <div className={className}>
      <SettingsSection
        title={locale === 'ar' ? 'المظهر واللغة' : locale === 'en' ? 'Appearance & Language' : 'Apparence & Langue'}
        description={locale === 'ar' ? 'خصّص العرض حسب تفضيلاتك. تُحفظ اختياراتك تلقائياً.' : locale === 'en' ? 'Customise the display to your preferences. Your choices are saved automatically.' : "Personnalisez l'affichage selon vos préférences. Vos choix sont sauvegardés automatiquement."}
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:max-w-3xl">
          <OptionGroup label={locale === 'ar' ? 'لغة الواجهة' : locale === 'en' ? 'Interface language' : "Langue de l'interface"} columns="grid-cols-3">
            {locales.map((item) => (
              <OptionButton key={item} selected={item === locale} onClick={() => setLocale(item)}>
                <FlagIcon locale={item} decorative />
                <span lang={item} className="truncate">{dictionaries[item].meta.label}</span>
              </OptionButton>
            ))}
          </OptionGroup>

          <OptionGroup label={locale === 'ar' ? 'المظهر' : locale === 'en' ? 'Theme' : 'Thème'} columns="grid-cols-2">
            <OptionButton selected={theme === 'light'} onClick={() => setTheme('light')}>
              <Sun size={16} /> {locale === 'ar' ? 'فاتح' : locale === 'en' ? 'Light' : 'Clair'}
            </OptionButton>
            <OptionButton selected={theme === 'dark'} onClick={() => setTheme('dark')}>
              <Moon size={16} /> {locale === 'ar' ? 'داكن' : locale === 'en' ? 'Dark' : 'Sombre'}
            </OptionButton>
          </OptionGroup>

          <div className="sm:col-span-2">
            <OptionGroup label={locale === 'ar' ? 'حجم النص' : locale === 'en' ? 'Text size' : 'Taille du texte'} columns="grid-cols-2 sm:grid-cols-4">
              {textSizes.map((size) => (
                <OptionButton key={size.id} selected={textSize === size.id} onClick={() => setTextSize(size.id)}>
                  {size.label}
                </OptionButton>
              ))}
            </OptionGroup>
          </div>
        </div>
      </SettingsSection>
    </div>
  )
}

function PasswordChangePanel({ userEmail, locale }: { userEmail: string | null; locale: 'fr' | 'ar' | 'en' }) {
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const copy = {
    fr: { title: 'Changer le mot de passe', desc: 'Modifiez votre mot de passe directement.', newLabel: 'Nouveau mot de passe', confirmLabel: 'Confirmer le mot de passe', hint: '8 caractères minimum, au moins 1 lettre et au moins 1 chiffre.', submit: 'Mettre à jour', submitting: 'Mise à jour…', success: 'Mot de passe mis à jour.', errorMismatch: 'Les mots de passe ne correspondent pas.', errorRule: 'Le mot de passe doit contenir au moins 8 caractères, au moins une lettre et au moins un chiffre.', errorGeneric: 'Impossible de mettre à jour le mot de passe. Réessayez.' },
    ar: { title: 'تغيير كلمة المرور', desc: 'عدّل كلمة المرور مباشرة.', newLabel: 'كلمة المرور الجديدة', confirmLabel: 'تأكيد كلمة المرور', hint: '8 أحرف على الأقل، حرف واحد على الأقل، ورقم واحد على الأقل.', submit: 'تحديث', submitting: 'جارٍ التحديث…', success: 'تم تحديث كلمة المرور.', errorMismatch: 'كلمتا المرور غير متطابقتين.', errorRule: 'يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل، وحرف واحد على الأقل، ورقم واحد على الأقل.', errorGeneric: 'تعذر تحديث كلمة المرور. أعد المحاولة.' },
    en: { title: 'Change password', desc: 'Update your password directly.', newLabel: 'New password', confirmLabel: 'Confirm password', hint: 'At least 8 characters, at least 1 letter, and at least 1 digit.', submit: 'Update', submitting: 'Updating…', success: 'Password updated.', errorMismatch: 'Passwords do not match.', errorRule: 'Password must contain at least 8 characters, at least one letter, and at least one digit.', errorGeneric: 'Could not update password. Please try again.' },
  }[locale]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setNotice(null)
    if (!newPw || !isValidLewadSignUpPassword(newPw)) { setNotice({ tone: 'error', text: copy.errorRule }); return }
    if (newPw !== confirmPw) { setNotice({ tone: 'error', text: copy.errorMismatch }); return }
    const submittedPassword = newPw
    // Do not retain submitted credentials while the remote update is in flight,
    // including when the request ultimately fails.
    setNewPw('')
    setConfirmPw('')
    setSubmitting(true)
    try {
      const { error } = await updateUserPassword(submittedPassword)
      if (error) {
        setNotice({ tone: 'error', text: copy.errorGeneric })
      } else {
        setNotice({ tone: 'success', text: copy.success })
      }
    } catch {
      setNotice({ tone: 'error', text: copy.errorGeneric })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <SettingsSection title={copy.title} description={copy.desc}>
      <form className="grid gap-4 sm:grid-cols-2 lg:max-w-3xl" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="new-password" className="mb-2 block text-sm font-semibold text-ink">{copy.newLabel}</label>
          <input id="new-password" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} autoComplete="new-password" className="h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-base text-ink outline-none transition-colors placeholder:text-muted focus:border-brand-deep focus:ring-2 focus:ring-brand-deep/15 sm:text-sm" />
          <p className="mt-2 text-xs leading-5 text-muted">{copy.hint}</p>
        </div>
        <div>
          <label htmlFor="confirm-password" className="mb-2 block text-sm font-semibold text-ink">{copy.confirmLabel}</label>
          <input id="confirm-password" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="new-password" className="h-12 w-full rounded-xl border border-line bg-surface px-3.5 text-base text-ink outline-none transition-colors placeholder:text-muted focus:border-brand-deep focus:ring-2 focus:ring-brand-deep/15 sm:text-sm" />
        </div>
        {notice && (
          <div className={`sm:col-span-2 flex items-start gap-3 rounded-xl p-4 text-sm ${notice.tone === 'success' ? 'bg-answer-bg text-answer border border-answer/20' : 'bg-ask-bg text-ask border border-ask/20'}`}>
            {notice.tone === 'success' ? <CheckCircle2 size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
            <p className="font-medium mt-0.5">{notice.text}</p>
          </div>
        )}
        <div className="sm:col-span-2">
          <button type="submit" disabled={submitting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand/85 disabled:cursor-not-allowed disabled:opacity-45">
            <KeyRound size={16} />
            {submitting ? copy.submitting : copy.submit}
          </button>
        </div>
      </form>
    </SettingsSection>
  )
}

function PasswordResetPanel({ userEmail, locale }: { userEmail: string | null; locale: 'fr' | 'ar' | 'en' }) {
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  const copy = {
    fr: { title: 'Réinitialisation par e-mail', desc: 'Vous ne vous souvenez pas de votre mot de passe actuel ? Envoyez-vous un lien de réinitialisation.', submit: 'Envoyer le lien', sending: 'Envoi…', success: 'Si ce compte existe, un e-mail de réinitialisation sera envoyé.', noEmail: 'Aucun e-mail associé à ce compte.', error: "Impossible d'envoyer l'e-mail. Réessayez plus tard." },
    ar: { title: 'إعادة التعيين بالبريد الإلكتروني', desc: 'لا تتذكر كلمة المرور الحالية؟ أرسل رابطاً لإعادة التعيين.', submit: 'إرسال الرابط', sending: 'جارٍ الإرسال…', success: 'إذا كان هذا الحساب موجودًا، فسيتم إرسال بريد إلكتروني لإعادة التعيين.', noEmail: 'لا يوجد بريد إلكتروني مرتبط بهذا الحساب.', error: 'تعذر إرسال البريد الإلكتروني. أعد المحاولة لاحقاً.' },
    en: { title: 'Email reset', desc: 'Cannot remember your current password? Send yourself a reset link.', submit: 'Send reset link', sending: 'Sending…', success: 'If this account exists, a reset email will be sent.', noEmail: 'No email associated with this account.', error: 'Could not send the email. Please try again later.' },
  }[locale]

  const handleSend = async () => {
    if (!userEmail) { setNotice({ tone: 'error', text: copy.noEmail }); return }
    setSending(true)
    setNotice(null)
    try {
      const { error } = await requestPasswordReset(userEmail, locale)
      setNotice(error ? { tone: 'error', text: copy.error } : { tone: 'success', text: copy.success })
    } catch {
      setNotice({ tone: 'error', text: copy.error })
    } finally {
      setSending(false)
    }
  }

  return (
    <SettingsSection title={copy.title} description={copy.desc}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 lg:max-w-3xl">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-ink">{locale === 'ar' ? 'البريد الإلكتروني' : locale === 'en' ? 'Email' : 'E-mail'}</h3>
          <p className="mt-1 text-sm text-muted break-all ltr-isolate">{userEmail ?? '—'}</p>
        </div>
        <button type="button" disabled={sending || !userEmail} onClick={() => void handleSend()} className="shrink-0 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-brand-ink transition-colors hover:bg-brand/85 disabled:cursor-not-allowed disabled:opacity-45 w-full sm:w-auto">
          <Send size={16} />
          {sending ? copy.sending : copy.submit}
        </button>
      </div>
      {notice && (
        <div className={`mt-4 flex items-start gap-3 rounded-xl p-4 text-sm ${notice.tone === 'success' ? 'bg-answer-bg text-answer border border-answer/20' : 'bg-ask-bg text-ask border border-ask/20'}`}>
          {notice.tone === 'success' ? <CheckCircle2 size={20} className="shrink-0" /> : <AlertCircle size={20} className="shrink-0" />}
          <p className="font-medium mt-0.5">{notice.text}</p>
        </div>
      )}
    </SettingsSection>
  )
}

export function PasswordResetSettings({ userEmail, className = '' }: { userEmail?: string | null; className?: string }) {
  const { locale } = useI18n()

  return (
    <div className={className}>
      <PasswordChangePanel userEmail={userEmail ?? null} locale={locale} />
      <div className="mt-5">
        <PasswordResetPanel userEmail={userEmail ?? null} locale={locale} />
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const { locale } = useI18n()
  const title = locale === 'ar' ? 'الإعدادات العامة' : locale === 'en' ? 'General settings' : 'Paramètres généraux'
  const desc = locale === 'ar' ? 'أدر تفضيلاتك وأمان حسابك.' : locale === 'en' ? 'Manage your preferences and account security.' : 'Gérez vos préférences et la sécurité de votre compte.'

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="text-muted mt-1">{desc}</p>
      </div>
      <AppearanceSettings />
      <PasswordResetSettings />
    </div>
  )
}

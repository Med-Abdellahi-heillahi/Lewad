import { useCallback, useEffect, useRef, useState } from 'react'
import { type Locale, useI18n } from '../i18n'
import { signInWithEmail, signOut, signUpWithEmail, requestPasswordReset, updateUserPassword } from '../lib/auth'
import { useAuthSession } from '../hooks/useAuthSession'
import { appWrap, btnGhost, btnPrimary, card, eyebrow, field, fieldHint, fieldLabel } from '../lib/ui'
import { Icon } from './Icon'
import { InlineAlert } from './system/States'
import { SessionLoading } from './system/SessionLoading'
import { Logo } from './Logo'
import { AppFooter } from './shell/AppFooter'
import { LanguageMenu } from './shell/LanguageMenu'
import { ThemeToggle } from './shell/ThemeToggle'
import { getAuthRedirectDestination, resolvePostLoginDestination } from '../lib/routeAuth'
import { isValidLewadSignUpPassword } from '../lib/validation'

type Mode = 'signIn' | 'signUp' | 'forgotPassword' | 'resetPassword'
type Notice = { type: 'error' | 'success'; text: string } | null

const authCopy = {
  fr: {
    title: 'Connexion', eyebrow: 'Lewad V1', subtitle: 'Connectez-vous pour retrouver votre espace Lewad.', signIn: 'Connexion', signUp: 'Inscription', fullName: 'Nom complet', email: 'Adresse e-mail', password: 'Mot de passe', confirmPassword: 'Confirmer le mot de passe',
    signInButton: 'Se connecter', signUpButton: 'Créer mon compte', backHome: 'Retour à l’accueil', language: 'Choisir la langue', loading: 'Connexion en cours…', createLoading: 'Création en cours…',
    requiredName: 'Veuillez saisir votre nom complet.', requiredEmail: 'Veuillez saisir votre adresse e-mail.', invalidEmail: 'Veuillez saisir une adresse e-mail valide.', requiredPassword: 'Veuillez saisir votre mot de passe.', passwordRule: 'Le mot de passe doit contenir au moins 8 caractères, au moins une lettre et au moins un chiffre.', passwordMismatch: 'Les mots de passe ne correspondent pas.', invalidCredentials: 'Adresse e-mail ou mot de passe incorrect.', accountExists: 'Un compte existe déjà avec cette adresse e-mail.', genericError: 'Une erreur est survenue. Veuillez réessayer.', accountCreated: 'Compte créé. Vous pouvez maintenant utiliser Lewad.', signedIn: 'Connexion réussie. Redirection vers Lewad…', alreadySignedIn: 'Vous êtes déjà connecté.', continueToApp: 'Aller vers Lewad', signOut: 'Se déconnecter', signedOut: 'Vous êtes déconnecté.', showPassword: 'Afficher le mot de passe', hidePassword: 'Masquer le mot de passe', resolvingSpace: 'Préparation de votre espace Lewad…', profileUnavailable: 'Impossible de charger votre profil Lewad. Réessayez dans un instant.', retryProfile: 'Réessayer',
    forgotPassword: 'Mot de passe oublié ?', forgotPasswordTitle: 'Réinitialisation du mot de passe', forgotPasswordDesc: 'Entrez votre adresse e-mail et nous vous enverrons un lien pour définir un nouveau mot de passe.', sendResetLink: 'Envoyer le lien', sendingResetLink: 'Envoi…', resetLinkSent: 'Un e-mail de réinitialisation vous a été envoyé. Vérifiez votre boîte de réception.', resetLinkFailed: 'Impossible d\'envoyer l\'e-mail. Réessayez plus tard.', backToSignIn: 'Retour à la connexion',
    resetPasswordTitle: 'Nouveau mot de passe', resetPasswordDesc: 'Définissez un nouveau mot de passe pour votre compte.', newPassword: 'Nouveau mot de passe', confirmPasswordLabel: 'Confirmer le mot de passe', updatePassword: 'Mettre à jour', updatingPassword: 'Mise à jour…', passwordUpdated: 'Mot de passe mis à jour. Vous pouvez maintenant vous connecter.', passwordUpdateFailed: 'Impossible de mettre à jour le mot de passe. Le lien a peut-être expiré.',
  },
  ar: {
    title: 'تسجيل الدخول', eyebrow: 'Lewad V1', subtitle: 'سجّل الدخول للعودة إلى مساحة Lewad الخاصة بك.', signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب', fullName: 'الاسم الكامل', email: 'البريد الإلكتروني', password: 'كلمة المرور', confirmPassword: 'تأكيد كلمة المرور',
    signInButton: 'تسجيل الدخول', signUpButton: 'إنشاء حسابي', backHome: 'العودة للرئيسية', language: 'اختيار اللغة', loading: 'جارٍ تسجيل الدخول…', createLoading: 'جارٍ إنشاء الحساب…',
    requiredName: 'يرجى إدخال الاسم الكامل.', requiredEmail: 'يرجى إدخال بريدك الإلكتروني.', invalidEmail: 'يرجى إدخال بريد إلكتروني صالح.', requiredPassword: 'يرجى إدخال كلمة المرور.', passwordRule: 'يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل، وحرف واحد على الأقل، ورقم واحد على الأقل.', passwordMismatch: 'كلمتا المرور غير متطابقتين.', invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', accountExists: 'يوجد حساب بهذه البريد الإلكتروني بالفعل.', genericError: 'حدث خطأ. يرجى المحاولة مجددًا.', accountCreated: 'تم إنشاء الحساب. يمكنك الآن استخدام Lewad.', signedIn: 'تم تسجيل الدخول. جارٍ الانتقال إلى Lewad…', alreadySignedIn: 'أنت مسجل الدخول بالفعل.', continueToApp: 'الذهاب إلى Lewad', signOut: 'تسجيل الخروج', signedOut: 'تم تسجيل الخروج.', showPassword: 'إظهار كلمة المرور', hidePassword: 'إخفاء كلمة المرور', resolvingSpace: 'جارٍ تجهيز مساحة Lewad…', profileUnavailable: 'تعذر تحميل ملف Lewad الشخصي. يرجى المحاولة بعد لحظات.', retryProfile: 'إعادة المحاولة',
    forgotPassword: 'نسيت كلمة المرور؟', forgotPasswordTitle: 'إعادة تعيين كلمة المرور', forgotPasswordDesc: 'أدخل بريدك الإلكتروني وسنرسل رابطاً لإعداد كلمة مرور جديدة.', sendResetLink: 'إرسال الرابط', sendingResetLink: 'جارٍ الإرسال…', resetLinkSent: 'تم إرسال بريد إلكتروني لإعادة التعيين. تحقق من صندوق الوارد.', resetLinkFailed: 'تعذر إرسال البريد الإلكتروني. أعد المحاولة لاحقاً.', backToSignIn: 'العودة إلى تسجيل الدخول',
    resetPasswordTitle: 'كلمة مرور جديدة', resetPasswordDesc: 'أعد إعداد كلمة المرور لحسابك.', newPassword: 'كلمة المرور الجديدة', confirmPasswordLabel: 'تأكيد كلمة المرور', updatePassword: 'تحديث', updatingPassword: 'جارٍ التحديث…', passwordUpdated: 'تم تحديث كلمة المرور. يمكنك الآن تسجيل الدخول.', passwordUpdateFailed: 'تعذر تحديث كلمة المرور. ربما انتهت صلاحية الرابط.',
  },
  en: {
    title: 'Sign in', eyebrow: 'Lewad V1', subtitle: 'Sign in to return to your Lewad space.', signIn: 'Sign in', signUp: 'Sign up', fullName: 'Full name', email: 'Email address', password: 'Password', confirmPassword: 'Confirm password',
    signInButton: 'Sign in', signUpButton: 'Create my account', backHome: 'Back to home', language: 'Choose language', loading: 'Signing in…', createLoading: 'Creating account…',
    requiredName: 'Please enter your full name.', requiredEmail: 'Please enter your email address.', invalidEmail: 'Please enter a valid email address.', requiredPassword: 'Please enter your password.', passwordRule: 'Password must contain at least 8 characters, at least one letter, and at least one digit.', passwordMismatch: 'Passwords do not match.', invalidCredentials: 'Incorrect email address or password.', accountExists: 'An account already exists with this email address.', genericError: 'Something went wrong. Please try again.', accountCreated: 'Account created. You can now use Lewad.', signedIn: 'Signed in. Redirecting to Lewad…', alreadySignedIn: 'You are already signed in.', continueToApp: 'Go to Lewad', signOut: 'Sign out', signedOut: 'You have been signed out.', showPassword: 'Show password', hidePassword: 'Hide password', resolvingSpace: 'Preparing your Lewad space…', profileUnavailable: 'Your Lewad profile could not be loaded. Please try again in a moment.', retryProfile: 'Try again',
    forgotPassword: 'Forgot password?', forgotPasswordTitle: 'Password reset', forgotPasswordDesc: 'Enter your email address and we\'ll send you a link to set a new password.', sendResetLink: 'Send reset link', sendingResetLink: 'Sending…', resetLinkSent: 'A password reset email has been sent. Check your inbox.', resetLinkFailed: 'Could not send the email. Please try again later.', backToSignIn: 'Back to sign in',
    resetPasswordTitle: 'New password', resetPasswordDesc: 'Set a new password for your account.', newPassword: 'New password', confirmPasswordLabel: 'Confirm password', updatePassword: 'Update', updatingPassword: 'Updating…', passwordUpdated: 'Password updated. You can now sign in.', passwordUpdateFailed: 'Could not update password. The link may have expired.',
  },
} as const

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AuthPage() {
  const { locale, t } = useI18n()
  const { loading: sessionLoading, isAuthenticated, isRecovery } = useAuthSession()
  const copy = authCopy[locale]
  const requestedDestination = getAuthRedirectDestination()
  const [mode, setMode] = useState<Mode>('signIn')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [resolvingRole, setResolvingRole] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')

  useEffect(() => { document.title = `${copy.title} — Lewad` }, [copy.title])

  /**
   * Visiteur qui arrive sur /auth avec une session déjà valide : on l'envoie
   * directement vers sa destination. Le drapeau ne se déclenche qu'au premier
   * état stabilisé de la session, donc il n'interfère pas avec la redirection
   * qui suit une connexion réussie (à ce moment-là le premier état était
   * « déconnecté »).
   */
  const resolveDestination = useCallback(async () => {
    setResolvingRole(true)
    setNotice(null)
    const resolution = await resolvePostLoginDestination({ redirectTo: requestedDestination })
    setResolvingRole(false)

    if (!resolution.profileLoaded) {
      setNotice({ type: 'error', text: copy.profileUnavailable })
      return null
    }

    return resolution.destination
  }, [copy.profileUnavailable, requestedDestination])

  const settled = useRef(false)
  useEffect(() => {
    if (sessionLoading || settled.current) return
    settled.current = true

    if (isRecovery) {
      setMode('resetPassword')
      return
    }

    if (!isAuthenticated) return

    let active = true
    void resolveDestination().then((nextDestination) => {
      if (!active || !nextDestination) return
      window.location.replace(nextDestination)
    })
    return () => { active = false }
  }, [isAuthenticated, isRecovery, resolveDestination, sessionLoading])

  const validate = () => {
    if (mode === 'signUp' && !fullName.trim()) return copy.requiredName
    if (!email.trim()) return copy.requiredEmail
    if (!emailPattern.test(email.trim())) return copy.invalidEmail
    if (!password) return copy.requiredPassword
    if (mode === 'signUp' && !isValidLewadSignUpPassword(password)) return copy.passwordRule
    if (mode === 'signUp' && password !== confirmation) return copy.passwordMismatch
    return null
  }

  const authError = (message: string) => {
    const normalized = message.toLowerCase()
    if (normalized.includes('invalid login credentials')) return copy.invalidCredentials
    if (normalized.includes('already registered') || normalized.includes('already been registered')) return copy.accountExists
    return copy.genericError
  }

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const validationError = validate()
    if (validationError) { setNotice({ type: 'error', text: validationError }); return }
    const submittedPassword = password
    // Never retain a submitted password while authentication or redirection is in flight.
    setPassword('')
    setConfirmation('')
    setSubmitting(true)
    setNotice(null)

    try {
      if (mode === 'signIn') {
        const { error } = await signInWithEmail({ email: email.trim(), password: submittedPassword })
        if (error) throw error
        const nextDestination = await resolveDestination()
        if (!nextDestination) return
        window.location.replace(nextDestination)
      } else {
        const { data, error } = await signUpWithEmail({ fullName: fullName.trim(), email: email.trim(), password: submittedPassword })
        if (error) throw error
        if (data.session) {
          const nextDestination = await resolveDestination()
          if (!nextDestination) return
          window.location.replace(nextDestination)
        } else {
          setNotice({ type: 'success', text: copy.accountCreated })
          setMode('signIn')
        }
      }
    } catch (error) {
      setNotice({ type: 'error', text: authError(error instanceof Error ? error.message : '') })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSignOut = async () => {
    setSubmitting(true)
    const { error } = await signOut()
    setSubmitting(false)
    setNotice(error ? { type: 'error', text: authError(error.message) } : { type: 'success', text: copy.signedOut })
    // On laisse la confirmation s'afficher un instant, puis retour à l'accueil
    // public — même destination que la déconnexion depuis les pages membre.
    if (!error) window.setTimeout(() => window.location.replace('/'), 700)
  }

  const handleForgotPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!resetEmail.trim()) { setNotice({ type: 'error', text: copy.requiredEmail }); return }
    if (!emailPattern.test(resetEmail.trim())) { setNotice({ type: 'error', text: copy.invalidEmail }); return }
    setSubmitting(true)
    setNotice(null)
    try {
      const { error } = await requestPasswordReset(resetEmail.trim())
      setNotice(error ? { type: 'error', text: copy.resetLinkFailed } : { type: 'success', text: copy.resetLinkSent })
    } catch {
      setNotice({ type: 'error', text: copy.resetLinkFailed })
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newPw) { setNotice({ type: 'error', text: copy.requiredPassword }); return }
    if (!isValidLewadSignUpPassword(newPw)) { setNotice({ type: 'error', text: copy.passwordRule }); return }
    if (newPw !== confirmPw) { setNotice({ type: 'error', text: copy.passwordMismatch }); return }
    const submittedNewPassword = newPw
    setNewPw('')
    setConfirmPw('')
    setSubmitting(true)
    setNotice(null)
    try {
      const { error } = await updateUserPassword(submittedNewPassword)
      if (error) throw error
      setNotice({ type: 'success', text: copy.passwordUpdated })
      await signOut()
      window.setTimeout(() => { setMode('signIn'); setNewPw(''); setConfirmPw('') }, 1500)
    } catch {
      setNotice({ type: 'error', text: copy.passwordUpdateFailed })
    } finally {
      setSubmitting(false)
    }
  }

  const showNeutralLoading = sessionLoading
    || submitting
    || resolvingRole
    || (isAuthenticated && !isRecovery && notice?.type !== 'error')

  if (showNeutralLoading) {
    return <SessionLoading label={resolvingRole || (isAuthenticated && !isRecovery) ? copy.resolvingSpace : copy.loading} />
  }

  return <div className="flex min-h-dvh flex-col bg-page text-ink">
    <header className="border-b border-line bg-page/90 backdrop-blur-md">
      <div className={`${appWrap} flex h-16 items-center justify-between gap-3 sm:h-[72px]`}>
        <a href="/" aria-label="Lewad" className="w-max rounded-lg"><Logo /></a>
        <div className="flex items-center gap-2"><LanguageMenu align="end" /><ThemeToggle /></div>
      </div>
    </header>

    <main className={`${appWrap} flex flex-1 items-center py-8 sm:py-12`}>
      {/* Desktop : la promesse Lewad tient la colonne de gauche, le formulaire
          garde sa largeur de lecture. Mobile : seul le formulaire reste. */}
      <div className="mx-auto grid w-full max-w-md items-center gap-12 lg:max-w-5xl lg:grid-cols-[1fr_28rem]">
        <section className="hidden lg:block">
          <span className={eyebrow}>{copy.eyebrow}</span>
          <p className="mt-6 max-w-md text-3xl leading-[1.2] font-bold tracking-tight text-ink">{t.hero.title}</p>
          <ol className="mt-8 flex list-none flex-wrap items-center gap-x-3 gap-y-2">
            {t.hero.steps.map((step, index) => (
              <li key={step} className="flex items-center gap-3">
                {index > 0 && <span aria-hidden="true" className="text-muted rtl:rotate-180"><Icon name="arrow" size={16} /></span>}
                <span className="rounded-full border border-line bg-surface px-3.5 py-2 text-sm font-semibold text-ink-soft">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-8 max-w-sm text-sm leading-7 text-muted">{copy.subtitle}</p>
        </section>

        <section className={`${card} w-full overflow-hidden`} aria-labelledby="auth-title">
          <div className="border-b border-line bg-page-alt p-6 sm:p-7">
            <span className={`${eyebrow} lg:hidden`}>
              <span className="size-1.5 rounded-full bg-brand-deep dark:bg-brand" />
              {copy.eyebrow}
            </span>
            <h1 id="auth-title" className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl lg:mt-0">
              {mode === 'forgotPassword' ? copy.forgotPasswordTitle : mode === 'resetPassword' ? copy.resetPasswordTitle : copy.title}
            </h1>
            <p className="mt-2.5 text-sm leading-6 text-muted">
              {mode === 'forgotPassword' ? copy.forgotPasswordDesc : mode === 'resetPassword' ? copy.resetPasswordDesc : copy.subtitle}
            </p>
          </div>

          <div className="p-6 sm:p-7">
            {mode === 'forgotPassword' ? (
              <>
                <form className="grid gap-4" onSubmit={handleForgotPassword} noValidate>
                  <Field id="reset-email" label={copy.email} type="email" value={resetEmail} onChange={setResetEmail} autoComplete="email" />
                  {notice && <InlineAlert tone={notice.type === 'success' ? 'success' : 'error'}>{notice.text}</InlineAlert>}
                  <button type="submit" className={`${btnPrimary} mt-1 w-full`} disabled={submitting}>
                    {submitting ? copy.sendingResetLink : copy.sendResetLink}
                  </button>
                </form>
                <div className="mt-4 flex justify-center text-sm">
                  <button type="button" className="inline-flex min-h-11 items-center text-muted transition-colors hover:text-ink" onClick={() => { setMode('signIn'); setNotice(null); setResetEmail('') }}>{copy.backToSignIn}</button>
                </div>
              </>
            ) : mode === 'resetPassword' ? (
              <>
                <form className="grid gap-4" onSubmit={handleResetPassword} noValidate>
                  <Field id="new-pw" label={copy.newPassword} type="password" value={newPw} onChange={setNewPw} autoComplete="new-password" hint={copy.passwordRule} reveal={{ show: copy.showPassword, hide: copy.hidePassword }} />
                  <Field id="confirm-pw" label={copy.confirmPasswordLabel} type="password" value={confirmPw} onChange={setConfirmPw} autoComplete="new-password" reveal={{ show: copy.showPassword, hide: copy.hidePassword }} />
                  {notice && <InlineAlert tone={notice.type === 'success' ? 'success' : 'error'}>{notice.text}</InlineAlert>}
                  <button type="submit" className={`${btnPrimary} mt-1 w-full`} disabled={submitting}>
                    {submitting ? copy.updatingPassword : copy.updatePassword}
                  </button>
                </form>
              </>
            ) : isAuthenticated ? (
              <div>
                {notice?.type === 'error' && <InlineAlert tone="error">{notice.text}</InlineAlert>}
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className={btnPrimary}
                    onClick={() => void resolveDestination().then((nextDestination) => {
                      if (nextDestination) window.location.replace(nextDestination)
                    })}
                  >
                    {copy.retryProfile}
                  </button>
                  <button type="button" className={btnGhost} onClick={() => void handleSignOut()}>{copy.signOut}</button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1" role="tablist" aria-label={copy.title}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'signIn'}
                    onClick={() => { setMode('signIn'); setNotice(null) }}
                    className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${mode === 'signIn' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
                  >
                    {copy.signIn}
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === 'signUp'}
                    onClick={() => { setMode('signUp'); setNotice(null) }}
                    className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${mode === 'signUp' ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink'}`}
                  >
                    {copy.signUp}
                  </button>
                </div>

                <form className="mt-6 grid gap-4" onSubmit={submit} noValidate>
                  {mode === 'signUp' && <Field id="full-name" label={copy.fullName} type="text" value={fullName} onChange={setFullName} autoComplete="name" />}
                  <Field id="email" label={copy.email} type="email" value={email} onChange={setEmail} autoComplete="email" />
                  <Field
                    id="password"
                    label={copy.password}
                    type="password"
                    value={password}
                    onChange={setPassword}
                    autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                    hint={mode === 'signUp' ? copy.passwordRule : undefined}
                    reveal={{ show: copy.showPassword, hide: copy.hidePassword }}
                  />
                  {mode === 'signIn' && (
                    <div className="flex justify-end">
                      <button type="button" className="text-sm font-medium text-brand-deep hover:text-brand transition-colors" onClick={() => { setMode('forgotPassword'); setNotice(null) }}>{copy.forgotPassword}</button>
                    </div>
                  )}
                  {mode === 'signUp' && (
                    <Field
                      id="password-confirmation"
                      label={copy.confirmPassword}
                      type="password"
                      value={confirmation}
                      onChange={setConfirmation}
                      autoComplete="new-password"
                      reveal={{ show: copy.showPassword, hide: copy.hidePassword }}
                    />
                  )}
                  {notice && <InlineAlert tone={notice.type === 'success' ? 'success' : 'error'}>{notice.text}</InlineAlert>}
                  <button type="submit" className={`${btnPrimary} mt-1 w-full`} disabled={submitting}>
                    {submitting ? (mode === 'signIn' ? copy.loading : copy.createLoading) : (mode === 'signIn' ? copy.signInButton : copy.signUpButton)}
                    <span className="rtl:rotate-180"><Icon name="arrow" size={17} /></span>
                  </button>
                </form>
              </>
            )}

            <div className="mt-6 flex justify-center text-sm">
              <a href="/" className="inline-flex min-h-11 items-center text-muted transition-colors hover:text-ink">{copy.backHome}</a>
            </div>
          </div>
        </section>
      </div>
    </main>

    <AppFooter by="By Wasla" version="Version 1.0.0" />
  </div>
}

type RevealLabels = { show: string; hide: string }

function Field({
  id,
  label,
  type,
  value,
  onChange,
  autoComplete,
  hint,
  reveal,
}: {
  id: string
  label: string
  type: 'text' | 'email' | 'password'
  value: string
  onChange: (value: string) => void
  autoComplete: string
  hint?: string
  reveal?: RevealLabels
}) {
  const [visible, setVisible] = useState(false)
  const revealable = type === 'password' && Boolean(reveal)
  const hintId = hint ? `${id}-hint` : undefined

  return (
    <div>
      <label htmlFor={id} className={fieldLabel}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type={revealable && visible ? 'text' : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-describedby={hintId}
          className={`${field} ${revealable ? 'pe-13' : ''} ${type === 'email' ? 'ltr-isolate' : ''}`}
        />
        {revealable && reveal && (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            aria-label={visible ? reveal.hide : reveal.show}
            aria-pressed={visible}
            className="absolute end-0 top-0 grid h-12 w-12 place-items-center rounded-xl text-muted transition-colors hover:text-ink"
          >
            <Icon name={visible ? 'eyeOff' : 'eye'} size={18} />
          </button>
        )}
      </div>
      {hint && <p id={hintId} className={fieldHint}>{hint}</p>}
    </div>
  )
}

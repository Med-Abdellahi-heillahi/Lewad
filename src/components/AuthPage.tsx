import { useCallback, useEffect, useRef, useState } from 'react'
import { type Locale, useI18n } from '../i18n'
import { signInWithEmail, signOut, signUpWithEmail } from '../lib/auth'
import { useAuthSession } from '../hooks/useAuthSession'
import { appWrap, btnGhost, btnPrimary, card, eyebrow, field, fieldHint, fieldLabel, skeleton } from '../lib/ui'
import { Icon } from './Icon'
import { InlineAlert } from './system/States'
import { Logo } from './Logo'
import { AppFooter } from './shell/AppFooter'
import { LanguageMenu } from './shell/LanguageMenu'
import { ThemeToggle } from './shell/ThemeToggle'
import { getAuthRedirectDestination, resolvePostLoginDestination } from '../lib/routeAuth'
import { isValidLewadSignUpPassword } from '../lib/validation'

type Mode = 'signIn' | 'signUp'
type Notice = { type: 'error' | 'success'; text: string } | null

const authCopy = {
  fr: {
    title: 'Connexion', eyebrow: 'Lewad V1', subtitle: 'Connectez-vous pour retrouver votre espace Lewad.', signIn: 'Connexion', signUp: 'Inscription', fullName: 'Nom complet', email: 'Adresse e-mail', password: 'Mot de passe', confirmPassword: 'Confirmer le mot de passe',
    signInButton: 'Se connecter', signUpButton: 'Créer mon compte', backHome: 'Retour à l’accueil', language: 'Choisir la langue', loading: 'Connexion en cours…', createLoading: 'Création en cours…',
    requiredName: 'Veuillez saisir votre nom complet.', requiredEmail: 'Veuillez saisir votre adresse e-mail.', invalidEmail: 'Veuillez saisir une adresse e-mail valide.', requiredPassword: 'Veuillez saisir votre mot de passe.', passwordRule: 'Le mot de passe doit contenir au moins 8 caractères, au moins une lettre et exactement 4 chiffres.', passwordMismatch: 'Les mots de passe ne correspondent pas.', invalidCredentials: 'Adresse e-mail ou mot de passe incorrect.', accountExists: 'Un compte existe déjà avec cette adresse e-mail.', genericError: 'Une erreur est survenue. Veuillez réessayer.', accountCreated: 'Compte créé. Vous pouvez maintenant utiliser Lewad.', signedIn: 'Connexion réussie. Redirection vers Lewad…', alreadySignedIn: 'Vous êtes déjà connecté.', continueToApp: 'Aller vers Lewad', signOut: 'Se déconnecter', signedOut: 'Vous êtes déconnecté.', showPassword: 'Afficher le mot de passe', hidePassword: 'Masquer le mot de passe', resolvingSpace: 'Préparation de votre espace Lewad…', profileUnavailable: 'Impossible de charger votre profil Lewad. Réessayez dans un instant.', retryProfile: 'Réessayer',
  },
  ar: {
    title: 'تسجيل الدخول', eyebrow: 'لواد V1', subtitle: 'سجّل الدخول للعودة إلى مساحة لواد الخاصة بك.', signIn: 'تسجيل الدخول', signUp: 'إنشاء حساب', fullName: 'الاسم الكامل', email: 'البريد الإلكتروني', password: 'كلمة المرور', confirmPassword: 'تأكيد كلمة المرور',
    signInButton: 'تسجيل الدخول', signUpButton: 'إنشاء حسابي', backHome: 'العودة للرئيسية', language: 'اختيار اللغة', loading: 'جارٍ تسجيل الدخول…', createLoading: 'جارٍ إنشاء الحساب…',
    requiredName: 'يرجى إدخال الاسم الكامل.', requiredEmail: 'يرجى إدخال بريدك الإلكتروني.', invalidEmail: 'يرجى إدخال بريد إلكتروني صالح.', requiredPassword: 'يرجى إدخال كلمة المرور.', passwordRule: 'يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل، وحرف واحد على الأقل، و4 أرقام بالضبط.', passwordMismatch: 'كلمتا المرور غير متطابقتين.', invalidCredentials: 'البريد الإلكتروني أو كلمة المرور غير صحيحة.', accountExists: 'يوجد حساب بهذه البريد الإلكتروني بالفعل.', genericError: 'حدث خطأ. يرجى المحاولة مجددًا.', accountCreated: 'تم إنشاء الحساب. يمكنك الآن استخدام لواد.', signedIn: 'تم تسجيل الدخول. جارٍ الانتقال إلى لواد…', alreadySignedIn: 'أنت مسجل الدخول بالفعل.', continueToApp: 'الذهاب إلى لواد', signOut: 'تسجيل الخروج', signedOut: 'تم تسجيل الخروج.', showPassword: 'إظهار كلمة المرور', hidePassword: 'إخفاء كلمة المرور', resolvingSpace: 'جارٍ تجهيز مساحة لواد…', profileUnavailable: 'تعذر تحميل ملف لواد الشخصي. يرجى المحاولة بعد لحظات.', retryProfile: 'إعادة المحاولة',
  },
  en: {
    title: 'Sign in', eyebrow: 'Lewad V1', subtitle: 'Sign in to return to your Lewad space.', signIn: 'Sign in', signUp: 'Sign up', fullName: 'Full name', email: 'Email address', password: 'Password', confirmPassword: 'Confirm password',
    signInButton: 'Sign in', signUpButton: 'Create my account', backHome: 'Back to home', language: 'Choose language', loading: 'Signing in…', createLoading: 'Creating account…',
    requiredName: 'Please enter your full name.', requiredEmail: 'Please enter your email address.', invalidEmail: 'Please enter a valid email address.', requiredPassword: 'Please enter your password.', passwordRule: 'Password must contain at least 8 characters, at least one letter, and exactly 4 digits.', passwordMismatch: 'Passwords do not match.', invalidCredentials: 'Incorrect email address or password.', accountExists: 'An account already exists with this email address.', genericError: 'Something went wrong. Please try again.', accountCreated: 'Account created. You can now use Lewad.', signedIn: 'Signed in. Redirecting to Lewad…', alreadySignedIn: 'You are already signed in.', continueToApp: 'Go to Lewad', signOut: 'Sign out', signedOut: 'You have been signed out.', showPassword: 'Show password', hidePassword: 'Hide password', resolvingSpace: 'Preparing your Lewad space…', profileUnavailable: 'Your Lewad profile could not be loaded. Please try again in a moment.', retryProfile: 'Try again',
  },
} as const

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function AuthPage() {
  const { locale, t } = useI18n()
  const { user, loading: sessionLoading, isAuthenticated } = useAuthSession()
  const copy = authCopy[locale]
  const requestedDestination = getAuthRedirectDestination()
  const [mode, setMode] = useState<Mode>('signIn')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)
  const [resolvedDestination, setResolvedDestination] = useState<string | null>(null)
  const [resolvingRole, setResolvingRole] = useState(false)

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
      setResolvedDestination(null)
      setNotice({ type: 'error', text: copy.profileUnavailable })
      return null
    }

    setResolvedDestination(resolution.destination)
    return resolution.destination
  }, [copy.profileUnavailable, requestedDestination])

  const settled = useRef(false)
  useEffect(() => {
    if (sessionLoading || settled.current) return
    settled.current = true
    if (!isAuthenticated) return

    let active = true
    void resolveDestination().then((nextDestination) => {
      if (!active || !nextDestination) return
      setResolvedDestination(nextDestination)
      window.location.replace(nextDestination)
    })
    return () => { active = false }
  }, [isAuthenticated, resolveDestination, sessionLoading])

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
    setSubmitting(true)
    setNotice(null)

    try {
      if (mode === 'signIn') {
        const { error } = await signInWithEmail({ email: email.trim(), password })
        if (error) throw error
        const nextDestination = await resolveDestination()
        if (!nextDestination) return
        setNotice({ type: 'success', text: copy.signedIn })
        window.setTimeout(() => window.location.assign(nextDestination), 500)
      } else {
        const { data, error } = await signUpWithEmail({ fullName: fullName.trim(), email: email.trim(), password })
        if (error) throw error
        if (data.session) {
          const nextDestination = await resolveDestination()
          if (!nextDestination) return
          setNotice({ type: 'success', text: copy.accountCreated })
          window.setTimeout(() => window.location.assign(nextDestination), 700)
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
            <h1 id="auth-title" className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl lg:mt-0">{copy.title}</h1>
            <p className="mt-2.5 text-sm leading-6 text-muted">{copy.subtitle}</p>
          </div>

          <div className="p-6 sm:p-7">
            {sessionLoading ? (
              <div role="status" aria-busy="true">
                <div className={`h-11 w-full ${skeleton}`} />
                <div className={`mt-4 h-12 w-full ${skeleton}`} />
                <div className={`mt-4 h-12 w-2/3 ${skeleton}`} />
                <span className="sr-only">{copy.loading}</span>
              </div>
            ) : isAuthenticated ? (
              <div>
                {resolvingRole ? (
                  <div className="grid place-items-center gap-4 py-6" role="status" aria-live="polite" aria-busy="true">
                    <span aria-hidden="true" className="size-9 rounded-full border-2 border-brand border-e-transparent motion-safe:animate-spin" />
                    <p className="text-sm text-muted">{copy.resolvingSpace}</p>
                  </div>
                ) : (
                  <InlineAlert tone={notice?.type === 'error' ? 'error' : 'success'} title={notice?.type === 'error' ? undefined : copy.alreadySignedIn}>
                    {notice?.type === 'error' ? notice.text : <span className="ltr-isolate">{user?.email}</span>}
                  </InlineAlert>
                )}
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {resolvedDestination ? (
                    <a href={resolvedDestination} className={btnPrimary}>{copy.continueToApp}<span className="rtl:rotate-180"><Icon name="arrow" size={17} /></span></a>
                  ) : (
                    <button type="button" className={btnPrimary} disabled={resolvingRole} onClick={() => void resolveDestination()}>{copy.retryProfile}</button>
                  )}
                  <button type="button" className={btnGhost} disabled={submitting || resolvingRole} onClick={() => void handleSignOut()}>{copy.signOut}</button>
                </div>
                {notice?.type === 'success' && <div className="mt-4"><InlineAlert tone="success">{notice.text}</InlineAlert></div>}
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

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react'
import { dictionaries, locales, type Locale, useI18n } from '../i18n'
import { updateMyProfile, uploadMyAvatar, type CreditLedgerType, type Db1CreditLedgerEntry, type Db1Profile } from '../lib/db1'
import { useAccount } from '../hooks/useAccount'
import { useCreditLedger } from '../hooks/useCreditLedger'
import { isAllowedAvatarFile, isAvatarFileTooLarge, isValidArabicName, isValidMauritanianPhone, normalizeMauritanianPhone } from '../lib/validation'
import { useTheme } from '../lib/theme'
import { contact as contactDetails } from '../lib/content'
import { formatCurrency, formatDate, formatNumber, formatSignedPoints, initialOf, profileDisplayName } from '../lib/format'
import { isAdminRole } from '../lib/routeAuth'
import {
  appPad,
  appWrap,
  btnGhost,
  btnPrimary,
  card,
  cardMuted,
  field,
  fieldHint,
  fieldLabel,
  fieldReadOnly,
  iconBtn,
  pill,
} from '../lib/ui'
import { Icon, type IconName } from './Icon'
import { AppShell } from './shell/AppShell'
import type { AppNavId } from './shell/appNav'
import { EmptyState, InlineAlert, Skeleton } from './system/States'
import { PaginationControls } from './ui/PaginationControls'

export type PrivatePageName = 'profile' | 'credits' | 'settings' | 'recharge'

/** Tarif manuel de la V1 : 1 point = 20 MRO. Aucun paiement n'est déclenché ici. */
const pricePerPoint = 20

const copy = {
  fr: {
    account: 'Mon compte', pointsUnit: 'points', pointsUnavailable: 'Solde indisponible', retry: 'Réessayer', readOnly: 'Lecture seule', close: 'Fermer',
    profile: 'Profil', profileSubtitle: 'Vos informations Lewad. Elles servent à vous identifier auprès des établissements.', personalInfo: 'Informations personnelles',
    email: 'Adresse e-mail', fullName: 'Nom complet', fullNameAr: 'Nom complet en arabe', fullNameArHint: 'Affiché à la place du nom latin quand Lewad est en arabe.', phone: 'Téléphone', phoneHint: '8 chiffres, commençant par 2, 3 ou 4.',
    avatar: 'Photo de profil', avatarUrl: 'URL de la photo de profil', avatarHint: 'Formats acceptés : PNG, JPG ou JPEG.', chooseImage: 'Choisir une image', avatarUploadNotActive: 'Le téléversement d’image sera activé après la configuration du stockage.',
    saveProfile: 'Enregistrer', savingProfile: 'Enregistrement…', profileUpdated: 'Profil mis à jour.', profileUpdateError: 'Impossible d’enregistrer votre profil pour le moment. Réessayez dans un instant.',
    fullNameRequired: 'Veuillez saisir votre nom complet.', phoneRequired: 'Veuillez saisir votre numéro de téléphone.', invalidPhone: 'Le numéro doit contenir exactement 8 chiffres et commencer par 2, 3 ou 4.', invalidArabicFullName: 'Le nom en arabe doit contenir uniquement des caractères arabes.', invalidAvatarFormat: 'L’image doit être au format PNG, JPG ou JPEG.',
    profileDatabaseNote: 'Ces informations sont enregistrées dans votre profil Lewad.', loadingProfile: 'Chargement du profil…', profileUnavailable: 'Le profil est momentanément indisponible.', profileMissing: 'Votre profil Lewad est introuvable.', backApp: 'Retour à la recherche',
    role: 'Rôle', status: 'Statut', memberSince: 'Membre depuis',
    roleUser: 'Utilisateur', roleAdmin: 'Administrateur', roleSuperAdmin: 'Super administrateur',
    statusActive: 'Actif', statusSuspended: 'Suspendu', statusDeleted: 'Supprimé',
    credits: 'Mes crédits', creditsSubtitle: 'Votre solde de points et l’historique de vos mouvements.', walletBalance: 'Solde de points', creditsText: 'Les points servent à effectuer des recherches dans Lewad. 1 point = 1 recherche.', unlimitedRoleNote: 'Votre rôle dispose de recherches illimitées dans l’espace Lewad.', zeroBalance: 'Votre solde est à 0. Rechargez vos points pour continuer à utiliser Lewad.', rechargeCta: 'Recharger mes points',
    loadingWallet: 'Chargement du solde…', walletUnavailable: 'Le solde est momentanément indisponible.', walletMissing: 'Aucun portefeuille n’est encore associé à ce compte.',
    creditHistory: 'Historique', historySubtitle: 'Tous vos mouvements de points, du plus récent au plus ancien.', loadingLedger: 'Chargement de l’historique…', ledgerUnavailable: 'L’historique est momentanément indisponible.', noCreditMovements: 'Aucun mouvement pour le moment', noCreditMovementsText: 'Vos bonus, recharges et recherches apparaîtront ici.', movements: 'mouvements',
    welcomeBonus: 'Bonus de bienvenue', searchDebit: 'Recherche', rechargeCredit: 'Recharge', adminAdjustment: 'Ajustement', referralBonus: 'Partage Lewad', movement: 'Mouvement',
    showAllMovements: 'Voir tout l’historique', showFewerMovements: 'Réduire l’historique', pagination: { previous: 'Précédent', next: 'Suivant', page: 'Page', of: 'sur', items: 'mouvements' },
    recharge: 'Recharger', rechargeSubtitle: 'Choisissez une offre fixe ou saisissez le nombre de points souhaité.', fixedOffers: 'Offres de recharge', popular: 'Le plus choisi',
    offerTest: 'Pour tester Lewad et faire quelques recherches.', offerRegular: 'Pour une utilisation régulière.', offerAdvanced: 'Pour une utilisation avancée.', chooseOffer: 'Choisir cette offre',
    customRecharge: 'Recharge personnalisée', pointsNumber: 'Nombre de points', totalPrice: 'Prix total', perPoint: '1 point = {price}', minimumPoints: 'Minimum : 1 point', continue: 'Continuer',
    rechargeModalTitle: 'Finaliser votre recharge', rechargeModalText: 'Pour finaliser l’achat de vos points, contactez l’équipe Lewad sur WhatsApp. Nous vous guiderons pour le paiement et l’activation.', selectedOffer: 'Offre sélectionnée', contactWhatsApp: 'Contacter sur WhatsApp', closeRechargeModal: 'Fermer la fenêtre de recharge', whatsappMessagePrefix: 'Bonjour Lewad, je veux recharger mon compte avec', whatsappMessageFor: 'pour',
    paymentNotice: 'Le paiement en ligne n’est pas encore activé : la recharge se fait avec l’équipe Lewad.',
    activationNotice: 'Les points seront activés après validation de l’équipe Lewad.',
    settings: 'Paramètres', settingsSubtitle: 'Réglez l’apparence de Lewad et retrouvez les options de votre compte.', appearance: 'Apparence et langue', appearanceText: 'Le choix est conservé sur cet appareil.', language: 'Langue', theme: 'Thème', light: 'Clair', dark: 'Sombre',
    accountSection: 'Compte', accountText: 'La gestion complète du compte arrive prochainement.', security: 'Sécurité', securityText: 'Les réglages de sécurité seront ajoutés avec le profil complet.', notifications: 'Notifications', notificationsText: 'Les préférences de notification seront disponibles prochainement.',
    contact: 'Contact', contactTitle: 'Parlons de votre besoin.', contactText: 'L’équipe Wasla Soft accompagne les utilisateurs et les établissements Lewad.', reason: 'Motif', reasonOptions: ['Ajouter un établissement', 'Demander un service', 'Support compte', 'Autre'], message: 'Votre message', messagePlaceholder: 'Décrivez votre besoin en quelques lignes…', send: 'Préparer mon message', messagePrepared: 'Votre message est préparé. L’envoi réel sera activé dans une prochaine étape.', contactDetails: 'Nous joindre',
  },
  ar: {
    account: 'حسابي', pointsUnit: 'نقاط', pointsUnavailable: 'الرصيد غير متاح', retry: 'إعادة المحاولة', readOnly: 'للقراءة فقط', close: 'إغلاق',
    profile: 'الملف الشخصي', profileSubtitle: 'معلوماتك في لواد. تُستخدم للتعريف بك لدى المؤسسات.', personalInfo: 'المعلومات الشخصية',
    email: 'البريد الإلكتروني', fullName: 'الاسم الكامل', fullNameAr: 'الاسم الكامل بالعربية', fullNameArHint: 'يُعرض بدل الاسم اللاتيني عندما يكون لواد بالعربية.', phone: 'الهاتف', phoneHint: '8 أرقام تبدأ بـ 2 أو 3 أو 4.',
    avatar: 'صورة الملف الشخصي', avatarUrl: 'رابط صورة الملف الشخصي', avatarHint: 'الصيغ المقبولة: PNG أو JPG أو JPEG.', chooseImage: 'اختر صورة', avatarUploadNotActive: 'سيتم تفعيل رفع الصورة بعد إعداد التخزين.',
    saveProfile: 'حفظ', savingProfile: 'جارٍ الحفظ…', profileUpdated: 'تم تحديث الملف الشخصي.', profileUpdateError: 'تعذر حفظ ملفك الشخصي حاليًا. حاول بعد قليل.',
    fullNameRequired: 'يرجى إدخال الاسم الكامل.', phoneRequired: 'يرجى إدخال رقم الهاتف.', invalidPhone: 'يجب أن يتكون الرقم من 8 أرقام بالضبط وأن يبدأ بـ 2 أو 3 أو 4.', invalidArabicFullName: 'يجب أن يحتوي الاسم العربي على أحرف عربية فقط.', invalidAvatarFormat: 'يجب أن تكون الصورة بصيغة PNG أو JPG أو JPEG.',
    profileDatabaseNote: 'تُحفظ هذه المعلومات في ملفك الشخصي على لواد.', loadingProfile: 'جارٍ تحميل الملف الشخصي…', profileUnavailable: 'الملف الشخصي غير متاح مؤقتًا.', profileMissing: 'تعذر العثور على ملفك الشخصي في لواد.', backApp: 'العودة إلى البحث',
    role: 'الدور', status: 'الحالة', memberSince: 'عضو منذ',
    roleUser: 'مستخدم', roleAdmin: 'مشرف', roleSuperAdmin: 'مشرف عام',
    statusActive: 'نشط', statusSuspended: 'موقوف', statusDeleted: 'محذوف',
    credits: 'نقاطي', creditsSubtitle: 'رصيدك من النقاط وسجل حركاتك.', walletBalance: 'رصيد النقاط', creditsText: 'تُستخدم النقاط لإجراء عمليات بحث في لواد. نقطة واحدة = عملية بحث واحدة.', unlimitedRoleNote: 'دورك يسمح بعمليات بحث غير محدودة داخل Lewad.', zeroBalance: 'رصيدك 0. أعد شحن نقاطك لمتابعة استخدام لواد.', rechargeCta: 'شحن نقاطي',
    loadingWallet: 'جارٍ تحميل الرصيد…', walletUnavailable: 'الرصيد غير متاح مؤقتًا.', walletMissing: 'لا توجد محفظة مرتبطة بهذا الحساب بعد.',
    creditHistory: 'السجل', historySubtitle: 'كل حركات نقاطك، من الأحدث إلى الأقدم.', loadingLedger: 'جارٍ تحميل السجل…', ledgerUnavailable: 'السجل غير متاح مؤقتًا.', noCreditMovements: 'لا توجد حركات حتى الآن', noCreditMovementsText: 'ستظهر هنا مكافآتك وعمليات الشحن وعمليات البحث.', movements: 'حركات',
    welcomeBonus: 'مكافأة الترحيب', searchDebit: 'بحث', rechargeCredit: 'شحن', adminAdjustment: 'تعديل', referralBonus: 'مشاركة لواد', movement: 'حركة',
    showAllMovements: 'عرض السجل كاملًا', showFewerMovements: 'تصغير السجل', pagination: { previous: 'السابق', next: 'التالي', page: 'الصفحة', of: 'من', items: 'حركة' },
    recharge: 'شحن', rechargeSubtitle: 'اختر عرضًا ثابتًا أو أدخل عدد النقاط الذي تريده.', fixedOffers: 'عروض الشحن', popular: 'الأكثر اختيارًا',
    offerTest: 'لتجربة لواد وإجراء بعض عمليات البحث.', offerRegular: 'لاستخدام منتظم.', offerAdvanced: 'لاستخدام متقدم.', chooseOffer: 'اختر هذا العرض',
    customRecharge: 'شحن مخصص', pointsNumber: 'عدد النقاط', totalPrice: 'السعر الإجمالي', perPoint: 'نقطة واحدة = {price}', minimumPoints: 'الحد الأدنى: نقطة واحدة', continue: 'متابعة',
    rechargeModalTitle: 'إتمام شحن النقاط', rechargeModalText: 'لإتمام شراء نقاطك، تواصل مع فريق لواد عبر واتساب. سنرشدك إلى الدفع والتفعيل.', selectedOffer: 'العرض المختار', contactWhatsApp: 'التواصل عبر واتساب', closeRechargeModal: 'إغلاق نافذة الشحن', whatsappMessagePrefix: 'مرحبًا لواد، أريد شحن حسابي بـ', whatsappMessageFor: 'مقابل',
    paymentNotice: 'الدفع الإلكتروني غير مفعّل بعد: يتم الشحن مع فريق لواد.',
    activationNotice: 'سيتم تفعيل النقاط بعد مصادقة فريق لواد.',
    settings: 'الإعدادات', settingsSubtitle: 'اضبط مظهر لواد واطّلع على خيارات حسابك.', appearance: 'المظهر واللغة', appearanceText: 'يُحفظ اختيارك على هذا الجهاز.', language: 'اللغة', theme: 'السمة', light: 'فاتح', dark: 'داكن',
    accountSection: 'الحساب', accountText: 'ستتوفر إدارة الحساب الكاملة قريبًا.', security: 'الأمان', securityText: 'ستضاف إعدادات الأمان مع الملف الشخصي الكامل.', notifications: 'الإشعارات', notificationsText: 'ستتوفر تفضيلات الإشعارات قريبًا.',
    contact: 'التواصل', contactTitle: 'لنتحدث عن حاجتك.', contactText: 'فريق Wasla Soft يرافق مستخدمي ومؤسسات لواد.', reason: 'السبب', reasonOptions: ['إضافة مؤسسة', 'طلب خدمة', 'دعم الحساب', 'أخرى'], message: 'رسالتك', messagePlaceholder: 'صف حاجتك في بضعة أسطر…', send: 'تجهيز رسالتي', messagePrepared: 'تم تجهيز رسالتك. سيتم تفعيل الإرسال الحقيقي في مرحلة قادمة.', contactDetails: 'كيف تصل إلينا',
  },
  en: {
    account: 'My account', pointsUnit: 'points', pointsUnavailable: 'Balance unavailable', retry: 'Try again', readOnly: 'Read only', close: 'Close',
    profile: 'Profile', profileSubtitle: 'Your Lewad information. It identifies you to the businesses you contact.', personalInfo: 'Personal information',
    email: 'Email address', fullName: 'Full name', fullNameAr: 'Full name in Arabic', fullNameArHint: 'Shown instead of the Latin name when Lewad is in Arabic.', phone: 'Phone', phoneHint: '8 digits, starting with 2, 3 or 4.',
    avatar: 'Profile image', avatarUrl: 'Profile image URL', avatarHint: 'Accepted formats: PNG, JPG or JPEG.', chooseImage: 'Choose an image', avatarUploadNotActive: 'Image upload will be activated after storage configuration.',
    saveProfile: 'Save', savingProfile: 'Saving…', profileUpdated: 'Profile updated.', profileUpdateError: 'We could not save your profile right now. Please try again shortly.',
    fullNameRequired: 'Please enter your full name.', phoneRequired: 'Please enter your phone number.', invalidPhone: 'The number must contain exactly 8 digits and start with 2, 3, or 4.', invalidArabicFullName: 'The Arabic name must contain Arabic characters only.', invalidAvatarFormat: 'The image must be a PNG, JPG, or JPEG file.',
    profileDatabaseNote: 'This information is stored in your Lewad profile.', loadingProfile: 'Loading profile…', profileUnavailable: 'Profile is temporarily unavailable.', profileMissing: 'Your Lewad profile could not be found.', backApp: 'Back to search',
    role: 'Role', status: 'Status', memberSince: 'Member since',
    roleUser: 'User', roleAdmin: 'Administrator', roleSuperAdmin: 'Super administrator',
    statusActive: 'Active', statusSuspended: 'Suspended', statusDeleted: 'Deleted',
    credits: 'My credits', creditsSubtitle: 'Your points balance and the history of your movements.', walletBalance: 'Points balance', creditsText: 'Points are used to run searches in Lewad. 1 point = 1 search.', unlimitedRoleNote: 'Your role has unlimited searches in the Lewad space.', zeroBalance: 'Your balance is 0. Recharge your points to continue using Lewad.', rechargeCta: 'Recharge my points',
    loadingWallet: 'Loading balance…', walletUnavailable: 'Balance is temporarily unavailable.', walletMissing: 'No wallet is associated with this account yet.',
    creditHistory: 'History', historySubtitle: 'Every points movement, newest first.', loadingLedger: 'Loading history…', ledgerUnavailable: 'History is temporarily unavailable.', noCreditMovements: 'No movements yet', noCreditMovementsText: 'Your bonuses, recharges and searches will appear here.', movements: 'movements',
    welcomeBonus: 'Welcome bonus', searchDebit: 'Search', rechargeCredit: 'Recharge', adminAdjustment: 'Adjustment', referralBonus: 'Share Lewad', movement: 'Movement',
    showAllMovements: 'Show full history', showFewerMovements: 'Show less', pagination: { previous: 'Previous', next: 'Next', page: 'Page', of: 'of', items: 'movements' },
    recharge: 'Recharge', rechargeSubtitle: 'Pick a fixed offer or enter the number of points you want.', fixedOffers: 'Recharge offers', popular: 'Most chosen',
    offerTest: 'To try Lewad and run a few searches.', offerRegular: 'For regular use.', offerAdvanced: 'For advanced use.', chooseOffer: 'Choose this offer',
    customRecharge: 'Custom recharge', pointsNumber: 'Number of points', totalPrice: 'Total price', perPoint: '1 point = {price}', minimumPoints: 'Minimum: 1 point', continue: 'Continue',
    rechargeModalTitle: 'Complete your recharge', rechargeModalText: 'To complete your points purchase, contact the Lewad team on WhatsApp. We will guide you through payment and activation.', selectedOffer: 'Selected offer', contactWhatsApp: 'Contact on WhatsApp', closeRechargeModal: 'Close recharge dialog', whatsappMessagePrefix: 'Hello Lewad, I want to recharge my account with', whatsappMessageFor: 'for',
    paymentNotice: 'Online payment is not enabled yet: recharges are handled with the Lewad team.',
    activationNotice: 'Points will be activated after the Lewad team validates your recharge.',
    settings: 'Settings', settingsSubtitle: 'Adjust how Lewad looks and find your account options.', appearance: 'Appearance and language', appearanceText: 'Your choice is kept on this device.', language: 'Language', theme: 'Theme', light: 'Light', dark: 'Dark',
    accountSection: 'Account', accountText: 'Full account management is coming soon.', security: 'Security', securityText: 'Security settings will be added with the complete profile.', notifications: 'Notifications', notificationsText: 'Notification preferences will be available soon.',
    contact: 'Contact', contactTitle: 'Let’s talk about what you need.', contactText: 'The Wasla Soft team supports Lewad users and businesses.', reason: 'Reason', reasonOptions: ['Add a business', 'Request a service', 'Account support', 'Other'], message: 'Your message', messagePlaceholder: 'Describe what you need in a few lines…', send: 'Prepare my message', messagePrepared: 'Your message is prepared. Real sending will be enabled in a future step.', contactDetails: 'Reach us',
  },
} as const

type Copy = (typeof copy)[Locale]

function avatarImageSource(url: string, updatedAt: string) {
  const separator = url.includes('?') ? '&' : '?'
  return `${url}${separator}v=${encodeURIComponent(updatedAt)}`
}

const navIdOf: Record<PrivatePageName, AppNavId> = { profile: 'profile', credits: 'credits', recharge: 'recharge', settings: 'settings' }

/** Le rôle et le statut sont stockés en clés techniques : jamais montrés tels quels. */
function roleLabel(value: Db1Profile['role'], text: Copy) {
  if (value === 'admin') return text.roleAdmin
  if (value === 'super_admin') return text.roleSuperAdmin
  return text.roleUser
}

function statusLabel(value: Db1Profile['status'], text: Copy) {
  if (value === 'suspended') return text.statusSuspended
  if (value === 'deleted') return text.statusDeleted
  return text.statusActive
}

/* ---------------------------------------------------------------- mise en page */

/**
 * En-tête de page membre : le titre tombe toujours au même endroit d'une page à
 * l'autre, ce qui donne à l'espace connecté sa continuité.
 */
function PageHeader({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-[26px] leading-tight font-bold tracking-tight sm:text-3xl lg:text-[34px]">{title}</h1>
        {text && <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base sm:leading-7">{text}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

function SectionTitle({ title, text, aside }: { title: string; text?: string; aside?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {text && <p className="mt-1 text-sm leading-6 text-muted">{text}</p>}
      </div>
      {aside}
    </div>
  )
}

/** Ligne de donnée non modifiable : libellé discret, valeur affirmée. */
function ReadOnlyRow({ label, children, ltr = false }: { label: string; children: ReactNode; ltr?: boolean }) {
  return (
    <div className="bg-surface px-4 py-3.5">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className={`mt-1.5 flex items-center gap-2 text-sm font-semibold text-ink ${ltr ? 'ltr-isolate' : ''}`}>{children}</dd>
    </div>
  )
}

/* ---------------------------------------------------------------- page racine */

export function ProtectedAppPage({ page }: { page: PrivatePageName }) {
  const { locale } = useI18n()
  const text = copy[locale]
  const heading = text[page]

  return (
    <AppShell active={navIdOf[page]} documentTitle={heading} skipLabel={heading}>
      <main id="app-main" className={`${appWrap} ${appPad}`}>
        {page === 'profile' && <ProfilePage text={text} />}
        {page === 'credits' && <CreditsPage text={text} />}
        {page === 'recharge' && <RechargePage text={text} />}
        {page === 'settings' && <SettingsPage text={text} />}
      </main>
    </AppShell>
  )
}

/* ---------------------------------------------------------------- profil */

function ProfilePage({ text }: { text: Copy }) {
  const { locale } = useI18n()
  const { user, profile, loading, profileError, refresh, authFullName } = useAccount()

  if (loading && !profile) {
    return (
      <>
        <PageHeader title={text.profile} text={text.profileSubtitle} />
        <div className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-6" role="status" aria-busy="true">
          <div className={`${card} p-6`}>
            <Skeleton className="size-20 rounded-2xl" />
            <Skeleton className="mt-5 h-5 w-40" />
            <Skeleton className="mt-3 h-4 w-52" />
          </div>
          <div className={`${card} grid gap-4 p-6`}>
            {[0, 1, 2, 3].map((row) => (
              <Skeleton key={row} className="h-12 w-full" />
            ))}
          </div>
          <span className="sr-only">{text.loadingProfile}</span>
        </div>
      </>
    )
  }

  if (!profile) {
    return (
      <>
        <PageHeader title={text.profile} text={text.profileSubtitle} />
        <InlineAlert
          tone="error"
          className="mt-7"
          action={
            <button type="button" className={btnGhost} onClick={() => void refresh()}>
              <Icon name="arrow" size={16} />
              {text.retry}
            </button>
          }
        >
          {profileError ? text.profileUnavailable : text.profileMissing}
        </InlineAlert>
      </>
    )
  }

  const displayName = profileDisplayName(profile, locale, authFullName) ?? text.account
  const email = profile.email ?? user?.email ?? null

  return (
    <>
      <PageHeader
        title={text.profile}
        text={text.profileSubtitle}
        action={
          <a href="/app" className={btnGhost}>
            <span className="rtl:rotate-180">
              <Icon name="chevronLeft" size={16} />
            </span>
            {text.backApp}
          </a>
        }
      />

      {/* Desktop : identité épinglée à gauche, formulaire à droite. Mobile :
          empilé, l'identité en premier — « c'est bien mon compte ». */}
      <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-6">
        <IdentityCard text={text} profile={profile} displayName={displayName} email={email} />
        <ProfileForm text={text} profile={profile} email={email ?? '—'} onSaved={refresh} />
      </div>
    </>
  )
}

function IdentityCard({
  text,
  profile,
  displayName,
  email,
}: {
  text: Copy
  profile: Db1Profile
  displayName: string
  email: string | null
}) {
  const { locale } = useI18n()
  const active = profile.status === 'active'

  return (
    <section className={`${card} overflow-hidden lg:sticky lg:top-24`} aria-labelledby="profile-identity">
      <div className="flex items-center gap-4 border-b border-line bg-page-alt p-5 sm:p-6">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand text-2xl font-bold text-brand-ink sm:size-20">
          {profile.avatar_url ? (
            <img src={avatarImageSource(profile.avatar_url, profile.updated_at)} alt={text.avatar} className="size-full object-cover" />
          ) : (
            initialOf(displayName)
          )}
        </span>
        <div className="min-w-0">
          <h2 id="profile-identity" dir="auto" className="truncate text-lg font-bold sm:text-xl">
            {displayName}
          </h2>
          {email && <p className="ltr-isolate mt-1 truncate text-sm text-muted">{email}</p>}
        </div>
      </div>

      <dl className="grid gap-px bg-line">
        <ReadOnlyRow label={text.status}>
          <span className={`${pill} ${active ? 'bg-answer-bg text-answer' : 'bg-ask-bg text-ask'}`}>
            <span aria-hidden="true" className={`size-1.5 rounded-full ${active ? 'bg-answer' : 'bg-ask'}`} />
            {statusLabel(profile.status, text)}
          </span>
        </ReadOnlyRow>
        <ReadOnlyRow label={text.role}>
          <span className={`${pill} bg-surface-2 text-ink-soft`}>{roleLabel(profile.role, text)}</span>
        </ReadOnlyRow>
        <ReadOnlyRow label={text.memberSince}>{formatDate(profile.created_at, locale)}</ReadOnlyRow>
      </dl>
    </section>
  )
}

function ProfileForm({
  text,
  profile,
  email,
  onSaved,
}: {
  text: Copy
  profile: Db1Profile
  email: string
  onSaved: () => Promise<void>
}) {
  const { t } = useI18n()
  const avatarText = t.profileAvatar
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [fullNameAr, setFullNameAr] = useState(profile.full_name_ar ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null)
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const avatarInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setFullName(profile.full_name ?? '')
    setFullNameAr(profile.full_name_ar ?? '')
    setPhone(profile.phone ?? '')
    setAvatarUrl(profile.avatar_url ?? '')
    setAvatarPreview(null)
    setSelectedAvatar(null)
  }, [profile])

  useEffect(() => () => {
    if (avatarPreview?.startsWith('blob:')) URL.revokeObjectURL(avatarPreview)
  }, [avatarPreview])

  const selectAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const image = event.target.files?.[0]
    if (!image) return

    if (isAvatarFileTooLarge(image)) {
      event.target.value = ''
      setNotice({ text: avatarText.fileTooLarge, error: true })
      return
    }

    if (!isAllowedAvatarFile(image)) {
      event.target.value = ''
      setNotice({ text: avatarText.unsupportedImage, error: true })
      return
    }

    setSelectedAvatar(image)
    setAvatarPreview(URL.createObjectURL(image))
    setNotice(null)
    event.target.value = ''
  }

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = fullName.trim()
    const trimmedPhone = phone.trim()
    const trimmedArabicName = fullNameAr.trim()
    const normalizedPhone = normalizeMauritanianPhone(trimmedPhone)

    if (!trimmedName) return setNotice({ text: text.fullNameRequired, error: true })
    if (trimmedPhone && !isValidMauritanianPhone(trimmedPhone)) return setNotice({ text: avatarText.invalidPhone, error: true })
    if (!isValidArabicName(trimmedArabicName)) return setNotice({ text: text.invalidArabicFullName, error: true })

    const pendingAvatar = selectedAvatar
    let nextAvatarUrl = avatarUrl || null
    setNotice(null)

    if (pendingAvatar) {
      setUploading(true)
      const uploadResult = await uploadMyAvatar(pendingAvatar)
      setUploading(false)

      if (uploadResult.error || !uploadResult.data) {
        const errorText = uploadResult.error === 'file_too_large'
          ? avatarText.fileTooLarge
          : uploadResult.error === 'invalid_file'
            ? avatarText.unsupportedImage
            : avatarText.uploadFailed
        setNotice({ text: errorText, error: true })
        return
      }

      nextAvatarUrl = uploadResult.data
    }

    setSaving(true)
    const result = await updateMyProfile({
      full_name: trimmedName,
      full_name_ar: trimmedArabicName,
      phone: normalizedPhone || null,
      avatar_url: nextAvatarUrl,
    })
    setSaving(false)

    if (result.error || !result.data) {
      setNotice({ text: result.error === 'duplicate_phone' ? avatarText.phoneAlreadyUsed : text.profileUpdateError, error: true })
      return
    }

    setFullName(result.data.full_name ?? '')
    setFullNameAr(result.data.full_name_ar ?? '')
    setPhone(result.data.phone ?? '')
    setAvatarUrl(result.data.avatar_url ?? '')
    setAvatarPreview(null)
    setSelectedAvatar(null)
    await onSaved()
    setNotice({ text: pendingAvatar ? avatarText.profileImageUpdated : avatarText.profileSaved })
  }

  return (
    <section className={`${card} overflow-hidden`} aria-labelledby="profile-form-title">
      <div className="border-b border-line p-5 sm:p-6">
        <SectionTitle title={text.personalInfo} text={text.profileDatabaseNote} />
        <h2 id="profile-form-title" className="sr-only">
          {text.personalInfo}
        </h2>
      </div>

      <form className="grid gap-5 p-5 sm:p-6" noValidate onSubmit={(event) => void saveProfile(event)}>
        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <label htmlFor="profile-full-name" className={fieldLabel}>
              {text.fullName}
            </label>
            <input
              id="profile-full-name"
              className={field}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
              dir="auto"
            />
          </div>
          <div>
            <label htmlFor="profile-full-name-ar" className={fieldLabel}>
              {text.fullNameAr}
            </label>
            <input
              id="profile-full-name-ar"
              className={field}
              value={fullNameAr}
              onChange={(event) => setFullNameAr(event.target.value)}
              autoComplete="name"
              lang="ar"
              dir="auto"
              aria-describedby="profile-full-name-ar-hint"
            />
            <p id="profile-full-name-ar-hint" className={fieldHint}>
              {text.fullNameArHint}
            </p>
          </div>
        </div>

        <div>
          <label htmlFor="profile-phone" className={fieldLabel}>
            {text.phone}
          </label>
          <input
            id="profile-phone"
            className={`${field} ltr-isolate`}
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            autoComplete="tel"
            inputMode="tel"
            aria-describedby="profile-phone-hint"
          />
          <p id="profile-phone-hint" className={fieldHint}>
            {text.phoneHint}
          </p>
        </div>

        <div>
          <p className={fieldLabel}>{text.avatar}</p>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start">
            <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-surface-2 text-muted">
              {avatarPreview || avatarUrl ? (
                <img src={avatarPreview || avatarUrl} alt={text.avatar} className="size-full object-cover" />
              ) : (
                <Icon name="user" size={22} />
              )}
            </span>
            <input
              ref={avatarInput}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              aria-label={text.avatar}
              onChange={selectAvatar}
            />
            <button type="button" disabled={saving || uploading} className={`${btnGhost} shrink-0`} onClick={() => avatarInput.current?.click()}>
              <Icon name="camera" size={17} />
              {avatarText.uploadAvatar}
            </button>
          </div>
          <p id="profile-avatar-hint" className={fieldHint}>
            {avatarText.avatarHint}
          </p>
        </div>

        {/* Champs non modifiables : fond plein, bordure pointillée, cadenas. */}
        <div className="border-t border-line pt-5">
          <p className="flex items-center gap-2 text-xs font-semibold text-muted">
            <Icon name="lock" size={14} />
            {text.readOnly}
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div>
              <label htmlFor="profile-email" className={fieldLabel}>
                {text.email}
              </label>
              <input id="profile-email" className={`${fieldReadOnly} ltr-isolate`} value={email} readOnly tabIndex={-1} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className={fieldLabel}>{text.role}</span>
                <p className={`${fieldReadOnly} flex items-center`}>{roleLabel(profile.role, text)}</p>
              </div>
              <div>
                <span className={fieldLabel}>{text.status}</span>
                <p className={`${fieldReadOnly} flex items-center`}>{statusLabel(profile.status, text)}</p>
              </div>
            </div>
          </div>
        </div>

        {notice && <InlineAlert tone={notice.error ? 'error' : 'success'}>{notice.text}</InlineAlert>}

        <div>
          <button type="submit" disabled={saving || uploading} className={`${btnPrimary} w-full sm:w-auto`}>
            {uploading ? avatarText.uploadingAvatar : saving ? avatarText.savingProfile : avatarText.saveProfile}
            <Icon name="check" size={17} />
          </button>
        </div>
      </form>
    </section>
  )
}

/* ---------------------------------------------------------------- crédits */

function CreditsPage({ text }: { text: Copy }) {
  const { locale } = useI18n()
  const { user, profile, wallet, loading, walletError, refresh } = useAccount()
  const [ledgerPage, setLedgerPage] = useState(1)
  const ledger = useCreditLedger(user?.id, ledgerPage)
  const balance = typeof wallet?.balance === 'number' && Number.isFinite(wallet.balance) ? wallet.balance : null
  const isWalletLoading = loading && balance === null
  const hasUnlimitedSearches = isAdminRole(profile?.role)

  useEffect(() => {
    if (walletError && import.meta.env.DEV) console.debug('[Credits] wallet load failed')
  }, [walletError])

  return (
    <>
      <PageHeader title={text.credits} text={text.creditsSubtitle} />

      {/* Desktop : le solde reste épinglé pendant qu'on parcourt l'historique. */}
      <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:gap-6">
        <section className={`${card} p-6 sm:p-7 lg:sticky lg:top-24`} aria-labelledby="wallet-balance">
          <h2 id="wallet-balance" className="text-sm font-semibold text-muted">
            {text.walletBalance}
          </h2>

          {isWalletLoading ? (
            <p role="status" aria-busy="true">
              <Skeleton className="mt-3 h-12 w-40" />
              <span className="sr-only">{text.loadingWallet}</span>
            </p>
          ) : balance !== null ? (
            <p className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="tabular text-[42px] leading-none font-bold tracking-tight text-ink sm:text-5xl">
                {formatNumber(balance, locale)}
              </span>
              <span className="text-lg font-semibold text-muted">{text.pointsUnit}</span>
            </p>
          ) : (
            <p className="mt-3 text-lg font-semibold text-muted">{text.pointsUnavailable}</p>
          )}

          <p className="mt-4 text-sm leading-6 text-muted">{text.creditsText}</p>

          {hasUnlimitedSearches && (
            <InlineAlert tone="info" className="mt-5">
              {text.unlimitedRoleNote}
            </InlineAlert>
          )}

          {balance === 0 && !hasUnlimitedSearches && (
            <InlineAlert
              tone="info"
              className="mt-5"
              action={<a href="/recharge" className={btnPrimary}>{text.rechargeCta}</a>}
            >
              {text.zeroBalance}
            </InlineAlert>
          )}

          {!isWalletLoading && balance === null && (
            <InlineAlert
              tone="error"
              className="mt-5"
              action={
                <button type="button" className={btnGhost} onClick={() => void refresh()}>
                  <Icon name="arrow" size={16} />
                  {text.retry}
                </button>
              }
            >
              {walletError ? text.walletUnavailable : text.walletMissing}
            </InlineAlert>
          )}

          {(balance !== 0 || hasUnlimitedSearches) && (
            <a href="/recharge" className={`${btnPrimary} mt-6 w-full sm:w-auto`}>
              {text.rechargeCta}
              <span className="rtl:rotate-180">
                <Icon name="arrow" size={17} />
              </span>
            </a>
          )}
        </section>

        <section className={`${card} overflow-hidden`} aria-labelledby="credit-history">
          <div className="border-b border-line p-5 sm:p-6">
            <SectionTitle
              title={text.creditHistory}
              text={text.historySubtitle}
              aside={
                ledger.totalCount > 0 ? (
                  <span className="tabular shrink-0 text-xs font-semibold text-muted">
                    {formatNumber(ledger.totalCount, locale)} {text.movements}
                  </span>
                ) : undefined
              }
            />
            <h2 id="credit-history" className="sr-only">
              {text.creditHistory}
            </h2>
          </div>

          <div className="p-4 sm:p-5">
            {ledger.loading ? (
              <div className="grid gap-2" role="status" aria-busy="true">
                {[0, 1, 2].map((row) => (
                  <Skeleton key={row} className="h-[68px] w-full" />
                ))}
                <span className="sr-only">{text.loadingLedger}</span>
              </div>
            ) : ledger.error ? (
              <InlineAlert
                tone="error"
                action={
                  <button type="button" className={btnGhost} onClick={() => void ledger.refresh()}>
                    <Icon name="arrow" size={16} />
                    {text.retry}
                  </button>
                }
              >
                {text.ledgerUnavailable}
              </InlineAlert>
            ) : ledger.entries.length === 0 ? (
              <EmptyState
                icon="clock"
                title={text.noCreditMovements}
                text={text.noCreditMovementsText}
                action={
                  <a href="/recharge" className={btnGhost}>
                    {text.rechargeCta}
                  </a>
                }
              />
            ) : (
              <>
                <ul className="grid list-none gap-2">
                  {ledger.entries.map((entry) => (
                    <li key={entry.id}>
                      <LedgerRow entry={entry} text={text} />
                    </li>
                  ))}
                </ul>
                <PaginationControls
                  page={ledger.page}
                  totalPages={ledger.totalPages}
                  totalCount={ledger.totalCount}
                  labels={text.pagination}
                  disabled={ledger.loading}
                  onPageChange={setLedgerPage}
                />
              </>
            )}
          </div>
        </section>
      </div>
    </>
  )
}

function LedgerRow({ entry, text }: { entry: Db1CreditLedgerEntry; text: Copy }) {
  const { locale } = useI18n()
  const typeLabels: Partial<Record<CreditLedgerType, string>> = {
    welcome_bonus: text.welcomeBonus,
    search_debit: text.searchDebit,
    recharge_credit: text.rechargeCredit,
    admin_adjustment: text.adminAdjustment,
    referral_bonus: text.referralBonus,
  }
  const amount = Number.isFinite(entry.amount) ? entry.amount : 0
  const label = typeLabels[entry.type as CreditLedgerType] ?? text.movement
  const isCredit = amount > 0

  return (
    <article className="flex items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 sm:items-center sm:px-4">
      {/* Le sens du mouvement se lit à la flèche autant qu'à la couleur : rien
          d'essentiel n'est porté par la seule teinte. */}
      <span
        aria-hidden="true"
        className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full sm:mt-0 ${
          isCredit ? 'bg-answer-bg text-answer' : 'bg-ask-bg text-ask'
        }`}
      >
        <Icon name={isCredit ? 'arrowUp' : 'arrowDown'} size={17} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          <time dateTime={entry.created_at}>{formatDate(entry.created_at, locale)}</time>
          {entry.reason && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{entry.reason}</span>
            </>
          )}
        </p>
      </div>

      <span className={`pt-1 tabular shrink-0 text-sm font-bold sm:pt-0 ${isCredit ? 'text-answer' : 'text-ask'}`}>
        {formatSignedPoints(amount, locale, text.pointsUnit)}
      </span>
    </article>
  )
}

/* ---------------------------------------------------------------- recharge */

type RechargeSelection = { kind: 'fixed' | 'custom'; points: number; price: number }

function RechargePage({ text }: { text: Copy }) {
  const { locale } = useI18n()
  const [rawPoints, setRawPoints] = useState('1')
  const [selection, setSelection] = useState<RechargeSelection | null>(null)
  const points = Math.max(1, Number.parseInt(rawPoints, 10) || 1)
  const closeModal = useCallback(() => setSelection(null), [])
  const perPointLabel = text.perPoint.replace('{price}', formatCurrency(pricePerPoint, locale))

  const offers: { points: number; price: number; description: string; icon: IconName; featured: boolean }[] = [
    { points: 10, price: 50, description: text.offerTest, icon: 'sparkle', featured: false },
    { points: 30, price: 100, description: text.offerRegular, icon: 'sparkle', featured: true },
    { points: 100, price: 500, description: text.offerAdvanced, icon: 'wallet', featured: false },
  ]

  const updatePoints = (input: string) => {
    const digits = input.replace(/[^0-9]/g, '').slice(0, 6)
    const numericValue = Number.parseInt(digits, 10)
    setRawPoints(String(Number.isNaN(numericValue) || numericValue < 1 ? 1 : numericValue))
  }

  return (
    <>
      <PageHeader title={text.recharge} text={text.rechargeSubtitle} />

      <InlineAlert tone="info" className="mt-6" title={text.activationNotice}>
        {text.paymentNotice}
      </InlineAlert>

      <section className="mt-8" aria-labelledby="recharge-offers">
        <h2 id="recharge-offers" className="text-lg font-bold tracking-tight">
          {text.fixedOffers}
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          {offers.map((offer) => (
            <article
              key={offer.points}
              className={`relative flex flex-col rounded-2xl border bg-surface p-5 sm:p-6 ${
                offer.featured ? 'border-brand-deep shadow-sm dark:border-brand' : 'border-line'
              }`}
            >
              {offer.featured && (
                <span className={`${pill} absolute -top-2.5 start-5 bg-brand text-brand-ink`}>{text.popular}</span>
              )}
              <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand-deep">
                <Icon name={offer.icon} size={20} />
              </span>
              <p className="mt-5 flex items-baseline gap-2 text-3xl font-bold tracking-tight">
                <span className="tabular">{formatNumber(offer.points, locale)}</span>
                <span className="text-base font-semibold text-muted">{text.pointsUnit}</span>
              </p>
              <p className="mt-1.5 text-base font-bold text-brand-deep dark:text-brand">
                {formatCurrency(offer.price, locale)}
              </p>
              <p className="mt-3 flex-1 text-sm leading-6 text-muted">{offer.description}</p>
              <button
                type="button"
                className={`${offer.featured ? btnPrimary : btnGhost} mt-6 w-full`}
                onClick={() => setSelection({ kind: 'fixed', points: offer.points, price: offer.price })}
              >
                {text.chooseOffer}
                <span className="rtl:rotate-180">
                  <Icon name="arrow" size={17} />
                </span>
              </button>
            </article>
          ))}
        </div>
      </section>

      <section className={`${card} mt-6 p-5 sm:p-7`} aria-labelledby="custom-recharge">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 id="custom-recharge" className="text-lg font-bold tracking-tight">
              {text.customRecharge}
            </h2>
            <p className="mt-1 text-sm text-muted">{perPointLabel}</p>
          </div>
          <span className={`${pill} bg-brand-soft text-brand-deep`}>{text.minimumPoints}</span>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start lg:gap-6">
          <div>
            <label htmlFor="custom-points" className={fieldLabel}>
              {text.pointsNumber}
            </label>
            <input
              id="custom-points"
              className={`${field} ltr-isolate text-base font-semibold`}
              value={rawPoints}
              onChange={(event) => updatePoints(event.target.value)}
              inputMode="numeric"
              pattern="[0-9]*"
              aria-describedby="custom-points-hint"
            />
            <p id="custom-points-hint" className={fieldHint}>
              {text.minimumPoints} · {perPointLabel}
            </p>
          </div>

          <div className={`${cardMuted} px-5 py-4 sm:min-w-52`} aria-live="polite">
            <p className="text-xs font-semibold text-muted">{text.totalPrice}</p>
            <p className="tabular mt-1 text-2xl font-bold text-ink">{formatCurrency(points * pricePerPoint, locale)}</p>
          </div>
        </div>

        <button
          type="button"
          className={`${btnPrimary} mt-6 w-full sm:w-auto`}
          onClick={() => setSelection({ kind: 'custom', points, price: points * pricePerPoint })}
        >
          {text.continue}
          <span className="rtl:rotate-180">
            <Icon name="arrow" size={17} />
          </span>
        </button>
      </section>

      <RechargeWhatsAppModal selection={selection} text={text} onClose={closeModal} />
    </>
  )
}

function RechargeWhatsAppModal({
  selection,
  text,
  onClose,
}: {
  selection: RechargeSelection | null
  text: Copy
  onClose: () => void
}) {
  const { locale } = useI18n()
  const closeButton = useRef<HTMLButtonElement>(null)
  const restoreFocus = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!selection) return
    restoreFocus.current = document.activeElement as HTMLElement | null
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    const focusTimer = window.setTimeout(() => closeButton.current?.focus(), 20)

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      window.clearTimeout(focusTimer)
      document.body.style.overflow = overflow
      restoreFocus.current?.focus?.()
    }
  }, [onClose, selection])

  if (!selection) return null

  const selectionTitle = selection.kind === 'fixed' ? text.selectedOffer : text.customRecharge
  const pointsLabel = `${formatNumber(selection.points, locale)} ${text.pointsUnit}`
  const priceLabel = formatCurrency(selection.price, locale)
  const whatsappText = `${text.whatsappMessagePrefix} ${pointsLabel} ${text.whatsappMessageFor} ${priceLabel}.`
  const whatsappUrl = `${contactDetails.whatsappHref}?text=${encodeURIComponent(whatsappText)}`

  return (
    <div
      className="fixed inset-0 z-60 grid place-items-end bg-ink/40 backdrop-blur-[2px] sm:place-items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recharge-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {/* Mobile : feuille ancrée en bas, à portée du pouce. Desktop : boîte centrée. */}
      <section
        className="w-full max-w-md rounded-t-3xl border border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:p-7 sm:pb-7"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-deep">
            <Icon name="message" size={21} />
          </span>
          <button ref={closeButton} type="button" className={iconBtn} aria-label={text.closeRechargeModal} onClick={onClose}>
            <Icon name="close" size={19} />
          </button>
        </div>

        <h2 id="recharge-modal-title" className="mt-4 text-xl font-bold tracking-tight sm:text-2xl">
          {text.rechargeModalTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">{text.rechargeModalText}</p>

        <div className={`${cardMuted} mt-5 flex items-center justify-between gap-3 p-4`}>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted">{selectionTitle}</p>
            <p className="tabular mt-1 text-base font-bold text-ink">{pointsLabel}</p>
          </div>
          <p className="tabular shrink-0 text-base font-bold text-brand-deep dark:text-brand">{priceLabel}</p>
        </div>

        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted">
          <span className="mt-px shrink-0">
            <Icon name="info" size={14} />
          </span>
          {text.activationNotice}
        </p>

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className={btnGhost} onClick={onClose}>
            {text.close}
          </button>
          <a href={whatsappUrl} target="_blank" rel="noreferrer" className={btnPrimary}>
            {text.contactWhatsApp}
            <Icon name="message" size={17} />
          </a>
        </div>
      </section>
    </div>
  )
}

/* ---------------------------------------------------------------- paramètres */

function SettingsPage({ text }: { text: Copy }) {
  const { locale, setLocale } = useI18n()
  const { theme, setTheme } = useTheme()

  return (
    <>
      <PageHeader title={text.settings} text={text.settingsSubtitle} />

      <div className="mt-7 grid gap-5 lg:grid-cols-3 lg:gap-6">
        <section className={`${card} p-5 sm:p-6 lg:col-span-3`} aria-labelledby="settings-appearance">
          <SectionTitle title={text.appearance} text={text.appearanceText} />
          <h2 id="settings-appearance" className="sr-only">
            {text.appearance}
          </h2>

          <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:max-w-3xl">
            <div>
              <p className={fieldLabel}>{text.language}</p>
              <div
                className="grid grid-cols-3 gap-1.5 rounded-xl border border-line bg-page-alt p-1"
                role="group"
                aria-label={text.language}
              >
                {locales.map((item) => (
                  <button
                    key={item}
                    type="button"
                    lang={item}
                    onClick={() => setLocale(item)}
                    aria-pressed={item === locale}
                    className={`min-h-11 rounded-lg px-2 text-sm font-semibold transition-colors ${
                      item === locale ? 'bg-brand-soft text-brand-deep' : 'text-muted hover:bg-surface-2 hover:text-ink'
                    }`}
                  >
                    {dictionaries[item].meta.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className={fieldLabel}>{text.theme}</p>
              <div
                className="grid grid-cols-2 gap-1.5 rounded-xl border border-line bg-page-alt p-1"
                role="group"
                aria-label={text.theme}
              >
                <button
                  type="button"
                  onClick={() => setTheme('light')}
                  aria-pressed={theme === 'light'}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${
                    theme === 'light' ? 'bg-brand-soft text-brand-deep' : 'text-muted hover:bg-surface-2 hover:text-ink'
                  }`}
                >
                  <Icon name="sun" size={16} />
                  {text.light}
                </button>
                <button
                  type="button"
                  onClick={() => setTheme('dark')}
                  aria-pressed={theme === 'dark'}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${
                    theme === 'dark' ? 'bg-brand-soft text-brand-deep' : 'text-muted hover:bg-surface-2 hover:text-ink'
                  }`}
                >
                  <Icon name="moon" size={16} />
                  {text.dark}
                </button>
              </div>
            </div>
          </div>
        </section>

        <SettingsCard title={text.accountSection} text={text.accountText} icon="user" href="/profile" linkLabel={text.profile} />
        <SettingsCard title={text.security} text={text.securityText} icon="shield" />
        <SettingsCard title={text.notifications} text={text.notificationsText} icon="message" />
      </div>
    </>
  )
}

function SettingsCard({
  title,
  text,
  icon,
  href,
  linkLabel,
}: {
  title: string
  text: string
  icon: IconName
  href?: string
  linkLabel?: string
}) {
  return (
    <article className={`${card} flex gap-4 p-5 sm:p-6`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
        <Icon name={icon} size={20} />
      </span>
      <div className="min-w-0">
        <h2 className="font-bold">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted">{text}</p>
        {href && linkLabel && (
          <a
            href={href}
            className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-deep dark:text-brand"
          >
            {linkLabel}
            <span className="rtl:rotate-180">
              <Icon name="arrow" size={15} />
            </span>
          </a>
        )}
      </div>
    </article>
  )
}

/* ---------------------------------------------------------------- contact */

export function ContactPage() {
  const { locale } = useI18n()
  const { isAuthenticated } = useAccount()
  const text = copy[locale]
  const [prepared, setPrepared] = useState(false)

  const channels: { icon: IconName; label: string; value: string; href: string }[] = [
    { icon: 'phone', label: text.phone, value: contactDetails.phoneDisplay, href: contactDetails.phoneHref },
    { icon: 'message', label: 'WhatsApp', value: contactDetails.whatsappDisplay, href: contactDetails.whatsappHref },
    { icon: 'globe', label: text.email, value: contactDetails.email, href: contactDetails.emailHref },
  ]

  return (
    <AppShell
      active="contact"
      documentTitle={text.contact}
      skipLabel={text.contact}
      homeHref={isAuthenticated ? '/app' : '/'}
    >
      <main id="app-main" className={`${appWrap} ${appPad}`}>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10">
          <section>
            <PageHeader title={text.contactTitle} text={text.contactText} />

            <div className={`${card} mt-7 overflow-hidden`}>
              <h2 className="border-b border-line px-5 py-4 text-sm font-bold">{text.contactDetails}</h2>
              <ul className="grid list-none gap-px bg-line">
                {channels.map((channel) => (
                  <li key={channel.label}>
                    <a
                      href={channel.href}
                      className="group flex min-h-14 items-center gap-3 bg-surface px-5 py-3 transition-colors hover:bg-surface-2"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-surface-2 text-muted transition-colors group-hover:text-ink">
                        <Icon name={channel.icon} size={17} />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-xs font-semibold text-muted">{channel.label}</span>
                        <span className="ltr-isolate block truncate text-sm font-semibold text-ink">{channel.value}</span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className={`${card} p-5 sm:p-7`} aria-labelledby="contact-form-title">
            <h2 id="contact-form-title" className="text-lg font-bold tracking-tight">
              {text.message}
            </h2>
            <form
              className="mt-5 grid gap-5"
              onSubmit={(event) => {
                event.preventDefault()
                setPrepared(true)
              }}
            >
              <div>
                <label htmlFor="contact-reason" className={fieldLabel}>
                  {text.reason}
                </label>
                <select id="contact-reason" className={field}>
                  {text.reasonOptions.map((reason) => (
                    <option key={reason}>{reason}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="contact-message" className={fieldLabel}>
                  {text.message}
                </label>
                <textarea
                  id="contact-message"
                  rows={6}
                  placeholder={text.messagePlaceholder}
                  className="w-full rounded-xl border border-line bg-surface p-3.5 text-base text-ink outline-none transition-colors placeholder:text-muted focus:border-brand-deep focus:ring-2 focus:ring-brand-deep/15 sm:text-sm"
                />
              </div>

              {prepared && <InlineAlert tone="success">{text.messagePrepared}</InlineAlert>}

              <button type="submit" className={`${btnPrimary} w-full sm:w-auto sm:justify-self-start`}>
                {text.send}
                <span className="rtl:rotate-180">
                  <Icon name="arrow" size={17} />
                </span>
              </button>
            </form>
          </section>
        </div>
      </main>
    </AppShell>
  )
}

/** Placeholder intentionally kept free of a form or persistence until the establishment flow is specified. */
export function AddBusinessPage() {
  const { t } = useI18n()
  const text = t.appSearch

  return (
    <AppShell documentTitle={text.addEstablishment} skipLabel={text.addEstablishment}>
      <main id="app-main" className={`${appWrap} ${appPad}`}>
        <section className={`${card} mx-auto max-w-2xl p-6 sm:p-8`} aria-labelledby="add-business-title">
          <span className="grid size-12 place-items-center rounded-2xl bg-brand-soft text-brand-deep dark:text-brand">
            <Icon name="plus" size={24} />
          </span>
          <h1 id="add-business-title" className="mt-5 text-2xl font-bold tracking-tight sm:text-3xl">
            {text.addEstablishment}
          </h1>
          <p className="mt-3 text-sm leading-7 text-muted sm:text-base">{text.addEstablishmentMessage}</p>
        </section>
      </main>
    </AppShell>
  )
}

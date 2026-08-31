import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { type Locale, useI18n } from "../i18n";
import { AccountLoading } from "./system/AccountLoading";
import {
  updateMyProfile,
  uploadMyAvatar,
  type CreditLedgerType,
  type Db1CreditLedgerEntry,
  type Db1Profile,
  type SafeProfileUpdate,
} from "../lib/db1";
import { saveProfileWithOptionalAvatar } from "../lib/profileUpdateWorkflow";
import { useAccount } from "../hooks/useAccount";
import { useCreditLedger } from "../hooks/useCreditLedger";
import { HistoryPage } from "./HistoryPage";
import {
  getMyEstablishmentsWithStats,
  type ClientEstablishment,
} from "../lib/clientEstablishments";
import {
  isAllowedAvatarFile,
  isAvatarFileTooLarge,
  isValidArabicName,
  isValidMauritanianPhone,
  normalizeMauritanianPhone,
} from "../lib/validation";
import { contact as contactDetails, paymentApps } from "../lib/content";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatSignedPoints,
  initialOf,
  profileDisplayName,
} from "../lib/format";
import { defaultDestinationForRole, isAdminRole } from "../lib/routeAuth";
import { paginateItems } from "../lib/pagination";
import {
  createRechargeRequest,
  rechargeOffers,
  type RechargeOfferCode,
  type RechargeRequest,
} from "../lib/recharge";
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
} from "../lib/ui";
import { Icon, type IconName } from "./Icon";
import { AppShell } from "./shell/AppShell";
import type { AppNavId } from "./shell/appNav";
import { EmptyState, InlineAlert, Skeleton } from "./system/States";
import {
  AppearanceSettings,
  PasswordResetSettings,
} from "./settings/SettingsControls";
import { PaginationControls } from "./ui/PaginationControls";
import { BackButton } from "./ui/BackButton";
import { BusinessSubmissionForm } from "./BusinessSubmissionForm";

export type PrivatePageName =
  | "profile"
  | "credits"
  | "settings"
  | "recharge"
  | "history";

const copy = {
  fr: {
    account: "Mon compte",
    pointsUnit: "points",
    pointsUnavailable: "Solde indisponible",
    retry: "Réessayer",
    readOnly: "Lecture seule",
    close: "Fermer",
    profile: "Profil",
    profileSubtitle:
      "Vos informations Lewad. Elles servent à vous identifier auprès des établissements.",
    personalInfo: "Informations personnelles",
    email: "Adresse e-mail",
    fullName: "Nom complet",
    fullNameAr: "Nom complet en arabe",
    fullNameArHint: "Affiché à la place du nom latin quand Lewad est en arabe.",
    phone: "Téléphone",
    phoneHint: "8 chiffres, commençant par 2, 3 ou 4.",
    avatar: "Photo de profil",
    avatarUrl: "URL de la photo de profil",
    avatarHint: "Formats acceptés : PNG, JPG ou JPEG.",
    chooseImage: "Choisir une image",
    avatarUploadNotActive:
      "Le téléversement d’image sera activé après la configuration du stockage.",
    saveProfile: "Enregistrer",
    savingProfile: "Enregistrement…",
    profileUpdated: "Profil mis à jour.",
    profileUpdateError:
      "Impossible d’enregistrer votre profil pour le moment. Réessayez dans un instant.",
    fullNameRequired: "Veuillez saisir votre nom complet.",
    phoneRequired: "Veuillez saisir votre numéro de téléphone.",
    invalidPhone:
      "Le numéro doit contenir exactement 8 chiffres et commencer par 2, 3 ou 4.",
    invalidArabicFullName:
      "Le nom en arabe doit contenir uniquement des caractères arabes.",
    invalidAvatarFormat: "L’image doit être au format PNG, JPG ou JPEG.",
    profileDatabaseNote:
      "Ces informations sont enregistrées dans votre profil Lewad.",
    loadingProfile: "Chargement du profil…",
    profileUnavailable: "Le profil est momentanément indisponible.",
    profileMissing: "Votre profil Lewad est introuvable.",
    backApp: "Retour à la recherche",
    role: "Rôle",
    status: "Statut",
    memberSince: "Membre depuis",
    roleUser: "Utilisateur",
    roleAdmin: "Administrateur",
    roleSuperAdmin: "Super administrateur",
    statusActive: "Actif",
    statusSuspended: "Suspendu",
    statusDeleted: "Supprimé",
    credits: "Mes crédits",
    creditsSubtitle: "Votre solde de points et l’historique de vos mouvements.",
    walletBalance: "Solde de points",
    creditsText:
      "Les points servent à effectuer des recherches dans Lewad. 1 point = 1 recherche.",
    unlimitedRoleNote:
      "Votre rôle dispose de recherches illimitées dans l’espace Lewad.",
    zeroBalance:
      "Votre solde est à 0. Rechargez vos points pour continuer à utiliser Lewad.",
    rechargeCta: "Recharger mes points",
    loadingWallet: "Chargement du solde…",
    walletUnavailable: "Le solde est momentanément indisponible.",
    walletMissing: "Aucun portefeuille n’est encore associé à ce compte.",
    creditHistory: "Historique",
    historySubtitle:
      "Tous vos mouvements de points, du plus récent au plus ancien.",
    loadingLedger: "Chargement de l’historique…",
    ledgerUnavailable: "L’historique est momentanément indisponible.",
    noCreditMovements: "Aucun mouvement pour le moment",
    noCreditMovementsText:
      "Vos bonus, recharges et recherches apparaîtront ici.",
    movements: "mouvements",
    welcomeBonus: "Bonus de bienvenue",
    searchDebit: "Recherche",
    rechargeCredit: "Recharge",
    adminAdjustment: "Ajustement",
    referralBonus: "Partage Lewad",
    movement: "Mouvement",
    showAllMovements: "Voir tout l’historique",
    showFewerMovements: "Réduire l’historique",
    pagination: {
      previous: "Précédent",
      next: "Suivant",
      page: "Page",
      of: "sur",
      items: "mouvements",
    },
    recharge: "Recharger",
    rechargeSubtitle:
      "Choisissez une offre fixe pour préparer votre demande de recharge.",
    fixedOffers: "Offres de recharge",
    popular: "Le plus choisi",
    rechargeSteps: "Étapes de recharge",
    paymentInformation: "Informations de paiement",
    reviewPayment: "Vérifiez votre demande",
    stepOne: "Étape 1",
    stepTwo: "Étape 2",
    stepThree: "Étape 3",
    continue: "Continuer",
    back: "Retour",
    paymentNumber: "Envoyez le montant au numéro Lewad : {number}",
    senderPhone: "Numéro utilisé pour l’envoi",
    bankingApp: "Application bancaire",
    chooseBankingApp: "Choisissez une application",
    acceptedBankingApps: "Applications acceptées",
    paymentValidation: "Veuillez renseigner ce champ.",
    offerTest: "Pour tester Lewad et faire quelques recherches.",
    offerRegular: "Pour une utilisation régulière.",
    offerAdvanced: "Pour une utilisation avancée.",
    chooseOffer: "Choisir cette offre",
    customRecharge: "Recharge personnalisée",
    pointsNumber: "Nombre de points",
    totalPrice: "Prix total",
    perPoint: "1 point = {price}",
    minimumPoints: "Minimum : 1 point",
    rechargeModalTitle: "Finaliser votre recharge",
    rechargeModalText:
      "Pour finaliser l’achat de vos points, contactez l’équipe Lewad sur WhatsApp. Nous vous guiderons pour le paiement et l’activation.",
    selectedOffer: "Offre sélectionnée",
    contactWhatsApp: "Contacter sur WhatsApp",
    closeRechargeModal: "Fermer la fenêtre de recharge",
    whatsappMessagePrefix: "Bonjour Lewad, je veux recharger mon compte avec",
    whatsappMessageFor: "pour",
    paymentNotice:
      "Le paiement en ligne n’est pas encore activé : la recharge se fait avec l’équipe Lewad.",
    activationNotice:
      "Les points seront ajoutés après approbation de votre demande par l’équipe Lewad.",
    rechargeRequestCreating: "Création de votre demande de recharge…",
    rechargeRequestCreated: "Demande de recharge créée.",
    rechargeRequestDuplicate:
      "Vous avez déjà une demande de recharge en attente.",
    rechargeRequestError: "Impossible de créer la demande de recharge.",
    rechargeRequestContinue:
      "Envoyez maintenant le message WhatsApp avec les informations de votre demande.",
    whatsappFallback:
      "WhatsApp ne s’est pas ouvert automatiquement. Utilisez le bouton ci-dessous.",
    whatsappMessageIntro:
      "Bonjour l’équipe Lewad,\nJe souhaite recharger mon compte.",
    whatsappUserName: "Nom du client",
    whatsappUserEmail: "E-mail",
    whatsappUserPhone: "Téléphone",
    whatsappOffer: "Offre",
    whatsappPoints: "Points demandés",
    whatsappAmount: "Montant envoyé",
    whatsappSenderPhone: "Numéro utilisé pour l’envoi",
    whatsappBankingApp: "Application bancaire",
    whatsappPaymentNumber: "Numéro Lewad payé",
    whatsappRequestId: "ID demande",
    whatsappThanks: "Merci.",
    history: "Historique",
    whereMyPoints: "Où sont passés mes points ?",
    establishmentsTitle: "Mes établissements",
    establishmentsSubtitle: "Les établissements que vous avez ajoutés à Lewad.",
    establishmentsEmpty: "Vous n’avez pas encore ajouté d’établissement.",
    establishmentsAdd: "Ajouter un établissement",
    establishmentsRefresh: "Actualiser",
    establishmentsLoading: "Chargement de vos établissements…",
    establishmentsError: "Vos établissements sont momentanément indisponibles.",
    establishmentsItems: "établissements",
    establishmentStats: "Statistiques",
    searches: "Recherches",
    branches: "Agences",
    approved: "Approuvé",
    pending: "En attente",
    rejected: "Refusé",
    subscription: "Abonnement",
    monthsUnit: "mois",
    statsUnavailable:
      "Les statistiques apparaîtront après les premières recherches.",

    viewStats: "Voir les statistiques",
    statsTitle: "Statistiques de l’établissement",
    days: "jours",
    timeRemaining: "Temps restant",
    renewalNeeded: "Paiement à renouveler",
    renewalUnavailable: "Date de renouvellement non disponible pour le moment.",
    profileComplete: "Profil complet",
    infoToComplete: "Informations à compléter",
    fieldName: "Nom",
    fieldCategory: "Catégorie",
    fieldPhone: "Téléphone",
    fieldWhatsapp: "WhatsApp",
    fieldLocation: "Localisation",
    fieldCoordinates: "Position carte",
    statusLabel: "Statut",
    subscriptionLabel: "Abonnement",
    branchesLabel: "Agences",
    verified: "Vérifié",
    notVerified: "Non vérifié",
    perPeriod: "/ {months} mois",
    settings: "Paramètres",
    settingsSubtitle:
      "Réglez l’apparence de Lewad et retrouvez les options de votre compte.",
    appearance: "Apparence et langue",
    appearanceText: "Le choix est conservé sur cet appareil.",
    language: "Langue",
    theme: "Thème",
    light: "Clair",
    dark: "Sombre",
    accountSection: "Compte",
    accountText:
      "Modifiez vos informations personnelles et votre photo depuis votre profil.",
    security: "Sécurité",
    securityText:
      "Les réglages de sécurité seront ajoutés avec le profil complet.",
    contact: "Contact",
    contactTitle: "Parlons de votre besoin.",
    contactText:
      "L’équipe Wasla Tech accompagne les utilisateurs et les établissements Lewad.",
    reason: "Motif",
    reasonOptions: [
      "Ajouter un établissement",
      "Demander un service",
      "Support compte",
      "Autre",
    ],
    message: "Votre message",
    messagePlaceholder: "Décrivez votre besoin en quelques lignes…",
    send: "Envoyer par e-mail",
    contactDetails: "Nous joindre",
  },
  ar: {
    account: "حسابي",
    pointsUnit: "نقاط",
    pointsUnavailable: "الرصيد غير متاح",
    retry: "إعادة المحاولة",
    readOnly: "للقراءة فقط",
    close: "إغلاق",
    profile: "الملف الشخصي",
    profileSubtitle: "معلوماتك في Lewad. تُستخدم للتعريف بك لدى المؤسسات.",
    personalInfo: "المعلومات الشخصية",
    email: "البريد الإلكتروني",
    fullName: "الاسم الكامل",
    fullNameAr: "الاسم الكامل بالعربية",
    fullNameArHint: "يُعرض بدل الاسم اللاتيني عندما يكون Lewad بالعربية.",
    phone: "الهاتف",
    phoneHint: "8 أرقام تبدأ بـ 2 أو 3 أو 4.",
    avatar: "صورة الملف الشخصي",
    avatarUrl: "رابط صورة الملف الشخصي",
    avatarHint: "الصيغ المقبولة: PNG أو JPG أو JPEG.",
    chooseImage: "اختر صورة",
    avatarUploadNotActive: "سيتم تفعيل رفع الصورة بعد إعداد التخزين.",
    saveProfile: "حفظ",
    savingProfile: "جارٍ الحفظ…",
    profileUpdated: "تم تحديث الملف الشخصي.",
    profileUpdateError: "تعذر حفظ ملفك الشخصي حاليًا. حاول بعد قليل.",
    fullNameRequired: "يرجى إدخال الاسم الكامل.",
    phoneRequired: "يرجى إدخال رقم الهاتف.",
    invalidPhone:
      "يجب أن يتكون الرقم من 8 أرقام بالضبط وأن يبدأ بـ 2 أو 3 أو 4.",
    invalidArabicFullName: "يجب أن يحتوي الاسم العربي على أحرف عربية فقط.",
    invalidAvatarFormat: "يجب أن تكون الصورة بصيغة PNG أو JPG أو JPEG.",
    profileDatabaseNote: "تُحفظ هذه المعلومات في ملفك الشخصي على Lewad.",
    loadingProfile: "جارٍ تحميل الملف الشخصي…",
    profileUnavailable: "الملف الشخصي غير متاح مؤقتًا.",
    profileMissing: "تعذر العثور على ملفك الشخصي في Lewad.",
    backApp: "العودة إلى البحث",
    role: "الدور",
    status: "الحالة",
    memberSince: "عضو منذ",
    roleUser: "مستخدم",
    roleAdmin: "مشرف",
    roleSuperAdmin: "مشرف عام",
    statusActive: "نشط",
    statusSuspended: "موقوف",
    statusDeleted: "محذوف",
    credits: "نقاطي",
    creditsSubtitle: "رصيدك من النقاط وسجل حركاتك.",
    walletBalance: "رصيد النقاط",
    creditsText:
      "تُستخدم النقاط لإجراء عمليات بحث في Lewad. نقطة واحدة = عملية بحث واحدة.",
    unlimitedRoleNote: "دورك يسمح بعمليات بحث غير محدودة داخل Lewad.",
    zeroBalance: "رصيدك 0. أعد شحن نقاطك لمتابعة استخدام Lewad.",
    rechargeCta: "شحن نقاطي",
    loadingWallet: "جارٍ تحميل الرصيد…",
    walletUnavailable: "الرصيد غير متاح مؤقتًا.",
    walletMissing: "لا توجد محفظة مرتبطة بهذا الحساب بعد.",
    creditHistory: "السجل",
    historySubtitle: "كل حركات نقاطك، من الأحدث إلى الأقدم.",
    loadingLedger: "جارٍ تحميل السجل…",
    ledgerUnavailable: "السجل غير متاح مؤقتًا.",
    noCreditMovements: "لا توجد حركات حتى الآن",
    noCreditMovementsText: "ستظهر هنا مكافآتك وعمليات الشحن وعمليات البحث.",
    movements: "حركات",
    welcomeBonus: "مكافأة الترحيب",
    searchDebit: "بحث",
    rechargeCredit: "شحن",
    adminAdjustment: "تعديل",
    referralBonus: "مشاركة Lewad",
    movement: "حركة",
    showAllMovements: "عرض السجل كاملًا",
    showFewerMovements: "تصغير السجل",
    pagination: {
      previous: "السابق",
      next: "التالي",
      page: "الصفحة",
      of: "من",
      items: "حركة",
    },
    recharge: "شحن",
    rechargeSubtitle: "اختر عرضًا ثابتًا لإعداد طلب إعادة الشحن.",
    fixedOffers: "عروض الشحن",
    popular: "الأكثر اختيارًا",
    rechargeSteps: "خطوات الشحن",
    paymentInformation: "معلومات الدفع",
    reviewPayment: "راجع طلبك",
    stepOne: "الخطوة 1",
    stepTwo: "الخطوة 2",
    stepThree: "الخطوة 3",
    continue: "متابعة",
    back: "رجوع",
    paymentNumber: "أرسل المبلغ إلى رقم Lewad: {number}",
    senderPhone: "الرقم المستخدم في الإرسال",
    bankingApp: "التطبيق البنكي",
    chooseBankingApp: "اختر التطبيق البنكي",
    acceptedBankingApps: "التطبيقات المقبولة",
    paymentValidation: "يرجى ملء هذا الحقل.",
    offerTest: "لتجربة Lewad وإجراء بعض عمليات البحث.",
    offerRegular: "لاستخدام منتظم.",
    offerAdvanced: "لاستخدام متقدم.",
    chooseOffer: "اختر هذا العرض",
    customRecharge: "شحن مخصص",
    pointsNumber: "عدد النقاط",
    totalPrice: "السعر الإجمالي",
    perPoint: "نقطة واحدة = {price}",
    minimumPoints: "الحد الأدنى: نقطة واحدة",
    rechargeModalTitle: "إتمام شحن النقاط",
    rechargeModalText:
      "لإتمام شراء نقاطك، تواصل مع فريق Lewad عبر واتساب. سنرشدك إلى الدفع والتفعيل.",
    selectedOffer: "العرض المختار",
    contactWhatsApp: "التواصل عبر واتساب",
    closeRechargeModal: "إغلاق نافذة الشحن",
    whatsappMessagePrefix: "مرحبًا Lewad، أريد شحن حسابي بـ",
    whatsappMessageFor: "مقابل",
    paymentNotice: "الدفع الإلكتروني غير مفعّل بعد: يتم الشحن مع فريق Lewad.",
    activationNotice: "ستُضاف النقاط بعد موافقة فريق Lewad على طلب الشحن.",
    rechargeRequestCreating: "جارٍ إنشاء طلب إعادة الشحن…",
    rechargeRequestCreated: "تم إنشاء طلب إعادة الشحن.",
    rechargeRequestDuplicate: "لديك بالفعل طلب إعادة شحن معلق.",
    rechargeRequestError: "تعذر إنشاء طلب إعادة الشحن.",
    rechargeRequestContinue: "أرسل الآن رسالة واتساب مع معلومات طلبك.",
    whatsappFallback: "لم يُفتح واتساب تلقائيًا. استخدم الزر أدناه.",
    whatsappMessageIntro: "السلام عليكم فريق Lewad،\nأريد شحن حسابي بالنقاط.",
    whatsappUserName: "اسم العميل",
    whatsappUserEmail: "البريد الإلكتروني",
    whatsappUserPhone: "الهاتف",
    whatsappOffer: "العرض",
    whatsappPoints: "النقاط المطلوبة",
    whatsappAmount: "المبلغ المرسل",
    whatsappSenderPhone: "الرقم المستخدم في الإرسال",
    whatsappBankingApp: "التطبيق البنكي",
    whatsappPaymentNumber: "رقم Lewad الذي تم الدفع إليه",
    whatsappRequestId: "معرّف الطلب",
    whatsappThanks: "شكرًا.",
    history: "السجل",
    whereMyPoints: "أين ذهبت نقاطي؟",
    establishmentsTitle: "مؤسساتي",
    establishmentsSubtitle: "المؤسسات التي أضفتها إلى Lewad.",
    establishmentsEmpty: "لم تقم بإضافة أي مؤسسة بعد.",
    establishmentsAdd: "إضافة مؤسسة",
    establishmentsRefresh: "تحديث",
    establishmentsLoading: "جارٍ تحميل مؤسساتك…",
    establishmentsError: "مؤسساتك غير متاحة مؤقتًا.",
    establishmentsItems: "مؤسسات",
    establishmentStats: "الإحصائيات",
    searches: "عمليات البحث",
    branches: "الفروع",
    approved: "مقبول",
    pending: "قيد الانتظار",
    rejected: "مرفوض",
    subscription: "الاشتراك",
    monthsUnit: "أشهر",
    statsUnavailable: "ستظهر الإحصائيات بعد أولى عمليات البحث.",

    viewStats: "عرض الإحصائيات",
    statsTitle: "إحصائيات المؤسسة",
    days: "يومًا",
    timeRemaining: "الوقت المتبقي",
    renewalNeeded: "يجب تجديد الدفع",
    renewalUnavailable: "تاريخ التجديد غير متوفر حاليًا.",
    profileComplete: "الملف مكتمل",
    infoToComplete: "معلومات يجب إكمالها",
    fieldName: "الاسم",
    fieldCategory: "التصنيف",
    fieldPhone: "الهاتف",
    fieldWhatsapp: "واتساب",
    fieldLocation: "الموقع",
    fieldCoordinates: "الموقع على الخريطة",
    statusLabel: "الحالة",
    subscriptionLabel: "الاشتراك",
    branchesLabel: "الفروع",
    verified: "موثّق",
    notVerified: "غير موثّق",
    perPeriod: "/ {months} أشهر",
    settings: "الإعدادات",
    settingsSubtitle: "اضبط مظهر Lewad واطّلع على خيارات حسابك.",
    appearance: "المظهر واللغة",
    appearanceText: "يُحفظ اختيارك على هذا الجهاز.",
    language: "اللغة",
    theme: "السمة",
    light: "فاتح",
    dark: "داكن",
    accountSection: "الحساب",
    accountText: "عدّل معلوماتك الشخصية وصورتك من ملفك الشخصي.",
    security: "الأمان",
    securityText: "ستضاف إعدادات الأمان مع الملف الشخصي الكامل.",
    contact: "التواصل",
    contactTitle: "لنتحدث عن حاجتك.",
    contactText: "فريق Wasla Tech يرافق مستخدمي ومؤسسات Lewad.",
    reason: "السبب",
    reasonOptions: ["إضافة مؤسسة", "طلب خدمة", "دعم الحساب", "أخرى"],
    message: "رسالتك",
    messagePlaceholder: "صف حاجتك في بضعة أسطر…",
    send: "الإرسال عبر البريد الإلكتروني",
    contactDetails: "كيف تصل إلينا",
  },
  en: {
    account: "My account",
    pointsUnit: "points",
    pointsUnavailable: "Balance unavailable",
    retry: "Try again",
    readOnly: "Read only",
    close: "Close",
    profile: "Profile",
    profileSubtitle:
      "Your Lewad information. It identifies you to the businesses you contact.",
    personalInfo: "Personal information",
    email: "Email address",
    fullName: "Full name",
    fullNameAr: "Full name in Arabic",
    fullNameArHint: "Shown instead of the Latin name when Lewad is in Arabic.",
    phone: "Phone",
    phoneHint: "8 digits, starting with 2, 3 or 4.",
    avatar: "Profile image",
    avatarUrl: "Profile image URL",
    avatarHint: "Accepted formats: PNG, JPG or JPEG.",
    chooseImage: "Choose an image",
    avatarUploadNotActive:
      "Image upload will be activated after storage configuration.",
    saveProfile: "Save",
    savingProfile: "Saving…",
    profileUpdated: "Profile updated.",
    profileUpdateError:
      "We could not save your profile right now. Please try again shortly.",
    fullNameRequired: "Please enter your full name.",
    phoneRequired: "Please enter your phone number.",
    invalidPhone:
      "The number must contain exactly 8 digits and start with 2, 3, or 4.",
    invalidArabicFullName:
      "The Arabic name must contain Arabic characters only.",
    invalidAvatarFormat: "The image must be a PNG, JPG, or JPEG file.",
    profileDatabaseNote: "This information is stored in your Lewad profile.",
    loadingProfile: "Loading profile…",
    profileUnavailable: "Profile is temporarily unavailable.",
    profileMissing: "Your Lewad profile could not be found.",
    backApp: "Back to search",
    role: "Role",
    status: "Status",
    memberSince: "Member since",
    roleUser: "User",
    roleAdmin: "Administrator",
    roleSuperAdmin: "Super administrator",
    statusActive: "Active",
    statusSuspended: "Suspended",
    statusDeleted: "Deleted",
    credits: "My credits",
    creditsSubtitle: "Your points balance and the history of your movements.",
    walletBalance: "Points balance",
    creditsText:
      "Points are used to run searches in Lewad. 1 point = 1 search.",
    unlimitedRoleNote: "Your role has unlimited searches in the Lewad space.",
    zeroBalance:
      "Your balance is 0. Recharge your points to continue using Lewad.",
    rechargeCta: "Recharge my points",
    loadingWallet: "Loading balance…",
    walletUnavailable: "Balance is temporarily unavailable.",
    walletMissing: "No wallet is associated with this account yet.",
    creditHistory: "History",
    historySubtitle: "Every points movement, newest first.",
    loadingLedger: "Loading history…",
    ledgerUnavailable: "History is temporarily unavailable.",
    noCreditMovements: "No movements yet",
    noCreditMovementsText:
      "Your bonuses, recharges and searches will appear here.",
    movements: "movements",
    welcomeBonus: "Welcome bonus",
    searchDebit: "Search",
    rechargeCredit: "Recharge",
    adminAdjustment: "Adjustment",
    referralBonus: "Share Lewad",
    movement: "Movement",
    showAllMovements: "Show full history",
    showFewerMovements: "Show less",
    pagination: {
      previous: "Previous",
      next: "Next",
      page: "Page",
      of: "of",
      items: "movements",
    },
    recharge: "Recharge",
    rechargeSubtitle: "Choose a fixed offer to prepare your recharge request.",
    fixedOffers: "Recharge offers",
    popular: "Most chosen",
    rechargeSteps: "Recharge steps",
    paymentInformation: "Payment information",
    reviewPayment: "Review your request",
    stepOne: "Step 1",
    stepTwo: "Step 2",
    stepThree: "Step 3",
    continue: "Continue",
    back: "Back",
    paymentNumber: "Send the amount to Lewad number: {number}",
    senderPhone: "Sender phone number",
    bankingApp: "Banking app",
    chooseBankingApp: "Choose a banking app",
    acceptedBankingApps: "Accepted banking apps",
    paymentValidation: "Please complete this field.",
    offerTest: "To try Lewad and run a few searches.",
    offerRegular: "For regular use.",
    offerAdvanced: "For advanced use.",
    chooseOffer: "Choose this offer",
    customRecharge: "Custom recharge",
    pointsNumber: "Number of points",
    totalPrice: "Total price",
    perPoint: "1 point = {price}",
    minimumPoints: "Minimum: 1 point",
    rechargeModalTitle: "Complete your recharge",
    rechargeModalText:
      "To complete your points purchase, contact the Lewad team on WhatsApp. We will guide you through payment and activation.",
    selectedOffer: "Selected offer",
    contactWhatsApp: "Contact on WhatsApp",
    closeRechargeModal: "Close recharge dialog",
    whatsappMessagePrefix: "Hello Lewad, I want to recharge my account with",
    whatsappMessageFor: "for",
    paymentNotice:
      "Online payment is not enabled yet: recharges are handled with the Lewad team.",
    activationNotice:
      "Points will be added after the Lewad team approves your recharge request.",
    rechargeRequestCreating: "Creating your recharge request…",
    rechargeRequestCreated: "Recharge request created.",
    rechargeRequestDuplicate: "You already have a pending recharge request.",
    rechargeRequestError: "Could not create recharge request.",
    rechargeRequestContinue:
      "Now send the WhatsApp message with your request details.",
    whatsappFallback:
      "WhatsApp did not open automatically. Use the button below.",
    whatsappMessageIntro: "Hello Lewad team,\nI want to recharge my account.",
    whatsappUserName: "Client name",
    whatsappUserEmail: "Email",
    whatsappUserPhone: "Phone",
    whatsappOffer: "Offer",
    whatsappPoints: "Requested points",
    whatsappAmount: "Amount sent",
    whatsappSenderPhone: "Sender phone number",
    whatsappBankingApp: "Banking app",
    whatsappPaymentNumber: "Lewad payment number",
    whatsappRequestId: "Request ID",
    whatsappThanks: "Thank you.",
    history: "History",
    whereMyPoints: "Where did my points go?",
    establishmentsTitle: "My establishments",
    establishmentsSubtitle: "Establishments you have added to Lewad.",
    establishmentsEmpty: "You have not added an establishment yet.",
    establishmentsAdd: "Add establishment",
    establishmentsRefresh: "Refresh",
    establishmentsLoading: "Loading your establishments…",
    establishmentsError: "Your establishments are temporarily unavailable.",
    establishmentsItems: "establishments",
    establishmentStats: "Stats",
    searches: "Searches",
    branches: "Branches",
    approved: "Approved",
    pending: "Pending",
    rejected: "Rejected",
    subscription: "Subscription",
    monthsUnit: "months",
    statsUnavailable: "Stats will appear after the first searches.",

    viewStats: "View stats",
    statsTitle: "Establishment stats",
    days: "days",
    timeRemaining: "Time remaining",
    renewalNeeded: "Payment renewal needed",
    renewalUnavailable: "Renewal date is not available yet.",
    profileComplete: "Profile complete",
    infoToComplete: "Information to complete",
    fieldName: "Name",
    fieldCategory: "Category",
    fieldPhone: "Phone",
    fieldWhatsapp: "WhatsApp",
    fieldLocation: "Location",
    fieldCoordinates: "Map position",
    statusLabel: "Status",
    subscriptionLabel: "Subscription",
    branchesLabel: "Branches",
    verified: "Verified",
    notVerified: "Not verified",
    perPeriod: "/ {months} months",
    settings: "Settings",
    settingsSubtitle: "Adjust how Lewad looks and find your account options.",
    appearance: "Appearance and language",
    appearanceText: "Your choice is kept on this device.",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    accountSection: "Account",
    accountText:
      "Update your personal information and photo from your profile.",
    security: "Security",
    securityText: "Security settings will be added with the complete profile.",
    contact: "Contact",
    contactTitle: "Let’s talk about what you need.",
    contactText: "The Wasla Tech team supports Lewad users and businesses.",
    reason: "Reason",
    reasonOptions: [
      "Add a business",
      "Request a service",
      "Account support",
      "Other",
    ],
    message: "Your message",
    messagePlaceholder: "Describe what you need in a few lines…",
    send: "Send by email",
    contactDetails: "Reach us",
  },
} as const;

type Copy = (typeof copy)[Locale];

/** Shared by the member and team-space profile editors so both use one safe patch flow. */
export function profilePageCopy(locale: Locale) {
  return copy[locale];
}

function avatarImageSource(url: string, updatedAt: string) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}v=${encodeURIComponent(updatedAt)}`;
}

const navIdOf: Record<PrivatePageName, AppNavId> = {
  profile: "profile",
  credits: "credits",
  recharge: "recharge",
  settings: "settings",
  history: "history",
};

/** Le rôle et le statut sont stockés en clés techniques : jamais montrés tels quels. */
function roleLabel(value: Db1Profile["role"], text: Copy) {
  if (value === "admin") return text.roleAdmin;
  if (value === "super_admin") return text.roleSuperAdmin;
  return text.roleUser;
}

function statusLabel(value: Db1Profile["status"], text: Copy) {
  if (value === "suspended") return text.statusSuspended;
  if (value === "deleted") return text.statusDeleted;
  return text.statusActive;
}

/* ---------------------------------------------------------------- mise en page */

/**
 * En-tête de page membre : le titre tombe toujours au même endroit d'une page à
 * l'autre, ce qui donne à l'espace connecté sa continuité.
 */
function PageHeader({
  title,
  text,
  action,
  backButton,
}: {
  title: string;
  text?: string;
  action?: ReactNode;
  backButton?: boolean;
}) {
  return (
    <header className="page-glow relative overflow-hidden rounded-3xl border border-line bg-surface/85 p-5 card-elevated backdrop-blur-sm sm:p-6">
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -end-12 -top-16 size-40 rounded-full bg-tint-3/55 blur-2xl"
      />
      {backButton && <BackButton />}
      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[26px] leading-tight font-bold tracking-tight text-ink sm:text-3xl lg:text-[34px]">
            {title}
          </h1>
          {text && (
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base sm:leading-7">
              {text}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </header>
  );
}

function SectionTitle({
  title,
  text,
  aside,
}: {
  title: string;
  text?: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <div className="min-w-0">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {text && <p className="mt-1 text-sm leading-6 text-muted">{text}</p>}
      </div>
      {aside}
    </div>
  );
}

/** Ligne de donnée non modifiable : libellé discret, valeur affirmée. */
function ReadOnlyRow({
  label,
  children,
  ltr = false,
}: {
  label: string;
  children: ReactNode;
  ltr?: boolean;
}) {
  return (
    <div className="bg-surface px-4 py-3.5">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd
        className={`mt-1.5 flex items-center gap-2 text-sm font-semibold text-ink ${ltr ? "ltr-isolate" : ""}`}
      >
        {children}
      </dd>
    </div>
  );
}

/* ---------------------------------------------------------------- page racine */

export function ProtectedAppPage({ page }: { page: PrivatePageName }) {
  const { locale } = useI18n();
  const { loading: accountLoading } = useAccount();
  const text = copy[locale];
  const heading = text[page];

  if (accountLoading) return <AccountLoading />;

  return (
    <AppShell
      active={navIdOf[page]}
      documentTitle={heading}
      skipLabel={heading}
    >
      <main id="app-main" className={`${appWrap} ${appPad}`}>
        {page === "profile" && <ProfilePage text={text} />}
        {page === "credits" && <CreditsPage text={text} />}
        {page === "recharge" && <RechargePage text={text} />}
        {page === "settings" && <SettingsPage text={text} />}
        {page === "history" && <HistoryPage />}
      </main>
    </AppShell>
  );
}

/* ---------------------------------------------------------------- profil */

function ProfilePage({ text }: { text: Copy }) {
  const { locale } = useI18n();
  const { user, profile, loading, profileError, refresh, authFullName } =
    useAccount();

  if (loading && !profile) {
    return (
      <>
        <PageHeader
          title={text.profile}
          text={text.profileSubtitle}
          backButton
        />
        <div
          className="mt-7 grid gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-6"
          role="status"
          aria-busy="true"
        >
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
    );
  }

  if (!profile) {
    return (
      <>
        <PageHeader
          title={text.profile}
          text={text.profileSubtitle}
          backButton
        />
        <InlineAlert
          tone="error"
          className="mt-7"
          action={
            <button
              type="button"
              className={btnGhost}
              onClick={() => void refresh()}
            >
              <Icon name="arrow" size={16} />
              {text.retry}
            </button>
          }
        >
          {profileError ? text.profileUnavailable : text.profileMissing}
        </InlineAlert>
      </>
    );
  }

  const displayName =
    profileDisplayName(profile, locale, authFullName) ?? text.account;
  const email = profile.email ?? user?.email ?? null;

  return (
    <>
      <PageHeader
        title={text.profile}
        text={text.profileSubtitle}
        backButton
        action={
          <div className="flex flex-wrap gap-2">
            <a href="/history" className={btnGhost}>
              <Icon name="clock" size={16} />
              {text.history}
            </a>
            <a href="/app" className={btnGhost}>
              <span className="rtl:rotate-180">
                <Icon name="chevronLeft" size={16} />
              </span>
              {text.backApp}
            </a>
          </div>
        }
      />

      {/* Desktop : identité épinglée à gauche, formulaire à droite. Mobile :
          empilé, l'identité en premier — « c'est bien mon compte ». */}
      <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-6">
        <IdentityCard
          text={text}
          profile={profile}
          displayName={displayName}
          email={email}
        />
        <ProfileForm
          text={text}
          profile={profile}
          email={email ?? "—"}
          onSaved={refresh}
        />
      </div>
      <ClientEstablishmentsSection text={text} />
    </>
  );
}

const CLIENT_ESTABLISHMENTS_PAGE_SIZE = 6;

function ClientEstablishmentsSection({ text }: { text: Copy }) {
  const { locale } = useI18n();
  const [items, setItems] = useState<ClientEstablishment[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const paginatedItems = useMemo(
    () =>
      paginateItems(items, {
        page,
        pageSize: CLIENT_ESTABLISHMENTS_PAGE_SIZE,
      }),
    [items, page],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setPage(1);
    try {
      setItems((await getMyEstablishmentsWithStats()).items);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <section
      id="establishments"
      className="mt-8 rounded-3xl border border-line bg-tint-5/20 p-4 card-elevated sm:p-6"
      aria-labelledby="my-establishments"
    >
      <SectionTitle
        title={text.establishmentsTitle}
        text={text.establishmentsSubtitle}
        aside={
          <a href="/add-business" className={btnGhost}>
            <Icon name="plus" size={16} />
            {text.establishmentsAdd}
          </a>
        }
      />
      {loading ? (
        <div className="mt-4 grid gap-3" role="status" aria-busy="true">
          {[0, 1].map((row) => (
            <Skeleton key={row} className="h-36 w-full" />
          ))}
          <span className="sr-only">{text.establishmentsLoading}</span>
        </div>
      ) : error ? (
        <InlineAlert
          tone="error"
          className="mt-4"
          action={
            <button
              type="button"
              className={btnGhost}
              onClick={() => void load()}
            >
              <Icon name="arrow" size={16} />
              {text.establishmentsRefresh}
            </button>
          }
        >
          {text.establishmentsError}
        </InlineAlert>
      ) : items.length === 0 ? (
        <div className="mt-4">
          <EmptyState icon="store" title={text.establishmentsEmpty} />
        </div>
      ) : (
        <>
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {paginatedItems.data.map((item) => (
              <EstablishmentCard
                key={item.id}
                item={item}
                text={text}
                locale={locale}
              />
            ))}
          </div>
          {paginatedItems.totalPages > 1 && (
            <PaginationControls
              page={paginatedItems.page}
              totalPages={paginatedItems.totalPages}
              totalCount={paginatedItems.totalCount}
              labels={{ ...text.pagination, items: text.establishmentsItems }}
              disabled={loading}
              onPageChange={setPage}
            />
          )}
        </>
      )}
    </section>
  );
}

function establishmentStatus(
  status: ClientEstablishment["status"],
  text: Copy,
) {
  if (status === "approved") return text.approved;
  if (status === "pending") return text.pending;
  if (status === "rejected") return text.rejected;
  return text.status;
}

function formatMonthCount(months: number, locale: Locale, text: Copy) {
  return `${formatNumber(months, locale)} ${text.monthsUnit}`;
}

function EstablishmentCard({
  item,
  text,
  locale,
}: {
  item: ClientEstablishment;
  text: Copy;
  locale: Locale;
}) {
  const [statsOpen, setStatsOpen] = useState(false);
  return (
    <article className={`${card} relative min-w-0 overflow-hidden p-5`}>
      <div className="absolute inset-y-0 start-0 w-1 bg-gradient-to-b from-brand-deep to-answer opacity-50" />
      <div className="relative flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-bold text-ink" dir="auto">
            {locale === "ar" && item.nameAr ? item.nameAr : item.name}
          </h3>
          {item.category && (
            <p className="mt-1 truncate text-sm text-muted">{item.category}</p>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'approved' ? 'bg-answer-bg text-answer' : item.status === 'rejected' ? 'bg-ask-bg text-ask' : 'bg-surface-2 text-ink-soft'}`}>
          {establishmentStatus(item.status, text)}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted">{text.branches}</p>
          <p className="mt-1 font-semibold text-ink">
            {formatNumber(item.branchCount, locale)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted">{text.subscription}</p>
          <p className="mt-1 font-semibold text-ink">
            {item.subscriptionPeriodMonths === null
              ? "—"
              : formatMonthCount(item.subscriptionPeriodMonths, locale, text)}
          </p>
        </div>
      </div>
      {item.searchAppearances === null && (
        <p className="mt-4 text-sm leading-6 text-muted">
          {text.statsUnavailable}
        </p>
      )}
      {(item.mainPhone || item.mainWhatsapp || item.mainLocation) && (
        <div className="mt-4 grid gap-1 text-sm text-muted">
          {item.mainPhone && <p dir="auto">{item.mainPhone}</p>}
          {item.mainWhatsapp && <p dir="auto">{item.mainWhatsapp}</p>}
          {item.mainLocation && <p dir="auto">{item.mainLocation}</p>}
        </div>
      )}
      <button
        type="button"
        className={`${btnPrimary} mt-4 w-full justify-center`}
        onClick={() => setStatsOpen(true)}
      >
        <Icon name="eye" size={16} />
        {text.viewStats}
      </button>
      {statsOpen && (
        <ClientEstablishmentStatsPanel
          item={item}
          text={text}
          locale={locale}
          onClose={() => setStatsOpen(false)}
        />
      )}
    </article>
  );
}

function getMissingEstablishmentFields(
  item: ClientEstablishment,
  text: Copy,
): string[] {
  const missing: string[] = [];
  if (!item.name) missing.push(text.fieldName);
  if (!item.category) missing.push(text.fieldCategory);
  if (!item.mainPhone) missing.push(text.fieldPhone);
  if (!item.mainWhatsapp) missing.push(text.fieldWhatsapp);
  if (!item.mainLocation) missing.push(text.fieldLocation);
  if (item.latitude === null || item.longitude === null)
    missing.push(text.fieldCoordinates);
  return missing;
}

const DAYS_PER_SUBSCRIPTION_MONTH = 30;
const MILLISECONDS_PER_DAY = 86_400_000;

function renewalDaysLeft(item: ClientEstablishment): number | null {
  const start = item.approvedAt ?? item.createdAt;
  const months = item.subscriptionPeriodMonths;
  if (!start || !months) return null;
  const startMs = new Date(start).getTime();
  if (!Number.isFinite(startMs)) return null;
  const endMs = startMs + months * DAYS_PER_SUBSCRIPTION_MONTH * MILLISECONDS_PER_DAY;
  return Math.ceil((endMs - Date.now()) / MILLISECONDS_PER_DAY);
}

function ClientEstablishmentStatsPanel({
  item,
  text,
  locale,
  onClose,
}: {
  item: ClientEstablishment;
  text: Copy;
  locale: Locale;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const missingFields = getMissingEstablishmentFields(item, text);
  const profileComplete = missingFields.length === 0;
  const daysLeft = renewalDaysLeft(item);
  const expired = daysLeft !== null && daysLeft <= 0;

  useEffect(() => {
    const restoreFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 20);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreFocus?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/45 p-0 backdrop-blur-[3px] sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-surface shadow-2xl sm:rounded-3xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="estats-title"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-tint-5/45 px-5 py-4 backdrop-blur-md">
          <h3 id="estats-title" className="text-base font-bold text-ink">
            {text.statsTitle}
          </h3>
          <button
            ref={closeButtonRef}
            type="button"
            className={iconBtn}
            onClick={onClose}
            aria-label={text.close}
          >
            <Icon name="close" size={18} />
          </button>
        </div>

        <div className="grid gap-px bg-line">
          {/* A. Visibility / Searches */}
          <section className="bg-tint-1/25 px-5 py-4">
            <h4 className="text-xs font-semibold text-muted">
              {text.searches}
            </h4>
            {item.searchAppearances !== null ? (
              <p className="mt-2 text-2xl font-bold text-ink tabular">
                {formatNumber(item.searchAppearances, locale)}
              </p>
            ) : (
              <p className="mt-2 text-sm leading-6 text-muted">
                {text.statsUnavailable}
              </p>
            )}
          </section>

          {/* B. Payment / Renewal */}
          <section className="bg-tint-3/25 px-5 py-4">
            <h4 className="text-xs font-semibold text-muted">
              {text.timeRemaining}
            </h4>
            {item.status !== "approved" ? (
              <p className="mt-2 text-sm font-semibold text-ink">
                {establishmentStatus(item.status, text)}
              </p>
            ) : daysLeft === null ? (
              <p className="mt-2 text-sm leading-6 text-muted">
                {text.renewalUnavailable}
              </p>
            ) : expired ? (
              <p className="mt-2 text-sm font-semibold text-ask">
                {text.renewalNeeded}
              </p>
            ) : (
              <p className="mt-2 text-2xl font-bold text-ink tabular">
                {daysLeft} {text.days}
              </p>
            )}
            {item.subscriptionAmountMro !== null &&
              item.subscriptionPeriodMonths !== null && (
                <p className="mt-1 text-xs text-muted">
                  {formatCurrency(item.subscriptionAmountMro, locale)}{" "}
                  {text.perPeriod.replace(
                    "{months}",
                    formatNumber(item.subscriptionPeriodMonths, locale),
                  )}
                </p>
              )}
          </section>

          {/* C. Profile completeness */}
          <section className="bg-tint-5/25 px-5 py-4">
            <h4 className="text-xs font-semibold text-muted">
              {text.infoToComplete}
            </h4>
            {profileComplete ? (
              <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-answer">
                <Icon name="check" size={16} />
                {text.profileComplete}
              </p>
            ) : (
              <ul className="mt-2 grid gap-1 text-sm text-ink">
                {missingFields.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <Icon
                      name="alert"
                      size={14}
                      className="shrink-0 text-ask"
                    />
                    {f}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* D. Status summary */}
          <section className="bg-surface px-5 py-4">
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs font-semibold text-muted">
                  {text.statusLabel}
                </dt>
                <dd className="mt-1 font-semibold text-ink">
                  {establishmentStatus(item.status, text)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">
                  {text.branchesLabel}
                </dt>
                <dd className="mt-1 font-semibold text-ink">
                  {formatNumber(item.branchCount, locale)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold text-muted">
                  {text.subscriptionLabel}
                </dt>
                <dd className="mt-1 font-semibold text-ink">
                  {item.subscriptionPeriodMonths === null
                    ? "\u2014"
                    : formatMonthCount(item.subscriptionPeriodMonths, locale, text)}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

function IdentityCard({
  text,
  profile,
  displayName,
  email,
}: {
  text: Copy;
  profile: Db1Profile;
  displayName: string;
  email: string | null;
}) {
  const { locale } = useI18n();
  const active = profile.status === "active";

  return (
    <section
      className={`${card} relative overflow-hidden lg:sticky lg:top-24`}
      aria-labelledby="profile-identity"
    >
      <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-deep via-brand to-answer opacity-60" />
      <div className="relative flex items-center gap-4 border-b border-line bg-page-alt p-5 sm:p-6">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl bg-brand text-2xl font-bold text-brand-ink sm:size-20">
          {profile.avatar_url ? (
            <img
              src={avatarImageSource(profile.avatar_url, profile.updated_at)}
              alt={text.avatar}
              className="size-full object-cover"
            />
          ) : (
            initialOf(displayName)
          )}
        </span>
        <div className="min-w-0">
          <h2
            id="profile-identity"
            dir="auto"
            className="truncate text-lg font-bold sm:text-xl"
          >
            {displayName}
          </h2>
          {email && (
            <p className="ltr-isolate mt-1 truncate text-sm text-muted">
              {email}
            </p>
          )}
        </div>
      </div>

      <dl className="grid gap-px bg-line">
        <ReadOnlyRow label={text.status}>
          <span
            className={`${pill} ${active ? "bg-answer-bg text-answer" : "bg-ask-bg text-ask"}`}
          >
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${active ? "bg-answer" : "bg-ask"}`}
            />
            {statusLabel(profile.status, text)}
          </span>
        </ReadOnlyRow>
        <ReadOnlyRow label={text.role}>
          <span className={`${pill} bg-surface-2 text-ink-soft`}>
            {roleLabel(profile.role, text)}
          </span>
        </ReadOnlyRow>
        <ReadOnlyRow label={text.memberSince}>
          {formatDate(profile.created_at, locale)}
        </ReadOnlyRow>
      </dl>
    </section>
  );
}

export function ProfileForm({
  text,
  profile,
  email,
  onSaved,
}: {
  text: Copy;
  profile: Db1Profile;
  email: string;
  onSaved: () => Promise<void>;
}) {
  const { t, locale } = useI18n();
  const avatarText = t.profileAvatar;
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [fullNameAr, setFullNameAr] = useState(profile.full_name_ar ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? "");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<File | null>(null);
  const [notice, setNotice] = useState<{
    text: string;
    error?: boolean;
    neutral?: boolean;
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFullName(profile.full_name ?? "");
    setFullNameAr(profile.full_name_ar ?? "");
    setPhone(profile.phone ?? "");
    setAvatarUrl(profile.avatar_url ?? "");
    setAvatarPreview(null);
    setSelectedAvatar(null);
  }, [profile]);

  useEffect(
    () => () => {
      if (avatarPreview?.startsWith("blob:"))
        URL.revokeObjectURL(avatarPreview);
    },
    [avatarPreview],
  );

  const selectAvatar = (event: ChangeEvent<HTMLInputElement>) => {
    const image = event.target.files?.[0];
    if (!image) return;

    if (isAvatarFileTooLarge(image)) {
      event.target.value = "";
      setNotice({ text: avatarText.fileTooLarge, error: true });
      return;
    }

    if (!isAllowedAvatarFile(image)) {
      event.target.value = "";
      setNotice({ text: avatarText.unsupportedImage, error: true });
      return;
    }

    setSelectedAvatar(image);
    setAvatarPreview(URL.createObjectURL(image));
    setNotice(null);
    event.target.value = "";
  };

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const trimmedArabicName = fullNameAr.trim();
    const normalizedPhone = normalizeMauritanianPhone(trimmedPhone);
    const currentName = profile.full_name?.trim() ?? "";
    const currentArabicName = profile.full_name_ar?.trim() ?? "";
    const currentPhone = normalizeMauritanianPhone(profile.phone?.trim() ?? "");
    const patch: SafeProfileUpdate = {};

    if (trimmedName && trimmedName !== currentName) {
      if (trimmedName.length > 120)
        return setNotice({ text: avatarText.fullNameTooLong, error: true });
      patch.full_name = trimmedName;
    }

    if (trimmedArabicName && trimmedArabicName !== currentArabicName) {
      if (trimmedArabicName.length > 120)
        return setNotice({ text: avatarText.fullNameTooLong, error: true });
      if (!isValidArabicName(trimmedArabicName))
        return setNotice({ text: text.invalidArabicFullName, error: true });
      patch.full_name_ar = trimmedArabicName;
    }

    if (trimmedPhone && normalizedPhone !== currentPhone) {
      if (!isValidMauritanianPhone(trimmedPhone))
        return setNotice({ text: avatarText.invalidPhone, error: true });
      patch.phone = normalizedPhone;
    }

    const pendingAvatar = selectedAvatar;
    if (Object.keys(patch).length === 0 && !pendingAvatar) {
      // Empty optional values are intentionally ignored; put the persisted
      // values back in the form so the user can see that nothing was removed.
      setFullName(profile.full_name ?? "");
      setFullNameAr(profile.full_name_ar ?? "");
      setPhone(profile.phone ?? "");
      setNotice({ text: avatarText.noChangesToSave, neutral: true });
      return;
    }

    setNotice(null);

    const workflowResult = await saveProfileWithOptionalAvatar({
      patch,
      avatar: pendingAvatar,
      uploadAvatar: uploadMyAvatar,
      updateProfile: updateMyProfile,
      onUploadStateChange: setUploading,
      onSaveStateChange: setSaving,
    });

    if (workflowResult.kind === "avatar_failed") {
      const errorText =
        workflowResult.error === "file_too_large"
          ? avatarText.fileTooLarge
          : workflowResult.error === "invalid_file"
            ? avatarText.unsupportedImage
            : avatarText.uploadFailed;
      setNotice({ text: errorText, error: true });
      return;
    }

    const result = workflowResult.result;

    if (result.error || !result.data) {
      setNotice({
        text:
          result.error === "duplicate_phone"
            ? avatarText.phoneAlreadyUsed
            : text.profileUpdateError,
        error: true,
      });
      return;
    }

    setFullName(result.data.full_name ?? "");
    setFullNameAr(result.data.full_name_ar ?? "");
    setPhone(result.data.phone ?? "");
    setAvatarUrl(result.data.avatar_url ?? "");
    setAvatarPreview(null);
    setSelectedAvatar(null);
    await onSaved();
    setNotice({
      text: pendingAvatar
        ? avatarText.profileImageUpdated
        : avatarText.profileSaved,
    });
  };

  return (
    <section
      className={`${card} overflow-hidden`}
      aria-labelledby="profile-form-title"
    >
      <div className="border-b border-line bg-page-alt/50 p-5 sm:p-6">
        <SectionTitle
          title={text.personalInfo}
          text={text.profileDatabaseNote}
        />
        <h2 id="profile-form-title" className="sr-only">
          {text.personalInfo}
        </h2>
      </div>

      <form
        className="grid gap-5 p-5 sm:p-6"
        noValidate
        onSubmit={(event) => void saveProfile(event)}
      >
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
              maxLength={120}
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
              maxLength={120}
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
            maxLength={16}
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
                <img
                  src={avatarPreview || avatarUrl}
                  alt={text.avatar}
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-lg font-bold text-brand-deep">
                  {initialOf(
                    profileDisplayName(profile, locale, null) ?? text.account,
                  )}
                </span>
              )}
            </span>
            <input
              ref={avatarInput}
              type="file"
              accept="image/png,image/jpeg"
              className="sr-only"
              aria-label={text.avatar}
              onChange={selectAvatar}
            />
            <button
              type="button"
              disabled={saving || uploading}
              className={`${btnGhost} shrink-0`}
              onClick={() => avatarInput.current?.click()}
            >
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
              <input
                id="profile-email"
                className={`${fieldReadOnly} ltr-isolate`}
                value={email}
                readOnly
                tabIndex={-1}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className={fieldLabel}>{text.role}</span>
                <p className={`${fieldReadOnly} flex items-center`}>
                  {roleLabel(profile.role, text)}
                </p>
              </div>
              <div>
                <span className={fieldLabel}>{text.status}</span>
                <p className={`${fieldReadOnly} flex items-center`}>
                  {statusLabel(profile.status, text)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {notice && (
          <InlineAlert
            tone={
              notice.error ? "error" : notice.neutral ? "neutral" : "success"
            }
          >
            {notice.text}
          </InlineAlert>
        )}

        <div>
          <button
            type="submit"
            disabled={saving || uploading}
            className={`${btnPrimary} w-full sm:w-auto`}
          >
            {uploading
              ? avatarText.uploadingAvatar
              : saving
                ? avatarText.savingProfile
                : avatarText.saveProfile}
            <Icon name="check" size={17} />
          </button>
        </div>
      </form>
    </section>
  );
}

/* ---------------------------------------------------------------- crédits */

function CreditsPage({ text }: { text: Copy }) {
  const { locale } = useI18n();
  const { user, profile, wallet, loading, walletError, refresh } = useAccount();
  const [ledgerPage, setLedgerPage] = useState(1);
  const ledger = useCreditLedger(user?.id, ledgerPage);
  const balance =
    typeof wallet?.balance === "number" && Number.isFinite(wallet.balance)
      ? wallet.balance
      : null;
  const isWalletLoading = loading && balance === null;
  const hasUnlimitedSearches = isAdminRole(profile?.role);

  return (
    <>
      <PageHeader title={text.credits} text={text.creditsSubtitle} backButton />

      {/* Desktop : le solde reste épinglé pendant qu'on parcourt l'historique. */}
      <div className="mt-7 grid items-start gap-5 lg:grid-cols-[minmax(0,23rem)_minmax(0,1fr)] lg:gap-6">
        <section
          className="relative overflow-hidden rounded-3xl border border-panel-line bg-panel p-6 text-panel-ink card-elevated sm:p-7 lg:sticky lg:top-24"
          aria-labelledby="wallet-balance"
        >
          <div className="absolute -end-16 -top-20 size-48 rounded-full bg-brand/15 blur-3xl" />
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand via-tint-3 to-brand opacity-90" />
          <h2 id="wallet-balance" className="relative text-sm font-semibold text-panel-muted">
            {text.walletBalance}
          </h2>

          {isWalletLoading ? (
            <p role="status" aria-busy="true">
              <Skeleton className="mt-3 h-12 w-40" />
              <span className="sr-only">{text.loadingWallet}</span>
            </p>
          ) : balance !== null ? (
            <p className="mt-2 flex flex-wrap items-baseline gap-2">
              <span className="tabular text-[42px] leading-none font-bold tracking-tight text-panel-ink sm:text-5xl">
                {formatNumber(balance, locale)}
              </span>
              <span className="text-lg font-semibold text-panel-muted">
                {text.pointsUnit}
              </span>
            </p>
          ) : (
            <p className="mt-3 text-lg font-semibold text-panel-muted">
              {text.pointsUnavailable}
            </p>
          )}

          <p className="relative mt-4 text-sm leading-6 text-panel-muted">
            {text.creditsText}
          </p>

          <a
            href="/history"
            className="relative mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand underline-offset-4 hover:underline"
          >
            <Icon name="clock" size={16} />
            {text.whereMyPoints}
            <span className="rtl:rotate-180">
              <Icon name="arrow" size={15} />
            </span>
          </a>

          {hasUnlimitedSearches && (
            <InlineAlert tone="info" className="mt-5">
              {text.unlimitedRoleNote}
            </InlineAlert>
          )}

          {balance === 0 && !hasUnlimitedSearches && (
            <InlineAlert
              tone="info"
              className="mt-5"
              action={
                <a href="/recharge" className={btnPrimary}>
                  {text.rechargeCta}
                </a>
              }
            >
              {text.zeroBalance}
            </InlineAlert>
          )}

          {!isWalletLoading && balance === null && (
            <InlineAlert
              tone="error"
              className="mt-5"
              action={
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => void refresh()}
                >
                  <Icon name="arrow" size={16} />
                  {text.retry}
                </button>
              }
            >
              {walletError ? text.walletUnavailable : text.walletMissing}
            </InlineAlert>
          )}

          {(balance !== 0 || hasUnlimitedSearches) && (
            <a
              href="/recharge"
              className={`${btnPrimary} mt-6 w-full sm:w-auto`}
            >
              {text.rechargeCta}
              <span className="rtl:rotate-180">
                <Icon name="arrow" size={17} />
              </span>
            </a>
          )}
        </section>

        <section
          className={`${card} overflow-hidden`}
          aria-labelledby="credit-history"
        >
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
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => void ledger.refresh()}
                  >
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
  );
}

function LedgerRow({
  entry,
  text,
}: {
  entry: Db1CreditLedgerEntry;
  text: Copy;
}) {
  const { locale } = useI18n();
  const typeLabels: Partial<Record<CreditLedgerType, string>> = {
    welcome_bonus: text.welcomeBonus,
    search_debit: text.searchDebit,
    recharge_credit: text.rechargeCredit,
    admin_adjustment: text.adminAdjustment,
    referral_bonus: text.referralBonus,
  };
  const amount = Number.isFinite(entry.amount) ? entry.amount : 0;
  const label = typeLabels[entry.type as CreditLedgerType] ?? text.movement;
  const isCredit = amount > 0;

  return (
    <article className="flex items-start gap-3 rounded-xl border border-line bg-surface px-3.5 py-3 card-elevated sm:items-center sm:px-4">
      {/* Le sens du mouvement se lit à la flèche autant qu'à la couleur : rien
          d'essentiel n'est porté par la seule teinte. */}
      <span
        aria-hidden="true"
        className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full sm:mt-0 ${
          isCredit ? "bg-answer-bg text-answer" : "bg-ask-bg text-ask"
        }`}
      >
        <Icon name={isCredit ? "arrowUp" : "arrowDown"} size={17} />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          <time dateTime={entry.created_at}>
            {formatDate(entry.created_at, locale)}
          </time>
          {entry.reason && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{entry.reason}</span>
            </>
          )}
        </p>
      </div>

      <span
        className={`pt-1 tabular shrink-0 text-sm font-bold sm:pt-0 ${isCredit ? "text-answer" : "text-ask"}`}
      >
        {formatSignedPoints(amount, locale, text.pointsUnit)}
      </span>
    </article>
  );
}

/* ---------------------------------------------------------------- recharge */

type RechargeOffer = {
  code: RechargeOfferCode;
  points: number;
  amountMro: number;
  description: string;
  icon: IconName;
  featured: boolean;
  surfaceClass: string;
  iconClass: string;
};

type RechargeNotice = {
  tone: "success" | "error" | "info";
  text: string;
} | null;

type RechargeRequester = {
  name: string;
  email: string | null;
  phone: string | null;
};

function rechargeWhatsAppUrl({
  request,
  requester,
  senderPhone,
  bankingApp,
  text,
  locale,
}: {
  request: RechargeRequest;
  requester: RechargeRequester;
  senderPhone: string;
  bankingApp: string;
  text: Copy;
  locale: Locale;
}) {
  const details = [
    text.whatsappMessageIntro,
    "",
    `${text.whatsappUserName}: ${requester.name}`,
    requester.email ? `${text.whatsappUserEmail}: ${requester.email}` : null,
    requester.phone ? `${text.whatsappUserPhone}: ${requester.phone}` : null,
    `${text.whatsappOffer}: ${request.offerLabel}`,
    `${text.whatsappPoints}: ${formatNumber(request.requestedPoints, locale)} ${text.pointsUnit}`,
    `${text.whatsappAmount}: ${formatCurrency(request.amountMro, locale)}`,
    `${text.whatsappSenderPhone}: ${senderPhone}`,
    `${text.whatsappBankingApp}: ${bankingApp}`,
    `${text.whatsappPaymentNumber}: ${contactDetails.paymentNumber}`,
    "",
    text.whatsappThanks,
  ].filter((line): line is string => Boolean(line));

  return `${contactDetails.whatsappHref}?text=${encodeURIComponent(details.join("\n"))}`;
}

function RechargePage({ text }: { text: Copy }) {
  const { locale } = useI18n();
  const { user, profile, authFullName } = useAccount();
  const [selection, setSelection] = useState<RechargeRequest | null>(null);
  const [selectedOffer, setSelectedOffer] = useState<RechargeOffer | null>(
    null,
  );
  const [senderPhone, setSenderPhone] = useState("");
  const [bankingApp, setBankingApp] = useState("");
  const [step, setStep] = useState(1);
  const [paymentError, setPaymentError] = useState(false);
  const [creatingOffer, setCreatingOffer] = useState<RechargeOfferCode | null>(
    null,
  );
  const [notice, setNotice] = useState<RechargeNotice>(null);
  const [whatsAppOpened, setWhatsAppOpened] = useState(true);
  const closeModal = useCallback(() => setSelection(null), []);

  const offers: RechargeOffer[] = rechargeOffers.map((offer) => ({
    ...offer,
    description:
      offer.code === "starter_10"
        ? text.offerTest
        : offer.code === "regular_30"
          ? text.offerRegular
          : text.offerAdvanced,
    icon: offer.code === "advanced_100" ? "wallet" : "sparkle",
    surfaceClass:
      offer.code === "starter_10"
        ? "bg-tint-1/55"
        : offer.code === "regular_30"
          ? "bg-tint-3/55"
          : "bg-tint-5/55",
    iconClass:
      offer.code === "starter_10"
        ? "bg-tint-1 text-tint-ink-1"
        : offer.code === "regular_30"
          ? "bg-tint-3 text-tint-ink-3"
          : "bg-tint-5 text-tint-ink-5",
  }));

  const requester: RechargeRequester = {
    name:
      profileDisplayName(profile, locale, authFullName) ??
      user?.email ??
      text.account,
    email: user?.email ?? null,
    phone: profile?.phone ?? null,
  };

  const startRechargeRequest = async () => {
    if (!selectedOffer || !senderPhone.trim() || !bankingApp) {
      setPaymentError(true);
      return;
    }
    if (creatingOffer) return;

    setCreatingOffer(selectedOffer.code);
    setNotice({ tone: "info", text: text.rechargeRequestCreating });
    const result = await createRechargeRequest(selectedOffer.code);
    setCreatingOffer(null);

    if (!result.ok || !result.request) {
      setNotice({ tone: "error", text: text.rechargeRequestError });
      return;
    }

    const whatsAppUrl = rechargeWhatsAppUrl({
      request: result.request,
      requester,
      senderPhone: senderPhone.trim(),
      bankingApp,
      text,
      locale,
    });
    const opened = window.open(whatsAppUrl, "_blank", "noopener,noreferrer");
    setWhatsAppOpened(Boolean(opened));
    setSelection(result.request);
    setNotice({
      tone: "success",
      text: `${result.status === "duplicate" ? text.rechargeRequestDuplicate : text.rechargeRequestCreated} ${text.rechargeRequestContinue}`,
    });
  };

  return (
    <>
      <PageHeader
        title={text.recharge}
        text={text.rechargeSubtitle}
        backButton
      />

      <InlineAlert tone="info" className="mt-6" title={text.activationNotice}>
        {text.paymentNotice}
      </InlineAlert>

      {notice && (
        <InlineAlert tone={notice.tone} className="mt-4">
          {notice.text}
        </InlineAlert>
      )}

      <div
        className="mt-7 grid grid-cols-3 gap-1 rounded-2xl border border-line bg-surface/80 p-1.5 card-elevated"
        aria-label={text.rechargeSteps}
      >
        {[text.stepOne, text.stepTwo, text.stepThree].map((label, index) => (
          <span
            key={label}
            aria-current={step === index + 1 ? "step" : undefined}
            className={`inline-flex min-h-10 items-center justify-center rounded-xl px-2 text-center text-xs font-bold transition-colors ${step === index + 1 ? "bg-brand text-brand-ink shadow-sm" : index + 1 < step ? "bg-answer-bg text-answer" : "text-muted"}`}
          >
            {label}
          </span>
        ))}
      </div>

      {step === 1 && (
        <section className="mt-6" aria-labelledby="recharge-offers">
          <h2 id="recharge-offers" className="text-lg font-bold tracking-tight">
            {text.fixedOffers}
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {offers.map((offer) => (
              <article
                key={offer.points}
                className={`relative flex flex-col overflow-hidden rounded-3xl border p-5 card-elevated sm:p-6 ${offer.surfaceClass} ${
                  offer.featured
                    ? "border-brand-deep shadow-md dark:border-brand card-elevated"
                    : "border-line"
                }`}
              >
                {offer.featured && (
                  <div className="absolute inset-x-0 top-0 h-1 rounded-t-2xl bg-gradient-to-r from-brand-deep via-brand to-answer opacity-70" />
                )}
                {offer.featured && (
                  <span
                    className={`${pill} absolute -top-2.5 start-5 bg-brand text-brand-ink`}
                  >
                    {text.popular}
                  </span>
                )}
                <span className={`grid size-11 place-items-center rounded-2xl ${offer.iconClass}`}>
                  <Icon name={offer.icon} size={20} />
                </span>
                <p className="mt-5 flex items-baseline gap-2 text-3xl font-bold tracking-tight">
                  <span className="tabular">
                    {formatNumber(offer.points, locale)}
                  </span>
                  <span className="text-base font-semibold text-muted">
                    {text.pointsUnit}
                  </span>
                </p>
                <p className="mt-1.5 text-base font-bold text-brand-deep dark:text-brand">
                  {formatCurrency(offer.amountMro, locale)}
                </p>
                <p className="mt-3 flex-1 text-sm leading-6 text-muted">
                  {offer.description}
                </p>
                <button
                  type="button"
                  className={`${offer.featured ? btnPrimary : btnGhost} mt-6 w-full`}
                  disabled={creatingOffer !== null}
                  aria-busy={creatingOffer === offer.code}
                  onClick={() => {
                    setSelectedOffer(offer);
                    setStep(2);
                    setNotice(null);
                  }}
                >
                  {creatingOffer === offer.code
                    ? text.rechargeRequestCreating
                    : text.chooseOffer}
                  <span className="rtl:rotate-180">
                    <Icon name="arrow" size={17} />
                  </span>
                </button>
              </article>
            ))}
          </div>
        </section>
      )}

      {step === 2 && selectedOffer && (
        <section className={`${card} mt-6 overflow-hidden bg-tint-1/25 p-5 sm:p-6`}>
          <h2 className="text-lg font-bold">{text.paymentInformation}</h2>
          <p className="mt-3 rounded-xl border border-line bg-page-alt px-4 py-3 text-sm font-semibold text-ink">
            {text.paymentNumber.replace(
              "{number}",
              contactDetails.paymentNumber,
            )}
          </p>
          <p className="mt-4 text-sm font-semibold text-muted">
            {formatNumber(selectedOffer.points, locale)} {text.pointsUnit} ·{" "}
            {formatCurrency(selectedOffer.amountMro, locale)}
          </p>
          <div className="mt-5 grid gap-4">
            <div>
              <label className={fieldLabel} htmlFor="recharge-sender-phone">
                {text.senderPhone}
              </label>
              <input
                id="recharge-sender-phone"
                className={`${field} mt-2`}
                value={senderPhone}
                onChange={(event) => setSenderPhone(event.target.value)}
                inputMode="tel"
              />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="recharge-banking-app">
                {text.bankingApp}
              </label>
              <select
                id="recharge-banking-app"
                className={`${field} mt-2`}
                value={bankingApp}
                onChange={(event) => setBankingApp(event.target.value)}
              >
                <option value="">{text.chooseBankingApp}</option>
                {paymentApps.map((app) => (
                  <option key={app} value={app}>
                    {app}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {paymentError && (
            <p className="mt-3 text-sm text-ask" role="alert">
              {text.paymentValidation}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              className={btnGhost}
              onClick={() => setStep(1)}
            >
              {text.back}
            </button>
            <button
              type="button"
              className={`${btnPrimary} sm:flex-1`}
              onClick={() => {
                if (senderPhone.trim() && bankingApp) {
                  setPaymentError(false);
                  setStep(3);
                } else setPaymentError(true);
              }}
            >
              {text.continue}
            </button>
          </div>
        </section>
      )}

      {step === 3 && selectedOffer && (
        <section className={`${card} mt-6 overflow-hidden bg-tint-3/25 p-5 sm:p-6`}>
          <h2 className="text-lg font-bold">{text.reviewPayment}</h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            {text.paymentNumber.replace(
              "{number}",
              contactDetails.paymentNumber,
            )}
          </p>
          <dl className="mt-4 grid gap-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{text.whatsappPoints}</dt>
              <dd className="font-semibold">
                {formatNumber(selectedOffer.points, locale)} {text.pointsUnit}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{text.whatsappSenderPhone}</dt>
              <dd className="font-semibold" dir="auto">
                {senderPhone}
              </dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-muted">{text.whatsappBankingApp}</dt>
              <dd className="font-semibold">{bankingApp}</dd>
            </div>
          </dl>
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              type="button"
              className={btnGhost}
              onClick={() => setStep(2)}
            >
              {text.back}
            </button>
            <button
              type="button"
              className={`${btnPrimary} sm:flex-1`}
              disabled={creatingOffer !== null}
              onClick={() => void startRechargeRequest()}
            >
              {creatingOffer
                ? text.rechargeRequestCreating
                : text.contactWhatsApp}
              <Icon name="message" size={17} />
            </button>
          </div>
        </section>
      )}

      <RechargeWhatsAppModal
        selection={selection}
        requester={requester}
        senderPhone={senderPhone}
        bankingApp={bankingApp}
        text={text}
        whatsAppOpened={whatsAppOpened}
        onClose={closeModal}
      />
    </>
  );
}

function RechargeWhatsAppModal({
  selection,
  requester,
  senderPhone,
  bankingApp,
  text,
  whatsAppOpened,
  onClose,
}: {
  selection: RechargeRequest | null;
  requester: RechargeRequester;
  senderPhone: string;
  bankingApp: string;
  text: Copy;
  whatsAppOpened: boolean;
  onClose: () => void;
}) {
  const { locale } = useI18n();
  const closeButton = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!selection) return;
    restoreFocus.current = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    const focusTimer = window.setTimeout(
      () => closeButton.current?.focus(),
      20,
    );

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = overflow;
      restoreFocus.current?.focus?.();
    };
  }, [onClose, selection]);

  if (!selection) return null;

  const pointsLabel = `${formatNumber(selection.requestedPoints, locale)} ${text.pointsUnit}`;
  const priceLabel = formatCurrency(selection.amountMro, locale);
  const whatsappUrl = rechargeWhatsAppUrl({
    request: selection,
    requester,
    senderPhone,
    bankingApp,
    text,
    locale,
  });

  return (
    <div
      className="fixed inset-0 z-60 grid place-items-end bg-ink/40 backdrop-blur-[2px] sm:place-items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recharge-modal-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {/* Mobile : feuille ancrée en bas, à portée du pouce. Desktop : boîte centrée. */}
      <section
        ref={dialogRef}
        className="max-h-[90dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-3xl border border-line bg-surface p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-7 sm:pb-7"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <span className="grid size-11 place-items-center rounded-xl bg-brand-soft text-brand-deep">
            <Icon name="message" size={21} />
          </span>
          <button
            ref={closeButton}
            type="button"
            className={iconBtn}
            aria-label={text.closeRechargeModal}
            onClick={onClose}
          >
            <Icon name="close" size={19} />
          </button>
        </div>

        <h2
          id="recharge-modal-title"
          className="mt-4 text-xl font-bold tracking-tight sm:text-2xl"
        >
          {text.rechargeModalTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">
          {text.rechargeModalText}
        </p>

        <div
          className={`${cardMuted} mt-5 flex items-center justify-between gap-3 p-4`}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted">
              {selection.offerLabel}
            </p>
            <p className="tabular mt-1 text-base font-bold text-ink">
              {pointsLabel}
            </p>
          </div>
          <p className="tabular shrink-0 text-base font-bold text-brand-deep dark:text-brand">
            {priceLabel}
          </p>
        </div>

        <p className="mt-3 flex items-start gap-2 text-xs leading-5 text-muted">
          <span className="mt-px shrink-0">
            <Icon name="info" size={14} />
          </span>
          {text.activationNotice}
        </p>

        {!whatsAppOpened && (
          <InlineAlert tone="info" className="mt-4">
            {text.whatsappFallback}
          </InlineAlert>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" className={btnGhost} onClick={onClose}>
            {text.close}
          </button>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className={btnPrimary}
          >
            {text.contactWhatsApp}
            <Icon name="message" size={17} />
          </a>
        </div>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- paramètres */

function SettingsPage({ text }: { text: Copy }) {
  const { t } = useI18n();
  const { profile } = useAccount();
  const settings = t.settings;
  const spaceHref = profile ? defaultDestinationForRole(profile.role) : null;

  return (
    <>
      <PageHeader
        title={settings.title}
        text={settings.subtitle}
        backButton
        action={
          spaceHref ? (
            <a href={spaceHref} className={btnGhost}>
              <span className="rtl:rotate-180">
                <Icon name="arrow" size={16} />
              </span>
              {settings.backToMySpace}
            </a>
          ) : undefined
        }
      />

      <div className="mt-7 grid gap-5 lg:grid-cols-2 lg:gap-6">
        {/* Langue, thème, taille du texte et réinitialisation du mot de passe
            sont partagés avec les espaces admin et super admin : une seule
            implémentation, trois espaces. */}
        <AppearanceSettings className="lg:col-span-2" />
        <PasswordResetSettings className="lg:col-span-2" />

        <SettingsCard
          title={text.accountSection}
          text={text.accountText}
          icon="user"
          href="/profile"
          linkLabel={text.profile}
        />
        <SettingsCard
          title={text.contact}
          text={text.contactText}
          icon="message"
          href="/contact"
          linkLabel={text.contact}
        />
      </div>
    </>
  );
}

function SettingsCard({
  title,
  text,
  icon,
  href,
  linkLabel,
}: {
  title: string;
  text: string;
  icon: IconName;
  href?: string;
  linkLabel?: string;
}) {
  const tone =
    icon === "message"
      ? "bg-tint-5/35"
      : "bg-tint-1/35";
  const iconTone =
    icon === "message"
      ? "bg-tint-5 text-tint-ink-5"
      : "bg-tint-1 text-tint-ink-1";

  return (
    <article className={`${card} ${tone} flex gap-4 p-5 sm:p-6`}>
      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${iconTone}`}>
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
  );
}

/* ---------------------------------------------------------------- contact */

export function ContactPage() {
  const { locale } = useI18n();
  const { isAuthenticated } = useAccount();
  const text = copy[locale];

  const channels: {
    icon: IconName;
    label: string;
    value: string;
    href: string;
    tone: string;
    iconTone: string;
  }[] = [
    {
      icon: "phone",
      label: text.phone,
      value: contactDetails.phoneDisplay,
      href: contactDetails.phoneHref,
      tone: "bg-tint-1/45",
      iconTone: "bg-tint-1 text-tint-ink-1",
    },
    {
      icon: "message",
      label: "WhatsApp",
      value: contactDetails.whatsappDisplay,
      href: contactDetails.whatsappHref,
      tone: "border-answer/25 bg-tint-5/60",
      iconTone: "bg-tint-5 text-tint-ink-5",
    },
    {
      icon: "globe",
      label: text.email,
      value: contactDetails.email,
      href: contactDetails.emailHref,
      tone: "bg-tint-3/45",
      iconTone: "bg-tint-3 text-tint-ink-3",
    },
  ];

  return (
    <AppShell
      active="contact"
      documentTitle={text.contact}
      skipLabel={text.contact}
      homeHref={isAuthenticated ? "/app" : "/"}
    >
      <main id="app-main" className={`${appWrap} ${appPad}`}>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-10">
          <section>
            <PageHeader
              title={text.contactTitle}
              text={text.contactText}
              backButton
            />

            <div className="mt-7">
              <h2 className="text-sm font-bold text-ink">
                {text.contactDetails}
              </h2>
              <ul className="mt-3 grid list-none gap-3">
                {channels.map((channel) => (
                  <li key={channel.label}>
                    <a
                      href={channel.href}
                      className={`group flex min-h-20 items-center gap-3 rounded-2xl border border-line px-4 py-3 card-elevated transition-transform duration-200 motion-safe:hover:-translate-y-0.5 ${channel.tone}`}
                    >
                      <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${channel.iconTone}`}>
                        <Icon name={channel.icon} size={17} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-muted">
                          {channel.label}
                        </span>
                        <span className="ltr-isolate block truncate text-sm font-semibold text-ink">
                          {channel.value}
                        </span>
                      </span>
                      <span className="shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5 rtl:rotate-180 rtl:group-hover:-translate-x-0.5">
                        <Icon name="arrow" size={16} />
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section
            className={`${card} p-5 sm:p-7`}
            aria-labelledby="contact-form-title"
          >
            <h2
              id="contact-form-title"
              className="text-lg font-bold tracking-tight"
            >
              {text.message}
            </h2>
            <form
              className="mt-5 grid gap-5"
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                const reason = String(form.get("reason") ?? "").trim();
                const message = String(form.get("message") ?? "").trim();
                const params = new URLSearchParams();
                if (reason) params.set("subject", `[Lewad] ${reason}`);
                if (message) params.set("body", message);
                window.location.href = `${contactDetails.emailHref}?${params.toString()}`;
              }}
            >
              <div>
                <label htmlFor="contact-reason" className={fieldLabel}>
                  {text.reason}
                </label>
                <select id="contact-reason" name="reason" className={field}>
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
                  name="message"
                  rows={6}
                  required
                  placeholder={text.messagePlaceholder}
                  className="w-full rounded-xl border border-line bg-surface p-3.5 text-base text-ink outline-none transition-colors placeholder:text-muted focus:border-brand-deep focus:ring-2 focus:ring-brand-deep/15 sm:text-sm"
                />
              </div>

              <button
                type="submit"
                className={`${btnPrimary} w-full sm:w-auto sm:justify-self-start`}
              >
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
  );
}

export function AddBusinessPage() {
  const { t } = useI18n();
  const copy = t.businessSubmission;

  return (
    <AppShell documentTitle={copy.title} skipLabel={copy.title}>
      <main id="app-main" className={`${appWrap} ${appPad}`}>
        <BackButton />
        <BusinessSubmissionForm />
      </main>
    </AppShell>
  );
}

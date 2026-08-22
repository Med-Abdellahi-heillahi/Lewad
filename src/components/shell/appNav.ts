import type { Locale } from "../../i18n";
import type { IconName } from "../Icon";

export type AppNavId =
  | "search"
  | "credits"
  | "recharge"
  | "history"
  | "profile"
  | "contact"
  | "settings";

export type AppNavItem = {
  id: AppNavId;
  href: string;
  icon: IconName;
  /** Replié hors de la barre desktop en dessous de `xl`, faute de place. */
  secondary?: boolean;
};

/**
 * Navigation applicative, dans l'ordre d'importance pour un membre.
 * Un seul tableau alimente la barre desktop, le tiroir mobile, la barre
 * d'onglets basse et le menu du compte : impossible qu'ils se désynchronisent.
 */
export const appNavItems: AppNavItem[] = [
  { id: "search", href: "/app", icon: "search" },
  { id: "credits", href: "/credits", icon: "wallet" },
  { id: "recharge", href: "/recharge", icon: "wallet" },
  { id: "history", href: "/history", icon: "clock", secondary: true },
  { id: "profile", href: "/profile", icon: "user" },
  { id: "contact", href: "/contact", icon: "message", secondary: true },
  { id: "settings", href: "/settings", icon: "gear", secondary: true },
];

/** Onglets du bas sur mobile : quatre au maximum, sinon les cibles rétrécissent. */
export const appTabIds: AppNavId[] = [
  "search",
  "history",
  "recharge",
  "profile",
];

export type AppShellCopy = {
  items: Record<AppNavId, string>;
  /** Libellés raccourcis pour la barre d'onglets, où la place est comptée. */
  shortItems: Partial<Record<AppNavId, string>>;
  menu: string;
  closeMenu: string;
  account: string;
  signIn: string;
  addEstablishment: string;
  signOut: string;
  signingOut: string;
  adminSpace: string;
  superAdminSpace: string;
  balance: string;
  pointsUnit: string;
  pointsUnavailable: string;
  appearance: string;
  language: string;
  theme: string;
  light: string;
  dark: string;
  primaryNav: string;
  guest: string;
  by: string;
  version: string;
  rights: string;
};

export const appShellCopy: Record<Locale, AppShellCopy> = {
  fr: {
    items: {
      search: "Recherche",
      credits: "Mes crédits",
      recharge: "Recharger",
      history: "Historique",
      profile: "Profil",
      contact: "Contact",
      settings: "Paramètres",
    },
    shortItems: { history: "Historique" },
    menu: "Ouvrir le menu",
    closeMenu: "Fermer le menu",
    account: "Mon compte",
    signIn: "Se connecter",
    addEstablishment: "Ajouter un établissement",
    signOut: "Se déconnecter",
    signingOut: "Déconnexion…",
    adminSpace: "Espace admin",
    superAdminSpace: "Espace super admin",
    balance: "Solde de points",
    pointsUnit: "points",
    pointsUnavailable: "Solde indisponible",
    appearance: "Apparence",
    language: "Langue",
    theme: "Thème",
    light: "Clair",
    dark: "Sombre",
    primaryNav: "Navigation Lewad",
    guest: "Visiteur",
    by: "By Wasla",
    version: "Version 1.0.0",
    rights: "© 2026 Wasla Soft",
  },
  ar: {
    items: {
      search: "البحث",
      credits: "نقاطي",
      recharge: "شحن",
      history: "السجل",
      profile: "الملف الشخصي",
      contact: "التواصل",
      settings: "الإعدادات",
    },
    shortItems: { history: "السجل" },
    menu: "فتح القائمة",
    closeMenu: "إغلاق القائمة",
    account: "حسابي",
    signIn: "تسجيل الدخول",
    addEstablishment: "إضافة مؤسسة",
    signOut: "تسجيل الخروج",
    signingOut: "جارٍ تسجيل الخروج…",
    adminSpace: "مساحة الإدارة",
    superAdminSpace: "مساحة المشرف العام",
    balance: "رصيد النقاط",
    pointsUnit: "نقاط",
    pointsUnavailable: "الرصيد غير متاح",
    appearance: "المظهر",
    language: "اللغة",
    theme: "السمة",
    light: "فاتح",
    dark: "داكن",
    primaryNav: "التنقل في Lewad",
    guest: "زائر",
    by: "By Wasla",
    version: "الإصدار 1.0.0",
    rights: "© 2026 Wasla Soft",
  },
  en: {
    items: {
      search: "Search",
      credits: "My credits",
      recharge: "Recharge",
      history: "History",
      profile: "Profile",
      contact: "Contact",
      settings: "Settings",
    },
    shortItems: { history: "History" },
    menu: "Open menu",
    closeMenu: "Close menu",
    account: "My account",
    signIn: "Sign in",
    addEstablishment: "Add an establishment",
    signOut: "Sign out",
    signingOut: "Signing out…",
    adminSpace: "Admin space",
    superAdminSpace: "Super admin space",
    balance: "Points balance",
    pointsUnit: "points",
    pointsUnavailable: "Balance unavailable",
    appearance: "Appearance",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    primaryNav: "Lewad navigation",
    guest: "Visitor",
    by: "By Wasla",
    version: "Version 1.0.0",
    rights: "© 2026 Wasla Soft",
  },
};

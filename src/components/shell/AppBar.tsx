import { useCallback, useState } from "react";
import { Menu, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { dictionaries, locales, useI18n, type Locale } from "../../i18n";
import { useAccount } from "../../hooks/useAccount";
import { signOut } from "../../lib/auth";
import { isAdminRole } from "../../lib/routeAuth";
import { formatNumber, initialOf, profileDisplayName } from "../../lib/format";
import { useTheme } from "../../lib/theme";
import { appWrap, btnGhost, btnPrimary, iconBtn } from "../../lib/ui";
import { FlagIcon } from "../FlagIcon";
import { Icon } from "../Icon";
import { Logo } from "../Logo";
import { Drawer } from "./Drawer";
import { LanguageMenu } from "./LanguageMenu";
import { ThemeToggle } from "./ThemeToggle";
import { UserArea } from "./UserArea";
import { AdminLanguageToggle } from "../admin/AdminLanguageToggle";
import { appNavItems, appShellCopy, type AppNavId } from "./appNav";

/** Controls for the contextual admin/super-admin sidebar. */
export type AdminBarProps = {
  productLabel: string;
  sectionLabel: string;
  roleLabel: string;
  sidebarCollapsed?: boolean;
  mobileSidebarOpen?: boolean;
  desktopToggleLabel?: string;
  mobileToggleLabel?: string;
  onDesktopSidebarToggle?: () => void;
  onMobileSidebarToggle?: () => void;
};

type AppBarProps = {
  /** Entrée de navigation correspondant à la page affichée. */
  active?: AppNavId;
  /** Cible du logo : `/app` pour un membre, `/` pour un visiteur. */
  homeHref?: string;
  /** Variante sans navigation membre pour l'espace d'administration. */
  admin?: AdminBarProps;
};

/**
 * Bandeau applicatif unique, partagé par `/app` et toutes les pages membre.
 *
 * Mobile  : logo · solde · avatar ouvrant un tiroir plein écran.
 * Desktop : logo · navigation en clair · solde · langue · thème · menu compte.
 *
 * Le desktop n'est pas le mobile étiré : il expose la navigation et le nom
 * complet, là où le mobile privilégie le solde et une cible tactile large.
 */
export function AppBar({ active, homeHref = "/app", admin }: AppBarProps) {
  const { locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const { user, isAuthenticated, profile, wallet, loading, walletError } =
    useAccount();
  const copy = appShellCopy[locale];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const displayName = profileDisplayName(profile, locale, null) ?? copy.account;
  const balanceNumber =
    wallet === null ? "0" : formatNumber(wallet.balance, locale);
  const balanceAria = `${copy.balance} : ${balanceNumber} ${copy.pointsUnit}`;
  const hasAdminAccess =
    isAuthenticated &&
    profile?.status === "active" &&
    isAdminRole(profile?.role);
  const isSuperAdmin = hasAdminAccess && profile?.role === "super_admin";
  const roleSpaceItems = hasAdminAccess
    ? [
        ...(isSuperAdmin
          ? [{ label: copy.superAdminSpace, href: "/super-admin" }]
          : []),
        { label: copy.adminSpace, href: "/admin" },
      ]
    : [];

  /*
   * Retour à l'accueil public après déconnexion. `replace` plutôt qu'`assign` :
   * la page membre ne reste pas dans l'historique, sinon un retour arrière
   * relancerait le garde et le renverrait vers /auth.
   */
  const endSession = async () => {
    setSigningOut(true);
    await signOut();
    window.location.replace("/");
  };

  /*
   * `/contact` est publique : un visiteur non connecté ne voit que ce qu'il peut
   * réellement ouvrir, plutôt qu'une liste de pages qui le renverraient à /auth.
   */
  const links = appNavItems
    .filter(
      (item) =>
        isAuthenticated || item.id === "search" || item.id === "contact",
    )
    .map((item) => ({ ...item, label: copy.items[item.id] }));
  const memberLinks = links.filter(
    (item) => !hasAdminAccess || item.id !== "recharge",
  );
  const accountItems = [
    ...roleSpaceItems,
    ...memberLinks
      .filter((item) => item.id !== "search")
      .map((item) => ({ label: item.label, href: item.href })),
    { label: copy.signOut, onSelect: () => void endSession() },
  ];

  const chooseLocale = (next: Locale) => setLocale(next);

  if (admin) {
    const adminAccountItems = isAuthenticated
      ? [{ label: copy.signOut, onSelect: () => void endSession() }]
      : [];

    return (
      <header
        className={`sticky top-0 z-40 border-b-2 backdrop-blur-md ${isSuperAdmin ? "border-indigo-400/50 bg-gradient-to-r from-indigo-50/80 via-page/85 to-violet-50/60 dark:from-indigo-950/40 dark:via-page/85 dark:to-violet-950/30" : "border-sky-300/50 bg-gradient-to-r from-sky-50/80 via-page/85 to-cyan-50/60 dark:from-sky-950/40 dark:via-page/85 dark:to-cyan-950/30"}`}
      >
        <div
          className={`${appWrap} flex h-16 items-center gap-2 sm:h-[72px] sm:gap-3`}
        >
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            {admin.onMobileSidebarToggle && (
              <button
                type="button"
                className={`${iconBtn} lg:hidden`}
                aria-label={admin.mobileToggleLabel}
                title={admin.mobileToggleLabel}
                aria-expanded={admin.mobileSidebarOpen}
                aria-haspopup="dialog"
                onClick={admin.onMobileSidebarToggle}
              >
                <Menu size={19} aria-hidden />
              </button>
            )}
            {/* Enveloppe nécessaire : `iconBtn` pose déjà `inline-flex`, qui l'emporte
                sur un `hidden` appliqué au même élément. Le bouton restait donc
                visible sur mobile, à côté du bouton menu. */}
            {admin.onDesktopSidebarToggle && (
              <span className="hidden lg:inline-flex">
                <button
                  type="button"
                  className={iconBtn}
                  aria-label={admin.desktopToggleLabel}
                  title={admin.desktopToggleLabel}
                  aria-pressed={admin.sidebarCollapsed}
                  onClick={admin.onDesktopSidebarToggle}
                >
                  {admin.sidebarCollapsed ? (
                    <PanelLeftOpen size={19} aria-hidden />
                  ) : (
                    <PanelLeftClose size={19} aria-hidden />
                  )}
                </button>
              </span>
            )}
            <p className="min-w-0 truncate text-sm font-bold text-ink lg:hidden">
              {admin.sectionLabel}
            </p>
            <div className="hidden min-w-0 lg:block">
              <p className="truncate text-[11px] font-bold tracking-[0.09em] text-muted uppercase rtl:tracking-normal rtl:normal-case">
                {admin.productLabel}
              </p>
              <h1 className="truncate text-base font-bold text-ink sm:text-lg">
                {admin.sectionLabel}
              </h1>
            </div>
            <span
              className={`${isSuperAdmin ? "bg-brand text-brand-ink" : "bg-surface-2 text-ink-soft"} hidden rounded-full px-2.5 py-1 text-[11px] font-bold lg:inline-flex`}
            >
              {admin.roleLabel}
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <AdminLanguageToggle />
            <ThemeToggle />
            {isAuthenticated ? (
              <div className="hidden lg:block">
                <UserArea
                  user={{ name: displayName, email: user?.email }}
                  items={adminAccountItems}
                />
              </div>
            ) : (
              <a href="/auth?mode=login" className={`${btnPrimary} hidden lg:inline-flex`}>
                {copy.signIn}
              </a>
            )}
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-line bg-page/85 backdrop-blur-md">
        <div
          className={`${appWrap} flex h-16 items-center gap-2 sm:h-[72px] sm:gap-3`}
        >
          <a
            href={homeHref}
            aria-label="Lewad"
            className="w-max shrink-0 rounded-lg"
          >
            <Logo compact />
          </a>

          {/* Desktop : la navigation occupe le centre de la barre. */}
          <nav
            aria-label={copy.primaryNav}
            className="hidden min-w-0 flex-1 justify-center lg:flex"
          >
            <ul className="flex list-none items-center gap-0.5">
              {memberLinks.map((link) => (
                <li
                  key={link.id}
                  className={link.secondary ? "hidden xl:block" : undefined}
                >
                  <a
                    href={link.href}
                    aria-current={link.id === active ? "page" : undefined}
                    className={`inline-flex min-h-10 items-center rounded-lg px-3 text-sm whitespace-nowrap transition-colors ${
                      link.id === active
                        ? "bg-surface-2 font-semibold text-ink"
                        : "font-medium text-muted hover:bg-surface-2 hover:text-ink"
                    }`}
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* Le solde est un élément autonome entre le logo et les actions : il
              ne peut pas se mélanger avec l'emblème ou les boutons. */}
          {isAuthenticated && (
            <span
              aria-label={balanceAria}
              className="ms-3 shrink-0 whitespace-nowrap text-sm font-semibold text-muted tabular"
            >
              {balanceNumber} {copy.pointsUnit}
            </span>
          )}

          <div className="ms-auto flex shrink-0 items-center gap-2">
            {isAuthenticated && (
              <a
                href="/add-business"
                className={`${iconBtn} hidden sm:inline-flex`}
                aria-label={copy.addEstablishment}
                title={copy.addEstablishment}
              >
                <Icon name="plus" size={20} />
              </a>
            )}

            {/* Les libellés compacts de ces contrôles gardent la barre mobile
                utilisable : logo · langue · thème · menu. */}
            <div className="flex items-center gap-2">
              <LanguageMenu align="end" />
              <ThemeToggle />
            </div>

            {isAuthenticated ? (
              <div className="hidden lg:block">
                <UserArea
                  user={{ name: displayName, email: user?.email }}
                  items={accountItems}
                />
              </div>
            ) : (
              <a href="/auth?mode=login" className={`${btnPrimary} hidden lg:inline-flex`}>
                {copy.signIn}
              </a>
            )}

            <button
              type="button"
              className={`${iconBtn} lg:hidden`}
              aria-label={copy.menu}
              aria-expanded={drawerOpen}
              aria-haspopup="dialog"
              onClick={() => setDrawerOpen(true)}
            >
              {isAuthenticated ? (
                <span className="grid size-7 place-items-center rounded-lg bg-brand-soft text-[13px] font-bold text-brand-deep">
                  {initialOf(displayName)}
                </span>
              ) : (
                <Icon name="menu" size={19} />
              )}
            </button>
          </div>
        </div>
      </header>

      <Drawer open={drawerOpen} onClose={closeDrawer} title={copy.primaryNav}>
        {isAuthenticated ? (
          <div className="rounded-2xl border border-line bg-page-alt p-4">
            <div className="flex items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand text-base font-bold text-brand-ink">
                {initialOf(displayName)}
              </span>
              <div className="min-w-0">
                <p dir="auto" className="truncate text-sm font-bold text-ink">
                  {displayName}
                </p>
                {user?.email && (
                  <p className="ltr-isolate truncate text-xs text-muted">
                    {user.email}
                  </p>
                )}
                {hasAdminAccess && (
                  <span className="mt-1 inline-flex rounded-full bg-brand-soft px-2 py-0.5 text-[10px] font-bold text-brand-deep">
                    {isSuperAdmin ? copy.superAdminSpace : copy.adminSpace}
                  </span>
                )}
              </div>
            </div>
            <a
              href="/credits"
              onClick={closeDrawer}
              className="mt-3 flex min-h-11 items-center justify-between gap-3 rounded-xl border border-line bg-surface px-3 text-sm"
            >
              <span className="font-semibold text-muted">{copy.balance}</span>
              <span className="tabular font-bold text-ink">
                {balanceNumber} {copy.pointsUnit}
              </span>
            </a>
            {walletError && !wallet && (
              <p className="mt-2 text-xs text-ask">{copy.pointsUnavailable}</p>
            )}
          </div>
        ) : (
          <a
            href="/auth?mode=login"
            onClick={closeDrawer}
            className={`${btnPrimary} w-full`}
          >
            {copy.signIn}
            <span className="rtl:rotate-180">
              <Icon name="arrow" size={16} />
            </span>
          </a>
        )}

        <nav aria-label={copy.primaryNav} className="mt-5">
          <ul className="list-none space-y-1">
            {roleSpaceItems.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={closeDrawer}
                  className="flex min-h-12 items-center gap-3 rounded-xl bg-brand-soft px-3 text-[15px] font-semibold text-brand-deep transition-colors hover:bg-brand/20"
                >
                  <Icon name="shield" size={19} />
                  {item.label}
                </a>
              </li>
            ))}
            {memberLinks.map((link) => (
              <li key={link.id}>
                <a
                  href={link.href}
                  onClick={closeDrawer}
                  aria-current={link.id === active ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-[15px] transition-colors ${
                    link.id === active
                      ? "bg-brand-soft font-semibold text-brand-deep"
                      : "font-medium text-ink-soft hover:bg-surface-2 hover:text-ink"
                  }`}
                >
                  <Icon name={link.icon} size={19} />
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* Langue et thème : au pouce dans le tiroir plutôt que compressés en haut. */}
        <div className="mt-5 border-t border-line pt-5 sm:hidden">
          <h3 className="text-[11px] font-bold tracking-[0.09em] text-muted uppercase rtl:tracking-normal rtl:normal-case">
            {copy.appearance}
          </h3>
          <div
            className="mt-3 grid grid-cols-3 gap-1.5 rounded-xl border border-line bg-surface p-1"
            role="group"
            aria-label={copy.language}
          >
            {locales.map((item) => (
              <button
                key={item}
                type="button"
                lang={item}
                onClick={() => chooseLocale(item)}
                aria-pressed={item === locale}
                className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  item === locale
                    ? "bg-brand-soft text-brand-deep"
                    : "text-muted hover:bg-surface-2"
                }`}
              >
                <FlagIcon locale={item} decorative />
                {dictionaries[item].meta.short}
              </button>
            ))}
          </div>
          <div
            className="mt-2 grid grid-cols-2 gap-1.5 rounded-xl border border-line bg-surface p-1"
            role="group"
            aria-label={copy.theme}
          >
            <button
              type="button"
              onClick={() => setTheme("light")}
              aria-pressed={theme === "light"}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${
                theme === "light"
                  ? "bg-brand-soft text-brand-deep"
                  : "text-muted hover:bg-surface-2"
              }`}
            >
              <Icon name="sun" size={16} />
              {copy.light}
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              aria-pressed={theme === "dark"}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-colors ${
                theme === "dark"
                  ? "bg-brand-soft text-brand-deep"
                  : "text-muted hover:bg-surface-2"
              }`}
            >
              <Icon name="moon" size={16} />
              {copy.dark}
            </button>
          </div>
        </div>

        {isAuthenticated && (
          <div className="mt-5 border-t border-line pt-5">
            <button
              type="button"
              className={`${btnGhost} w-full`}
              disabled={signingOut}
              onClick={() => void endSession()}
            >
              <Icon name="logOut" size={17} />
              {signingOut ? copy.signingOut : copy.signOut}
            </button>
          </div>
        )}
      </Drawer>
    </>
  );
}

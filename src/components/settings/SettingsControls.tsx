import React, { useState } from "react";
import { Sun, Moon, Lock, CheckCircle2, AlertCircle } from "lucide-react";
import { dictionaries, locales, useI18n } from "../../i18n";
import { FlagIcon } from "../FlagIcon";

// --- COMPOSANTS DE BASE (Internes) ---

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-gray-200 shadow-sm rounded-xl p-5 sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold tracking-tight text-gray-900">
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function OptionGroup({
  label,
  columns,
  children,
}: {
  label: string;
  columns: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-gray-700">{label}</p>
      <div
        className={`grid ${columns} gap-1 p-1 bg-gray-100 rounded-xl border border-gray-200/60`}
        role="group"
        aria-label={label}
      >
        {children}
      </div>
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`
        inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-all duration-200
        ${
          selected
            ? "bg-white text-blue-600 shadow-sm border border-gray-200/50"
            : "text-gray-600 hover:text-gray-900 hover:bg-gray-200/50 border border-transparent"
        }
      `}
    >
      {children}
    </button>
  );
}

// --- COMPOSANTS PRINCIPAUX (À exporter) ---

export function AppearanceSettings({ className = "" }: { className?: string }) {
  // La langue est branchée sur le contexte i18n réel : c'est le sélecteur
  // complet des trois langues, celui que la barre de navigation ne porte pas.
  const { locale, setLocale } = useI18n();
  // TODO(settings): thème et taille de texte sont encore des états locaux de
  // maquette — ils n'écrivent ni dans ThemeProvider ni dans TextSizeProvider.
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [textSize, setTextSize] = useState<"sm" | "base" | "lg" | "xl">("base");

  const textSizes = [
    { id: "sm", label: "Petit" },
    { id: "base", label: "Normal" },
    { id: "lg", label: "Grand" },
    { id: "xl", label: "Très grand" },
  ] as const;

  return (
    <div className={className}>
      <SettingsSection
        title="Apparence & Langue"
        description="Personnalisez l'affichage selon vos préférences. Vos choix sont sauvegardés automatiquement."
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:max-w-3xl">
          {/* Langues : les trois sont ici, drapeau + nom dans sa propre langue. */}
          <OptionGroup label="Langue de l'interface" columns="grid-cols-3">
            {locales.map((item) => (
              <OptionButton
                key={item}
                selected={item === locale}
                onClick={() => setLocale(item)}
              >
                <FlagIcon locale={item} decorative />
                <span lang={item} className="truncate">
                  {dictionaries[item].meta.label}
                </span>
              </OptionButton>
            ))}
          </OptionGroup>

          {/* Thème */}
          <OptionGroup label="Thème" columns="grid-cols-2">
            <OptionButton
              selected={theme === "light"}
              onClick={() => setTheme("light")}
            >
              <Sun size={16} /> Clair
            </OptionButton>
            <OptionButton
              selected={theme === "dark"}
              onClick={() => setTheme("dark")}
            >
              <Moon size={16} /> Sombre
            </OptionButton>
          </OptionGroup>

          {/* Taille du texte */}
          <div className="sm:col-span-2">
            <OptionGroup
              label="Taille du texte"
              columns="grid-cols-2 sm:grid-cols-4"
            >
              {textSizes.map((size) => (
                <OptionButton
                  key={size.id}
                  selected={textSize === size.id}
                  onClick={() => setTextSize(size.id)}
                >
                  {size.label}
                </OptionButton>
              ))}
            </OptionGroup>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

export function PasswordResetSettings({
  className = "",
}: {
  className?: string;
}) {
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const handleSendResetEmail = async () => {
    setSending(true);
    setNotice(null);

    // Simulation d'un appel API (ex: Supabase requestPasswordReset)
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500)); // Fake delay
      setNotice({
        tone: "success",
        text: "Un e-mail de réinitialisation vous a été envoyé. Vérifiez votre boîte de réception.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        text: "Impossible d'envoyer l'e-mail. Veuillez réessayer plus tard.",
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={className}>
      <SettingsSection title="Sécurité du compte">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-900">
              Mot de passe
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Vous recevrez un lien sécurisé par e-mail pour définir un nouveau
              mot de passe.
            </p>
          </div>
          <button
            type="button"
            disabled={sending}
            onClick={handleSendResetEmail}
            className="shrink-0 inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 focus:outline-none disabled:opacity-70 disabled:cursor-wait w-full sm:w-auto"
          >
            <Lock size={16} />
            {sending ? "Envoi en cours..." : "Réinitialiser le mot de passe"}
          </button>
        </div>

        {/* Alerte en ligne (Inline Alert) */}
        {notice && (
          <div
            className={`mt-4 flex items-start gap-3 rounded-lg p-4 text-sm ${
              notice.tone === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : "bg-red-50 text-red-800 border border-red-200"
            }`}
          >
            {notice.tone === "success" ? (
              <CheckCircle2 size={20} className="text-green-600 shrink-0" />
            ) : (
              <AlertCircle size={20} className="text-red-600 shrink-0" />
            )}
            <p className="font-medium mt-0.5">{notice.text}</p>
          </div>
        )}
      </SettingsSection>
    </div>
  );
}

// --- EXEMPLE D'UTILISATION ---

export default function SettingsPage() {
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Paramètres généraux
        </h1>
        <p className="text-gray-500 mt-1">
          Gérez vos préférences et la sécurité de votre compte.
        </p>
      </div>

      <AppearanceSettings />
      <PasswordResetSettings />
    </div>
  );
}

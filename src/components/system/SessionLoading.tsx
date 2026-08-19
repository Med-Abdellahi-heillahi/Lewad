import { useI18n } from '../../i18n'
import { Logo } from '../Logo'

/**
 * État d'attente pendant la vérification de la session Supabase.
 * Affiché par le garde de route : il doit rester sobre et ne jamais
 * laisser entrevoir le contenu protégé.
 */
export function SessionLoading({ label }: { label?: string }) {
  const { t } = useI18n()

  return (
    <main className="grid min-h-dvh place-items-center bg-page px-5" role="status" aria-live="polite" aria-busy="true">
      <div className="flex flex-col items-center gap-5">
        <Logo />
        <span aria-hidden="true" className="h-1 w-28 overflow-hidden rounded-full bg-surface-2">
          <span className="block h-full w-1/3 rounded-full bg-brand motion-safe:animate-[sessionSweep_1.1s_ease-in-out_infinite]" />
        </span>
        <span className="text-sm text-muted">{label ?? t.system.loading}</span>
      </div>
    </main>
  )
}

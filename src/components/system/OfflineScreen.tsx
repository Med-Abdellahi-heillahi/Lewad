import { ErrorPage } from './ErrorPage'

/** Écran plein affiché quand le navigateur signale une perte de connexion. */
export function OfflineScreen({ onRetry }: { onRetry: () => void }) {
  return <ErrorPage code="network" onRetry={onRetry} />
}

import { useCallback, useEffect, useState } from 'react'

/**
 * Disponibilité de l'installation « application » proposée par le navigateur.
 *
 * `beforeinstallprompt` n'est émis que si le navigateur juge le site
 * installable — ce qui suppose notamment un manifeste et un service worker.
 * Les navigateurs qui ne proposent pas cet événement (dont Safari iOS) gardent
 * donc les instructions manuelles plutôt qu'un faux bouton d'installation.
 *
 * Aucun service worker n'est enregistré ici : ce crochet écoute, il n'installe
 * rien de son côté.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type InstallPrompt = {
  /** `true` uniquement quand le navigateur a réellement proposé l'installation. */
  canInstall: boolean
  /** Ouvre l'invite native. Sans invite différée, l'appel ne fait rien. */
  promptInstall: () => Promise<void>
}

export function useInstallPrompt(): InstallPrompt {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setDeferred(event as BeforeInstallPromptEvent)
    }
    const onInstalled = () => setDeferred(null)

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferred) return
    try {
      await deferred.prompt()
      await deferred.userChoice
    } catch {
      // L'invite peut être invalidée par le navigateur entre le clic et l'appel.
    } finally {
      setDeferred(null)
    }
  }, [deferred])

  return { canInstall: deferred !== null, promptInstall }
}

/**
 * Invitation à ajouter Lewad à l'écran d'accueil.
 *
 * Apparaît à chaque fois que l'utilisateur arrive ou recharge la landing `/`.
 * La fermeture n'est persistée nulle part : après un refresh, l'invite réapparaît.
 */
export type InstallInvitation = {
  open: boolean
  dismiss: () => void
}

export function useInstallInvitation(delayMs = 1000): InstallInvitation {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setOpen(true), delayMs)
    return () => window.clearTimeout(timer)
  }, [delayMs])

  const dismiss = useCallback(() => {
    setOpen(false)
  }, [])

  return { open, dismiss }
}

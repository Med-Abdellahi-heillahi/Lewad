import { useEffect, type RefObject } from 'react'

/**
 * Ferme un panneau ouvert sur Échap ou sur un clic à l'extérieur.
 * `pointerdown` plutôt que `click` : le panneau se referme dès l'appui,
 * ce qui évite qu'un lien situé dessous reçoive le relâchement.
 */
export function useDismiss(open: boolean, ref: RefObject<HTMLElement | null>, onDismiss: () => void) {
  useEffect(() => {
    if (!open) return

    const onPointerDown = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) onDismiss()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDismiss()
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, ref, onDismiss])
}

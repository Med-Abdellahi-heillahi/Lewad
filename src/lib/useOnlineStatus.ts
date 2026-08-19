import { useCallback, useEffect, useState } from 'react'

/**
 * Connectivity state of the browser.
 *
 * `navigator.onLine` only proves that the device has *a* network interface up, so `recheck()`
 * is exposed for the "Try again" buttons: it re-reads the flag, pushes it into state and
 * returns it, which lets the caller decide what to do next.
 */
export type OnlineStatus = {
  /** `true` when the browser reports a usable connection. */
  online: boolean
  /** Re-reads `navigator.onLine`, syncs the state and returns the fresh value. */
  recheck: () => boolean
}

function readOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  // `onLine` is undefined on a few exotic runtimes — treat the unknown case as online.
  return navigator.onLine !== false
}

export function useOnlineStatus(): OnlineStatus {
  const [online, setOnline] = useState<boolean>(readOnline)

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)

    // The state may have changed between the first render and this effect.
    setOnline(readOnline())

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  const recheck = useCallback(() => {
    const next = readOnline()
    setOnline(next)
    return next
  }, [])

  return { online, recheck }
}

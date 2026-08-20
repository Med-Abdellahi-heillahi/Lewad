/** Registers the public app-shell cache in production builds only. */
export function registerServiceWorker() {
  if (!import.meta.env.PROD || typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  void navigator.serviceWorker.register('/sw.js').catch(() => {
    // A failed offline enhancement must never prevent Lewad from loading online.
  })
}

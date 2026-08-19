import type { ReactNode } from 'react'

/**
 * Jeu d'icônes maison, trait 24×24. Aucune marque tierce n'est reproduite :
 * WhatsApp est représenté par une bulle de discussion générique.
 */
const paths: Record<string, ReactNode> = {
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 2.5v2M12 19.5v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2.5 12h2M19.5 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </>
  ),
  moon: <path d="M20.5 14.8A8.5 8.5 0 0 1 9.2 3.5 8.5 8.5 0 1 0 20.5 14.8Z" />,
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14.5 14.5 0 0 1 0 18M12 3a14.5 14.5 0 0 0 0 18" />
    </>
  ),
  chevronDown: <path d="m6 9.5 6 6 6-6" />,
  chevronUp: <path d="m6 14.5 6-6 6 6" />,
  chevronLeft: <path d="m14.5 6-6 6 6 6" />,
  chevronRight: <path d="m9.5 6 6 6-6 6" />,
  arrow: <path d="M5 12h13m-5.5-6 6 6-6 6" />,
  check: <path d="m5 12.5 4.4 4.4L19 7" />,
  plus: <path d="M12 5v14M5 12h14" />,
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.8" />
      <path d="m16 16 4.2 4.2" />
    </>
  ),
  map: (
    <>
      <path d="m9 18-6 3V6l6-3 6 3 6-3v15l-6 3-6-3Z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 5.2-8 11-8 11s-8-5.8-8-11a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <path d="M8.2 18H11a4 4 0 0 0 4-4v-3.8a4 4 0 0 1 4-4" />
    </>
  ),
  phone: (
    <path d="M6.8 3.8 4.7 5.9c-.8.8-.9 2.1-.3 3.1 2.7 4.5 6.6 8.4 11.1 11.1 1 .6 2.3.5 3.1-.3l2.1-2.1-4.1-3.3-2 2c-1.8-1.1-3.4-2.6-4.5-4.5l2-2-4.3-4.1Z" />
  ),
  message: <path d="M20.5 11.5a7.9 7.9 0 0 1-11.6 7L4 20l1.5-4.8a7.9 7.9 0 1 1 15-3.7Z" />,
  store: (
    <>
      <path d="M4 9.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9.5" />
      <path d="M3 9.5 4.6 4.6A1 1 0 0 1 5.5 4h13a1 1 0 0 1 .9.6L21 9.5a3 3 0 0 1-5.6 1.4A3 3 0 0 1 12 11a3 3 0 0 1-3.4-.1A3 3 0 0 1 3 9.5Z" />
    </>
  ),
  basket: (
    <>
      <path d="M4 9h16l-1.4 10.1a1 1 0 0 1-1 .9H6.4a1 1 0 0 1-1-.9L4 9Z" />
      <path d="m8.5 9 2-5M15.5 9l-2-5" />
    </>
  ),
  cart: (
    <>
      <circle cx="9.5" cy="19.5" r="1.4" />
      <circle cx="17.5" cy="19.5" r="1.4" />
      <path d="M3 4h2.2l2.3 11.2a1 1 0 0 0 1 .8h9.1a1 1 0 0 0 1-.8L20 8H6" />
    </>
  ),
  dumbbell: <path d="M3 10v4M6.5 7.5v9M17.5 7.5v9M21 10v4M6.5 12h11" />,
  utensils: <path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17.5 3v18M17.5 3c-3 3-3 7.5 0 9.5" />,
  health: (
    <>
      <rect x="3.5" y="6" width="17" height="14" rx="2" />
      <path d="M12 10v6M9 13h6M9 6V4.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1V6" />
    </>
  ),
  sparkle: <path d="m12 3-1.8 6.4L4 11.2l6.2 1.8L12 19.4l1.8-6.4 6.2-1.8-6.2-1.8L12 3Z" />,
  share: (
    <>
      <circle cx="18" cy="5.5" r="2.5" />
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="18.5" r="2.5" />
      <path d="m8.2 10.8 7.6-4M8.2 13.2l7.6 4" />
    </>
  ),
  wallet: (
    <>
      <path d="M20 8V6.5a2 2 0 0 0-2-2H5.5a2.5 2.5 0 0 0 0 5H20v8a2 2 0 0 1-2 2H5.5a2.5 2.5 0 0 1-2.5-2.5V7" />
      <path d="M16.5 13.5h.01" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.4a2.5 2.5 0 1 1 3.3 2.4c-.6.2-.9.8-.9 1.4v.4" />
      <path d="M12 17h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.6h.01" />
    </>
  ),
  alert: (
    <>
      <path d="M10.3 4.3 2.6 17.6a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9.5v4M12 17h.01" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </>
  ),
  wifiOff: <path d="M2 4l18 18M8.6 15.6a5 5 0 0 1 6 0M5 12.2a10 10 0 0 1 4-2.4M19 12.2a10 10 0 0 0-6.8-2.8M2.5 8.6a15 15 0 0 1 5-3M21.5 8.6a15 15 0 0 0-8-3.4M12 19.5h.01" />,
  gear: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.4 14.5a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1v.3a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-2.8-1.1l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7h-.3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.1-2.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 2.7-1.1v-.3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 2.8 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0 1.1 2.7h.3a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.4.9Z" />
    </>
  ),
  shield: (
    <>
      <path d="M12 2.8 4.8 5.7v5.6c0 4.4 3 8.5 7.2 9.9 4.2-1.4 7.2-5.5 7.2-9.9V5.7L12 2.8Z" />
      <path d="m9 12 2.2 2.2L15.2 10" />
    </>
  ),
  logOut: <path d="M14.5 4.5h3a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h9.5" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M12 7.2V12l3.3 2" />
    </>
  ),
  arrowUp: <path d="M12 19V5.5M6 11.5l6-6 6 6" />,
  arrowDown: <path d="M12 5v13.5M18 12.5l-6 6-6-6" />,
  camera: (
    <>
      <path d="M3.5 8.8h3.1l1.5-2.4h7.8l1.5 2.4h3.1v10.4H3.5V8.8Z" />
      <circle cx="12" cy="13.7" r="3.3" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3.1" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M9.9 5.9A9.5 9.5 0 0 1 12 5.8c6 0 9.5 6.2 9.5 6.2a17 17 0 0 1-3.4 4.1M6.4 7.9A17 17 0 0 0 2.5 12S6 18.2 12 18.2c1.3 0 2.5-.3 3.5-.7" />
      <path d="M3 3l18 18M10 10a2.8 2.8 0 0 0 4 4" />
    </>
  ),
  lock: (
    <>
      <rect x="4.6" y="10.2" width="14.8" height="10.2" rx="2.2" />
      <path d="M8.2 10.2V7.6a3.8 3.8 0 0 1 7.6 0v2.6" />
    </>
  ),
}

export type IconName = keyof typeof paths

type IconProps = {
  name: IconName
  size?: number
  className?: string
}

export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  )
}

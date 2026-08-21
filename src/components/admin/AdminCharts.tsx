import { useId, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useI18n } from '../../i18n'
import { formatDate, formatNumber } from '../../lib/format'
import type { AdminSeriesPoint } from '../../lib/admin'
import { card } from '../../lib/ui'
import { AdminSectionHeader, type AdminIcon } from './AdminUi'

/**
 * Graphiques du tableau de bord, en SVG pur.
 *
 * Aucune bibliothèque de charts n'est ajoutée : les formes nécessaires ici
 * (aire, barres) tiennent en quelques dizaines de lignes, et une dépendance
 * de 50 kB pour trois visuels internes ne se justifie pas.
 */

const VIEW_W = 600
const VIEW_H = 160

function areaPath(values: number[], max: number) {
  if (values.length === 0) return { line: '', area: '' }
  const step = values.length > 1 ? VIEW_W / (values.length - 1) : VIEW_W
  const points = values.map((value, index) => {
    const x = index * step
    const y = VIEW_H - (max === 0 ? 0 : (value / max) * (VIEW_H - 12)) - 6
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const line = `M${points.join(' L')}`
  return { line, area: `${line} L${VIEW_W},${VIEW_H} L0,${VIEW_H} Z` }
}

export function AdminAreaChart({
  icon,
  title,
  text,
  series,
  primaryLabel,
  secondaryLabel,
  emptyLabel,
}: {
  icon: AdminIcon
  title: string
  text?: string
  series: AdminSeriesPoint[]
  primaryLabel: string
  secondaryLabel?: string
  emptyLabel: string
}) {
  const { locale } = useI18n()
  const reduce = useReducedMotion()
  const gradientId = useId()
  const [hovered, setHovered] = useState<number | null>(null)

  const active = hovered === null ? null : series[hovered] ?? null
  const pointStep = series.length > 1 ? VIEW_W / (series.length - 1) : VIEW_W
  const activeX = (hovered ?? 0) * pointStep

  const totals = series.map((point) => point.total)
  const secondaries = series.map((point) => point.secondary)
  const max = Math.max(1, ...totals)
  const sum = totals.reduce((acc, value) => acc + value, 0)
  const secondarySum = secondaries.reduce((acc, value) => acc + value, 0)

  const main = areaPath(totals, max)
  const second = areaPath(secondaries, max)

  return (
    <article className={`${card} p-4 sm:p-5`}>
      <AdminSectionHeader icon={icon} title={title} text={text} />

      {sum === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-surface-2 px-4 py-6 text-center text-sm text-muted">{emptyLabel}</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-5 gap-y-1">
            <p className="tabular text-2xl font-bold text-ink">
              {formatNumber(sum, locale)} <span className="text-sm font-medium text-muted">{primaryLabel}</span>
            </p>
            {secondaryLabel && secondarySum > 0 && (
              <p className="tabular text-sm font-semibold text-ask">
                {formatNumber(secondarySum, locale)} <span className="font-medium text-muted">{secondaryLabel}</span>
              </p>
            )}
          </div>

          {/* `dir=ltr` : un axe temporel se lit toujours du passé vers le futur,
              y compris sur une page arabe. */}
          <div dir="ltr" className="relative mt-4">
          <svg
            viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
            preserveAspectRatio="none"
            className="h-32 w-full sm:h-40"
            role="img"
            aria-label={`${title} — ${formatNumber(sum, locale)} ${primaryLabel}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
                <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
              </linearGradient>
            </defs>

            <g className="text-ink">
              <path d={main.area} fill={`url(#${gradientId})`} />
              <path
                d={main.line}
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
                className={reduce ? undefined : 'motion-safe:animate-[chartDraw_900ms_ease-out]'}
                pathLength={1}
              />
            </g>

            {secondaryLabel && secondarySum > 0 && (
              <path
                d={second.line}
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeDasharray="4 4"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
                className="text-ask"
              />
            )}

            {active && (
              <line
                x1={activeX} x2={activeX} y1="0" y2={VIEW_H}
                stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke"
                className="text-line-strong"
              />
            )}
          </svg>

          {/* Zones de survol en HTML plutôt qu'en SVG : le `preserveAspectRatio="none"`
              déforme l'axe X, une cible SVG ne tomberait pas là où l'œil la voit. */}
          <div className="absolute inset-0 flex" aria-hidden="true" onMouseLeave={() => setHovered(null)}>
            {series.map((point, index) => (
              <span key={point.date} className="h-full flex-1" onMouseEnter={() => setHovered(index)} />
            ))}
          </div>

          {active && (
            <div
              className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 rounded-lg border border-line bg-surface px-2 py-1.5 shadow-lg"
              style={{ left: `${activeX / VIEW_W * 100}%` }}
            >
              <p className="text-[10px] leading-tight whitespace-nowrap text-muted">{formatDate(active.date, locale)}</p>
              <p className="tabular text-[11px] leading-tight font-bold whitespace-nowrap text-ink">
                {formatNumber(active.total, locale)} {primaryLabel}
              </p>
              {secondaryLabel && (
                <p className="tabular text-[10px] leading-tight whitespace-nowrap text-ask">
                  {formatNumber(active.secondary, locale)} {secondaryLabel}
                </p>
              )}
            </div>
          )}
          </div>
        </>
      )}
    </article>
  )
}

/**
 * Répartition en anneau. Un `stroke-dasharray` sur un cercle unique évite de
 * calculer des arcs : chaque segment avance d'un décalage cumulé.
 */
export function AdminDonutChart({
  icon,
  title,
  text,
  data,
  emptyLabel,
  centerLabel,
}: {
  icon: AdminIcon
  title: string
  text?: string
  data: AdminBarDatum[]
  emptyLabel: string
  centerLabel: string
}) {
  const { locale } = useI18n()
  const reduce = useReducedMotion()
  const total = data.reduce((acc, item) => acc + item.value, 0)
  const radius = 42
  const circumference = 2 * Math.PI * radius

  const strokes = {
    neutral: 'text-ink',
    positive: 'text-answer',
    negative: 'text-ask',
    accent: 'text-brand-deep',
  } as const

  let offset = 0
  const segments = data
    .filter((item) => item.value > 0)
    .map((item) => {
      const fraction = item.value / total
      const segment = { ...item, fraction, dash: fraction * circumference, offset }
      offset += fraction * circumference
      return segment
    })

  return (
    <article className={`${card} p-4 sm:p-5`}>
      <AdminSectionHeader icon={icon} title={title} text={text} />

      {total === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-surface-2 px-4 py-6 text-center text-sm text-muted">{emptyLabel}</p>
      ) : (
        <div className="mt-5 flex flex-wrap items-center gap-5">
          <div className="relative shrink-0">
            <svg viewBox="0 0 100 100" className="size-28" role="img" aria-label={`${title} — ${formatNumber(total, locale)}`}>
              <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="12" className="stroke-surface-2" />
              {segments.map((segment) => (
                <circle
                  key={segment.label}
                  cx="50" cy="50" r={radius}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="12"
                  strokeLinecap="butt"
                  strokeDasharray={`${segment.dash} ${circumference - segment.dash}`}
                  strokeDashoffset={-segment.offset}
                  /* -90° : le premier segment démarre en haut, pas à droite. */
                  transform="rotate(-90 50 50)"
                  className={`${strokes[segment.tone ?? 'neutral']} ${reduce ? '' : 'motion-safe:animate-[chartDraw_900ms_ease-out]'}`}
                />
              ))}
            </svg>
            <span className="pointer-events-none absolute inset-0 grid place-content-center text-center">
              <span className="tabular block text-lg leading-none font-bold text-ink">{formatNumber(total, locale)}</span>
              <span className="mt-1 block text-[10px] leading-tight text-muted">{centerLabel}</span>
            </span>
          </div>

          <ul className="grid min-w-0 flex-1 list-none gap-2">
            {data.map((item) => (
              <li key={item.label} className="flex items-center gap-2 text-[13px]">
                <span className={`size-2.5 shrink-0 rounded-full bg-current ${strokes[item.tone ?? 'neutral']}`} />
                <span className="min-w-0 flex-1 truncate text-muted">{item.label}</span>
                <span className="tabular shrink-0 font-bold text-ink">{formatNumber(item.value, locale)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  )
}

export type AdminBarDatum = { label: string; value: number; tone?: 'neutral' | 'positive' | 'negative' | 'accent' }

export function AdminBarChart({
  icon,
  title,
  text,
  data,
  emptyLabel,
}: {
  icon: AdminIcon
  title: string
  text?: string
  data: AdminBarDatum[]
  emptyLabel: string
}) {
  const { locale } = useI18n()
  const max = Math.max(1, ...data.map((item) => item.value))
  const total = data.reduce((acc, item) => acc + item.value, 0)

  const tones = {
    neutral: 'bg-ink',
    positive: 'bg-answer',
    negative: 'bg-ask',
    accent: 'bg-brand-deep',
  } as const

  return (
    <article className={`${card} p-4 sm:p-5`}>
      <AdminSectionHeader icon={icon} title={title} text={text} />

      {total === 0 ? (
        <p className="mt-6 rounded-xl border border-line bg-surface-2 px-4 py-6 text-center text-sm text-muted">{emptyLabel}</p>
      ) : (
        <ul className="mt-5 grid list-none gap-3">
          {data.map((item) => (
            <li key={item.label} className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_auto] items-center gap-3">
              <span className="truncate text-[13px] text-muted">{item.label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-surface-2">
                <span
                  className={`block h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none ${tones[item.tone ?? 'neutral']}`}
                  style={{ width: `${Math.round((item.value / max) * 100)}%` }}
                />
              </span>
              <span className="tabular text-[13px] font-bold text-ink">{formatNumber(item.value, locale)}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

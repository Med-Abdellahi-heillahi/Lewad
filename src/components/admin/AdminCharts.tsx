import { useId } from 'react'
import { useReducedMotion } from 'framer-motion'
import { useI18n } from '../../i18n'
import { formatNumber } from '../../lib/format'
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
          <div dir="ltr" className="mt-4">
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
          </svg>
          </div>
        </>
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

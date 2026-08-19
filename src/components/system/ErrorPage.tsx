import { useI18n } from '../../i18n'
import { btnGhost, btnPrimary, wrap } from '../../lib/ui'
import { Icon } from '../Icon'
import { Logo } from '../Logo'

export const errorCodes = [
  '400',
  '401',
  '402',
  '403',
  '404',
  '408',
  '429',
  '500',
  '502',
  '503',
  '504',
  'network',
] as const

export type ErrorCode = (typeof errorCodes)[number]

/** Codes pour lesquels relancer la requête a une chance d'aboutir. */
const retryable = new Set<ErrorCode>(['408', '429', '500', '502', '503', '504', 'network'])

export function ErrorPage({ code, onRetry }: { code: ErrorCode; onRetry?: () => void }) {
  const { t } = useI18n()
  const [title, text] = t.errors[code]
  const canRetry = retryable.has(code) && Boolean(onRetry)

  return (
    <main className={`${wrap} grid min-h-dvh place-items-center py-16`}>
      <div className="w-full max-w-md text-center">
        <div className="flex justify-center">
          <Logo />
        </div>

        <div className="mt-12 flex justify-center" aria-hidden="true">
          {code === 'network' ? (
            <span className="grid size-24 place-items-center rounded-3xl bg-surface-2 text-muted">
              <Icon name="wifiOff" size={40} />
            </span>
          ) : (
            <span className="tabular ltr-isolate font-display text-[88px] leading-none font-bold tracking-[-0.05em] text-ink sm:text-[104px]">
              {code}
            </span>
          )}
        </div>

        {code !== 'network' && (
          <span className="mt-6 inline-flex rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-semibold tracking-wider text-muted uppercase rtl:tracking-normal rtl:normal-case">
            {t.system.errorLabel} {code}
          </span>
        )}

        <h1 className="mt-5 text-3xl font-bold tracking-[-0.03em] text-balance sm:text-4xl">{title}</h1>
        <p className="mx-auto mt-4 max-w-sm text-[15px] leading-relaxed text-muted">{text}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="/" className={btnPrimary}>
            <span className="rtl:rotate-180">
              <Icon name="arrow" size={17} />
            </span>
            {t.system.backHome}
          </a>
          {canRetry && (
            <button type="button" className={btnGhost} onClick={onRetry}>
              {t.system.retry}
            </button>
          )}
        </div>
      </div>
    </main>
  )
}

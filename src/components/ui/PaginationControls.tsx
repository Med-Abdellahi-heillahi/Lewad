import { btnGhost } from '../../lib/ui'

export type PaginationLabels = {
  previous: string
  next: string
  page: string
  of: string
  items: string
}

export function PaginationControls({
  page,
  totalPages,
  totalCount,
  labels,
  disabled = false,
  onPageChange,
}: {
  page: number
  totalPages: number
  totalCount: number
  labels: PaginationLabels
  disabled?: boolean
  onPageChange: (page: number) => void
}) {
  const lastPage = Math.max(1, totalPages)

  return (
    <nav className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4" aria-label={`${labels.page} ${page}`}>
      <p className="text-sm text-muted">
        {labels.page} <span className="tabular font-semibold text-ink">{page}</span> {labels.of} <span className="tabular font-semibold text-ink">{lastPage}</span>
        <span className="mx-2 text-line" aria-hidden>·</span>
        <span className="tabular">{totalCount}</span> {labels.items}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={btnGhost} disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>
          {labels.previous}
        </button>
        <button type="button" className={btnGhost} disabled={disabled || page >= lastPage} onClick={() => onPageChange(page + 1)}>
          {labels.next}
        </button>
      </div>
    </nav>
  )
}

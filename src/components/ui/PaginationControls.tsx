import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type PaginationLabels = {
  previous: string;
  next: string;
  page: string;
  of: string;
  items: string;
  navigation?: string;
};

type PaginationControlsProps = {
  page: number;
  totalPages: number;
  totalCount: number;
  labels?: PaginationLabels; // Rendu optionnel pour plus de flexibilité
  disabled?: boolean;
  onPageChange: (page: number) => void;
};

// Valeurs par défaut pour une utilisation immédiate en français
const defaultLabels: PaginationLabels = {
  previous: "Précédent",
  next: "Suivant",
  page: "Page",
  of: "sur",
  items: "éléments",
  navigation: "Pagination",
};

export function PaginationControls({
  page,
  totalPages,
  totalCount,
  labels = defaultLabels,
  disabled = false,
  onPageChange,
}: PaginationControlsProps) {
  const lastPage = Math.max(1, totalPages);

  const btnClass =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-surface sm:px-4";

  return (
    <nav
      className="mt-6 grid gap-3 border-t border-line pt-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between sm:gap-4"
      aria-label={
        labels.navigation ?? `${labels.page} ${page} ${labels.of} ${lastPage}`
      }
    >
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
        <span>
          {labels.page}{" "}
          <span className="ltr-isolate inline-flex items-center gap-1">
            <span className="tabular font-semibold text-ink">{page}</span>
            <span>{labels.of}</span>
            <span className="tabular font-semibold text-ink">{lastPage}</span>
          </span>
        </span>
        <span className="text-line" aria-hidden="true">
          |
        </span>
        <span>
          <span className="tabular font-semibold text-ink">{totalCount}</span>{" "}
          {labels.items}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <button
          type="button"
          className={btnClass}
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={labels.previous}
        >
          <span className="rtl:rotate-180">
            <ChevronLeft size={16} aria-hidden="true" />
          </span>
          <span>{labels.previous}</span>
        </button>

        <button
          type="button"
          className={btnClass}
          disabled={disabled || page >= lastPage}
          onClick={() => onPageChange(page + 1)}
          aria-label={labels.next}
        >
          <span>{labels.next}</span>
          <span className="rtl:rotate-180">
            <ChevronRight size={16} aria-hidden="true" />
          </span>
        </button>
      </div>
    </nav>
  );
}

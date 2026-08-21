import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type PaginationLabels = {
  previous: string;
  next: string;
  page: string;
  of: string;
  items: string;
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

  // Classes communes pour les boutons pour éviter la répétition
  const btnClass = `
    flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors
    border border-gray-300 bg-white text-gray-700
    hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
    disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white
  `;

  return (
    <nav
      className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-gray-200 pt-4"
      aria-label={`Navigation de la page ${page}`}
    >
      {/* Informations textuelles */}
      <div className="text-sm text-gray-500">
        {labels.page}{" "}
        <span className="font-semibold text-gray-900">{page}</span> {labels.of}{" "}
        <span className="font-semibold text-gray-900">{lastPage}</span>
        <span className="mx-2 text-gray-300" aria-hidden="true">
          |
        </span>
        <span className="font-medium text-gray-900">{totalCount}</span>{" "}
        {labels.items}
      </div>

      {/* Boutons d'action */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btnClass}
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label={labels.previous}
        >
          <ChevronLeft size={16} aria-hidden="true" />
          <span className="hidden sm:inline">{labels.previous}</span>
        </button>

        <button
          type="button"
          className={btnClass}
          disabled={disabled || page >= lastPage}
          onClick={() => onPageChange(page + 1)}
          aria-label={labels.next}
        >
          <span className="hidden sm:inline">{labels.next}</span>
          <ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

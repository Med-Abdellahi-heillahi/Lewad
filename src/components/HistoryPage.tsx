import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n";
import { formatCurrency, formatDate, formatNumber } from "../lib/format";
import {
  HISTORY_PAGE_SIZE,
  getMyHistory,
  type UserHistoryEvent,
  type UserHistoryStatus,
} from "../lib/userHistory";
import { btnGhost, card } from "../lib/ui";
import { EmptyState, InlineAlert, Skeleton } from "./system/States";
import { Icon, type IconName } from "./Icon";
import { PaginationControls } from "./ui/PaginationControls";
import { BackButton } from "./ui/BackButton";

type LoadState = "loading" | "ready" | "error";

/**
 * Historique client.
 *
 * Volontairement non technique : aucun identifiant, aucun nom de table, aucun
 * vocabulaire interne. Chaque ligne répond à « qu'ai-je fait, quand, et qu'est-ce
 * que ça a changé à mes points ». La page ne fait que lire.
 */
export function HistoryPage() {
  const { locale, t } = useI18n();
  const copy = t.history;
  const [events, setEvents] = useState<UserHistoryEvent[]>([]);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>("loading");
  const [incomplete, setIncomplete] = useState(false);
  const [loadInFlight, setLoadInFlight] = useState(false);
  const loadInFlightRef = useRef(false);

  const load = useCallback(async (showSkeleton: boolean) => {
    if (loadInFlightRef.current) return;
    loadInFlightRef.current = true;
    setLoadInFlight(true);
    if (showSkeleton) setState("loading");
    setPage(1);

    try {
      const result = await getMyHistory(1000);
      setEvents(result.events);
      setIncomplete(result.incomplete);
      setState("ready");
    } catch {
      setState("error");
    } finally {
      loadInFlightRef.current = false;
      setLoadInFlight(false);
    }
  }, []);

  useEffect(() => {
    void load(true);
  }, [load]);

  const totalPages = Math.ceil(events.length / HISTORY_PAGE_SIZE);
  const visibleEvents = useMemo(() => {
    const start = (page - 1) * HISTORY_PAGE_SIZE;
    return events.slice(start, start + HISTORY_PAGE_SIZE);
  }, [events, page]);

  return (
    <>
      <header className="page-glow relative overflow-hidden rounded-3xl border border-line bg-surface/85 p-5 card-elevated backdrop-blur-sm sm:p-6">
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -end-12 -top-16 size-40 rounded-full bg-tint-4/45 blur-2xl"
        />
        <BackButton />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              {copy.title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              {copy.subtitle}
            </p>
          </div>
          <button
            type="button"
            className={`${btnGhost} shrink-0`}
            onClick={() => void load(false)}
            disabled={loadInFlight || state === "loading"}
          >
            <Icon name="arrow" size={16} />
            {copy.refresh}
          </button>
        </div>
      </header>

      {/* L'explication des points reste au-dessus de la liste : c'est la première
          question que se pose un client qui découvre son solde. */}
      <p className="mt-5 rounded-2xl border border-line bg-tint-3/35 px-4 py-3.5 text-sm leading-6 text-ink-soft card-elevated">
        {copy.pointsNote}
      </p>

      <section
        className={`${card} mt-5 overflow-hidden`}
        aria-label={copy.title}
      >
        <div className="p-4 sm:p-5">
          {incomplete && state === "ready" && (
            <InlineAlert tone="info" className="mb-4">
              {copy.incomplete}
            </InlineAlert>
          )}

          {state === "loading" ? (
            <div className="grid gap-2" role="status" aria-busy="true">
              {[0, 1, 2, 3].map((row) => (
                <Skeleton key={row} className="h-[86px] w-full" />
              ))}
              <span className="sr-only">{copy.loading}</span>
            </div>
          ) : state === "error" ? (
            <InlineAlert
              tone="error"
              action={
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => void load(true)}
                  disabled={loadInFlight}
                >
                  <Icon name="arrow" size={16} />
                  {copy.refresh}
                </button>
              }
            >
              {copy.unavailable}
            </InlineAlert>
          ) : events.length === 0 ? (
            <EmptyState icon="clock" title={copy.empty} text={copy.emptyText} />
          ) : (
            <>
              <ol className="grid list-none gap-3">
                {visibleEvents.map((event) => (
                  <li key={event.id}>
                    <HistoryRow event={event} locale={locale} copy={copy} />
                  </li>
                ))}
              </ol>

              {totalPages > 1 && (
                <PaginationControls
                  page={page}
                  totalPages={totalPages}
                  totalCount={events.length}
                  labels={{
                    previous: copy.previous,
                    next: copy.next,
                    page: copy.page,
                    of: copy.of,
                    items: copy.items,
                  }}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

type HistoryCopy = ReturnType<typeof useI18n>["t"]["history"];
type Locale = ReturnType<typeof useI18n>["locale"];

const iconOf: Record<UserHistoryEvent["type"], IconName> = {
  search_success: "search",
  search_no_result: "search",
  points_added: "sparkle",
  recharge: "wallet",
  business_submission: "store",
};

const eventTone: Record<
  UserHistoryEvent["type"],
  { accent: string; icon: string }
> = {
  search_success: {
    accent: "bg-tint-2",
    icon: "bg-tint-2 text-tint-ink-2",
  },
  search_no_result: {
    accent: "bg-tint-4",
    icon: "bg-tint-4 text-tint-ink-4",
  },
  points_added: {
    accent: "bg-tint-3",
    icon: "bg-tint-3 text-tint-ink-3",
  },
  recharge: {
    accent: "bg-tint-1",
    icon: "bg-tint-1 text-tint-ink-1",
  },
  business_submission: {
    accent: "bg-tint-5",
    icon: "bg-tint-5 text-tint-ink-5",
  },
};

function statusLabel(status: UserHistoryStatus, copy: HistoryCopy): string {
  if (status === "approved") return copy.statusApproved;
  if (status === "rejected") return copy.statusRejected;
  if (status === "cancelled") return copy.statusCancelled;
  return copy.statusPending;
}

/** Vert = acquis, rouge = refusé, neutre = annulé, ambre = en attente. */
function statusTone(status: UserHistoryStatus): string {
  if (status === "approved") return "border-answer/25 bg-answer-bg text-answer";
  if (status === "rejected") return "border-ask/25 bg-ask-bg text-ask";
  if (status === "cancelled") return "border-line bg-page-alt text-muted";
  return "border-brand-deep/25 bg-brand-soft text-brand-deep dark:text-brand";
}

function titleOf(event: UserHistoryEvent, copy: HistoryCopy): string {
  switch (event.type) {
    case "search_success":
      return copy.searchDone;
    case "search_no_result":
      return copy.searchNoResult;
    case "points_added":
      return copy.pointsAdded;
    case "recharge":
      return copy.rechargeRequested;
    case "business_submission":
      return copy.businessRequested;
  }
}

/** Les lignes de détail d'un événement, déjà traduites et prêtes à afficher. */
function detailsOf(
  event: UserHistoryEvent,
  copy: HistoryCopy,
  locale: Locale,
): string[] {
  const lines: string[] = [];
  const count = (template: string, value: number) =>
    template.replace("{count}", formatNumber(value, locale));

  switch (event.type) {
    case "search_success":
    case "search_no_result": {
      if (event.subject)
        lines.push(copy.searchedFor.replace("{query}", event.subject));
      if (event.type === "search_no_result") lines.push(copy.noResultFound);
      const used = Math.abs(event.pointsDelta);
      lines.push(
        used === 0
          ? copy.noPointUsed
          : count(used === 1 ? copy.pointUsed : copy.pointsUsed, used),
      );
      break;
    }
    case "points_added": {
      const added = event.pointsDelta;
      lines.push(
        count(
          added === 1 ? copy.pointAddedCount : copy.pointsAddedCount,
          added,
        ),
      );
      lines.push(reasonLabel(event, copy));
      break;
    }
    case "recharge": {
      if (event.requestedPoints !== null)
        lines.push(count(copy.rechargeAsked, event.requestedPoints));
      if (event.amountMro !== null)
        lines.push(
          `${copy.amountLabel} : ${formatCurrency(event.amountMro, locale)}`,
        );
      break;
    }
    case "business_submission": {
      if (event.subject)
        lines.push(copy.businessAsked.replace("{name}", event.subject));
      if (event.amountMro !== null)
        lines.push(
          `${copy.amountLabel} : ${formatCurrency(event.amountMro, locale)}`,
        );
      if (event.periodMonths !== null) {
        lines.push(
          `${copy.durationLabel} : ${copy.durationMonths.replace("{months}", formatNumber(event.periodMonths, locale))}`,
        );
      }
      break;
    }
  }

  return lines;
}

function reasonLabel(event: UserHistoryEvent, copy: HistoryCopy): string {
  switch (event.reason) {
    case "welcome_bonus":
      return copy.reasonWelcome;
    case "recharge_credit":
      return copy.reasonRecharge;
    case "admin_adjustment":
      return copy.reasonAdjustment;
    case "referral_bonus":
      return copy.reasonReferral;
    default:
      return copy.reasonOther;
  }
}

function HistoryRow({
  event,
  locale,
  copy,
}: {
  event: UserHistoryEvent;
  locale: Locale;
  copy: HistoryCopy;
}) {
  const details = detailsOf(event, copy, locale);
  const spent = event.pointsDelta < 0;
  const gained = event.pointsDelta > 0;
  const tone = eventTone[event.type];

  return (
    <article className="relative overflow-hidden rounded-2xl border border-line bg-surface p-3.5 ps-5 card-elevated sm:p-4 sm:ps-5">
      <span
        aria-hidden="true"
        className={`absolute inset-y-0 start-0 w-1 ${tone.accent}`}
      />
      <div className="flex items-start gap-3">
        <span className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl ${tone.icon}`}>
          <Icon name={iconOf[event.type]} size={18} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1.5">
            <p className="text-sm font-semibold text-ink">
              {titleOf(event, copy)}
            </p>

            {/* Le mouvement de points reste lisible d'un coup d'œil, en tête de
                ligne, parce que c'est l'information la plus souvent cherchée. */}
            {(spent || gained) && (
              <span
                className={`tabular shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                  gained
                    ? "border-answer/25 bg-answer-bg text-answer"
                    : "border-line bg-page-alt text-ink-soft"
                }`}
              >
                {gained ? "+" : "−"}
                {formatNumber(Math.abs(event.pointsDelta), locale)}
              </span>
            )}
          </div>

          {details.map((line) => (
            <p
              key={line}
              className="mt-1 text-sm leading-6 text-muted"
              dir="auto"
            >
              {line}
            </p>
          ))}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <time
              className="text-xs font-medium text-muted"
              dateTime={event.createdAt}
            >
              {formatDate(event.createdAt, locale)}
            </time>
            {event.status && (
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${statusTone(event.status)}`}
              >
                {statusLabel(event.status, copy)}
              </span>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

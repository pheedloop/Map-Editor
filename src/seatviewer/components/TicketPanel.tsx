import { useRef } from "react";
import { PiMagnifyingGlass, PiCheck } from "react-icons/pi";
import type { SeatPlanMode, SeatTableState, SeatTicket } from "../types";
import { isEligible } from "../logic";

interface TicketPanelProps {
  mode: SeatPlanMode;
  tickets: SeatTicket[];
  selectedCodes: ReadonlySet<string>;
  onToggle: (code: string) => void;
  /** When a table is open, tickets ineligible for it are disabled (table-first path). */
  openTable: SeatTableState | null;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  /** Resolve a tableCode to its display name (e.g. "Table 7"); falls back to the code. */
  tableLabel?: (code: string) => string | undefined;
  loading?: boolean;
  hasMore?: boolean;
  onLoadMore?: () => void;
}

/**
 * Left panel listing ticket holders. Admin mode: multi-select (checkboxes),
 * server-driven search + infinite scroll. The list itself is host-filtered —
 * the panel renders whatever `tickets` it is given and emits search/scroll intent.
 */
export function TicketPanel({
  mode,
  tickets,
  selectedCodes,
  onToggle,
  openTable,
  searchTerm,
  onSearchChange,
  tableLabel,
  loading,
  hasMore,
  onLoadMore,
}: TicketPanelProps) {
  const listRef = useRef<HTMLDivElement>(null);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el || !hasMore || loading || !onLoadMore) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 200) onLoadMore();
  };

  return (
    <aside className="w-80 shrink-0 bg-card border-r border-gray-200 flex flex-col min-h-0">
      <div className="p-4 border-b border-gray-200 flex flex-col gap-3">
        <div className="flex items-baseline gap-2">
          <h2 className="text-base font-medium text-gray-700 m-0">Ticket holders</h2>
          <span className="text-sm text-gray-400 tabular-nums">
            {tickets.length} shown · {selectedCodes.size} selected
          </span>
        </div>
        <div className="relative">
          <PiMagnifyingGlass className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search name or email"
            aria-label="Search ticket holders"
            className="w-full text-sm text-gray-700 pl-8 pr-2.5 py-2 border border-gray-200 rounded-lg bg-gray-100 focus:outline-2 focus:outline-primary-600 focus:bg-white"
          />
        </div>
      </div>

      <div ref={listRef} onScroll={handleScroll} className="flex-1 overflow-y-auto scrollbar">
        {tickets.map((t) => {
          const isSel = selectedCodes.has(t.code);
          const disabled = openTable ? !isEligible(t, openTable, mode) && !isSel : false;
          const assignedCode = t.tableCode;
          return (
            <button
              key={t.code}
              type="button"
              aria-pressed={isSel}
              disabled={disabled}
              onClick={() => onToggle(t.code)}
              className={`w-full text-left flex items-start gap-2.5 p-3 border-b border-gray-200 transition-colors ${
                isSel ? "bg-primary-100 shadow-[inset_2px_0_0_var(--color-primary-600)]" : "hover:bg-gray-100"
              } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
            >
              <span
                className={`size-[18px] mt-0.5 shrink-0 rounded grid place-items-center border ${
                  isSel ? "bg-primary-600 border-primary-600 text-white" : "bg-white border-gray-300"
                }`}
              >
                {isSel && <PiCheck size={12} strokeWidth={2} />}
              </span>
              <span className="min-w-0 flex-1 flex flex-col gap-1">
                <span className="flex items-start gap-2">
                  <span className="flex-1 min-w-0 text-sm font-medium text-gray-700 leading-snug line-clamp-2">
                    {t.attendee.firstName} {t.attendee.lastName}
                  </span>
                  {assignedCode && (
                    <span className="shrink-0 inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full text-[#14653a] bg-[rgba(0,168,99,0.12)]">
                      <span className="size-1.5 rounded-full bg-[#00a863]" />
                      {tableLabel?.(assignedCode) ?? assignedCode}
                    </span>
                  )}
                </span>
                <span className="text-sm text-gray-500 leading-snug break-words">
                  <span className="text-gray-600 font-medium">{t.ticketName}</span> · {t.attendee.email}
                </span>
              </span>
            </button>
          );
        })}

        {loading && (
          <div className="p-3 text-sm text-gray-400 text-center">Loading…</div>
        )}
        {!loading && tickets.length === 0 && (
          <div className="p-6 text-sm text-gray-400 text-center">No ticket holders match.</div>
        )}
      </div>
    </aside>
  );
}

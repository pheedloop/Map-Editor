import { PiX } from "react-icons/pi";
import type { SeatOccupant, SeatTableState } from "../types";
import { occupancyLevel, type OccupancyLevel } from "../logic";

interface TableDetailPopoverProps {
  table: SeatTableState;
  tableName: string;
  occupants: SeatOccupant[];
  occupantsLoading?: boolean;
  hideAttendeeDetails?: boolean;
  /** Whether per-occupant Remove is offered (false in attendee mode when locked). */
  allowUnassign?: boolean;
  /** Assign CTA, computed by the shell so admin/attendee messaging stays centralized. */
  assignLabel: string;
  assignDisabled: boolean;
  assignHint?: string;
  assigning?: boolean;
  onAssign: () => void;
  onUnassign: (seatSelectionCode: number) => void;
  onClose: () => void;
}

const OCC_BADGE: Record<OccupancyLevel, string> = {
  available: "text-[#14653a] bg-[rgba(0,168,99,0.12)]",
  half: "text-[#8a5a00] bg-[rgba(255,168,0,0.16)]",
  low: "text-[#b42318] bg-[rgba(235,87,87,0.16)]",
  full: "text-gray-600 bg-gray-200",
};

function initials(o: SeatOccupant): string {
  return `${o.firstName?.[0] ?? ""}${o.lastName?.[0] ?? ""}`.toUpperCase();
}

/**
 * Floating table-detail card anchored near the clicked table. Shows current
 * occupants (unless hidden) and the assign action for the selected tickets.
 */
export function TableDetailPopover({
  table,
  tableName,
  occupants,
  occupantsLoading,
  hideAttendeeDetails,
  allowUnassign = true,
  assignLabel,
  assignDisabled,
  assignHint,
  assigning,
  onAssign,
  onUnassign,
  onClose,
}: TableDetailPopoverProps) {
  const level = occupancyLevel(table);
  const seatsFree = Math.max(0, table.seatCount - table.occupancy);

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={`${tableName} details`}
      className="absolute z-[9999] w-72 max-w-[calc(100%-24px)] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-gray-300 rounded-xl shadow-[0_16px_48px_rgba(38,59,90,0.28)] overflow-hidden"
    >
      <div className="flex items-start gap-2 p-3 border-b border-gray-200">
        <div className="flex-1 min-w-0">
          <h3 className="m-0 text-base font-medium text-gray-700">{tableName}</h3>
          <span className="text-xs text-gray-400 tabular-nums">{seatsFree} of {table.seatCount} seats free</span>
        </div>
        <span className={`text-xs font-medium tabular-nums px-2 py-0.5 rounded-full whitespace-nowrap ${OCC_BADGE[level]}`}>
          {table.occupancy}/{table.seatCount}
        </span>
        <button type="button" aria-label="Close" onClick={onClose} className="text-gray-400 hover:text-gray-700 p-0.5 rounded cursor-pointer leading-none">
          <PiX size={16} />
        </button>
      </div>

      {!hideAttendeeDetails && (
        <div className="max-h-44 overflow-y-auto scrollbar">
          <div className="px-3 pt-2.5 pb-1 text-[10px] tracking-wider uppercase text-gray-400 font-semibold">
            {occupantsLoading ? "Loading…" : occupants.length ? "Seated here" : table.isLocked ? "Locked" : "No one seated yet"}
          </div>
          {occupants.map((o) => (
            <div key={o.code} className="flex items-center gap-2.5 px-3 py-1.5">
              <span className="size-6 shrink-0 grid place-items-center rounded-full text-[10px] font-semibold bg-primary-100 text-primary-600">
                {initials(o)}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-medium text-gray-700 truncate">{o.firstName} {o.lastName}</span>
                <span className="block text-xs text-gray-500 truncate">{o.organization || o.email}</span>
              </span>
              {allowUnassign && o.seatSelectionCode != null && (
                <button
                  type="button"
                  onClick={() => onUnassign(o.seatSelectionCode as number)}
                  className="shrink-0 text-xs text-gray-400 hover:text-[#b42318] hover:bg-[rgba(235,87,87,0.12)] px-1.5 py-1 rounded cursor-pointer"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-gray-200 bg-gray-100">
        <button
          type="button"
          disabled={assignDisabled || assigning}
          onClick={onAssign}
          className="w-full text-sm font-medium py-2.5 rounded-lg cursor-pointer disabled:cursor-not-allowed bg-primary-600 text-white hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400"
        >
          {assigning ? "Assigning…" : assignLabel}
        </button>
        {assignHint && <p className="text-xs text-gray-500 text-center mt-2 m-0">{assignHint}</p>}
      </div>
    </div>
  );
}

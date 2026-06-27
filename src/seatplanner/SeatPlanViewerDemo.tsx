import { useMemo, useRef, useState, useCallback } from "react";
import { SeatPlanViewer } from "../seatviewer";
import type { SeatOccupant, SeatPlanMode, SeatTicket } from "../seatviewer";
import { seatPlanMap } from "../sample-data/seatplan-map";
import { seatPlanState } from "../sample-data/seatplan-state";
import { seatPlanTickets } from "../sample-data/seatplan-tickets";
import { seedOccupants } from "../sample-data/seatplan-occupants";

// Two tickets designated as "yours" for the attendee demo: a VIP (head-table
// tagged) and a general-admission one, so eligibility visibly differs by ticket.
const MY_TICKET_CODES = new Set(["PUR-8821", "PUR-8826"]);

/**
 * Demo host for the seat plan viewer. Stands in for Charmander: holds the
 * tickets/occupants in local state and implements onAssign/onUnassign so the
 * flow is fully interactive. The toolbar switches between admin and attendee.
 */
export function SeatPlanViewerDemo() {
  const [viewerMode, setViewerMode] = useState<SeatPlanMode>("admin");
  const [lockSelection, setLockSelection] = useState(false);
  const [hideDetails, setHideDetails] = useState(false);

  const [tickets, setTickets] = useState<SeatTicket[]>(seatPlanTickets);
  const [occByTable, setOccByTable] = useState<Record<string, SeatOccupant[]>>(() =>
    seedOccupants(seatPlanState),
  );
  const [search, setSearch] = useState("");
  const [openCode, setOpenCode] = useState<string | null>(null);
  const selCounter = useRef(9000);

  const tables = useMemo(
    () => seatPlanState.map((t) => ({ ...t, occupancy: occByTable[t.tableCode]?.length ?? 0 })),
    [occByTable],
  );

  const visibleTickets = useMemo(() => {
    if (viewerMode === "attendee") return tickets.filter((t) => MY_TICKET_CODES.has(t.code));
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (t) =>
        `${t.attendee.firstName} ${t.attendee.lastName}`.toLowerCase().includes(q) ||
        t.attendee.email.toLowerCase().includes(q),
    );
  }, [tickets, search, viewerMode]);

  const occupants = openCode ? occByTable[openCode] ?? [] : [];

  const handleAssign = useCallback(
    ({ tableCode, purchaseCodes }: { tableCode: string; purchaseCodes: string[] }) => {
      const added: SeatOccupant[] = [];
      setTickets((prev) =>
        prev.map((t) => {
          if (!purchaseCodes.includes(t.code)) return t;
          const sel = selCounter.current++;
          added.push({
            code: t.attendee.code,
            firstName: t.attendee.firstName,
            lastName: t.attendee.lastName,
            email: t.attendee.email,
            organization: t.attendee.organization,
            seatSelectionCode: sel,
          });
          return { ...t, tableCode, seatSelectionCode: sel };
        }),
      );
      setOccByTable((prev) => ({ ...prev, [tableCode]: [...(prev[tableCode] ?? []), ...added] }));
    },
    [],
  );

  const handleUnassign = useCallback(({ seatSelectionCode }: { seatSelectionCode: number }) => {
    setOccByTable((prev) => {
      const next: Record<string, SeatOccupant[]> = {};
      for (const [code, list] of Object.entries(prev)) {
        next[code] = list.filter((o) => o.seatSelectionCode !== seatSelectionCode);
      }
      return next;
    });
    setTickets((prev) =>
      prev.map((t) => (t.seatSelectionCode === seatSelectionCode ? { ...t, tableCode: null, seatSelectionCode: null } : t)),
    );
  }, []);

  const tab = (m: SeatPlanMode, label: string) => (
    <button
      type="button"
      onClick={() => setViewerMode(m)}
      className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
        viewerMode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-100 border-b border-gray-200 text-xs shrink-0">
        <div className="flex items-center gap-1 bg-gray-200 rounded p-0.5">
          {tab("admin", "Admin")}
          {tab("attendee", "Attendee")}
        </div>
        {viewerMode === "attendee" && (
          <div className="flex items-center gap-4 text-gray-600">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={lockSelection} onChange={(e) => setLockSelection(e.target.checked)} />
              Lock selection
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input type="checkbox" checked={hideDetails} onChange={(e) => setHideDetails(e.target.checked)} />
              Hide attendee details
            </label>
          </div>
        )}
      </div>

      <div className="flex-1 min-h-0">
        <SeatPlanViewer
          key={viewerMode}
          mode={viewerMode}
          data={seatPlanMap}
          tables={tables}
          tickets={visibleTickets}
          searchTerm={search}
          onSearchChange={setSearch}
          occupants={occupants}
          onTableOpen={setOpenCode}
          onAssign={handleAssign}
          onUnassign={handleUnassign}
          lockSeatSelectionPage={viewerMode === "attendee" && lockSelection}
          hideAttendeeDetails={viewerMode === "attendee" && hideDetails}
        />
      </div>
    </div>
  );
}

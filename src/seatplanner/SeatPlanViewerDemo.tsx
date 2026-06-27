import { useMemo, useRef, useState, useCallback } from "react";
import { SeatPlanViewer } from "../seatviewer";
import type { SeatOccupant, SeatTicket } from "../seatviewer";
import { seatPlanMap } from "../sample-data/seatplan-map";
import { seatPlanState } from "../sample-data/seatplan-state";
import { seatPlanTickets } from "../sample-data/seatplan-tickets";
import { seedOccupants } from "../sample-data/seatplan-occupants";

/**
 * Demo host for the seat plan viewer (admin mode). Stands in for Charmander:
 * holds the tickets/occupants in local state and implements onAssign/onUnassign
 * so the assignment flow is fully interactive without a backend.
 */
export function SeatPlanViewerDemo() {
  const [tickets, setTickets] = useState<SeatTicket[]>(seatPlanTickets);
  const [occByTable, setOccByTable] = useState<Record<string, SeatOccupant[]>>(() =>
    seedOccupants(seatPlanState),
  );
  const [search, setSearch] = useState("");
  const [openCode, setOpenCode] = useState<string | null>(null);
  const selCounter = useRef(9000);

  // Occupancy is derived from the occupant lists so the badges stay in sync.
  const tables = useMemo(
    () => seatPlanState.map((t) => ({ ...t, occupancy: occByTable[t.tableCode]?.length ?? 0 })),
    [occByTable],
  );

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (t) =>
        `${t.attendee.firstName} ${t.attendee.lastName}`.toLowerCase().includes(q) ||
        t.attendee.email.toLowerCase().includes(q),
    );
  }, [tickets, search]);

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

  return (
    <SeatPlanViewer
      mode="admin"
      data={seatPlanMap}
      tables={tables}
      tickets={filteredTickets}
      searchTerm={search}
      onSearchChange={setSearch}
      occupants={occupants}
      onTableOpen={setOpenCode}
      onAssign={handleAssign}
      onUnassign={handleUnassign}
    />
  );
}

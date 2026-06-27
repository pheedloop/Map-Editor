import { useCallback, useEffect, useMemo, useState } from "react";
import type { SeatPlanViewerProps } from "./types";
import { isEligible, occupancyColor } from "./logic";
import { SeatPlanCanvas } from "./components/SeatPlanCanvas";
import { TicketPanel } from "./components/TicketPanel";
import { TableDetailPopover } from "./components/TableDetailPopover";
import { OccupancyLegend } from "./components/OccupancyLegend";

/**
 * Presentational seat plan viewer. Renders a FloorPlanData with per-table
 * assignment state and lets the operator assign ticket holders to tables.
 * The host owns all data + API calls; this component emits intent via callbacks.
 *
 * This step implements `mode="admin"` (multi-select). `mode="attendee"`
 * (single-select, tag eligibility, self-service flags) lands in the next step.
 */
export function SeatPlanViewer(props: SeatPlanViewerProps) {
  const {
    mode,
    data,
    tables,
    tickets,
    ticketsLoading,
    hasMoreTickets,
    onLoadMoreTickets,
    searchTerm = "",
    onSearchChange,
    filterOptions,
    activeFilterIds,
    onFilterToggle,
    occupants = [],
    occupantsLoading,
    onTableOpen,
    onAssign,
    onUnassign,
    hideAttendeeDetails,
    lockSeatSelectionPage,
  } = props;

  const [selectedCodes, setSelectedCodes] = useState<ReadonlySet<string>>(new Set());
  const [openTableCode, setOpenTableCode] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const tableByCode = useMemo(
    () => new Map(tables.map((t) => [t.tableCode, t])),
    [tables],
  );
  const ticketByCode = useMemo(
    () => new Map(tickets.map((t) => [t.code, t])),
    [tickets],
  );
  const tableNameByCode = useMemo(() => {
    const m = new Map<string, string>();
    for (const el of data.elements) {
      if (el.type === "table" && el.properties.tableCode) {
        m.set(el.properties.tableCode, el.properties.name || el.properties.tableCode);
      }
    }
    return m;
  }, [data.elements]);

  const openTable = openTableCode ? tableByCode.get(openTableCode) ?? null : null;

  // Tables for which no currently-selected ticket is eligible → dimmed.
  const dimmedTableCodes = useMemo(() => {
    if (selectedCodes.size === 0) return null;
    const selected = [...selectedCodes].map((c) => ticketByCode.get(c)).filter(Boolean);
    const dimmed = new Set<string>();
    for (const t of tables) {
      const anyEligible = selected.some((tk) => isEligible(tk!, t, mode));
      if (!anyEligible) dimmed.add(t.tableCode);
    }
    return dimmed;
  }, [selectedCodes, tables, ticketByCode, mode]);

  const getTableColor = useCallback(
    (code: string) => {
      const t = tableByCode.get(code);
      return t ? occupancyColor(t) : undefined;
    },
    [tableByCode],
  );

  const toggleTicket = useCallback(
    (code: string) => {
      setSelectedCodes((prev) => {
        const next = new Set(prev);
        if (mode === "attendee") {
          // single-select
          next.clear();
          if (!prev.has(code)) next.add(code);
        } else if (next.has(code)) {
          next.delete(code);
        } else {
          next.add(code);
        }
        return next;
      });
    },
    [mode],
  );

  const handleTableClick = useCallback(
    (tableCode: string) => {
      setOpenTableCode((prev) => {
        const next = prev === tableCode ? null : tableCode;
        if (next) onTableOpen?.(next);
        return next;
      });
    },
    [onTableOpen],
  );

  const closePopover = useCallback(() => {
    setOpenTableCode(null);
  }, []);

  // Dismiss the open popover on Escape.
  useEffect(() => {
    if (!openTableCode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closePopover();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openTableCode, closePopover]);

  // Selected tickets that are eligible for the open table.
  const assignableCodes = useMemo(() => {
    if (!openTable) return [];
    return [...selectedCodes].filter((c) => {
      const t = ticketByCode.get(c);
      return t && isEligible(t, openTable, mode);
    });
  }, [selectedCodes, openTable, ticketByCode, mode]);

  const handleAssign = useCallback(async () => {
    if (!openTable || assignableCodes.length === 0) return;
    setAssigning(true);
    try {
      await Promise.resolve(onAssign({ tableCode: openTable.tableCode, purchaseCodes: assignableCodes }));
      setSelectedCodes(new Set());
      closePopover();
    } finally {
      setAssigning(false);
    }
  }, [openTable, assignableCodes, onAssign, closePopover]);

  const handleUnassign = useCallback(
    async (seatSelectionCode: number) => {
      await Promise.resolve(onUnassign({ seatSelectionCode }));
    },
    [onUnassign],
  );

  const handleClearTicket = useCallback(
    (ticket: { seatSelectionCode: number | null }) => {
      if (ticket.seatSelectionCode != null) handleUnassign(ticket.seatSelectionCode);
    },
    [handleUnassign],
  );

  // Assign CTA (label/disabled/hint) — centralized so admin & attendee read correctly.
  const assignCta = useMemo((): { label: string; disabled: boolean; hint?: string } => {
    if (!openTable) return { label: "Assign", disabled: true };
    if (openTable.isLocked) return { label: "Table locked", disabled: true, hint: "This table isn’t open for selection." };
    if (openTable.occupancy >= openTable.seatCount) return { label: "Table full", disabled: true, hint: "No seats left at this table." };

    if (mode === "admin") {
      if (assignableCodes.length > 0) {
        const extra = selectedCodes.size - assignableCodes.length;
        return {
          label: `Assign ${assignableCodes.length} selected`,
          disabled: false,
          hint: extra > 0 ? `${extra} of ${selectedCodes.size} selected aren’t eligible for this table.` : undefined,
        };
      }
      return {
        label: "Select eligible ticket holders",
        disabled: true,
        hint: selectedCodes.size > 0 ? "None of the selected are eligible for this table." : undefined,
      };
    }

    // attendee — single select
    const code = [...selectedCodes][0];
    const ticket = code ? ticketByCode.get(code) : undefined;
    if (!ticket) return { label: "Select a ticket first", disabled: true, hint: "Choose one of your tickets on the left." };
    if (ticket.tableCode) {
      const at = tableNameByCode.get(ticket.tableCode) ?? ticket.tableCode;
      return { label: "Ticket already seated", disabled: true, hint: `${ticket.attendee.firstName} is at ${at}. Clear it to move.` };
    }
    if (!openTable.eligibleTicketCodes.includes(ticket.ticketCode)) {
      return { label: "Not eligible", disabled: true, hint: `${ticket.ticketName} can’t be seated at this table.` };
    }
    if (openTable.tags.length > 0 && !ticket.attendeeTags.some((t) => openTable.tags.includes(t))) {
      return { label: "Reserved table", disabled: true, hint: "This table is reserved for a specific group." };
    }
    return { label: `Assign ${ticket.attendee.firstName} here`, disabled: false };
  }, [openTable, mode, assignableCodes, selectedCodes, ticketByCode, tableNameByCode]);

  return (
    <div className="pl-map-editor flex h-full min-h-0 bg-gray-100 relative">
      <TicketPanel
        mode={mode}
        tickets={tickets}
        selectedCodes={selectedCodes}
        onToggle={toggleTicket}
        openTable={openTable}
        searchTerm={searchTerm}
        onSearchChange={(t) => onSearchChange?.(t)}
        filterOptions={filterOptions}
        activeFilterIds={activeFilterIds}
        onFilterToggle={onFilterToggle}
        tableLabel={(code) => tableNameByCode.get(code)}
        onClearTicket={handleClearTicket}
        lockSeatSelectionPage={lockSeatSelectionPage}
        loading={ticketsLoading}
        hasMore={hasMoreTickets}
        onLoadMore={onLoadMoreTickets}
      />

      <SeatPlanCanvas
        data={data}
        getTableColor={getTableColor}
        highlightedTableCode={openTableCode}
        dimmedTableCodes={dimmedTableCodes}
        onTableClick={handleTableClick}
        onBackgroundClick={closePopover}
      >
        <OccupancyLegend />
        {openTable && (
          <TableDetailPopover
            table={openTable}
            tableName={tableNameByCode.get(openTable.tableCode) ?? openTable.tableCode}
            occupants={occupants}
            occupantsLoading={occupantsLoading}
            hideAttendeeDetails={hideAttendeeDetails}
            allowUnassign={mode === "admin" || !lockSeatSelectionPage}
            assignLabel={assignCta.label}
            assignDisabled={assignCta.disabled}
            assignHint={assignCta.hint}
            assigning={assigning}
            onAssign={handleAssign}
            onUnassign={handleUnassign}
            onClose={closePopover}
          />
        )}
      </SeatPlanCanvas>
    </div>
  );
}

import type { SeatTableState, SeatTicket, SeatPlanMode } from "./types";

export type OccupancyLevel = "available" | "half" | "low" | "full";

type OccupancyInput = Pick<SeatTableState, "seatCount" | "occupancy" | "isLocked">;

/**
 * Availability bucket for a table, matching the existing Charmander legend:
 * full/locked → grey, >50% free → green, 10–50% → amber, <10% → red.
 */
export function occupancyLevel(table: OccupancyInput): OccupancyLevel {
  if (table.isLocked || table.seatCount <= 0 || table.occupancy >= table.seatCount) return "full";
  const freePct = ((table.seatCount - table.occupancy) / table.seatCount) * 100;
  if (freePct > 50) return "available";
  if (freePct >= 10) return "half";
  return "low";
}

/**
 * Konva fill color per availability level. Mid-toned (not the HTML wash) so the
 * white table label stays legible on the canvas.
 */
const OCCUPANCY_FILL: Record<OccupancyLevel, string> = {
  available: "#34b87a",
  half: "#f0a92e",
  low: "#e25c5c",
  full: "#9aa6b8",
};

export function occupancyColor(table: OccupancyInput): string {
  return OCCUPANCY_FILL[occupancyLevel(table)];
}

/**
 * Whether a ticket can be assigned to a table. Pure UI logic mirrored from both
 * Charmander tools: type allowlist + not full/locked + ticket unassigned, plus
 * the tag-match rule in attendee mode.
 */
export function isEligible(ticket: SeatTicket, table: SeatTableState, mode: SeatPlanMode): boolean {
  if (table.isLocked || table.occupancy >= table.seatCount) return false;
  if (ticket.tableCode) return false;
  if (!table.eligibleTicketCodes.includes(ticket.ticketCode)) return false;
  if (mode === "attendee" && table.tags.length > 0) {
    if (!ticket.attendeeTags.some((t) => table.tags.includes(t))) return false;
  }
  return true;
}

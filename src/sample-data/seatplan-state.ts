import { seatPlanTables } from "./seatplan-tables";
import type { SeatTableState } from "../seatviewer/types";

/**
 * Demo assignment/eligibility overlay for the sample banquet hall. In production
 * this comes from the backend (Charmander's seat-plan detail), keyed by tableCode.
 */
const VIP_TABLES = new Set(["SEATBL0001", "SEATBL0002", "SEATBL0003"]);
const OCCUPANCY_CYCLE = [1.0, 0.6, 0.15, 0.9, 0.4, 0.05]; // fraction of seats filled

export const seatPlanState: SeatTableState[] = seatPlanTables.map((t, i) => {
  const occupancy = Math.min(Math.round(t.seatCount * OCCUPANCY_CYCLE[i % OCCUPANCY_CYCLE.length]), t.seatCount);
  return {
    tableCode: t.code,
    seatCount: t.seatCount,
    occupancy,
    isLocked: i === 0, // first table locked, to exercise the "full/locked" treatment
    eligibleTicketCodes: VIP_TABLES.has(t.code) ? ["VIP"] : ["GA", "SPON"],
    tags: t.code === "SEATBL0003" ? ["head-table"] : [],
  };
});

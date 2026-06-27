/**
 * Mirrors the PheedLoop SeatTable DB record (builder-relevant fields only).
 * code       → SeatTable.code (unique internal id the editor links elements to)
 * identifier → SeatTable.identifier (user-facing name, e.g. "Table 2")
 * seatCount  → SeatTable.seat_count
 */
export interface TableRecord {
  code: string;
  identifier: string;
  seatCount: number;
}

const SEAT_COUNTS = [8, 10, 12];

export const seatPlanTables: TableRecord[] = Array.from(
  { length: 18 },
  (_, i): TableRecord => ({
    code: `SEATBL${String(i + 1).padStart(4, "0")}`,
    identifier: `Table ${i + 1}`,
    seatCount: SEAT_COUNTS[i % SEAT_COUNTS.length],
  }),
);

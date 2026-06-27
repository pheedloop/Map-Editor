import type { SeatOccupant, SeatTableState } from "../seatviewer/types";

const NAME_POOL: [string, string][] = [
  ["Daniel", "Reyes"], ["Hannah", "Cole"], ["Omar", "Haddad"], ["Grace", "Lin"],
  ["Sven", "Larsson"], ["Mei", "Tan"], ["Pablo", "Ortiz"], ["Ingrid", "Berg"],
  ["Raj", "Mehta"], ["Chloe", "Dubois"], ["Tomás", "Silva"], ["Aisha", "Khan"],
];

/**
 * Seed a demo occupant list per table to match each table's occupancy, so the
 * popover shows a coherent "seated here" list. Each occupant carries a
 * seatSelectionCode so per-occupant unassign works in the demo.
 */
export function seedOccupants(tables: SeatTableState[]): Record<string, SeatOccupant[]> {
  const map: Record<string, SeatOccupant[]> = {};
  let sel = 6000;
  let n = 0;
  for (const t of tables) {
    const arr: SeatOccupant[] = [];
    for (let i = 0; i < t.occupancy; i++) {
      const [firstName, lastName] = NAME_POOL[n % NAME_POOL.length];
      n++;
      arr.push({
        code: `OCC-${sel}`,
        firstName,
        lastName,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
        organization: "—",
        seatSelectionCode: sel++,
      });
    }
    map[t.tableCode] = arr;
  }
  return map;
}

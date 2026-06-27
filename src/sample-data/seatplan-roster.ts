import type { SeatTableState, SeatTicket } from "../seatviewer/types";

const FIRST = [
  "Olivia", "Liam", "Emma", "Noah", "Ava", "Ethan", "Sophia", "Mason", "Isabella", "Lucas",
  "Mia", "Diego", "Amara", "Yuki", "Omar", "Hannah", "Mateo", "Chloe", "Raj", "Ingrid",
  "Marcus", "Fatima", "Daniel", "Grace", "Pablo", "Mei", "Aisha", "Sven",
];
const LAST = [
  "Reyes", "Cole", "Haddad", "Lin", "Larsson", "Tan", "Ortiz", "Berg", "Mehta", "Dubois",
  "Silva", "Khan", "Nguyen", "Rossi", "Bennett", "Adeyemi", "Patel", "Kim", "Hernández",
  "Walsh", "Moreau", "Costa", "Ivanov", "Park",
];

const TICKET_LABEL: Record<string, string> = {
  VIP: "VIP Gala",
  SPON: "Sponsor",
  GA: "General Admission",
};

function make(
  code: string,
  ticketCode: string,
  first: string,
  last: string,
  tableCode: string | null,
  seatSelectionCode: number | null,
  attendeeTags: string[] = [],
): SeatTicket {
  const slug = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, "");
  return {
    code,
    ticketCode,
    ticketName: TICKET_LABEL[ticketCode] ?? ticketCode,
    attendee: { code: `ATT-${code}`, firstName: first, lastName: last, email: `${slug}@example.com`, organization: "—" },
    tableCode,
    seatSelectionCode,
    attendeeTags,
  };
}

/** Two unassigned tickets designated as the attendee-demo user's own. */
export const MY_TICKET_CODES = ["PUR-9001", "PUR-9002"] as const;

const POOL: [string, string, string, string, string[]][] = [
  ["PUR-9001", "VIP", "Alexandra", "Featherstone-Whitmore", ["head-table"]],
  ["PUR-9002", "GA", "Jordan", "Featherstone", []],
  ["PUR-9003", "VIP", "Noah", "Kim", []],
  ["PUR-9004", "SPON", "Priya", "Patel-Subramaniam", []],
  ["PUR-9005", "SPON", "Emmanuel", "Adeyemi", []],
  ["PUR-9006", "GA", "Liam", "O'Brien", []],
  ["PUR-9007", "GA", "Sofia", "Rossi", []],
  ["PUR-9008", "GA", "Ava", "Nguyen-Thompson", []],
  ["PUR-9009", "GA", "Marcus", "Bennett", []],
  ["PUR-9010", "GA", "Yuki", "Tanaka", []],
];

/**
 * Build a coherent demo roster: enough seated attendees to fill each table to its
 * occupancy (so the list reflects everyone, each showing their table), plus an
 * unassigned pool to assign from. Occupants per table are these seated tickets.
 */
export function buildSeatPlanRoster(tables: SeatTableState[]): SeatTicket[] {
  const out: SeatTicket[] = [];
  let n = 0;
  let sel = 5000;

  for (const t of tables) {
    const ticketCode = t.eligibleTicketCodes[0] ?? "GA";
    for (let i = 0; i < t.occupancy; i++) {
      const first = FIRST[n % FIRST.length];
      const last = LAST[(n * 7 + 5) % LAST.length];
      n++;
      out.push(make(`PUR-${1000 + out.length}`, ticketCode, first, last, t.tableCode, sel++));
    }
  }

  for (const [code, tc, first, last, tags] of POOL) {
    out.push(make(code, tc, first, last, null, null, tags));
  }

  // Additional unseated attendees so there's a deep pool to assign from.
  for (let i = 0; i < 24; i++) {
    const first = FIRST[(n + 3) % FIRST.length];
    const last = LAST[(n * 5 + 11) % LAST.length];
    n++;
    const tc = i % 6 === 0 ? "VIP" : i % 3 === 0 ? "SPON" : "GA";
    out.push(make(`PUR-${9100 + i}`, tc, first, last, null, null));
  }

  return out;
}

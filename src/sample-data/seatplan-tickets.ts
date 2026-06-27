import type { SeatTicket } from "../seatviewer/types";

/**
 * Demo pool of ticket holders for the seatplanner viewer. In production this is
 * the host's `/tickets/` (admin) or `/mytickets/` (attendee) response.
 */
export const seatPlanTickets: SeatTicket[] = [
  mk("PUR-8821", "VIP", "VIP Gala", "Alexandra", "Featherstone-Whitmore", "alexandra@pheedloop.com", "PheedLoop", ["head-table"]),
  mk("PUR-8822", "VIP", "VIP Gala", "Maria del Carmen", "Rodríguez Lopez", "maria@vertex.io", "Vertex Labs"),
  mk("PUR-8823", "VIP", "VIP Gala", "Noah", "Kim", "noah@northwind.co", "Northwind Capital"),
  mk("PUR-8824", "SPON", "Sponsor", "Priya", "Patel-Subramaniam", "priya@aurora.com", "Aurora Dynamics"),
  mk("PUR-8825", "SPON", "Sponsor", "Emmanuel", "Adeyemi", "emmanuel@brightpath.io", "BrightPath Ventures"),
  mk("PUR-8826", "GA", "General Admission", "Liam", "O'Brien", "liam@example.com"),
  mk("PUR-8827", "GA", "General Admission", "Sofia", "Rossi", "sofia@example.com"),
  mk("PUR-8828", "GA", "General Admission", "Ava", "Nguyen-Thompson", "ava@example.com"),
  mk("PUR-8829", "GA", "General Admission", "Marcus", "Bennett", "marcus@example.com"),
  mk("PUR-8830", "GA", "General Admission", "Yuki", "Tanaka", "yuki@example.com"),
  mk("PUR-8831", "GA", "General Admission", "Diego", "Hernández", "diego@example.com"),
  mk("PUR-8832", "GA", "General Admission", "Fatima", "Al-Rashid", "fatima@example.com"),
];

function mk(
  code: string,
  ticketCode: string,
  ticketName: string,
  firstName: string,
  lastName: string,
  email: string,
  organization = "—",
  attendeeTags: string[] = [],
): SeatTicket {
  return {
    code,
    ticketCode,
    ticketName,
    attendee: { code: `ATT-${code}`, firstName, lastName, email, organization },
    tableCode: null,
    seatSelectionCode: null,
    attendeeTags,
  };
}

// Demo attendee provider for the standalone Map-Editor app. In Ditto these are
// replaced with calls to the attendee lookup + badge-context API.

import qrCodeUrl from "./qr-code.png";
import type { AttendeeOption, AttendeeProvider, BadgeData } from "./badgeData";

interface SampleAttendee extends AttendeeOption {
  data: BadgeData;
}

const SAMPLE: SampleAttendee[] = [
  {
    id: "att-1",
    name: "Jordan Rivera",
    subtitle: "Northwind Labs · jordan@northwind.io",
    data: {
      values: {
        name: "Jordan Rivera",
        first_name: "Jordan",
        last_name: "Rivera",
        organization: "Northwind Labs",
        title: "Principal Engineer",
        designations: "PhD",
        pronouns: "they/them",
        address_city: "Austin",
        address_state: "TX",
        address_country: "USA",
        city_state: "Austin, TX",
        tags: "Speaker, VIP",
        code_internal: "NW-4417",
        table_number: "12",
        dietary_restrictions: "Vegetarian",
      },
      custom: { shirt_size: "L" },
      qrCode: qrCodeUrl,
      externalQRCodeUrl: qrCodeUrl,
      tickets: [
        { name: "Full Conference", qrUrl: qrCodeUrl },
        { name: "Workshop: Kubernetes", qrUrl: qrCodeUrl },
        { name: "Gala Dinner", qrUrl: qrCodeUrl },
      ],
      sessions: [
        { date: "May 12", time: "9:00 AM – 10:00 AM", speaker: "A. Okafor" },
        { date: "May 12", time: "1:30 PM – 2:30 PM", speaker: "J. Rivera" },
        { date: "May 13", time: "11:00 AM – 12:00 PM", speaker: "L. Chen" },
      ],
    },
  },
  {
    id: "att-2",
    name: "Mei-Ling Chen",
    subtitle: "Cascade Health · mchen@cascade.org",
    data: {
      values: {
        name: "Mei-Ling Chen",
        first_name: "Mei-Ling",
        last_name: "Chen",
        organization: "Cascade Health",
        title: "Director of Operations",
        designations: "MBA",
        pronouns: "she/her",
        address_city: "Seattle",
        address_state: "WA",
        address_country: "USA",
        city_state: "Seattle, WA",
        tags: "Exhibitor",
        code_internal: "CH-2098",
        table_number: "4",
        dietary_restrictions: "",
      },
      custom: { shirt_size: "M" },
      qrCode: qrCodeUrl,
      externalQRCodeUrl: qrCodeUrl,
      tickets: [{ name: "Full Conference", qrUrl: qrCodeUrl }],
      sessions: [
        { date: "May 12", time: "10:30 AM – 11:30 AM", speaker: "M. Chen" },
      ],
    },
  },
  {
    id: "att-3",
    name: "Samuel Adeyemi",
    subtitle: "Independent · sam.adeyemi@gmail.com",
    data: {
      values: {
        name: "Samuel Adeyemi",
        first_name: "Samuel",
        last_name: "Adeyemi",
        organization: "",
        title: "Consultant",
        designations: "",
        pronouns: "he/him",
        address_city: "Lagos",
        address_state: "",
        address_country: "Nigeria",
        city_state: "Lagos, Nigeria",
        tags: "",
        code_internal: "GA-7741",
        table_number: "",
        dietary_restrictions: "Halal",
      },
      custom: {},
      qrCode: qrCodeUrl,
      externalQRCodeUrl: qrCodeUrl,
      tickets: [
        { name: "Day Pass", qrUrl: qrCodeUrl },
        { name: "Workshop: AI Ethics", qrUrl: qrCodeUrl },
      ],
      sessions: [],
    },
  },
];

/** Local provider over SAMPLE with a small simulated latency. */
export const sampleAttendeeProvider: AttendeeProvider = {
  async search(query: string): Promise<AttendeeOption[]> {
    const q = query.trim().toLowerCase();
    await new Promise((r) => setTimeout(r, 150));
    return SAMPLE.filter(
      (a) =>
        !q ||
        a.name.toLowerCase().includes(q) ||
        (a.subtitle ?? "").toLowerCase().includes(q),
    ).map(({ id, name, subtitle }) => ({ id, name, subtitle }));
  },
  async resolve(id: string): Promise<BadgeData> {
    await new Promise((r) => setTimeout(r, 100));
    const found = SAMPLE.find((a) => a.id === id);
    if (!found) throw new Error(`Unknown attendee ${id}`);
    return found.data;
  },
};

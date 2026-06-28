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
  {
    id: "att-4",
    name: "Priya Nair",
    subtitle: "Helix Biotech · priya.nair@helixbio.com",
    data: {
      values: {
        name: "Priya Nair", first_name: "Priya", last_name: "Nair",
        organization: "Helix Biotech", title: "VP, Research", designations: "PhD",
        pronouns: "she/her", address_city: "Bengaluru", address_state: "KA",
        address_country: "India", city_state: "Bengaluru, KA", tags: "Speaker, Keynote",
        code_internal: "HB-1180", table_number: "1", dietary_restrictions: "Vegetarian",
      },
      custom: { shirt_size: "S" },
      qrCode: qrCodeUrl, externalQRCodeUrl: qrCodeUrl,
      tickets: [
        { name: "Full Conference", qrUrl: qrCodeUrl },
        { name: "Speaker Dinner", qrUrl: qrCodeUrl },
      ],
      sessions: [
        { date: "May 12", time: "9:00 AM – 10:00 AM", speaker: "P. Nair" },
        { date: "May 13", time: "2:00 PM – 3:00 PM", speaker: "P. Nair" },
      ],
    },
  },
  {
    id: "att-5",
    name: "Lucas Müller",
    subtitle: "Rheinwerk GmbH · lucas.mueller@rheinwerk.de",
    data: {
      values: {
        name: "Lucas Müller", first_name: "Lucas", last_name: "Müller",
        organization: "Rheinwerk GmbH", title: "Chief Technology Officer", designations: "",
        pronouns: "he/him", address_city: "Berlin", address_state: "",
        address_country: "Germany", city_state: "Berlin, Germany", tags: "VIP",
        code_internal: "RW-3321", table_number: "7", dietary_restrictions: "",
      },
      custom: { shirt_size: "XL" },
      qrCode: qrCodeUrl, externalQRCodeUrl: qrCodeUrl,
      tickets: [{ name: "Full Conference", qrUrl: qrCodeUrl }],
      sessions: [
        { date: "May 12", time: "11:00 AM – 12:00 PM", speaker: "L. Müller" },
      ],
    },
  },
  {
    id: "att-6",
    name: "Aisha Al-Farsi",
    subtitle: "Gulf Ventures · aisha@gulfventures.ae",
    data: {
      values: {
        name: "Aisha Al-Farsi", first_name: "Aisha", last_name: "Al-Farsi",
        organization: "Gulf Ventures", title: "Managing Partner", designations: "MBA",
        pronouns: "she/her", address_city: "Dubai", address_state: "",
        address_country: "UAE", city_state: "Dubai, UAE", tags: "Investor, VIP",
        code_internal: "GV-5567", table_number: "2", dietary_restrictions: "Halal",
      },
      custom: { shirt_size: "M" },
      qrCode: qrCodeUrl, externalQRCodeUrl: qrCodeUrl,
      tickets: [
        { name: "Full Conference", qrUrl: qrCodeUrl },
        { name: "Investor Lounge", qrUrl: qrCodeUrl },
        { name: "Gala Dinner", qrUrl: qrCodeUrl },
      ],
      sessions: [],
    },
  },
  {
    id: "att-7",
    name: "Diego Fernández",
    subtitle: "Andes Studio · diego@andes.studio",
    data: {
      values: {
        name: "Diego Fernández", first_name: "Diego", last_name: "Fernández",
        organization: "Andes Studio", title: "Creative Director", designations: "",
        pronouns: "he/him", address_city: "Buenos Aires", address_state: "",
        address_country: "Argentina", city_state: "Buenos Aires, Argentina", tags: "Exhibitor",
        code_internal: "AS-9043", table_number: "", dietary_restrictions: "Gluten-free",
      },
      custom: { shirt_size: "L" },
      qrCode: qrCodeUrl, externalQRCodeUrl: qrCodeUrl,
      tickets: [{ name: "Day Pass — Thu", qrUrl: qrCodeUrl }],
      sessions: [
        { date: "May 12", time: "3:30 PM – 4:15 PM", speaker: "D. Fernández" },
      ],
    },
  },
  {
    id: "att-8",
    name: "Grace O'Sullivan",
    subtitle: "Shamrock Media · grace@shamrock.media",
    data: {
      values: {
        name: "Grace O'Sullivan", first_name: "Grace", last_name: "O'Sullivan",
        organization: "Shamrock Media", title: "Editor-in-Chief", designations: "",
        pronouns: "she/her", address_city: "Dublin", address_state: "",
        address_country: "Ireland", city_state: "Dublin, Ireland", tags: "Press",
        code_internal: "SM-2275", table_number: "9", dietary_restrictions: "",
      },
      custom: { shirt_size: "S" },
      qrCode: qrCodeUrl, externalQRCodeUrl: qrCodeUrl,
      tickets: [{ name: "Press Pass", qrUrl: qrCodeUrl }],
      sessions: [
        { date: "May 12", time: "10:00 AM – 10:45 AM", speaker: "Panel" },
        { date: "May 13", time: "9:30 AM – 10:15 AM", speaker: "Panel" },
      ],
    },
  },
  {
    id: "att-9",
    name: "Hiroshi Tanaka",
    subtitle: "Sakura Robotics · h.tanaka@sakura-robotics.jp",
    data: {
      values: {
        name: "Hiroshi Tanaka", first_name: "Hiroshi", last_name: "Tanaka",
        organization: "Sakura Robotics", title: "Lead Robotics Engineer", designations: "MSc",
        pronouns: "he/him", address_city: "Tokyo", address_state: "",
        address_country: "Japan", city_state: "Tokyo, Japan", tags: "Speaker",
        code_internal: "SR-6612", table_number: "5", dietary_restrictions: "Pescatarian",
      },
      custom: { shirt_size: "M" },
      qrCode: qrCodeUrl, externalQRCodeUrl: qrCodeUrl,
      tickets: [
        { name: "Full Conference", qrUrl: qrCodeUrl },
        { name: "Workshop: ROS2", qrUrl: qrCodeUrl },
      ],
      sessions: [
        { date: "May 13", time: "1:00 PM – 2:30 PM", speaker: "H. Tanaka" },
      ],
    },
  },
  {
    id: "att-10",
    name: "Fatou Diop",
    subtitle: "Sahel Energy · fatou.diop@sahelenergy.sn",
    data: {
      values: {
        name: "Fatou Diop", first_name: "Fatou", last_name: "Diop",
        organization: "Sahel Energy", title: "Senior Analyst", designations: "",
        pronouns: "she/her", address_city: "Dakar", address_state: "",
        address_country: "Senegal", city_state: "Dakar, Senegal", tags: "",
        code_internal: "SE-4408", table_number: "3", dietary_restrictions: "Halal",
      },
      custom: { shirt_size: "M" },
      qrCode: qrCodeUrl, externalQRCodeUrl: qrCodeUrl,
      tickets: [{ name: "Full Conference", qrUrl: qrCodeUrl }],
      sessions: [],
    },
  },
  {
    id: "att-11",
    name: "Emily Carter",
    subtitle: "Independent · emily.carter@gmail.com",
    data: {
      values: {
        name: "Emily Carter", first_name: "Emily", last_name: "Carter",
        organization: "", title: "Freelance Product Designer", designations: "",
        pronouns: "she/her", address_city: "Toronto", address_state: "ON",
        address_country: "Canada", city_state: "Toronto, ON", tags: "",
        code_internal: "GA-8890", table_number: "", dietary_restrictions: "Vegan",
      },
      custom: {},
      qrCode: qrCodeUrl, externalQRCodeUrl: qrCodeUrl,
      tickets: [
        { name: "Day Pass — Fri", qrUrl: qrCodeUrl },
        { name: "Portfolio Review", qrUrl: qrCodeUrl },
        { name: "After Party", qrUrl: qrCodeUrl },
      ],
      sessions: [
        { date: "May 13", time: "4:00 PM – 5:00 PM", speaker: "Workshop" },
      ],
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

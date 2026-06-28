// ---------------------------------------------------------------------------
// Live attendee data contract
// ---------------------------------------------------------------------------
//
// The editor renders a badge populated with a real attendee's values, but stays
// API-decoupled: the HOST supplies the data via an AttendeeProvider, and the
// editor owns the field→value rendering. Ditto maps pikachu's get_badge_context
// / get_field_data (apps/badge/zpl.py, libs/badge_generator.py) into BadgeData.

import type { BadgeField } from "./model";

/** One row in the attendee search dropdown. */
export interface AttendeeOption {
  id: string;
  name: string;
  /** Secondary line — typically organization or email. */
  subtitle?: string;
}

export interface BadgeTicketData {
  name: string;
  /** Image URL / dataURI for this ticket's QR (optional). */
  qrUrl?: string;
}

export interface BadgeSessionData {
  date: string; // e.g. "Jan 15"
  time: string; // e.g. "10:00 AM – 11:30 AM"
  speaker: string;
}

/** Resolved values for one attendee, keyed by EDITOR field keys. */
export interface BadgeData {
  /** Text fields keyed by field id (first_name, organization, name, city_state, tags, …). */
  values: Record<string, string>;
  /** extra_fields values, keyed by custom_attendee_field. */
  custom: Record<string, string>;
  /** Image URL / dataURI for the badge QR (qrCode field). */
  qrCode?: string;
  /** Image URL / dataURI for the external QR (externalQRCodeUrl field). */
  externalQRCodeUrl?: string;
  tickets: BadgeTicketData[];
  sessions: BadgeSessionData[];
}

export interface AttendeeProvider {
  /** Searches attendees for the picker (debounced by the picker). */
  search(query: string): Promise<AttendeeOption[]>;
  /** Resolves a selected attendee id into renderable BadgeData. */
  resolve(id: string): Promise<BadgeData>;
}

// --- custom_text token substitution -----------------------------------------
// Mirrors the tokens in raichu's badge designer / pikachu custom_text handling.
const TOKEN_TO_VALUE_KEY: Record<string, string> = {
  first_name: "first_name",
  last_name: "last_name",
  organization: "organization",
  title: "title",
  designations: "designations",
  pronouns: "pronouns",
  city: "address_city",
  country: "address_country",
  internal_code: "code_internal",
  dietary_restrictions: "dietary_restrictions",
};

function substituteTokens(text: string, values: Record<string, string>): string {
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, token: string) => {
    const key = TOKEN_TO_VALUE_KEY[token];
    return (key && values[key]) || "";
  });
}

/**
 * Resolve a text-like field (text / sessionSchedule label / custom_text /
 * extra_fields) to its display string for a given attendee.
 */
export function fieldValueText(field: BadgeField, data: BadgeData): string {
  if (field.field === "custom_text") {
    return substituteTokens(field.text ?? "", data.values);
  }
  if (field.field === "extra_fields") {
    return data.custom[field.customAttendeeField ?? ""] ?? "";
  }
  return data.values[field.field] ?? "";
}

/** The image URL a QR-kind field should display for this attendee, if any. */
export function fieldQrUrl(field: BadgeField, data: BadgeData): string | undefined {
  return field.field === "externalQRCodeUrl" ? data.externalQRCodeUrl : data.qrCode;
}

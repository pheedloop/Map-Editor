// ---------------------------------------------------------------------------
// Field registry
// ---------------------------------------------------------------------------
//
// The palette of fields a badge can contain, ported from the CURRENT Raichu
// designer (NewBadgeDesigner: TextFieldNames.jsx + UNEDITABLE_FIELDS, which
// reuses BadgeDesigner/editorClasses for serialization). Each field maps to a
// FieldKind that drives rendering, controls, and serialization.
//
// Note: NewBadgeDesigner also injects per-event "custom attendee fields" into
// the menu dynamically; those serialize as field="extra_fields" with a
// custom_attendee_field key. They are not part of this static registry — the
// palette receives them at runtime (see kindForField/isLiteralTextField, which
// already handle "extra_fields").

import type { FieldKind } from "./model";

export interface FieldDef {
  /** Backend field identifier (also the key in TextFieldNames). */
  field: string;
  /** Human label shown in the palette. */
  label: string;
  kind: FieldKind;
  /** Whether this field appears in the field menu. Defaults to true; `image`
   *  sets false (added via the image gallery instead). */
  inPalette?: boolean;
}

/**
 * Fields whose value the attendee may NOT edit at print time. Everything else
 * defaults to userEditable. Ported from NewBadgeDesigner/constants.jsx.
 */
export const UNEDITABLE_FIELDS = [
  "custom_text",
  "tags",
  "code_internal",
  "table_number",
] as const;

/** Mirror of NewBadgeDesigner/helper.js `isUserFieldEditableEnable`. */
export const isUserFieldEditable = (field: string | undefined): boolean => {
  if (!field) return false;
  return !UNEDITABLE_FIELDS.includes(field as (typeof UNEDITABLE_FIELDS)[number]);
};

/**
 * Ordered palette. Order mirrors NewBadgeDesigner/TextFieldNames.jsx.
 * `externalQRCodeUrl` uses the same BadgeQRCode class as `qrCode` (kind
 * "qrCode"). `image` is placed via the image gallery rather than the field
 * menu, but lives in the same registry for kind lookup (see inPalette=false).
 */
export const FIELD_DEFS: FieldDef[] = [
  { field: "name", label: "Full Name", kind: "text" },
  { field: "first_name", label: "First Name", kind: "text" },
  { field: "last_name", label: "Last Name", kind: "text" },
  { field: "tags", label: "Tags", kind: "text" },
  { field: "qrCode", label: "QR Code", kind: "qrCode" },
  { field: "externalQRCodeUrl", label: "External QR Code", kind: "qrCode" },
  { field: "organization", label: "Organization", kind: "text" },
  { field: "title", label: "Job Title", kind: "text" },
  { field: "designations", label: "Designations", kind: "text" },
  { field: "pronouns", label: "Pronouns", kind: "text" },
  { field: "address_city", label: "City", kind: "text" },
  { field: "address_country", label: "Country", kind: "text" },
  { field: "address_state", label: "State/Province", kind: "text" },
  { field: "city_state", label: "City+State/Provinces", kind: "text" },
  { field: "session_schedule", label: "Session Schedule", kind: "sessionSchedule" },
  { field: "custom_text", label: "Custom Text Field", kind: "text" },
  { field: "tickets", label: "Tickets", kind: "tickets" },
  { field: "code_internal", label: "Internal Code", kind: "text" },
  { field: "table_number", label: "Table Number", kind: "text" },
  { field: "dietary_restrictions", label: "Dietary Restrictions", kind: "text" },
  // Placed via the image gallery, not the field menu.
  { field: "image", label: "Image", kind: "image", inPalette: false },
];

const FIELD_DEF_BY_KEY: Record<string, FieldDef> = Object.fromEntries(
  FIELD_DEFS.map((d) => [d.field, d]),
);

export const getFieldDef = (field: string): FieldDef | undefined =>
  FIELD_DEF_BY_KEY[field];

/**
 * Resolve a field key to its kind. Unknown keys (e.g. custom attendee fields
 * surfaced as `extra_fields`) default to text.
 */
export const kindForField = (field: string): FieldKind =>
  FIELD_DEF_BY_KEY[field]?.kind ?? "text";

/** Fields whose `text` literal is part of the layout (designer-authored copy). */
export const isLiteralTextField = (field: string): boolean =>
  field === "custom_text" || field === "extra_fields";

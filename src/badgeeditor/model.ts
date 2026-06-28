// ---------------------------------------------------------------------------
// Badge editor data model
// ---------------------------------------------------------------------------
//
// The badge editor is field-based, not geometry-based: a fixed-size card (in
// INCHES) holding a fixed palette of fields. This is intentionally independent
// of the map editor's `FloorPlanData` (which is px/geometry-centric). See the
// plan in functional-swinging-bear.md for why.
//
// Two representations exist:
//   1. BadgeDocument — the rich editor document (native units = inches, page
//      aware). This is what the editor reads/writes and what we persist as the
//      new `editor_document` column.
//   2. LegacyLayoutEntry[] — the flat array stored in `BadgeTemplate.badge_layout`
//      that the pikachu ZPL pipeline consumes. We flatten BadgeDocument down to
//      this on save (see serialize.ts) so the print backend is unchanged.

/** Inches → pixels. The legacy designer renders at 96 DPI. */
export const DPI = 96;
/**
 * The ZPL backend expects a font scale factor relative to a 32px font (≈112
 * dots on a 300 DPI printer; the backend re-scales for other DPIs). Text fields
 * store `scale = fontSize / BACKEND_REFERENCE_FONT_SIZE`.
 */
export const BACKEND_REFERENCE_FONT_SIZE = 32;

export const inchToPx = (inches: number): number => inches * DPI;
export const pxToInch = (px: number): number => px / DPI;

// --- Fields ---

export type TextAlign = "left" | "center" | "right" | "justify";

/**
 * Logical kind of a field, which determines how it renders, what controls it
 * exposes, and how it serializes. Mirrors the legacy Fabric subclasses
 * (BadgeText / BadgeQRCode / BadgeImage / BadgeTickets) plus session_schedule.
 */
export type FieldKind = "text" | "qrCode" | "tickets" | "image" | "sessionSchedule";

export interface BadgeField {
  /** Stable client id (uuid). Not serialized to the legacy layout. */
  id: string;
  /** Field identifier the backend understands, e.g. "first_name" | "qrCode". */
  field: string;
  kind: FieldKind;

  /** Panel-local, upright position in INCHES (top-left origin). */
  top: number;
  left: number;
  /** Box size in INCHES. Omitted for qrCode (fixed aspect, scale-only). */
  width?: number;
  height?: number;

  // Text / sessionSchedule
  fontSize?: number;
  numLines?: number;
  textAlign?: TextAlign;
  /** Whether the attendee may edit this value at print time. Only meaningful
   *  for editable fields (see fields.ts isUserFieldEditable). */
  userEditable?: boolean;
  /** Literal text for custom_text / extra_fields. */
  text?: string;
  /** Backing custom attendee field key for extra_fields. */
  customAttendeeField?: string | null;

  // qrCode / image — uniform scale factor (legacy stores scaleX)
  scale?: number;
  /** Image reference code (BadgeTemplateImage.code) for image fields. */
  code?: string;

  // tickets
  numRows?: number;

  /**
   * User-applied 180° rotation of the field itself (rare, legacy `inverted`).
   * This is SEPARATE from page-fold inversion, which is applied automatically
   * during flatten based on the page role.
   */
  inverted?: boolean;
}

// --- Pages / fold ---

export type FoldType = "none" | "single" | "double";
export type PageRole = "front" | "back" | "inner";

export interface BadgePage {
  id: string;
  role: PageRole;
  fields: BadgeField[];
}

export interface BadgeBackground {
  /** BadgeTemplateImage.code, when the background is a stored image. */
  imageCode?: string;
  /** CSS-style fit, persisted to BadgeTemplate.background_image_box_fit. */
  boxFit?: string;
  /** Reference image dimensions in INCHES. */
  width: number;
  height: number;
}

export interface BadgeDocument {
  version: string;
  /** One panel's printable size in INCHES (e.g. 3.5 × 5.5). */
  panelSize: { width: number; height: number };
  /** "none" = 1 page, "single" = 2 pages (one fold), "double" = 3 pages. */
  fold: FoldType;
  pages: BadgePage[];
  background?: BadgeBackground;
}

// --- Legacy flat layout (badge_layout) ---

/**
 * One entry in the flat `badge_layout` JSON array. Property presence varies by
 * field kind — text fields carry scale/fontSize/numLines/textAlign, qrCode only
 * top/left/scale, tickets carry numRows but no fontSize. Keep this loose to
 * match the legacy output exactly (see serialize.ts).
 */
export interface LegacyLayoutEntry {
  top: number;
  left: number;
  field: string;
  scale?: number;
  height?: number;
  width?: number;
  fontSize?: number;
  numLines?: number;
  textAlign?: TextAlign;
  inverted?: boolean;
  userEditable?: boolean;
  text?: string;
  custom_attendee_field?: string | null;
  numRows?: number;
  code?: string;
}

/** Flattened output paired with the template dimensions the backend stores. */
export interface FlattenResult {
  layout: LegacyLayoutEntry[];
  /** Full UNFOLDED template size in INCHES (panel × page count). */
  width: number;
  height: number;
}

export const BADGE_DOCUMENT_VERSION = "1.0";

/** Number of panels implied by a fold type. */
export const PAGE_COUNT: Record<FoldType, number> = {
  none: 1,
  single: 2,
  double: 3,
};

// ---------------------------------------------------------------------------
// Serialization: BadgeDocument  <->  legacy badge_layout array
// ---------------------------------------------------------------------------
//
// flatten() collapses the page-aware BadgeDocument into the single flat array
// the pikachu ZPL pipeline already understands, reproducing the legacy Fabric
// serializers exactly (BadgeText/BadgeQRCode/BadgeImage/BadgeTickets.toObject).
// inflate() does the reverse for loading templates that have no rich
// editor_document yet.
//
// COMPATIBILITY IS LOAD-BEARING. The per-field math here must match
// raichu .../BadgeDesigner/editorClasses.jsx field-for-field. See verify.ts.

import { v4 as uuid } from "uuid";
import {
  BACKEND_REFERENCE_FONT_SIZE,
  BADGE_DOCUMENT_VERSION,
  PAGE_COUNT,
  inchToPx,
  type BadgeDocument,
  type BadgeField,
  type FlattenResult,
  type FoldType,
  type LegacyLayoutEntry,
} from "./model";
import { isLiteralTextField, isUserFieldEditable, kindForField } from "./fields";

// ---------------------------------------------------------------------------
// Field -> legacy entry
// ---------------------------------------------------------------------------

interface FlattenContext {
  /** Inches added to the field's top to place it within the unfolded template. */
  offsetTop: number;
  /** Whether the page this field lives on is printed upside-down (fold). */
  foldInvert: boolean;
}

export function fieldToEntry(
  field: BadgeField,
  ctx: FlattenContext = { offsetTop: 0, foldInvert: false },
): LegacyLayoutEntry {
  const kind = field.kind ?? kindForField(field.field);

  // Effective 180° rotation = user-applied inversion XOR page-fold inversion
  // (two 180° rotations cancel). The backend (badge_generator.py) renders
  // `inverted` as rotate(180deg) about the box CENTER, so top/left stays the
  // footprint top-left — NO coordinate shift. Only the panel offset is added.
  const inverted = Boolean(field.inverted) !== ctx.foldInvert;
  const top = field.top + ctx.offsetTop;
  const left = field.left;

  // qrCode / image: legacy emits only position (+ scale or size); `inverted` is
  // omitted unless actually inverted (keeps single-page output byte-identical to
  // legacy while still flipping folded-back panels — the backend honours it).
  if (kind === "qrCode") {
    const entry: LegacyLayoutEntry = {
      top,
      left,
      field: field.field,
      scale: field.scale ?? 1,
    };
    if (inverted) entry.inverted = true;
    return entry;
  }

  if (kind === "image") {
    const entry: LegacyLayoutEntry = {
      top,
      left,
      height: field.height,
      width: field.width,
      field: field.field,
      code: field.code,
    };
    if (inverted) entry.inverted = true;
    return entry;
  }

  if (kind === "tickets") {
    return {
      top,
      left,
      field: field.field,
      height: field.height,
      width: field.width,
      numRows: field.numRows,
      inverted,
    };
  }

  // text / sessionSchedule
  const fontSize = field.fontSize ?? BACKEND_REFERENCE_FONT_SIZE;
  const numLines =
    field.numLines ??
    (field.height != null ? Math.floor(inchToPx(field.height) / fontSize) : 1);

  const entry: LegacyLayoutEntry = {
    top,
    left,
    field: field.field,
    scale: fontSize / BACKEND_REFERENCE_FONT_SIZE,
    height: field.height,
    width: field.width,
    fontSize,
    numLines,
    textAlign: field.textAlign ?? "center",
    inverted,
  };
  if (field.customAttendeeField != null) {
    entry.custom_attendee_field = field.customAttendeeField;
  }
  if (isLiteralTextField(field.field)) {
    entry.text = field.text;
  }
  if (isUserFieldEditable(field.field)) {
    entry.userEditable = field.userEditable ?? true;
  }
  return entry;
}

// ---------------------------------------------------------------------------
// Document -> flat layout
// ---------------------------------------------------------------------------

/**
 * Default "prints upside-down" seed per panel, used when a page has no explicit
 * `inverted` override. Vertical stack, top→bottom:
 *  - single (2 panels): top = Front upright, bottom = Back folds up behind → inverted.
 *  - double (3 panels): Z-fold guess (middle inverted) — pending a real test print.
 * The per-page `inverted` override settles the actual physical fold.
 */
export function foldInvertForPage(fold: FoldType, pageIndex: number): boolean {
  if (fold === "single") return pageIndex === 1;
  if (fold === "double") return pageIndex === 1;
  return false;
}

export function flatten(doc: BadgeDocument): FlattenResult {
  const panelHeight = doc.panelSize.height;
  const layout: LegacyLayoutEntry[] = [];

  doc.pages.forEach((page, pageIndex) => {
    const ctx: FlattenContext = {
      offsetTop: pageIndex * panelHeight,
      foldInvert: page.inverted ?? foldInvertForPage(doc.fold, pageIndex),
    };
    for (const field of page.fields) {
      layout.push(fieldToEntry(field, ctx));
    }
  });

  return {
    layout,
    width: doc.panelSize.width,
    height: panelHeight * doc.pages.length,
  };
}

// ---------------------------------------------------------------------------
// Flat layout -> document (legacy load, single page)
// ---------------------------------------------------------------------------

/**
 * Recover a BadgeField from a legacy entry. Stored top/left is the footprint
 * top-left (no shift — matches the backend's rotate-about-center). Every field
 * lands on a single front page; legacy templates edit as one page and the first
 * save writes a rich document. (Optional later: heuristic page-region splitting.)
 */
export function entryToField(entry: LegacyLayoutEntry): BadgeField {
  const kind = kindForField(entry.field);
  const inverted = Boolean(entry.inverted);

  const base: BadgeField = {
    id: uuid(),
    field: entry.field,
    kind,
    top: entry.top,
    left: entry.left,
  };

  if (kind === "qrCode") {
    return { ...base, scale: entry.scale ?? 1, inverted };
  }
  if (kind === "image") {
    return {
      ...base,
      width: entry.width,
      height: entry.height,
      code: entry.code,
      inverted,
    };
  }
  if (kind === "tickets") {
    return {
      ...base,
      width: entry.width,
      height: entry.height,
      numRows: entry.numRows,
      inverted,
    };
  }

  // text / sessionSchedule
  return {
    ...base,
    width: entry.width,
    height: entry.height,
    fontSize: entry.fontSize,
    numLines: entry.numLines,
    textAlign: entry.textAlign,
    inverted,
    text: entry.text,
    customAttendeeField: entry.custom_attendee_field ?? null,
    userEditable: entry.userEditable,
  };
}

export interface InflateOptions {
  /** Full template size in INCHES (BadgeTemplate.width/height). */
  width: number;
  height: number;
  fold?: FoldType;
}

export function inflate(
  layout: LegacyLayoutEntry[],
  opts: InflateOptions,
): BadgeDocument {
  const fold = opts.fold ?? "none";
  const pageCount = PAGE_COUNT[fold];
  return {
    version: BADGE_DOCUMENT_VERSION,
    panelSize: { width: opts.width, height: opts.height / pageCount },
    fold,
    pages: [
      {
        id: uuid(),
        role: "front",
        fields: layout.map(entryToField),
      },
    ],
  };
}

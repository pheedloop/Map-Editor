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

/**
 * Effective 180° rotation = user-applied inversion XOR page-fold inversion
 * (two 180° rotations cancel out).
 */
const effectiveInverted = (field: BadgeField, ctx: FlattenContext): boolean =>
  Boolean(field.inverted) !== ctx.foldInvert;

export function fieldToEntry(
  field: BadgeField,
  ctx: FlattenContext = { offsetTop: 0, foldInvert: false },
): LegacyLayoutEntry {
  const kind = field.kind ?? kindForField(field.field);

  // qrCode and image have no inverted handling in the legacy serializers — they
  // emit only position (+ scale or size). Fold inversion is not represented for
  // them; QR scanning is orientation-tolerant so this matches legacy behaviour.
  if (kind === "qrCode") {
    return {
      top: field.top + ctx.offsetTop,
      left: field.left,
      field: field.field,
      scale: field.scale ?? 1,
    };
  }

  if (kind === "image") {
    return {
      top: field.top + ctx.offsetTop,
      left: field.left,
      height: field.height,
      width: field.width,
      field: field.field,
      code: field.code,
    };
  }

  // text / sessionSchedule / tickets all support inversion with the footprint
  // shift: when rotated 180° the stored top/left is the UNROTATED corner, so we
  // subtract the box height/width (in inches). Mirrors editorClasses.jsx:60-62.
  const inverted = effectiveInverted(field, ctx);
  let top = field.top + ctx.offsetTop;
  let left = field.left;
  if (inverted) {
    top -= field.height ?? 0;
    left -= field.width ?? 0;
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
 * Which panels print upside-down for a given fold.
 *
 * PHASE 1: returns false for every page — single-page parity only. The fold
 * orientation/offset for "single"/"double" must be calibrated against a real
 * folded print before being switched on (see plan Risks, phase 3). Kept as a
 * single hook so phase 3 only touches this function.
 */
export function foldInvertForPage(_fold: FoldType, _pageIndex: number): boolean {
  return false;
}

export function flatten(doc: BadgeDocument): FlattenResult {
  const panelHeight = doc.panelSize.height;
  const layout: LegacyLayoutEntry[] = [];

  doc.pages.forEach((page, pageIndex) => {
    const ctx: FlattenContext = {
      offsetTop: pageIndex * panelHeight,
      foldInvert: foldInvertForPage(doc.fold, pageIndex),
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
 * Recover an upright BadgeField from a legacy entry. PHASE 1: every field lands
 * on a single front page (no fold splitting). Phase 3 may add heuristic
 * page-region splitting; until then legacy templates edit as one page and the
 * first save writes a rich document.
 */
export function entryToField(entry: LegacyLayoutEntry): BadgeField {
  const kind = kindForField(entry.field);
  const inverted = Boolean(entry.inverted);

  // Reverse the footprint shift to get the upright top-left.
  let top = entry.top;
  let left = entry.left;
  if (inverted) {
    top += entry.height ?? 0;
    left += entry.width ?? 0;
  }

  const base: BadgeField = {
    id: uuid(),
    field: entry.field,
    kind,
    top,
    left,
  };

  if (kind === "qrCode") {
    return { ...base, top: entry.top, left: entry.left, scale: entry.scale ?? 1 };
  }
  if (kind === "image") {
    return {
      ...base,
      top: entry.top,
      left: entry.left,
      width: entry.width,
      height: entry.height,
      code: entry.code,
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

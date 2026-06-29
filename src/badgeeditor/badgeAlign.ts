import { DPI, type BadgeField } from "./model";
import { fieldSizePx } from "./useBadgeGuides";

// Alignment + distribution for badge fields. Mirrors the map editor's alignment
// util, but badge fields are flat (no groups) and positioned by their top-left
// in inches, so we work directly in inches. Each function takes the selected
// fields and returns the new top-left for the ones that move.

export type FieldMove = { id: string; top: number; left: number };

interface Box {
  field: BadgeField;
  left: number;
  top: number;
  right: number;
  bottom: number;
  w: number;
  h: number;
}

/** Field bounds in inches. */
function boxOf(field: BadgeField): Box {
  const size = fieldSizePx(field);
  const w = size.w / DPI;
  const h = size.h / DPI;
  return {
    field,
    left: field.left,
    top: field.top,
    right: field.left + w,
    bottom: field.top + h,
    w,
    h,
  };
}

const moveTo = (b: Box, left: number, top: number): FieldMove => ({
  id: b.field.id,
  left,
  top,
});

export function alignLeft(fields: BadgeField[]): FieldMove[] {
  const boxes = fields.map(boxOf);
  const target = Math.min(...boxes.map((b) => b.left));
  return boxes.map((b) => moveTo(b, target, b.top));
}

export function alignRight(fields: BadgeField[]): FieldMove[] {
  const boxes = fields.map(boxOf);
  const target = Math.max(...boxes.map((b) => b.right));
  return boxes.map((b) => moveTo(b, target - b.w, b.top));
}

export function alignTop(fields: BadgeField[]): FieldMove[] {
  const boxes = fields.map(boxOf);
  const target = Math.min(...boxes.map((b) => b.top));
  return boxes.map((b) => moveTo(b, b.left, target));
}

export function alignBottom(fields: BadgeField[]): FieldMove[] {
  const boxes = fields.map(boxOf);
  const target = Math.max(...boxes.map((b) => b.bottom));
  return boxes.map((b) => moveTo(b, b.left, target - b.h));
}

export function alignCenterH(fields: BadgeField[]): FieldMove[] {
  const boxes = fields.map(boxOf);
  const left = Math.min(...boxes.map((b) => b.left));
  const right = Math.max(...boxes.map((b) => b.right));
  const center = (left + right) / 2;
  return boxes.map((b) => moveTo(b, center - b.w / 2, b.top));
}

export function alignCenterV(fields: BadgeField[]): FieldMove[] {
  const boxes = fields.map(boxOf);
  const top = Math.min(...boxes.map((b) => b.top));
  const bottom = Math.max(...boxes.map((b) => b.bottom));
  const center = (top + bottom) / 2;
  return boxes.map((b) => moveTo(b, b.left, center - b.h / 2));
}

export function distributeH(fields: BadgeField[]): FieldMove[] {
  const boxes = fields.map(boxOf);
  if (boxes.length < 3) return [];
  boxes.sort((a, b) => a.left - b.left);
  const span = boxes[boxes.length - 1].right - boxes[0].left;
  const totalW = boxes.reduce((sum, b) => sum + b.w, 0);
  const gap = (span - totalW) / (boxes.length - 1);

  const moves: FieldMove[] = [];
  let cursor = boxes[0].left;
  for (const b of boxes) {
    moves.push(moveTo(b, cursor, b.top));
    cursor += b.w + gap;
  }
  return moves;
}

export function distributeV(fields: BadgeField[]): FieldMove[] {
  const boxes = fields.map(boxOf);
  if (boxes.length < 3) return [];
  boxes.sort((a, b) => a.top - b.top);
  const span = boxes[boxes.length - 1].bottom - boxes[0].top;
  const totalH = boxes.reduce((sum, b) => sum + b.h, 0);
  const gap = (span - totalH) / (boxes.length - 1);

  const moves: FieldMove[] = [];
  let cursor = boxes[0].top;
  for (const b of boxes) {
    moves.push(moveTo(b, b.left, cursor));
    cursor += b.h + gap;
  }
  return moves;
}

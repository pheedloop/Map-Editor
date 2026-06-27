import type { ElementType, ElementProperties } from "../../types";

// ---------------------------------------------------------------------------
// Placement categories
// ---------------------------------------------------------------------------
//
// A placement category describes one kind of records-backed object that can be
// dragged from the placement panel onto the canvas and linked to a backing
// record (placed/unplaced tracking, auto-arrange, unlinked detection).
//
// The map product defines three categories (booths, session locations, meeting
// rooms); the seatplanner defines one (tables). The editor core is agnostic —
// it iterates whatever categories it is given, so a product variant is just a
// different set of categories + features.

export interface PlacementCategory<T = unknown> {
  /** Stable section id, e.g. "booths" | "tables". */
  id: string;
  /** Element type created/linked for this category, e.g. "booth" | "table". */
  elementType: ElementType;
  /** ElementProperties key that stores the linked record id. */
  linkKey: keyof ElementProperties;
  /** Backing record pool. */
  records: T[];

  // Display
  title: string;
  iconColor: string;
  iconShape: "rect" | "oval";
  defaultShape: "rect" | "ellipse";

  // Record accessors
  getRecordId: (record: T) => string;
  getPrimaryLabel: (record: T) => string;
  /** Optional secondary label (e.g. "120 cap.") shown muted after the primary. */
  getSecondaryLabel?: (record: T) => string | null;
  /** Extra element properties to apply when a record is placed (e.g. capacity). */
  getExtraProps?: (record: T) => Partial<ElementProperties>;

  // Convert-to-object context menu entry
  convertLabel: string;
  convertColor: string;
}

/**
 * Helper that erases the record generic so heterogeneous categories can live in
 * one `PlacementCategory[]` without function-variance errors. Each category's
 * accessors only ever receive their own records at runtime.
 */
export function definePlacementCategory<T>(
  config: PlacementCategory<T>,
): PlacementCategory {
  return config as unknown as PlacementCategory;
}

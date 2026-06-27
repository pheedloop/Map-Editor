import { useMemo } from "react";
import type { FloorPlanData } from "../../types";
import type { PlacementCategory } from "../placement/types";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PlacedRecord<T = unknown> {
  record: T;
  isPlaced: boolean;
}

export interface RecordCounts {
  placed: number;
  unplaced: number;
}

/** Resolved placement state for a single category. */
export interface CategoryRecords<T = unknown> {
  category: PlacementCategory<T>;
  records: PlacedRecord<T>[];
  counts: RecordCounts;
  /** All record ids that exist in the pool — used to detect orphaned elements. */
  knownIds: Set<string>;
}

export type PlacementRecords = CategoryRecords[];

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePlacementRecords(
  data: FloorPlanData,
  categories: PlacementCategory[],
): PlacementRecords {
  return useMemo(() => {
    const elements = data.elements;

    return categories.map((category) => {
      // Ids currently referenced by any element via this category's link key.
      const placedIds = new Set(
        elements
          .map((el) => el.properties[category.linkKey])
          .filter((v): v is NonNullable<typeof v> => Boolean(v))
          .map((v) => String(v)),
      );

      const records: PlacedRecord[] = category.records.map((record) => ({
        record,
        isPlaced: placedIds.has(category.getRecordId(record)),
      }));

      const counts: RecordCounts = {
        placed: records.filter((r) => r.isPlaced).length,
        unplaced: records.filter((r) => !r.isPlaced).length,
      };

      const knownIds = new Set(
        category.records.map((r) => category.getRecordId(r)),
      );

      return { category, records, counts, knownIds };
    });
  }, [data.elements, categories]);
}

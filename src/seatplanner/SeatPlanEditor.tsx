import { useMemo } from "react";
import { MapEditor, definePlacementCategory } from "../editor";
import { seatPlanMap } from "../sample-data/seatplan-map";
import { seatPlanTables, type TableRecord } from "../sample-data/seatplan-tables";

/**
 * Seatplanner editor — the shared MapEditor configured for the seatplanner
 * product. One records-backed object type (tables); no pricing tiers; wayfinding
 * and scale calibration are not part of this product.
 */
export function SeatPlanEditor() {
  const placementCategories = useMemo(
    () => [
      definePlacementCategory<TableRecord>({
        id: "tables",
        elementType: "table",
        linkKey: "tableCode",
        records: seatPlanTables,
        title: "Tables",
        iconColor: "#14b8a6",
        iconShape: "oval",
        defaultShape: "ellipse",
        getRecordId: (r) => r.code,
        getPrimaryLabel: (r) => r.identifier,
        getSecondaryLabel: (r) => `${r.seatCount} seats`,
        getExtraProps: (r) => ({ capacity: r.seatCount }),
      }),
    ],
    [],
  );

  return (
    <MapEditor
      initialData={seatPlanMap}
      persist
      persistKey="seatplanner:floorplan"
      placementCategories={placementCategories}
      features={{ wayfinding: "hidden", scaleCalibration: "hidden" }}
      debug
    />
  );
}

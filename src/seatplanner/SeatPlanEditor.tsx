import { MapEditor } from "../editor";
import { seatPlanMap } from "../sample-data/seatplan-map";

/**
 * Seatplanner editor — the shared MapEditor configured for the seatplanner
 * product. No pricing tiers; wayfinding and scale calibration are not part of
 * this product. Tables (the records-backed object type) arrive in a later step;
 * for now only background image + drawing tools are available.
 */
export function SeatPlanEditor() {
  return (
    <MapEditor
      initialData={seatPlanMap}
      persist
      persistKey="seatplanner:floorplan"
      placementCategories={[]}
      features={{ objects: "hidden", wayfinding: "hidden", scaleCalibration: "hidden" }}
      debug
    />
  );
}

import { useMemo } from "react";
import { SeatPlanCanvas, occupancyColor } from "../seatviewer";
import { seatPlanMap } from "../sample-data/seatplan-map";
import { seatPlanState } from "../sample-data/seatplan-state";

/**
 * Early demo of the seat plan viewer in the seatplanner "Viewer" route. For now
 * it mounts SeatPlanCanvas with occupancy coloring from sample state; the full
 * interactive SeatPlanViewer (ticket panel + table popover) lands in a later step.
 */
export function SeatPlanViewerDemo() {
  const stateByCode = useMemo(
    () => Object.fromEntries(seatPlanState.map((t) => [t.tableCode, t])),
    [],
  );

  return (
    <div className="pl-map-editor flex h-full bg-gray-100">
      <SeatPlanCanvas
        data={seatPlanMap}
        getTableColor={(code) => {
          const t = stateByCode[code];
          return t ? occupancyColor(t) : undefined;
        }}
      />
    </div>
  );
}

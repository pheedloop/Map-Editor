import { OCCUPANCY_LEGEND } from "../logic";

/**
 * Key for the table occupancy colors, pinned to the bottom-right of the canvas.
 * Swatch colors match the table fills exactly (both come from logic.ts).
 */
export function OccupancyLegend() {
  return (
    <div className="absolute right-3 bottom-3 z-10 flex flex-col gap-1.5 bg-card/95 border border-gray-200 rounded-lg px-3 py-2.5 shadow-[0_4px_16px_rgba(38,59,90,0.1)] backdrop-blur-sm">
      <span className="text-[10px] tracking-wider uppercase text-gray-400 font-semibold">Availability</span>
      {OCCUPANCY_LEGEND.map((item) => (
        <span key={item.level} className="flex items-center gap-2 text-xs text-gray-500">
          <span
            className="size-2.5 rounded-sm border border-black/10 shrink-0"
            style={{ backgroundColor: item.color }}
          />
          {item.label}
        </span>
      ))}
    </div>
  );
}

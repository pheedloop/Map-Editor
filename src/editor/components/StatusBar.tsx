import { IconButton } from "./ui";
import type { Unit } from "../../types";

interface StatusBarProps {
  scale: number;
  onZoomReset: () => void;
  unit: Unit;
  isCalibrated: boolean;
  /** When false, hides the unit selector (e.g. products without scale). */
  showUnit?: boolean;
  onUnitChange: (unit: Unit) => void;
}

export function StatusBar({ scale, onZoomReset, unit, isCalibrated, showUnit = true, onUnitChange }: StatusBarProps) {
  return (
    <div className="relative z-20 flex items-center justify-between px-3 py-1.5 bg-white border-t border-gray-200 text-xs text-gray-500">
      <div className="flex items-center gap-2">
        {isCalibrated && showUnit && (
          <select
            value={unit}
            onChange={(e) => onUnitChange(e.target.value as Unit)}
            className="px-1.5 py-0.5 text-xs border border-gray-200 rounded bg-white cursor-pointer hover:border-gray-300"
            title="Map display unit"
          >
            <option value="ft">Feet</option>
            <option value="m">Meters</option>
          </select>
        )}
      </div>
      <IconButton
        size="sm"
        onClick={onZoomReset}
        className="px-2 w-auto text-xs text-gray-500"
        title="Click to reset zoom"
      >
        {Math.round(scale * 100)}%
      </IconButton>
    </div>
  );
}

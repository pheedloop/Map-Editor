import { useState } from "react";
import {
  Button,
  Dialog,
  NumberInput,
  SectionLabel,
} from "../editor/components/ui";
import {
  fmtUnit,
  fromUnit,
  unitLabel,
  unitMin,
  unitName,
  unitStep,
  type Unit,
} from "./units";
import {
  PAGE_COUNT,
  pageRoleForIndex,
  pageRoleLabel,
  type BadgePage,
  type FoldType,
  type SlotType,
} from "./model";
import { foldInvertForPage } from "./serialize";

const FOLD_OPTIONS: { value: FoldType; label: string }[] = [
  { value: "none", label: "No fold" },
  { value: "single", label: "Single fold" },
  { value: "double", label: "Double fold" },
];

const SLOT_OPTIONS: { value: SlotType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "two-circle", label: "Two circular" },
  { value: "three-rect", label: "Three rectangular" },
];

const DEFAULT_TEARAWAYS = 3;

/** Per-panel configuration edited in the dialog. */
export interface PanelConfig {
  inverted: boolean;
  tearaway: boolean;
  tearawayCount: number;
}

interface BadgeSetupDialogProps {
  fold: FoldType;
  panelSize: { width: number; height: number };
  pages: BadgePage[];
  slots: SlotType;
  /** Display/input unit. Panel sizes are stored in inches regardless. */
  unit: Unit;
  /** Change the editor's measurement unit (applies live). */
  onUnitChange: (unit: Unit) => void;
  onApply: (
    fold: FoldType,
    panelSize: { width: number; height: number },
    panels: PanelConfig[],
    slots: SlotType,
  ) => void;
  onClose: () => void;
}

function panelConfigFor(
  pages: BadgePage[],
  fold: FoldType,
  i: number,
): PanelConfig {
  return {
    inverted: pages[i]?.inverted ?? foldInvertForPage(fold, i),
    tearaway: pages[i]?.tearaway ?? false,
    tearawayCount: pages[i]?.tearawayCount ?? DEFAULT_TEARAWAYS,
  };
}

export function BadgeSetupDialog({
  fold,
  panelSize,
  pages,
  slots,
  unit,
  onUnitChange,
  onApply,
  onClose,
}: BadgeSetupDialogProps) {
  const [localFold, setLocalFold] = useState<FoldType>(fold);
  const [w, setW] = useState(panelSize.width);
  const [h, setH] = useState(panelSize.height);
  const [localSlots, setLocalSlots] = useState<SlotType>(slots);
  const [panels, setPanels] = useState<PanelConfig[]>(() =>
    Array.from({ length: PAGE_COUNT[fold] }, (_, i) =>
      panelConfigFor(pages, fold, i),
    ),
  );

  const count = PAGE_COUNT[localFold];

  const changeFold = (f: FoldType) => {
    setLocalFold(f);
    setPanels((prev) =>
      Array.from({ length: PAGE_COUNT[f] }, (_, i) =>
        i < prev.length
          ? prev[i]
          : {
              inverted: foldInvertForPage(f, i),
              tearaway: false,
              tearawayCount: DEFAULT_TEARAWAYS,
            },
      ),
    );
  };

  const setPanel = (i: number, patch: Partial<PanelConfig>) =>
    setPanels((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  return (
    <Dialog
      title="Badge Setup"
      onClose={onClose}
      width="400px"
      footer={
        <>
          <Button variant="outline" color="neutral" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="solid"
            color="primary"
            onClick={() => {
              onApply(localFold, { width: w, height: h }, panels, localSlots);
              onClose();
            }}
          >
            Apply
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1.5">
          <SectionLabel>Fold</SectionLabel>
          <div className="flex gap-2">
            {FOLD_OPTIONS.map((o) => (
              <Button
                key={o.value}
                variant="outline"
                color={localFold === o.value ? "primary" : "neutral"}
                active={localFold === o.value}
                className="flex-1"
                onClick={() => changeFold(o.value)}
              >
                {o.label}
              </Button>
            ))}
          </div>
          <span className="text-[11px] text-gray-400">
            {count} panel{count > 1 ? "s" : ""}, stacked top-to-bottom
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <SectionLabel>Units</SectionLabel>
          <div className="flex gap-2">
            {(["in", "cm"] as Unit[]).map((u) => (
              <Button
                key={u}
                variant="outline"
                color={unit === u ? "primary" : "neutral"}
                active={unit === u}
                className="flex-1"
                onClick={() => onUnitChange(u)}
              >
                {unitName[u]}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <DimField label="Panel width" value={w} unit={unit} onChange={setW} />
          <DimField
            label="Panel height"
            value={h}
            unit={unit}
            onChange={setH}
          />
        </div>

        <div className="text-xs text-gray-500">
          Prints as{" "}
          <span className="font-medium text-gray-700">
            {fmtUnit(w, unit)} × {fmtUnit(h * count, unit)} {unitLabel[unit]}
          </span>
          {count > 1 && " (unfolded)"}
        </div>

        <div className="flex flex-col gap-1.5">
          <SectionLabel>Lanyard slots</SectionLabel>
          <div className="flex gap-2">
            {SLOT_OPTIONS.map((o) => (
              <Button
                key={o.value}
                variant="outline"
                color={localSlots === o.value ? "primary" : "neutral"}
                active={localSlots === o.value}
                className="flex-1 text-[11px]"
                onClick={() => setLocalSlots(o.value)}
              >
                {o.label}
              </Button>
            ))}
          </div>
        </div>

        {count > 1 && (
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Panels</SectionLabel>
            <div className="flex flex-col gap-1.5">
              {panels.map((cfg, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-1.5 px-2.5 py-2 rounded border border-gray-200"
                >
                  <span className="text-xs font-medium text-gray-700">
                    {pageRoleLabel(pageRoleForIndex(count, i))}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={cfg.inverted}
                      onChange={(e) =>
                        setPanel(i, { inverted: e.target.checked })
                      }
                    />
                    Prints upside-down
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={cfg.tearaway}
                      onChange={(e) =>
                        setPanel(i, { tearaway: e.target.checked })
                      }
                    />
                    Tear-away (perforated stubs)
                  </label>
                  {cfg.tearaway && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 pl-5">
                      <span>Stubs</span>
                      <div className="w-20">
                        <NumberInput
                          value={cfg.tearawayCount}
                          onChange={(v) =>
                            setPanel(i, { tearawayCount: Math.max(1, v) })
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

/**
 * Fractional dimension input (NumberInput rounds to integers, so not usable
 * here). The stored `value` is always inches; the field displays and accepts
 * the current `unit` and converts back to inches on change.
 */
function DimField({
  label,
  value,
  unit,
  onChange,
}: {
  label: string;
  /** Value in inches. */
  value: number;
  unit: Unit;
  /** Reports the new value in inches. */
  onChange: (inches: number) => void;
}) {
  // Track the raw text so partial edits (e.g. "2.") aren't clobbered, and reset
  // it whenever the unit or stored value changes.
  const [text, setText] = useState(fmtUnit(value, unit, 3));
  const [editingUnit, setEditingUnit] = useState(unit);
  if (editingUnit !== unit) {
    setEditingUnit(unit);
    setText(fmtUnit(value, unit, 3));
  }
  return (
    <label className="flex-1 flex flex-col gap-1.5">
      <SectionLabel>
        {label} ({unitLabel[unit]})
      </SectionLabel>
      <input
        type="number"
        step={unitStep[unit]}
        min={unitMin[unit]}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (!Number.isNaN(n) && n > 0) onChange(fromUnit(n, unit));
        }}
        className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </label>
  );
}

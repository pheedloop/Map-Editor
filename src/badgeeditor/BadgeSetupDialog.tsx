import { useState } from "react";
import { Button, Dialog, SectionLabel } from "../editor/components/ui";
import {
  PAGE_COUNT,
  pageRoleForIndex,
  pageRoleLabel,
  type BadgePage,
  type FoldType,
} from "./model";
import { foldInvertForPage } from "./serialize";

const FOLD_OPTIONS: { value: FoldType; label: string }[] = [
  { value: "none", label: "No fold" },
  { value: "single", label: "Single fold" },
  { value: "double", label: "Double fold" },
];

interface BadgeSetupDialogProps {
  fold: FoldType;
  panelSize: { width: number; height: number };
  pages: BadgePage[];
  onApply: (
    fold: FoldType,
    panelSize: { width: number; height: number },
    perPageInverted: boolean[],
  ) => void;
  onClose: () => void;
}

/** Resolve a page's effective invert state (explicit override or fold default). */
function resolveInvert(pages: BadgePage[], fold: FoldType, i: number): boolean {
  return pages[i]?.inverted ?? foldInvertForPage(fold, i);
}

export function BadgeSetupDialog({
  fold,
  panelSize,
  pages,
  onApply,
  onClose,
}: BadgeSetupDialogProps) {
  const [localFold, setLocalFold] = useState<FoldType>(fold);
  const [w, setW] = useState(panelSize.width);
  const [h, setH] = useState(panelSize.height);
  const [inverts, setInverts] = useState<boolean[]>(() =>
    Array.from({ length: PAGE_COUNT[fold] }, (_, i) => resolveInvert(pages, fold, i)),
  );

  const count = PAGE_COUNT[localFold];

  const changeFold = (f: FoldType) => {
    setLocalFold(f);
    setInverts((prev) =>
      Array.from({ length: PAGE_COUNT[f] }, (_, i) =>
        // keep an existing override if the panel persists, else use the new default
        i < prev.length ? prev[i] : foldInvertForPage(f, i),
      ),
    );
  };

  const totalHeight = +(h * count).toFixed(4);

  return (
    <Dialog
      title="Badge Setup"
      onClose={onClose}
      width="380px"
      footer={
        <>
          <Button variant="outline" color="neutral" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="solid"
            color="primary"
            onClick={() => {
              onApply(localFold, { width: w, height: h }, inverts);
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
                color="neutral"
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

        <div className="flex gap-3">
          <InchField label="Panel width" value={w} onChange={setW} />
          <InchField label="Panel height" value={h} onChange={setH} />
        </div>

        <div className="text-xs text-gray-500">
          Prints as <span className="font-medium text-gray-700">{+w.toFixed(2)} × {totalHeight} in</span>
          {count > 1 && " (unfolded)"}
        </div>

        {count > 1 && (
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Panels</SectionLabel>
            <div className="flex flex-col gap-1">
              {Array.from({ length: count }).map((_, i) => (
                <label
                  key={i}
                  className="flex items-center justify-between gap-2 px-2 py-1.5 rounded border border-gray-200"
                >
                  <span className="text-xs text-gray-700">
                    {pageRoleLabel(pageRoleForIndex(count, i))}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={inverts[i] ?? false}
                      onChange={(e) =>
                        setInverts((prev) =>
                          prev.map((v, j) => (j === i ? e.target.checked : v)),
                        )
                      }
                    />
                    Prints upside-down
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>
    </Dialog>
  );
}

/** Fractional-inch input (NumberInput rounds to integers, so not usable here). */
function InchField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  return (
    <label className="flex-1 flex flex-col gap-1.5">
      <SectionLabel>{label} (in)</SectionLabel>
      <input
        type="number"
        step={0.05}
        min={0.5}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          const n = Number(e.target.value);
          if (!Number.isNaN(n) && n > 0) onChange(n);
        }}
        className="w-full px-2 py-1 text-xs border border-gray-200 rounded bg-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </label>
  );
}

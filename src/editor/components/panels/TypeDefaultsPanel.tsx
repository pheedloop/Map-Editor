import { useState } from "react";
import type { TypeStyles, ElementTypeDefaults } from "../../../types";
import { DEFAULT_TYPE_STYLES } from "../../../types";
import { SectionLabel, ColorSwatch, NumberInput, Slider } from "../ui";
import { LabelSection } from "./LabelSection";
import type { ElementProperties } from "../../../types";
import { PiCaretDown, PiCaretRight } from "react-icons/pi";

const TYPE_DISPLAY_NAMES: Record<string, string> = {
  booth: "Booth",
  session_area: "Session Location",
  meeting_room: "Meeting Room",
};

export function formatTypeDisplayName(key: string): string {
  if (TYPE_DISPLAY_NAMES[key]) return TYPE_DISPLAY_NAMES[key];
  return key
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function toElementProperties(defaults: ElementTypeDefaults): ElementProperties {
  return {
    color: defaults.color ?? "#94a3b8",
    zIndex: 1,
    labelColor: defaults.labelColor,
    labelFontSize: defaults.labelFontSize,
    labelBold: defaults.labelBold,
    labelItalic: defaults.labelItalic,
    labelUnderline: defaults.labelUnderline,
    labelBackground: defaults.labelBackground,
    labelVisible: defaults.labelVisible,
    labelPositionV: defaults.labelPositionV,
    labelPositionH: defaults.labelPositionH,
  };
}

interface TypeSectionProps {
  typeKey: string;
  defaults: ElementTypeDefaults;
  onChange: (updates: Partial<ElementTypeDefaults>) => void;
}

function TypeSection({ typeKey, defaults, onChange }: TypeSectionProps) {
  const [open, setOpen] = useState(false);
  const opacity = defaults.opacity ?? 1;

  return (
    <div className="border border-gray-200 rounded">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-50 transition-colors cursor-pointer"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-sm shrink-0 border border-gray-300"
            style={{ background: defaults.color ?? "#94a3b8" }}
          />
          <span className="text-xs font-medium text-gray-700">{formatTypeDisplayName(typeKey)}</span>
        </div>
        {open ? <PiCaretDown size={12} className="text-gray-400" /> : <PiCaretRight size={12} className="text-gray-400" />}
      </button>

      {open && (
        <div className="flex flex-col gap-3 px-3 pb-3 border-t border-gray-100 pt-3">
          <ColorSwatch
            label="Fill"
            value={defaults.color ?? "#94a3b8"}
            onChange={(c) => onChange({ color: c })}
          />
          <ColorSwatch
            label="Stroke"
            value={defaults.strokeColor ?? "#888888"}
            onChange={(c) => onChange({ strokeColor: c })}
          />
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Stroke Width</SectionLabel>
            <div className="w-20">
              <NumberInput
                value={defaults.strokeWidth ?? 1}
                onChange={(v) => onChange({ strokeWidth: Math.max(0, v) })}
              />
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5 flex-1">
              <SectionLabel>Default Width</SectionLabel>
              <NumberInput
                value={defaults.defaultWidth ?? 120}
                onChange={(v) => onChange({ defaultWidth: Math.max(1, v) })}
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1">
              <SectionLabel>Default Height</SectionLabel>
              <NumberInput
                value={defaults.defaultHeight ?? 80}
                onChange={(v) => onChange({ defaultHeight: Math.max(1, v) })}
              />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <SectionLabel>Opacity</SectionLabel>
              <span className="text-[11px] text-gray-400">{Math.round(opacity * 100)}%</span>
            </div>
            <Slider
              min={0}
              max={100}
              value={Math.round(opacity * 100)}
              onChange={(e) => onChange({ opacity: Number(e.target.value) / 100 })}
              className="w-full"
            />
          </div>
          <div className="border-t border-gray-100 pt-3">
            <LabelSection
              properties={toElementProperties(defaults)}
              onChange={(updates) => onChange(updates as Partial<ElementTypeDefaults>)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface TypeDefaultsPanelProps {
  typeStyles: TypeStyles;
  /** Restricts which type sections render (the active product's object types). */
  typeKeys?: string[];
  onUpdateTypeStyles: (key: string, updates: Partial<ElementTypeDefaults>) => void;
}

export function TypeDefaultsPanel({ typeStyles, typeKeys, onUpdateTypeStyles }: TypeDefaultsPanelProps) {
  const merged: TypeStyles = { ...DEFAULT_TYPE_STYLES, ...typeStyles };
  const keys = typeKeys ?? Object.keys(merged);

  return (
    <div className="flex flex-col gap-2">
      {keys.map((key) => (
        <TypeSection
          key={key}
          typeKey={key}
          defaults={merged[key] ?? {}}
          onChange={(updates) => onUpdateTypeStyles(key, updates)}
        />
      ))}
    </div>
  );
}

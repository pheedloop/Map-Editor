import {
  PiTextAlignLeft,
  PiTextAlignCenter,
  PiTextAlignRight,
  PiTextAlignJustify,
  PiTrash,
} from "react-icons/pi";
import {
  IconButton,
  Select,
  SectionLabel,
  FieldRow,
  TextInput,
} from "../editor/components/ui";
import { inchToPx, type BadgeField, type TextAlign } from "./model";
import { getFieldDef, isLiteralTextField, isUserFieldEditable } from "./fields";

const FONT_SIZES = [10, 12, 16, 18, 20, 24, 30, 36, 42];
const ROW_COUNTS = [1, 2, 3, 4, 5, 6];
const ALIGNMENTS: { value: TextAlign; icon: React.ReactNode }[] = [
  { value: "left", icon: <PiTextAlignLeft size={15} /> },
  { value: "center", icon: <PiTextAlignCenter size={15} /> },
  { value: "right", icon: <PiTextAlignRight size={15} /> },
  { value: "justify", icon: <PiTextAlignJustify size={15} /> },
];

const TOKENS = [
  "{{ first_name }}",
  "{{ last_name }}",
  "{{ organization }}",
  "{{ title }}",
  "{{ designations }}",
  "{{ pronouns }}",
  "{{ city }}",
  "{{ country }}",
  "{{ internal_code }}",
  "{{ dietary_restrictions }}",
];

interface PropertiesPanelProps {
  field: BadgeField | null;
  onChange: (patch: Partial<BadgeField>) => void;
  onDelete: () => void;
}

export function PropertiesPanel({
  field,
  onChange,
  onDelete,
}: PropertiesPanelProps) {
  if (!field) {
    return (
      <div className="w-48 shrink-0 border-l border-gray-200 bg-white flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6 text-center">
          <span className="text-xs text-gray-400">
            Select a field to edit its properties.
          </span>
        </div>
      </div>
    );
  }

  const label = getFieldDef(field.field)?.label ?? field.field;
  const isText = field.kind === "text" || field.kind === "sessionSchedule";

  const setFontSize = (fontSize: number) => {
    const numLines =
      field.height != null
        ? Math.max(1, Math.floor(inchToPx(field.height) / fontSize))
        : field.numLines;
    onChange({ fontSize, numLines });
  };

  return (
    <div className="w-52 shrink-0 border-l border-gray-200 bg-white flex flex-col">
      <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600 truncate">
          {label}
        </span>
        <IconButton size="sm" onClick={onDelete} title="Delete field">
          <PiTrash size={15} />
        </IconButton>
      </div>

      <div className="flex flex-col gap-4 p-3 overflow-y-auto flex-1">
        {isLiteralTextField(field.field) && (
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Text</SectionLabel>
            <TextInput
              value={field.text ?? ""}
              onChange={(e) => onChange({ text: e.target.value })}
            />
          </div>
        )}

        {isText && (
          <div className="flex flex-col gap-2">
            <FieldRow label="Size">
              <Select
                className="w-full"
                value={field.fontSize ?? 20}
                onChange={(e) => setFontSize(Number(e.target.value))}
              >
                {FONT_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </FieldRow>
            <FieldRow label="Align">
              <div className="flex gap-1">
                {ALIGNMENTS.map((a) => (
                  <IconButton
                    key={a.value}
                    size="sm"
                    active={(field.textAlign ?? "center") === a.value}
                    onClick={() => onChange({ textAlign: a.value })}
                    title={a.value}
                  >
                    {a.icon}
                  </IconButton>
                ))}
              </div>
            </FieldRow>
          </div>
        )}

        {field.kind === "tickets" && (
          <FieldRow label="Rows">
            <Select
              className="w-full"
              value={field.numRows ?? 3}
              onChange={(e) => onChange({ numRows: Number(e.target.value) })}
            >
              {ROW_COUNTS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </FieldRow>
        )}

        {(isText || field.kind === "tickets") && (
          <div className="flex flex-col gap-2">
            <Checkbox
              label="Invert (180°)"
              checked={Boolean(field.inverted)}
              onChange={(v) => onChange({ inverted: v })}
            />
            {isText && isUserFieldEditable(field.field) && (
              <Checkbox
                label="Attendee editable"
                checked={field.userEditable ?? true}
                onChange={(v) => onChange({ userEditable: v })}
              />
            )}
          </div>
        )}

        {isLiteralTextField(field.field) && (
          <div className="flex flex-col gap-1.5">
            <SectionLabel>Insert token</SectionLabel>
            <div className="flex flex-wrap gap-1">
              {TOKENS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    onChange({ text: field.text ? `${field.text} ${t}` : t })
                  }
                  className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 font-mono"
                >
                  {t.replace(/[{}]/g, "").trim()}
                </button>
              ))}
            </div>
          </div>
        )}

        {(field.kind === "qrCode" || field.kind === "image") && (
          <p className="text-xs text-gray-400">
            Drag to move; drag a corner to resize.
          </p>
        )}
      </div>
    </div>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="text-xs text-gray-600">{label}</span>
    </label>
  );
}

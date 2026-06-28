import { FIELD_DEFS } from "./fields";

interface FieldPaletteProps {
  onAdd: (fieldKey: string) => void;
}

/**
 * The field menu — one button per addable field. Mirrors NewBadgeDesigner's
 * field menu (image is excluded; it's added via the image gallery).
 */
export function FieldPalette({ onAdd }: FieldPaletteProps) {
  const fields = FIELD_DEFS.filter((d) => d.inPalette !== false);

  return (
    <div className="flex flex-col gap-1 p-3 overflow-y-auto">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
        Add field
      </h2>
      {fields.map((d) => (
        <button
          key={d.field}
          type="button"
          onClick={() => onAdd(d.field)}
          className="text-left text-sm px-2.5 py-1.5 rounded hover:bg-gray-100 text-gray-800"
        >
          {d.label}
        </button>
      ))}
    </div>
  );
}

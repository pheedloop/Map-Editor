import { useCallback, useEffect, useRef, useState } from "react";
import { useCanvasControls } from "../editor/hooks/useCanvasControls";
import { BadgeCanvas } from "./BadgeCanvas";
import { FieldPalette } from "./FieldPalette";
import { createField } from "./factory";
import { flatten } from "./serialize";
import { createSampleDocument } from "./sample";
import type { BadgeDocument, BadgeField, FlattenResult } from "./model";

export interface BadgeEditorProps {
  /** Initial document. Defaults to a sample card if omitted. */
  initialDocument?: BadgeDocument;
  /** Persist callback. Receives the rich document + the flattened legacy
   *  badge_layout and template dimensions the backend stores. */
  onSave?: (doc: BadgeDocument, flattened: FlattenResult) => void;
}

/**
 * Single-page badge editor (vertical slice): add / select / drag / resize text
 * and QR fields on one panel, and Save → flatten() to the legacy badge_layout.
 * Multi-page/fold, full field set, and the properties panel come in later units.
 */
export function BadgeEditor({ initialDocument, onSave }: BadgeEditorProps) {
  const [doc, setDoc] = useState<BadgeDocument>(
    () => initialDocument ?? createSampleDocument(),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [savedLayout, setSavedLayout] = useState<FlattenResult | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useCanvasControls(containerRef);

  // --- Mutations (single front page for the slice) ---

  const addField = useCallback((fieldKey: string) => {
    const field = createField(fieldKey);
    setDoc((d) => {
      const pages = d.pages.map((p, i) =>
        i === 0 ? { ...p, fields: [...p.fields, field] } : p,
      );
      return { ...d, pages };
    });
    setSelectedId(field.id);
  }, []);

  const updateField = useCallback((id: string, patch: Partial<BadgeField>) => {
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p, i) =>
        i === 0
          ? {
              ...p,
              fields: p.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
            }
          : p,
      ),
    }));
  }, []);

  const deleteField = useCallback((id: string) => {
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p, i) =>
        i === 0 ? { ...p, fields: p.fields.filter((f) => f.id !== id) } : p,
      ),
    }));
    setSelectedId((cur) => (cur === id ? null : cur));
  }, []);

  // Delete/Backspace removes the selected field.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteField(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, deleteField]);

  const handleSave = useCallback(() => {
    const flattened = flatten(doc);
    setSavedLayout(flattened);
    onSave?.(doc, flattened);
  }, [doc, onSave]);

  return (
    <div className="flex h-full w-full bg-gray-50 text-gray-900">
      {/* Palette */}
      <aside className="w-52 shrink-0 border-r border-gray-200 bg-white">
        <FieldPalette onAdd={addField} />
      </aside>

      {/* Canvas */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-200 bg-white">
          <span className="text-sm font-medium">Badge</span>
          <span className="text-xs text-gray-500">
            {doc.panelSize.width}" × {doc.panelSize.height}"
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={controls.zoomOut}
            className="px-2 py-1 text-sm rounded hover:bg-gray-100"
          >
            −
          </button>
          <span className="text-xs tabular-nums w-10 text-center">
            {Math.round(controls.scale * 100)}%
          </span>
          <button
            type="button"
            onClick={controls.zoomIn}
            className="px-2 py-1 text-sm rounded hover:bg-gray-100"
          >
            +
          </button>
          <button
            type="button"
            onClick={controls.zoomReset}
            className="px-2 py-1 text-xs rounded hover:bg-gray-100"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="ml-2 px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700"
          >
            Save
          </button>
        </div>

        <div ref={containerRef} className="flex-1 min-h-0 overflow-hidden">
          <BadgeCanvas
            page={doc.pages[0]}
            panelSize={doc.panelSize}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChangeField={updateField}
            scale={controls.scale}
            position={controls.position}
            stageSize={controls.stageSize}
            stageRef={controls.stageRef}
            onWheel={controls.handleWheel}
            onDragEnd={controls.handleDragEnd}
          />
        </div>
      </main>

      {/* Flattened output (slice: shows badge_layout compatibility live) */}
      {savedLayout && (
        <aside className="w-80 shrink-0 border-l border-gray-200 bg-white flex flex-col">
          <div className="px-3 py-2 border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
            badge_layout ({savedLayout.width}" × {savedLayout.height}")
          </div>
          <pre className="flex-1 overflow-auto text-[11px] leading-tight p-3 text-gray-700">
            {JSON.stringify(savedLayout.layout, null, 2)}
          </pre>
        </aside>
      )}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { useCanvasControls } from "../editor/hooks/useCanvasControls";
import { useHistory } from "../editor/hooks/useHistory";
import { StatusBar } from "../editor/components/StatusBar";
import type { MenuEntry } from "../editor/components/ui";
import { BadgeTopBar, modKey } from "./BadgeTopBar";
import { BadgeCanvas } from "./BadgeCanvas";
import { BadgeSidebar } from "./BadgeSidebar";
import { PropertiesPanel } from "./PropertiesPanel";
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
  /** Show the debug affordance (badge_layout JSON viewer). */
  debug?: boolean;
}

/** True when a keystroke is going to a form field — don't hijack shortcuts. */
function isEditableTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

/**
 * Single-page badge editor. Shares the map/seatplan editor chrome (TopBar,
 * ToolSidebar-style left panel, StatusBar, ui kit) so it feels like the same
 * tool. Add / select / drag / resize all field kinds, edit via the properties
 * panel, with undo/redo, alignment-guide snapping, and clipboard.
 * Save → flatten() to the legacy badge_layout. Multi-page/fold comes later.
 */
export function BadgeEditor({ initialDocument, onSave, debug }: BadgeEditorProps) {
  const [initial] = useState<BadgeDocument>(
    () => initialDocument ?? createSampleDocument(),
  );
  const {
    present: doc,
    set: setDoc,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<BadgeDocument>(initial);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showLayout, setShowLayout] = useState(false);
  const clipboard = useRef<BadgeField | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useCanvasControls(containerRef);

  const selectedField =
    doc.pages[0].fields.find((f) => f.id === selectedId) ?? null;
  const flattened = useMemo(() => flatten(doc), [doc]);

  // --- Mutations (single front page) ---

  const setName = useCallback(
    (name: string) => setDoc((d) => ({ ...d, name })),
    [setDoc],
  );

  const addField = useCallback(
    (fieldKey: string) => {
      const field = createField(fieldKey);
      setDoc((d) => ({
        ...d,
        pages: d.pages.map((p, i) =>
          i === 0 ? { ...p, fields: [...p.fields, field] } : p,
        ),
      }));
      setSelectedId(field.id);
    },
    [setDoc],
  );

  const updateField = useCallback(
    (id: string, patch: Partial<BadgeField>) => {
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
    },
    [setDoc],
  );

  const deleteField = useCallback(
    (id: string) => {
      setDoc((d) => ({
        ...d,
        pages: d.pages.map((p, i) =>
          i === 0 ? { ...p, fields: p.fields.filter((f) => f.id !== id) } : p,
        ),
      }));
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [setDoc],
  );

  const copySelected = useCallback(() => {
    if (selectedField) clipboard.current = { ...selectedField };
  }, [selectedField]);

  const pasteClipboard = useCallback(() => {
    const src = clipboard.current;
    if (!src) return;
    const field: BadgeField = {
      ...src,
      id: uuid(),
      top: src.top + 0.15,
      left: src.left + 0.15,
    };
    setDoc((d) => ({
      ...d,
      pages: d.pages.map((p, i) =>
        i === 0 ? { ...p, fields: [...p.fields, field] } : p,
      ),
    }));
    setSelectedId(field.id);
  }, [setDoc]);

  const handleSave = useCallback(() => {
    onSave?.(doc, flatten(doc));
  }, [doc, onSave]);

  // Keyboard: delete, undo/redo, copy/paste (ignored while typing in a form).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const mod = e.metaKey || e.ctrlKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        redo();
      } else if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        handleSave();
      } else if (mod && e.key.toLowerCase() === "c") {
        copySelected();
      } else if (mod && e.key.toLowerCase() === "v") {
        e.preventDefault();
        pasteClipboard();
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        e.preventDefault();
        deleteField(selectedId);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedId, deleteField, undo, redo, copySelected, pasteClipboard, handleSave]);

  // --- Menus ---

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.download = `${doc.name || "badge"}.json`;
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  };

  const fileMenu: MenuEntry[] = [
    ...(onSave
      ? [
          { label: "Save", shortcut: `${modKey}S`, onClick: handleSave },
          { type: "divider" as const },
        ]
      : []),
    { label: "Export as JSON", onClick: exportJson },
  ];

  const editMenu: MenuEntry[] = [
    { label: "Undo", shortcut: `${modKey}Z`, disabled: !canUndo, onClick: undo },
    { label: "Redo", shortcut: `${modKey}⇧Z`, disabled: !canRedo, onClick: redo },
    { type: "divider" },
    {
      label: "Copy",
      shortcut: `${modKey}C`,
      disabled: !selectedField,
      onClick: copySelected,
    },
    {
      label: "Paste",
      shortcut: `${modKey}V`,
      disabled: !clipboard.current,
      onClick: pasteClipboard,
    },
    {
      label: "Delete",
      shortcut: "⌫",
      disabled: !selectedId,
      onClick: () => selectedId && deleteField(selectedId),
    },
  ];

  return (
    <div className="pl-map-editor flex flex-col h-full overflow-hidden">
      <BadgeTopBar
        fileMenuItems={fileMenu}
        editMenuItems={editMenu}
        debug={debug}
        onDebugClick={() => setShowLayout((s) => !s)}
      />

      <div className="flex flex-1 overflow-hidden">
        <BadgeSidebar
          name={doc.name ?? "Untitled Badge"}
          onNameChange={setName}
          onAddField={addField}
        />

        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          <div
            ref={containerRef}
            className="flex-1 min-h-0 overflow-hidden bg-gray-100"
          >
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
          <StatusBar
            scale={controls.scale}
            onZoomReset={controls.zoomReset}
            unit="ft"
            isCalibrated={false}
            showUnit={false}
            onUnitChange={() => {}}
          />
        </div>

        {showLayout ? (
          <aside className="w-72 shrink-0 border-l border-gray-200 bg-white flex flex-col">
            <div className="px-3 py-2 border-b border-gray-200 text-xs font-medium text-gray-600">
              badge_layout · {flattened.width}" × {flattened.height}"
            </div>
            <pre className="flex-1 overflow-auto text-[11px] leading-tight p-3 text-gray-600">
              {JSON.stringify(flattened.layout, null, 2)}
            </pre>
          </aside>
        ) : (
          <PropertiesPanel
            field={selectedField}
            onChange={(patch) => selectedId && updateField(selectedId, patch)}
            onDelete={() => selectedId && deleteField(selectedId)}
          />
        )}
      </div>
    </div>
  );
}

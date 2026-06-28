import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { useCanvasControls } from "../editor/hooks/useCanvasControls";
import { useHistory } from "../editor/hooks/useHistory";
import { StatusBar } from "../editor/components/StatusBar";
import { Button, TabBar, type MenuEntry } from "../editor/components/ui";
import { BadgeTopBar, modKey } from "./BadgeTopBar";
import { BadgeCanvas } from "./BadgeCanvas";
import { BadgeSidebar } from "./BadgeSidebar";
import { BadgeSetupDialog } from "./BadgeSetupDialog";
import { PropertiesPanel } from "./PropertiesPanel";
import { createField } from "./factory";
import { flatten, foldInvertForPage } from "./serialize";
import { createSampleDocument } from "./sample";
import {
  PAGE_COUNT,
  pageRoleForIndex,
  pageRoleLabel,
  type BadgeDocument,
  type BadgeField,
  type FlattenResult,
  type FoldType,
} from "./model";

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
 * Badge editor. Shares the map/seatplan editor chrome (TopBar, ToolSidebar-style
 * left panel, OptionsBar strip, StatusBar, ui kit) so it feels like the same
 * tool. Add / select / drag / resize all field kinds, edit via the properties
 * panel, with undo/redo, alignment-guide snapping, and clipboard. Supports
 * multi-page folded badges (front/back/inside) that flatten to the legacy
 * badge_layout on Save.
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
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [showLayout, setShowLayout] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const clipboard = useRef<BadgeField | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useCanvasControls(containerRef);

  // Active page (clamped — fold changes can shrink the page count).
  const pageIndex = Math.min(activePageIndex, doc.pages.length - 1);
  const activePage = doc.pages[pageIndex];

  const selectedField =
    activePage.fields.find((f) => f.id === selectedId) ?? null;
  const flattened = useMemo(() => flatten(doc), [doc]);

  const selectPage = useCallback((i: number) => {
    setActivePageIndex(i);
    setSelectedId(null);
  }, []);

  // --- Mutations (target the active page) ---

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
          i === pageIndex ? { ...p, fields: [...p.fields, field] } : p,
        ),
      }));
      setSelectedId(field.id);
    },
    [setDoc, pageIndex],
  );

  const updateField = useCallback(
    (id: string, patch: Partial<BadgeField>) => {
      setDoc((d) => ({
        ...d,
        pages: d.pages.map((p, i) =>
          i === pageIndex
            ? {
                ...p,
                fields: p.fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
              }
            : p,
        ),
      }));
    },
    [setDoc, pageIndex],
  );

  const deleteField = useCallback(
    (id: string) => {
      setDoc((d) => ({
        ...d,
        pages: d.pages.map((p, i) =>
          i === pageIndex ? { ...p, fields: p.fields.filter((f) => f.id !== id) } : p,
        ),
      }));
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [setDoc, pageIndex],
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
        i === pageIndex ? { ...p, fields: [...p.fields, field] } : p,
      ),
    }));
    setSelectedId(field.id);
  }, [setDoc, pageIndex]);

  // Apply fold/panel-size changes: rebuild the pages array, preserving existing
  // pages' fields and applying the per-panel invert overrides from the dialog.
  const applySetup = useCallback(
    (
      fold: FoldType,
      panelSize: { width: number; height: number },
      inverts: boolean[],
    ) => {
      setDoc((d) => {
        const count = PAGE_COUNT[fold];
        const pages = Array.from({ length: count }, (_, i) => {
          const role = pageRoleForIndex(count, i);
          const inverted = inverts[i] ?? foldInvertForPage(fold, i);
          const existing = d.pages[i];
          return existing
            ? { ...existing, role, inverted }
            : { id: uuid(), role, fields: [], inverted };
        });
        return { ...d, fold, panelSize, pages };
      });
      setActivePageIndex((idx) => Math.min(idx, PAGE_COUNT[fold] - 1));
      setSelectedId(null);
    },
    [setDoc],
  );

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
    { label: "Badge Setup…", onClick: () => setShowSetup(true) },
    { type: "divider" },
    ...(onSave
      ? [
          { label: "Save", shortcut: `${modKey}S`, onClick: handleSave },
          { type: "divider" as const },
        ]
      : []),
    { label: "Export as JSON", onClick: exportJson },
  ];

  // Page tabs (front/back/inside) + per-page invert state.
  const pageInverts = doc.pages.map(
    (p, i) => p.inverted ?? foldInvertForPage(doc.fold, i),
  );
  const pageTabs = doc.pages.map((p, i) => ({
    id: String(i),
    label: `${pageRoleLabel(p.role)}${pageInverts[i] ? " ⤓" : ""}`,
  }));

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
          {/* OptionsBar strip: page tabs (folded badges) + Badge Setup */}
          <div className="flex items-center gap-3 px-3 h-[43px] bg-white border-b border-gray-200 shrink-0">
            {doc.pages.length > 1 && (
              <TabBar
                tabs={pageTabs}
                value={String(pageIndex)}
                onChange={(id) => selectPage(Number(id))}
                itemClassName="px-3 py-1.5 text-xs"
              />
            )}
            {pageInverts[pageIndex] && (
              <span className="text-[11px] text-amber-600" title="This panel prints upside-down">
                ⤓ prints upside-down
              </span>
            )}
            <div className="flex-1" />
            <Button
              variant="outline"
              color="neutral"
              size="sm"
              onClick={() => setShowSetup(true)}
            >
              Badge Setup…
            </Button>
          </div>

          <div
            ref={containerRef}
            className="flex-1 min-h-0 overflow-hidden bg-gray-100"
          >
            <BadgeCanvas
              page={activePage}
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

      {showSetup && (
        <BadgeSetupDialog
          fold={doc.fold}
          panelSize={doc.panelSize}
          pages={doc.pages}
          onApply={applySetup}
          onClose={() => setShowSetup(false)}
        />
      )}
    </div>
  );
}

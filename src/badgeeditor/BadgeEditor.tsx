import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { useCanvasControls } from "../editor/hooks/useCanvasControls";
import { useHistory } from "../editor/hooks/useHistory";
import {
  Button,
  IconButton,
  TabBar,
  type MenuEntry,
} from "../editor/components/ui";
import { BadgeTopBar, modKey } from "./BadgeTopBar";
import { BadgeCanvas } from "./BadgeCanvas";
import { BadgeSidebar } from "./BadgeSidebar";
import { BadgePreview } from "./BadgePreview";
import { BadgeSetupDialog, type PanelConfig } from "./BadgeSetupDialog";
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
  type SlotType,
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

/** Inches → compact string (trims trailing zeros): 4, 5.5, 2.85. */
const fmtIn = (n: number) => String(+n.toFixed(2));

/** True when a keystroke is going to a form field — don't hijack shortcuts. */
function isEditableTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/**
 * Badge editor. Shares the map/seatplan editor chrome (TopBar, ToolSidebar-style
 * left panel, OptionsBar strip, StatusBar, ui kit) so it feels like the same
 * tool. Add / select / drag / resize all field kinds, edit via the properties
 * panel, with undo/redo, alignment-guide snapping, and clipboard. Supports
 * multi-page folded badges (front/back/inside) that flatten to the legacy
 * badge_layout on Save.
 */
export function BadgeEditor({
  initialDocument,
  onSave,
  debug,
}: BadgeEditorProps) {
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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [showLayout, setShowLayout] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const clipboard = useRef<BadgeField[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useCanvasControls(containerRef);

  // Active page (clamped — fold changes can shrink the page count).
  const pageIndex = Math.min(activePageIndex, doc.pages.length - 1);
  const activePage = doc.pages[pageIndex];

  // Properties panel edits the field only when exactly one is selected.
  const selectedField =
    selectedIds.size === 1
      ? (activePage.fields.find((f) => selectedIds.has(f.id)) ?? null)
      : null;
  const flattened = useMemo(() => flatten(doc), [doc]);

  const selectPage = useCallback((i: number) => {
    setActivePageIndex(i);
    setSelectedIds(new Set());
  }, []);

  // --- Selection ---
  const selectField = useCallback((id: string, additive: boolean) => {
    setSelectedIds((prev) => {
      if (additive) {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }
      if (prev.has(id) && prev.size > 1) return prev; // keep group for drag
      return new Set([id]);
    });
  }, []);

  const marqueeSelect = useCallback((ids: string[], additive: boolean) => {
    setSelectedIds((prev) => {
      if (!additive) return new Set(ids);
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  // --- Mutations (target the active page) ---

  const setName = useCallback(
    (name: string) => setDoc((d) => ({ ...d, name })),
    [setDoc],
  );

  /** Replace the active page's fields via a transform. */
  const mutateActivePage = useCallback(
    (fn: (fields: BadgeField[]) => BadgeField[]) => {
      setDoc((d) => ({
        ...d,
        pages: d.pages.map((p, i) =>
          i === pageIndex ? { ...p, fields: fn(p.fields) } : p,
        ),
      }));
    },
    [setDoc, pageIndex],
  );

  const addField = useCallback(
    (fieldKey: string) => {
      const field = createField(fieldKey);
      mutateActivePage((fields) => [...fields, field]);
      setSelectedIds(new Set([field.id]));
    },
    [mutateActivePage],
  );

  const updateField = useCallback(
    (id: string, patch: Partial<BadgeField>) => {
      mutateActivePage((fields) =>
        fields.map((f) => (f.id === id ? { ...f, ...patch } : f)),
      );
    },
    [mutateActivePage],
  );

  /** Commit a (possibly multi-field) move in one history entry. */
  const moveMany = useCallback(
    (updates: { id: string; top: number; left: number }[]) => {
      const byId = new Map(updates.map((u) => [u.id, u]));
      mutateActivePage((fields) =>
        fields.map((f) => {
          const u = byId.get(f.id);
          return u ? { ...f, top: u.top, left: u.left } : f;
        }),
      );
    },
    [mutateActivePage],
  );

  const deleteSelected = useCallback(() => {
    if (selectedIds.size === 0) return;
    mutateActivePage((fields) => fields.filter((f) => !selectedIds.has(f.id)));
    setSelectedIds(new Set());
  }, [mutateActivePage, selectedIds]);

  const copySelected = useCallback(() => {
    const picked = activePage.fields.filter((f) => selectedIds.has(f.id));
    if (picked.length) clipboard.current = picked.map((f) => ({ ...f }));
  }, [activePage, selectedIds]);

  const pasteClipboard = useCallback(() => {
    if (!clipboard.current.length) return;
    const pasted = clipboard.current.map((src) => ({
      ...src,
      id: uuid(),
      top: src.top + 0.15,
      left: src.left + 0.15,
    }));
    mutateActivePage((fields) => [...fields, ...pasted]);
    setSelectedIds(new Set(pasted.map((f) => f.id)));
  }, [mutateActivePage]);

  // Apply fold/panel-size changes: rebuild the pages array, preserving existing
  // pages' fields and applying the per-panel invert overrides from the dialog.
  const applySetup = useCallback(
    (
      fold: FoldType,
      panelSize: { width: number; height: number },
      panelCfgs: PanelConfig[],
      slots: SlotType,
    ) => {
      setDoc((d) => {
        const count = PAGE_COUNT[fold];
        const pages = Array.from({ length: count }, (_, i) => {
          const role = pageRoleForIndex(count, i);
          const cfg = panelCfgs[i];
          const props = {
            role,
            inverted: cfg?.inverted ?? foldInvertForPage(fold, i),
            tearaway: cfg?.tearaway ?? false,
            tearawayCount: cfg?.tearawayCount ?? 3,
          };
          const existing = d.pages[i];
          return existing
            ? { ...existing, ...props }
            : { id: uuid(), fields: [], ...props };
        });
        return { ...d, fold, panelSize, slots, pages };
      });
      setActivePageIndex((idx) => Math.min(idx, PAGE_COUNT[fold] - 1));
      setSelectedIds(new Set());
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
      } else if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedIds.size
      ) {
        e.preventDefault();
        deleteSelected();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    selectedIds,
    deleteSelected,
    undo,
    redo,
    copySelected,
    pasteClipboard,
    handleSave,
  ]);

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

  // Fold edges in the EDITOR view. On the flat sheet panels stack top→bottom, so
  // a page's crease is its top edge (if a panel sits above) and/or bottom edge
  // (if one sits below). But pages are authored upright, and an inverted
  // (folded-back) page prints rotated 180° — which swaps its top/bottom — so its
  // crease shows on the OPPOSITE edge in the editor.
  const physFoldTop = pageIndex > 0;
  const physFoldBottom = pageIndex < doc.pages.length - 1;
  const activeInverted = pageInverts[pageIndex];
  const foldTop = activeInverted ? physFoldBottom : physFoldTop;
  const foldBottom = activeInverted ? physFoldTop : physFoldBottom;

  const editMenu: MenuEntry[] = [
    {
      label: "Undo",
      shortcut: `${modKey}Z`,
      disabled: !canUndo,
      onClick: undo,
    },
    {
      label: "Redo",
      shortcut: `${modKey}⇧Z`,
      disabled: !canRedo,
      onClick: redo,
    },
    { type: "divider" },
    {
      label: selectedIds.size > 1 ? `Copy (${selectedIds.size})` : "Copy",
      shortcut: `${modKey}C`,
      disabled: selectedIds.size === 0,
      onClick: copySelected,
    },
    {
      label: "Paste",
      shortcut: `${modKey}V`,
      disabled: clipboard.current.length === 0,
      onClick: pasteClipboard,
    },
    {
      label: selectedIds.size > 1 ? `Delete (${selectedIds.size})` : "Delete",
      shortcut: "⌫",
      disabled: selectedIds.size === 0,
      onClick: deleteSelected,
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
            {!previewMode && doc.pages.length > 1 && (
              <TabBar
                tabs={pageTabs}
                value={String(pageIndex)}
                onChange={(id) => selectPage(Number(id))}
                itemClassName="px-3 py-1.5 text-xs"
              />
            )}
            {!previewMode && pageInverts[pageIndex] && (
              <span
                className="text-[11px] text-amber-600"
                title="This panel prints upside-down"
              >
                ⤓ prints upside-down automatically
              </span>
            )}
            {previewMode && (
              <span className="text-xs text-gray-500">
                Full preview · as printed (read-only)
              </span>
            )}
            <div className="flex-1" />
            <Button
              variant={previewMode ? "solid" : "outline"}
              color="neutral"
              size="sm"
              onClick={() => setPreviewMode((p) => !p)}
            >
              {previewMode ? "Exit preview" : "Full preview"}
            </Button>
          </div>

          {previewMode ? (
            <div className="flex-1 min-h-0 overflow-hidden">
              <BadgePreview doc={doc} />
            </div>
          ) : (
            <div
              ref={containerRef}
              className="flex-1 min-h-0 overflow-hidden bg-gray-100"
            >
              <BadgeCanvas
                page={activePage}
                panelSize={doc.panelSize}
                slots={doc.slots ?? "none"}
                isFrontPage={pageIndex === 0}
                foldTop={foldTop}
                foldBottom={foldBottom}
                selectedIds={selectedIds}
                onFieldMouseDown={selectField}
                onClearSelection={clearSelection}
                onMarqueeSelect={marqueeSelect}
                onChangeField={updateField}
                onMoveMany={moveMany}
                scale={controls.scale}
                position={controls.position}
                stageSize={controls.stageSize}
                stageRef={controls.stageRef}
                onWheel={controls.handleWheel}
                onPositionChange={controls.setPosition}
              />
            </div>
          )}
          {/* Footer — page + overall badge size, and zoom (mirrors StatusBar) */}
          <div className="relative z-20 flex items-center justify-between px-3 py-1.5 bg-white border-t border-gray-200 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              <span>
                Page {fmtIn(doc.panelSize.width)} ×{" "}
                {fmtIn(doc.panelSize.height)}"
              </span>
              <span className="text-gray-300">·</span>
              <span>
                Badge {fmtIn(doc.panelSize.width)} ×{" "}
                {fmtIn(doc.panelSize.height * doc.pages.length)}"
              </span>
            </div>
            <IconButton
              size="sm"
              onClick={controls.zoomReset}
              className="px-2 w-auto text-xs text-gray-500"
              title="Click to reset zoom"
            >
              {Math.round(controls.scale * 100)}%
            </IconButton>
          </div>
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
        ) : previewMode ? null : selectedIds.size > 1 ? (
          <aside className="w-60 shrink-0 border-l border-gray-200 bg-white flex flex-col">
            <div className="px-3 py-2 border-b border-gray-200 flex items-center justify-between">
              <span className="text-xs font-medium text-gray-600">
                {selectedIds.size} fields selected
              </span>
              <Button
                variant="ghost"
                color="negative"
                size="sm"
                onClick={deleteSelected}
              >
                Delete
              </Button>
            </div>
            <p className="p-3 text-xs text-gray-400">
              Drag to move them together, or select a single field to edit its
              properties.
            </p>
          </aside>
        ) : (
          <PropertiesPanel
            field={selectedField}
            onChange={(patch) =>
              selectedField && updateField(selectedField.id, patch)
            }
            onDelete={deleteSelected}
          />
        )}
      </div>

      {showSetup && (
        <BadgeSetupDialog
          fold={doc.fold}
          panelSize={doc.panelSize}
          pages={doc.pages}
          slots={doc.slots ?? "none"}
          onApply={applySetup}
          onClose={() => setShowSetup(false)}
        />
      )}
    </div>
  );
}

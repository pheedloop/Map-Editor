import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  PiCursorFill,
  PiPaintBrush,
  PiEraser,
  PiSquare,
  PiPencilSimple,
  PiStorefront,
} from "react-icons/pi";
import type { ActiveTool, EditorMode, PathingTool } from "../../types";
import { TOOL_REGISTRY } from "../../tools/registry";
import { IconButton } from "../ui";
import { IconPicker } from "./IconPicker";
import { getIconEntry } from "../../utils/iconRegistry";
import type { PlacementRecords } from "../../hooks/usePlacementRecords";
import { PlacementPanel } from "./PlacementPanel";
import type { AutoArrangeRecord } from "./PlacementPanel";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ToolDef<T extends string> {
  id: T;
  label: string;
  shortcut?: string;
  icon: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Tool lists
// ---------------------------------------------------------------------------

const selectDef: ToolDef<ActiveTool> = {
  id: "select",
  label: "Select",
  shortcut: "V",
  icon: <PiCursorFill size={16} />,
};

const toolDefs: ToolDef<ActiveTool>[] = TOOL_REGISTRY.map((t) => ({
  id: t.id as ActiveTool,
  label: t.label,
  shortcut: t.shortcut,
  icon: t.icon,
}));

const pathingToolDefs: ToolDef<PathingTool>[] = [
  {
    id: "select",
    label: "Select",
    shortcut: "V",
    icon: <PiCursorFill size={16} />,
  },
  {
    id: "paintWalkable",
    label: "Paint Walkable",
    shortcut: "W",
    icon: <PiPaintBrush size={16} />,
  },
  {
    id: "paintImpassable",
    label: "Erase Impassable",
    shortcut: "E",
    icon: <PiEraser size={16} />,
  },
  {
    id: "rectFill",
    label: "Rectangle Fill",
    shortcut: "R",
    icon: <PiSquare size={16} />,
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Header row: map name (click to rename) + Design / Placement mode icon buttons.
 */
function SidebarHeader({
  mapName,
  onMapNameChange,
  editorMode,
  onEditorModeChange,
  isDirty,
}: {
  mapName: string;
  onMapNameChange: (name: string) => void;
  editorMode: EditorMode;
  onEditorModeChange: (mode: EditorMode) => void;
  isDirty?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(mapName);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) setDraft(mapName);
  }, [mapName, editing]);

  const commit = () => {
    const trimmed = draft.trim();
    if (trimmed) onMapNameChange(trimmed);
    else setDraft(mapName);
    setEditing(false);
  };

  return (
    <div className="px-3 py-3 border-b border-gray-100 flex items-center gap-2 min-w-0">
      {isDirty && (
        <span className="shrink-0 text-red-500 font-bold text-sm leading-none" title="Unsaved changes">*</span>
      )}
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") {
              setDraft(mapName);
              setEditing(false);
            }
          }}
          className="flex-1 text-base font-semibold text-gray-800 bg-white border border-primary-400 rounded px-1.5 py-0.5 outline-none focus:ring-1 focus:ring-primary-400"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setDraft(mapName);
            setEditing(true);
          }}
          className="flex-1 text-left text-base font-semibold text-gray-800 truncate hover:text-primary-600 transition-colors"
          title="Click to rename"
        >
          {mapName}
        </button>
      )}
      <IconButton
        size="sm"
        active={editorMode === "placement"}
        onClick={() => onEditorModeChange("placement")}
        title="Placement Mode"
      >
        <PiStorefront size={16} />
      </IconButton>
      <IconButton
        size="sm"
        active={editorMode === "design"}
        onClick={() => onEditorModeChange("design")}
        title="Design Mode"
      >
        <PiPencilSimple size={16} />
      </IconButton>
    </div>
  );
}

function ToolRow<T extends string>({
  tool,
  isActive,
  onClick,
}: {
  tool: ToolDef<T>;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-colors",
        isActive
          ? "bg-primary-600 text-white"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-800",
      ].join(" ")}
    >
      <span className="shrink-0 flex items-center w-4">{tool.icon}</span>
      <span className="flex-1 text-left">{tool.label}</span>
      {tool.shortcut && (
        <span
          className={[
            "text-xs font-mono",
            isActive ? "text-primary-200" : "text-gray-400",
          ].join(" ")}
        >
          {tool.shortcut}
        </span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface ToolSidebarProps {
  activeTool: ActiveTool;
  activeIconName: string | null;
  onToolChange: (tool: ActiveTool) => void;
  onIconSelect?: (iconId: string) => void;
  isPathingMode?: boolean;
  activePathingTool?: PathingTool;
  onPathingToolChange?: (tool: PathingTool) => void;
  editorMode: EditorMode;
  onEditorModeChange: (mode: EditorMode) => void;
  mapName: string;
  onMapNameChange: (name: string) => void;
  isDirty?: boolean;
  placementRecords: PlacementRecords;
  onAutoArrange: (type: "booth" | "session_area" | "meeting_room", records: AutoArrangeRecord[]) => void;
}

export function ToolSidebar({
  activeTool,
  activeIconName,
  onToolChange,
  onIconSelect,
  isPathingMode,
  activePathingTool,
  onPathingToolChange,
  editorMode,
  onEditorModeChange,
  mapName,
  onMapNameChange,
  isDirty,
  placementRecords,
  onAutoArrange,
}: ToolSidebarProps) {
  const iconRowRef = useRef<HTMLDivElement>(null);
  const showIconPicker = activeTool === "icon" && !!onIconSelect;

  // Pathing mode overrides the normal sidebar
  if (isPathingMode && onPathingToolChange && activePathingTool) {
    return (
      <div className="flex flex-col w-64 shrink-0 bg-white border-r border-gray-200 overflow-hidden">
        <div className="px-3 py-3 border-b border-gray-100">
          <div className="text-[10px] uppercase tracking-wider text-gray-400 leading-none mb-1">
            Pathing Layer
          </div>
          <div className="text-base font-semibold text-gray-800 truncate">
            {mapName}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-1 px-1">
          {pathingToolDefs.map((tool) => (
            <ToolRow
              key={tool.id}
              tool={tool}
              isActive={activePathingTool === tool.id}
              onClick={() => onPathingToolChange(tool.id)}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="flex flex-col w-64 shrink-0 bg-white border-r border-gray-200 overflow-hidden">
      {/* Map name + mode switcher */}
      <SidebarHeader
        mapName={mapName}
        onMapNameChange={onMapNameChange}
        editorMode={editorMode}
        onEditorModeChange={onEditorModeChange}
        isDirty={isDirty}
      />

      {/* Tab content */}
      {editorMode === "design" ? (
        <div className="flex-1 overflow-y-auto py-1 px-1">
          <ToolRow
            tool={selectDef}
            isActive={activeTool === "select"}
            onClick={() => onToolChange("select")}
          />
          {toolDefs.map((tool) => {
            const displayTool =
              tool.id === "icon" && activeIconName
                ? (() => {
                    const entry = getIconEntry(activeIconName);
                    if (!entry) return tool;
                    const ActiveIcon = entry.component;
                    return { ...tool, icon: <ActiveIcon size={16} /> };
                  })()
                : tool;

            return (
              <div key={tool.id} ref={tool.id === "icon" ? iconRowRef : null}>
                <ToolRow
                  tool={displayTool}
                  isActive={activeTool === tool.id}
                  onClick={() => onToolChange(tool.id)}
                />
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col">
          <PlacementPanel records={placementRecords} onAutoArrange={onAutoArrange} />
        </div>
      )}
    </div>
    {showIconPicker && iconRowRef.current && createPortal(
      <IconPicker
        anchorRect={iconRowRef.current.getBoundingClientRect()}
        selectedId={activeIconName}
        onSelect={(iconId) => onIconSelect!(iconId)}
        onClose={() => onToolChange("select")}
      />,
      document.body
    )}
    </>
  );
}

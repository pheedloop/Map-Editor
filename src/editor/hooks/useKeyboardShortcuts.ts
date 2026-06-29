import { useEffect } from "react";
import type { ActiveTool, PathingTool } from "../types";
import { TOOL_REGISTRY } from "../tools/registry";

// Build shortcut → tool id map from registry
const toolShortcuts = new Map<string, string>();
for (const tool of TOOL_REGISTRY) {
  if (tool.shortcut) {
    toolShortcuts.set(tool.shortcut.toLowerCase(), tool.id);
  }
}

interface KeyboardShortcutActions {
  setActiveTool: (tool: ActiveTool) => void;
  onDeselect: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDuplicate: () => void;
  onSelectAll: () => void;
  onUndo: () => void;
  onRedo: () => void;
  isPathingMode?: boolean;
  setPathingTool?: (tool: PathingTool) => void;
  /** Returns false for tools disabled/hidden by the usage tier. Defaults to allow-all. */
  isToolEnabled?: (toolId: string) => boolean;
}

export function useKeyboardShortcuts({
  setActiveTool,
  onDeselect,
  onDelete,
  onCopy,
  onPaste,
  onDuplicate,
  onSelectAll,
  onUndo,
  onRedo,
  isPathingMode,
  setPathingTool,
  isToolEnabled,
}: KeyboardShortcutActions) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      const mod = e.metaKey || e.ctrlKey;

      if (mod) {
        switch (e.key.toLowerCase()) {
          case "c":
            e.preventDefault();
            onCopy();
            return;
          case "v":
            e.preventDefault();
            onPaste();
            return;
          case "d":
            e.preventDefault();
            onDuplicate();
            return;
          case "a":
            e.preventDefault();
            onSelectAll();
            return;
          case "z":
            e.preventDefault();
            if (e.shiftKey) {
              onRedo();
            } else {
              onUndo();
            }
            return;
          case "y":
            e.preventDefault();
            onRedo();
            return;
        }
      }

      // Pathing mode shortcuts (take priority)
      if (isPathingMode && setPathingTool) {
        switch (e.key.toLowerCase()) {
          case "v":
            setPathingTool("select");
            return;
          case "w":
            setPathingTool("paintWalkable");
            return;
          case "e":
            setPathingTool("paintImpassable");
            return;
          case "r":
            setPathingTool("rectFill");
            return;
          case "escape":
            setPathingTool("select");
            return;
        }
      }

      const key = e.key.toLowerCase();

      // Hardcoded shortcuts: hand, select, escape, delete
      if (key === "h") {
        setActiveTool("hand");
        return;
      }
      if (key === "v") {
        setActiveTool("select");
        return;
      }
      if (key === "escape") {
        onDeselect();
        setActiveTool("select");
        return;
      }
      if (key === "delete" || key === "backspace") {
        onDelete();
        return;
      }

      // Registry-derived shortcuts
      const toolId = toolShortcuts.get(key);
      if (toolId && (!isToolEnabled || isToolEnabled(toolId))) {
        setActiveTool(toolId as ActiveTool);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setActiveTool, onDeselect, onDelete, onCopy, onPaste, onDuplicate, onSelectAll, onUndo, onRedo, isPathingMode, setPathingTool, isToolEnabled]);
}

import { useRef, useState, useCallback, useMemo, useEffect } from "react";
import type { ActiveTool, EditorMode, PathingTool } from "./types";
import { usePlacementRecords } from "./hooks/usePlacementRecords";
import {
  PLACEMENT_DRAG_TYPE,
  PLACEMENT_SHAPE_ELLIPSE_TYPE,
} from "./components/panels/PlacementPanel";
import type {
  PlacementRecordRef,
  AutoArrangeRecord,
} from "./components/panels/PlacementPanel";
import { getElementBounds } from "./utils/bounds";
import {
  alignLeft,
  alignRight,
  alignTop,
  alignBottom,
  alignCenterH,
  alignCenterV,
  distributeH,
  distributeV,
  arrangeAsGrid,
} from "./utils/alignment";
import type { DrawingDefaults } from "./components/panels/OptionsBar";
import type { ToolContext } from "./tools/types";
import { TOOL_MAP } from "./tools/registry";
import { useCanvasControls } from "./hooks/useCanvasControls";
import { useEditorState, DEFAULT_PERSIST_KEY } from "./hooks/useEditorState";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useClipboard } from "./hooks/useClipboard";
import { usePathingTool } from "./hooks/usePathingTool";
import { useCalibration } from "./hooks/useCalibration";
import { Canvas } from "./components/canvas/Canvas";
import { ToolSidebar } from "./components/panels/ToolSidebar";
import { TopBar } from "./components/TopBar";
import { OptionsBar } from "./components/panels/OptionsBar";
import { PathingOptionsBar } from "./components/panels/PathingOptionsBar";
import { StatusBar } from "./components/StatusBar";
import { PropertiesPanel } from "./components/panels/PropertiesPanel";
import { getToolUIConfig } from "./tools/registry";
import {
  ContextMenu,
  type ContextMenuItem,
} from "./components/canvas/ContextMenu";
import { modKey } from "./components/TopBar";
import { MapDebugDialog } from "./components/debug";
import { BackgroundImageDialog } from "./components/panels/BackgroundImageDialog";
import { GridSettingsDialog } from "./components/panels/GridSettingsDialog";
import { HelpDialog } from "./components/panels/HelpDialog";
import { CanvasResizeDialog } from "./components/panels/CanvasResizeDialog";
import { CalibrationDialog } from "./components/panels/CalibrationDialog";
import { TypeDefaultsDialog } from "./components/panels/TypeDefaultsDialog";
import { LegendDialog } from "./components/panels/LegendDialog";
import { ArrangeGridDialog } from "./components/panels/ArrangeGridDialog";
import { LegendCanvasOverlay } from "./components/canvas/LegendCanvasOverlay";
import { LayerPanel } from "./components/panels/LayerPanel";
import { Rulers } from "./components/Rulers";
import type {
  FloorPlanData,
  FloorPlanElement,
  ElementProperties,
  Geometry,
  LayerId,
  LayerDefinition,
} from "../types";
import type { PlacementCategory } from "./placement/types";
import {
  DEFAULT_LAYERS,
  ELEMENT_TYPE_TO_LAYER,
  DEFAULT_TYPE_STYLES,
} from "../types";
import { resolveFeatures } from "../tiers";
import type { Tier, FeatureKey, FeatureOverride } from "../tiers";

const INITIAL_DEFAULTS: DrawingDefaults = {
  fill: "#94a3b8",
  stroke: "#888888",
  strokeWidth: 1,
};

interface MapEditorProps {
  initialData: FloorPlanData;
  /** Records-backed object categories available for placement (booths, tables, …). */
  placementCategories?: PlacementCategory[];
  onSave?: (data: FloorPlanData) => Promise<void>;
  onDirtyChange?: (isDirty: boolean) => void;
  onUploadBackgroundImage?: (file: File) => Promise<{
    url: string;
    width: number | null;
    height: number | null;
  }>;
  onRemoveBackgroundImage?: () => Promise<void>;
  onEditProperties?: () => void;
  name?: string;
  onNameChange?: (name: string) => void;
  debug?: boolean;
  persist?: boolean;
  /** localStorage key for persistence; set per-product to avoid collisions. */
  persistKey?: string;
  /** Usage-tier preset controlling which features are enabled. Defaults to "premium". */
  tier?: Tier;
  /** Per-feature overrides applied on top of the tier preset. */
  features?: Partial<Record<FeatureKey, FeatureOverride>>;
}

export function MapEditor({
  initialData,
  placementCategories = [],
  onSave,
  onDirtyChange,
  onUploadBackgroundImage,
  onRemoveBackgroundImage,
  onEditProperties,
  name: controlledName,
  onNameChange,
  debug: debugProp,
  persist,
  persistKey,
  tier,
  features,
}: MapEditorProps) {
  const debug = debugProp || import.meta.env.DEV;
  const storageKey = persistKey ?? DEFAULT_PERSIST_KEY;

  // Resolve usage-tier capabilities once. Tri-state per feature:
  // "enabled" | "locked" (disabled + trophy) | "hidden" (not rendered).
  const featureMap = useMemo(() => resolveFeatures(tier, features), [tier, features]);

  const {
    data,
    addElement,
    addElements,
    updateElement,
    updateProperties,
    previewProperties,
    batchUpdateProperties,
    deleteElement,
    deleteElements,
    moveElements,
    batchUpdateGeometry,
    createGroup,
    dissolveGroup,
    updateElementType,
    setMapName,
    updateLegend,
    updateTypeStyles,
    setBackgroundImage,
    setBackgroundColor,
    reorderElement,
    updateDimensions,
    initWalkableGrid,
    setWalkableCells,
    setWalkableCellRange,
    clearWalkableGrid,
    setWalkableGridResolution,
    setWalkableGrid,
    setCalibration,
    setDisplayUnit,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorState(initialData, { persist, persistKey });
  // Layer state (editor-only, not persisted in FloorPlanData)
  const [layers, setLayers] = useState<LayerDefinition[]>(() =>
    DEFAULT_LAYERS.map((l) => ({ ...l })),
  );
  const [activeLayerId, _setActiveLayerId] = useState<LayerId>("content");
  const [activeTool, setActiveTool] = useState<ActiveTool>("select");
  const [editorMode, setEditorMode] = useState<EditorMode>("design");
  const placementRecords = usePlacementRecords(data, placementCategories);

  // --- Save state ---
  // cleanDataRef holds the data reference at the last save (or initial load).
  // Comparing by reference works because useHistory returns the exact same object
  // until a new action is dispatched, so this is safe and avoids deep equality checks.
  const cleanDataRef = useRef(data);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setIsDirty(data !== cleanDataRef.current);
  }, [data]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const handleSaveRef = useRef<(() => Promise<void>) | undefined>(undefined);
  const handleSave = useCallback(async () => {
    if (!onSave || isSaving) return;
    setIsSaving(true);
    try {
      await onSave(data);
      cleanDataRef.current = data;
      setIsDirty(false);
    } finally {
      setIsSaving(false);
    }
  }, [onSave, isSaving, data]);
  handleSaveRef.current = handleSave;

  useEffect(() => {
    if (!onSave) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSaveRef.current?.();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onSave]);

  // Index categories by their element type for O(1) lookup during unlinked
  // detection and placement drops.
  const categoryByElementType = useMemo(() => {
    const map = new Map<string, (typeof placementRecords)[number]>();
    for (const group of placementRecords) {
      map.set(group.category.elementType, group);
    }
    return map;
  }, [placementRecords]);

  const unlinkedElementIds = useMemo(() => {
    const ids = new Set<string>();
    for (const el of data.elements) {
      const group = categoryByElementType.get(el.type);
      if (!group) continue;
      const linked = el.properties[group.category.linkKey];
      if (!linked || !group.knownIds.has(String(linked))) ids.add(el.id);
    }
    return ids;
  }, [data.elements, categoryByElementType]);
  const [activePathingTool, setActivePathingTool] =
    useState<PathingTool>("select");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [defaults, setDefaults] = useState<DrawingDefaults>(INITIAL_DEFAULTS);
  const [showMapDebug, setShowMapDebug] = useState(false);
  const [showBgDialog, setShowBgDialog] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [activeIconName, setActiveIconName] = useState<string | null>(null);

  const setActiveLayerId = useCallback(
    (id: LayerId) => {
      // Wayfinding (pathing layer) is gated by the usage tier.
      if (id === "pathing" && featureMap.wayfinding !== "enabled") return;
      _setActiveLayerId(id);
      setSelectedIds(new Set());
      if (id === "pathing") {
        initWalkableGrid();
        setActivePathingTool("select");
      }
    },
    [initWalkableGrid, featureMap.wayfinding],
  );

  // Placement mode (objects) is gated by the usage tier.
  const handleEditorModeChange = useCallback(
    (mode: EditorMode) => {
      if (mode === "placement" && featureMap.objects !== "enabled") return;
      setEditorMode(mode);
    },
    [featureMap.objects],
  );

  const toggleLayerVisibility = useCallback((id: LayerId) => {
    setLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    );
  }, []);
  const [gridSettings, setGridSettings] = useState({
    showGrid: true,
    gridSpacing: 20,
    snapToGrid: true,
    gridColor: "#d1d5db",
    gridOpacity: 0.5,
  });
  const [snapToObjects, setSnapToObjects] = useState(true);
  const [showTransformControls, setShowTransformControls] = useState(true);
  const [overlappingElementIds, setOverlappingElementIds] = useState<
    Set<string>
  >(new Set());

  useEffect(() => {
    const contentEls = data.elements.filter(
      (el) => (el.layer ?? ELEMENT_TYPE_TO_LAYER[el.type]) === "content",
    );
    const ids = new Set<string>();
    for (let i = 0; i < contentEls.length; i++) {
      for (let j = i + 1; j < contentEls.length; j++) {
        const a = getElementBounds(contentEls[i]);
        const b = getElementBounds(contentEls[j]);
        if (
          a.left < b.right &&
          a.right > b.left &&
          a.top < b.bottom &&
          a.bottom > b.top
        ) {
          ids.add(contentEls[i].id);
          ids.add(contentEls[j].id);
        }
      }
    }
    setOverlappingElementIds(ids);
  }, [data.elements]);
  const [walkableGridOpacity, setWalkableGridOpacity] = useState(0.3);
  const [showRulers, setShowRulers] = useState(false);
  const [showGridDialog, setShowGridDialog] = useState(false);
  const [showResizeDialog, setShowResizeDialog] = useState(false);
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [showTypeDefaultsDialog, setShowTypeDefaultsDialog] = useState(false);
  const [showLegendDialog, setShowLegendDialog] = useState(false);
  const [showArrangeGridDialog, setShowArrangeGridDialog] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    elementId: string;
    x: number;
    y: number;
  } | null>(null);

  // Drag-to-place state — shape is tracked separately to avoid re-renders on every mousemove
  const [dragOverCanvas, setDragOverCanvas] = useState<{
    shape: "rect" | "ellipse";
  } | null>(null);
  const ghostDivRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    stageRef,
    scale,
    setScale,
    position,
    setPosition,
    stageSize,
    handleWheel,
    handleDragEnd,
    zoomReset,
  } = useCanvasControls(containerRef);

  // Derived selection helpers
  const selectedElements = useMemo(
    () => data.elements.filter((el) => selectedIds.has(el.id)),
    [data.elements, selectedIds],
  );
  const selectedElement =
    selectedElements.length === 1 ? selectedElements[0] : null;
  const hasSelection = selectedIds.size > 0;
  const isMultiSelect = selectedIds.size > 1;

  // Selection helpers
  const selectOne = useCallback((id: string) => {
    setSelectedIds(new Set([id]));
  }, []);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(
      new Set(
        data.elements
          .filter(
            (el) =>
              (el.layer ?? ELEMENT_TYPE_TO_LAYER[el.type]) === activeLayerId,
          )
          .map((el) => el.id),
      ),
    );
  }, [data.elements, activeLayerId]);

  const selectMany = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  const getGroupMembers = useCallback(
    (groupId: string) =>
      data.elements.filter((el) => el.properties.groupId === groupId),
    [data.elements],
  );

  const handleLocateOverlapping = useCallback(() => {
    if (overlappingElementIds.size === 0) return;
    const els = data.elements.filter((el) => overlappingElementIds.has(el.id));
    selectMany(els.map((el) => el.id));

    // Compute bounding box of all overlapping elements
    let left = Infinity,
      right = -Infinity,
      top = Infinity,
      bottom = -Infinity;
    for (const el of els) {
      const b = getElementBounds(el);
      if (b.left < left) left = b.left;
      if (b.right > right) right = b.right;
      if (b.top < top) top = b.top;
      if (b.bottom > bottom) bottom = b.bottom;
    }

    const padding = 80;
    const newScale = Math.min(
      (stageSize.width - padding * 2) / (right - left),
      (stageSize.height - padding * 2) / (bottom - top),
      5,
    );
    setScale(newScale);
    setPosition({
      x: stageSize.width / 2 - ((left + right) / 2) * newScale,
      y: stageSize.height / 2 - ((top + bottom) / 2) * newScale,
    });
  }, [
    overlappingElementIds,
    data.elements,
    selectMany,
    stageSize,
    setScale,
    setPosition,
  ]);

  // Clipboard
  const { copy, paste, hasBuffer } = useClipboard();

  // Pathing tool
  const isPathingMode = activeLayerId === "pathing";
  const pathingTool = usePathingTool({
    stageRef,
    position,
    scale,
    grid: data.walkableLayer,
    activePathingTool,
    onPaintStroke: setWalkableCells,
    onRectFill: setWalkableCellRange,
  });

  // Scale calibration
  const calibration = useCalibration({
    stageRef,
    position,
    scale,
    isActive: isCalibrating,
    onComplete: (cal) => {
      setCalibration(cal);
      setIsCalibrating(false);
    },
  });

  const handleStartCalibration = useCallback(() => {
    setIsCalibrating(true);
    calibration.start();
  }, [calibration]);

  const handleCancelCalibration = useCallback(() => {
    calibration.handleCancel();
    setIsCalibrating(false);
  }, [calibration]);

  // Escape key cancels calibration mode
  useEffect(() => {
    if (!isCalibrating) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancelCalibration();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCalibrating, handleCancelCalibration]);

  const handleCopy = useCallback(() => {
    if (selectedElements.length > 0) copy(selectedElements);
  }, [selectedElements, copy]);

  const handlePaste = useCallback(() => {
    const newElements = paste();
    if (newElements.length > 0) {
      addElements(newElements);
      setSelectedIds(new Set(newElements.map((el) => el.id)));
    }
  }, [paste, addElements]);

  const handleDuplicate = useCallback(() => {
    if (selectedElements.length > 0) {
      copy(selectedElements);
      const newElements = paste();
      if (newElements.length > 0) {
        addElements(newElements);
        setSelectedIds(new Set(newElements.map((el) => el.id)));
      }
    }
  }, [selectedElements, copy, paste, addElements]);

  const handleDeselect = useCallback(() => {
    if (activeGroupId) {
      setActiveGroupId(null);
      return;
    }
    selectNone();
  }, [activeGroupId, selectNone]);

  const handleDelete = useCallback(() => {
    if (hasSelection) {
      deleteElements(selectedIds);
      selectNone();
    }
  }, [hasSelection, selectedIds, deleteElements, selectNone]);

  useKeyboardShortcuts({
    setActiveTool,
    onDeselect: handleDeselect,
    onDelete: handleDelete,
    onCopy: handleCopy,
    onPaste: handlePaste,
    onDuplicate: handleDuplicate,
    onSelectAll: selectAll,
    onUndo: undo,
    onRedo: redo,
    isPathingMode,
    setPathingTool: setActivePathingTool,
    // All registry tools are drawing tools, gated by the drawingTools feature.
    isToolEnabled: () => featureMap.drawingTools === "enabled",
  });

  // Options bar: show selected element's colors or drawing defaults
  const activeDefaults: DrawingDefaults = selectedElement
    ? {
        fill: selectedElement.properties.color,
        stroke:
          selectedElement.geometry.shape === "line"
            ? selectedElement.properties.color
            : selectedElement.properties.strokeColor || "#888888",
        strokeWidth:
          selectedElement.properties.strokeWidth ??
          (selectedElement.geometry.shape === "line" ? 2 : 1),
      }
    : isMultiSelect && selectedElements.length > 0
      ? {
          fill: selectedElements[0].properties.color,
          stroke:
            selectedElements[0].geometry.shape === "line"
              ? selectedElements[0].properties.color
              : selectedElements[0].properties.strokeColor || "#888888",
          strokeWidth: selectedElements[0].properties.strokeWidth ?? 1,
        }
      : defaults;

  // Group action state for options bar
  const optionsBarGroupId = (() => {
    if (selectedIds.size < 2 || activeGroupId) return null;
    const first = data.elements.find((el) => el.id === [...selectedIds][0]);
    const gid = first?.properties.groupId;
    if (!gid) return null;
    return [...selectedIds].every(
      (id) =>
        data.elements.find((el) => el.id === id)?.properties.groupId === gid,
    )
      ? gid
      : null;
  })();
  const canGroupSelection =
    isMultiSelect &&
    !optionsBarGroupId &&
    [...selectedIds].every(
      (id) => !data.elements.find((el) => el.id === id)?.properties.groupId,
    );

  // When editing inside a group, strip groupId so each member is its own alignment unit
  const elementsForAlignment = useMemo(
    () =>
      activeGroupId
        ? selectedElements.map((el) => ({
            ...el,
            properties: { ...el.properties, groupId: undefined },
          }))
        : selectedElements,
    [activeGroupId, selectedElements],
  );

  // Number of independent alignment units in the selection (solo elements + distinct groups)
  const alignmentUnitCount = useMemo(() => {
    if (activeGroupId) return selectedElements.length;
    const groupIds = new Set<string>();
    let solo = 0;
    for (const el of selectedElements) {
      if (el.properties.groupId) groupIds.add(el.properties.groupId);
      else solo++;
    }
    return solo + groupIds.size;
  }, [activeGroupId, selectedElements]);

  const handleDefaultsChange = useCallback(
    (updates: Partial<DrawingDefaults>) => {
      setDefaults((prev) => ({ ...prev, ...updates }));

      // Update all selected elements
      for (const id of selectedIds) {
        const el = data.elements.find((e) => e.id === id);
        if (!el) continue;
        const isLine = el.geometry.shape === "line";
        if (updates.fill !== undefined) {
          updateProperties(id, { color: updates.fill });
        }
        if (updates.stroke !== undefined) {
          if (isLine) {
            updateProperties(id, { color: updates.stroke });
          } else {
            updateProperties(id, { strokeColor: updates.stroke });
          }
        }
        if (updates.strokeWidth !== undefined) {
          updateProperties(id, { strokeWidth: updates.strokeWidth });
        }
      }
    },
    [selectedIds, data.elements, updateProperties],
  );

  // --- Tool registry integration ---
  // Resolve active tool string to ToolDefinition (null = select mode)
  const resolvedTool =
    activeTool === "select" ? null : (TOOL_MAP.get(activeTool) ?? null);

  // Unified tool completion handler (used once tools are migrated to registry)
  const handleToolComplete = useCallback(
    (result: import("./tools/types").ToolResult) => {
      if (result.type === "element") {
        const el = result.element;
        const typeStyle =
          data.typeStyles?.[el.type] ?? DEFAULT_TYPE_STYLES[el.type] ?? {};
        const merged = {
          ...el,
          layer: activeLayerId,
          properties: { ...el.properties, ...typeStyle },
        };
        addElement(merged);
        selectOne(merged.id);
        setActiveTool("select");
      }
      // "measurement" and "none" — no action needed
    },
    [addElement, selectOne, data.typeStyles, activeLayerId],
  );

  // Generic geometry update handler (replaces per-shape callbacks for handles)
  const handleGeometryUpdate = useCallback(
    (id: string, updates: Partial<import("../types").Geometry>) => {
      updateElement(id, updates);
    },
    [updateElement],
  );

  // Tool context passed to Canvas → ToolHost
  const toolContext: ToolContext = useMemo(
    () => ({
      stageRef,
      position,
      scale,
      data,
      defaults,
      onComplete: handleToolComplete,
      activeIconName,
    }),
    [
      stageRef,
      position,
      scale,
      data,
      defaults,
      handleToolComplete,
      activeIconName,
    ],
  );

  const handleElementMove = useCallback(
    (id: string, x: number, y: number) => {
      updateElement(id, { x, y });
    },
    [updateElement],
  );

  const handleMultiMove = useCallback(
    (updates: Array<{ id: string; x: number; y: number }>) => {
      moveElements(updates);
    },
    [moveElements],
  );

  const handleElementResize = useCallback(
    (
      id: string,
      x: number,
      y: number,
      width: number,
      height: number,
      rotation: number,
    ) => {
      const element = data.elements.find((el) => el.id === id);
      if (element?.geometry.shape === "ellipse") {
        updateElement(id, {
          x,
          y,
          radiusX: width / 2,
          radiusY: height / 2,
          rotation,
        });
      } else {
        updateElement(id, { x, y, width, height, rotation });
      }
    },
    [data.elements, updateElement],
  );

  const handleCanvasResize = useCallback(
    (newWidth: number, newHeight: number, mode: "preserve" | "scale") => {
      if (mode === "scale") {
        const scaleX = newWidth / data.dimensions.width;
        const scaleY = newHeight / data.dimensions.height;
        for (const el of data.elements) {
          const geo = el.geometry;
          if ("x" in geo && "y" in geo) {
            const updates: Record<string, number | number[]> = {
              x: geo.x * scaleX,
              y: geo.y * scaleY,
            };
            if ("width" in geo) updates.width = geo.width * scaleX;
            if ("height" in geo) updates.height = geo.height * scaleY;
            if ("radiusX" in geo) updates.radiusX = geo.radiusX * scaleX;
            if ("radiusY" in geo) updates.radiusY = geo.radiusY * scaleY;
            if ("radius" in geo)
              updates.radius = geo.radius * Math.min(scaleX, scaleY);
            if ("points" in geo && Array.isArray(geo.points)) {
              updates.points = geo.points.map((v: number, i: number) =>
                i % 2 === 0 ? v * scaleX : v * scaleY,
              );
            }
            updateElement(el.id, updates);
          }
        }
      }
      updateDimensions({ width: newWidth, height: newHeight });
    },
    [data.dimensions, data.elements, updateElement, updateDimensions],
  );

  const handleBackgroundImage = useCallback(
    (
      url: string,
      imageWidth: number,
      imageHeight: number,
      mode: "resize-canvas" | "fit-image",
    ) => {
      // New uploads default to 1; replacing an existing background keeps the
      // user's current opacity.
      const opacity = data.backgroundImage?.opacity ?? 1;
      if (mode === "resize-canvas") {
        updateDimensions({ width: imageWidth, height: imageHeight });
        setBackgroundImage({
          url,
          width: imageWidth,
          height: imageHeight,
          opacity,
        });
      } else {
        setBackgroundImage({
          url,
          width: data.dimensions.width,
          height: data.dimensions.height,
          opacity,
        });
      }
      setShowBgDialog(false);
    },
    [
      data.dimensions,
      data.backgroundImage,
      setBackgroundImage,
      updateDimensions,
    ],
  );

  const handleRemoveBackground = useCallback(() => {
    // Clear local state immediately (marks dirty; next save drops it). Notify
    // the host fire-and-forget — a rejection must not restore the image, since
    // the host surfaces its own errors and retains old files server-side.
    setBackgroundImage(undefined);
    void onRemoveBackgroundImage?.().catch(() => {});
  }, [setBackgroundImage, onRemoveBackgroundImage]);

  const handleElementContextMenu = useCallback(
    (elementId: string, screenX: number, screenY: number) => {
      const element = data.elements.find((el) => el.id === elementId);
      const groupId = element?.properties.groupId;
      if (groupId && !activeGroupId) {
        // Right-clicking a group member: select the whole group
        selectMany(
          data.elements
            .filter((el) => el.properties.groupId === groupId)
            .map((el) => el.id),
        );
      } else if (!selectedIds.has(elementId)) {
        selectOne(elementId);
      }
      setContextMenu({ elementId, x: screenX, y: screenY });
    },
    [data.elements, activeGroupId, selectedIds, selectMany, selectOne],
  );

  const contextMenuItems: ContextMenuItem[] = (() => {
    if (!contextMenu) return [];
    const element = data.elements.find((el) => el.id === contextMenu.elementId);
    if (!element) return [];

    const config = getToolUIConfig(element.geometry.shape, element.type);
    const items: ContextMenuItem[] = [];

    // Z-ordering actions
    items.push(
      {
        label: "Bring to Front",
        onClick: () => reorderElement(contextMenu.elementId, "front"),
      },
      {
        label: "Bring Forward",
        onClick: () => reorderElement(contextMenu.elementId, "forward"),
      },
      {
        label: "Send Backward",
        onClick: () => reorderElement(contextMenu.elementId, "backward"),
      },
      {
        label: "Send to Back",
        onClick: () => reorderElement(contextMenu.elementId, "back"),
      },
    );

    items.push({ type: "divider" as const });

    // Group / Ungroup / Enter Group
    const clickedGroupId = element.properties.groupId;
    if (clickedGroupId) {
      if (!activeGroupId) {
        items.push({
          label: "Enter Group",
          onClick: () => {
            setActiveGroupId(clickedGroupId);
            selectOne(contextMenu.elementId);
            setContextMenu(null);
          },
        });
      }
      items.push({
        label: "Ungroup",
        onClick: () => {
          dissolveGroup(clickedGroupId);
          setActiveGroupId(null);
          setContextMenu(null);
        },
      });
      items.push({ type: "divider" as const });
    } else if (
      selectedIds.size >= 2 &&
      [...selectedIds].every(
        (id) => !data.elements.find((el) => el.id === id)?.properties.groupId,
      )
    ) {
      items.push({
        label: "Group",
        onClick: () => {
          createGroup([...selectedIds]);
          setContextMenu(null);
        },
      });
      items.push({ type: "divider" as const });
    }

    for (const action of config.contextMenu) {
      switch (action) {
        case "convertToObject":
          // Offer a conversion to every placement category except the element's
          // own type — so the available conversions follow the active variant.
          for (const group of placementRecords) {
            const { category } = group;
            if (category.elementType === element.type) continue;
            items.push({
              label: category.convertLabel,
              onClick: () =>
                updateElementType(contextMenu.elementId, category.elementType, {
                  color: category.convertColor,
                }),
            });
          }
          break;
        case "convertToShape":
          items.push({
            label: "Convert to Shape",
            onClick: () => updateElementType(contextMenu.elementId, "shape"),
          });
          break;
        case "delete":
          items.push({
            label: "Delete",
            danger: true,
            onClick: () => {
              deleteElement(contextMenu.elementId);
              selectNone();
            },
          });
          break;
      }
    }
    return items;
  })();

  const handleToolChange = useCallback(
    (tool: ActiveTool) => {
      // select is always available; all other registry tools are drawing tools.
      if (tool !== "select" && featureMap.drawingTools !== "enabled") return;
      setActiveTool(tool);
      if (tool !== "select") {
        selectNone();
      }
    },
    [selectNone, featureMap.drawingTools],
  );

  // Canvas selection handler: supports shift+click and group-aware routing
  const handleSelect = useCallback(
    (id: string | null, shiftKey?: boolean) => {
      if (id === null) {
        setActiveGroupId(null);
        selectNone();
        return;
      }
      // Inside an entered group: behave like normal individual selection
      if (activeGroupId) {
        if (shiftKey) toggleSelect(id);
        else selectOne(id);
        return;
      }
      // Normal mode: if element belongs to a group, select all members
      const element = data.elements.find((el) => el.id === id);
      const groupId = element?.properties.groupId;
      if (groupId && !shiftKey) {
        selectMany(getGroupMembers(groupId).map((el) => el.id));
        return;
      }
      if (shiftKey) toggleSelect(id);
      else selectOne(id);
    },
    [
      activeGroupId,
      data.elements,
      selectNone,
      selectOne,
      toggleSelect,
      selectMany,
      getGroupMembers,
    ],
  );

  const handleDoubleClick = useCallback(
    (id: string) => {
      const element = data.elements.find((el) => el.id === id);
      const groupId = element?.properties.groupId;
      if (!groupId) return;
      // Enter the group if the clicked element is part of the currently selected group
      const allSelectedInGroup = [...selectedIds].every(
        (sid) =>
          data.elements.find((el) => el.id === sid)?.properties.groupId ===
          groupId,
      );
      if (allSelectedInGroup) {
        setActiveGroupId(groupId);
        selectOne(id);
      }
    },
    [data.elements, selectedIds, selectOne],
  );

  // Drag-select complete: select all elements in the rectangle
  const handleDragSelect = useCallback(
    (ids: string[]) => {
      selectMany(ids);
    },
    [selectMany],
  );

  const handleGroupTransformEnd = useCallback(
    (
      updates: Array<{
        id: string;
        geometry: Partial<import("../types").Geometry>;
      }>,
    ) => {
      batchUpdateGeometry(updates);
    },
    [batchUpdateGeometry],
  );

  const handleAlignLeft = useCallback(() => {
    const u = alignLeft(elementsForAlignment);
    if (u.length) batchUpdateGeometry(u);
  }, [elementsForAlignment, batchUpdateGeometry]);
  const handleAlignRight = useCallback(() => {
    const u = alignRight(elementsForAlignment);
    if (u.length) batchUpdateGeometry(u);
  }, [elementsForAlignment, batchUpdateGeometry]);
  const handleAlignTop = useCallback(() => {
    const u = alignTop(elementsForAlignment);
    if (u.length) batchUpdateGeometry(u);
  }, [elementsForAlignment, batchUpdateGeometry]);
  const handleAlignBottom = useCallback(() => {
    const u = alignBottom(elementsForAlignment);
    if (u.length) batchUpdateGeometry(u);
  }, [elementsForAlignment, batchUpdateGeometry]);
  const handleAlignCenterH = useCallback(() => {
    const u = alignCenterH(elementsForAlignment);
    if (u.length) batchUpdateGeometry(u);
  }, [elementsForAlignment, batchUpdateGeometry]);
  const handleAlignCenterV = useCallback(() => {
    const u = alignCenterV(elementsForAlignment);
    if (u.length) batchUpdateGeometry(u);
  }, [elementsForAlignment, batchUpdateGeometry]);
  const handleDistributeH = useCallback(() => {
    const u = distributeH(elementsForAlignment);
    if (u.length) batchUpdateGeometry(u);
  }, [elementsForAlignment, batchUpdateGeometry]);
  const handleDistributeV = useCallback(() => {
    const u = distributeV(elementsForAlignment);
    if (u.length) batchUpdateGeometry(u);
  }, [elementsForAlignment, batchUpdateGeometry]);

  // Ctrl+G / Ctrl+Shift+G group shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement).matches("input, textarea, [contenteditable]")
      )
        return;
      if (!(e.metaKey || e.ctrlKey) || e.key !== "g") return;
      e.preventDefault();
      if (e.shiftKey) {
        // Ungroup: all selected elements must share the same groupId
        const ids = [...selectedIds];
        const groupId = data.elements.find((el) => el.id === ids[0])?.properties
          .groupId;
        if (
          groupId &&
          ids.every(
            (id) =>
              data.elements.find((el) => el.id === id)?.properties.groupId ===
              groupId,
          )
        ) {
          dissolveGroup(groupId);
          setActiveGroupId(null);
        }
      } else {
        // Group: 2+ elements selected, none already in a group
        if (
          selectedIds.size >= 2 &&
          [...selectedIds].every(
            (id) =>
              !data.elements.find((el) => el.id === id)?.properties.groupId,
          )
        ) {
          createGroup([...selectedIds]);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, data.elements, createGroup, dissolveGroup]);

  // --- Auto-generation handlers ---

  const handleAutoMarkObstacles = useCallback(() => {
    const grid = data.walkableLayer;
    if (!grid) return;
    const newCells = grid.cells.map((r) => [...r]);
    for (const el of data.elements) {
      const geo = el.geometry;
      if (!("x" in geo && "y" in geo && "width" in geo && "height" in geo))
        continue;
      const g = geo as { x: number; y: number; width: number; height: number };
      const startCol = Math.floor(g.x / grid.cellSize);
      const startRow = Math.floor(g.y / grid.cellSize);
      const endCol = Math.ceil((g.x + g.width) / grid.cellSize) - 1;
      const endRow = Math.ceil((g.y + g.height) / grid.cellSize) - 1;
      for (
        let row = Math.max(0, startRow);
        row <= Math.min(grid.rows - 1, endRow);
        row++
      ) {
        for (
          let col = Math.max(0, startCol);
          col <= Math.min(grid.cols - 1, endCol);
          col++
        ) {
          newCells[row][col] = 0;
        }
      }
    }
    setWalkableGrid({ ...grid, cells: newCells });
  }, [data.walkableLayer, data.elements, setWalkableGrid]);

  const handleAutoMarkWalkable = useCallback(() => {
    const grid = data.walkableLayer;
    if (!grid) return;
    // Start with all walkable, then mark element footprints as impassable
    const newCells = Array.from({ length: grid.rows }, () =>
      new Array(grid.cols).fill(1),
    );
    for (const el of data.elements) {
      const geo = el.geometry;
      if (!("x" in geo && "y" in geo && "width" in geo && "height" in geo))
        continue;
      const g = geo as { x: number; y: number; width: number; height: number };
      const startCol = Math.floor(g.x / grid.cellSize);
      const startRow = Math.floor(g.y / grid.cellSize);
      const endCol = Math.ceil((g.x + g.width) / grid.cellSize) - 1;
      const endRow = Math.ceil((g.y + g.height) / grid.cellSize) - 1;
      for (
        let row = Math.max(0, startRow);
        row <= Math.min(grid.rows - 1, endRow);
        row++
      ) {
        for (
          let col = Math.max(0, startCol);
          col <= Math.min(grid.cols - 1, endCol);
          col++
        ) {
          newCells[row][col] = 0;
        }
      }
    }
    setWalkableGrid({ ...grid, cells: newCells });
  }, [data.walkableLayer, data.elements, setWalkableGrid]);

  const handleCellSizeChange = useCallback(
    (size: number) => {
      if (
        data.walkableLayer &&
        data.walkableLayer.cells.some((r) => r.some((c) => c === 1))
      ) {
        if (
          !window.confirm(
            "Changing grid resolution will clear your current walkable areas. Continue?",
          )
        )
          return;
      }
      setWalkableGridResolution(size);
    },
    [data.walkableLayer, setWalkableGridResolution],
  );

  const handleClearGrid = useCallback(() => {
    if (
      !window.confirm(
        "Clear all walkable areas? This cannot be undone except via undo.",
      )
    )
      return;
    clearWalkableGrid();
  }, [clearWalkableGrid]);

  // ---------------------------------------------------------------------------
  // Drag-to-place handlers
  // ---------------------------------------------------------------------------

  /** Returns the topmost solid, assignable element under canvas point (cx, cy). */
  const hitTestAssignable = useCallback(
    (cx: number, cy: number): FloorPlanElement | null => {
      const candidates = data.elements.filter((el) => {
        const s = el.geometry.shape;
        return (
          (s === "rect" ||
            s === "polygon" ||
            s === "ellipse" ||
            s === "circle") &&
          (el.layer ?? ELEMENT_TYPE_TO_LAYER[el.type]) === activeLayerId
        );
      });
      return (
        [...candidates]
          .sort((a, b) => b.properties.zIndex - a.properties.zIndex)
          .find((el) => {
            const b = getElementBounds(el);
            return (
              cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom
            );
          }) ?? null
      );
    },
    [data.elements, activeLayerId],
  );

  const handleCanvasDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!e.dataTransfer.types.includes(PLACEMENT_DRAG_TYPE)) return;
      e.preventDefault();
      const shape = e.dataTransfer.types.includes(PLACEMENT_SHAPE_ELLIPSE_TYPE)
        ? "ellipse"
        : "rect";
      setDragOverCanvas({ shape });
    },
    [],
  );

  /** Update ghost position imperatively to avoid re-rendering the whole tree on every mousemove. */
  const handleCanvasDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!e.dataTransfer.types.includes(PLACEMENT_DRAG_TYPE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!ghostDivRef.current) return;
      const rect = e.currentTarget.getBoundingClientRect();
      ghostDivRef.current.style.left = `${e.clientX - rect.left - 60}px`;
      ghostDivRef.current.style.top = `${e.clientY - rect.top - 40}px`;
    },
    [],
  );

  const handleCanvasDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (!e.currentTarget.contains(e.relatedTarget as Node)) {
        setDragOverCanvas(null);
      }
    },
    [],
  );

  const handlePlacementDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragOverCanvas(null);

      const raw =
        e.dataTransfer.getData(PLACEMENT_DRAG_TYPE) ||
        e.dataTransfer.getData("text/plain");
      if (!raw) return;
      let ref: PlacementRecordRef;
      try {
        ref = JSON.parse(raw) as PlacementRecordRef;
      } catch {
        return;
      }

      const containerRect = e.currentTarget.getBoundingClientRect();
      const cx = (e.clientX - containerRect.left - position.x) / scale;
      const cy = (e.clientY - containerRect.top - position.y) / scale;

      const group = categoryByElementType.get(ref.type);

      // Resolve display name (+ any extra props like capacity) from the pool.
      const displayProps: Partial<ElementProperties> = (() => {
        if (!group) return {};
        const found = group.records.find(
          (r) => group.category.getRecordId(r.record) === ref.id,
        );
        if (!found) return {};
        return {
          name: group.category.getPrimaryLabel(found.record),
          ...(group.category.getExtraProps?.(found.record) ?? {}),
        };
      })();

      // Set the active category's link key; clear every other category's link
      // key so a re-linked element is never double-linked.
      const linkingProps: Record<string, unknown> = {};
      for (const g of placementRecords) {
        linkingProps[g.category.linkKey] = undefined;
      }
      if (group) linkingProps[group.category.linkKey] = ref.id;
      Object.assign(linkingProps, displayProps);
      const linkedProps = linkingProps as Partial<ElementProperties>;

      const hit = hitTestAssignable(cx, cy);

      if (hit) {
        // Assign record to the existing shape — single undo entry via updateElementType
        updateElementType(hit.id, ref.type, linkedProps);
        selectOne(hit.id);
      } else {
        // Create a new element centred on the drop point
        const typeStyle =
          data.typeStyles?.[ref.type] ?? DEFAULT_TYPE_STYLES[ref.type] ?? {};
        const w = typeStyle.defaultWidth ?? 120;
        const h = typeStyle.defaultHeight ?? 80;
        const r = Math.min(w, h) / 2;
        const geometry: Geometry =
          ref.defaultShape === "ellipse"
            ? { shape: "ellipse", x: cx - r, y: cy - r, radiusX: r, radiusY: r }
            : {
                shape: "rect",
                x: cx - w / 2,
                y: cy - h / 2,
                width: w,
                height: h,
              };

        const maxZ = data.elements.reduce(
          (m, el) => Math.max(m, el.properties.zIndex),
          0,
        );
        const newEl: FloorPlanElement = {
          id: crypto.randomUUID(),
          type: ref.type,
          layer: activeLayerId,
          geometry,
          properties: {
            color: typeStyle.color ?? "#94a3b8",
            strokeColor: typeStyle.strokeColor ?? "#888888",
            strokeWidth: typeStyle.strokeWidth ?? 1,
            zIndex: maxZ + 1,
            ...linkedProps,
          },
        };
        addElement(newEl);
        selectOne(newEl.id);
      }
    },
    [
      position,
      scale,
      data,
      activeLayerId,
      placementRecords,
      categoryByElementType,
      hitTestAssignable,
      updateElementType,
      addElement,
      selectOne,
    ],
  );

  const handleAutoArrange = useCallback(
    (
      category: PlacementCategory,
      records: AutoArrangeRecord[],
      shape: "rect" | "ellipse",
    ) => {
      if (records.length === 0) return;

      const type = category.elementType;
      const typeStyle =
        data.typeStyles?.[type] ?? DEFAULT_TYPE_STYLES[type] ?? {};
      const w = typeStyle.defaultWidth ?? 120;
      const h = typeStyle.defaultHeight ?? 80;
      const gap = 10;
      const cols = Math.ceil(Math.sqrt(records.length));

      // Start to the right of existing content, aligned to its top edge
      let startX = 50;
      let startY = 50;
      if (data.elements.length > 0) {
        let maxRight = 0;
        let minTop = Infinity;
        for (const el of data.elements) {
          const b = getElementBounds(el);
          maxRight = Math.max(maxRight, b.right);
          minTop = Math.min(minTop, b.top);
        }
        startX = maxRight + 40;
        startY = Math.max(50, minTop);
      }

      const maxZ = data.elements.reduce(
        (m, el) => Math.max(m, el.properties.zIndex),
        0,
      );

      const newElements: FloorPlanElement[] = records.map((rec, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const linkingProps = {
          [category.linkKey]: rec.recordId,
        } as Partial<ElementProperties>;

        const cellX = startX + col * (w + gap);
        const cellY = startY + row * (h + gap);
        const geometry: Geometry =
          shape === "ellipse"
            ? {
                shape: "ellipse",
                x: cellX,
                y: cellY,
                radiusX: w / 2,
                radiusY: h / 2,
              }
            : { shape: "rect", x: cellX, y: cellY, width: w, height: h };

        return {
          id: crypto.randomUUID(),
          type,
          layer: "content" as LayerId,
          geometry,
          properties: {
            name: rec.recordName,
            color: typeStyle.color ?? "#94a3b8",
            strokeColor: typeStyle.strokeColor ?? "#888888",
            strokeWidth: typeStyle.strokeWidth ?? 1,
            zIndex: maxZ + 1 + i,
            ...linkingProps,
          },
        };
      });

      addElements(newElements);
      setSelectedIds(new Set(newElements.map((el) => el.id)));
    },
    [data, addElements, setSelectedIds],
  );

  return (
    <div className="pl-map-editor flex flex-col h-full overflow-hidden">
      <TopBar
        debug={debug}
        onDebugClick={() => setShowMapDebug(true)}
        onHelpClick={() => setShowHelp(true)}
        onLegendClick={() => setShowLegendDialog(true)}
        fileMenuItems={[
          ...(onEditProperties
            ? [
                {
                  label: "Map Properties…",
                  onClick: onEditProperties,
                },
                { type: "divider" as const },
              ]
            : []),
          ...(onSave
            ? [
                {
                  label: isSaving ? "Saving…" : "Save",
                  shortcut: `${modKey}S`,
                  disabled: isSaving,
                  onClick: handleSave,
                },
                { type: "divider" as const },
              ]
            : []),
          {
            label: "Export as PNG",
            onClick: () => {
              const stage = stageRef.current;
              if (!stage) return;
              const dataUrl = stage.toDataURL({ pixelRatio: 2 });
              const link = document.createElement("a");
              link.download = `${data.name || "map"}.png`;
              link.href = dataUrl;
              link.click();
            },
          },
          {
            label: "Export as JSON",
            onClick: () => {
              const json = JSON.stringify(data, null, 2);
              const blob = new Blob([json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.download = `${data.name || "map"}.json`;
              link.href = url;
              link.click();
              URL.revokeObjectURL(url);
            },
          },
          {
            label: "Import JSON",
            onClick: () => {
              const input = document.createElement("input");
              input.type = "file";
              input.accept = ".json";
              input.onchange = (e) => {
                const file = (e.target as HTMLInputElement).files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                  try {
                    const imported = JSON.parse(reader.result as string);
                    if (imported.version && imported.elements) {
                      // Replace current data by adding/removing elements
                      // Simple approach: reload the page with new data in storage
                      localStorage.setItem(
                        storageKey,
                        JSON.stringify(imported),
                      );
                      window.location.reload();
                    }
                  } catch {
                    // Invalid JSON — ignore
                  }
                };
                reader.readAsText(file);
              };
              input.click();
            },
          },
          ...(debug
            ? [
                { type: "divider" as const },
                {
                  label: "Reset Demo",
                  danger: true,
                  onClick: () => {
                    localStorage.removeItem(storageKey);
                    window.location.reload();
                  },
                },
              ]
            : []),
        ]}
        editMenuItems={[
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
          { type: "divider" as const },
          {
            label: "Copy",
            shortcut: `${modKey}C`,
            disabled: !hasSelection,
            onClick: handleCopy,
          },
          {
            label: "Paste",
            shortcut: `${modKey}V`,
            disabled: !hasBuffer,
            onClick: handlePaste,
          },
          {
            label: "Duplicate",
            shortcut: `${modKey}D`,
            disabled: !hasSelection,
            onClick: handleDuplicate,
          },
        ]}
        viewMenuItems={[
          {
            label: `${showRulers ? "✓ " : "   "}Show Rulers`,
            onClick: () => setShowRulers((s) => !s),
          },
          {
            label: `${gridSettings.showGrid ? "✓ " : "   "}Show Grid`,
            onClick: () =>
              setGridSettings((s) => ({ ...s, showGrid: !s.showGrid })),
          },
          {
            label: `${gridSettings.snapToGrid ? "✓ " : "   "}Snap to Grid`,
            onClick: () =>
              setGridSettings((s) => ({ ...s, snapToGrid: !s.snapToGrid })),
          },
          {
            label: `${snapToObjects ? "✓ " : "   "}Snap to Objects`,
            onClick: () => setSnapToObjects((s) => !s),
          },
          {
            label: `${showTransformControls ? "✓ " : "   "}Show Transform Controls`,
            onClick: () => setShowTransformControls((s) => !s),
          },
        ]}
        toolsMenuItems={[
          {
            label: "Element Defaults...",
            onClick: () => setShowTypeDefaultsDialog(true),
          },
          { type: "divider" as const },
          {
            label: "Configure Grid...",
            onClick: () => setShowGridDialog(true),
          },
          {
            label: "Canvas Size...",
            onClick: () => setShowResizeDialog(true),
          },
          // Scale calibration is gated by the usage tier: omitted when hidden,
          // disabled + trophy when locked behind a higher tier.
          ...(featureMap.scaleCalibration === "hidden"
            ? []
            : [
                {
                  label: "Set Scale...",
                  disabled: featureMap.scaleCalibration === "locked",
                  premium: featureMap.scaleCalibration === "locked",
                  onClick: handleStartCalibration,
                },
              ]),
        ]}
      />
      <div className="flex flex-1 overflow-hidden">
        <ToolSidebar
          activeTool={activeTool}
          activeIconName={activeIconName}
          onToolChange={handleToolChange}
          onIconSelect={(iconId) => setActiveIconName(iconId)}
          isPathingMode={activeLayerId === "pathing"}
          activePathingTool={activePathingTool}
          onPathingToolChange={setActivePathingTool}
          // If the tier locks objects, fall back to design mode so the
          // placement panel can't linger after a live tier change.
          editorMode={featureMap.objects === "enabled" ? editorMode : "design"}
          onEditorModeChange={handleEditorModeChange}
          mapName={controlledName ?? data.name}
          onMapNameChange={onNameChange ?? setMapName}
          nameEditable={
            controlledName === undefined || onNameChange !== undefined
          }
          isDirty={isDirty}
          placementRecords={placementRecords}
          onAutoArrange={handleAutoArrange}
          features={featureMap}
        />
        <div className="flex flex-col flex-1 min-w-0 min-h-0">
          {isPathingMode ? (
            <PathingOptionsBar
              cellSize={data.walkableLayer?.cellSize ?? 20}
              opacity={walkableGridOpacity}
              onCellSizeChange={handleCellSizeChange}
              onOpacityChange={setWalkableGridOpacity}
              onAutoMarkObstacles={handleAutoMarkObstacles}
              onAutoMarkWalkable={handleAutoMarkWalkable}
              onClearGrid={handleClearGrid}
            />
          ) : (
            <OptionsBar
              defaults={activeDefaults}
              config={
                isMultiSelect
                  ? {
                      optionsBar: [
                        "fill",
                        "stroke",
                        "strokeWidth",
                      ] as import("./components/canvas/elements/types").OptionsBarField[],
                      propertiesPanel: [],
                      contextMenu: [],
                    }
                  : selectedElement
                    ? getToolUIConfig(
                        selectedElement.geometry.shape,
                        selectedElement.type,
                      )
                    : resolvedTool
                      ? {
                          optionsBar: resolvedTool.optionsBar,
                          propertiesPanel: resolvedTool.propertiesPanel,
                          contextMenu: resolvedTool.contextMenu,
                        }
                      : { optionsBar: [], propertiesPanel: [], contextMenu: [] }
              }
              onDefaultsChange={handleDefaultsChange}
              onGroup={
                canGroupSelection
                  ? () => createGroup([...selectedIds])
                  : undefined
              }
              onUngroup={
                optionsBarGroupId
                  ? () => {
                      dissolveGroup(optionsBarGroupId);
                      setActiveGroupId(null);
                    }
                  : undefined
              }
              onEnterGroup={
                optionsBarGroupId
                  ? () => {
                      setActiveGroupId(optionsBarGroupId);
                      selectOne([...selectedIds][0]);
                    }
                  : undefined
              }
              onExitGroup={
                activeGroupId ? () => setActiveGroupId(null) : undefined
              }
              onAlignLeft={
                alignmentUnitCount >= 2 ? handleAlignLeft : undefined
              }
              onAlignCenterH={
                alignmentUnitCount >= 2 ? handleAlignCenterH : undefined
              }
              onAlignRight={
                alignmentUnitCount >= 2 ? handleAlignRight : undefined
              }
              onAlignTop={alignmentUnitCount >= 2 ? handleAlignTop : undefined}
              onAlignCenterV={
                alignmentUnitCount >= 2 ? handleAlignCenterV : undefined
              }
              onAlignBottom={
                alignmentUnitCount >= 2 ? handleAlignBottom : undefined
              }
              onDistributeH={
                alignmentUnitCount >= 3 ? handleDistributeH : undefined
              }
              onDistributeV={
                alignmentUnitCount >= 3 ? handleDistributeV : undefined
              }
              onArrangeAsGrid={
                alignmentUnitCount >= 2
                  ? () => setShowArrangeGridDialog(true)
                  : undefined
              }
            />
          )}
          <div className="flex flex-1 overflow-hidden">
            <div className="flex flex-col flex-1 min-w-0">
              <div
                className="relative flex-1 flex flex-col min-h-0 overflow-hidden"
                onDragEnter={handleCanvasDragEnter}
                onDragOver={handleCanvasDragOver}
                onDragLeave={handleCanvasDragLeave}
                onDrop={handlePlacementDrop}
              >
                <Canvas
                  data={data}
                  activeTool={resolvedTool}
                  toolContext={toolContext}
                  selectedIds={selectedIds}
                  scale={scale}
                  position={position}
                  stageSize={stageSize}
                  stageRef={stageRef}
                  containerRef={containerRef}
                  onWheel={handleWheel}
                  onDragEnd={handleDragEnd}
                  onPositionChange={setPosition}
                  activeGroupId={activeGroupId}
                  onSelect={handleSelect}
                  onDoubleClick={handleDoubleClick}
                  onDragSelect={handleDragSelect}
                  onGroupTransformEnd={handleGroupTransformEnd}
                  onElementMove={handleElementMove}
                  onMultiMove={handleMultiMove}
                  onElementResize={handleElementResize}
                  onGeometryUpdate={handleGeometryUpdate}
                  onElementContextMenu={handleElementContextMenu}
                  gridSettings={gridSettings}
                  snapToObjects={snapToObjects}
                  layers={layers}
                  activeLayerId={activeLayerId}
                  isPathingMode={
                    isPathingMode && activePathingTool !== "select"
                  }
                  walkableGridOpacity={walkableGridOpacity}
                  walkableHoverCell={
                    isPathingMode ? pathingTool.hoverCell : null
                  }
                  onPathingMouseDown={pathingTool.handleMouseDown}
                  onPathingMouseMove={pathingTool.handleMouseMove}
                  onPathingMouseUp={pathingTool.handleMouseUp}
                  pathingRectPreview={pathingTool.rectPreview}
                  pendingCells={pathingTool.pendingCells}
                  pendingValue={pathingTool.pendingValue}
                  isCalibrating={isCalibrating}
                  calibrationState={calibration.state}
                  existingCalibration={data.scaleCalibration}
                  onCalibrationClick={calibration.handleMouseDown}
                  onCalibrationMouseMove={calibration.handleMouseMove}
                  unlinkedElementIds={unlinkedElementIds}
                  showTransformControls={showTransformControls}
                  overlappingElementIds={overlappingElementIds}
                />
                <Rulers
                  visible={showRulers}
                  scale={scale}
                  position={position}
                  stageSize={stageSize}
                  dimensions={data.dimensions}
                />
                <LayerPanel
                  layers={layers}
                  activeLayerId={activeLayerId}
                  onSetActiveLayer={setActiveLayerId}
                  onToggleVisibility={toggleLayerVisibility}
                  topOffset={showRulers ? 26 : 8}
                  features={featureMap}
                />
                <LegendCanvasOverlay legend={data.legend} />

                {/* Overlap warning banner */}
                {overlappingElementIds.size > 0 && (
                  <button
                    onClick={handleLocateOverlapping}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-300 text-red-700 text-sm px-3 py-1.5 rounded-full shadow-sm z-10 whitespace-nowrap hover:bg-red-100 cursor-pointer"
                  >
                    {overlappingElementIds.size} element
                    {overlappingElementIds.size !== 1 ? "s" : ""} overlapping —
                    click to locate
                  </button>
                )}

                {/* Drag-to-place ghost preview */}
                {dragOverCanvas && (
                  <div
                    ref={ghostDivRef}
                    className="pointer-events-none absolute z-50 opacity-50 border-2 border-white"
                    style={
                      dragOverCanvas.shape === "ellipse"
                        ? {
                            width: 120,
                            height: 120,
                            borderRadius: "9999px",
                            backgroundColor: "#8b5cf6",
                          }
                        : {
                            width: 120,
                            height: 80,
                            borderRadius: "0px",
                            backgroundColor: "#3b82f6",
                          }
                    }
                  />
                )}
              </div>
              <StatusBar
                scale={scale}
                onZoomReset={zoomReset}
                unit={data.dimensions.unit}
                isCalibrated={
                  data.dimensions.unit !== "px" &&
                  data.dimensions.pixelsPerUnit > 0
                }
                showUnit={featureMap.scaleCalibration !== "hidden"}
                onUnitChange={setDisplayUnit}
              />
            </div>
            <PropertiesPanel
              element={selectedElement}
              selectedElements={selectedElements}
              selectedCount={selectedIds.size}
              isSelectedUnlinked={
                selectedElement
                  ? unlinkedElementIds.has(selectedElement.id)
                  : false
              }
              dimensions={data.dimensions}
              backgroundImage={data.backgroundImage}
              backgroundColor={data.backgroundColor}
              activeLayerId={activeLayerId}
              debug={debug}
              onUpdateTypeStyles={updateTypeStyles}
              onUpdateProperties={(id, updates) => {
                if (isMultiSelect) {
                  for (const sid of selectedIds) updateProperties(sid, updates);
                } else {
                  updateProperties(id, updates);
                }
              }}
              onPreviewProperties={(id, updates) =>
                previewProperties(id, updates)
              }
              onBatchUpdateProperties={(updates) => {
                batchUpdateProperties(
                  [...selectedIds].map((id) => ({ id, properties: updates })),
                );
              }}
              onUpdateGeometry={updateElement}
              onDelete={(id) => {
                if (isMultiSelect) {
                  deleteElements(selectedIds);
                } else {
                  deleteElement(id);
                }
                selectNone();
              }}
              onConvertToBooth={(id) => updateElementType(id, "booth")}
              onBackgroundOpacityChange={(opacity) =>
                data.backgroundImage &&
                setBackgroundImage({ ...data.backgroundImage, opacity })
              }
              onRemoveBackground={handleRemoveBackground}
              onUploadBackground={() => {
                // Background image is gated by the usage tier.
                if (featureMap.backgroundImage !== "enabled") return;
                setShowBgDialog(true);
              }}
              onBackgroundColorChange={setBackgroundColor}
            />
          </div>
        </div>
      </div>
      {showMapDebug && (
        <MapDebugDialog data={data} onClose={() => setShowMapDebug(false)} />
      )}
      {showBgDialog && (
        <BackgroundImageDialog
          canvasWidth={data.dimensions.width}
          canvasHeight={data.dimensions.height}
          onUpload={onUploadBackgroundImage}
          onConfirm={handleBackgroundImage}
          onClose={() => setShowBgDialog(false)}
        />
      )}
      {showGridDialog && (
        <GridSettingsDialog
          settings={gridSettings}
          onSave={setGridSettings}
          onClose={() => setShowGridDialog(false)}
        />
      )}
      {showResizeDialog && (
        <CanvasResizeDialog
          width={data.dimensions.width}
          height={data.dimensions.height}
          dimensions={data.dimensions}
          elements={data.elements}
          onConfirm={handleCanvasResize}
          onClose={() => setShowResizeDialog(false)}
        />
      )}
      {showHelp && <HelpDialog onClose={() => setShowHelp(false)} />}
      {showTypeDefaultsDialog && (
        <TypeDefaultsDialog
          typeStyles={data.typeStyles ?? {}}
          typeKeys={placementCategories.map((c) => c.elementType)}
          onUpdateTypeStyles={updateTypeStyles}
          onClose={() => setShowTypeDefaultsDialog(false)}
        />
      )}
      {showArrangeGridDialog && (
        <ArrangeGridDialog
          elementCount={alignmentUnitCount}
          onConfirm={(cols, gapX, gapY) => {
            const updates = arrangeAsGrid(
              elementsForAlignment,
              cols,
              gapX,
              gapY,
            );
            if (updates.length) batchUpdateGeometry(updates);
          }}
          onClose={() => setShowArrangeGridDialog(false)}
        />
      )}
      {showLegendDialog && (
        <LegendDialog
          legend={data.legend}
          onSave={(updated) => updateLegend(updated)}
          onClose={() => setShowLegendDialog(false)}
        />
      )}
      {calibration.state.step === "confirming" &&
        calibration.pixelDistance != null && (
          <CalibrationDialog
            pixelDistance={calibration.pixelDistance}
            existingUnit={data.dimensions.unit}
            onConfirm={calibration.handleConfirm}
            onClose={handleCancelCalibration}
          />
        )}
      {contextMenu && contextMenuItems.length > 0 && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

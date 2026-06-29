import { useCallback, useState, useRef, useEffect } from "react";
import { Stage, Layer, Rect } from "react-konva";
import type Konva from "konva";
import type { FloorPlanData, LayerDefinition, LayerId } from "../../../types";
import { ELEMENT_TYPE_TO_LAYER } from "../../../types";
import type { ToolDefinition, ToolInteraction, ToolContext } from "../../tools/types";
import { findToolForElement } from "../../tools/registry";
import { isEmptySpaceClick, getCanvasPoint } from "../../utils/canvas";
import { ElementShape } from "./ElementShape";
import { SelectionTransformer } from "./SelectionTransformer";
import { BackgroundImage } from "./BackgroundImage";
import { AlignmentGuides } from "./AlignmentGuides";
import { SelectionRect } from "./SelectionRect";
import { MultiSelectBounds } from "./MultiSelectBounds";
import { GroupTransformer } from "./GroupTransformer";
import { GridLayer } from "./GridLayer";
import { WalkableGridOverlay } from "./WalkableGridOverlay";
import { CalibrationPreview } from "./CalibrationPreview";
import type { CalibrationState } from "../../hooks/useCalibration";
import { useAlignmentGuides } from "../../hooks/useAlignmentGuides";
import { getElementBounds, lineIntersectsRect } from "../../utils/bounds";
import { PolygonVertexHandles } from "../../tools/handles/PolygonVertexHandles";

// ---------------------------------------------------------------------------
// ToolHost — mounts/unmounts with key={tool.id} to manage hook lifecycle
// ---------------------------------------------------------------------------

function ToolHost({
  tool,
  context,
  onInteraction,
}: {
  tool: ToolDefinition;
  context: ToolContext;
  onInteraction: (interaction: ToolInteraction) => void;
}) {
  const interaction = tool.useInteraction(context);

  useEffect(() => {
    onInteraction(interaction);
  });

  // Key listener for tools that need it (e.g. arc Escape to cancel)
  useEffect(() => {
    if (!interaction.handleKeyDown) return;
    const handler = interaction.handleKeyDown;
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [interaction.handleKeyDown]);

  // Render preview if the tool has one
  const Preview = tool.PreviewComponent;
  return Preview ? (
    <Preview
      state={interaction.state}
      scale={context.scale}
      dimensions={context.data.dimensions}
    />
  ) : null;
}

// ---------------------------------------------------------------------------
// Canvas
// ---------------------------------------------------------------------------

interface CanvasProps {
  data: FloorPlanData;
  /** null = select mode (built-in), otherwise the active registry tool */
  activeTool: ToolDefinition | null;
  /** Hand tool active — drag pans the canvas; clicks neither select nor draw. */
  isPanTool?: boolean;
  toolContext: ToolContext;
  selectedIds: Set<string>;
  scale: number;
  position: { x: number; y: number };
  stageSize: { width: number; height: number };
  stageRef: React.RefObject<Konva.Stage | null>;
  containerRef: React.RefObject<HTMLDivElement | null>;
  onWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
  onPositionChange: (pos: { x: number; y: number }) => void;
  onSelect: (id: string | null, shiftKey?: boolean) => void;
  onDragSelect: (ids: string[]) => void;
  onElementMove: (id: string, x: number, y: number) => void;
  onMultiMove: (updates: Array<{ id: string; x: number; y: number }>) => void;
  onElementResize: (
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    rotation: number
  ) => void;
  onGeometryUpdate: (id: string, updates: Partial<import("../../../types").Geometry>) => void;
  onElementContextMenu: (id: string, screenX: number, screenY: number) => void;
  gridSettings: {
    showGrid: boolean;
    gridSpacing: number;
    snapToGrid: boolean;
    gridColor: string;
    gridOpacity: number;
  };
  snapToObjects: boolean;
  layers: LayerDefinition[];
  activeLayerId: LayerId;
  walkableGridOpacity?: number;
  walkableHoverCell?: { col: number; row: number } | null;
  onPathingMouseDown?: () => void;
  onPathingMouseMove?: () => void;
  onPathingMouseUp?: () => void;
  isPathingMode?: boolean;
  pathingRectPreview?: { startCol: number; startRow: number; endCol: number; endRow: number } | null;
  pendingCells?: Set<string>;
  pendingValue?: 0 | 1;
  // Scale calibration
  isCalibrating?: boolean;
  calibrationState?: CalibrationState;
  existingCalibration?: FloorPlanData["scaleCalibration"];
  onCalibrationClick?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  onCalibrationMouseMove?: (e: Konva.KonvaEventObject<MouseEvent>) => void;
  unlinkedElementIds?: Set<string>;
  showTransformControls?: boolean;
  overlappingElementIds?: Set<string>;
  activeGroupId?: string | null;
  onDoubleClick?: (id: string) => void;
  onGroupTransformEnd?: (updates: Array<{ id: string; geometry: Partial<import("../../../types").Geometry> }>) => void;
}

export function Canvas({
  data,
  activeTool,
  isPanTool = false,
  toolContext,
  selectedIds,
  scale,
  position,
  stageSize,
  stageRef,
  containerRef,
  onWheel,
  onDragEnd,
  onPositionChange,
  onSelect,
  onDragSelect,
  onElementMove,
  onMultiMove,
  onElementResize,
  onGeometryUpdate,
  onElementContextMenu,
  gridSettings,
  snapToObjects,
  layers,
  activeLayerId,
  walkableGridOpacity = 0.3,
  walkableHoverCell,
  onPathingMouseDown,
  onPathingMouseMove,
  onPathingMouseUp,
  isPathingMode,
  pathingRectPreview,
  pendingCells,
  pendingValue,
  isCalibrating,
  calibrationState,
  existingCalibration,
  onCalibrationClick,
  onCalibrationMouseMove,
  unlinkedElementIds,
  showTransformControls = true,
  overlappingElementIds,
  activeGroupId,
  onDoubleClick,
  onGroupTransformEnd,
}: CanvasProps) {
  // Hand tool and select mode are mutually exclusive built-in (non-drawing)
  // modes. Hand pans on drag; select rubber-bands / moves elements.
  const isSelectMode = activeTool === null && !isPanTool;

  // Track Space key for pan mode
  const [spaceHeld, setSpaceHeld] = useState(false);
  // True while the stage itself is being dragged (pan) — for the grab/grabbing
  // cursor swap.
  const [isStageDragging, setIsStageDragging] = useState(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Hold Space, or activate the hand tool, to pan by dragging.
  const isPanMode = spaceHeld || isPanTool;

  // Hover state (select mode only)
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);

  // Middle-click pan state
  const [isMiddlePanning, setIsMiddlePanning] = useState(false);
  const isMiddlePanningRef = useRef(false);
  const middlePanStartRef = useRef<{ clientX: number; clientY: number; stageX: number; stageY: number } | null>(null);

  // Release middle-click pan if mouse-up happens outside the Stage
  useEffect(() => {
    if (!isMiddlePanning) return;
    const onGlobalMouseUp = (e: MouseEvent) => {
      if (e.button !== 1) return;
      const stage = stageRef.current;
      if (stage) onPositionChange(stage.position());
      isMiddlePanningRef.current = false;
      setIsMiddlePanning(false);
      middlePanStartRef.current = null;
    };
    window.addEventListener("mouseup", onGlobalMouseUp);
    return () => window.removeEventListener("mouseup", onGlobalMouseUp);
  }, [isMiddlePanning, stageRef, onPositionChange]);

  // Drag-select rectangle state
  const [dragSelectRect, setDragSelectRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const dragSelectOrigin = useRef<{ x: number; y: number } | null>(null);

  // Multi-drag tracking
  const [isMultiDragging, setIsMultiDragging] = useState(false);
  const dragStartPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Tool interaction ref — updated by ToolHost on each render
  const toolInteractionRef = useRef<ToolInteraction | null>(null);

  const handleToolInteraction = useCallback((interaction: ToolInteraction) => {
    toolInteractionRef.current = interaction;
  }, []);

  // Clear interaction ref when switching to select mode
  useEffect(() => {
    if (isSelectMode) {
      toolInteractionRef.current = null;
    }
  }, [isSelectMode]);

  const { activeGuides, startDrag, endDrag, snapPosition } = useAlignmentGuides(data.elements);

  const sortedElements = [...data.elements].sort(
    (a, b) => (a.properties.zIndex ?? 0) - (b.properties.zIndex ?? 0)
  );

  // Build a visibility lookup from layers prop
  const layerVisibility = new Map(layers.map((l) => [l.id, l.visible]));

  // Group sorted elements by layer
  const elementsByLayer = new Map<LayerId, typeof sortedElements>();
  for (const el of sortedElements) {
    const lid = el.layer ?? ELEMENT_TYPE_TO_LAYER[el.type];
    const group = elementsByLayer.get(lid);
    if (group) {
      group.push(el);
    } else {
      elementsByLayer.set(lid, [el]);
    }
  }

  // Ordered layer IDs for rendering (excluding background — handled separately)
  const elementLayerOrder: LayerId[] = ["content", "pathing", "markup"];

  // Selected element + handle lookup from registry
  const selectedElement = selectedIds.size === 1
    ? data.elements.find((el) => selectedIds.has(el.id))
    : undefined;
  const handleDef = selectedElement
    ? findToolForElement(selectedElement.geometry.shape, selectedElement.type)
    : undefined;
  // Polygon vertex handles apply to any polygon element regardless of its type
  // (booth, session_area, meeting_room, or plain shape).
  const HandleComponent =
    selectedElement?.geometry.shape === "polygon"
      ? PolygonVertexHandles
      : handleDef?.HandleComponent;

  // Group selection: all selectedIds share the same groupId and we're not inside the group
  const groupSelectionGroupId = (() => {
    if (selectedIds.size < 2 || activeGroupId) return null;
    const firstId = [...selectedIds][0];
    const gid = data.elements.find((el) => el.id === firstId)?.properties.groupId;
    if (!gid) return null;
    return [...selectedIds].every(
      (id) => data.elements.find((el) => el.id === id)?.properties.groupId === gid
    ) ? gid : null;
  })();

  const groupMemberElements = groupSelectionGroupId
    ? data.elements.filter((el) => el.properties.groupId === groupSelectionGroupId)
    : null;

  // Elements in the active group (for boundary overlay)
  const activeGroupElements = activeGroupId
    ? data.elements.filter((el) => el.properties.groupId === activeGroupId)
    : null;

  // --- Mouse event handlers ---

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Middle-click pan — intercept before all other handlers
    if (e.evt.button === 1) {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      isMiddlePanningRef.current = true;
      setIsMiddlePanning(true);
      middlePanStartRef.current = {
        clientX: e.evt.clientX,
        clientY: e.evt.clientY,
        stageX: stage.x(),
        stageY: stage.y(),
      };
      return;
    }

    if (isPanMode) return;

    // Calibration mode: intercept before everything else
    if (isCalibrating && onCalibrationClick) {
      onCalibrationClick(e);
      return;
    }

    // Pathing mode: delegate to pathing handlers
    if (isPathingMode && onPathingMouseDown) {
      onPathingMouseDown();
      return;
    }

    // Select mode: built-in selection behavior
    if (isSelectMode) {
      if (isEmptySpaceClick(e)) {
        const stage = stageRef.current;
        if (!stage) return;
        const point = getCanvasPoint(stage, position, scale);
        if (point) {
          dragSelectOrigin.current = point;
          setDragSelectRect({ x: point.x, y: point.y, width: 0, height: 0 });
        }
        onSelect(null);
      }
      return;
    }

    // Active tool: delegate to tool interaction
    toolInteractionRef.current?.handleMouseDown(e);
  };

  const handleMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // Middle-click pan — move stage imperatively to avoid per-pixel re-renders
    if (isMiddlePanningRef.current && middlePanStartRef.current) {
      const stage = stageRef.current;
      if (!stage) return;
      const { clientX, clientY, stageX, stageY } = middlePanStartRef.current;
      stage.position({ x: stageX + (e.evt.clientX - clientX), y: stageY + (e.evt.clientY - clientY) });
      return;
    }

    // Calibration mode
    if (isCalibrating && onCalibrationMouseMove) {
      onCalibrationMouseMove(e);
      return;
    }

    // Pathing mode
    if (isPathingMode && onPathingMouseMove) {
      onPathingMouseMove();
      if (!dragSelectOrigin.current) return;
    }

    // Drag-select rectangle
    if (dragSelectOrigin.current && isSelectMode) {
      const stage = stageRef.current;
      if (!stage) return;
      const point = getCanvasPoint(stage, position, scale);
      if (!point) return;
      const o = dragSelectOrigin.current;
      const snapV = (v: number) => Math.round(v / gridSettings.gridSpacing) * gridSettings.gridSpacing;
      const px = gridSettings.snapToGrid ? snapV(point.x) : point.x;
      const py = gridSettings.snapToGrid ? snapV(point.y) : point.y;
      const ox = gridSettings.snapToGrid ? snapV(o.x) : o.x;
      const oy = gridSettings.snapToGrid ? snapV(o.y) : o.y;
      setDragSelectRect({
        x: Math.min(ox, px),
        y: Math.min(oy, py),
        width: Math.abs(px - ox),
        height: Math.abs(py - oy),
      });
      return;
    }

    // Active tool: delegate to tool interaction
    toolInteractionRef.current?.handleMouseMove(e);
  };

  const handleMouseUp = () => {
    // Middle-click pan end — sync stage position back to React state
    if (isMiddlePanningRef.current) {
      const stage = stageRef.current;
      if (stage) onPositionChange(stage.position());
      isMiddlePanningRef.current = false;
      setIsMiddlePanning(false);
      middlePanStartRef.current = null;
      return;
    }

    // Pathing mode
    if (isPathingMode && onPathingMouseUp) {
      onPathingMouseUp();
      return;
    }

    // Complete drag-select
    if (dragSelectOrigin.current && dragSelectRect) {
      if (dragSelectRect.width > 5 && dragSelectRect.height > 5) {
        const rect = dragSelectRect;
        const OVERLAP_THRESHOLD = 0.9;
        const enclosed = data.elements.filter((el) => {
          const elLayer = el.layer ?? ELEMENT_TYPE_TO_LAYER[el.type];
          if (elLayer !== activeLayerId) return false;

          const shape = el.geometry.shape;

          // Line: accurate segment intersection
          if (shape === "line") {
            const geo = el.geometry;
            const [x1, y1, x2, y2] = geo.points;
            return lineIntersectsRect(
              geo.x + x1, geo.y + y1, geo.x + x2, geo.y + y2,
              rect.x, rect.y, rect.width, rect.height
            );
          }

          // Arc: check both segments to/from the control point
          if (shape === "arc") {
            const geo = el.geometry;
            const [x1, y1, cx, cy, x2, y2] = geo.points;
            return (
              lineIntersectsRect(geo.x+x1, geo.y+y1, geo.x+cx, geo.y+cy, rect.x, rect.y, rect.width, rect.height) ||
              lineIntersectsRect(geo.x+cx, geo.y+cy, geo.x+x2, geo.y+y2, rect.x, rect.y, rect.width, rect.height)
            );
          }

          // Polygon: check each edge for intersection with the selection rect
          if (shape === "polygon") {
            const geo = el.geometry;
            const pts = geo.points;
            for (let i = 0; i < pts.length; i += 2) {
              const ni = (i + 2) % pts.length;
              if (lineIntersectsRect(
                geo.x + pts[i], geo.y + pts[i + 1],
                geo.x + pts[ni], geo.y + pts[ni + 1],
                rect.x, rect.y, rect.width, rect.height
              )) return true;
            }
            return false;
          }

          // All other shapes: bounding-box overlap threshold
          const b = getElementBounds(el);
          const elWidth = b.right - b.left;
          const elHeight = b.bottom - b.top;
          if (elWidth <= 0 || elHeight <= 0) return false;

          const overlapX = Math.max(0, Math.min(b.right, rect.x + rect.width) - Math.max(b.left, rect.x));
          const overlapY = Math.max(0, Math.min(b.bottom, rect.y + rect.height) - Math.max(b.top, rect.y));
          const overlapArea = overlapX * overlapY;
          const elArea = elWidth * elHeight;

          return overlapArea / elArea >= OVERLAP_THRESHOLD;
        });
        if (enclosed.length > 0) {
          // Expand selection to include all members of any partially captured group
          const enclosedIds = new Set(enclosed.map((el) => el.id));
          for (const el of enclosed) {
            const gid = el.properties.groupId;
            if (gid) {
              for (const other of data.elements) {
                if (other.properties.groupId === gid) enclosedIds.add(other.id);
              }
            }
          }
          onDragSelect([...enclosedIds]);
        }
      }
      dragSelectOrigin.current = null;
      setDragSelectRect(null);
      return;
    }

    // Active tool: delegate to tool interaction
    toolInteractionRef.current?.handleMouseUp();
  };

  const handleDoubleClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    toolInteractionRef.current?.handleDoubleClick?.(e);
  };

  // --- Element drag handlers (unchanged) ---

  const handleElementDragStart = useCallback(
    (id: string) => {
      startDrag(id);

      if (selectedIds.has(id) && selectedIds.size > 1) {
        setIsMultiDragging(true);
        const stage = stageRef.current;
        if (!stage) return;
        const positions = new Map<string, { x: number; y: number }>();
        for (const sid of selectedIds) {
          const node = stage.findOne(`.${sid}`);
          if (node) {
            positions.set(sid, { x: node.x(), y: node.y() });
          }
        }
        dragStartPositions.current = positions;
      } else {
        dragStartPositions.current = new Map();
      }
    },
    [startDrag, selectedIds, stageRef]
  );

  const handleElementDragMove = useCallback(
    (id: string, x: number, y: number) => {
      const isMulti = selectedIds.has(id) && selectedIds.size > 1;
      const stage = stageRef.current;
      if (!stage) return;

      if (isMulti) {
        const startPos = dragStartPositions.current.get(id);
        if (!startPos) return;

        const dx = x - startPos.x;
        const dy = y - startPos.y;

        for (const sid of selectedIds) {
          if (sid === id) continue;
          const sStart = dragStartPositions.current.get(sid);
          const sNode = stage.findOne(`.${sid}`);
          if (sStart && sNode) {
            sNode.x(sStart.x + dx);
            sNode.y(sStart.y + dy);
          }
        }
      } else {
        const element = data.elements.find((el) => el.id === id);
        if (!element) return;

        let finalX = x;
        let finalY = y;
        let guidesSnappedX = false;
        let guidesSnappedY = false;

        if (snapToObjects) {
          const geo = element.geometry;
          const proposedBounds = getElementBounds({
            ...element,
            geometry: { ...geo, x, y } as typeof geo,
          });

          const anchorOffsetX = x - proposedBounds.left;
          const anchorOffsetY = y - proposedBounds.top;

          const snapped = snapPosition(id, proposedBounds);
          if (snapped.x !== proposedBounds.left) {
            finalX = snapped.x + anchorOffsetX;
            guidesSnappedX = true;
          }
          if (snapped.y !== proposedBounds.top) {
            finalY = snapped.y + anchorOffsetY;
            guidesSnappedY = true;
          }
        }

        if (gridSettings.snapToGrid) {
          const gs = gridSettings.gridSpacing;
          const gridSnapThreshold = gs * 0.25;
          if (!guidesSnappedX) {
            const nearestGridX = Math.round(x / gs) * gs;
            if (Math.abs(x - nearestGridX) < gridSnapThreshold) {
              finalX = nearestGridX;
            }
          }
          if (!guidesSnappedY) {
            const nearestGridY = Math.round(y / gs) * gs;
            if (Math.abs(y - nearestGridY) < gridSnapThreshold) {
              finalY = nearestGridY;
            }
          }
        }

        const node = stage.findOne(`.${id}`);
        if (node) {
          node.x(finalX);
          node.y(finalY);
        }
      }
    },
    [data.elements, snapPosition, stageRef, selectedIds, gridSettings, snapToObjects]
  );

  const handleElementDragEnd = useCallback(
    (id: string, _x: number, _y: number) => {
      endDrag();

      if (selectedIds.has(id) && selectedIds.size > 1) {
        const stage = stageRef.current;
        if (!stage) return;
        const updates: Array<{ id: string; x: number; y: number }> = [];
        for (const sid of selectedIds) {
          const node = stage.findOne(`.${sid}`);
          if (node) {
            updates.push({ id: sid, x: node.x(), y: node.y() });
          }
        }
        onMultiMove(updates);
        dragStartPositions.current = new Map();
        setIsMultiDragging(false);
      } else {
        const stage = stageRef.current;
        const node = stage?.findOne(`.${id}`);
        if (node) {
          onElementMove(id, node.x(), node.y());
        } else {
          onElementMove(id, _x, _y);
        }
      }
    },
    [endDrag, selectedIds, stageRef, onMultiMove, onElementMove]
  );

  // --- Cursor ---
  const cursor = isMiddlePanning || (isPanMode && isStageDragging)
    ? "grabbing"
    : isPanMode
    ? "grab"
    : isCalibrating
      ? "crosshair"
      : isPathingMode
        ? "crosshair"
        : activeTool
          ? activeTool.cursor
          : hoveredElementId && isSelectMode
            ? "move"
            : "default";

  return (
    <div
      ref={containerRef}
      className="flex-1 min-w-0 bg-gray-200 overflow-hidden"
      style={{ cursor }}
    >
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable={isPanMode || (!isPathingMode && isSelectMode && !dragSelectOrigin.current)}
        onWheel={onWheel}
        onDragStart={(e) => {
          if (e.target === stageRef.current) setIsStageDragging(true);
        }}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) setIsStageDragging(false);
          onDragEnd(e);
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onDblClick={handleDoubleClick}
      >
        {/* Background layer: color fill, image, grid */}
        <Layer>
          <Rect
            id="background"
            x={0}
            y={0}
            width={data.dimensions.width}
            height={data.dimensions.height}
            fill={data.backgroundColor ?? "#ffffff"}
            stroke="#d1d5db"
            strokeWidth={1}
          />
          {data.backgroundImage && layerVisibility.get("background") !== false && (
            <BackgroundImage config={data.backgroundImage} />
          )}
          {gridSettings.showGrid && !isPathingMode && (
            <GridLayer
              width={data.dimensions.width}
              height={data.dimensions.height}
              spacing={gridSettings.gridSpacing}
              color={gridSettings.gridColor}
              opacity={gridSettings.gridOpacity}
            />
          )}
        </Layer>

        {/* Element layers: one Konva Layer per floor plan layer */}
        {elementLayerOrder.map((layerId) => {
          const isActiveLayer = layerId === activeLayerId;
          return (
            <Layer key={layerId} visible={layerVisibility.get(layerId) !== false} listening={isActiveLayer}>
              {layerId === "pathing" && data.walkableLayer && (
                <WalkableGridOverlay
                  grid={data.walkableLayer}
                  showGridLines={activeLayerId === "pathing"}
                  opacity={walkableGridOpacity}
                  hoverCell={activeLayerId === "pathing" ? walkableHoverCell : null}
                  pendingCells={pendingCells}
                  pendingValue={pendingValue}
                />
              )}
              {(elementsByLayer.get(layerId) ?? []).map((element) => (
                <ElementShape
                  key={element.id}
                  element={element}
                  isSelectMode={isSelectMode && isActiveLayer}
                  isSelected={selectedIds.has(element.id)}
                  isLinked={!unlinkedElementIds?.has(element.id)}
                  isHovered={isSelectMode && hoveredElementId === element.id}
                  isOverlapping={overlappingElementIds?.has(element.id) ?? false}
                  isDimmed={activeGroupId != null && element.properties.groupId !== activeGroupId}
                  onSelect={onSelect}
                  onDoubleClick={onDoubleClick}
                  onDragStart={handleElementDragStart}
                  onDragMove={handleElementDragMove}
                  onDragEnd={handleElementDragEnd}
                  onContextMenu={onElementContextMenu}
                  onMouseEnter={isSelectMode ? () => setHoveredElementId(element.id) : undefined}
                  onMouseLeave={isSelectMode ? () => setHoveredElementId(null) : undefined}
                />
              ))}
            </Layer>
          );
        })}

        {/* Selection overlay: transformer, multi-select bounds, handles */}
        <Layer>
          {groupSelectionGroupId && groupMemberElements && onGroupTransformEnd ? (
            <GroupTransformer
              groupId={groupSelectionGroupId}
              memberElements={groupMemberElements}
              onGroupTransformEnd={onGroupTransformEnd}
            />
          ) : (
            <>
              <SelectionTransformer
                selectedIds={selectedIds}
                stageRef={stageRef}
                elements={data.elements}
                onTransformEnd={onElementResize}
                visible={showTransformControls}
              />
              {!isMultiDragging && (
                <MultiSelectBounds
                  elements={data.elements}
                  selectedIds={selectedIds}
                />
              )}
            </>
          )}
          {/* Boundary outline shown while inside an entered group */}
          {activeGroupElements && activeGroupElements.length > 0 && (() => {
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            for (const el of activeGroupElements) {
              const b = getElementBounds(el);
              minX = Math.min(minX, b.left); minY = Math.min(minY, b.top);
              maxX = Math.max(maxX, b.right); maxY = Math.max(maxY, b.bottom);
            }
            const pad = 6;
            return (
              <Rect
                x={minX - pad} y={minY - pad}
                width={maxX - minX + pad * 2} height={maxY - minY + pad * 2}
                stroke="#007bff" strokeWidth={1} opacity={0.4}
                dash={[6, 4]} listening={false}
              />
            );
          })()}
          {HandleComponent && selectedElement && (
            <HandleComponent
              element={selectedElement}
              onGeometryUpdate={onGeometryUpdate}
            />
          )}
        </Layer>

        {/* Drawing overlay: tool preview, guides, drag-select rect */}
        <Layer>
          {/* Tool preview is rendered inside ToolHost */}
          {activeTool && (
            <ToolHost
              key={activeTool.id}
              tool={activeTool}
              context={toolContext}
              onInteraction={handleToolInteraction}
            />
          )}
          <AlignmentGuides
            guides={activeGuides}
            canvasWidth={data.dimensions.width}
            canvasHeight={data.dimensions.height}
          />
          <SelectionRect rect={dragSelectRect} />
          {isCalibrating && calibrationState && (
            <CalibrationPreview
              calibrationState={calibrationState}
              existingCalibration={existingCalibration}
              scale={scale}
            />
          )}
          {pathingRectPreview && data.walkableLayer && (
            <Rect
              x={Math.min(pathingRectPreview.startCol, pathingRectPreview.endCol) * data.walkableLayer.cellSize}
              y={Math.min(pathingRectPreview.startRow, pathingRectPreview.endRow) * data.walkableLayer.cellSize}
              width={(Math.abs(pathingRectPreview.endCol - pathingRectPreview.startCol) + 1) * data.walkableLayer.cellSize}
              height={(Math.abs(pathingRectPreview.endRow - pathingRectPreview.startRow) + 1) * data.walkableLayer.cellSize}
              fill="rgba(34, 197, 94, 0.2)"
              stroke="rgba(34, 197, 94, 0.8)"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}

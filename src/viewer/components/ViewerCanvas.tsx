import { useLayoutEffect, useRef, useState } from "react";
import { Stage, Layer, Rect } from "react-konva";
import type { FloorPlanData } from "../../types";
import { useCanvasControls } from "../../editor/hooks/useCanvasControls";
import { BackgroundImage } from "../../editor/components/canvas/BackgroundImage";
import type { ViewerMode, HoveredItem } from "../types";
import { ViewerElement } from "./ViewerElement";
import { RouteOverlay } from "./RouteOverlay";
import { ScaleBar } from "./ScaleBar";
import { ViewerLegend } from "./ViewerLegend";

interface ViewerCanvasProps {
  data: FloorPlanData;
  mode: ViewerMode;
  occupiedBoothSlugs: Set<string>;
  highlightedElementId: string | null;
  searchMatchIds: Set<string> | null;
  routePath: { x: number; y: number }[] | null;
  onElementClick: (item: HoveredItem, screenX: number, screenY: number) => void;
}

export function ViewerCanvas({ data, mode, occupiedBoothSlugs, highlightedElementId, searchMatchIds, routePath, onElementClick }: ViewerCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const isSearching = !!searchMatchIds && searchMatchIds.size > 0;
  const {
    stageRef,
    scale,
    position,
    stageSize,
    hasMeasured,
    fitToBounds,
    handleWheel,
    handleDragEnd,
  } = useCanvasControls(containerRef);

  // On first load, fit the whole plan in the viewport (centered, with a margin)
  // rather than pinning it to the top-left. useLayoutEffect so it's applied
  // before the browser paints (no zoom/pan flash).
  const didFit = useRef(false);
  useLayoutEffect(() => {
    if (didFit.current || !hasMeasured) return;
    didFit.current = true;
    fitToBounds(
      { width: data.dimensions.width, height: data.dimensions.height },
      { padding: 48, maxScale: 1 },
    );
  }, [hasMeasured, fitToBounds, data.dimensions.width, data.dimensions.height]);

  const sortedElements = [...data.elements].sort(
    (a, b) => (a.properties.zIndex ?? 0) - (b.properties.zIndex ?? 0)
  );

  const hasHighlight = highlightedElementId !== null;

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0 bg-gray-200 overflow-hidden">
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scaleX={scale}
        scaleY={scale}
        x={position.x}
        y={position.y}
        draggable
        onWheel={handleWheel}
        onDragEnd={handleDragEnd}
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={data.dimensions.width}
            height={data.dimensions.height}
            fill="#ffffff"
            stroke="#d1d5db"
            strokeWidth={1}
          />
          {data.backgroundImage && (
            <BackgroundImage config={data.backgroundImage} />
          )}
        </Layer>

        <Layer>
          {sortedElements.map((element) => {
            const isBooth = element.type === "booth";
            const isSessionArea = element.type === "session_area";
            const isMeetingRoom = element.type === "meeting_room";
            const isInteractive = isBooth || isSessionArea || isMeetingRoom;
            const boothSlug = element.properties.boothSlug ?? "";
            const isOccupied = isBooth && boothSlug ? occupiedBoothSlugs.has(boothSlug) : false;

            // In attendee mode, unoccupied booths are faded and non-interactive
            const isInert = mode === "attendee" && isBooth && !isOccupied;

            const isSelected = element.id === highlightedElementId;
            const isSearchMatch = isInteractive && isSearching && searchMatchIds!.has(element.id);
            const isHovered = element.id === hoveredElementId;
            const highlighted = isSelected || !!isSearchMatch;
            const dimmed =
              isInert ||
              (mode === "exhibitor" && isBooth && isOccupied && !highlighted) ||
              (hasHighlight && !isSelected) ||
              (isSearching && !isSearchMatch && !isSelected);

            const buildClickItem = (): HoveredItem | null => {
              if (isBooth && boothSlug) {
                return { type: "booth", elementId: element.id, boothSlug };
              }
              if (isSessionArea) {
                return { type: "session_area", elementId: element.id, sessionId: element.properties.sessionId ?? null };
              }
              if (isMeetingRoom) {
                return { type: "meeting_room", elementId: element.id, meetingRoomId: element.properties.meetingRoomId ?? null };
              }
              return null;
            };

            return (
              <ViewerElement
                key={element.id}
                element={element}
                isHighlighted={highlighted}
                isDimmed={dimmed}
                isHovered={isHovered && !highlighted && !isInert}

                onMouseEnter={!isInert && isInteractive ? () => setHoveredElementId(element.id) : undefined}
                onMouseLeave={!isInert && isInteractive ? () => setHoveredElementId(null) : undefined}
                onClick={!isInert && isInteractive ? (e) => {
                  const item = buildClickItem();
                  if (item) onElementClick(item, e.screenX, e.screenY);
                } : undefined}
              />
            );
          })}
        </Layer>

        {routePath && <RouteOverlay path={routePath} />}
      </Stage>
      <ScaleBar dimensions={data.dimensions} scale={scale} />
      <ViewerLegend legend={data.legend} />
    </div>
  );
}

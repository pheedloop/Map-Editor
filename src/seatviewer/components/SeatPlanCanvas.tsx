import { useRef, useState, type ReactNode } from "react";
import { Stage, Layer, Rect } from "react-konva";
import type { FloorPlanData } from "../../types";
import { useCanvasControls } from "../../editor/hooks/useCanvasControls";
import { BackgroundImage } from "../../editor/components/canvas/BackgroundImage";
import { ViewerElement } from "../../viewer/components/ViewerElement";

export interface SeatPlanCanvasProps {
  data: FloorPlanData;
  /**
   * Fill color for a table, keyed by its `properties.tableCode`. Return undefined
   * to fall back to the element's own color. Typically an occupancy color.
   */
  getTableColor?: (tableCode: string) => string | undefined;
  /** Table (by code) drawn with selection emphasis. */
  highlightedTableCode?: string | null;
  /** Tables (by code) de-emphasized — e.g. not eligible for the current selection. */
  dimmedTableCodes?: ReadonlySet<string> | null;
  /** Fired when an interactive table is clicked. */
  onTableClick?: (tableCode: string) => void;
  /** Fired when empty canvas (anything other than an interactive table) is clicked. */
  onBackgroundClick?: () => void;
  /** Overlay content positioned within the canvas region (e.g. the table dialog). */
  children?: ReactNode;
}

/**
 * Read-only Konva canvas for seat plans. Renders a FloorPlanData and makes
 * `type: "table"` elements interactive (occupancy fill, dim, select, click).
 * Non-table elements render as static context. Reuses the shared ViewerElement
 * renderer and the editor's pan/zoom controls.
 */
export function SeatPlanCanvas({
  data,
  getTableColor,
  highlightedTableCode,
  dimmedTableCodes,
  onTableClick,
  onBackgroundClick,
  children,
}: SeatPlanCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredTableCode, setHoveredTableCode] = useState<string | null>(null);
  const { stageRef, scale, position, stageSize, handleWheel, handleDragEnd } =
    useCanvasControls(containerRef);

  const sortedElements = [...data.elements].sort(
    (a, b) => (a.properties.zIndex ?? 0) - (b.properties.zIndex ?? 0)
  );

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
        onClick={() => onBackgroundClick?.()}
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
          {data.backgroundImage && <BackgroundImage config={data.backgroundImage} />}
        </Layer>

        <Layer>
          {sortedElements.map((element) => {
            const isTable = element.type === "table";
            const tableCode = element.properties.tableCode ?? null;
            const interactive = isTable && !!tableCode;

            const overrideColor =
              interactive && getTableColor ? getTableColor(tableCode!) : undefined;
            const isHighlighted = interactive && tableCode === highlightedTableCode;
            const isDimmed = interactive && !!dimmedTableCodes?.has(tableCode!);
            const isHovered = interactive && tableCode === hoveredTableCode;

            return (
              <ViewerElement
                key={element.id}
                element={element}
                isHighlighted={!!isHighlighted}
                isDimmed={isDimmed}
                isHovered={!!isHovered && !isHighlighted}
                overrideColor={overrideColor}
                onMouseEnter={interactive ? () => setHoveredTableCode(tableCode) : undefined}
                onMouseLeave={interactive ? () => setHoveredTableCode(null) : undefined}
                onClick={
                  interactive && onTableClick ? () => onTableClick(tableCode!) : undefined
                }
              />
            );
          })}
        </Layer>
      </Stage>
      {children}
    </div>
  );
}

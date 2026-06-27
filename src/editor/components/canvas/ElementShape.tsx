import { Group } from "react-konva";
import type { FloorPlanElement } from "../../../types";
import { RectShape } from "./elements/RectShape";
import { EllipseShape } from "./elements/EllipseShape";
import { LineShape } from "./elements/LineShape";
import { ArrowShape } from "./elements/ArrowShape";
import { ArcShape } from "./elements/ArcShape";
import { PolygonShape } from "./elements/PolygonShape";
import { BoothShape } from "./elements/BoothShape";
import { SessionAreaShape } from "./elements/SessionAreaShape";
import { MeetingRoomShape } from "./elements/MeetingRoomShape";
import { TableShape } from "./elements/TableShape";
import { TextShape } from "./elements/TextShape";
import { IconShape } from "./elements/IconShape";

interface ElementShapeProps {
  element: FloorPlanElement;
  isSelectMode: boolean;
  isSelected: boolean;
  isLinked: boolean;
  isHovered?: boolean;
  isOverlapping?: boolean;
  onSelect: (id: string, shiftKey?: boolean) => void;
  onDragStart: (id: string) => void;
  onDragMove: (id: string, x: number, y: number) => void;
  onDragEnd: (id: string, x: number, y: number) => void;
  onContextMenu: (elementId: string, screenX: number, screenY: number) => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  isDimmed?: boolean;
  onDoubleClick?: (id: string) => void;
}

function getLabel(element: FloorPlanElement): string {
  return element.properties.name || "";
}

export function ElementShape({
  element,
  isSelectMode,
  isSelected: _isSelected,
  isLinked,
  isHovered = false,
  isOverlapping = false,
  onSelect,
  onDragStart,
  onDragMove,
  onDragEnd,
  onContextMenu,
  onMouseEnter,
  onMouseLeave,
  isDimmed = false,
  onDoubleClick,
}: ElementShapeProps) {
  const geo = element.geometry;
  const label = getLabel(element);
  const color = element.properties.color;
  const strokeColor = isOverlapping
    ? "#dc2626"
    : isHovered
      ? "#007bff"
      : (element.properties.strokeColor || "#888888");
  const strokeWidth = (isOverlapping || isHovered)
    ? Math.max((element.properties.strokeWidth ?? 1) * 1.5, 2)
    : (element.properties.strokeWidth ?? (geo.shape === "line" || geo.shape === "arrow" ? 2 : 1));

  const x = "x" in geo ? geo.x : 0;
  const y = "y" in geo ? geo.y : 0;
  const rotation = "rotation" in geo ? (geo.rotation ?? 0) : 0;

  return (
    <Group
      name={element.id}
      x={x}
      y={y}
      rotation={rotation}
      opacity={isDimmed ? 0.35 : (element.properties.opacity ?? 1)}
      listening={!isDimmed}
      draggable={isSelectMode && !isDimmed}
      onClick={(e) => {
        if (!isSelectMode) return;
        e.cancelBubble = true;
        onSelect(element.id, e.evt.shiftKey);
      }}
      onDblClick={(e) => {
        if (!isSelectMode) return;
        e.cancelBubble = true;
        onDoubleClick?.(element.id);
      }}
      onDragStart={() => {
        onDragStart(element.id);
      }}
      onDragMove={(e) => {
        onDragMove(element.id, e.target.x(), e.target.y());
      }}
      onDragEnd={(e) => {
        onDragEnd(element.id, e.target.x(), e.target.y());
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        e.cancelBubble = true;
        onContextMenu(element.id, e.evt.clientX, e.evt.clientY);
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {element.type === "booth" && (geo.shape === "rect" || geo.shape === "polygon" || geo.shape === "ellipse" || geo.shape === "circle") && (
        <BoothShape
          geo={geo}
          color={color}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          properties={element.properties}
          isLinked={isLinked}
        />
      )}
      {element.type === "session_area" && (geo.shape === "rect" || geo.shape === "polygon" || geo.shape === "ellipse" || geo.shape === "circle") && (
        <SessionAreaShape
          geo={geo}
          color={color}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          properties={element.properties}
          isLinked={isLinked}
        />
      )}
      {element.type === "meeting_room" && (geo.shape === "rect" || geo.shape === "polygon" || geo.shape === "ellipse" || geo.shape === "circle") && (
        <MeetingRoomShape
          geo={geo}
          color={color}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          properties={element.properties}
          isLinked={isLinked}
        />
      )}
      {element.type === "table" && (geo.shape === "rect" || geo.shape === "polygon" || geo.shape === "ellipse" || geo.shape === "circle") && (
        <TableShape
          geo={geo}
          color={color}
          strokeColor={strokeColor}
          strokeWidth={strokeWidth}
          properties={element.properties}
          isLinked={isLinked}
        />
      )}
      {element.type === "label" && geo.shape === "rect" && (
        <TextShape
          geo={geo}
          text={element.properties.text || "Text"}
          color={color}
          fontSize={element.properties.fontSize ?? 16}
          fontWeight={element.properties.fontWeight ?? "normal"}
          fontStyle={element.properties.fontStyle ?? "normal"}
          textDecoration={element.properties.textDecoration ?? "none"}
          textAlign={element.properties.textAlign ?? "left"}
        />
      )}
      {element.type === "icon" && geo.shape === "rect" && element.properties.iconName && (
        <IconShape geo={geo} iconName={element.properties.iconName} color={color} />
      )}
      {element.type !== "booth" && element.type !== "session_area" && element.type !== "meeting_room" && element.type !== "table" && element.type !== "label" && element.type !== "icon" && geo.shape === "rect" && (
        <RectShape geo={geo} color={color} strokeColor={strokeColor} strokeWidth={strokeWidth} label={label} properties={element.properties} />
      )}
      {geo.shape === "ellipse" && element.type !== "booth" && element.type !== "session_area" && element.type !== "meeting_room" && element.type !== "table" && (
        <EllipseShape geo={geo} color={color} strokeColor={strokeColor} strokeWidth={strokeWidth} label={label} properties={element.properties} />
      )}
      {geo.shape === "line" && (
        <LineShape geo={geo} color={color} strokeWidth={strokeWidth} />
      )}
      {geo.shape === "arrow" && (
        <ArrowShape
          geo={geo}
          color={color}
          strokeWidth={strokeWidth}
          arrowHead={element.properties.arrowHead ?? { style: "triangle", size: 12 }}
        />
      )}
      {geo.shape === "arc" && (
        <ArcShape geo={geo} color={color} strokeWidth={strokeWidth} />
      )}
      {geo.shape === "polygon" && element.type !== "booth" && element.type !== "session_area" && element.type !== "meeting_room" && element.type !== "table" && (
        <PolygonShape geo={geo} color={color} strokeColor={strokeColor} strokeWidth={strokeWidth} />
      )}
    </Group>
  );
}

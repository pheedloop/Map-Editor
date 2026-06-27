import { useState, useEffect } from "react";
import { Group, Rect, Text, Ellipse, Line, Arrow, Shape, Image as KonvaImage } from "react-konva";
import type {
  FloorPlanElement,
  RectGeometry,
  EllipseGeometry,
  LineGeometry,
  ArcGeometry,
  PolygonGeometry,
} from "../../types";
import { getIconEntry } from "../../editor/utils/iconRegistry";
import { iconToImage } from "../../editor/utils/iconToImage";

export function ViewerIcon({ iconName, color, width, height }: { iconName: string; color: string; width: number; height: number }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const entry = getIconEntry(iconName);
    if (!entry) return;
    iconToImage(entry.component, color, 128, setImage);
  }, [iconName, color]);
  if (!image) return null;
  return <KonvaImage image={image} width={width} height={height} />;
}

export function getLabel(element: FloorPlanElement): string {
  return element.properties.name || "";
}

/**
 * Read-only render of a single FloorPlanElement on a Konva layer. Shared by the
 * booth MapViewer (ViewerCanvas) and the SeatPlanViewer (SeatPlanCanvas).
 *
 * Visual state is driven entirely by props so each viewer can map its own domain
 * meaning onto them:
 *  - overrideColor — replaces the element's fill (e.g. occupancy color for tables)
 *  - isHighlighted — selection/search emphasis (blue stroke)
 *  - isDimmed      — de-emphasis (e.g. ineligible tables, unmatched search)
 */
export function ViewerElement({
  element,
  isHighlighted,
  isDimmed,
  isHovered,
  overrideColor,
  onMouseEnter,
  onMouseLeave,
  onClick,
}: {
  element: FloorPlanElement;
  isHighlighted: boolean;
  isDimmed: boolean;
  isHovered: boolean;
  overrideColor?: string;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onClick?: (e: { screenX: number; screenY: number }) => void;
}) {
  const geo = element.geometry;
  const label = getLabel(element);
  const color = overrideColor || element.properties.color;
  const active = isHighlighted || isHovered;
  const strokeColor = active ? "#007bff" : (element.properties.strokeColor || "#888888");
  const strokeWidth = active
    ? Math.max((element.properties.strokeWidth ?? 1) * 2, 3)
    : (element.properties.strokeWidth ?? (geo.shape === "line" ? 2 : 1));
  const baseOpacity = element.properties.opacity ?? 1;
  const opacity = isDimmed ? baseOpacity * 0.4 : baseOpacity;

  const x = "x" in geo ? geo.x : 0;
  const y = "y" in geo ? geo.y : 0;
  const rotation = "rotation" in geo ? (geo.rotation ?? 0) : 0;

  return (
    <Group
      x={x}
      y={y}
      rotation={rotation}
      opacity={opacity}
      onMouseEnter={(e) => {
        if (onMouseEnter) {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "pointer";
          onMouseEnter();
        }
      }}
      onMouseLeave={(e) => {
        if (onMouseLeave) {
          const stage = e.target.getStage();
          if (stage) stage.container().style.cursor = "default";
          onMouseLeave();
        }
      }}
      onClick={(e) => {
        if (onClick) {
          e.cancelBubble = true;
          onClick({ screenX: e.evt.clientX, screenY: e.evt.clientY });
        }
      }}
    >
      {geo.shape === "rect" && element.type !== "icon" && element.type !== "label" && (
        <>
          <Rect
            width={geo.width}
            height={(geo as RectGeometry).height}
            fill={color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            cornerRadius={2}
            opacity={0.9}
          />
          {label && element.properties.labelVisible !== false && (
            <Text
              text={label}
              width={geo.width}
              height={(geo as RectGeometry).height}
              align={element.properties.labelPositionH ?? "center"}
              verticalAlign={element.properties.labelPositionV ?? "middle"}
              padding={4}
              fontSize={element.properties.labelFontSize ?? 12}
              fill={element.properties.labelColor ?? "#fff"}
              fontStyle={`${element.properties.labelBold !== false ? "bold" : ""}${element.properties.labelItalic ? " italic" : ""}`.trim() || "normal"}
              textDecoration={element.properties.labelUnderline ? "underline" : ""}
              listening={false}
            />
          )}
        </>
      )}
      {geo.shape === "ellipse" && (
        <>
          <Ellipse
            x={(geo as EllipseGeometry).radiusX}
            y={(geo as EllipseGeometry).radiusY}
            radiusX={(geo as EllipseGeometry).radiusX}
            radiusY={(geo as EllipseGeometry).radiusY}
            fill={color}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            opacity={0.9}
          />
          {label && element.properties.labelVisible !== false && (
            <Text
              width={(geo as EllipseGeometry).radiusX * 2}
              height={(geo as EllipseGeometry).radiusY * 2}
              align={element.properties.labelPositionH ?? "center"}
              verticalAlign={element.properties.labelPositionV ?? "middle"}
              padding={4}
              text={label}
              fontSize={element.properties.labelFontSize ?? 12}
              fill={element.properties.labelColor ?? "#fff"}
              fontStyle={`${element.properties.labelBold !== false ? "bold" : ""}${element.properties.labelItalic ? " italic" : ""}`.trim() || "normal"}
              textDecoration={element.properties.labelUnderline ? "underline" : ""}
              listening={false}
            />
          )}
        </>
      )}
      {geo.shape === "line" && !element.properties.arrowHead && (
        <Line
          points={[...(geo as LineGeometry).points]}
          stroke={color}
          strokeWidth={strokeWidth}
          lineCap="round"
        />
      )}
      {geo.shape === "line" && element.properties.arrowHead && (
        <Arrow
          points={[...(geo as LineGeometry).points]}
          stroke={color}
          strokeWidth={strokeWidth}
          pointerLength={element.properties.arrowHead.size}
          pointerWidth={element.properties.arrowHead.size * 0.8}
          fill={element.properties.arrowHead.style === "triangle" ? color : ""}
          lineCap="round"
        />
      )}
      {geo.shape === "arrow" && (() => {
        const arrowGeo = geo as import("../../types").ArrowGeometry;
        const pts = arrowGeo.points;
        const arrowHead = element.properties.arrowHead ?? { style: "triangle" as const, size: 12 };
        if (arrowHead.style === "chevron" && pts.length >= 4) {
          const n = pts.length;
          const x2 = pts[n - 2], y2 = pts[n - 1];
          const x1 = pts[n - 4], y1 = pts[n - 3];
          const theta = Math.atan2(y2 - y1, x2 - x1);
          const wing = Math.PI / 5;
          const s = arrowHead.size;
          return (
            <>
              <Line points={pts} stroke={color} strokeWidth={strokeWidth} lineCap="round" />
              <Line
                points={[
                  x2 - s * Math.cos(theta - wing), y2 - s * Math.sin(theta - wing),
                  x2, y2,
                  x2 - s * Math.cos(theta + wing), y2 - s * Math.sin(theta + wing),
                ]}
                stroke={color}
                strokeWidth={strokeWidth}
                lineCap="round"
                lineJoin="round"
              />
            </>
          );
        }
        return (
          <Arrow
            points={[...pts]}
            stroke={color}
            strokeWidth={strokeWidth}
            fill={color}
            pointerLength={arrowHead.size}
            pointerWidth={arrowHead.size * 0.8}
            lineCap="round"
          />
        );
      })()}
      {geo.shape === "arc" && (() => {
        const arcGeo = geo as ArcGeometry;
        const [x1, y1, cx, cy, x2, y2] = arcGeo.points;
        return (
          <Shape
            sceneFunc={(ctx, shape) => {
              ctx.beginPath();
              ctx.moveTo(x1, y1);
              ctx.quadraticCurveTo(cx, cy, x2, y2);
              ctx.fillStrokeShape(shape);
            }}
            stroke={color}
            strokeWidth={strokeWidth}
            lineCap="round"
          />
        );
      })()}
      {geo.shape === "polygon" && (() => {
        const pts = (geo as PolygonGeometry).points;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (let i = 0; i < pts.length; i += 2) {
          if (pts[i] < minX) minX = pts[i];
          if (pts[i] > maxX) maxX = pts[i];
          if (pts[i + 1] < minY) minY = pts[i + 1];
          if (pts[i + 1] > maxY) maxY = pts[i + 1];
        }
        const polyW = maxX - minX;
        const polyH = maxY - minY;
        return (
          <>
            <Line
              points={[...pts]}
              closed
              fill={color}
              stroke={strokeColor}
              strokeWidth={strokeWidth}
            />
            {label && element.properties.labelVisible !== false && (
              <Text
                x={isFinite(minX) ? minX : 0}
                y={isFinite(minY) ? minY : 0}
                width={isFinite(polyW) ? polyW : 0}
                height={isFinite(polyH) ? polyH : 0}
                align={element.properties.labelPositionH ?? "center"}
                verticalAlign={element.properties.labelPositionV ?? "middle"}
                padding={4}
                text={label}
                fontSize={element.properties.labelFontSize ?? 12}
                fill={element.properties.labelColor ?? "#fff"}
                fontStyle={`${element.properties.labelBold !== false ? "bold" : ""}${element.properties.labelItalic ? " italic" : ""}`.trim() || "normal"}
                textDecoration={element.properties.labelUnderline ? "underline" : ""}
                listening={false}
              />
            )}
          </>
        );
      })()}
      {element.type === "label" && geo.shape === "rect" && (() => {
        const g = geo as RectGeometry;
        const parts: string[] = [];
        if (element.properties.fontWeight === "bold") parts.push("bold");
        if (element.properties.fontStyle === "italic") parts.push("italic");
        return (
          <Text
            text={element.properties.text ?? ""}
            width={g.width}
            height={g.height}
            fill={color}
            fontSize={element.properties.fontSize ?? 14}
            fontStyle={parts.length > 0 ? parts.join(" ") : "normal"}
            textDecoration={element.properties.textDecoration === "underline" ? "underline" : ""}
            align={element.properties.textAlign ?? "left"}
            verticalAlign="middle"
            listening={false}
          />
        );
      })()}
      {element.type === "icon" && geo.shape === "rect" && element.properties.iconName && (
        <ViewerIcon
          iconName={element.properties.iconName}
          color={color}
          width={geo.width}
          height={(geo as RectGeometry).height}
        />
      )}
    </Group>
  );
}

import { PiPolygon } from "react-icons/pi";
import type { ToolDefinition } from "./types";
import { usePolygonInteraction } from "./hooks/usePolygonInteraction";
import type { PolygonToolState } from "./hooks/usePolygonInteraction";
import { PolygonPreview } from "./previews/PolygonPreview";
import { PolygonVertexHandles } from "./handles/PolygonVertexHandles";

export const polygonTool: ToolDefinition<PolygonToolState> = {
  id: "polygon",
  label: "Polygon",
  shortcut: "P",
  icon: <PiPolygon size={20} />,
  cursor: "crosshair",

  useInteraction: (ctx) =>
    usePolygonInteraction(ctx, (polygon, { defaults }) => ({
      type: "element",
      element: {
        id: crypto.randomUUID(),
        type: "shape",
        geometry: {
          shape: "polygon",
          x: polygon.anchorX,
          y: polygon.anchorY,
          points: polygon.points,
        },
        properties: {
          name: "Polygon",
          color: defaults.fill,
          strokeColor: defaults.stroke,
          strokeWidth: defaults.strokeWidth,
          zIndex: 1,
        },
      },
    })),

  PreviewComponent: PolygonPreview,
  HandleComponent: PolygonVertexHandles,

  ownsGeometry: ["polygon"],
  optionsBar: ["fill", "stroke", "strokeWidth"],
  propertiesPanel: ["name"],
  contextMenu: ["delete"],
};

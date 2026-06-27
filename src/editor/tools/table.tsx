import { PiArmchair } from "react-icons/pi";
import type { ToolDefinition } from "./types";
import { useClickDragInteraction } from "./hooks/useClickDragInteraction";
import type { DrawingRect } from "./hooks/useClickDragInteraction";
import { RectPreview } from "./previews/RectPreview";

export const tableTool: ToolDefinition<DrawingRect | null> = {
  id: "table",
  label: "Table",
  shortcut: "T",
  icon: <PiArmchair size={20} />,
  cursor: "crosshair",

  useInteraction: (ctx) =>
    useClickDragInteraction(ctx, (rect, { defaults }) => ({
      type: "element",
      element: {
        id: crypto.randomUUID(),
        type: "table",
        geometry: {
          shape: "rect",
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        properties: {
          name: "Table",
          color: "#14b8a6",
          strokeColor: defaults.stroke,
          strokeWidth: defaults.strokeWidth,
          zIndex: 1,
          capacity: null,
        },
      },
    })),

  PreviewComponent: RectPreview,

  ownsElementType: "table",
  ownsGeometry: ["rect"],
  optionsBar: ["fill", "stroke", "strokeWidth"],
  propertiesPanel: ["name", "capacity", "width", "height", "rotation"],
  contextMenu: ["convertToObject", "convertToShape", "delete"],
};

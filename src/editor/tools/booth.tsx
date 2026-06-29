import { PiStorefront } from "react-icons/pi";
import type { ToolDefinition } from "./types";
import { useClickDragInteraction } from "./hooks/useClickDragInteraction";
import type { DrawingRect } from "./hooks/useClickDragInteraction";
import { RectPreview } from "./previews/RectPreview";

export const boothTool: ToolDefinition<DrawingRect | null> = {
  id: "booth",
  label: "Booth",
  shortcut: "B",
  icon: <PiStorefront size={20} />,
  cursor: "crosshair",

  useInteraction: (ctx) =>
    useClickDragInteraction(ctx, (rect, { defaults }) => ({
      type: "element",
      element: {
        id: crypto.randomUUID(),
        type: "booth",
        geometry: {
          shape: "rect",
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        properties: {
          name: "Booth",
          color: defaults.fill,
          strokeColor: defaults.stroke,
          strokeWidth: defaults.strokeWidth,
          zIndex: 1,
          area: rect.width * rect.height,
        },
      },
    })),

  PreviewComponent: RectPreview,

  ownsElementType: "booth",
  ownsGeometry: ["rect"],
  optionsBar: ["fill", "stroke", "strokeWidth"],
  propertiesPanel: ["name", "width", "height", "rotation", "area"],
  contextMenu: ["delete"],
};

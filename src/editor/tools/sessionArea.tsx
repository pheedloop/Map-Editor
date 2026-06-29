import { PiMicrophone } from "react-icons/pi";
import type { ToolDefinition } from "./types";
import { useClickDragInteraction } from "./hooks/useClickDragInteraction";
import type { DrawingRect } from "./hooks/useClickDragInteraction";
import { RectPreview } from "./previews/RectPreview";

export const sessionAreaTool: ToolDefinition<DrawingRect | null> = {
  id: "session_area",
  label: "Session Location",
  shortcut: "S",
  icon: <PiMicrophone size={20} />,
  cursor: "crosshair",

  useInteraction: (ctx) =>
    useClickDragInteraction(ctx, (rect, { defaults }) => ({
      type: "element",
      element: {
        id: crypto.randomUUID(),
        type: "session_area",
        geometry: {
          shape: "rect",
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        properties: {
          name: "Session",
          color: "#27AE60",
          strokeColor: defaults.stroke,
          strokeWidth: defaults.strokeWidth,
          zIndex: 1,
          capacity: null,
          area: rect.width * rect.height,
        },
      },
    })),

  PreviewComponent: RectPreview,

  ownsElementType: "session_area",
  ownsGeometry: ["rect", "polygon"],
  optionsBar: ["fill", "stroke", "strokeWidth"],
  propertiesPanel: ["name", "capacity", "width", "height", "rotation", "area"],
  contextMenu: ["delete"],
};

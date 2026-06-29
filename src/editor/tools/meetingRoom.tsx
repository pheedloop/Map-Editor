import { PiDoor } from "react-icons/pi";
import type { ToolDefinition } from "./types";
import { useClickDragInteraction } from "./hooks/useClickDragInteraction";
import type { DrawingRect } from "./hooks/useClickDragInteraction";
import { RectPreview } from "./previews/RectPreview";

export const meetingRoomTool: ToolDefinition<DrawingRect | null> = {
  id: "meeting_room",
  label: "Meeting Room",
  shortcut: "N",
  icon: <PiDoor size={20} />,
  cursor: "crosshair",

  useInteraction: (ctx) =>
    useClickDragInteraction(ctx, (rect, { defaults }) => ({
      type: "element",
      element: {
        id: crypto.randomUUID(),
        type: "meeting_room",
        geometry: {
          shape: "rect",
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        properties: {
          name: "Meeting Room",
          color: "#F39C12",
          strokeColor: defaults.stroke,
          strokeWidth: defaults.strokeWidth,
          zIndex: 1,
          capacity: null,
          area: rect.width * rect.height,
        },
      },
    })),

  PreviewComponent: RectPreview,

  ownsElementType: "meeting_room",
  ownsGeometry: ["rect", "polygon"],
  optionsBar: ["fill", "stroke", "strokeWidth"],
  propertiesPanel: ["name", "capacity", "meetingRoomId", "width", "height", "rotation", "area"],
  contextMenu: ["delete"],
};

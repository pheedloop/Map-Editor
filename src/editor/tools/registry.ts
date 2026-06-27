import type { ToolDefinition, OptionsBarField, PropertiesPanelField, ContextMenuAction } from "./types";
import { rectangleTool } from "./rectangle";
import { ellipseTool } from "./ellipse";
import { lineTool } from "./line";
import { arrowTool } from "./arrow";
import { arcTool } from "./arc";
import { polygonTool } from "./polygon";
import { textTool } from "./text";
import { iconTool } from "./icon";
import { measureTool } from "./measure";
import { boothTool } from "./booth";
import { sessionAreaTool } from "./sessionArea";
import { meetingRoomTool } from "./meetingRoom";
import { tableTool } from "./table";

// Order determines toolbar display order.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOOL_REGISTRY: ToolDefinition<any>[] = [
  rectangleTool,
  ellipseTool,
  lineTool,
  arrowTool,
  arcTool,
  polygonTool,
  textTool,
  iconTool,
  measureTool,
];

/**
 * Extended registry used only for element → UI config lookups.
 * Includes placement-type tools (booth, session_area, meeting_room) which are
 * not in the drawing toolbar but still own element types and define their
 * properties panel / options bar / context menu config.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ELEMENT_TYPE_CONFIG_REGISTRY: ToolDefinition<any>[] = [
  ...TOOL_REGISTRY,
  boothTool,
  sessionAreaTool,
  meetingRoomTool,
  tableTool,
];

// O(1) lookup by tool id
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const TOOL_MAP = new Map<string, ToolDefinition<any>>(
  TOOL_REGISTRY.map((t) => [t.id, t])
);

// ---------------------------------------------------------------------------
// Lookup helpers — replace the old getShapeConfig() function
// ---------------------------------------------------------------------------

export interface ShapeUIConfig {
  optionsBar: OptionsBarField[];
  propertiesPanel: PropertiesPanelField[];
  contextMenu: ContextMenuAction[];
}

/**
 * Find the tool definition that owns a given element.
 * Checks ownsElementType first (booth, label, icon), then ownsGeometry.
 */
export function findToolForElement(
  geometryShape: string,
  elementType?: string
): ToolDefinition | undefined {
  if (elementType) {
    const byType = ELEMENT_TYPE_CONFIG_REGISTRY.find((t) => t.ownsElementType === elementType);
    if (byType) return byType;
  }
  return ELEMENT_TYPE_CONFIG_REGISTRY.find((t) => t.ownsGeometry?.includes(geometryShape));
}

/**
 * Get UI config (options bar, properties panel, context menu) for an element.
 * Replacement for the old getShapeConfig().
 */
export function getToolUIConfig(
  geometryShape: string,
  elementType?: string
): ShapeUIConfig {
  const tool = findToolForElement(geometryShape, elementType);
  if (tool) {
    return {
      optionsBar: tool.optionsBar,
      propertiesPanel: tool.propertiesPanel,
      contextMenu: tool.contextMenu,
    };
  }
  // Fallback for unknown elements — minimal config
  return {
    optionsBar: [],
    propertiesPanel: ["name"],
    contextMenu: ["delete"],
  };
}

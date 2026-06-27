export type OptionsBarField = "fill" | "stroke" | "strokeWidth";
export type PropertiesPanelField = "name" | "width" | "height" | "length" | "rotation" | "area" | "text" | "fontSize" | "fontWeight" | "fontStyle" | "textDecoration" | "textAlign" | "arrowHeadStyle" | "arrowHeadSize" | "capacity" | "meetingRoomId";
// "convertToObject" expands at render time into one "Convert to <category>"
// entry per active placement category (excluding the element's own type), so the
// available conversions follow the product variant rather than being hardcoded.
export type ContextMenuAction = "delete" | "convertToObject" | "convertToShape";

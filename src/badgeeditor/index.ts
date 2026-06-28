// Public API for the badge editor library export.
export { BadgeEditor } from "./BadgeEditor";
export type { BadgeEditorProps } from "./BadgeEditor";
export { flatten, inflate } from "./serialize";
export { FIELD_DEFS } from "./fields";
export type {
  BadgeDocument,
  BadgePage,
  BadgeField,
  FoldType,
  SlotType,
  FlattenResult,
  LegacyLayoutEntry,
} from "./model";
export type {
  BadgeData,
  AttendeeOption,
  AttendeeProvider,
  BadgeTicketData,
  BadgeSessionData,
} from "./badgeData";

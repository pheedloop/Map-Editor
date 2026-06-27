import type { FloorPlanData } from "../types";
import bgImage from "./Banquet Hall.png";

const BG_WIDTH = 735;
const BG_HEIGHT = 1108;

/**
 * Prebuilt starter floor plan for the seatplanner demo: a banquet hall
 * background to trace tables over. The table element type and sample table
 * records arrive in a later step.
 */
export const seatPlanMap: FloorPlanData = {
  version: "1.0",
  id: "seatplan-demo",
  name: "Banquet Hall",
  dimensions: {
    width: BG_WIDTH,
    height: BG_HEIGHT,
    unit: "ft",
    pixelsPerUnit: 4,
  },
  elements: [],
  legend: {
    entries: [],
    position: "bottom-right",
    visible: true,
  },
  backgroundImage: {
    url: bgImage,
    width: BG_WIDTH,
    height: BG_HEIGHT,
    opacity: 1,
  },
  metadata: {
    createdAt: "2026-06-27T12:00:00Z",
    updatedAt: "2026-06-27T12:00:00Z",
    scale: 1,
  },
};

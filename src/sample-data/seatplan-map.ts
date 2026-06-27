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
  "version": "1.0",
  "id": "seatplan-demo",
  "name": "Banquet Hall",
  "dimensions": {
    "width": 735,
    "height": 1108,
    "unit": "ft",
    "pixelsPerUnit": 4
  },
  "elements": [
    {
      "id": "64b1e875-693b-48c4-97db-88f4dc0a3e9f",
      "type": "table",
      "geometry": {
        "shape": "ellipse",
        "x": 253.19072180673038,
        "y": 344.7397506419932,
        "radiusX": 42.189874509901806,
        "radiusY": 42.18987450990178,
        "rotation": 0
      },
      "properties": {
        "name": "Table 1",
        "color": "#94a3b8",
        "strokeColor": "#888888",
        "strokeWidth": 1,
        "zIndex": 1,
        "tableCode": "SEATBL0001",
        "capacity": 8
      },
      "layer": "content"
    },
    {
      "id": "7d588492-073f-4b98-a769-5e56c685bdc5",
      "type": "table",
      "geometry": {
        "shape": "ellipse",
        "x": 540,
        "y": 344.7397506419932,
        "radiusX": 42.189874509901806,
        "radiusY": 42.18987450990178,
        "rotation": 0
      },
      "properties": {
        "name": "Table 2",
        "color": "#94a3b8",
        "strokeColor": "#888888",
        "strokeWidth": 1,
        "zIndex": 1,
        "tableCode": "SEATBL0002",
        "capacity": 10
      },
      "layer": "content"
    },
    {
      "id": "9f72ab94-6e15-4cec-8168-2a99973158b7",
      "type": "table",
      "geometry": {
        "shape": "ellipse",
        "x": 320.00000000000006,
        "y": 445.038043631603,
        "radiusX": 42.189874509901806,
        "radiusY": 42.18987450990178,
        "rotation": 0
      },
      "properties": {
        "name": "Table 3",
        "color": "#94a3b8",
        "strokeColor": "#888888",
        "strokeWidth": 1,
        "zIndex": 1,
        "tableCode": "SEATBL0003",
        "capacity": 12
      },
      "layer": "content"
    },
    {
      "id": "b2dae238-5740-48e8-94b1-32d514c05b92",
      "type": "table",
      "geometry": {
        "shape": "ellipse",
        "x": 470.3186174687695,
        "y": 445.038043631603,
        "radiusX": 42.189874509901806,
        "radiusY": 42.18987450990178,
        "rotation": 0
      },
      "properties": {
        "name": "Table 4",
        "color": "#94a3b8",
        "strokeColor": "#888888",
        "strokeWidth": 1,
        "zIndex": 1,
        "tableCode": "SEATBL0004",
        "capacity": 8
      },
      "layer": "content"
    },
    {
      "id": "59c3243b-55f0-4819-adc3-ae366cd8305b",
      "type": "table",
      "geometry": {
        "shape": "ellipse",
        "x": 256.0229411502558,
        "y": 545.822515218318,
        "radiusX": 42.189874509901806,
        "radiusY": 42.18987450990178,
        "rotation": 0
      },
      "properties": {
        "name": "Table 5",
        "color": "#94a3b8",
        "strokeColor": "#888888",
        "strokeWidth": 1,
        "zIndex": 1,
        "tableCode": "SEATBL0005",
        "capacity": 10
      },
      "layer": "content"
    },
    {
      "id": "0ee5d0e7-0d39-4b48-ae9a-b1500ff3ccf3",
      "type": "table",
      "geometry": {
        "shape": "ellipse",
        "x": 396.4233091877267,
        "y": 545.822515218318,
        "radiusX": 42.189874509901806,
        "radiusY": 42.18987450990178,
        "rotation": 0
      },
      "properties": {
        "name": "Table 6",
        "color": "#94a3b8",
        "strokeColor": "#888888",
        "strokeWidth": 1,
        "zIndex": 1,
        "tableCode": "SEATBL0006",
        "capacity": 12
      },
      "layer": "content"
    },
    {
      "id": "4d687f3e-a16f-44bd-93fa-02e81441b027",
      "type": "table",
      "geometry": {
        "shape": "ellipse",
        "x": 542.8322193435254,
        "y": 545.822515218318,
        "radiusX": 42.189874509901806,
        "radiusY": 42.18987450990178,
        "rotation": 0
      },
      "properties": {
        "name": "Table 7",
        "color": "#94a3b8",
        "strokeColor": "#888888",
        "strokeWidth": 1,
        "zIndex": 1,
        "tableCode": "SEATBL0007",
        "capacity": 8
      },
      "layer": "content"
    },
    {
      "id": "f3d6256f-8016-4c06-ad16-922d2c1f74dd",
      "type": "table",
      "geometry": {
        "shape": "ellipse",
        "x": 328.3504345545352,
        "y": 647.9616345044491,
        "radiusX": 42.189874509901806,
        "radiusY": 42.18987450990178,
        "rotation": 0
      },
      "properties": {
        "name": "Table 8",
        "color": "#94a3b8",
        "strokeColor": "#888888",
        "strokeWidth": 1,
        "zIndex": 1,
        "tableCode": "SEATBL0008",
        "capacity": 10
      },
      "layer": "content"
    },
    {
      "id": "427409ab-fadc-422f-8446-d9cecd4ad8cf",
      "type": "table",
      "geometry": {
        "shape": "ellipse",
        "x": 478.66905202330463,
        "y": 647.9616345044491,
        "radiusX": 42.189874509901806,
        "radiusY": 42.18987450990178,
        "rotation": 0
      },
      "properties": {
        "name": "Table 9",
        "color": "#94a3b8",
        "strokeColor": "#888888",
        "strokeWidth": 1,
        "zIndex": 1,
        "tableCode": "SEATBL0009",
        "capacity": 12
      },
      "layer": "content"
    },
    {
      "id": "4fa3d5eb-4f1e-4d00-a265-396b135d8fa1",
      "type": "table",
      "geometry": {
        "shape": "ellipse",
        "x": 275.0301268770671,
        "y": 753.6236960815341,
        "radiusX": 42.189874509901806,
        "radiusY": 42.18987450990178,
        "rotation": 0
      },
      "properties": {
        "name": "Table 10",
        "color": "#94a3b8",
        "strokeColor": "#888888",
        "strokeWidth": 1,
        "zIndex": 1,
        "tableCode": "SEATBL0010",
        "capacity": 8
      },
      "layer": "content"
    },
    {
      "id": "686bad6c-aae9-4176-9e0a-a8ee2788dd52",
      "type": "table",
      "geometry": {
        "shape": "ellipse",
        "x": 415.43049491453803,
        "y": 753.6236960815341,
        "radiusX": 42.189874509901806,
        "radiusY": 42.18987450990178,
        "rotation": 0
      },
      "properties": {
        "name": "Table 11",
        "color": "#94a3b8",
        "strokeColor": "#888888",
        "strokeWidth": 1,
        "zIndex": 1,
        "tableCode": "SEATBL0011",
        "capacity": 10
      },
      "layer": "content"
    },
    {
      "id": "a2dceb52-2147-4850-b86f-d9b1a2439a66",
      "type": "table",
      "geometry": {
        "shape": "ellipse",
        "x": 561.8394050703367,
        "y": 753.6236960815341,
        "radiusX": 42.189874509901806,
        "radiusY": 42.18987450990178,
        "rotation": 0
      },
      "properties": {
        "name": "Table 12",
        "color": "#94a3b8",
        "strokeColor": "#888888",
        "strokeWidth": 1,
        "zIndex": 1,
        "tableCode": "SEATBL0012",
        "capacity": 12
      },
      "layer": "content"
    },
    {
      "id": "50424348-4b29-4efe-80f2-82bab3435303",
      "type": "table",
      "geometry": {
        "shape": "ellipse",
        "x": 342.33635187254623,
        "y": 860.479127753201,
        "radiusX": 42.189874509901806,
        "radiusY": 42.18987450990178,
        "rotation": 0
      },
      "properties": {
        "name": "Table 13",
        "color": "#94a3b8",
        "strokeColor": "#888888",
        "strokeWidth": 1,
        "zIndex": 1,
        "tableCode": "SEATBL0013",
        "capacity": 8
      },
      "layer": "content"
    },
    {
      "id": "42a5bf94-3e3c-4cb1-91b6-93220e4206e7",
      "type": "table",
      "geometry": {
        "shape": "ellipse",
        "x": 492.6549693413157,
        "y": 860.479127753201,
        "radiusX": 42.189874509901806,
        "radiusY": 42.18987450990178,
        "rotation": 0
      },
      "properties": {
        "name": "Table 14",
        "color": "#94a3b8",
        "strokeColor": "#888888",
        "strokeWidth": 1,
        "zIndex": 1,
        "tableCode": "SEATBL0014",
        "capacity": 10
      },
      "layer": "content"
    },
    {
      "id": "3b666bf2-f9c4-4ac9-8b54-a96ad9abcd16",
      "type": "shape",
      "geometry": {
        "shape": "rect",
        "x": 131.30807820802085,
        "y": 350.2185835132998,
        "width": 36.72,
        "height": 157.80183229699406
      },
      "properties": {
        "name": "Bar",
        "color": "#ffffff",
        "strokeColor": "#000000",
        "strokeWidth": 2,
        "zIndex": 1,
        "labelColor": "#141414"
      },
      "layer": "content"
    }
  ],
  "legend": {
    "entries": [],
    "position": "bottom-right",
    "visible": true
  },
  "backgroundImage": {
    "url": bgImage,
    "width": BG_WIDTH,
    "height": BG_HEIGHT,
    "opacity": 1
  },
  "metadata": {
    "createdAt": "2026-06-27T12:00:00Z",
    "updatedAt": "2026-06-27T12:00:00Z",
    "scale": 1
  },
  "typeStyles": {
    "booth": {
      "color": "#94a3b8",
      "strokeColor": "#888888",
      "strokeWidth": 1,
      "defaultWidth": 120,
      "defaultHeight": 80
    },
    "session_area": {
      "color": "#27AE60",
      "strokeColor": "#888888",
      "strokeWidth": 1,
      "defaultWidth": 200,
      "defaultHeight": 150
    },
    "meeting_room": {
      "color": "#F39C12",
      "strokeColor": "#888888",
      "strokeWidth": 1,
      "defaultWidth": 160,
      "defaultHeight": 120
    }
  },
  "viewerAppearance": {
    "organizer": {
      "available": {
        "type": "hatch",
        "pattern": "diagonal"
      },
      "reserved": {
        "type": "hatch",
        "pattern": "cross"
      },
      "on_hold": {
        "type": "border",
        "color": "#888888",
        "style": "dashed",
        "width": 2
      },
      "sold": {
        "type": "none"
      }
    },
    "attendee": {
      "available": {
        "type": "none"
      },
      "occupied": {
        "type": "opacity",
        "value": 0.35
      }
    }
  },
  "groups": []
}


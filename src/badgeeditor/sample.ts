// Demo content: a 3-panel "Direct Thermal" double-fold badge — 4 × 16.5" total
// (three 4 × 5.5" panels). Authored from a real exported layout:
//   • Front  — name / org / title / tags / QR (upright)
//   • Inside — table number, session schedule, external QR (prints inverted)
//   • Back   — a 5-row tear-style tickets block (upright)
// Inner/back fields are authored UPRIGHT here; the fold flatten applies each
// panel's offset + inversion on Save.

import { BADGE_DOCUMENT_VERSION, type BadgeDocument, type BadgeField } from "./model";
import { createField } from "./factory";

const PANEL_H = 5.5;

/** Build a field from the registry defaults + explicit overrides (inches). */
function mk(field: string, props: Partial<BadgeField>): BadgeField {
  return Object.assign(createField(field), props);
}

function frontFields(): BadgeField[] {
  return [
    mk("first_name", { top: 0.5806832869219374, left: 0.4375, width: 3.125, height: 0.375, fontSize: 30, numLines: 1, textAlign: "center" }),
    mk("last_name", { top: 0.997349953588604, left: 0.4375, width: 3.125, height: 0.375, fontSize: 30, numLines: 1, textAlign: "center" }),
    mk("organization", { top: 1.4660999535886041, left: 0.4375, width: 3.125, height: 0.3, fontSize: 24, numLines: 1, textAlign: "center" }),
    mk("title", { top: 1.8306832869219374, left: 0.4375, width: 3.125, height: 0.25, fontSize: 20, numLines: 1, textAlign: "center" }),
    mk("tags", { top: 2.1431832869219374, left: 0.4375, width: 3.125, height: 0.2, fontSize: 16, numLines: 1, textAlign: "center" }),
    mk("qrCode", { top: 3.4145104604975915, left: 1.609375, scale: 1 }),
  ];
}

/** Inner panel (prints inverted). Tops are panel-local (exported − 5.5"). */
function innerFields(): BadgeField[] {
  const off = PANEL_H;
  return [
    mk("table_number", { top: 6.136587866130225 - off, left: 0.6979166666666666, width: 2.6041666666666665, height: 0.25, fontSize: 24, numLines: 1, textAlign: "center" }),
    mk("session_schedule", { top: 6.696068107981887 - off, left: 0.6979166666666655, width: 2.6041666666666674, height: 2.8544769879300276, fontSize: 20, numLines: 13, textAlign: "center" }),
    mk("externalQRCodeUrl", { top: 9.752037425221967 - off, left: 1.609375, scale: 1 }),
  ];
}

/** Back panel — a 5-row tickets block. Panel-local (exported − 11"). */
function backFields(): BadgeField[] {
  return [
    mk("tickets", { top: 11 - 2 * PANEL_H, left: 0, width: 3.9602689629864556, height: 5.523636908133685, numRows: 5 }),
  ];
}

export function createSampleDocument(): BadgeDocument {
  return {
    version: BADGE_DOCUMENT_VERSION,
    name: "Direct Thermal",
    panelSize: { width: 4, height: PANEL_H },
    fold: "double",
    slots: "three-rect",
    pages: [
      { id: "front", role: "front", fields: frontFields() },
      { id: "inner", role: "inner", inverted: true, fields: innerFields() },
      { id: "back", role: "back", fields: backFields() },
    ],
  };
}

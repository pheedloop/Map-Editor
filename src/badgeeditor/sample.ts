// Demo content: a 2-panel "Direct Thermal" fold badge — 4 × 11" total, single
// vertical fold (two 4 × 5.5" panels). Authored from a real exported layout:
// the front panel holds name/org/title/tags/QR; the back panel (which prints
// upside-down — page.inverted) holds the table number, session schedule, and an
// external QR. Back fields are authored UPRIGHT here; the fold flatten adds the
// 5.5" offset + inversion on Save.

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

/** Back-panel fields, authored upright (the page itself is inverted).
 *  Tops are panel-local (the exported tops minus the 5.5" panel offset). */
function backFields(): BadgeField[] {
  return [
    mk("table_number", { top: 6.136587866130225 - PANEL_H, left: 0.6979166666666666, width: 2.6041666666666665, height: 0.25, fontSize: 24, numLines: 1, textAlign: "center" }),
    mk("session_schedule", { top: 6.696068107981887 - PANEL_H, left: 0.6979166666666655, width: 2.6041666666666674, height: 2.8544769879300276, fontSize: 20, numLines: 13, textAlign: "center" }),
    mk("externalQRCodeUrl", { top: 9.752037425221967 - PANEL_H, left: 1.609375, scale: 1 }),
  ];
}

export function createSampleDocument(): BadgeDocument {
  return {
    version: BADGE_DOCUMENT_VERSION,
    name: "Direct Thermal",
    panelSize: { width: 4, height: PANEL_H },
    fold: "single",
    slots: "three-rect",
    pages: [
      { id: "front", role: "front", fields: frontFields() },
      { id: "back", role: "back", inverted: true, fields: backFields() },
    ],
  };
}

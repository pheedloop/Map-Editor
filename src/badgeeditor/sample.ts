// Starter document for the demo / standalone editor. A single 3.64 × 5.5"
// front panel with a name and a QR code so there's something on screen.

import { BADGE_DOCUMENT_VERSION, type BadgeDocument } from "./model";
import { createField } from "./factory";

export function createSampleDocument(): BadgeDocument {
  const firstName = createField("first_name");
  firstName.top = 0.3;
  firstName.left = 0.5;
  firstName.fontSize = 36;
  firstName.height = (36 * 1.2) / 96;

  const qr = createField("qrCode");
  qr.top = 2.6;
  qr.left = 1.45;
  qr.scale = 1;

  return {
    version: BADGE_DOCUMENT_VERSION,
    panelSize: { width: 3.64, height: 5.5 },
    fold: "none",
    pages: [{ id: "front", role: "front", fields: [firstName, qr] }],
  };
}

// ---------------------------------------------------------------------------
// Compatibility gate (no test runner in this repo — run directly on Node 24):
//   node src/badgeeditor/verify.ts
//
// Loads real legacy badge_layout arrays, inflate()s them into a BadgeDocument,
// flatten()s back, and asserts the output matches the input field-for-field.
// Fixtures: pikachu BADGE_DEFAULT_LAYOUTS + a real exported template.
// ---------------------------------------------------------------------------

import { flatten, inflate } from "./serialize";
import type { LegacyLayoutEntry } from "./model";

const EPS = 1e-9;

// pikachu/apps/badge/models.py BADGE_DEFAULT_LAYOUTS
const FIXTURES: Record<string, LegacyLayoutEntry[]> = {
  label: JSON.parse(
    `[{"top":0.1979166666666667,"left":0.15625,"field":"first_name","scale":1.125,"height":0.42375,"width":3.125,"fontSize":36,"numLines":1,"textAlign":"center","inverted":false,"userEditable":true},{"top":0.6458333333333333,"left":0.15625,"field":"last_name","scale":0.9375,"height":0.3531249999999999,"width":3.125,"fontSize":30,"numLines":1,"textAlign":"center","inverted":false,"userEditable":true},{"top":1.2291666666666667,"left":0.15625,"field":"organization","scale":0.75,"height":0.5,"width":3.125,"fontSize":24,"numLines":2,"textAlign":"center","inverted":false,"userEditable":true},{"top":1.8333333333333333,"left":0.15625,"field":"title","scale":0.625,"height":0.23541666666666664,"width":3.125,"fontSize":20,"numLines":1,"textAlign":"center","inverted":false,"userEditable":true},{"top":2.09375,"left":1.3333333333333333,"field":"qrCode","scale":1}]`,
  ),
  ticketedThermal: JSON.parse(
    `[{"top":1.6770833333333333,"left":0.15625,"field":"first_name","scale":1.125,"height":0.42375,"width":3.64,"fontSize":36,"numLines":1,"textAlign":"center","inverted":false,"userEditable":true},{"top":2.1354166666666665,"left":0.15625,"field":"last_name","scale":0.9375,"height":0.3531249999999999,"width":3.64,"fontSize":30,"numLines":1,"textAlign":"center","inverted":false,"userEditable":true},{"top":2.875,"left":0.17479166666666698,"field":"organization","scale":0.75,"height":0.5,"width":3.64,"fontSize":24,"numLines":2,"textAlign":"center","inverted":false,"userEditable":true},{"top":3.4791666666666665,"left":0.17479166666666668,"field":"title","scale":0.625,"height":0.23541666666666664,"width":3.64,"fontSize":20,"numLines":1,"textAlign":"center","inverted":false,"userEditable":true},{"top":3.8020833333333335,"left":1.6484375000000002,"field":"qrCode","scale":0.9},{"top":10.75984143825814,"left":0.40544246841652704,"field":"tickets","height":5.5945153936487095,"width":3.17869839650028,"numRows":4,"inverted":false}]`,
  ),
  // A real exported template (rich field mix: designations, address_*, tags,
  // session_schedule, tickets, qrCode, editable + non-editable fields).
  realExport: JSON.parse(
    `[{"top":0.10418497035061584,"left":0.25222503169855176,"field":"first_name","scale":0.9375,"height":0.3531249999999999,"width":3.64,"fontSize":30,"numLines":1,"textAlign":"center","inverted":false,"userEditable":false},{"top":0.5729349703506158,"left":0.25222503169855176,"field":"last_name","scale":0.9375,"height":0.3531249999999999,"width":3.64,"fontSize":30,"numLines":1,"textAlign":"center","inverted":false,"userEditable":false},{"top":1.041684970350616,"left":0.25222503169855176,"field":"organization","scale":0.75,"height":0.2824999999999999,"width":3.64,"fontSize":24,"numLines":1,"textAlign":"center","inverted":false,"userEditable":false},{"top":1.510434970350616,"left":0.25222503169855176,"field":"title","scale":0.625,"height":0.23541666666666664,"width":3.64,"fontSize":20,"numLines":1,"textAlign":"center","inverted":false,"userEditable":false},{"top":1.9791849703506161,"left":0.25222503169855176,"field":"tags","scale":0.5,"height":0.18833333333333332,"width":3.64,"fontSize":16,"numLines":1,"textAlign":"center","inverted":false},{"top":2.3098958333333335,"left":1.5799012923558386,"field":"qrCode","scale":0.9},{"top":3.229184970350616,"left":0.25222503169855176,"field":"designations","scale":0.625,"height":0.23541666666666664,"width":3.6720572695662717,"fontSize":20,"numLines":1,"textAlign":"left","inverted":false,"userEditable":true},{"top":3.541684970350616,"left":0.25222503169855176,"field":"address_city","scale":0.625,"height":0.23541666666666664,"width":3.6928773569106315,"fontSize":20,"numLines":1,"textAlign":"left","inverted":false,"userEditable":true},{"top":3.854184970350616,"left":0.25222503169855176,"field":"address_country","scale":0.625,"height":0.23541666666666664,"width":3.7032874005828114,"fontSize":20,"numLines":1,"textAlign":"left","inverted":false,"userEditable":false},{"top":4.166684970350616,"left":0.25222503169855176,"field":"address_state","scale":0.625,"height":0.23541666666666664,"width":3.6824673132384516,"fontSize":20,"numLines":1,"textAlign":"left","inverted":false,"userEditable":false},{"top":4.479184970350616,"left":0.25222503169855176,"field":"city_state","scale":0.625,"height":0.23541666666666664,"width":3.6986232582763736,"fontSize":20,"numLines":1,"textAlign":"left","inverted":false,"userEditable":false},{"top":4.791684970350616,"left":0.25222503169855176,"field":"code_internal","scale":0.625,"height":0.23541666666666664,"width":3.7083070191159755,"fontSize":20,"numLines":1,"textAlign":"left","inverted":false},{"top":5.104184970350616,"left":0.25222503169855176,"field":"table_number","scale":0.625,"height":0.23541666666666664,"width":3.7373583016347816,"fontSize":20,"numLines":1,"textAlign":"left","inverted":false},{"top":5.572934970350616,"left":0.25222503169855176,"field":"tickets","height":2.4824244444198413,"width":3.659283081612074,"numRows":3,"inverted":false},{"top":8.385434970350616,"left":0.4083756867812524,"field":"session_schedule","scale":0.75,"height":0.2824999999999999,"width":3.131093535115117,"fontSize":24,"numLines":1,"textAlign":"left","inverted":false,"userEditable":true}]`,
  ),
  // Synthetic: NewBadgeDesigner additions — externalQRCodeUrl (BadgeQRCode),
  // a dynamic custom attendee field (extra_fields + custom_attendee_field),
  // and an inverted field (the footprint-shift path).
  newFields: JSON.parse(
    `[{"top":0.5,"left":1.5,"field":"externalQRCodeUrl","scale":0.9},{"top":2.5,"left":0.25,"field":"extra_fields","custom_attendee_field":"shirt_size","scale":0.625,"height":0.235,"width":2.6,"fontSize":20,"numLines":1,"textAlign":"left","inverted":false,"text":"Shirt Size","userEditable":true},{"top":3.0,"left":0.25,"field":"dietary_restrictions","scale":0.625,"height":0.235,"width":2.6,"fontSize":20,"numLines":1,"textAlign":"left","inverted":false,"userEditable":true},{"top":4.0,"left":0.25,"field":"title","scale":0.625,"height":0.235,"width":2.6,"fontSize":20,"numLines":1,"textAlign":"center","inverted":true,"userEditable":true}]`,
  ),
};

function diffEntry(
  name: string,
  i: number,
  original: LegacyLayoutEntry,
  produced: LegacyLayoutEntry,
): string[] {
  const errs: string[] = [];
  const keys = new Set([...Object.keys(original), ...Object.keys(produced)]);
  for (const k of keys) {
    const a = (original as unknown as Record<string, unknown>)[k];
    const b = (produced as unknown as Record<string, unknown>)[k];
    if (typeof a === "number" && typeof b === "number") {
      if (Math.abs(a - b) > EPS) errs.push(`[${name}#${i}] ${k}: ${a} != ${b}`);
    } else if (a !== b) {
      errs.push(`[${name}#${i}] ${k}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
    }
  }
  return errs;
}

let failures = 0;
for (const [name, original] of Object.entries(FIXTURES)) {
  // Template dims don't affect single-page round trip; use a plausible card.
  const doc = inflate(original, { width: 3.64, height: 11 });
  const { layout } = flatten(doc);

  const errs: string[] = [];
  if (layout.length !== original.length) {
    errs.push(`[${name}] length ${original.length} -> ${layout.length}`);
  }
  original.forEach((entry, i) => {
    if (layout[i]) errs.push(...diffEntry(name, i, entry, layout[i]));
  });

  if (errs.length) {
    failures += errs.length;
    console.error(`✗ ${name}: ${errs.length} mismatch(es)`);
    errs.forEach((e) => console.error("   " + e));
  } else {
    console.log(`✓ ${name}: ${original.length} fields round-trip exactly`);
  }
}

if (failures) {
  // Non-zero exit via throw (avoids a Node type dependency in the lib tsconfig).
  throw new Error(`${failures} mismatch(es) — badge_layout compatibility BROKEN`);
}
console.log("\nAll fixtures round-trip exactly — badge_layout compatible.");

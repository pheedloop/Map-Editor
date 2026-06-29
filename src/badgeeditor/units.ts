// User-facing measurement units for the badge editor.
//
// The model is inch-based internally (inches → dots at DPI), so a unit is purely
// a display/input concern: convert by a per-inch factor at the UI boundary and
// keep storing inches everywhere else.

export type Unit = "in" | "cm";

/** Display units per inch. */
const PER_INCH: Record<Unit, number> = { in: 1, cm: 2.54 };

/** Short label shown next to values. */
export const unitLabel: Record<Unit, string> = { in: "in", cm: "cm" };

/** Full label for menus. */
export const unitName: Record<Unit, string> = {
  in: "Inches",
  cm: "Centimeters",
};

/** Sensible numeric-input step per unit. */
export const unitStep: Record<Unit, number> = { in: 0.05, cm: 0.1 };

/** Minimum panel dimension per unit (~½"). */
export const unitMin: Record<Unit, number> = { in: 0.5, cm: 1.27 };

/** Inches → value in the given unit. */
export const toUnit = (inches: number, u: Unit) => inches * PER_INCH[u];

/** Value in the given unit → inches. */
export const fromUnit = (value: number, u: Unit) => value / PER_INCH[u];

/** Inches → compact display string in the given unit (trims trailing zeros). */
export const fmtUnit = (inches: number, u: Unit, dp = 2) =>
  String(+(inches * PER_INCH[u]).toFixed(dp));

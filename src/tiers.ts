// ---------------------------------------------------------------------------
// Usage tiers
// ---------------------------------------------------------------------------
//
// The editor/viewer is embedded in a host app that gates capabilities behind
// subscription tiers. Tiers are cumulative:
//   basic    → background image + drawing tools
//   advanced → adds objects (booths, session locations, meeting rooms)
//   premium  → adds wayfinding + scale calibration
//
// Tiering is one axis. A separate axis is whether a feature exists in the
// product at all — e.g. seat plans have no objects/wayfinding. So each feature
// resolves to a tri-state, NOT a boolean:
//   "enabled" → normal
//   "locked"  → present but behind a higher tier (disabled + trophy upsell)
//   "hidden"  → not part of this product (not rendered at all)

export type Tier = "basic" | "advanced" | "premium";

export type FeatureKey =
  | "backgroundImage"
  | "drawingTools"
  | "objects"
  | "wayfinding"
  | "scaleCalibration";

/** Cumulative — each tier includes everything in the tiers before it. */
export const TIER_FEATURES: Record<Tier, FeatureKey[]> = {
  basic: ["backgroundImage", "drawingTools"],
  advanced: ["backgroundImage", "drawingTools", "objects"],
  premium: [
    "backgroundImage",
    "drawingTools",
    "objects",
    "wayfinding",
    "scaleCalibration",
  ],
};

/** Lowest tier a feature appears in — drives whether the trophy badge shows. */
export const FEATURE_MIN_TIER: Record<FeatureKey, Tier> = {
  backgroundImage: "basic",
  drawingTools: "basic",
  objects: "advanced",
  wayfinding: "premium",
  scaleCalibration: "premium",
};

export type FeatureState = "enabled" | "locked" | "hidden";

export type FeatureMap = Record<FeatureKey, FeatureState>;

/** Per-feature override: true→enabled, false→locked, or the literal "hidden". */
export type FeatureOverride = boolean | "hidden";

const ALL_FEATURES: FeatureKey[] = [
  "backgroundImage",
  "drawingTools",
  "objects",
  "wayfinding",
  "scaleCalibration",
];

/**
 * Resolve the effective capability for each feature from a tier preset, then
 * apply per-feature overrides. Defaults to "premium" (everything on) so existing
 * embeds that pass no tier are unaffected.
 */
export function resolveFeatures(
  tier: Tier = "premium",
  overrides?: Partial<Record<FeatureKey, FeatureOverride>>,
): FeatureMap {
  const included = new Set(TIER_FEATURES[tier]);
  const map = {} as FeatureMap;
  for (const feature of ALL_FEATURES) {
    map[feature] = included.has(feature) ? "enabled" : "locked";
  }
  if (overrides) {
    for (const feature of ALL_FEATURES) {
      const override = overrides[feature];
      if (override === undefined) continue;
      map[feature] =
        override === "hidden" ? "hidden" : override ? "enabled" : "locked";
    }
  }
  return map;
}

/**
 * Trophy badge shows only for a "locked" upgrade feature (one whose minimum tier
 * is above basic). Basic-tier features never get a trophy even if overridden off.
 */
export function showTrophy(feature: FeatureKey, map: FeatureMap): boolean {
  return map[feature] === "locked" && FEATURE_MIN_TIER[feature] !== "basic";
}

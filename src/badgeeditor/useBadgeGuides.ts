import { useCallback, useMemo, useState } from "react";
import { DPI, type BadgeField } from "./model";

// Alignment guides + snapping for the badge canvas. Ported from the editor's
// useAlignmentGuides, operating on field bounds in canvas pixels (PPI = DPI),
// and additionally snapping to the card edges + center.

const PPI = DPI;
const QR_BASE_PX = 75;
const SNAP_THRESHOLD = 5; // unscaled canvas px

export interface GuideLine {
  axis: "x" | "y"; // x = vertical line, y = horizontal line
  position: number;
}

interface Bounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
}

/** Display size of a field in canvas px (box vs QR). */
export function fieldSizePx(field: BadgeField): { w: number; h: number } {
  if (field.kind === "qrCode") {
    const s = QR_BASE_PX * (field.scale ?? 1);
    return { w: s, h: s };
  }
  return { w: (field.width ?? 2) * PPI, h: (field.height ?? 0.3) * PPI };
}

function boundsFrom(left: number, top: number, w: number, h: number): Bounds {
  return {
    left,
    top,
    right: left + w,
    bottom: top + h,
    centerX: left + w / 2,
    centerY: top + h / 2,
  };
}

export function useBadgeGuides(
  fields: BadgeField[],
  panelSize: { width: number; height: number },
) {
  const [activeGuides, setActiveGuides] = useState<GuideLine[]>([]);

  const panelW = panelSize.width * PPI;
  const panelH = panelSize.height * PPI;

  // Snap targets: every other field's bounds + the card itself.
  const targets = useMemo(() => {
    const list = fields.map((f) => {
      const { w, h } = fieldSizePx(f);
      return { id: f.id, bounds: boundsFrom(f.left * PPI, f.top * PPI, w, h) };
    });
    list.push({ id: "__card__", bounds: boundsFrom(0, 0, panelW, panelH) });
    return list;
  }, [fields, panelW, panelH]);

  const clear = useCallback(() => setActiveGuides([]), []);

  /**
   * Given the dragged field id and its current top-left + size (px), return the
   * snapped top-left and update the active guide lines.
   */
  const snap = useCallback(
    (id: string, left: number, top: number, w: number, h: number) => {
      const b = boundsFrom(left, top, w, h);
      const others = targets.filter((t) => t.id !== id);
      const guides: GuideLine[] = [];

      const dragX = [
        { value: b.left, offset: 0 },
        { value: b.centerX, offset: w / 2 },
        { value: b.right, offset: w },
      ];
      const dragY = [
        { value: b.top, offset: 0 },
        { value: b.centerY, offset: h / 2 },
        { value: b.bottom, offset: h },
      ];

      let snappedX: number | null = null;
      let snappedY: number | null = null;
      let bestDx = SNAP_THRESHOLD + 1;
      let bestDy = SNAP_THRESHOLD + 1;

      for (const o of others) {
        const xs = [o.bounds.left, o.bounds.centerX, o.bounds.right];
        const ys = [o.bounds.top, o.bounds.centerY, o.bounds.bottom];
        for (const dp of dragX) {
          for (const tx of xs) {
            const dx = Math.abs(dp.value - tx);
            if (dx < bestDx) {
              bestDx = dx;
              snappedX = tx - dp.offset;
              const filtered = guides.filter((g) => g.axis !== "x");
              filtered.push({ axis: "x", position: tx });
              guides.length = 0;
              guides.push(...filtered);
            }
          }
        }
        for (const dp of dragY) {
          for (const ty of ys) {
            const dy = Math.abs(dp.value - ty);
            if (dy < bestDy) {
              bestDy = dy;
              snappedY = ty - dp.offset;
              const filtered = guides.filter((g) => g.axis !== "y");
              filtered.push({ axis: "y", position: ty });
              guides.length = 0;
              guides.push(...filtered);
            }
          }
        }
      }

      if (bestDx > SNAP_THRESHOLD) {
        snappedX = null;
        const f = guides.filter((g) => g.axis !== "x");
        guides.length = 0;
        guides.push(...f);
      }
      if (bestDy > SNAP_THRESHOLD) {
        snappedY = null;
        const f = guides.filter((g) => g.axis !== "y");
        guides.length = 0;
        guides.push(...f);
      }

      setActiveGuides([...guides]);
      return { x: snappedX ?? left, y: snappedY ?? top };
    },
    [targets],
  );

  return { activeGuides, snap, clear };
}

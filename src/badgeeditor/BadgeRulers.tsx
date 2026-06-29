import { useRef, useEffect } from "react";
import { toUnit, type Unit } from "./units";

// Rulers for the badge canvas. The badge coordinate system is 1 inch = `ppi`
// canvas px at scale 1; values are shown in the chosen display unit. Adapted
// from the map editor's Rulers (which is bound to the ft/m/px Unit type and so
// can't be reused directly here).

/** Minor ticks per major tick (¼" for inches, mm-friendly fifths for cm). */
const MINOR_DIVISOR: Record<Unit, number> = { in: 4, cm: 5 };

interface BadgeRulersProps {
  visible: boolean;
  scale: number;
  position: { x: number; y: number };
  stageSize: { width: number; height: number };
  /** Canvas px per inch at scale 1 (DPI). */
  ppi: number;
  /** Display unit — inches or centimeters. */
  unit: Unit;
}

const RULER_SIZE = 22;
const FONT = "10px system-ui, sans-serif";
const BG_COLOR = "#f9fafb";
const TICK_COLOR = "#9ca3af";
const TEXT_COLOR = "#6b7280";
const BORDER_COLOR = "#e5e7eb";
const MAJOR_TICK_MIN_PX = 70;

/** Pick a "nice" inch interval (1, 0.5, 0.25, 2, 5, ...). */
function niceInterval(rough: number): number {
  if (rough <= 0) return 1;
  const exponent = Math.floor(Math.log10(rough));
  const fraction = rough / 10 ** exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * 10 ** exponent;
}

/** Trim trailing zeros: 1, 0.5, 0.25, 1.75. */
function formatLabel(value: number): string {
  return String(+value.toFixed(2));
}

function setupCanvas(
  canvas: HTMLCanvasElement,
  cssWidth: number,
  cssHeight: number,
): CanvasRenderingContext2D | null {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = cssWidth * dpr;
  canvas.height = cssHeight * dpr;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, cssWidth, cssHeight);
  return ctx;
}

function drawHorizontal(
  canvas: HTMLCanvasElement,
  scale: number,
  positionX: number,
  ppi: number,
  unit: Unit,
) {
  const cssWidth = canvas.parentElement?.clientWidth ?? canvas.clientWidth;
  const cssHeight = RULER_SIZE;
  const ctx = setupCanvas(canvas, cssWidth, cssHeight);
  if (!ctx) return;

  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, cssHeight - 0.5);
  ctx.lineTo(cssWidth, cssHeight - 0.5);
  ctx.stroke();

  const pxPerIn = (scale * ppi) / toUnit(1, unit);
  const majorInterval = niceInterval(MAJOR_TICK_MIN_PX / pxPerIn);
  const minorInterval = majorInterval / MINOR_DIVISOR[unit];

  const startIn = (0 - positionX) / pxPerIn;
  const endIn = (cssWidth - positionX) / pxPerIn;

  // Minor ticks
  ctx.strokeStyle = TICK_COLOR;
  ctx.lineWidth = 0.5;
  for (
    let u = Math.floor(startIn / minorInterval) * minorInterval;
    u <= endIn;
    u += minorInterval
  ) {
    const x = u * pxPerIn + positionX;
    if (x < 0 || x > cssWidth) continue;
    ctx.beginPath();
    ctx.moveTo(x, cssHeight);
    ctx.lineTo(x, cssHeight - 6);
    ctx.stroke();
  }

  // Major ticks + labels
  ctx.lineWidth = 1;
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = FONT;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  for (
    let u = Math.floor(startIn / majorInterval) * majorInterval;
    u <= endIn;
    u += majorInterval
  ) {
    const x = u * pxPerIn + positionX;
    if (x < 0 || x > cssWidth) continue;
    ctx.beginPath();
    ctx.moveTo(x, cssHeight);
    ctx.lineTo(x, cssHeight - 12);
    ctx.stroke();
    ctx.fillText(formatLabel(u), x + 3, 3);
  }
}

function drawVertical(
  canvas: HTMLCanvasElement,
  scale: number,
  positionY: number,
  ppi: number,
  unit: Unit,
) {
  const cssWidth = RULER_SIZE;
  const cssHeight = canvas.parentElement?.clientHeight ?? canvas.clientHeight;
  const ctx = setupCanvas(canvas, cssWidth, cssHeight);
  if (!ctx) return;

  ctx.strokeStyle = BORDER_COLOR;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cssWidth - 0.5, 0);
  ctx.lineTo(cssWidth - 0.5, cssHeight);
  ctx.stroke();

  const pxPerIn = (scale * ppi) / toUnit(1, unit);
  const majorInterval = niceInterval(MAJOR_TICK_MIN_PX / pxPerIn);
  const minorInterval = majorInterval / MINOR_DIVISOR[unit];

  const startIn = (0 - positionY) / pxPerIn;
  const endIn = (cssHeight - positionY) / pxPerIn;

  ctx.strokeStyle = TICK_COLOR;
  ctx.lineWidth = 0.5;
  for (
    let u = Math.floor(startIn / minorInterval) * minorInterval;
    u <= endIn;
    u += minorInterval
  ) {
    const y = u * pxPerIn + positionY;
    if (y < 0 || y > cssHeight) continue;
    ctx.beginPath();
    ctx.moveTo(cssWidth, y);
    ctx.lineTo(cssWidth - 6, y);
    ctx.stroke();
  }

  ctx.lineWidth = 1;
  ctx.fillStyle = TEXT_COLOR;
  ctx.font = FONT;
  for (
    let u = Math.floor(startIn / majorInterval) * majorInterval;
    u <= endIn;
    u += majorInterval
  ) {
    const y = u * pxPerIn + positionY;
    if (y < 0 || y > cssHeight) continue;
    ctx.beginPath();
    ctx.moveTo(cssWidth, y);
    ctx.lineTo(cssWidth - 12, y);
    ctx.stroke();
    ctx.save();
    ctx.translate(3, y - 3);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(formatLabel(u), 0, 0);
    ctx.restore();
  }
}

/** Horizontal + vertical inch rulers overlaid on the canvas edges. */
export function BadgeRulers({
  visible,
  scale,
  position,
  stageSize,
  ppi,
  unit,
}: BadgeRulersProps) {
  const hRef = useRef<HTMLCanvasElement>(null);
  const vRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!visible) return;
    if (hRef.current) drawHorizontal(hRef.current, scale, position.x, ppi, unit);
    if (vRef.current) drawVertical(vRef.current, scale, position.y, ppi, unit);
  }, [
    visible,
    scale,
    position.x,
    position.y,
    stageSize.width,
    stageSize.height,
    ppi,
    unit,
  ]);

  if (!visible) return null;

  // Each ruler spans the full container starting at the container's top-left, so
  // its local coordinate 0 lines up with the Konva stage origin (whose transform
  // offset is `position`). The corner square is drawn last to mask the overlap.
  return (
    <>
      <canvas
        ref={hRef}
        className="absolute z-10 pointer-events-none"
        style={{ top: 0, left: 0, right: 0, height: RULER_SIZE }}
      />
      <canvas
        ref={vRef}
        className="absolute z-10 pointer-events-none"
        style={{ top: 0, left: 0, bottom: 0, width: RULER_SIZE }}
      />
      {/* Corner square — unit label */}
      <div
        className="absolute z-10 flex items-center justify-center select-none"
        style={{
          top: 0,
          left: 0,
          width: RULER_SIZE,
          height: RULER_SIZE,
          backgroundColor: BG_COLOR,
          borderRight: `1px solid ${BORDER_COLOR}`,
          borderBottom: `1px solid ${BORDER_COLOR}`,
          fontSize: 9,
          color: TEXT_COLOR,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {unit}
      </div>
    </>
  );
}

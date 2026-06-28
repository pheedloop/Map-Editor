import { useEffect, useRef, useState } from "react";
import {
  Stage,
  Layer,
  Rect,
  Circle,
  Text,
  Group,
  Line,
  Arrow,
  Image as KonvaImage,
  Transformer,
} from "react-konva";
import type Konva from "konva";
import { DPI, type BadgeField, type BadgePage, type SlotType } from "./model";
import { fieldDisplayText } from "./factory";
import { fieldSizePx, useBadgeGuides } from "./useBadgeGuides";
import qrCodeUrl from "./qr-code.png";

/** Load the stand-in QR image once (shared across all QR fields). */
function useQrImage(): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    const im = new window.Image();
    im.src = qrCodeUrl;
    im.onload = () => setImg(im);
  }, []);
  return img;
}

// Canvas renders at 96px per inch (the legacy DPI); zoom is layered on top via
// useCanvasControls' `scale`.
const PPI = DPI;
const QR_BASE_PX = 75;
const PANEL_CORNER_IN = 0.25; // corner fillet

// ---------------------------------------------------------------------------
// Lanyard slot geometry — all values in INCHES. Tweak freely to match physical
// badge stock; everything is measured from the top edge of the front panel and
// centered horizontally.
// ---------------------------------------------------------------------------
const SLOT_SPECS = {
  twoCircle: {
    radius: 0.09, // hole radius
    y: 0.3, // top edge → hole center
    spacing: 2.5, // center-to-center distance between the two holes
  },
  threeRect: {
    width: 0.55, // slot width
    height: 0.13, // slot height
    gap: 0.55, // gap between adjacent slots
    y: 0.18, // top edge → slot top
  },
};

interface BadgeCanvasProps {
  page: BadgePage;
  panelSize: { width: number; height: number };
  /** Lanyard slot style, drawn near the top of the front panel only. */
  slots: SlotType;
  isFrontPage: boolean;
  /** Fold edges connecting to adjacent panels (multi-page badges). */
  foldTop: boolean;
  foldBottom: boolean;
  selectedIds: Set<string>;
  /** mousedown on a field — additive = shift held. */
  onFieldMouseDown: (id: string, additive: boolean) => void;
  onClearSelection: () => void;
  /** marquee finished — select these ids (additive = shift held). */
  onMarqueeSelect: (ids: string[], additive: boolean) => void;
  onChangeField: (id: string, patch: Partial<BadgeField>) => void;
  /** commit a (possibly multi-field) move in one history entry. */
  onMoveMany: (updates: { id: string; top: number; left: number }[]) => void;
  // From useCanvasControls
  scale: number;
  position: { x: number; y: number };
  stageSize: { width: number; height: number };
  stageRef: React.RefObject<Konva.Stage | null>;
  onWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onPositionChange: (pos: { x: number; y: number }) => void;
}

export function BadgeCanvas({
  page,
  panelSize,
  slots,
  isFrontPage,
  foldTop,
  foldBottom,
  selectedIds,
  onFieldMouseDown,
  onClearSelection,
  onMarqueeSelect,
  onChangeField,
  onMoveMany,
  scale,
  position,
  stageSize,
  stageRef,
  onWheel,
  onPositionChange,
}: BadgeCanvasProps) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef(new Map<string, Konva.Group>());
  const { activeGuides, snap, clear } = useBadgeGuides(page.fields, panelSize);
  const qrImage = useQrImage();

  // Hold Space to pan (matches the map editor). While held, the stage drags and
  // fields are inert.
  const [spaceHeld, setSpaceHeld] = useState(false);
  useEffect(() => {
    const isForm = (t: EventTarget | null) =>
      t instanceof HTMLInputElement ||
      t instanceof HTMLTextAreaElement ||
      t instanceof HTMLSelectElement;
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isForm(e.target)) {
        e.preventDefault();
        setSpaceHeld(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") setSpaceHeld(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  const panMode = spaceHeld;

  // Reflect pan mode on the cursor.
  useEffect(() => {
    const c = stageRef.current?.container();
    if (c) c.style.cursor = panMode ? "grab" : "default";
  }, [panMode, stageRef]);

  // Marquee + middle-mouse pan state.
  const marqueeOrigin = useRef<{ x: number; y: number } | null>(null);
  const [marquee, setMarquee] = useState<
    (Konva.Vector2d & { w: number; h: number }) | null
  >(null);
  const middlePan = useRef<{
    cx: number;
    cy: number;
    sx: number;
    sy: number;
  } | null>(null);
  // Start positions captured at drag start (for multi-move).
  const dragStarts = useRef(new Map<string, { x: number; y: number }>());

  const singleSelectedId = selectedIds.size === 1 ? [...selectedIds][0] : null;

  // Transformer attaches only for a single selection (group resize is disabled).
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const node = singleSelectedId
      ? nodeRefs.current.get(singleSelectedId)
      : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [singleSelectedId, page.fields]);

  const panelW = panelSize.width * PPI;
  const panelH = panelSize.height * PPI;

  const isQr =
    page.fields.find((f) => f.id === singleSelectedId)?.kind === "qrCode";
  const enabledAnchors = isQr
    ? ["top-left", "top-right", "bottom-left", "bottom-right"]
    : ["middle-left", "middle-right", "top-center", "bottom-center"];

  const localPoint = () => {
    const stage = stageRef.current;
    if (!stage) return null;
    const p = stage.getPointerPosition();
    if (!p) return null;
    return { x: (p.x - position.x) / scale, y: (p.y - position.y) / scale };
  };

  const isEmpty = (e: Konva.KonvaEventObject<MouseEvent>) =>
    e.target === e.target.getStage() || e.target.name() === "panel";

  // --- Stage-level mouse (marquee + middle-pan) ---

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.evt.button === 1) {
      e.evt.preventDefault();
      const stage = stageRef.current;
      if (!stage) return;
      middlePan.current = {
        cx: e.evt.clientX,
        cy: e.evt.clientY,
        sx: stage.x(),
        sy: stage.y(),
      };
      return;
    }
    if (panMode) return; // stage handles the drag-pan natively
    if (e.evt.button !== 0) return;
    if (isEmpty(e)) {
      if (!e.evt.shiftKey) onClearSelection();
      const p = localPoint();
      if (p) {
        marqueeOrigin.current = p;
        setMarquee({ x: p.x, y: p.y, w: 0, h: 0 });
      }
    }
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (middlePan.current) {
      const stage = stageRef.current;
      if (!stage) return;
      const { cx, cy, sx, sy } = middlePan.current;
      stage.position({
        x: sx + (e.evt.clientX - cx),
        y: sy + (e.evt.clientY - cy),
      });
      return;
    }
    if (marqueeOrigin.current) {
      const p = localPoint();
      if (!p) return;
      const o = marqueeOrigin.current;
      setMarquee({
        x: Math.min(o.x, p.x),
        y: Math.min(o.y, p.y),
        w: Math.abs(p.x - o.x),
        h: Math.abs(p.y - o.y),
      });
    }
  };

  const handleStageMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (middlePan.current) {
      const stage = stageRef.current;
      if (stage) onPositionChange(stage.position());
      middlePan.current = null;
      return;
    }
    if (marqueeOrigin.current && marquee) {
      const r = marquee;
      const hit = page.fields.filter((f) => {
        const { w, h } = fieldSizePx(f);
        const fl = f.left * PPI;
        const ft = f.top * PPI;
        return fl < r.x + r.w && fl + w > r.x && ft < r.y + r.h && ft + h > r.y;
      });
      // Treat a click (no real drag) as "no marquee selection".
      if (r.w > 2 || r.h > 2)
        onMarqueeSelect(
          hit.map((f) => f.id),
          e.evt.shiftKey,
        );
    }
    marqueeOrigin.current = null;
    setMarquee(null);
  };

  // --- Field drag (single snap or multi move) ---

  const handleFieldDragStart = (id: string) => {
    const ids = selectedIds.has(id) ? [...selectedIds] : [id];
    dragStarts.current.clear();
    for (const fid of ids) {
      const n = nodeRefs.current.get(fid);
      if (n) dragStarts.current.set(fid, { x: n.x(), y: n.y() });
    }
  };

  const handleFieldDragMove = (id: string, node: Konva.Node) => {
    if (dragStarts.current.size <= 1) {
      const field = page.fields.find((f) => f.id === id);
      if (!field) return;
      const { w, h } = fieldSizePx(field);
      const { x, y } = snap(id, node.x(), node.y(), w, h);
      node.x(x);
      node.y(y);
      return;
    }
    // Multi-move: shift every other selected node by the same delta.
    const start = dragStarts.current.get(id);
    if (!start) return;
    const dx = node.x() - start.x;
    const dy = node.y() - start.y;
    dragStarts.current.forEach((s, fid) => {
      if (fid === id) return;
      const n = nodeRefs.current.get(fid);
      if (n) {
        n.x(s.x + dx);
        n.y(s.y + dy);
      }
    });
  };

  const handleFieldDragEnd = () => {
    const updates: { id: string; top: number; left: number }[] = [];
    dragStarts.current.forEach((_, fid) => {
      const n = nodeRefs.current.get(fid);
      if (n) updates.push({ id: fid, left: n.x() / PPI, top: n.y() / PPI });
    });
    if (updates.length) onMoveMany(updates);
    dragStarts.current.clear();
    clear();
  };

  // Union bounds for a multi-selection outline.
  const multiBounds =
    selectedIds.size > 1
      ? (() => {
          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
          for (const f of page.fields) {
            if (!selectedIds.has(f.id)) continue;
            const { w, h } = fieldSizePx(f);
            minX = Math.min(minX, f.left * PPI);
            minY = Math.min(minY, f.top * PPI);
            maxX = Math.max(maxX, f.left * PPI + w);
            maxY = Math.max(maxY, f.top * PPI + h);
          }
          return minX === Infinity
            ? null
            : { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
        })()
      : null;

  return (
    <Stage
      ref={stageRef}
      width={stageSize.width}
      height={stageSize.height}
      scaleX={scale}
      scaleY={scale}
      x={position.x}
      y={position.y}
      draggable={panMode}
      onWheel={onWheel}
      onMouseDown={handleStageMouseDown}
      onMouseMove={handleStageMouseMove}
      onMouseUp={handleStageMouseUp}
      onDragEnd={(e) => {
        if (e.target === stageRef.current)
          onPositionChange(stageRef.current.position());
      }}
    >
      <Layer>
        {/* Card */}
        <Rect
          name="panel"
          x={0}
          y={0}
          width={panelW}
          height={panelH}
          cornerRadius={PANEL_CORNER_IN * PPI}
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth={1}
          shadowColor="#000000"
          shadowOpacity={0.12}
          shadowBlur={12}
          shadowOffsetY={2}
        />

        {/* Lanyard slots — front panel only (static; editor-only) */}
        {isFrontPage && slots !== "none" && (
          <Slots slots={slots} panelW={panelW} />
        )}

        {/* Tear-away perforation lines (static; editor-only) */}
        {page.tearaway &&
          (() => {
            const stubs = Math.max(1, page.tearawayCount ?? 3);
            return Array.from({ length: stubs - 1 }).map((_, i) => {
              const y = (panelH * (i + 1)) / stubs;
              return (
                <Line
                  key={`tear-${i}`}
                  points={[0, y, panelW, y]}
                  stroke="#94a3b8"
                  strokeWidth={1}
                  dash={[2, 3]}
                  listening={false}
                />
              );
            });
          })()}

        {page.fields.map((field) => (
          <FieldShape
            key={field.id}
            field={field}
            qrImage={qrImage}
            panMode={panMode}
            registerRef={(node) => {
              if (node) nodeRefs.current.set(field.id, node);
              else nodeRefs.current.delete(field.id);
            }}
            onMouseDown={(additive) => onFieldMouseDown(field.id, additive)}
            onChange={(patch) => onChangeField(field.id, patch)}
            onDragStart={() => handleFieldDragStart(field.id)}
            onDragMove={(node) => handleFieldDragMove(field.id, node)}
            onDragFinish={handleFieldDragEnd}
          />
        ))}

        {/* Multi-selection outline */}
        {multiBounds && (
          <Rect
            x={multiBounds.x - 4}
            y={multiBounds.y - 4}
            width={multiBounds.w + 8}
            height={multiBounds.h + 8}
            stroke="#007bff"
            strokeWidth={1}
            dash={[6, 3]}
            listening={false}
          />
        )}

        {/* Alignment guides */}
        {activeGuides.map((g, i) =>
          g.axis === "x" ? (
            <Line
              key={`gx-${i}`}
              points={[g.position, 0, g.position, panelH]}
              stroke="#ec4899"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          ) : (
            <Line
              key={`gy-${i}`}
              points={[0, g.position, panelW, g.position]}
              stroke="#ec4899"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />
          ),
        )}

        {/* Marquee */}
        {marquee && (marquee.w > 0 || marquee.h > 0) && (
          <Rect
            x={marquee.x}
            y={marquee.y}
            width={marquee.w}
            height={marquee.h}
            fill="rgba(0, 123, 255, 0.08)"
            stroke="#007bff"
            strokeWidth={1}
            dash={[4, 4]}
            listening={false}
          />
        )}

        {/* Fold indicators (section-plane style) on edges that connect panels */}
        {(foldTop || foldBottom) && (
          <FoldIndicators
            foldTop={foldTop}
            foldBottom={foldBottom}
            panelW={panelW}
            panelH={panelH}
          />
        )}

        <Transformer
          ref={transformerRef}
          rotateEnabled={false}
          keepRatio={isQr}
          enabledAnchors={enabledAnchors}
          ignoreStroke
          boundBoxFunc={(oldBox, newBox) =>
            newBox.width < 8 || newBox.height < 8 ? oldBox : newBox
          }
        />
      </Layer>
    </Stage>
  );
}

// ---------------------------------------------------------------------------

interface FieldShapeProps {
  field: BadgeField;
  qrImage: HTMLImageElement | null;
  panMode: boolean;
  registerRef: (node: Konva.Group | null) => void;
  onMouseDown: (additive: boolean) => void;
  onChange: (patch: Partial<BadgeField>) => void;
  onDragStart: () => void;
  onDragMove: (node: Konva.Node) => void;
  onDragFinish: () => void;
}

function FieldShape({
  field,
  qrImage,
  panMode,
  registerRef,
  onMouseDown,
  onChange,
  onDragStart,
  onDragMove,
  onDragFinish,
}: FieldShapeProps) {
  const x = field.left * PPI;
  const y = field.top * PPI;

  const handleMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (panMode) return; // let the event bubble so the stage pans
    e.cancelBubble = true; // don't start a marquee
    onMouseDown(e.evt.shiftKey);
  };
  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange({ left: e.target.x() / PPI, top: e.target.y() / PPI });
    onDragFinish();
  };

  if (field.kind === "qrCode") {
    const size = QR_BASE_PX * (field.scale ?? 1);
    return (
      <Group
        ref={registerRef}
        x={x}
        y={y}
        width={size}
        height={size}
        draggable={!panMode}
        onMouseDown={handleMouseDown}
        onDragStart={onDragStart}
        onDragMove={(e) => onDragMove(e.target)}
        onDragEnd={handleDragEnd}
        onTransformEnd={(e) => {
          const node = e.target;
          const newSize = node.width() * node.scaleX();
          node.scaleX(1);
          node.scaleY(1);
          onChange({ scale: newSize / QR_BASE_PX });
        }}
      >
        {qrImage ? (
          <>
            <Rect width={size} height={size} fill="#ffffff" />
            <KonvaImage
              image={qrImage}
              width={size}
              height={size}
              listening={false}
            />
          </>
        ) : (
          <>
            <Rect width={size} height={size} fill="#0f172a" cornerRadius={2} />
            <Text
              text="QR"
              width={size}
              height={size}
              align="center"
              verticalAlign="middle"
              fill="#ffffff"
              fontSize={Math.max(10, size * 0.25)}
              listening={false}
            />
          </>
        )}
      </Group>
    );
  }

  const w = (field.width ?? 2) * PPI;
  const h = (field.height ?? 0.3) * PPI;
  const fontSize = field.fontSize ?? 20;
  const inverted = Boolean(field.inverted);

  return (
    <Group
      ref={registerRef}
      x={x}
      y={y}
      draggable={!panMode}
      onMouseDown={handleMouseDown}
      onDragStart={onDragStart}
      onDragMove={(e) => onDragMove(e.target)}
      onDragEnd={handleDragEnd}
      onTransformEnd={(e) => {
        const node = e.target;
        const newW = node.width() * node.scaleX();
        const newH = node.height() * node.scaleY();
        node.scaleX(1);
        node.scaleY(1);
        onChange({
          width: newW / PPI,
          height: newH / PPI,
          numLines: Math.max(1, Math.floor(newH / fontSize)),
        });
      }}
      width={w}
      height={h}
    >
      {field.kind === "image" ? (
        <Rect
          width={w}
          height={h}
          fill="#e2e8f0"
          stroke="#94a3b8"
          strokeWidth={1}
        />
      ) : field.kind === "tickets" ? (
        <Rect
          width={w}
          height={h}
          fill="transparent"
          stroke="#0f172a"
          strokeWidth={1}
        />
      ) : (
        <Rect
          width={w}
          height={h}
          fill="transparent"
          stroke="#94a3b8"
          strokeWidth={1}
          dash={[4, 4]}
        />
      )}
      <Group
        x={inverted ? w : 0}
        y={inverted ? h : 0}
        rotation={inverted ? 180 : 0}
        listening={false}
      >
        <FieldContent field={field} w={w} h={h} fontSize={fontSize} />
      </Group>
    </Group>
  );
}

/** Static lanyard hole-punch slots near the top of the front panel. */
function Slots({ slots, panelW }: { slots: SlotType; panelW: number }) {
  const fill = "#f1f5f9";
  const stroke = "#94a3b8";

  if (slots === "two-circle") {
    const s = SLOT_SPECS.twoCircle;
    const r = s.radius * PPI;
    const cy = s.y * PPI;
    const dx = (s.spacing / 2) * PPI;
    return (
      <>
        <Circle
          x={panelW / 2 - dx}
          y={cy}
          radius={r}
          fill={fill}
          stroke={stroke}
          strokeWidth={1}
          listening={false}
        />
        <Circle
          x={panelW / 2 + dx}
          y={cy}
          radius={r}
          fill={fill}
          stroke={stroke}
          strokeWidth={1}
          listening={false}
        />
      </>
    );
  }

  // three-rect — three pill slots side by side
  const s = SLOT_SPECS.threeRect;
  const sw = s.width * PPI;
  const sh = s.height * PPI;
  const gap = s.gap * PPI;
  const y = s.y * PPI;
  const total = 3 * sw + 2 * gap;
  const startX = (panelW - total) / 2;
  return (
    <>
      {[0, 1, 2].map((i) => (
        <Rect
          key={i}
          x={startX + i * (sw + gap)}
          y={y}
          width={sw}
          height={sh}
          cornerRadius={sh / 2}
          fill={fill}
          stroke={stroke}
          strokeWidth={1}
          listening={false}
        />
      ))}
    </>
  );
}

/**
 * Section-plane-style fold indicator: a dash-dot line across a panel edge with
 * arrows pointing toward the adjacent panel (the fold direction). Drawn on the
 * edges that connect to other panels in a multi-page badge.
 */
function FoldIndicators({
  foldTop,
  foldBottom,
  panelW,
  panelH,
}: {
  foldTop: boolean;
  foldBottom: boolean;
  panelW: number;
  panelH: number;
}) {
  const color = "#6366f1"; // indigo — distinct from guides/slots/tearaways
  const gap = 0.12 * PPI; // breathing room between the panel edge and the line
  const overhang = 0.35 * PPI; // how far the line extends past the panel width
  const arrowLen = 0.3 * PPI;
  const dash = [10, 4, 2, 4]; // dash-dot

  // `edgeY` is the panel edge; the line sits `gap` beyond it in the fold dir.
  const edge = (edgeY: number, dir: 1 | -1, key: string) => {
    const y = edgeY + dir * gap;
    const x1 = -overhang;
    const x2 = panelW + overhang;
    return (
      <Group key={key} listening={false}>
        <Line points={[x1, y, x2, y]} stroke={color} strokeWidth={1} dash={dash} />
        {[x1, x2].map((x, i) => (
          <Arrow
            key={i}
            points={[x, y, x, y + dir * arrowLen]}
            stroke={color}
            fill={color}
            strokeWidth={1.5}
            pointerLength={6}
            pointerWidth={6}
          />
        ))}
      </Group>
    );
  };

  return (
    <>
      {foldTop && edge(0, -1, "top")}
      {foldBottom && edge(panelH, 1, "bottom")}
    </>
  );
}

function FieldContent({
  field,
  w,
  h,
  fontSize,
}: {
  field: BadgeField;
  w: number;
  h: number;
  fontSize: number;
}) {
  if (field.kind === "tickets") {
    const rows = field.numRows ?? 1;
    const rowH = h / rows;
    return (
      <>
        {Array.from({ length: rows }).map((_, i) => (
          <Group key={i}>
            {i > 0 && (
              <Line
                points={[0, rowH * i, w, rowH * i]}
                stroke="#0f172a"
                strokeWidth={1}
              />
            )}
            <Text
              text={`Ticket ${i + 1}`}
              x={8}
              y={rowH * i + 6}
              fontSize={12}
              fill="#0f172a"
            />
          </Group>
        ))}
      </>
    );
  }

  if (field.kind === "image") {
    return (
      <Text
        text="Image"
        width={w}
        height={h}
        align="center"
        verticalAlign="middle"
        fontSize={14}
        fill="#64748b"
      />
    );
  }

  return (
    <Text
      text={fieldDisplayText(field)}
      width={w}
      height={h}
      align={
        field.textAlign === "justify" ? "left" : (field.textAlign ?? "center")
      }
      verticalAlign="middle"
      fontSize={fontSize}
      fill="#0f172a"
    />
  );
}

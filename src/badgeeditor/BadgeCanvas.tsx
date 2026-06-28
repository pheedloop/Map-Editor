import { useEffect, useRef } from "react";
import { Stage, Layer, Rect, Text, Group, Line, Transformer } from "react-konva";
import type Konva from "konva";
import { DPI, type BadgeField, type BadgePage } from "./model";
import { fieldDisplayText } from "./factory";
import { fieldSizePx, useBadgeGuides } from "./useBadgeGuides";

// Canvas renders at 96px per inch (the legacy DPI); zoom is layered on top via
// useCanvasControls' `scale`.
const PPI = DPI;

interface BadgeCanvasProps {
  page: BadgePage;
  panelSize: { width: number; height: number };
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChangeField: (id: string, patch: Partial<BadgeField>) => void;
  // From useCanvasControls
  scale: number;
  position: { x: number; y: number };
  stageSize: { width: number; height: number };
  stageRef: React.RefObject<Konva.Stage | null>;
  onWheel: (e: Konva.KonvaEventObject<WheelEvent>) => void;
  onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => void;
}

const QR_BASE_PX = 75; // legacy base QR size; display size = QR_BASE_PX * scale

export function BadgeCanvas({
  page,
  panelSize,
  selectedId,
  onSelect,
  onChangeField,
  scale,
  position,
  stageSize,
  stageRef,
  onWheel,
  onDragEnd,
}: BadgeCanvasProps) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const nodeRefs = useRef(new Map<string, Konva.Group>());

  const { activeGuides, snap, clear } = useBadgeGuides(page.fields, panelSize);

  const selectedField = page.fields.find((f) => f.id === selectedId) ?? null;

  // Keep the transformer attached to the selected node.
  useEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const node = selectedId ? nodeRefs.current.get(selectedId) : null;
    tr.nodes(node ? [node] : []);
    tr.getLayer()?.batchDraw();
  }, [selectedId, page.fields]);

  const panelW = panelSize.width * PPI;
  const panelH = panelSize.height * PPI;

  // Anchors: text/box fields resize edges; qrCode is uniform (corners, ratio).
  const isQr = selectedField?.kind === "qrCode";
  const enabledAnchors = isQr
    ? ["top-left", "top-right", "bottom-left", "bottom-right"]
    : ["middle-left", "middle-right", "top-center", "bottom-center"];

  return (
    <Stage
      ref={stageRef}
      width={stageSize.width}
      height={stageSize.height}
      scaleX={scale}
      scaleY={scale}
      x={position.x}
      y={position.y}
      draggable
      onWheel={onWheel}
      onDragEnd={onDragEnd}
      onMouseDown={(e) => {
        // Click on empty space (stage or panel) clears selection.
        if (e.target === e.target.getStage() || e.target.name() === "panel") {
          onSelect(null);
        }
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
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth={1}
          shadowColor="#000000"
          shadowOpacity={0.12}
          shadowBlur={12}
          shadowOffsetY={2}
        />

        {page.fields.map((field) => (
          <FieldShape
            key={field.id}
            field={field}
            registerRef={(node) => {
              if (node) nodeRefs.current.set(field.id, node);
              else nodeRefs.current.delete(field.id);
            }}
            onSelect={() => onSelect(field.id)}
            onChange={(patch) => onChangeField(field.id, patch)}
            onDragMove={(node) => {
              const { w, h } = fieldSizePx(field);
              const { x, y } = snap(field.id, node.x(), node.y(), w, h);
              node.x(x);
              node.y(y);
            }}
            onDragFinish={() => clear()}
          />
        ))}

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
  registerRef: (node: Konva.Group | null) => void;
  onSelect: () => void;
  onChange: (patch: Partial<BadgeField>) => void;
  /** Live snapping during drag — may reposition the node in place. */
  onDragMove: (node: Konva.Node) => void;
  /** Drag finished — clear guides. */
  onDragFinish: () => void;
}

function FieldShape({
  field,
  registerRef,
  onSelect,
  onChange,
  onDragMove,
  onDragFinish,
}: FieldShapeProps) {
  const x = field.left * PPI;
  const y = field.top * PPI;

  const handleDragMove = (e: Konva.KonvaEventObject<DragEvent>) => {
    onDragMove(e.target);
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
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragMove={handleDragMove}
        onDragEnd={handleDragEnd}
        onTransformEnd={(e) => {
          const node = e.target;
          const newSize = node.width() * node.scaleX();
          node.scaleX(1);
          node.scaleY(1);
          onChange({ scale: newSize / QR_BASE_PX });
        }}
      >
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
      </Group>
    );
  }

  // text / sessionSchedule / tickets / image — box fields.
  const w = (field.width ?? 2) * PPI;
  const h = (field.height ?? 0.3) * PPI;
  const fontSize = field.fontSize ?? 20;
  const inverted = Boolean(field.inverted);

  return (
    <Group
      ref={registerRef}
      x={x}
      y={y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
      onDragMove={handleDragMove}
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
      {/* Background + border: a filled (hittable) rect so the whole box can be
          clicked/dragged, not just the 1px outline. Symmetric, so it does not
          need to flip when inverted. */}
      {field.kind === "image" ? (
        <Rect width={w} height={h} fill="#e2e8f0" stroke="#94a3b8" strokeWidth={1} />
      ) : field.kind === "tickets" ? (
        <Rect width={w} height={h} fill="transparent" stroke="#0f172a" strokeWidth={1} />
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
      {/* Content flips 180° in place when inverted; the outer group keeps its
          top-left origin so drag/transform math is unaffected. */}
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
              <Line points={[0, rowH * i, w, rowH * i]} stroke="#0f172a" strokeWidth={1} />
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

  // text / sessionSchedule
  return (
    <Text
      text={fieldDisplayText(field)}
      width={w}
      height={h}
      align={field.textAlign === "justify" ? "left" : field.textAlign ?? "center"}
      verticalAlign="middle"
      fontSize={fontSize}
      fill="#0f172a"
    />
  );
}

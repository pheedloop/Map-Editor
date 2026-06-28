import { useEffect, useRef } from "react";
import { Stage, Layer, Rect, Text, Group, Transformer } from "react-konva";
import type Konva from "konva";
import { DPI, type BadgeField, type BadgePage } from "./model";
import { fieldDisplayText } from "./factory";

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
            selected={field.id === selectedId}
            registerRef={(node) => {
              if (node) nodeRefs.current.set(field.id, node);
              else nodeRefs.current.delete(field.id);
            }}
            onSelect={() => onSelect(field.id)}
            onChange={(patch) => onChangeField(field.id, patch)}
          />
        ))}

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
  selected: boolean;
  registerRef: (node: Konva.Group | null) => void;
  onSelect: () => void;
  onChange: (patch: Partial<BadgeField>) => void;
}

function FieldShape({ field, registerRef, onSelect, onChange }: FieldShapeProps) {
  const x = field.left * PPI;
  const y = field.top * PPI;

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    onChange({ left: e.target.x() / PPI, top: e.target.y() / PPI });
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

  // text / sessionSchedule / tickets / image — box with label for the slice.
  const w = (field.width ?? 2) * PPI;
  const h = (field.height ?? 0.3) * PPI;
  const fontSize = field.fontSize ?? 20;

  return (
    <Group
      ref={registerRef}
      x={x}
      y={y}
      draggable
      onClick={onSelect}
      onTap={onSelect}
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
      <Rect width={w} height={h} stroke="#94a3b8" strokeWidth={1} dash={[4, 4]} />
      <Text
        text={fieldDisplayText(field)}
        width={w}
        height={h}
        align={field.textAlign === "justify" ? "left" : field.textAlign ?? "center"}
        verticalAlign="middle"
        fontSize={fontSize}
        fill="#0f172a"
        listening={false}
      />
    </Group>
  );
}

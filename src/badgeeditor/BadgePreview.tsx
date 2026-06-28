import { useRef } from "react";
import { Stage, Layer, Rect, Group, Line } from "react-konva";
import { useCanvasControls } from "../editor/hooks/useCanvasControls";
import {
  StaticField,
  Slots,
  useQrImage,
  PPI,
  PANEL_CORNER_IN,
} from "./BadgeCanvas";
import { foldInvertForPage } from "./serialize";
import type { BadgeDocument } from "./model";

/**
 * Read-only "as printed" preview: every panel stitched at its true print offset
 * on one tall sheet, with folded-back panels rendered upside-down (page-level
 * 180° rotation, composed with any field-level inversion). Pan with drag, zoom
 * with the wheel. No editing.
 */
export function BadgePreview({ doc }: { doc: BadgeDocument }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const c = useCanvasControls(containerRef);
  const qrImage = useQrImage();

  const panelW = doc.panelSize.width * PPI;
  const panelH = doc.panelSize.height * PPI;
  const n = doc.pages.length;
  const totalH = panelH * n;

  return (
    <div ref={containerRef} className="w-full h-full overflow-hidden bg-gray-100">
      <Stage
        ref={c.stageRef}
        width={c.stageSize.width}
        height={c.stageSize.height}
        scaleX={c.scale}
        scaleY={c.scale}
        x={c.position.x}
        y={c.position.y}
        draggable
        onWheel={c.handleWheel}
        onDragEnd={c.handleDragEnd}
      >
        <Layer>
          {/* The full unfolded sheet */}
          <Rect
            x={0}
            y={0}
            width={panelW}
            height={totalH}
            cornerRadius={PANEL_CORNER_IN * PPI}
            fill="#ffffff"
            stroke="#cbd5e1"
            strokeWidth={1}
            shadowColor="#000000"
            shadowOpacity={0.12}
            shadowBlur={12}
            shadowOffsetY={2}
          />

          {/* Lanyard slots — top of the front panel */}
          {doc.slots && doc.slots !== "none" && (
            <Slots slots={doc.slots} panelW={panelW} />
          )}

          {/* Each panel at its print offset, flipped if it prints inverted */}
          {doc.pages.map((page, i) => {
            const offsetTop = i * panelH;
            const inverted = page.inverted ?? foldInvertForPage(doc.fold, i);
            const stubs = page.tearaway ? Math.max(1, page.tearawayCount ?? 3) : 0;
            return (
              <Group key={page.id} x={0} y={offsetTop}>
                <Group
                  x={inverted ? panelW : 0}
                  y={inverted ? panelH : 0}
                  rotation={inverted ? 180 : 0}
                >
                  {page.fields.map((f) => (
                    <StaticField key={f.id} field={f} qrImage={qrImage} />
                  ))}
                  {stubs > 1 &&
                    Array.from({ length: stubs - 1 }).map((_, k) => {
                      const y = (panelH * (k + 1)) / stubs;
                      return (
                        <Line
                          key={k}
                          points={[0, y, panelW, y]}
                          stroke="#94a3b8"
                          strokeWidth={1}
                          dash={[2, 3]}
                          listening={false}
                        />
                      );
                    })}
                </Group>
              </Group>
            );
          })}

          {/* Fold creases between panels */}
          {Array.from({ length: n - 1 }).map((_, i) => {
            const y = (i + 1) * panelH;
            return (
              <Line
                key={`crease-${i}`}
                points={[0, y, panelW, y]}
                stroke="#cbd5e1"
                strokeWidth={1}
                dash={[8, 4]}
                listening={false}
              />
            );
          })}
        </Layer>
      </Stage>
    </div>
  );
}

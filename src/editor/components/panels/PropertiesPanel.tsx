import { useState } from "react";
import type {
  FloorPlanElement,
  ElementProperties,
  Geometry,
  BackgroundImage,
  LayerId,
  Dimensions,
  ElementTypeDefaults,
} from "../../../types";
import { getToolUIConfig } from "../../tools/registry";
import type { PropertiesPanelField } from "../canvas/elements/types";
import { formatMeasurement, formatArea } from "../../../utils/unitConversion";
import {
  Button,
  TabBar,
  Slider,
  SectionLabel,
  FieldRow,
  NumberInput,
  TextInput,
  TextArea,
  ColorSwatch,
} from "../ui";
import { JsonDebugView } from "../debug";
import { LabelSection } from "./LabelSection";

interface PropertiesPanelProps {
  element: FloorPlanElement | null;
  selectedElements: FloorPlanElement[];
  selectedCount: number;
  isSelectedUnlinked: boolean;
  dimensions: Dimensions;
  backgroundImage?: BackgroundImage;
  backgroundColor?: string;
  activeLayerId: LayerId;
  debug: boolean;
  onUpdateProperties: (id: string, updates: Partial<ElementProperties>) => void;
  onPreviewProperties: (
    id: string,
    updates: Partial<ElementProperties>,
  ) => void;
  onBatchUpdateProperties: (updates: Partial<ElementProperties>) => void;
  onUpdateGeometry: (id: string, updates: Partial<Geometry>) => void;
  onDelete: (id: string) => void;
  onBackgroundOpacityChange?: (opacity: number) => void;
  onRemoveBackground?: () => void;
  onUploadBackground?: () => void;
  onBackgroundColorChange?: (color: string) => void;
  onUpdateTypeStyles: (
    key: string,
    updates: Partial<ElementTypeDefaults>,
  ) => void;
}

function getCommonValue<T>(
  elements: FloorPlanElement[],
  getter: (el: FloorPlanElement) => T,
): T | undefined {
  if (elements.length === 0) return undefined;
  const vals = elements.map(getter);
  const first = JSON.stringify(vals[0]);
  return vals.every((v) => JSON.stringify(v) === first) ? vals[0] : undefined;
}

function getDimensions(element: FloorPlanElement): {
  width: number;
  height: number;
  length: number;
} {
  const geo = element.geometry;
  if (geo.shape === "rect")
    return { width: geo.width, height: geo.height, length: 0 };
  if (geo.shape === "ellipse")
    return { width: geo.radiusX * 2, height: geo.radiusY * 2, length: 0 };
  if (geo.shape === "line") {
    const [x1, y1, x2, y2] = geo.points;
    const dx = x2 - x1;
    const dy = y2 - y1;
    return {
      width: 0,
      height: 0,
      length: Math.round(Math.sqrt(dx * dx + dy * dy)),
    };
  }
  if (geo.shape === "arc") {
    // Approximate arc length using chord + control point deviation
    const [x1, y1, cx, cy, x2, y2] = geo.points;
    const chordLen = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
    const controlLen =
      Math.sqrt((cx - x1) ** 2 + (cy - y1) ** 2) +
      Math.sqrt((x2 - cx) ** 2 + (y2 - cy) ** 2);
    // Average of chord and control polygon is a reasonable approximation
    return {
      width: 0,
      height: 0,
      length: Math.round((chordLen + controlLen) / 2),
    };
  }
  return { width: 0, height: 0, length: 0 };
}

function extractTypeDefaults(props: ElementProperties, geometry: Geometry): ElementTypeDefaults {
  let defaultWidth: number | undefined;
  let defaultHeight: number | undefined;
  if (geometry.shape === "rect") {
    defaultWidth = geometry.width;
    defaultHeight = geometry.height;
  } else if (geometry.shape === "ellipse") {
    defaultWidth = geometry.radiusX * 2;
    defaultHeight = geometry.radiusY * 2;
  } else if (geometry.shape === "circle") {
    defaultWidth = geometry.radius * 2;
    defaultHeight = geometry.radius * 2;
  }

  return {
    color: props.color,
    strokeColor: props.strokeColor,
    strokeWidth: props.strokeWidth,
    opacity: props.opacity,
    labelColor: props.labelColor,
    labelFontSize: props.labelFontSize,
    labelBold: props.labelBold,
    labelItalic: props.labelItalic,
    labelUnderline: props.labelUnderline,
    labelBackground: props.labelBackground,
    labelVisible: props.labelVisible,
    labelPositionV: props.labelPositionV,
    labelPositionH: props.labelPositionH,
    defaultWidth,
    defaultHeight,
  };
}

export function PropertiesPanel({
  element,
  selectedElements,
  selectedCount,
  isSelectedUnlinked,
  dimensions,
  backgroundImage,
  backgroundColor,
  activeLayerId,
  debug,
  onUpdateProperties,
  onPreviewProperties,
  onBatchUpdateProperties,
  onUpdateGeometry,
  onDelete,
  onBackgroundOpacityChange,
  onRemoveBackground,
  onUploadBackground,
  onBackgroundColorChange,
  onUpdateTypeStyles,
}: PropertiesPanelProps) {
  const [tab, setTab] = useState<"properties" | "debug">("properties");

  if (!element && selectedCount > 1) {
    // Elements that support labels (rects and ellipses, excluding text labels and icons)
    const labelableElements = selectedElements.filter((el) => {
      const s = el.geometry.shape;
      return (
        (s === "rect" || s === "ellipse") &&
        el.type !== "label" &&
        el.type !== "icon"
      );
    });
    const hasLabelable = labelableElements.length > 0;

    // Build mixed-state properties for LabelSection
    const mixedProps: Partial<ElementProperties> = hasLabelable
      ? {
          labelPositionV: getCommonValue(
            labelableElements,
            (el) => el.properties.labelPositionV ?? "middle",
          ) as ElementProperties["labelPositionV"],
          labelPositionH: getCommonValue(
            labelableElements,
            (el) => el.properties.labelPositionH ?? "center",
          ) as ElementProperties["labelPositionH"],
          labelColor: getCommonValue(
            labelableElements,
            (el) => el.properties.labelColor ?? "#ffffff",
          ),
          labelFontSize: getCommonValue(
            labelableElements,
            (el) => el.properties.labelFontSize ?? 12,
          ),
          labelBold: getCommonValue(
            labelableElements,
            (el) => el.properties.labelBold ?? true,
          ),
          labelItalic: getCommonValue(
            labelableElements,
            (el) => el.properties.labelItalic ?? false,
          ),
          labelUnderline: getCommonValue(
            labelableElements,
            (el) => el.properties.labelUnderline ?? false,
          ),
          labelVisible: getCommonValue(labelableElements, (el) =>
            el.properties.labelVisible !== false ? true : false,
          ),
          labelBackground: getCommonValue(
            labelableElements,
            (el) => el.properties.labelBackground,
          ),
        }
      : {};

    const commonOpacity = getCommonValue(
      selectedElements,
      (el) => el.properties.opacity ?? 1,
    );

    return (
      <div className="w-60 shrink-0 border-l border-gray-200 bg-white flex flex-col">
        <div className="px-3 py-2 border-b border-gray-200">
          <span className="text-xs font-medium text-gray-600">
            {selectedCount} elements selected
          </span>
        </div>
        <div className="flex flex-col gap-4 p-3 overflow-y-auto flex-1">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <SectionLabel>Opacity</SectionLabel>
              <span className="text-[11px] text-gray-400">
                {commonOpacity !== undefined
                  ? `${Math.round(commonOpacity * 100)}%`
                  : "Mixed"}
              </span>
            </div>
            <Slider
              min={0}
              max={100}
              value={
                commonOpacity !== undefined
                  ? Math.round(commonOpacity * 100)
                  : 100
              }
              onChange={(e) =>
                onBatchUpdateProperties({
                  opacity: Number(e.target.value) / 100,
                })
              }
              className="w-full"
            />
          </div>

          {hasLabelable && (
            <>
              <LabelSection
                properties={mixedProps as ElementProperties}
                onChange={(updates) => onBatchUpdateProperties(updates)}
              />
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  color="neutral"
                  className="flex-1 text-xs"
                  onClick={() =>
                    onBatchUpdateProperties({ labelVisible: false })
                  }
                >
                  Hide All Labels
                </Button>
                <Button
                  variant="outline"
                  color="neutral"
                  className="flex-1 text-xs"
                  onClick={() =>
                    onBatchUpdateProperties({ labelVisible: true })
                  }
                >
                  Show All Labels
                </Button>
              </div>
            </>
          )}
        </div>
        <div className="p-3 border-t border-gray-200">
          <Button
            variant="outline"
            color="negative"
            className="w-full"
            onClick={() => onDelete("")}
          >
            Delete All ({selectedCount})
          </Button>
        </div>
      </div>
    );
  }

  if (!element) {
    if (activeLayerId === "background") {
      return (
        <div className="w-60 shrink-0 border-l border-gray-200 bg-white flex flex-col">
          <div className="px-3 py-2 border-b border-gray-200">
            <span className="text-xs font-medium text-gray-600">
              Background
            </span>
          </div>
          <div className="flex flex-col gap-4 p-3 overflow-y-auto flex-1">
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Background Color</SectionLabel>
              <ColorSwatch
                label=""
                value={backgroundColor ?? "#ffffff"}
                onChange={(c) => onBackgroundColorChange?.(c)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <SectionLabel>Background Image</SectionLabel>
              {backgroundImage ? (
                <div className="flex flex-col gap-2">
                  <div
                    className="w-full h-20 rounded border border-gray-200 bg-gray-50"
                    style={{
                      backgroundImage: `url(${backgroundImage.url})`,
                      backgroundSize: "contain",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                    }}
                  />
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">Opacity</span>
                      <span className="text-[11px] text-gray-400">
                        {Math.round(backgroundImage.opacity * 100)}%
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={100}
                      value={Math.round(backgroundImage.opacity * 100)}
                      onChange={(e) =>
                        onBackgroundOpacityChange?.(
                          Number(e.target.value) / 100,
                        )
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      color="neutral"
                      className="flex-1"
                      onClick={onUploadBackground}
                    >
                      Replace
                    </Button>
                    <Button
                      variant="outline"
                      color="negative"
                      className="flex-1"
                      onClick={onRemoveBackground}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={onUploadBackground}
                  className="w-full text-xs text-gray-600 border border-gray-200 border-dashed rounded px-2 py-3 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  Upload Image
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-60 shrink-0 border-l border-gray-200 bg-white p-4">
        <p className="text-xs text-gray-400">No Items Selected</p>
      </div>
    );
  }

  const geo = element.geometry;
  const config = getToolUIConfig(geo.shape, element.type);
  const fields = new Set<PropertiesPanelField>(config.propertiesPanel);
  const dims = getDimensions(element);

  const handleWidthChange = (w: number) => {
    if (w <= 0) return;
    if (geo.shape === "rect") {
      onUpdateGeometry(element.id, { width: w });
    } else if (geo.shape === "ellipse") {
      onUpdateGeometry(element.id, { radiusX: w / 2 });
    }
  };

  const handleHeightChange = (h: number) => {
    if (h <= 0) return;
    if (geo.shape === "rect") {
      onUpdateGeometry(element.id, { height: h });
    } else if (geo.shape === "ellipse") {
      onUpdateGeometry(element.id, { radiusY: h / 2 });
    }
  };

  return (
    <div className="w-60 shrink-0 border-l border-gray-200 bg-white flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        {debug && (
          <TabBar
            tabs={[
              { id: "properties", label: "Props" },
              { id: "debug", label: "Debug" },
            ]}
            value={tab}
            onChange={(id) => setTab(id as typeof tab)}
            itemClassName="px-1.5 py-0.5 text-[10px]"
          />
        )}
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <span className="text-xs font-medium text-gray-600 capitalize">
          {element.type === "shape"
            ? element.properties.arrowHead
              ? "arrow"
              : geo.shape
            : element.type === "session_area"
              ? "Session Location"
              : element.type === "meeting_room"
                ? "Meeting Room"
                : element.type}
        </span>
      </div>

      {tab === "debug" && debug ? (
        <div className="flex-1 overflow-auto p-2">
          <JsonDebugView data={element} />
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-3 overflow-y-auto flex-1">
          {isSelectedUnlinked && (
            <div className="flex items-start gap-1.5 px-2 py-1.5 rounded bg-red-50 border border-red-200">
              <span className="text-red-500 text-[10px] font-medium leading-4">
                Unlinked
              </span>
              <span className="text-red-400 text-[10px] leading-4">
                — switch to Placement Mode and drag a record onto this shape to
                link it.
              </span>
            </div>
          )}
          {fields.has("name") && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Name</SectionLabel>
              <TextInput
                value={element.properties.name || ""}
                onChange={(e) =>
                  onUpdateProperties(element.id, { name: e.target.value })
                }
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <SectionLabel>Opacity</SectionLabel>
              <span className="text-[11px] text-gray-400">
                {Math.round((element.properties.opacity ?? 1) * 100)}%
              </span>
            </div>
            <Slider
              min={0}
              max={100}
              value={Math.round((element.properties.opacity ?? 1) * 100)}
              onMouseDown={() => {
                // Push current state to undo stack before dragging begins
                onUpdateProperties(element.id, {
                  opacity: element.properties.opacity ?? 1,
                });
              }}
              onChange={(e) => {
                // Live preview without undo entries
                onPreviewProperties(element.id, {
                  opacity: Number(e.target.value) / 100,
                });
              }}
              className="w-full"
            />
          </div>

          {(geo.shape === "rect" ||
            geo.shape === "ellipse" ||
            geo.shape === "polygon" ||
            geo.shape === "circle") &&
            element.type !== "label" &&
            element.type !== "icon" && (
              <LabelSection
                properties={{
                  ...element.properties,
                  labelPositionV: element.properties.labelPositionV ?? "middle",
                  labelPositionH: element.properties.labelPositionH ?? "center",
                }}
                onChange={(updates) => onUpdateProperties(element.id, updates)}
              />
            )}

          {fields.has("text") && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Text</SectionLabel>
              <TextArea
                value={element.properties.text || ""}
                rows={2}
                onChange={(e) =>
                  onUpdateProperties(element.id, { text: e.target.value })
                }
              />
            </div>
          )}

          {fields.has("fontSize") && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Font Size</SectionLabel>
              <NumberInput
                value={element.properties.fontSize ?? 16}
                onChange={(v) =>
                  onUpdateProperties(element.id, { fontSize: Math.max(1, v) })
                }
              />
            </div>
          )}

          {(fields.has("fontWeight") ||
            fields.has("fontStyle") ||
            fields.has("textDecoration")) && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Style</SectionLabel>
              <div className="flex gap-1">
                {fields.has("fontWeight") && (
                  <Button
                    variant="outline"
                    color="neutral"
                    active={element.properties.fontWeight === "bold"}
                    className="w-8 h-8 p-0 font-bold"
                    onClick={() =>
                      onUpdateProperties(element.id, {
                        fontWeight:
                          element.properties.fontWeight === "bold"
                            ? "normal"
                            : "bold",
                      })
                    }
                  >
                    B
                  </Button>
                )}
                {fields.has("fontStyle") && (
                  <Button
                    variant="outline"
                    color="neutral"
                    active={element.properties.fontStyle === "italic"}
                    className="w-8 h-8 p-0 italic"
                    onClick={() =>
                      onUpdateProperties(element.id, {
                        fontStyle:
                          element.properties.fontStyle === "italic"
                            ? "normal"
                            : "italic",
                      })
                    }
                  >
                    I
                  </Button>
                )}
                {fields.has("textDecoration") && (
                  <Button
                    variant="outline"
                    color="neutral"
                    active={element.properties.textDecoration === "underline"}
                    className="w-8 h-8 p-0 underline"
                    onClick={() =>
                      onUpdateProperties(element.id, {
                        textDecoration:
                          element.properties.textDecoration === "underline"
                            ? "none"
                            : "underline",
                      })
                    }
                  >
                    U
                  </Button>
                )}
              </div>
            </div>
          )}

          {fields.has("textAlign") && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Alignment</SectionLabel>
              <div className="flex">
                {(["left", "center", "right"] as const).map((align) => (
                  <Button
                    key={align}
                    variant="outline"
                    color="neutral"
                    active={(element.properties.textAlign ?? "left") === align}
                    className={`flex-1 py-1 capitalize ${
                      align === "left"
                        ? "rounded-r-none"
                        : align === "right"
                          ? "rounded-l-none"
                          : "rounded-none border-l-0 border-r-0"
                    }`}
                    onClick={() =>
                      onUpdateProperties(element.id, { textAlign: align })
                    }
                  >
                    {align}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {(fields.has("width") || fields.has("height")) &&
            (geo.shape === "rect" || geo.shape === "ellipse") && (
              <div className="flex flex-col gap-1.5">
                <SectionLabel>Size</SectionLabel>
                {fields.has("width") && (
                  <FieldRow label="W">
                    <NumberInput
                      value={dims.width}
                      onChange={handleWidthChange}
                    />
                  </FieldRow>
                )}
                {fields.has("height") && (
                  <FieldRow label="H">
                    <NumberInput
                      value={dims.height}
                      onChange={handleHeightChange}
                    />
                  </FieldRow>
                )}
              </div>
            )}

          {fields.has("rotation") && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Rotation</SectionLabel>
              <FieldRow label="°">
                <NumberInput
                  value={"rotation" in geo ? (geo.rotation ?? 0) : 0}
                  onChange={(r) =>
                    onUpdateGeometry(element.id, { rotation: r })
                  }
                />
              </FieldRow>
            </div>
          )}

          {fields.has("area") && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Area</SectionLabel>
              <div className="px-2 py-1 text-xs text-gray-600 bg-gray-50 rounded border border-gray-200">
                {formatArea(dims.width, dims.height, dimensions)}
              </div>
            </div>
          )}

          {fields.has("length") && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Length</SectionLabel>
              <div className="px-2 py-1 text-xs text-gray-600 bg-gray-50 rounded border border-gray-200">
                {formatMeasurement(dims.length, dimensions)}
              </div>
            </div>
          )}

          {fields.has("arrowHeadStyle") && element.properties.arrowHead && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Arrow Style</SectionLabel>
              <div className="flex">
                {(["triangle", "chevron"] as const).map((style) => (
                  <Button
                    key={style}
                    variant="outline"
                    color="neutral"
                    active={element.properties.arrowHead?.style === style}
                    className={`flex-1 py-1 capitalize ${
                      style === "triangle" ? "rounded-r-none" : "rounded-l-none"
                    }`}
                    onClick={() =>
                      onUpdateProperties(element.id, {
                        arrowHead: { ...element.properties.arrowHead!, style },
                      })
                    }
                  >
                    {style}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {fields.has("arrowHeadSize") && element.properties.arrowHead && (
            <div className="flex flex-col gap-1.5">
              <SectionLabel>Arrow Size</SectionLabel>
              <FieldRow label="px">
                <NumberInput
                  value={element.properties.arrowHead.size}
                  onChange={(v) =>
                    onUpdateProperties(element.id, {
                      arrowHead: {
                        ...element.properties.arrowHead!,
                        size: Math.max(4, v),
                      },
                    })
                  }
                />
              </FieldRow>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2 p-3 border-t border-gray-200">
        {(element.type === "booth" ||
          element.type === "session_area" ||
          element.type === "meeting_room") && (
          <Button
            variant="outline"
            color="neutral"
            className="w-full text-xs"
            onClick={() =>
              onUpdateTypeStyles(
                element.type,
                extractTypeDefaults(element.properties, element.geometry),
              )
            }
          >
            Save as Default Style
          </Button>
        )}
        <Button
          variant="outline"
          color="negative"
          className="w-full"
          onClick={() => onDelete(element.id)}
        >
          Delete
        </Button>
      </div>
    </div>
  );
}

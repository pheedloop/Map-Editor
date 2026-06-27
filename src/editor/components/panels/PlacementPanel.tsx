import React, { useState, useContext } from "react";
import {
  PiCaretDown,
  PiCaretUp,
  PiSparkle,
  PiMagnifyingGlass,
  PiFunnel,
  PiX,
} from "react-icons/pi";
import type {
  PlacementRecords,
  CategoryRecords,
  PlacedRecord,
} from "../../hooks/usePlacementRecords";
import type { PlacementCategory } from "../../placement/types";
import type { ElementType } from "../../../types";

// ---------------------------------------------------------------------------
// Data transfer constants
// ---------------------------------------------------------------------------

export const PLACEMENT_DRAG_TYPE = "application/x-placement-record";
// Encoding shape in a MIME type allows reading it during dragover (types[] is readable
// before drop, unlike actual data payload which browsers restrict for security).
export const PLACEMENT_SHAPE_ELLIPSE_TYPE =
  "application/x-placement-shape-ellipse";

export interface PlacementRecordRef {
  /** Element type to create/link for the dragged record. */
  type: ElementType;
  id: string;
  defaultShape: "rect" | "ellipse";
}

export interface AutoArrangeRecord {
  recordId: string;
  recordName: string;
}

// ---------------------------------------------------------------------------
// Context — lets rows read the section's current defaultShape without prop drilling
// ---------------------------------------------------------------------------

const SectionShapeContext = React.createContext<"rect" | "ellipse">("rect");

// ---------------------------------------------------------------------------
// FilterBar — shape picker + search + status filter (per section)
// ---------------------------------------------------------------------------

type StatusFilter = "all" | "placed" | "unplaced";

function FilterBar({
  shape,
  onShapeChange,
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
}: {
  shape: "rect" | "ellipse";
  onShapeChange: (s: "rect" | "ellipse") => void;
  query: string;
  onQueryChange: (q: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (f: StatusFilter) => void;
}) {
  const [shapeOpen, setShapeOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const searchRef = React.useRef<HTMLInputElement>(null);

  const toggleSearch = () => {
    if (searchOpen) {
      onQueryChange("");
    } else {
      setTimeout(() => searchRef.current?.focus(), 0);
    }
    setSearchOpen((v) => !v);
    setFilterOpen(false);
  };

  return (
    <div className="border-b border-gray-100 bg-white">
      {/* Toolbar row */}
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        {/* Shape picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShapeOpen((v) => !v);
              setFilterOpen(false);
            }}
            className="flex items-center gap-1 text-xs text-gray-600 border border-gray-200 rounded px-1.5 py-0.5 hover:bg-gray-50 transition-colors"
          >
            <span
              className="inline-block w-2.5 h-2.5 bg-gray-300 shrink-0"
              style={{ borderRadius: shape === "ellipse" ? "9999px" : "0px" }}
            />
            {shape === "ellipse" ? "Circle" : "Rectangle"}
            <PiCaretDown size={10} className="text-gray-400" />
          </button>
          {shapeOpen && (
            <div className="absolute top-full left-0 mt-0.5 bg-white border border-gray-200 rounded shadow-md z-20 py-0.5 w-28">
              {(["rect", "ellipse"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    onShapeChange(s);
                    setShapeOpen(false);
                  }}
                  className={[
                    "w-full text-left flex items-center gap-1.5 px-2 py-1.5 text-xs hover:bg-gray-50 transition-colors",
                    shape === s
                      ? "text-primary-600 font-medium"
                      : "text-gray-700",
                  ].join(" ")}
                >
                  <span
                    className="inline-block w-2.5 h-2.5 bg-gray-300 shrink-0"
                    style={{ borderRadius: s === "ellipse" ? "9999px" : "0px" }}
                  />
                  {s === "ellipse" ? "Circle" : "Rectangle"}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Search toggle */}
        <button
          type="button"
          onClick={toggleSearch}
          className={[
            "p-0.5 transition-colors rounded",
            searchOpen
              ? "text-primary-600 bg-primary-50"
              : "text-gray-400 hover:text-gray-600",
          ].join(" ")}
          title="Search"
        >
          <PiMagnifyingGlass size={13} />
        </button>

        {/* Filter toggle + popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setFilterOpen((v) => !v);
              setShapeOpen(false);
            }}
            className={[
              "p-0.5 transition-colors rounded",
              statusFilter !== "all"
                ? "text-primary-600 bg-primary-50"
                : filterOpen
                  ? "text-primary-600 bg-primary-50"
                  : "text-gray-400 hover:text-gray-600",
            ].join(" ")}
            title="Filter by status"
          >
            <PiFunnel size={13} />
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1.5 w-36">
              <div className="px-2.5 pb-1 text-[10px] uppercase tracking-wider text-gray-400 font-medium">
                Status
              </div>
              {(["all", "unplaced", "placed"] as const).map((f) => (
                <label
                  key={f}
                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <input
                    type="radio"
                    name="placement-status-filter"
                    checked={statusFilter === f}
                    onChange={() => {
                      onStatusFilterChange(f);
                      setFilterOpen(false);
                    }}
                    className="accent-primary-600"
                  />
                  <span className="text-gray-700">
                    {f === "all"
                      ? "All"
                      : f === "placed"
                        ? "Placed"
                        : "Unplaced"}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Expandable search input */}
      {searchOpen && (
        <div className="px-3 pb-2">
          <div className="relative">
            <input
              ref={searchRef}
              type="text"
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              placeholder="Search…"
              className="w-full pl-2.5 pr-6 py-1 text-xs border border-gray-200 rounded bg-gray-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary-400 transition"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange("")}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <PiX size={11} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

interface SectionProps {
  title: string;
  iconShape: "rect" | "oval";
  iconColor: string;
  placed: number;
  unplaced: number;
  /** Total unplaced across the full (unfiltered) record pool — used by the sparkle button. */
  totalUnplaced: number;
  isOpen: boolean;
  onToggle: () => void;
  defaultShape: "rect" | "ellipse";
  onDefaultShapeChange: (s: "rect" | "ellipse") => void;
  query: string;
  onQueryChange: (q: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (f: StatusFilter) => void;
  onAutoArrange?: () => void;
  children?: React.ReactNode;
}

function Section({
  title,
  placed,
  unplaced,
  totalUnplaced,
  iconShape,
  iconColor,
  isOpen,
  onToggle,
  defaultShape,
  onDefaultShapeChange,
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  onAutoArrange,
  children,
}: SectionProps) {
  const total = placed + unplaced;

  return (
    <div className="border-b border-gray-100 last:border-0">
      {/* Header */}
      <button
        type="button"
        onClick={onToggle}
        className={[
          "w-full flex items-center gap-2.5 py-2.5 text-left transition-colors border-l-2",
          isOpen
            ? "bg-primary-100 border-primary-500 px-[10px]"
            : "border-transparent px-3 hover:bg-gray-100",
        ].join(" ")}
      >
        <span
          className="shrink-0 w-4 h-4"
          style={{
            backgroundColor: iconColor,
            borderRadius: iconShape === "oval" ? "9999px" : "0px",
            opacity: 0.7,
          }}
        />
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-gray-800 truncate">
            {title}
          </span>
          <span className="block text-xs text-gray-400 tabular-nums">
            Placed: {placed}&nbsp;&nbsp;|&nbsp;&nbsp;Unplaced: {unplaced}
          </span>
        </span>
        <span
          className={[
            "shrink-0 transition-colors",
            totalUnplaced > 0 && onAutoArrange
              ? "text-amber-400 hover:text-amber-500 cursor-pointer"
              : "text-gray-200 cursor-default",
          ].join(" ")}
          title={
            totalUnplaced > 0
              ? `Auto-place ${totalUnplaced} unplaced`
              : "No unplaced items"
          }
          onClick={(e) => {
            e.stopPropagation();
            if (totalUnplaced > 0) onAutoArrange?.();
          }}
        >
          <PiSparkle size={14} />
        </span>
        <span className="shrink-0 text-gray-400">
          {isOpen ? <PiCaretUp size={12} /> : <PiCaretDown size={12} />}
        </span>
      </button>

      {/* Body */}
      {isOpen && (
        <SectionShapeContext.Provider value={defaultShape}>
          {total === 0 ? (
            <p className="px-3 py-2.5 text-xs text-gray-400 italic">
              No records found
            </p>
          ) : (
            <>
              <FilterBar
                shape={defaultShape}
                onShapeChange={onDefaultShapeChange}
                query={query}
                onQueryChange={onQueryChange}
                statusFilter={statusFilter}
                onStatusFilterChange={onStatusFilterChange}
              />
              {children}
            </>
          )}
        </SectionShapeContext.Provider>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Rows
// ---------------------------------------------------------------------------

function PlacementRow({
  isPlaced,
  recordType,
  recordId,
  children,
}: {
  isPlaced: boolean;
  recordType: ElementType;
  recordId: string;
  children: React.ReactNode;
}) {
  const defaultShape = useContext(SectionShapeContext);

  const handleDragStart = (e: React.DragEvent) => {
    if (isPlaced) {
      e.preventDefault();
      return;
    }
    const ref: PlacementRecordRef = {
      type: recordType,
      id: recordId,
      defaultShape,
    };
    e.dataTransfer.effectAllowed = "copy";
    e.dataTransfer.setData(PLACEMENT_DRAG_TYPE, JSON.stringify(ref));
    e.dataTransfer.setData("text/plain", JSON.stringify(ref));
    // Encode shape as a MIME type so it can be read during dragover
    if (defaultShape === "ellipse") {
      e.dataTransfer.setData(PLACEMENT_SHAPE_ELLIPSE_TYPE, "1");
    }
  };

  return (
    <div
      draggable={!isPlaced}
      onDragStart={handleDragStart}
      className={[
        "flex items-center gap-3 px-3 py-2.5 border-b border-gray-50 text-sm transition-colors last:border-0",
        isPlaced
          ? "opacity-40 cursor-default"
          : "cursor-grab hover:bg-gray-50 active:cursor-grabbing",
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function RecordRow({
  category,
  record,
  isPlaced,
}: {
  category: PlacementCategory;
  record: unknown;
  isPlaced: boolean;
}) {
  const secondary = category.getSecondaryLabel?.(record);
  return (
    <PlacementRow
      isPlaced={isPlaced}
      recordType={category.elementType}
      recordId={category.getRecordId(record)}
    >
      <span className="flex-1 text-gray-700 truncate">
        {category.getPrimaryLabel(record)}
        {secondary && (
          <span className="text-gray-400 ml-1 text-xs">· {secondary}</span>
        )}
      </span>
      {isPlaced ? (
        <span className="shrink-0 text-xs font-medium text-green-600">
          Placed
        </span>
      ) : (
        <span className="shrink-0 text-xs font-medium text-amber-500">
          Unplaced
        </span>
      )}
    </PlacementRow>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

type SectionFilter = { query: string; status: StatusFilter };
const emptyFilter: SectionFilter = { query: "", status: "all" };

interface PlacementPanelProps {
  records: PlacementRecords;
  onAutoArrange: (
    category: PlacementCategory,
    records: AutoArrangeRecord[],
    shape: "rect" | "ellipse",
  ) => void;
}

export function PlacementPanel({ records, onAutoArrange }: PlacementPanelProps) {
  // Section state is keyed by category id so it adapts to whatever categories
  // the active product passes in.
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [sectionShapes, setSectionShapes] = useState<
    Record<string, "rect" | "ellipse">
  >({});
  const [sectionFilters, setSectionFilters] = useState<
    Record<string, SectionFilter>
  >({});

  const shapeOf = (id: string) => sectionShapes[id] ?? "rect";
  const filterOf = (id: string) => sectionFilters[id] ?? emptyFilter;

  const updateFilter = (id: string, patch: Partial<SectionFilter>) =>
    setSectionFilters((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? emptyFilter), ...patch },
    }));

  const setShape = (id: string) => (s: "rect" | "ellipse") =>
    setSectionShapes((prev) => ({ ...prev, [id]: s }));

  const toggle = (id: string) =>
    setOpenSection((prev) => (prev === id ? null : id));

  const applyFilter = (group: CategoryRecords, f: SectionFilter) => {
    const q = f.query.trim().toLowerCase();
    const getText = group.category.getPrimaryLabel;
    return group.records.filter(
      (r) =>
        (!q || getText(r.record).toLowerCase().includes(q)) &&
        (f.status === "all" ||
          (f.status === "placed" ? r.isPlaced : !r.isPlaced)),
    );
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {records.map((group) => {
          const { category } = group;
          const id = category.id;
          const filter = filterOf(id);
          const filtered = applyFilter(group, filter);
          return (
            <Section
              key={id}
              title={category.title}
              iconShape={category.iconShape}
              iconColor={category.iconColor}
              placed={filtered.filter((r) => r.isPlaced).length}
              unplaced={filtered.filter((r) => !r.isPlaced).length}
              totalUnplaced={group.counts.unplaced}
              isOpen={openSection === id}
              onToggle={() => toggle(id)}
              defaultShape={shapeOf(id)}
              onDefaultShapeChange={setShape(id)}
              query={filter.query}
              onQueryChange={(q) => updateFilter(id, { query: q })}
              statusFilter={filter.status}
              onStatusFilterChange={(s) => updateFilter(id, { status: s })}
              onAutoArrange={() =>
                onAutoArrange(
                  category,
                  group.records
                    .filter((r) => !r.isPlaced)
                    .map((r) => ({
                      recordId: category.getRecordId(r.record),
                      recordName: category.getPrimaryLabel(r.record),
                    })),
                  shapeOf(id),
                )
              }
            >
              {filtered.map((r: PlacedRecord) => (
                <RecordRow
                  key={category.getRecordId(r.record)}
                  category={category}
                  record={r.record}
                  isPlaced={r.isPlaced}
                />
              ))}
            </Section>
          );
        })}
      </div>
    </div>
  );
}

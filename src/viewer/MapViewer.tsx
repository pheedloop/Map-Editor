import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { PiPath } from "react-icons/pi";
import type { FloorPlanData } from "../types";
import type { Exhibitor, HoveredItem, ViewerMode } from "./types";
import type { SearchResult } from "./hooks/useSearch";
import { useSearch } from "./hooks/useSearch";
import { useDirections } from "./hooks/useDirections";
import { ViewerCanvas } from "./components/ViewerCanvas";
import { SearchBar } from "./components/SearchBar";
import { MapSidebar } from "./components/MapSidebar";
import { MapSheet } from "./components/MapSheet";
import { BoothPopover } from "./components/BoothPopover";
import { LocationPopover } from "./components/LocationPopover";
import { DirectionsPanel } from "./components/DirectionsPanel";
import { resolveFeatures } from "../tiers";
import type { Tier, FeatureKey, FeatureOverride } from "../tiers";

interface MapViewerProps {
  data: FloorPlanData;
  exhibitors: Exhibitor[];
  mode?: ViewerMode;
  /** Usage-tier preset controlling which features are enabled. Defaults to "premium". */
  tier?: Tier;
  /** Per-feature overrides applied on top of the tier preset. */
  features?: Partial<Record<FeatureKey, FeatureOverride>>;
}

const MOBILE_BREAKPOINT = 640;

export function MapViewer({ data, exhibitors, mode = "attendee", tier, features }: MapViewerProps) {
  // Wayfinding (Directions) is gated by the usage tier. The viewer hides the
  // feature entirely when it is not enabled (no disabled/trophy state here).
  const featureMap = useMemo(() => resolveFeatures(tier, features), [tier, features]);
  const wayfindingEnabled = featureMap.wayfinding === "enabled";
  const containerRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [selectedItem, setSelectedItem] = useState<HoveredItem | null>(null);
  const [popover, setPopover] = useState<{ item: HoveredItem; name: string; x: number; y: number } | null>(null);

  const { query, setQuery, results, matchedElementIds, isSearching } = useSearch(
    data.elements,
    exhibitors
  );

  const directions = useDirections(data, exhibitors);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0].contentRect.width;
      setIsMobile(width < MOBILE_BREAKPOINT);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const occupiedBoothSlugs = useMemo(
    () => new Set(exhibitors.map((ex) => ex.boothSlug)),
    [exhibitors]
  );

  const exhibitorsByBooth = useMemo(() => {
    const map = new Map<string, Exhibitor>();
    for (const ex of exhibitors) {
      map.set(ex.boothSlug, ex);
    }
    return map;
  }, [exhibitors]);

  const handleSidebarSelect = useCallback((item: HoveredItem) => {
    setSelectedItem((prev) => (prev?.elementId === item.elementId ? null : item));
    setPopover(null);
  }, []);

  const handleElementClick = useCallback(
    (item: HoveredItem, screenX: number, screenY: number) => {
      setSelectedItem((prev) => (prev?.elementId === item.elementId ? null : item));
      const el = data.elements.find((e) => e.id === item.elementId);
      const name = el?.properties.name || "";
      setPopover((prev) =>
        prev?.item.elementId === item.elementId
          ? null
          : { item, name, x: screenX, y: screenY }
      );
    },
    [data.elements]
  );

  const handleResultSelect = useCallback((result: SearchResult) => {
    let item: HoveredItem;
    if (result.elementType === "booth") {
      item = { type: "booth", elementId: result.elementId, boothSlug: result.code! };
    } else if (result.elementType === "session_area") {
      item = { type: "session_area", elementId: result.elementId, sessionId: result.code };
    } else {
      item = { type: "meeting_room", elementId: result.elementId, meetingRoomId: result.code };
    }
    setSelectedItem(item);
    setPopover(null);
  }, []);

  const handlePopoverClose = useCallback(() => {
    setPopover(null);
    setSelectedItem(null);
  }, []);

  const handleDirectionsStart = useCallback(
    (result: SearchResult | null) => {
      directions.setStartLocation(result ? directions.locationFromResult(result) : null);
    },
    [directions]
  );

  const handleDirectionsEnd = useCallback(
    (result: SearchResult | null) => {
      directions.setEndLocation(result ? directions.locationFromResult(result) : null);
    },
    [directions]
  );

  const handleGetDirections = useCallback(
    (elementId: string) => {
      directions.navigateTo(elementId);
      setPopover(null);
    },
    [directions]
  );

  const showDirectionsButton =
    wayfindingEnabled && mode === "attendee" && directions.hasGrid && !directions.active;

  return (
    <div ref={containerRef} className="pl-map-editor flex flex-col h-full relative">
      <div className="flex items-center gap-0 bg-white">
        <div className="flex-1 min-w-0">
          <SearchBar
            query={query}
            results={results}
            onQueryChange={setQuery}
            onResultSelect={handleResultSelect}
          />
        </div>
        {showDirectionsButton && (
          <button
            onClick={directions.open}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-blue-600 hover:bg-blue-50 cursor-pointer transition-colors shrink-0 border-l border-gray-200"
          >
            <PiPath size={16} />
            <span className="hidden sm:inline">Directions</span>
          </button>
        )}
      </div>
      <div className="flex flex-1 overflow-hidden relative">
        <ViewerCanvas
          data={data}
          mode={mode}
          occupiedBoothSlugs={occupiedBoothSlugs}
          highlightedElementId={selectedItem?.elementId ?? null}
          searchMatchIds={isSearching ? matchedElementIds : null}
          routePath={directions.routePath}
          onElementClick={handleElementClick}
        />
        {!isMobile && directions.active && (
          <div className="w-64 shrink-0 bg-white border-l border-gray-200 flex flex-col">
            <DirectionsPanel
              startLocation={directions.startLocation}
              endLocation={directions.endLocation}
              routeStatus={directions.routeStatus}
              routePath={directions.routePath}
              dimensions={data.dimensions}
              onSearch={directions.searchLocations}
              onSelectStart={handleDirectionsStart}
              onSelectEnd={handleDirectionsEnd}
              onSwap={directions.swap}
              onClose={directions.close}
            />
          </div>
        )}
        {!isMobile && !directions.active && (
          <MapSidebar
            elements={data.elements}
            exhibitors={exhibitors}
            selectedItem={selectedItem}
            onSelect={handleSidebarSelect}
          />
        )}
        {isMobile && !directions.active && (
          <MapSheet
            elements={data.elements}
            exhibitors={exhibitors}
            selectedItem={selectedItem}
            onSelect={handleSidebarSelect}
          />
        )}
        {isMobile && directions.active && (
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-xl shadow-[0_-4px_20px_rgba(0,0,0,0.15)] z-50">
            <DirectionsPanel
              startLocation={directions.startLocation}
              endLocation={directions.endLocation}
              routeStatus={directions.routeStatus}
              routePath={directions.routePath}
              dimensions={data.dimensions}
              onSearch={directions.searchLocations}
              onSelectStart={handleDirectionsStart}
              onSelectEnd={handleDirectionsEnd}
              onSwap={directions.swap}
              onClose={directions.close}
            />
          </div>
        )}
        {popover && !isMobile && popover.item.type === "booth" && (
          <BoothPopover
            boothCode={popover.name}
            exhibitor={exhibitorsByBooth.get(popover.item.boothSlug) ?? null}
            x={popover.x}
            y={popover.y}
            onClose={handlePopoverClose}
            onGetDirections={
              wayfindingEnabled && mode === "attendee" && directions.hasGrid
                ? () => handleGetDirections(popover.item.elementId)
                : undefined
            }
          />
        )}
        {popover && !isMobile && popover.item.type !== "booth" && (
          <LocationPopover
            name={popover.name}
            type={popover.item.type}
            x={popover.x}
            y={popover.y}
            onClose={handlePopoverClose}
            onGetDirections={
              wayfindingEnabled && mode === "attendee" && directions.hasGrid
                ? () => handleGetDirections(popover.item.elementId)
                : undefined
            }
          />
        )}
      </div>
    </div>
  );
}

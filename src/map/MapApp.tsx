import { useState, useEffect } from "react";
import {
  PiDesktop,
  PiDeviceMobile,
  PiUser,
  PiStorefront,
} from "react-icons/pi";
import { MapEditor, type Tier } from "../editor";
import { MapViewer } from "../viewer";
import { ProductSwitcher } from "../components/ProductSwitcher";
import { exhibitionHallMap } from "../sample-data/exhibition-hall-map";
import { conferenceExpoExhibitors } from "../sample-data/sample-exhibitors";
import { conferenceExpoBooths } from "../sample-data/sample-booths";
import { sampleSessionLocations } from "../sample-data/sample-session-locations";
import { sampleMeetingRooms } from "../sample-data/sample-meeting-rooms";
import type { FloorPlanData } from "../types";
import type { ViewerMode } from "../viewer/types";

type Mode = "editor" | "viewer";
type Viewport = "desktop" | "mobile";

function getMode(): Mode {
  const hash = window.location.hash.replace("#", "");
  if (hash === "viewer") return "viewer";
  return "editor";
}

function loadViewerData(): FloorPlanData | null {
  try {
    const raw = localStorage.getItem("map-editor:floorplan");
    if (!raw) return null;
    return JSON.parse(raw) as FloorPlanData;
  } catch {
    return null;
  }
}

function ViewerRoute({
  viewport,
  mode,
  tier,
}: {
  viewport: Viewport;
  mode: ViewerMode;
  tier: Tier;
}) {
  const data = loadViewerData() ?? exhibitionHallMap;
  const viewer = (
    <MapViewer
      data={data}
      exhibitors={conferenceExpoExhibitors}
      mode={mode}
      tier={tier}
    />
  );

  if (viewport === "mobile") {
    return (
      <div className="h-full flex items-center justify-center bg-gray-800 overflow-hidden">
        <div
          className="bg-white rounded-xl shadow-2xl overflow-hidden border-4 border-gray-700"
          style={{ width: 390, height: 844 }}
        >
          {viewer}
        </div>
      </div>
    );
  }

  return viewer;
}

export function MapApp() {
  const [mode, setMode] = useState<Mode>(getMode);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [viewerMode, setViewerMode] = useState<ViewerMode>("attendee");
  const [tier, setTier] = useState<Tier>("premium");

  useEffect(() => {
    const onHashChange = () => setMode(getMode());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const modeTab = (m: Mode, label: string) => (
    <a
      href={`#${m}`}
      className={`px-3 py-1 rounded transition-colors ${
        mode === m
          ? "bg-white/15 text-white"
          : "text-gray-400 hover:text-white"
      }`}
    >
      {label}
    </a>
  );

  return (
    <div className="h-screen flex flex-col">
      <nav className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-xs shrink-0">
        <ProductSwitcher current="map" mode={mode} />
        <div className="w-px h-4 bg-gray-700 mx-1" />
        {modeTab("editor", "Editor")}
        {modeTab("viewer", "Viewer")}

        <div className="w-px h-4 bg-gray-700 mx-1" />
        <span className="text-gray-500 mr-0.5">Tier:</span>
        {(["basic", "advanced", "premium"] as Tier[]).map((t) => (
          <button
            key={t}
            onClick={() => setTier(t)}
            className={`px-2 py-0.5 rounded capitalize cursor-pointer transition-colors ${
              tier === t
                ? "bg-white/15 text-white"
                : "text-gray-500 hover:text-gray-300"
            }`}
            title={`Set ${t} tier`}
          >
            {t}
          </button>
        ))}

        {mode === "viewer" && (
          <>
            <div className="w-px h-4 bg-gray-700 mx-1" />
            <button
              onClick={() => setViewport("desktop")}
              className={`p-1 rounded cursor-pointer transition-colors ${
                viewport === "desktop"
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
              title="Desktop"
            >
              <PiDesktop size={16} />
            </button>
            <button
              onClick={() => setViewport("mobile")}
              className={`p-1 rounded cursor-pointer transition-colors ${
                viewport === "mobile"
                  ? "text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
              title="Mobile (390×844)"
            >
              <PiDeviceMobile size={16} />
            </button>
            <div className="w-px h-4 bg-gray-700 mx-1" />
            <button
              onClick={() => setViewerMode("attendee")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                viewerMode === "attendee"
                  ? "bg-white/15 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
              title="Attendee view"
            >
              <PiUser size={14} />
              <span>Attendee</span>
            </button>
            <button
              onClick={() => setViewerMode("exhibitor")}
              className={`flex items-center gap-1 px-2 py-0.5 rounded cursor-pointer transition-colors ${
                viewerMode === "exhibitor"
                  ? "bg-white/15 text-white"
                  : "text-gray-500 hover:text-gray-300"
              }`}
              title="Exhibitor view"
            >
              <PiStorefront size={14} />
              <span>Exhibitor</span>
            </button>
          </>
        )}
      </nav>
      <div className="flex-1 overflow-hidden">
        {mode === "editor" && (
          <MapEditor
            initialData={exhibitionHallMap}
            booths={conferenceExpoBooths}
            sessions={sampleSessionLocations}
            meetingRooms={sampleMeetingRooms}
            tier={tier}
            persist
            debug
          />
        )}
        {mode === "viewer" && (
          <ViewerRoute viewport={viewport} mode={viewerMode} tier={tier} />
        )}
      </div>
    </div>
  );
}

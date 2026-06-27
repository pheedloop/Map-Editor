import { useState, useEffect } from "react";
import { ProductSwitcher } from "../components/ProductSwitcher";
import { SeatplannerPlaceholder } from "./SeatplannerPlaceholder";

type Mode = "editor" | "viewer";

function getMode(): Mode {
  const hash = window.location.hash.replace("#", "");
  if (hash === "viewer") return "viewer";
  return "editor";
}

export function SeatplannerApp() {
  const [mode, setMode] = useState<Mode>(getMode);

  useEffect(() => {
    const onHashChange = () => setMode(getMode());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const modeTab = (m: Mode, label: string) => (
    <a
      href={`#${m}`}
      className={`px-3 py-1 rounded transition-colors ${
        mode === m ? "bg-white/15 text-white" : "text-gray-400 hover:text-white"
      }`}
    >
      {label}
    </a>
  );

  return (
    <div className="h-screen flex flex-col">
      <nav className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-xs shrink-0">
        <ProductSwitcher current="seatplanner" mode={mode} />
        <div className="w-px h-4 bg-gray-700 mx-1" />
        {modeTab("editor", "Editor")}
      </nav>
      <div className="flex-1 overflow-hidden">
        <SeatplannerPlaceholder mode={mode} />
      </div>
    </div>
  );
}

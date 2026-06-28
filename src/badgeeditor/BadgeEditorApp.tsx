import { ProductSwitcher } from "../components/ProductSwitcher";
import { BadgeEditor } from "./BadgeEditor";

/**
 * Badge product shell (demo). Mirrors SeatplannerApp — only an editor mode for
 * now; a viewer/preview mode arrives with the live-preview unit.
 */
export function BadgeEditorApp() {
  return (
    <div className="h-screen flex flex-col">
      <nav className="flex items-center gap-1 px-3 py-1.5 bg-gray-900 text-xs shrink-0">
        <ProductSwitcher current="badge" mode="editor" />
        <div className="w-px h-4 bg-gray-700 mx-1" />
        <span className="px-3 py-1 rounded bg-white/15 text-white">Editor</span>
      </nav>
      <div className="flex-1 overflow-hidden">
        <BadgeEditor
          debug
          onSave={(_doc, flattened) =>
            console.log("[badge] saved", flattened.layout)
          }
        />
      </div>
    </div>
  );
}

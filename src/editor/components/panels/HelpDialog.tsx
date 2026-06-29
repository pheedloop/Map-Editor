import { useState } from "react";
import { Dialog, TabBar } from "../ui";

const isMac = navigator.platform.toUpperCase().includes("MAC");
const mod = isMac ? "⌘" : "Ctrl";

type HelpTab = "start" | "shortcuts" | "menus";

const shortcuts: { category: string; items: { keys: string; description: string }[] }[] = [
  {
    category: "Tools",
    items: [
      { keys: "H", description: "Hand tool (drag to pan)" },
      { keys: "V", description: "Select tool" },
      { keys: "R", description: "Rectangle tool" },
      { keys: "O", description: "Ellipse tool" },
      { keys: "L", description: "Line tool" },
      { keys: "A", description: "Arrow tool" },
      { keys: "C", description: "Arc tool" },
      { keys: "P", description: "Polygon tool" },
      { keys: "T", description: "Text tool" },
      { keys: "I", description: "Icon tool" },
      { keys: "M", description: "Measure tool" },
    ],
  },
  {
    category: "Pathing Tools (Pathing layer active)",
    items: [
      { keys: "V", description: "Select / pan" },
      { keys: "W", description: "Paint walkable" },
      { keys: "E", description: "Paint impassable (erase)" },
      { keys: "R", description: "Rectangle fill" },
    ],
  },
  {
    category: "Edit",
    items: [
      { keys: `${mod}+Z`, description: "Undo" },
      { keys: `${mod}+Shift+Z`, description: "Redo" },
      { keys: `${mod}+C`, description: "Copy" },
      { keys: `${mod}+V`, description: "Paste" },
      { keys: `${mod}+D`, description: "Duplicate" },
      { keys: `${mod}+A`, description: "Select all" },
      { keys: "Delete", description: "Delete selected" },
      { keys: "Escape", description: "Deselect / exit group / cancel" },
    ],
  },
  {
    category: "Groups",
    items: [
      { keys: `${mod}+G`, description: "Group selected elements" },
      { keys: `${mod}+Shift+G`, description: "Ungroup" },
      { keys: "Double-click", description: "Enter group (edit individual elements)" },
      { keys: "Escape", description: "Exit group editing mode" },
    ],
  },
  {
    category: "Canvas",
    items: [
      { keys: "Scroll", description: "Zoom in/out" },
      { keys: "H, then Drag", description: "Pan canvas (hand tool)" },
      { keys: "Space + Drag", description: "Pan canvas" },
      { keys: "Shift + Drag", description: "Constrain proportions (square/circle)" },
      { keys: "Shift + Rotate", description: "Snap rotation to 15°" },
      { keys: "Shift + Line/Arrow", description: "Snap to 45° angles" },
      { keys: "Shift + Polygon", description: "Snap edges to 45° angles" },
      { keys: "Shift + Measure", description: "Snap to horizontal/vertical/45°" },
      { keys: "Shift + Calibrate", description: "Snap calibration line to horizontal/vertical/45°" },
    ],
  },
  {
    category: "Selection",
    items: [
      { keys: "Click", description: "Select element" },
      { keys: "Click (group member)", description: "Select entire group" },
      { keys: "Shift + Click", description: "Add/remove from selection" },
      { keys: "Drag (empty space)", description: "Drag-select rectangle" },
      { keys: "Right-click", description: "Context menu" },
    ],
  },
];

const menus: { name: string; items: string[] }[] = [
  {
    name: "File",
    items: ["Export as PNG", "Export as JSON", "Import JSON"],
  },
  {
    name: "Edit",
    items: ["Undo", "Redo", "Copy", "Paste", "Duplicate"],
  },
  {
    name: "View",
    items: ["Show Rulers", "Show Grid", "Snap to Grid", "Snap to Objects"],
  },
  {
    name: "Tools",
    items: ["Configure Grid...", "Canvas Size...", "Set Scale..."],
  },
];

interface HelpDialogProps {
  onClose: () => void;
}

export function HelpDialog({ onClose }: HelpDialogProps) {
  const [tab, setTab] = useState<HelpTab>("start");

  return (
    <Dialog title="Help" onClose={onClose} width="520px" maxHeight="80vh">
      <div className="px-4 pt-3 border-b border-gray-200">
        <TabBar
          tabs={[
            { id: "start", label: "Getting Started" },
            { id: "shortcuts", label: "Shortcuts" },
            { id: "menus", label: "Menus" },
          ]}
          value={tab}
          onChange={(id) => setTab(id as HelpTab)}
          itemClassName="px-3 py-1.5 text-xs"
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {tab === "start" && (
          <>
            <h3 className="text-xs font-semibold text-gray-800 mb-2">Design Mode vs Placement Mode</h3>
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li>The left sidebar has two tabs: <strong>Design</strong> and <strong>Placement</strong></li>
              <li><strong>Design</strong> — drawing tools for building the floor plan shell: walls, aisles, labels, icons, and annotations</li>
              <li><strong>Placement</strong> — place PheedLoop records (booths, session locations, meeting rooms) onto the map</li>
            </ul>

            <h3 className="text-xs font-semibold text-gray-800 mt-4 mb-2">Placing Records (Placement Mode)</h3>
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li>Switch to the <strong>Placement</strong> tab to see your booths, session locations, and meeting rooms</li>
              <li><strong>Drag a record</strong> from the list onto the canvas to place it as a new shape</li>
              <li>Use the <strong>Rectangle / Circle</strong> selector in each section to choose the shape new placements will use</li>
              <li><strong>Drop onto an existing shape</strong> to assign that record to it — the shape becomes a linked booth, session, or meeting room</li>
              <li>Placed records are dimmed in the list; unplaced records show at full opacity and are ready to drag</li>
            </ul>

            <h3 className="text-xs font-semibold text-gray-800 mt-4 mb-2">Drawing Tools (Design Mode)</h3>
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li>Select a tool from the <strong>Design</strong> tab and <strong>click and drag</strong> on the canvas to draw</li>
              <li>Click an element to <strong>select</strong> it — resize, rotate, or edit properties in the right panel</li>
              <li>Use the <strong>options bar</strong> above the canvas to change fill, stroke, and stroke width</li>
              <li><strong>Arrow</strong> (A) — click and drag to draw an arrow. Select to change arrowhead style and size in the properties panel</li>
              <li><strong>Arc</strong> (C) — click to set start point, click to set end point, then move the mouse to bend the curve and click to finalize</li>
              <li><strong>Polygon</strong> (P) — click to place vertices. Close by clicking near the first vertex, pressing Enter, or double-clicking. Minimum 3 vertices. Escape to cancel</li>
              <li>Select any arrow, arc, or polygon to see <strong>control handles</strong> for reshaping</li>
              <li>Hold <strong>Shift</strong> while drawing lines, arrows, or polygon edges to snap to 45° angles</li>
            </ul>

            <h3 className="text-xs font-semibold text-gray-800 mt-4 mb-2">Grouping</h3>
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li>Select two or more elements and press <strong>{mod}+G</strong> (or use the options bar) to <strong>group</strong> them</li>
              <li>Clicking any member of a group <strong>selects the whole group</strong> — move or resize all members together</li>
              <li><strong>Double-click</strong> a group to enter editing mode and select individual elements inside it</li>
              <li>Press <strong>Escape</strong> to exit group editing, or use the <strong>Exit Group</strong> button in the options bar</li>
              <li>Press <strong>{mod}+Shift+G</strong> or use <strong>Ungroup</strong> in the options bar or right-click menu to dissolve a group</li>
            </ul>

            <h3 className="text-xs font-semibold text-gray-800 mt-4 mb-2">Layers</h3>
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li>Click the <strong>layer icon</strong> (top-right of canvas) to open the layer panel</li>
              <li>Four layers: <strong>Background</strong>, <strong>Content</strong>, <strong>Pathing</strong>, and <strong>Markup</strong></li>
              <li>Click a layer to make it <strong>active</strong> — new elements and placed records are added to the active layer</li>
              <li>Only elements on the active layer are selectable</li>
              <li>Toggle the <strong>eye icon</strong> to show/hide a layer</li>
            </ul>

            <h3 className="text-xs font-semibold text-gray-800 mt-4 mb-2">Scale & Measurement</h3>
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li>Use <strong>Tools &gt; Set Scale...</strong> to calibrate your floor plan — click two points and enter the real-world distance between them</li>
              <li>Supports <strong>feet</strong>, <strong>inches</strong>, and <strong>meters</strong> — inches auto-convert to feet</li>
              <li>Hold <strong>Shift</strong> while placing the second point to snap to horizontal or vertical</li>
              <li>Change display units (ft / m) anytime in the <strong>status bar</strong> without re-calibrating</li>
              <li>Toggle <strong>View &gt; Show Rulers</strong> to see rulers along the canvas edges — they show real-world units when calibrated</li>
              <li>Use the <strong>Measure tool</strong> (M) to measure distances — click and drag between two points</li>
            </ul>

            <h3 className="text-xs font-semibold text-gray-800 mt-4 mb-2">Wayfinding (Pathing Layer)</h3>
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li>Switch to the <strong>Pathing layer</strong> to define walkable areas for attendee wayfinding</li>
              <li>The sidebar swaps to pathing tools: <strong>Paint Walkable</strong> (W), <strong>Erase</strong> (E), <strong>Rectangle Fill</strong> (R)</li>
              <li>Green cells = walkable, empty = impassable. Unset areas default to impassable.</li>
              <li>Use <strong>Auto-mark aisles</strong> to quickly mark all open space as walkable</li>
              <li>Use <strong>Auto-mark obstacles</strong> to block booth footprints</li>
              <li>Adjust <strong>cell size</strong> and <strong>opacity</strong> in the options bar</li>
              <li>When the map is calibrated, wayfinding routes show <strong>distance and estimated walking time</strong></li>
            </ul>
          </>
        )}

        {tab === "shortcuts" && (
          <>
            {shortcuts.map((section) => (
              <div key={section.category} className="mb-4">
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                  {section.category}
                </div>
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <div
                      key={item.keys}
                      className="flex items-center justify-between py-0.5"
                    >
                      <span className="text-xs text-gray-600">{item.description}</span>
                      <kbd className="text-[10px] font-mono text-gray-500 bg-gray-100 border border-gray-200 rounded px-1.5 py-0.5">
                        {item.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {tab === "menus" && (
          <>
            <p className="text-xs text-gray-500 mb-4">
              Quick reference for the top menu bar.
            </p>
            {menus.map((menu) => (
              <div key={menu.name} className="mb-4">
                <div className="text-[10px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                  {menu.name}
                </div>
                <div className="space-y-1">
                  {menu.items.map((item) => (
                    <div key={item} className="text-xs text-gray-600 py-0.5 pl-2">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </Dialog>
  );
}

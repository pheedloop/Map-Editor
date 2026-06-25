import { useRef, useState } from "react";
import type { Legend, LegendEntry } from "../../../types";
import { Dialog, Button, TextInput, ColorSwatch } from "../ui";
import {
  PiEye,
  PiEyeSlash,
  PiArrowUp,
  PiArrowDown,
  PiTrash,
  PiPlus,
} from "react-icons/pi";

interface LegendDialogProps {
  legend: Legend;
  onSave: (legend: Legend) => void;
  onClose: () => void;
}

export function LegendDialog({ legend, onSave, onClose }: LegendDialogProps) {
  const [local, setLocal] = useState<Legend>(() => ({
    ...legend,
    entries: legend.entries.map((e) => ({ ...e })),
  }));

  const initialSnapshot = useRef(JSON.stringify(legend));

  const updateEntry = (id: string, updates: Partial<LegendEntry>) => {
    setLocal((prev) => ({
      ...prev,
      entries: prev.entries.map((e) =>
        e.id === id ? { ...e, ...updates } : e,
      ),
    }));
  };

  const addEntry = () => {
    setLocal((prev) => ({
      ...prev,
      entries: [
        ...prev.entries,
        { id: crypto.randomUUID(), label: "", color: "#4A90D9", visible: true },
      ],
    }));
  };

  const removeEntry = (id: string) => {
    setLocal((prev) => ({
      ...prev,
      entries: prev.entries.filter((e) => e.id !== id),
    }));
  };

  const moveEntry = (id: string, direction: "up" | "down") => {
    setLocal((prev) => {
      const entries = [...prev.entries];
      const idx = entries.findIndex((e) => e.id === id);
      if (idx === -1) return prev;
      const target = direction === "up" ? idx - 1 : idx + 1;
      if (target < 0 || target >= entries.length) return prev;
      [entries[idx], entries[target]] = [entries[target], entries[idx]];
      return { ...prev, entries };
    });
  };

  const handleDone = () => {
    if (JSON.stringify(local) !== initialSnapshot.current) {
      onSave(local);
    }
    onClose();
  };

  return (
    <Dialog
      title="Legend"
      onClose={handleDone}
      width="440px"
      maxHeight="80vh"
      footer={
        <Button variant="solid" color="primary" onClick={handleDone}>
          Done
        </Button>
      }
    >
      <div className="flex flex-col gap-4 p-4 overflow-y-auto flex-1">
        {/* Global visibility toggle */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={local.visible}
            onChange={(e) =>
              setLocal((prev) => ({ ...prev, visible: e.target.checked }))
            }
            className="cursor-pointer"
          />
          <span className="text-xs text-gray-700">Show legend on map</span>
        </label>

        {/* Entry list */}
        {local.entries.length > 0 && (
          <div className="flex flex-col gap-2">
            {local.entries.map((entry, idx) => (
              <div key={entry.id} className="flex items-center gap-2">
                <ColorSwatch
                  label=""
                  value={entry.color}
                  onChange={(c) => updateEntry(entry.id, { color: c })}
                />
                <div className="flex-1">
                  <TextInput
                    value={entry.label}
                    onChange={(e) =>
                      updateEntry(entry.id, { label: e.target.value })
                    }
                    placeholder="Label…"
                  />
                </div>
                <button
                  className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  onClick={() =>
                    updateEntry(entry.id, { visible: !entry.visible })
                  }
                  title={entry.visible ? "Hide entry" : "Show entry"}
                >
                  {entry.visible ? (
                    <PiEye size={15} />
                  ) : (
                    <PiEyeSlash size={15} className="text-red-400" />
                  )}
                </button>
                <button
                  className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
                  onClick={() => moveEntry(entry.id, "up")}
                  disabled={idx === 0}
                  title="Move up"
                >
                  <PiArrowUp size={13} />
                </button>
                <button
                  className="p-1 rounded text-gray-400 hover:text-gray-600 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-default"
                  onClick={() => moveEntry(entry.id, "down")}
                  disabled={idx === local.entries.length - 1}
                  title="Move down"
                >
                  <PiArrowDown size={13} />
                </button>
                <button
                  className="p-1 rounded text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
                  onClick={() => removeEntry(entry.id)}
                  title="Remove entry"
                >
                  <PiTrash size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        {local.entries.length === 0 && (
          <p className="text-xs text-gray-400 text-center py-2">
            No entries yet.
          </p>
        )}

        {/* Add entry */}
        <button
          className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 transition-colors cursor-pointer self-start"
          onClick={addEntry}
        >
          <PiPlus size={13} />
          Add entry
        </button>
      </div>
    </Dialog>
  );
}

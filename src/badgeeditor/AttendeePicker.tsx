import { useEffect, useRef, useState } from "react";
import { PiMagnifyingGlass, PiX, PiCaretDown } from "react-icons/pi";
import type { AttendeeOption, AttendeeProvider } from "./badgeData";

interface AttendeePickerProps {
  provider: AttendeeProvider;
  value: AttendeeOption | null;
  onChange: (option: AttendeeOption | null) => void;
}

/**
 * Compact async searchable attendee picker for the OptionsBar. Debounced
 * server-side search (like raichu's AttendeeSelect), built from primitives so
 * the library carries no react-select dependency.
 */
export function AttendeePicker({ provider, value, onChange }: AttendeePickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AttendeeOption[]>([]);
  const [loading, setLoading] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Debounced search while open.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const t = setTimeout(() => {
      provider
        .search(query)
        .then((r) => setResults(r))
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [query, open, provider]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <div
        className={`flex items-center gap-1.5 h-7 pl-2 pr-1 rounded border text-xs ${
          open ? "border-primary-400" : "border-gray-200"
        } bg-white`}
      >
        <PiMagnifyingGlass size={13} className="text-gray-400 shrink-0" />
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="min-w-[9rem] max-w-[14rem] truncate text-left text-gray-700"
        >
          {value ? value.name : <span className="text-gray-400">Preview data…</span>}
        </button>
        {value ? (
          <button
            type="button"
            title="Clear"
            onClick={() => onChange(null)}
            className="shrink-0 text-gray-400 hover:text-gray-600 p-0.5"
          >
            <PiX size={13} />
          </button>
        ) : (
          <PiCaretDown size={12} className="text-gray-400 shrink-0" />
        )}
      </div>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-[9999] overflow-hidden">
          <div className="p-2 border-b border-gray-100">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search attendee…"
              className="w-full px-2 py-1 text-xs border border-gray-200 rounded outline-none focus:border-primary-400"
            />
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {loading ? (
              <div className="px-3 py-2 text-xs text-gray-400">Searching…</div>
            ) : results.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400">No attendees found</div>
            ) : (
              results.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => {
                    onChange(o);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-gray-100"
                >
                  <div className="text-xs text-gray-800 truncate">{o.name}</div>
                  {o.subtitle && (
                    <div className="text-[11px] text-gray-400 truncate">{o.subtitle}</div>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

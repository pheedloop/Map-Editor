import { useRef, useEffect } from "react";
import { TrophyIcon } from "./TrophyIcon";

export interface MenuItemConfig {
  label: string;
  shortcut?: string;
  disabled?: boolean;
  danger?: boolean;
  /** Show the premium trophy badge (a usage-tier locked feature). */
  premium?: boolean;
  onClick?: () => void;
}

export interface MenuDivider {
  type: "divider";
}

export type MenuEntry = MenuItemConfig | MenuDivider;

function isMenuDivider(entry: MenuEntry): entry is MenuDivider {
  return "type" in entry && entry.type === "divider";
}

function MenuItem({ label, shortcut, disabled, danger, premium, onClick }: MenuItemConfig) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={disabled && premium ? "Premium feature" : undefined}
      className={`flex items-center justify-between w-full px-3 py-1.5 text-xs transition-colors ${
        disabled
          ? "text-gray-300 cursor-default"
          : danger
            ? "text-red-600 hover:bg-red-50 cursor-pointer"
            : "text-gray-700 hover:bg-gray-100 cursor-pointer"
      }`}
    >
      <span>{label}</span>
      {premium ? (
        <span className="ml-6 flex items-center">
          <TrophyIcon size={12} />
        </span>
      ) : (
        shortcut && (
          <span className={`ml-6 ${disabled ? "text-gray-300" : "text-gray-400"}`}>
            {shortcut}
          </span>
        )
      )}
    </button>
  );
}

interface DropdownMenuProps {
  items: MenuEntry[];
  onClose: () => void;
}

export function DropdownMenu({ items, onClose }: DropdownMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    window.addEventListener("mousedown", handleClick);
    return () => window.removeEventListener("mousedown", handleClick);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute top-full left-0 mt-0 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[200px] z-[9999]"
    >
      {items.map((entry, i) =>
        isMenuDivider(entry) ? (
          <div key={`divider-${i}`} className="my-1 border-t border-gray-100" />
        ) : (
          <MenuItem
            key={entry.label}
            {...entry}
            onClick={() => {
              entry.onClick?.();
              onClose();
            }}
          />
        )
      )}
    </div>
  );
}

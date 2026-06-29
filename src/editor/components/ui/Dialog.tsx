import type { ReactNode } from "react";

interface DialogProps {
  title: string;
  onClose: () => void;
  width?: string;
  maxHeight?: string;
  headerActions?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}

export function Dialog({
  title,
  onClose,
  width = "360px",
  // Cap to the viewport so the dialog never extends off-screen; the body
  // scrolls when content is taller than this.
  maxHeight = "90vh",
  headerActions,
  footer,
  children,
}: DialogProps) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative bg-white rounded-lg shadow-xl flex flex-col max-w-full"
        style={{ width, maxHeight }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
          <div className="flex items-center gap-2">
            {headerActions}
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none cursor-pointer"
            >
              &times;
            </button>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-gray-200 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

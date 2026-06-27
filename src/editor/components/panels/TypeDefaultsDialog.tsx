import type { TypeStyles, ElementTypeDefaults } from "../../../types";
import { Dialog } from "../ui";
import { TypeDefaultsPanel } from "./TypeDefaultsPanel";

interface TypeDefaultsDialogProps {
  typeStyles: TypeStyles;
  /** Object type keys to show defaults for (the active product's categories). */
  typeKeys: string[];
  onUpdateTypeStyles: (key: string, updates: Partial<ElementTypeDefaults>) => void;
  onClose: () => void;
}

export function TypeDefaultsDialog({ typeStyles, typeKeys, onUpdateTypeStyles, onClose }: TypeDefaultsDialogProps) {
  return (
    <Dialog title="Element Defaults" onClose={onClose} width="400px" maxHeight="80vh">
      <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-3">
        <p className="text-xs text-gray-500 leading-snug">
          Style applied to new elements when placed on the canvas.
        </p>
        <TypeDefaultsPanel
          typeStyles={typeStyles}
          typeKeys={typeKeys}
          onUpdateTypeStyles={onUpdateTypeStyles}
        />
      </div>
    </Dialog>
  );
}

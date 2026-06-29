import { IconButton } from "../ui";
import {
  AlignLeftIcon,
  AlignCenterHIcon,
  AlignRightIcon,
  AlignTopIcon,
  AlignCenterVIcon,
  AlignBottomIcon,
  DistributeHIcon,
  DistributeVIcon,
} from "./alignmentIcons";

export interface AlignmentControlsProps {
  onAlignLeft?: () => void;
  onAlignCenterH?: () => void;
  onAlignRight?: () => void;
  onAlignTop?: () => void;
  onAlignCenterV?: () => void;
  onAlignBottom?: () => void;
  onDistributeH?: () => void;
  onDistributeV?: () => void;
}

/**
 * The align + distribute icon cluster shared by the map editor's OptionsBar and
 * the badge editor. Renders a fragment (no wrapper) so it drops into an existing
 * `flex items-center gap-0.5` row; each button appears only when its handler is
 * provided. Distribute handlers are typically passed only with ≥3 units.
 */
export function AlignmentControls({
  onAlignLeft,
  onAlignCenterH,
  onAlignRight,
  onAlignTop,
  onAlignCenterV,
  onAlignBottom,
  onDistributeH,
  onDistributeV,
}: AlignmentControlsProps) {
  return (
    <>
      {onAlignLeft && (
        <IconButton size="sm" title="Align left edges" onClick={onAlignLeft}>
          <AlignLeftIcon />
        </IconButton>
      )}
      {onAlignCenterH && (
        <IconButton size="sm" title="Align horizontal centers" onClick={onAlignCenterH}>
          <AlignCenterHIcon />
        </IconButton>
      )}
      {onAlignRight && (
        <IconButton size="sm" title="Align right edges" onClick={onAlignRight}>
          <AlignRightIcon />
        </IconButton>
      )}
      <div className="w-px h-3.5 bg-gray-200 shrink-0 mx-0.5" />
      {onAlignTop && (
        <IconButton size="sm" title="Align top edges" onClick={onAlignTop}>
          <AlignTopIcon />
        </IconButton>
      )}
      {onAlignCenterV && (
        <IconButton size="sm" title="Align vertical centers" onClick={onAlignCenterV}>
          <AlignCenterVIcon />
        </IconButton>
      )}
      {onAlignBottom && (
        <IconButton size="sm" title="Align bottom edges" onClick={onAlignBottom}>
          <AlignBottomIcon />
        </IconButton>
      )}
      {(onDistributeH || onDistributeV) && (
        <div className="w-px h-3.5 bg-gray-200 shrink-0 mx-0.5" />
      )}
      {onDistributeH && (
        <IconButton size="sm" title="Distribute horizontally" onClick={onDistributeH}>
          <DistributeHIcon />
        </IconButton>
      )}
      {onDistributeV && (
        <IconButton size="sm" title="Distribute vertically" onClick={onDistributeV}>
          <DistributeVIcon />
        </IconButton>
      )}
    </>
  );
}

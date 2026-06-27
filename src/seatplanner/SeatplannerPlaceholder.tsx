/**
 * Temporary stub for the seatplanner editor/viewer. Step one only scaffolds
 * navigation; the real seatplanner (tables, no tiers) lands in later steps.
 */
export function SeatplannerPlaceholder({ mode }: { mode: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-2 bg-gray-50 text-center">
      <div className="text-2xl font-semibold text-gray-700">Seatplanner</div>
      <div className="text-sm text-gray-500">
        The seatplanner {mode} is coming soon.
      </div>
    </div>
  );
}

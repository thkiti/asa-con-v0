/** Shared Tailwind classes for compact counting sheet readability. */

export const countingBlockTableClass =
  "w-full shrink-0 text-left text-xs text-zinc-950"

export const countingBlockHeadClass =
  "border-b border-zinc-300 bg-zinc-100 text-zinc-900"

/** Sticky within each counting block while scrolling (freeze panes). */
export const countingBlockHeadCellClass =
  "sticky top-0 z-[1] bg-zinc-100 px-1 py-0.5 font-semibold whitespace-nowrap shadow-[0_1px_0_0_rgb(212_212_216)]"

export const countingCellHookClass =
  "px-1 py-0.5 whitespace-nowrap tabular-nums font-semibold text-zinc-950"

export const countingCellCodeClass =
  "px-1 py-0.5 whitespace-nowrap font-medium text-zinc-950"

export const countingQtyInputClass =
  "w-14 rounded border border-zinc-400 bg-white px-1 py-0.5 text-right text-sm font-semibold text-zinc-950 tabular-nums focus:border-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:cursor-not-allowed disabled:border-zinc-300 disabled:bg-zinc-100 disabled:text-zinc-800 disabled:opacity-100"

export const countingBlockShellClass =
  "min-w-[9rem] shrink-0 rounded border border-zinc-300 bg-white shadow-sm counting-block-shell"

export const countingBlockShellShoeClass =
  "min-w-[11rem] max-w-[14rem] shrink-0 rounded border border-zinc-300 bg-white shadow-sm counting-block-shell"

export const countingCellNameClass =
  "max-w-[6rem] truncate px-1 py-0.5 font-medium text-zinc-950"

export const countingShoeScrollClass =
  "max-w-full overflow-x-auto pb-1"

export const countingSummaryPanelClass =
  "flex max-h-[min(70vh,28rem)] flex-col overflow-hidden rounded border border-zinc-300 bg-white"

export const countingSummaryScrollClass =
  "min-h-0 flex-1 overflow-x-auto overflow-y-auto"

export const countingSummaryTotalFooterClass =
  "shrink-0 border-t-2 border-zinc-400 bg-zinc-100"

export const countingSummaryTotalRowClass = "font-bold text-zinc-950"

export const countingSummaryHeadClass =
  "border-b border-zinc-300 bg-zinc-100 px-3 py-2"

export const countingSummaryTableHeadClass =
  "border-b border-zinc-300 bg-zinc-100 text-zinc-900"

export const countingSummaryBodyCellClass =
  "px-2 py-1.5 text-zinc-950 tabular-nums"

export const countingSummaryGroupCellClass =
  "px-2 py-1.5 font-mono text-xs font-medium text-zinc-950"

/** Staff count mode — secondary 2-row header container (identity + controls). */
export const stockCountHeaderBoxClass =
  "stock-count-header-box max-h-[4.5rem] shrink-0 overflow-hidden rounded border border-zinc-200 bg-zinc-50 px-2 py-1"

export const stockCountHeaderIdentityRowClass =
  "stock-count-header-box__identity truncate text-base font-semibold leading-5 text-zinc-700"

export const stockCountHeaderControlsRowClass =
  "stock-count-header-box__controls flex h-8 flex-nowrap items-center justify-between gap-3 overflow-hidden"

/** Staff count mode — unified Save / Submit / Back action group. */
export const stockCountStaffActionClass =
  "stock-count-staff-action rounded-md border border-zinc-900 bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-900 hover:text-white focus-visible:outline focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white disabled:hover:text-zinc-900"

/** Staff count mode — primary workspace; 12px below header via mt-3 on parent flex. */
export const stockCountWorkspaceBoxClass =
  "stock-count-workspace-box min-h-0 flex-1 overflow-y-auto rounded border border-zinc-300 bg-white p-2"

export const stockCountWorkspaceGridClass =
  "grid grid-cols-1 gap-2 lg:grid-cols-4"

export const countingSummaryPanelStaffClass =
  "flex h-full min-h-[12rem] flex-col overflow-hidden rounded border border-zinc-300 bg-white lg:min-h-0"

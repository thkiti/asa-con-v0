"use client"

import { formatReadZBangkokDisplayYmd } from "@/lib/thermal/build-read-z-info-block"
import {
  buildReadZLookupDropdownDates,
  type ReadZLookupDocType,
  type ReadZLookupMode,
} from "@/lib/pos-ui/read-z-lookup-display"

type PosReadZLookupControlsProps = {
  docType?: ReadZLookupDocType
  selectedDate: string
  lookupMode: ReadZLookupMode
  reviewLoading?: boolean
  onDateSelect: (ymd: string) => void
  onCumulativePress: () => void
}

const FIELD_CLASS =
  "w-full rounded border border-white/40 bg-white/95 px-2 py-1 font-mono text-xs text-zinc-900 disabled:cursor-not-allowed disabled:opacity-60"

const CUMULATIVE_ACTIVE_CLASS =
  "w-full rounded border border-amber-300 bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900 hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"

const CUMULATIVE_IDLE_CLASS =
  "w-full rounded border border-white/40 bg-white/15 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/25 disabled:cursor-not-allowed disabled:opacity-60"

/** READ Z Lookup — doc type, date (auto-load), cumulative (no search). */
export function PosReadZLookupControls({
  docType = "READ_Z",
  selectedDate,
  lookupMode,
  reviewLoading = false,
  onDateSelect,
  onCumulativePress,
}: PosReadZLookupControlsProps) {
  const dropdownDates = buildReadZLookupDropdownDates(selectedDate)

  return (
    <div
      className="readZLookupControlRow"
      data-testid="pos-read-z-lookup-controls"
    >
      <select
        value={docType}
        disabled
        className={FIELD_CLASS}
        data-testid="pos-read-z-lookup-doc-type"
        aria-label="Doc Type"
      >
        <option value="READ_Z">READ Z</option>
      </select>

      <select
        value={selectedDate}
        disabled={reviewLoading}
        onChange={(e) => {
          const ymd = e.target.value
          if (ymd) onDateSelect(ymd)
        }}
        className={FIELD_CLASS}
        data-testid="pos-read-z-lookup-date"
        aria-label="Business date"
      >
        {dropdownDates.map((ymd) => (
          <option key={ymd} value={ymd}>
            {formatReadZBangkokDisplayYmd(ymd)}
          </option>
        ))}
      </select>

      <button
        type="button"
        disabled={reviewLoading}
        onClick={onCumulativePress}
        className={
          lookupMode === "cumulative" ? CUMULATIVE_ACTIVE_CLASS : CUMULATIVE_IDLE_CLASS
        }
        data-testid="pos-read-z-lookup-cumulative"
      >
        Cumulative To-Date
      </button>
    </div>
  )
}

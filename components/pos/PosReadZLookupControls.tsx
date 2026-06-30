"use client"

import { formatReadZBangkokDisplayYmd } from "@/lib/thermal/build-read-z-info-block"
import {
  buildReadZLookupDropdownDates,
  type ReadZLookupDocType,
  type ReadZLookupMode,
} from "@/lib/pos-ui/read-z-lookup-display"
import {
  posReadZLookupCumulativeActive,
  posReadZLookupCumulativeIdle,
  posReadZLookupField,
} from "@/lib/pos-ui/pos-read-report-classes"

type PosReadZLookupControlsProps = {
  docType?: ReadZLookupDocType
  selectedDate: string
  lookupMode: ReadZLookupMode
  reviewLoading?: boolean
  onDateSelect: (ymd: string) => void
  onCumulativePress: () => void
}

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
        className={posReadZLookupField}
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
        className={posReadZLookupField}
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
          lookupMode === "cumulative"
            ? posReadZLookupCumulativeActive
            : posReadZLookupCumulativeIdle
        }
        data-testid="pos-read-z-lookup-cumulative"
      >
        Cumulative To-Date
      </button>
    </div>
  )
}

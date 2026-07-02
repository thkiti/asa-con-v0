"use client"

import { useId, useRef } from "react"
import { voucherInquiryMoreFilterDateInput } from "@/lib/finance-ui/finance-visual-classes"
import {
  formatDocumentTraceDisplayDate,
  parseDocumentTraceDisplayDate,
} from "@/lib/finance-ui/document-trace-date-range"

type DocumentTraceMoreFilterDateFieldProps = {
  displayValue: string
  isoValue: string
  minIso?: string
  maxIso?: string
  placeholder?: string
  ariaLabel: string
  testId: string
  onDisplayChange: (value: string) => void
  onBlur: () => void
  onCalendarPick: (iso: string) => void
}

export function DocumentTraceMoreFilterDateField({
  displayValue,
  isoValue,
  minIso,
  maxIso,
  placeholder = "dd/mm/yyyy",
  ariaLabel,
  testId,
  onDisplayChange,
  onBlur,
  onCalendarPick,
}: DocumentTraceMoreFilterDateFieldProps) {
  const pickerId = useId()
  const pickerRef = useRef<HTMLInputElement>(null)

  const openCalendar = () => {
    const picker = pickerRef.current
    if (!picker) return
    if (typeof picker.showPicker === "function") {
      picker.showPicker()
      return
    }
    picker.click()
  }

  return (
    <div className="relative flex shrink-0 items-center">
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        className={`${voucherInquiryMoreFilterDateInput} pr-7`}
        value={displayValue}
        placeholder={placeholder}
        aria-label={ariaLabel}
        data-testid={testId}
        onChange={(event) => onDisplayChange(event.target.value)}
        onBlur={onBlur}
      />
      <input
        id={pickerId}
        ref={pickerRef}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute h-0 w-0 opacity-0"
        value={isoValue}
        min={minIso}
        max={maxIso}
        onChange={(event) => {
          const iso = event.target.value
          if (!iso) return
          onCalendarPick(iso)
        }}
      />
      <button
        type="button"
        className="absolute right-1 flex h-6 w-6 items-center justify-center text-zinc-500 hover:text-zinc-800"
        aria-label={`${ariaLabel} calendar`}
        data-testid={`${testId}-calendar`}
        onMouseDown={(event) => event.preventDefault()}
        onClick={openCalendar}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          className="h-4 w-4 fill-current"
        >
          <path d="M5.75 2a.75.75 0 0 1 .75.75V4h7.5V2.75a.75.75 0 0 1 1.5 0V4h.75A2.75 2.75 0 0 1 18.5 6.75v8.5A2.75 2.75 0 0 1 15.75 18H4.25A2.75 2.75 0 0 1 1.5 15.25v-8.5A2.75 2.75 0 0 1 4.25 4h.75V2.75A.75.75 0 0 1 5.75 2Zm-1.5 4.5v7.75c0 .69.56 1.25 1.25 1.25h11.5c.69 0 1.25-.56 1.25-1.25V6.5H4.25ZM6 9.25a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5A.75.75 0 0 1 6 9.25Zm4.75-.75a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5Zm-4.75 3.5a.75.75 0 0 1 .75-.75h1.5a.75.75 0 0 1 0 1.5h-1.5a.75.75 0 0 1-.75-.75Zm4.75-.75a.75.75 0 0 0 0 1.5h1.5a.75.75 0 0 0 0-1.5h-1.5Z" />
        </svg>
      </button>
    </div>
  )
}

export function documentTraceDateFieldIsoValue(
  displayValue: string,
  fallbackIso: string
): string {
  return parseDocumentTraceDisplayDate(displayValue) ?? fallbackIso
}

export function documentTraceDateFieldDisplayFromIso(iso: string): string {
  return formatDocumentTraceDisplayDate(iso)
}

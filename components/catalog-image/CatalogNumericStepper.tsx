"use client"

import { useCallback, useEffect, useState } from "react"
import {
  adjustNumericStepperValue,
  formatNumericStepperValue,
  normalizeNumericStepperValue,
  type CatalogNumericFormat,
} from "@/lib/catalog-image-ui/numeric-stepper"

export type CatalogNumericStepperProps = {
  label: string
  value: number
  step: number
  format: CatalogNumericFormat
  min?: number
  max?: number
  disabled?: boolean
  compact?: boolean
  onChange: (value: number) => void
}

const INPUT_SHARED_CLASS =
  "rounded border border-border bg-card py-1 text-right text-sm font-mono tabular-nums text-foreground [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"

const INPUT_DEFAULT_CLASS = `${INPUT_SHARED_CLASS} min-w-[90px] w-[90px] px-2`

const INPUT_COMPACT_XY_CLASS = `${INPUT_SHARED_CLASS} min-w-[60px] w-[60px] px-1`

const INPUT_COMPACT_DIMENSION_CLASS = `${INPUT_SHARED_CLASS} min-w-[68px] w-[68px] px-1.5`

const STEP_BUTTON_CLASS =
  "flex h-5 w-5 items-center justify-center rounded border border-border bg-card text-[10px] leading-none text-foreground hover:bg-[var(--btn-secondary-hover)] disabled:cursor-not-allowed disabled:opacity-50"

function compactInputClass(label: string): string {
  if (label === "X" || label === "Y") return INPUT_COMPACT_XY_CLASS
  return INPUT_COMPACT_DIMENSION_CLASS
}

function compactLabelClass(label: string): string {
  if (label === "Width") return "min-w-[2rem]"
  if (label === "Height") return "min-w-[2.25rem]"
  return "shrink-0"
}

export function CatalogNumericStepper({
  label,
  value,
  step,
  format,
  min,
  max,
  disabled = false,
  compact = false,
  onChange,
}: CatalogNumericStepperProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(formatNumericStepperValue(value, format))

  useEffect(() => {
    if (!editing) {
      setDraft(formatNumericStepperValue(value, format))
    }
  }, [value, format, editing])

  const applyValue = useCallback(
    (next: number) => {
      onChange(normalizeNumericStepperValue(next, format, min, max))
    },
    [format, max, min, onChange]
  )

  const commitDraft = useCallback(
    (raw: string) => {
      const parsed = parseFloat(raw)
      if (!Number.isFinite(parsed)) {
        setDraft(formatNumericStepperValue(value, format))
        return
      }
      applyValue(parsed)
    },
    [applyValue, format, value]
  )

  const adjust = useCallback(
    (direction: "up" | "down") => {
      applyValue(adjustNumericStepperValue(value, step, direction, format, min, max))
    },
    [applyValue, format, max, min, step, value]
  )

  if (compact) {
    const labelInputGap =
      label === "X" || label === "Y" ? "gap-0.5" : "gap-1"

    return (
      <div className="flex shrink-0 items-center gap-1 text-sm">
        <div className={`flex items-center ${labelInputGap}`}>
          <span
            className={`text-muted-foreground ${compactLabelClass(label)}`}
          >
            {label}
          </span>
          <input
            type="text"
            inputMode="decimal"
            disabled={disabled}
            value={draft}
            onFocus={() => {
              setEditing(true)
              setDraft(formatNumericStepperValue(value, format))
            }}
            onBlur={() => {
              setEditing(false)
              commitDraft(draft)
            }}
            onChange={(event) => {
              const next = event.target.value
              setDraft(next)
              const parsed = parseFloat(next)
              if (Number.isFinite(parsed)) {
                applyValue(parsed)
              }
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.currentTarget.blur()
              }
            }}
            className={compactInputClass(label)}
          />
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            disabled={disabled}
            aria-label={`Decrease ${label}`}
            className={STEP_BUTTON_CLASS}
            onClick={() => adjust("down")}
          >
            ▼
          </button>
          <button
            type="button"
            disabled={disabled}
            aria-label={`Increase ${label}`}
            className={STEP_BUTTON_CLASS}
            onClick={() => adjust("up")}
          >
            ▲
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex shrink-0 items-center gap-2 text-sm">
      <span className="min-w-[3.25rem] text-muted-foreground">{label}</span>
      <input
        type="text"
        inputMode="decimal"
        disabled={disabled}
        value={draft}
        onFocus={() => {
          setEditing(true)
          setDraft(formatNumericStepperValue(value, format))
        }}
        onBlur={() => {
          setEditing(false)
          commitDraft(draft)
        }}
        onChange={(event) => {
          const next = event.target.value
          setDraft(next)
          const parsed = parseFloat(next)
          if (Number.isFinite(parsed)) {
            applyValue(parsed)
          }
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.currentTarget.blur()
          }
        }}
        className={INPUT_DEFAULT_CLASS}
      />
      <div className="flex items-center gap-0.5">
        <button
          type="button"
          disabled={disabled}
          aria-label={`Decrease ${label}`}
          className={STEP_BUTTON_CLASS}
          onClick={() => adjust("down")}
        >
          ▼
        </button>
        <button
          type="button"
          disabled={disabled}
          aria-label={`Increase ${label}`}
          className={STEP_BUTTON_CLASS}
          onClick={() => adjust("up")}
        >
          ▲
        </button>
      </div>
    </div>
  )
}

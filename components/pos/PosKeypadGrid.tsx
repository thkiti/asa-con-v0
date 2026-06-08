"use client"

import { POS_KEYPAD_BUTTONS } from "@/lib/pos-ui/keypad-layout"
import type { PosKeypadActionId, PosKeypadButtonVariant } from "@/lib/pos-ui/types"

const POS_KEYPAD_GHOST_SURFACE =
  "border-2 border-zinc-500/50 bg-zinc-400/30 shadow-inner cursor-not-allowed"

type PosKeypadGridProps = {
  onAction: (id: PosKeypadActionId) => void
  disabled?: boolean
  printReportHighlighted?: boolean
  printReportLabel?: string
  ghostButtonIds?: ReadonlySet<PosKeypadActionId>
}

function variantClassName(variant: PosKeypadButtonVariant): string {
  switch (variant) {
    case "worktime":
      return "bg-green-600 text-white"
    case "target":
      return "bg-violet-600 text-white"
    case "collector":
      return "border border-amber-900 bg-gradient-to-b from-amber-500 to-amber-700 text-white"
    case "logout":
      return "border border-zinc-700 bg-gradient-to-b from-zinc-700 to-zinc-900 text-white"
    case "digit":
      return "border border-zinc-700 bg-gradient-to-b from-zinc-500 via-zinc-600 to-zinc-700 text-zinc-100 text-2xl"
    case "control":
      return "border border-zinc-800 bg-gradient-to-b from-zinc-700 to-zinc-900 text-zinc-100 text-2xl"
    case "enter":
      return "border border-zinc-900 bg-gradient-to-b from-zinc-800 to-black text-zinc-100 text-xl leading-tight"
    case "refund":
      return "bg-blue-600 text-white"
    case "stock-count":
      return "bg-green-600 text-white text-[10px] leading-tight sm:text-xs"
    case "repair":
      return "border border-sky-900 bg-gradient-to-b from-sky-600 to-sky-800 text-white text-[10px] leading-tight sm:text-xs"
    case "read-x":
      return "bg-blue-700 text-white"
    case "read-z":
      return "bg-rose-700 text-white"
    case "print-report":
      return "border-2 border-zinc-500/50 bg-zinc-400/30 text-zinc-600 text-[9px] leading-tight sm:text-[10px]"
    case "checkout":
      return "border-2 border-zinc-500/50 bg-zinc-400/30 text-zinc-600"
    default:
      return "bg-zinc-600 text-white"
  }
}

function labelLines(label: string, multiline?: boolean): string[] {
  if (multiline && label.includes("\n")) {
    return label.split("\n")
  }
  return [label]
}

export function PosKeypadGrid({
  onAction,
  disabled = false,
  printReportHighlighted = false,
  printReportLabel,
  ghostButtonIds,
}: PosKeypadGridProps) {
  return (
    <div className="grid h-full max-w-full grid-cols-7 grid-rows-4 gap-2">
      {POS_KEYPAD_BUTTONS.map((btn) => {
        const colSpan = btn.colSpan ?? 1
        const rowSpan = btn.rowSpan ?? 1
        const isPrint = btn.id === "print-report"
        const label =
          isPrint && printReportLabel ? printReportLabel : btn.label
        const lines = labelLines(
          label,
          isPrint && printReportLabel?.includes("\n") ? true : btn.multiline
        )
        const isDigit = btn.variant === "digit" || btn.variant === "control"
        const isGhost = ghostButtonIds?.has(btn.id) ?? false
        const printClass = isPrint && printReportHighlighted
          ? "border-4 border-red-950 bg-gradient-to-b from-red-600 to-red-900 text-white shadow-[0_0_0_2px_rgba(254,202,202,0.95),0_4px_0_#450a0a] hover:brightness-110 active:translate-y-[1px]"
          : variantClassName(btn.variant)

        if (isGhost) {
          return (
            <button
              key={btn.id}
              type="button"
              disabled
              tabIndex={-1}
              aria-hidden
              style={{
                gridColumn: `${btn.col} / span ${colSpan}`,
                gridRow: `${btn.row} / span ${rowSpan}`,
              }}
              className={`h-full w-full rounded-lg ${POS_KEYPAD_GHOST_SURFACE}`}
            />
          )
        }

        return (
          <button
            key={btn.id}
            type="button"
            disabled={disabled && !isPrint}
            onClick={() => onAction(btn.id)}
            style={{
              gridColumn: `${btn.col} / span ${colSpan}`,
              gridRow: `${btn.row} / span ${rowSpan}`,
            }}
            className={`h-full w-full rounded-lg font-extrabold shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${disabled && !isPrint ? "" : "cursor-pointer"} ${printClass} ${isDigit ? "" : "text-xs"}`}
          >
            {lines.length > 1 ? (
              lines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))
            ) : (
              label
            )}
          </button>
        )
      })}
    </div>
  )
}

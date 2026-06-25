"use client"

import type { ReactNode } from "react"
import {
  POS_KEYPAD_BUTTONS,
  POS_KEYPAD_MESSAGE_SLOT,
  POS_KEYPAD_PLACEHOLDER_CELLS,
} from "@/lib/pos-ui/keypad-layout"
import type { PosKeypadActionId, PosKeypadButtonVariant } from "@/lib/pos-ui/types"
import { PosKeypadRefundSplitButton } from "./PosKeypadRefundSplitButton"

const POS_KEYPAD_GHOST_SURFACE =
  "border-2 border-zinc-500/50 bg-zinc-400/30 shadow-inner cursor-not-allowed"

type PosKeypadGridProps = {
  onAction: (id: PosKeypadActionId) => void
  onReceiptLookup?: () => void
  disabled?: boolean
  printReportHighlighted?: boolean
  printReportLabel?: string
  ghostButtonIds?: ReadonlySet<PosKeypadActionId>
  buttonLabelOverrides?: Partial<Record<PosKeypadActionId, string>>
  permanentlyDisabledButtonIds?: ReadonlySet<PosKeypadActionId>
  messageSlot?: ReactNode
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
    case "order":
      return "bg-emerald-600 text-white text-[10px] leading-tight sm:text-xs"
    case "stock-count":
      return "border border-green-900 bg-green-700 text-white text-[10px] leading-tight sm:text-xs"
    case "repair":
      return "border border-sky-900 bg-gradient-to-b from-sky-600 to-sky-800 text-white text-[10px] leading-tight sm:text-xs"
    case "read-x":
      return "bg-blue-700 text-white"
    case "read-z":
      return "bg-rose-700 text-white"
    case "staff-evidence":
      return "border border-teal-900 bg-gradient-to-b from-teal-600 to-teal-800 text-white text-[10px] leading-tight sm:text-[11px]"
    case "print-report":
      return "border-2 border-zinc-500/50 bg-zinc-400/30 text-zinc-600 text-[9px] leading-tight sm:text-[10px]"
    case "checkout":
      return "border border-green-800 bg-[#16A34A] text-white hover:bg-[#15803D]"
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
  onReceiptLookup,
  disabled = false,
  printReportHighlighted = false,
  printReportLabel,
  ghostButtonIds,
  buttonLabelOverrides,
  permanentlyDisabledButtonIds,
  messageSlot,
}: PosKeypadGridProps) {
  return (
    <div className="grid h-full max-w-full grid-cols-7 grid-rows-5 gap-2">
      {POS_KEYPAD_BUTTONS.map((btn) => {
        const colSpan = btn.colSpan ?? 1
        const rowSpan = btn.rowSpan ?? 1

        if (btn.id === "refund") {
          return (
            <PosKeypadRefundSplitButton
              key={btn.id}
              col={btn.col}
              row={btn.row}
              colSpan={colSpan}
              rowSpan={rowSpan}
              disabled={disabled}
              onRefund={() => onAction("refund")}
              onReceiptLookup={() => onReceiptLookup?.()}
            />
          )
        }

        const isPrint = btn.id === "print-report"
        const label =
          buttonLabelOverrides?.[btn.id] ??
          (isPrint && printReportLabel ? printReportLabel : btn.label)
        const lines = labelLines(
          label,
          isPrint && printReportLabel?.includes("\n") ? true : btn.multiline
        )
        const isDigit = btn.variant === "digit" || btn.variant === "control"
        const isGhost = ghostButtonIds?.has(btn.id) ?? false
        const permanentlyDisabled = permanentlyDisabledButtonIds?.has(btn.id) ?? false
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
            disabled={permanentlyDisabled || (disabled && !isPrint)}
            onClick={() => onAction(btn.id)}
            style={{
              gridColumn: `${btn.col} / span ${colSpan}`,
              gridRow: `${btn.row} / span ${rowSpan}`,
            }}
            className={`h-full w-full rounded-lg font-extrabold shadow-sm transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${permanentlyDisabled || (disabled && !isPrint) ? "" : "cursor-pointer"} ${printClass} ${isDigit ? "" : "text-xs"}`}
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

      {POS_KEYPAD_PLACEHOLDER_CELLS.map((cell) => (
        <div
          key={`placeholder-${cell.col}-${cell.row}`}
          aria-hidden
          data-testid="pos-keypad-placeholder-cell"
          style={{
            gridColumn: `${cell.col} / span ${cell.colSpan ?? 1}`,
            gridRow: `${cell.row} / span ${cell.rowSpan ?? 1}`,
          }}
          className={`h-full w-full rounded-lg ${POS_KEYPAD_GHOST_SURFACE}`}
        />
      ))}

      {messageSlot ? (
        <div
          data-testid="pos-keypad-message-slot"
          style={{
            gridColumn: `${POS_KEYPAD_MESSAGE_SLOT.col} / span ${POS_KEYPAD_MESSAGE_SLOT.colSpan}`,
            gridRow: `${POS_KEYPAD_MESSAGE_SLOT.row}`,
          }}
          className="min-h-0"
        >
          {messageSlot}
        </div>
      ) : null}
    </div>
  )
}

"use client"

import type { ReceiptBlockFontPx } from "@/lib/thermal/receipt-block-font-size"
import {
  receiptBlockFontPxLabel,
  stepReceiptBlockFontPx,
} from "@/lib/thermal/receipt-block-font-size"
import { themeInput } from "@/lib/theme/theme-classes"

type ReceiptBlockEditorProps = {
  label: string
  text: string
  fontSizePx: ReceiptBlockFontPx
  bold: boolean
  rows?: number
  disabled?: boolean
  onTextChange: (value: string) => void
  onFontSizeChange: (size: ReceiptBlockFontPx) => void
  onBoldChange: (bold: boolean) => void
}

const textareaMinHeightClass: Record<number, string> = {
  2: "min-h-[3.25rem]",
  4: "min-h-[6.5rem]",
}

/** Small side control dots — 15px, low visual weight. */
const dotBtn =
  "inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border-0 p-0 text-[8px] font-semibold leading-none text-white disabled:opacity-35"

export function ReceiptBlockEditor({
  label,
  text,
  fontSizePx,
  bold,
  rows = 2,
  disabled = false,
  onTextChange,
  onFontSizeChange,
  onBoldChange,
}: ReceiptBlockEditorProps) {
  const minHeightClass = textareaMinHeightClass[rows] ?? textareaMinHeightClass[2]

  return (
    <div className="space-y-1" data-testid={`receipt-block-editor-${label.toLowerCase()}`}>
      <div className="flex items-baseline justify-between gap-2 pr-[19px]">
        <span className="text-sm font-medium text-zinc-800">{label}</span>
        <span className="text-[10px] tabular-nums text-zinc-400">
          {receiptBlockFontPxLabel(fontSizePx)}
        </span>
      </div>

      <div className="flex items-stretch gap-1">
        <textarea
          value={text}
          onChange={(event) => onTextChange(event.target.value)}
          disabled={disabled}
          rows={rows}
          className={`${themeInput} receipt-block-textarea ${minHeightClass} flex-1 resize-y font-mono text-sm leading-snug`}
          data-testid={`receipt-block-textarea-${label.toLowerCase()}`}
        />
        <div className="flex shrink-0 flex-col justify-center gap-0.5 py-0.5">
          <button
            type="button"
            className={`${dotBtn} bg-green-600/85`}
            disabled={disabled}
            onClick={() => onFontSizeChange(stepReceiptBlockFontPx(fontSizePx, "increase"))}
            aria-label={`Increase ${label} font size`}
            data-testid={`receipt-block-font-increase-${label.toLowerCase()}`}
          >
            +
          </button>
          <button
            type="button"
            className={`${dotBtn} ${bold ? "bg-zinc-900" : "bg-zinc-600/90"}`}
            disabled={disabled}
            onClick={() => onBoldChange(!bold)}
            aria-label={`Toggle ${label} bold`}
            aria-pressed={bold}
            data-testid={`receipt-block-bold-toggle-${label.toLowerCase()}`}
          >
            B
          </button>
          <button
            type="button"
            className={`${dotBtn} bg-red-600/85`}
            disabled={disabled}
            onClick={() => onFontSizeChange(stepReceiptBlockFontPx(fontSizePx, "decrease"))}
            aria-label={`Decrease ${label} font size`}
            data-testid={`receipt-block-font-decrease-${label.toLowerCase()}`}
          >
            −
          </button>
        </div>
      </div>
    </div>
  )
}

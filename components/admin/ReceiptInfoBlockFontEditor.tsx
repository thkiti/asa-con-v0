"use client"

import type { ReceiptBlockFontPx } from "@/lib/thermal/receipt-block-font-size"
import {
  receiptBlockFontPxLabel,
  stepReceiptBlockFontPx,
} from "@/lib/thermal/receipt-block-font-size"

type ReceiptBlockFontControlsProps = {
  label: string
  fontSizePx: ReceiptBlockFontPx
  bold: boolean
  disabled?: boolean
  onFontSizeChange: (size: ReceiptBlockFontPx) => void
  onBoldChange: (bold: boolean) => void
}

const dotBtn =
  "inline-flex h-[15px] w-[15px] shrink-0 items-center justify-center rounded-full border-0 p-0 text-[8px] font-semibold leading-none text-white disabled:opacity-35"

export function ReceiptBlockFontControls({
  label,
  fontSizePx,
  bold,
  disabled = false,
  onFontSizeChange,
  onBoldChange,
}: ReceiptBlockFontControlsProps) {
  const slug = label.toLowerCase().replace(/\s+/g, "-")

  return (
    <div className="flex shrink-0 flex-col justify-center gap-0.5 py-0.5">
      <button
        type="button"
        className={`${dotBtn} bg-green-600/85`}
        disabled={disabled}
        onClick={() => onFontSizeChange(stepReceiptBlockFontPx(fontSizePx, "increase"))}
        aria-label={`Increase ${label} font size`}
        data-testid={`receipt-block-font-increase-${slug}`}
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
        data-testid={`receipt-block-bold-toggle-${slug}`}
      >
        B
      </button>
      <button
        type="button"
        className={`${dotBtn} bg-red-600/85`}
        disabled={disabled}
        onClick={() => onFontSizeChange(stepReceiptBlockFontPx(fontSizePx, "decrease"))}
        aria-label={`Decrease ${label} font size`}
        data-testid={`receipt-block-font-decrease-${slug}`}
      >
        −
      </button>
    </div>
  )
}

type ReceiptInfoBlockFontEditorProps = {
  fontSizePx: ReceiptBlockFontPx
  bold: boolean
  disabled?: boolean
  onFontSizeChange: (size: ReceiptBlockFontPx) => void
  onBoldChange: (bold: boolean) => void
}

export function ReceiptInfoBlockFontEditor({
  fontSizePx,
  bold,
  disabled = false,
  onFontSizeChange,
  onBoldChange,
}: ReceiptInfoBlockFontEditorProps) {
  return (
    <div className="space-y-1" data-testid="receipt-block-editor-info-block">
      <div className="flex items-baseline justify-between gap-2 pr-[19px]">
        <span className="text-sm font-medium text-zinc-800">Info block</span>
        <span className="text-[10px] tabular-nums text-zinc-400">
          {receiptBlockFontPxLabel(fontSizePx)}
        </span>
      </div>
      <div className="flex items-stretch gap-1">
        <p className="flex-1 text-xs leading-snug text-zinc-500">
          Branch, Tel, M/C No., Tax ID, Ref/Date, and Staff rows.
        </p>
        <ReceiptBlockFontControls
          label="Info block"
          fontSizePx={fontSizePx}
          bold={bold}
          disabled={disabled}
          onFontSizeChange={onFontSizeChange}
          onBoldChange={onBoldChange}
        />
      </div>
    </div>
  )
}

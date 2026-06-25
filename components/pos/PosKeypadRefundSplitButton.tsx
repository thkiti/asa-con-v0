"use client"

type PosKeypadRefundSplitButtonProps = {
  col: number
  row: number
  colSpan?: number
  rowSpan?: number
  disabled?: boolean
  onRefund: () => void
  onReceiptLookup: () => void
}

const REFUND_BUTTON_CLASS =
  "bg-blue-600 text-white text-xs font-extrabold shadow-sm transition active:scale-[0.98]"

export function PosKeypadRefundSplitButton({
  col,
  row,
  colSpan = 1,
  rowSpan = 1,
  disabled = false,
  onRefund,
  onReceiptLookup,
}: PosKeypadRefundSplitButtonProps) {
  const enabledClass = disabled
    ? "cursor-not-allowed opacity-60"
    : "cursor-pointer hover:brightness-110"

  return (
    <div
      data-testid="pos-keypad-refund-split"
      style={{
        gridColumn: `${col} / span ${colSpan}`,
        gridRow: `${row} / span ${rowSpan}`,
      }}
      className="flex h-full w-full min-h-0 flex-col overflow-hidden rounded-lg shadow-sm"
    >
      <button
        type="button"
        disabled={disabled}
        data-testid="pos-keypad-refund"
        onClick={onRefund}
        className={`flex min-h-0 flex-1 items-center justify-center border-b border-blue-800/60 ${REFUND_BUTTON_CLASS} ${enabledClass}`}
      >
        REFUND
      </button>
      <button
        type="button"
        disabled={disabled}
        data-testid="pos-keypad-receipt-lookup"
        onClick={onReceiptLookup}
        className={`flex min-h-0 flex-1 items-center justify-center leading-tight ${REFUND_BUTTON_CLASS} ${enabledClass}`}
      >
        REC. LOOKUP
      </button>
    </div>
  )
}

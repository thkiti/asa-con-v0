"use client"

import { PosCartProductDetailPopup } from "@/components/pos/PosCartProductDetailPopup"
import type { PosCartLine } from "@/lib/pos/cart"
import { cartTotal, lineAmount } from "@/lib/pos/cart"
import {
  formatReceiptDisplay,
  formatStaffDisplay,
} from "@/lib/pos-ui/pos-session-display"
import { isTouchPrimaryDevice } from "@/lib/pos-ui/use-touch-primary"
import type { PosTerminalSession } from "@/lib/pos-ui/types"
import { useRef, useState, type ReactNode } from "react"

type PosReceiptPanelProps = {
  session: PosTerminalSession
  receiptNo: string | null
  lines: readonly PosCartLine[]
  lookupError?: string | null
  onIncrementQty: (productId: string) => void
  onDecrementQty: (productId: string) => void
  onRemoveLine: (productId: string) => void
  onClearCart: () => void
  overlay?: ReactNode
}

type DetailPopupState = {
  line: PosCartLine
  anchorTop: number
}

function formatMoney(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function PosReceiptPanel({
  session,
  receiptNo,
  lines,
  lookupError,
  onIncrementQty,
  onDecrementQty,
  onRemoveLine,
  onClearCart,
  overlay,
}: PosReceiptPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const touchPrimary = isTouchPrimaryDevice()
  const [detailPopup, setDetailPopup] = useState<DetailPopupState | null>(null)
  const total = cartTotal(lines)

  function openDetailPopup(line: PosCartLine, rowEl: HTMLElement): void {
    const panel = panelRef.current
    if (!panel) return
    const panelRect = panel.getBoundingClientRect()
    const rowRect = rowEl.getBoundingClientRect()
    setDetailPopup({
      line,
      anchorTop: rowRect.top - panelRect.top,
    })
  }

  function closeDetailPopup(): void {
    setDetailPopup(null)
  }

  function handleRowClick(
    line: PosCartLine,
    event: React.MouseEvent<HTMLLIElement>
  ): void {
    if (!touchPrimary) return
    if ((event.target as HTMLElement).closest("button")) return
    openDetailPopup(line, event.currentTarget)
  }

  return (
    <div
      ref={panelRef}
      className="relative flex h-full min-h-0 w-[380px] shrink-0 flex-col overflow-hidden border-l border-orange-800 bg-orange-600 text-white"
    >
      {detailPopup && touchPrimary ? (
        <PosCartProductDetailPopup
          line={detailPopup.line}
          variant="modal"
          onClose={closeDetailPopup}
        />
      ) : null}

      {detailPopup && !touchPrimary ? (
        <PosCartProductDetailPopup
          line={detailPopup.line}
          variant="anchored"
          anchorTop={detailPopup.anchorTop}
        />
      ) : null}

      {overlay}

      <div className="shrink-0 space-y-2 border-b border-white/30 p-3 text-center">
        <div className="text-sm font-bold">ASA SERVICES</div>
        <div className="space-y-1.5 border-t border-white/30 pt-2 text-left text-sm leading-snug">
          <div>
            <span className="text-white/85">Receipt:</span>{" "}
            <span className="font-mono font-semibold tabular-nums">
              {formatReceiptDisplay(receiptNo)}
            </span>
          </div>
          <div className="min-w-0">
            <span className="text-white/85">Staff:</span>{" "}
            <span className="font-medium">
              {formatStaffDisplay(session.staffId, session.name)}
            </span>
          </div>
        </div>
      </div>

      {lookupError ? (
        <div
          className="shrink-0 border-b border-white/30 bg-red-900/50 px-3 py-2 text-center text-xs font-medium"
          role="alert"
        >
          {lookupError}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
        <div className="mb-1 grid grid-cols-[1fr_88px_80px] border-b border-white/40 pb-1 text-xs font-semibold">
          <div>Name</div>
          <div className="text-center">Qty</div>
          <div className="text-right">Amount</div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {lines.length === 0 ? (
            <div className="flex h-full items-center justify-center py-8 text-center text-sm text-white/80">
              Scan a product to add to cart
            </div>
          ) : (
            <ul className="space-y-2">
              {lines.map((line) => (
                <li
                  key={line.productId}
                  data-testid="pos-cart-row"
                  className="grid grid-cols-[1fr_88px_80px] items-center gap-1 rounded bg-white/10 px-1 py-1.5 text-xs"
                  onMouseOver={
                    touchPrimary
                      ? undefined
                      : (event) => openDetailPopup(line, event.currentTarget)
                  }
                  onMouseOut={touchPrimary ? undefined : closeDetailPopup}
                  onClick={(event) => handleRowClick(line, event)}
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{line.name}</div>
                    <div
                      data-testid="pos-cart-product-code"
                      className="font-mono text-[10px] text-white/75"
                    >
                      {line.code}
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onRemoveLine(line.productId)
                      }}
                      className="mt-0.5 cursor-pointer text-[10px] text-white/80 underline-offset-2 hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <button
                      type="button"
                      aria-label={`Decrease qty for ${line.name}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        onDecrementQty(line.productId)
                      }}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-white/50 bg-white/15 text-sm font-bold hover:bg-white/25"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-mono tabular-nums">
                      {line.qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Increase qty for ${line.name}`}
                      onClick={(event) => {
                        event.stopPropagation()
                        onIncrementQty(line.productId)
                      }}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-white/50 bg-white/15 text-sm font-bold hover:bg-white/25"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right font-mono tabular-nums">
                    {formatMoney(lineAmount(line))}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/30 bg-orange-700 p-3">
        <div className="flex flex-col gap-2 text-sm font-bold">
          {lines.length > 0 ? (
            <button
              type="button"
              onClick={onClearCart}
              className="cursor-pointer self-start text-xs font-semibold text-white/90 underline-offset-2 hover:underline"
            >
              Clear cart
            </button>
          ) : null}
          <div className="flex justify-between text-lg">
            <span>TOTAL</span>
            <span className="tabular-nums">{formatMoney(total)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

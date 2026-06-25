"use client"

import { PosCartProductDetailPopup } from "@/components/pos/PosCartProductDetailPopup"
import { PosReceiptLookupPanel, type PosReceiptLookupPanelHandle } from "@/components/pos/PosReceiptLookupPanel"
import type { PosCartLine } from "@/lib/pos/cart"
import { cartTotal, lineAmount } from "@/lib/pos/cart"
import {
  formatReceiptDisplay,
  formatStaffDisplay,
} from "@/lib/pos-ui/pos-session-display"
import type { PosTerminalSession } from "@/lib/pos-ui/types"
import { POS_CART_PANEL_FRAME_CLASS } from "@/lib/pos-ui/pos-panel-frame"
import { useState, type ReactNode, type RefObject } from "react"

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
  receiptLookupOpen?: boolean
  onReceiptLookupClose?: () => void
  receiptLookupRunningNo?: string
  onReceiptLookupRunningNoChange?: (value: string) => void
  receiptLookupFocusRequestId?: number
  receiptLookupPanelRef?: RefObject<PosReceiptLookupPanelHandle | null>
}

function formatMoney(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatUnitPriceCompact(unitPrice: string): string {
  const n = Number(unitPrice)
  if (!Number.isFinite(n)) return unitPrice
  return Number.isInteger(n) ? String(n) : n.toFixed(2)
}

export function PosReceiptPanel({
  session,
  receiptNo,
  lines,
  lookupError,
  onIncrementQty,
  onDecrementQty,
  onRemoveLine: _onRemoveLine,
  onClearCart,
  overlay,
  receiptLookupOpen = false,
  onReceiptLookupClose,
  receiptLookupRunningNo = "",
  onReceiptLookupRunningNoChange,
  receiptLookupFocusRequestId = 0,
  receiptLookupPanelRef,
}: PosReceiptPanelProps) {
  const [previewLine, setPreviewLine] = useState<PosCartLine | null>(null)
  const total = cartTotal(lines)

  return (
    <div className="box-border flex h-full w-[380px] shrink-0 flex-col">
      <div className={`flex min-h-0 flex-1 flex-col ${POS_CART_PANEL_FRAME_CLASS}`}>
        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-orange-600 text-white">
          {previewLine ? (
            <PosCartProductDetailPopup
              line={previewLine}
              variant="modal"
              onClose={() => setPreviewLine(null)}
            />
          ) : null}

          {overlay}

          {receiptLookupOpen ? (
            <PosReceiptLookupPanel
              ref={receiptLookupPanelRef}
              session={session}
              runningNo={receiptLookupRunningNo}
              onRunningNoChange={(value) => onReceiptLookupRunningNoChange?.(value)}
              focusRequestId={receiptLookupFocusRequestId}
              onBack={() => onReceiptLookupClose?.()}
            />
          ) : (
            <>
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
                    >
                      <div className="min-w-0">
                        <div className="truncate font-medium">{line.name}</div>
                        <div
                          className="flex items-baseline gap-2 font-mono text-[10px] text-white/90"
                          data-testid="pos-cart-row-meta"
                        >
                          <button
                            type="button"
                            data-testid="pos-cart-product-code-preview-trigger"
                            className="cursor-pointer underline decoration-white/40 underline-offset-2 hover:text-white hover:decoration-white"
                            onClick={() => setPreviewLine(line)}
                            aria-label={`Preview image for ${line.code}`}
                          >
                            {line.code}
                          </button>
                          <span data-testid="pos-cart-row-qty-price">
                            {line.qty}x{formatUnitPriceCompact(line.unitPrice)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          aria-label={`Decrease qty for ${line.name}`}
                          onClick={() => onDecrementQty(line.productId)}
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
                          onClick={() => onIncrementQty(line.productId)}
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}

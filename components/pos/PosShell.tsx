"use client"

import { PosBarcodeCapture } from "./PosBarcodeCapture"
import { PosKeypadGrid } from "./PosKeypadGrid"
import { PosCheckoutOverlay } from "./PosCheckoutOverlay"
import { PosRefundOverlay } from "./PosRefundOverlay"
import { PosPlaceholderOverlay } from "./PosPlaceholderOverlay"
import { PosTargetVsSalesOverlay } from "./PosTargetVsSalesOverlay"
import { PosWorktimeOverlay } from "./PosWorktimeOverlay"
import { PosReceiptPanel } from "./PosReceiptPanel"
import { PosSessionBanner } from "./PosSessionBanner"
import type { PosCartLine } from "@/lib/pos/cart"
import type { RefundPreviewResult } from "@/lib/pos/refund"
import type { RefundableReceiptSummary } from "@/lib/pos/search-refundable-receipts"
import type { PosKeypadActionId, PosPlaceholderId, PosTerminalSession } from "@/lib/pos-ui/types"

type PosShellProps = {
  session: PosTerminalSession
  barcode: string
  onBarcodeChange: (value: string) => void
  onBarcodeSubmit: (value: string) => void
  onKeypadAction: (id: PosKeypadActionId) => void
  cartLines: readonly PosCartLine[]
  cartLookupError: string | null
  onIncrementQty: (productId: string) => void
  onDecrementQty: (productId: string) => void
  onRemoveCartLine: (productId: string) => void
  onClearCart: () => void
  receiptNo: string | null
  checkoutOpen: boolean
  checkoutPending: boolean
  checkoutError: string | null
  checkoutSuccess: { saleId: string; receiptNo: string; total: string } | null
  onCheckoutClose: () => void
  onCheckoutConfirm: () => void
  onCheckoutPrintReceiptAndNewSale: (saleId: string) => void
  onCheckoutNewSaleWithoutPrint: () => void
  refundOpen: boolean
  refundReceiptNo: string
  refundReceipts: RefundableReceiptSummary[]
  refundReceiptsLoading: boolean
  onRefundReceiptSelect: (receiptNo: string) => void
  refundAmount: string
  onRefundAmountChange: (value: string) => void
  refundReasonCode: string
  onRefundReasonCodeChange: (value: string) => void
  refundPreview: RefundPreviewResult | null
  refundLookupPending: boolean
  refundPending: boolean
  refundError: string | null
  onRefundClose: () => void
  onRefundConfirm: () => void
  barcodeFocusRequest?: number
  placeholderOverlay: PosPlaceholderId | null
  onClosePlaceholder: () => void
  targetVsSalesOpen: boolean
  onCloseTargetVsSales: () => void
  worktimeOpen: boolean
  onCloseWorktime: () => void
  keypadDisabled?: boolean
}

export function PosShell({
  session,
  barcode,
  onBarcodeChange,
  onBarcodeSubmit,
  onKeypadAction,
  cartLines,
  cartLookupError,
  onIncrementQty,
  onDecrementQty,
  onRemoveCartLine,
  onClearCart,
  receiptNo,
  checkoutOpen,
  checkoutPending,
  checkoutError,
  checkoutSuccess,
  onCheckoutClose,
  onCheckoutConfirm,
  onCheckoutPrintReceiptAndNewSale,
  onCheckoutNewSaleWithoutPrint,
  refundOpen,
  refundReceiptNo,
  refundReceipts,
  refundReceiptsLoading,
  onRefundReceiptSelect,
  refundAmount,
  onRefundAmountChange,
  refundReasonCode,
  onRefundReasonCodeChange,
  refundPreview,
  refundLookupPending,
  refundPending,
  refundError,
  onRefundClose,
  onRefundConfirm,
  barcodeFocusRequest = 0,
  placeholderOverlay,
  onClosePlaceholder,
  targetVsSalesOpen,
  onCloseTargetVsSales,
  worktimeOpen,
  onCloseWorktime,
  keypadDisabled = false,
}: PosShellProps) {
  const muted =
    keypadDisabled ||
    !!placeholderOverlay ||
    targetVsSalesOpen ||
    worktimeOpen ||
    checkoutOpen ||
    refundOpen

  return (
    <div className="fixed inset-0 flex bg-white">
      {worktimeOpen ? (
        <PosWorktimeOverlay
          onClose={onCloseWorktime}
          branchCode={session.branchCode}
          branchName={session.branchName}
        />
      ) : null}
      {targetVsSalesOpen ? (
        <PosTargetVsSalesOverlay
          onClose={onCloseTargetVsSales}
          branchCode={session.branchCode}
          branchName={session.branchName}
        />
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="mx-auto flex h-full w-full min-h-0 max-w-[1200px] flex-col gap-3">
          <PosSessionBanner session={session} />

          <div className="flex shrink-0 flex-col gap-2 rounded-xl border border-zinc-500 bg-gradient-to-b from-zinc-100 to-zinc-300 p-3 shadow-sm">
            <div className="flex items-center justify-center py-1">
              <span className="text-center text-[28px] font-semibold leading-none tracking-wide text-zinc-900 sm:text-[36px]">
                ASA • POS TERMINAL
              </span>
            </div>
            <PosBarcodeCapture
              value={barcode}
              onChange={onBarcodeChange}
              onSubmit={onBarcodeSubmit}
              disabled={muted}
              focusRequestId={barcodeFocusRequest}
            />
          </div>

          <div className="min-h-0 flex-1 rounded-xl border border-zinc-500 bg-gradient-to-b from-slate-200 to-slate-300 p-3 shadow-inner">
            <PosKeypadGrid onAction={onKeypadAction} disabled={muted} />
          </div>
        </div>
      </div>

      <PosReceiptPanel
        session={session}
        receiptNo={receiptNo}
        lines={cartLines}
        lookupError={cartLookupError}
        onIncrementQty={onIncrementQty}
        onDecrementQty={onDecrementQty}
        onRemoveLine={onRemoveCartLine}
        onClearCart={onClearCart}
        overlay={
          checkoutOpen ? (
            <PosCheckoutOverlay
              lines={cartLines}
              pending={checkoutPending}
              error={checkoutError}
              success={checkoutSuccess}
              onConfirmCash={onCheckoutConfirm}
              onPrintReceiptAndNewSale={onCheckoutPrintReceiptAndNewSale}
              onNewSaleWithoutPrint={onCheckoutNewSaleWithoutPrint}
              onClose={onCheckoutClose}
            />
          ) : refundOpen ? (
            <PosRefundOverlay
              receiptNo={refundReceiptNo}
              receipts={refundReceipts}
              receiptsLoading={refundReceiptsLoading}
              onReceiptSelect={onRefundReceiptSelect}
              amount={refundAmount}
              onAmountChange={onRefundAmountChange}
              reasonCode={refundReasonCode}
              onReasonCodeChange={onRefundReasonCodeChange}
              preview={refundPreview}
              lookupPending={refundLookupPending}
              pending={refundPending}
              error={refundError}
              onConfirm={onRefundConfirm}
              onClose={onRefundClose}
            />
          ) : placeholderOverlay ? (
            <PosPlaceholderOverlay
              placeholderId={placeholderOverlay}
              onClose={onClosePlaceholder}
            />
          ) : null
        }
      />
    </div>
  )
}

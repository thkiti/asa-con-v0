"use client"

import type { PosCheckoutPaymentMethod } from "@/lib/pos-ui/pos-payment-methods"
import { PosBarcodeCapture } from "./PosBarcodeCapture"
import { PosKeypadGrid } from "./PosKeypadGrid"
import { PosCheckoutOverlay } from "./PosCheckoutOverlay"
import { PosRefundOverlay } from "./PosRefundOverlay"
import { PosCollectorOverlay } from "./PosCollectorOverlay"
import { PosPlaceholderOverlay } from "./PosPlaceholderOverlay"
import { PosReadReportCredentialGate } from "./PosReadReportCredentialGate"
import { PosReadReportPanel } from "./PosReadReportPanel"
import { PosRepairTicketOverlay } from "./PosRepairTicketOverlay"
import { PosTargetVsSalesOverlay } from "./PosTargetVsSalesOverlay"
import { PosWorktimeOverlay } from "./PosWorktimeOverlay"
import { PosReceiptPanel } from "./PosReceiptPanel"
import { PosEvidencePendingBanner } from "./PosEvidencePendingBanner"
import { PosEvidencePendingOverlay } from "./PosEvidencePendingOverlay"
import { PosSessionBanner } from "./PosSessionBanner"
import {
  isPrintReportHighlighted,
  shouldGhostPrintReportButton,
} from "@/lib/pos-ui/pos-actions"
import { printReadZReportAndExit } from "@/lib/pos-ui/print-read-report"
import { THERMAL_CLONE_PRINT_STYLES } from "@/lib/thermal/print-css"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { PosCartLine } from "@/lib/pos/cart"
import type { RefundPreviewResult } from "@/lib/pos/refund"
import type { RefundableReceiptSummary } from "@/lib/pos/search-refundable-receipts"
import { POS_KEYPAD_BUTTONS } from "@/lib/pos-ui/keypad-layout"
import type { PendingPaymentEvidenceRow } from "@/lib/pos/pending-payment-evidence-types"
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
  checkoutSuccess: {
    saleId: string
    receiptNo: string
    total: string
    paymentMethod: PosCheckoutPaymentMethod
  } | null
  onCheckoutClose: () => void
  onCheckoutConfirm: (paymentMethod: PosCheckoutPaymentMethod) => void
  onBankTransferCapture: (blob: Blob) => void
  onBankTransferUploadLater: () => void
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
  collectorOpen: boolean
  onCloseCollector: () => void
  onCollectorReport: (report: ReadReportPayload) => void
  readStaffGate: "X" | "Z" | null
  onCloseReadStaffGate: () => void
  onReadReport: (report: ReadReportPayload) => void
  readReport: ReadReportPayload | null
  onCloseReadReport: () => void
  repairTicketOpen: boolean
  onCloseRepairTicket: () => void
  thermalLayouts: Record<
    "RECEIPT" | "REFUND" | "COLLECTOR" | "REPAIR_TICKET" | "READ_Z",
    ResolvedThermalLayout
  >
  keypadDisabled?: boolean
  pendingEvidenceCount?: number
  onOpenPendingEvidence?: () => void
  evidencePendingOpen?: boolean
  pendingEvidenceReceipts?: PendingPaymentEvidenceRow[]
  pendingEvidenceLoading?: boolean
  pendingEvidenceError?: string | null
  onClosePendingEvidence?: () => void
  onPendingEvidenceUploadSuccess?: () => void
  onPendingEvidenceQrModalOpenChange?: (open: boolean) => void
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
  onBankTransferCapture,
  onBankTransferUploadLater,
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
  collectorOpen,
  onCloseCollector,
  onCollectorReport,
  readStaffGate,
  onCloseReadStaffGate,
  onReadReport,
  readReport,
  onCloseReadReport,
  repairTicketOpen,
  onCloseRepairTicket,
  thermalLayouts,
  keypadDisabled = false,
  pendingEvidenceCount = 0,
  onOpenPendingEvidence,
  evidencePendingOpen = false,
  pendingEvidenceReceipts = [],
  pendingEvidenceLoading = false,
  pendingEvidenceError = null,
  onClosePendingEvidence,
  onPendingEvidenceUploadSuccess,
  onPendingEvidenceQrModalOpenChange,
}: PosShellProps) {
  const keypadSideMuted =
    collectorOpen || readStaffGate !== null || repairTicketOpen
  const readReportMode = readReport?.mode ?? null
  const muted =
    keypadDisabled ||
    !!placeholderOverlay ||
    targetVsSalesOpen ||
    worktimeOpen ||
    evidencePendingOpen ||
    checkoutOpen ||
    refundOpen ||
    keypadSideMuted ||
    !!readReport

  const ghostPrint = shouldGhostPrintReportButton({
    sideMuted: keypadSideMuted,
    readReportMode,
  })

  const ghostButtonIds = new Set<PosKeypadActionId>()
  if (ghostPrint) ghostButtonIds.add("print-report")
  if (readReport) {
    for (const btn of POS_KEYPAD_BUTTONS) {
      if (btn.id !== "print-report" || ghostPrint) {
        ghostButtonIds.add(btn.id)
      }
    }
  }

  return (
    <div className="pos-terminal-root fixed inset-0 flex bg-white">
      <style
        dangerouslySetInnerHTML={{
          __html: THERMAL_CLONE_PRINT_STYLES,
        }}
      />
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
      {evidencePendingOpen ? (
        <PosEvidencePendingOverlay
          receipts={pendingEvidenceReceipts}
          loading={pendingEvidenceLoading}
          error={pendingEvidenceError}
          branchCode={session.branchCode}
          branchName={session.branchName}
          onClose={() => onClosePendingEvidence?.()}
          onUploadSuccess={() => onPendingEvidenceUploadSuccess?.()}
          onQrModalOpenChange={onPendingEvidenceQrModalOpenChange}
        />
      ) : null}
      <div className="flex min-h-0 flex-1 flex-col p-4">
        <div className="mx-auto flex h-full w-full min-h-0 max-w-[1200px] flex-col gap-3">
          <PosSessionBanner session={session} />

          <PosEvidencePendingBanner
            count={pendingEvidenceCount}
            onOpen={() => onOpenPendingEvidence?.()}
          />

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
            <PosKeypadGrid
              onAction={onKeypadAction}
              disabled={muted && !readReport}
              printReportHighlighted={isPrintReportHighlighted(readReportMode)}
              printReportLabel={
                readReportMode === "Z" ? "PRINT REPORT\nAND EXIT" : undefined
              }
              ghostButtonIds={ghostButtonIds.size > 0 ? ghostButtonIds : undefined}
            />
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
              onConfirm={onCheckoutConfirm}
              onBankTransferCapture={onBankTransferCapture}
              onBankTransferUploadLater={onBankTransferUploadLater}
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
          ) : readReport ? (
            <PosReadReportPanel
              report={readReport}
              onClose={onCloseReadReport}
              collectorLayout={thermalLayouts.COLLECTOR}
              readZLayout={thermalLayouts.READ_Z}
            />
          ) : repairTicketOpen ? (
            <PosRepairTicketOverlay
              session={session}
              onClose={onCloseRepairTicket}
              repairLayout={thermalLayouts.REPAIR_TICKET}
            />
          ) : placeholderOverlay ? (
            <PosPlaceholderOverlay
              placeholderId={placeholderOverlay}
              onClose={onClosePlaceholder}
            />
          ) : null
        }
      />

      {collectorOpen ? (
        <PosCollectorOverlay
          onClose={onCloseCollector}
          onReport={(report) => {
            onCollectorReport(report)
          }}
        />
      ) : null}

      {readStaffGate ? (
        <PosReadReportCredentialGate
          mode={readStaffGate}
          onClose={onCloseReadStaffGate}
          onReport={(report) => {
            onReadReport(report)
          }}
        />
      ) : null}
    </div>
  )
}

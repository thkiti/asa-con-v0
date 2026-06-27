"use client"

import { useState, type RefObject } from "react"
import type {
  PosCheckoutPrintReceiptInput,
} from "@/components/pos/PosCheckoutOverlay"
import { PosBarcodeCapture } from "./PosBarcodeCapture"
import { PosKeypadGrid } from "./PosKeypadGrid"
import { PosCheckoutOverlay } from "./PosCheckoutOverlay"
import { PosRefundOverlay } from "./PosRefundOverlay"
import { PosRefundTicketPanel } from "./PosRefundTicketPanel"
import { PosReceiptLookupPanel } from "./PosReceiptLookupPanel"
import { PosCollectorOverlay } from "./PosCollectorOverlay"
import { PosPlaceholderOverlay } from "./PosPlaceholderOverlay"
import { PosReadReportCredentialGate } from "./PosReadReportCredentialGate"
import { PosCollectorReportPanel } from "./PosCollectorReportPanel"
import { PosReadReportPanel } from "./PosReadReportPanel"
import { ReadZTodayWorkspace } from "./ReadZTodayWorkspace"
import { ReadZLookupWorkspace } from "./ReadZLookupWorkspace"
import { PosReadZHoAuthGate } from "./PosReadZHoAuthGate"
import { PosRepairTicketOverlay } from "./PosRepairTicketOverlay"
import { PosStaffEvidenceOverlay } from "./PosStaffEvidenceOverlay"
import { PosTargetVsSalesOverlay } from "./PosTargetVsSalesOverlay"
import { PosWorktimeOverlay } from "./PosWorktimeOverlay"
import { PosReceiptPanel } from "./PosReceiptPanel"
import type { PosReceiptLookupPanelHandle } from "./PosReceiptLookupPanel"
import { PosKeypadMessageBlock } from "./PosKeypadMessageBlock"
import { PosEvidencePendingOverlay } from "./PosEvidencePendingOverlay"
import { PosSessionBanner } from "./PosSessionBanner"
import {
  shouldGhostPrintReportButton,
} from "@/lib/pos-ui/pos-actions"
import {
  buildPosWorkspaceKeypadGhostButtonIds,
  resolvePosActiveWorkspace,
  shouldBlankNumericKeypadForWorkspace,
} from "@/lib/pos-ui/pos-workspace-keypad"
import { THERMAL_CLONE_PRINT_STYLES } from "@/lib/thermal/print-css"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import type { PosCollectCommitContext, ReadZHoReviewAuth } from "@/lib/pos-ui/read-report-client"
import type { PosCartLine } from "@/lib/pos/cart"
import type { RefundReceiptPrintContext } from "@/lib/pos/refund-receipt-print-context"
import type { RefundPreviewResult } from "@/lib/pos/refund"
import type { RefundableReceiptSummary } from "@/lib/pos/search-refundable-receipts"
import { POS_PANEL_FRAME_CLASS, POS_WORKSPACE_GAP_CLASS } from "@/lib/pos-ui/pos-panel-frame"
import type { PendingPaymentEvidenceRow } from "@/lib/pos/pending-payment-evidence-types"
import type { PosKeypadActionId, PosPlaceholderId, PosTerminalSession } from "@/lib/pos-ui/types"

type PosShellProps = {
  session: PosTerminalSession
  barcode: string
  onBarcodeChange: (value: string) => void
  onBarcodeSubmit: (value: string) => void
  onKeypadAction: (id: PosKeypadActionId) => void
  onReceiptLookup?: () => void
  receiptLookupOpen?: boolean
  onReceiptLookupClose?: () => void
  receiptLookupRunningNo?: string
  onReceiptLookupRunningNoChange?: (value: string) => void
  receiptLookupFocusRequestId?: number
  receiptLookupPanelRef?: RefObject<PosReceiptLookupPanelHandle | null>
  onReceiptLookupKeypadRunningInputEnabledChange?: (enabled: boolean) => void
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
  onCheckoutClose: () => void
  onCheckoutPrintReceipt: (input: PosCheckoutPrintReceiptInput) => void
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
  refundSlipContext: RefundReceiptPrintContext | null
  refundTicketPending: boolean
  refundTicketError: string | null
  onRefundClose: () => void
  onRefundConfirm: () => void
  onRefundTicketClose: () => void
  onRefundPrint: () => void
  barcodeFocusRequest?: number
  placeholderOverlay: PosPlaceholderId | null
  onClosePlaceholder: () => void
  targetVsSalesOpen: boolean
  onCloseTargetVsSales: () => void
  worktimeOpen: boolean
  onCloseWorktime: () => void
  worktimeReadZLogoutPending?: boolean
  onWorktimeReadZLogoutComplete?: () => void
  collectorOpen: boolean
  onCloseCollector: () => void
  onCollectorReport: (report: ReadReportPayload, commit: PosCollectCommitContext) => void
  readStaffGate: "X" | "Z" | null
  onCloseReadStaffGate: () => void
  onReadReport: (report: ReadReportPayload) => void
  readReport: ReadReportPayload | null
  onCloseReadReport: () => void
  onPrintReadZReport?: () => void
  onPrintReadZLookupReport?: () => void
  readZLookupOpen?: boolean
  readZLookupReport?: ReadReportPayload | null
  onCloseReadZLookup?: () => void
  onOpenReadZLookup?: () => void
  readZLookupSelectedDate?: string
  readZLookupMode?: "daily" | "cumulative"
  onReadZLookupDateSelect?: (ymd: string) => void
  onReadZLookupCumulative?: () => void
  readZHoAuthGateOpen?: boolean
  onCloseReadZHoAuthGate?: () => void
  onReadZHoAuthorized?: (auth: ReadZHoReviewAuth) => void
  readZReviewLoading?: boolean
  readZReviewError?: string | null
  readZPrintAllowed?: boolean
  readZLookupPrintAllowed?: boolean
  collectorReportPending?: boolean
  collectorReportError?: string | null
  onCollectorPrintReport?: () => void
  repairTicketOpen: boolean
  onCloseRepairTicket: () => void
  staffEvidenceOpen: boolean
  onCloseStaffEvidence: () => void
  staffEvidenceComplete: boolean
  onStaffEvidenceComplete: () => void
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
  onReceiptLookup,
  receiptLookupOpen = false,
  onReceiptLookupClose,
  receiptLookupRunningNo = "",
  onReceiptLookupRunningNoChange,
  receiptLookupFocusRequestId = 0,
  receiptLookupPanelRef,
  onReceiptLookupKeypadRunningInputEnabledChange,
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
  onCheckoutClose,
  onCheckoutPrintReceipt,
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
  refundSlipContext,
  refundTicketPending,
  refundTicketError,
  onRefundClose,
  onRefundConfirm,
  onRefundTicketClose,
  onRefundPrint,
  barcodeFocusRequest = 0,
  placeholderOverlay,
  onClosePlaceholder,
  targetVsSalesOpen,
  onCloseTargetVsSales,
  worktimeOpen,
  onCloseWorktime,
  worktimeReadZLogoutPending = false,
  onWorktimeReadZLogoutComplete,
  collectorOpen,
  onCloseCollector,
  onCollectorReport,
  readStaffGate,
  onCloseReadStaffGate,
  onReadReport,
  readReport,
  onCloseReadReport,
  onPrintReadZReport,
  onPrintReadZLookupReport,
  readZLookupOpen = false,
  readZLookupReport = null,
  onCloseReadZLookup,
  onOpenReadZLookup,
  readZHoAuthGateOpen = false,
  onCloseReadZHoAuthGate,
  onReadZHoAuthorized,
  readZLookupSelectedDate = "",
  readZLookupMode = "daily",
  onReadZLookupDateSelect,
  onReadZLookupCumulative,
  readZReviewLoading = false,
  readZReviewError = null,
  readZPrintAllowed = true,
  readZLookupPrintAllowed = false,
  collectorReportPending = false,
  collectorReportError = null,
  onCollectorPrintReport,
  repairTicketOpen,
  onCloseRepairTicket,
  staffEvidenceOpen,
  onCloseStaffEvidence,
  staffEvidenceComplete,
  onStaffEvidenceComplete,
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
  const [repairPhotoPreviewHost, setRepairPhotoPreviewHost] = useState<HTMLElement | null>(null)
  const keypadSideMuted =
    collectorOpen ||
    readStaffGate !== null ||
    repairTicketOpen ||
    staffEvidenceOpen ||
    readZLookupOpen
  const readReportMode = readReport?.mode ?? null
  const muted =
    keypadDisabled ||
    !!placeholderOverlay ||
    targetVsSalesOpen ||
    worktimeOpen ||
    evidencePendingOpen ||
    checkoutOpen ||
    refundOpen ||
    receiptLookupOpen ||
    keypadSideMuted ||
    !!readReport ||
    readZLookupOpen

  const activeWorkspace = resolvePosActiveWorkspace({
    receiptLookupOpen,
    refundOpen,
    refundSlipOpen: !!refundSlipContext,
    readStaffGate,
    readReportMode,
    readZLookupOpen,
    collectorOpen,
    repairTicketOpen,
  })

  const ghostPrint = shouldGhostPrintReportButton({
    sideMuted: keypadSideMuted,
    readReportMode,
  })

  const ghostButtonIds = new Set(
    buildPosWorkspaceKeypadGhostButtonIds(activeWorkspace, { readReportMode })
  )
  if (ghostPrint && !ghostButtonIds.has("print-report")) {
    ghostButtonIds.add("print-report")
  }
  if (staffEvidenceComplete) {
    ghostButtonIds.add("staff-evidence")
  }
  const permanentlyDisabledButtonIds = new Set<PosKeypadActionId>()
  const blankNumericKeypad = shouldBlankNumericKeypadForWorkspace(activeWorkspace)

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
          readZLogoutPending={worktimeReadZLogoutPending}
          onReadZLogoutComplete={onWorktimeReadZLogoutComplete}
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
      <div className={`flex min-h-0 flex-1 ${POS_WORKSPACE_GAP_CLASS} px-4 py-4`}>
        <div className="mx-auto flex h-full w-full min-h-0 max-w-[1200px] flex-1 flex-col gap-3">
          <PosSessionBanner session={session} onOpenReadZLookup={onOpenReadZLookup} />

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
              focusRequestId={receiptLookupOpen ? 0 : barcodeFocusRequest}
            />
          </div>

          <div className={`relative min-h-0 flex-1 ${POS_PANEL_FRAME_CLASS} bg-gradient-to-b from-slate-200 to-slate-300`}>
            {repairTicketOpen ? (
              <div
                ref={setRepairPhotoPreviewHost}
                data-testid="repair-ticket-photo-preview-host"
                className="pointer-events-none absolute inset-0 z-20 min-h-0 p-2"
              />
            ) : null}
            <PosKeypadGrid
              onAction={onKeypadAction}
              onReceiptLookup={onReceiptLookup}
              disabled={keypadDisabled || (muted && !activeWorkspace)}
              staffEvidenceComplete={staffEvidenceComplete}
              readReportMode={readReportMode}
              printReportHighlighted={false}
              ghostButtonIds={ghostButtonIds.size > 0 ? ghostButtonIds : undefined}
              permanentlyDisabledButtonIds={
                permanentlyDisabledButtonIds.size > 0
                  ? permanentlyDisabledButtonIds
                  : undefined
              }
              blankNumericKeypad={blankNumericKeypad}
              messageSlot={
                <div className={receiptLookupOpen ? "pointer-events-none" : undefined}>
                  <PosKeypadMessageBlock
                    pendingEvidenceCount={pendingEvidenceCount}
                    onOpenPendingEvidence={() => onOpenPendingEvidence?.()}
                    cartLookupError={cartLookupError}
                  />
                </div>
              }
            />
          </div>
        </div>

      <PosReceiptPanel
        session={session}
        receiptNo={receiptNo}
        lines={cartLines}
        lookupError={null}
        onIncrementQty={onIncrementQty}
        onDecrementQty={onDecrementQty}
        onRemoveLine={onRemoveCartLine}
        onClearCart={onClearCart}
        overlay={
          receiptLookupOpen ? (
            <PosReceiptLookupPanel
              ref={receiptLookupPanelRef}
              session={session}
              receiptThermalLayout={thermalLayouts.RECEIPT}
              refundThermalLayout={thermalLayouts.REFUND}
              collectorThermalLayout={thermalLayouts.COLLECTOR}
              readZThermalLayout={thermalLayouts.READ_Z}
              runningNo={receiptLookupRunningNo}
              onRunningNoChange={(value) => onReceiptLookupRunningNoChange?.(value)}
              focusRequestId={receiptLookupFocusRequestId}
              onKeypadRunningInputEnabledChange={
                onReceiptLookupKeypadRunningInputEnabledChange
              }
              onClose={() => onReceiptLookupClose?.()}
            />
          ) : checkoutOpen ? (
            <PosCheckoutOverlay
              lines={cartLines}
              pending={checkoutPending}
              error={checkoutError}
              onPrintReceipt={onCheckoutPrintReceipt}
              onClose={onCheckoutClose}
            />
          ) : refundSlipContext ? (
            <PosRefundTicketPanel
              receipt={refundSlipContext}
              pending={refundTicketPending}
              error={refundTicketError}
              onPrintRefund={onRefundPrint}
              onClose={onRefundTicketClose}
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
          ) : readReport?.mode === "COLLECT" ? (
            <PosCollectorReportPanel
              report={readReport}
              collectorLayout={thermalLayouts.COLLECTOR}
              pending={collectorReportPending}
              error={collectorReportError}
              onPrintReport={() => onCollectorPrintReport?.()}
              onClose={onCloseReadReport}
            />
          ) : readReport?.mode === "Z" ? (
            <ReadZTodayWorkspace
              report={readReport}
              readZLayout={thermalLayouts.READ_Z}
              onClose={onCloseReadReport}
              onPrintReport={() => onPrintReadZReport?.()}
              printError={readZReviewError}
              printAllowed={readZPrintAllowed}
            />
          ) : readZLookupOpen ? (
            <>
              <ReadZLookupWorkspace
                selectedDate={readZLookupSelectedDate}
                lookupMode={readZLookupMode}
                report={readZLookupReport}
                readZLayout={thermalLayouts.READ_Z}
                onClose={() => onCloseReadZLookup?.()}
                reviewLoading={readZReviewLoading}
                printError={readZReviewError}
                onDateSelect={(ymd) => onReadZLookupDateSelect?.(ymd)}
                onCumulativePress={() => onReadZLookupCumulative?.()}
                onPrintReport={() => onPrintReadZLookupReport?.()}
                printAllowed={readZLookupPrintAllowed}
              />
              {readZHoAuthGateOpen ? (
                <PosReadZHoAuthGate
                  onClose={() => onCloseReadZHoAuthGate?.()}
                  onAuthorized={(auth) => onReadZHoAuthorized?.(auth)}
                />
              ) : null}
            </>
          ) : readReport ? (
            <PosReadReportPanel
              report={readReport}
              onClose={onCloseReadReport}
              readZLayout={thermalLayouts.READ_Z}
            />
          ) : repairTicketOpen ? (
            <PosRepairTicketOverlay
              session={session}
              onClose={onCloseRepairTicket}
              repairLayout={thermalLayouts.REPAIR_TICKET}
              photoPreviewHost={repairPhotoPreviewHost}
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

      {collectorOpen ? (
        <PosCollectorOverlay
          branchId={session.branchId}
          onClose={onCloseCollector}
          onReport={(report, commit) => {
            onCollectorReport(report, commit)
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

      {staffEvidenceOpen ? (
        <PosStaffEvidenceOverlay
          session={session}
          onClose={onCloseStaffEvidence}
          onEvidenceComplete={onStaffEvidenceComplete}
        />
      ) : null}
    </div>
  )
}

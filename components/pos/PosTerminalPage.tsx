"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useRef, useState } from "react"
import { PosShell } from "./PosShell"
import type { PosReceiptLookupPanelHandle } from "./PosReceiptLookupPanel"
import {
  addProductToCart,
  clearCart,
  decrementLineQty,
  incrementLineQty,
  removeCartLine,
  type PosCartLine,
} from "@/lib/pos/cart"
import { fetchPosCheckout } from "@/lib/pos-ui/pos-checkout-client"
import { uploadPaymentEvidenceSlipInBackground } from "@/lib/pos-ui/payment-evidence-upload-client"
import { fetchPendingPaymentEvidence } from "@/lib/pos-ui/payment-evidence-pending-client"
import type { PendingPaymentEvidenceRow } from "@/lib/pos/pending-payment-evidence-types"
import type { PosCheckoutPrintReceiptInput } from "@/components/pos/PosCheckoutOverlay"
import {
  getPosActionKind,
  isPosPlaceholderId,
  keypadDigitChar,
} from "@/lib/pos-ui/pos-actions"
import {
  printPosReadReport,
  printReadZReportAndExit,
} from "@/lib/pos-ui/print-read-report"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"
import {
  stockCountEditorHref,
} from "@/lib/pos-ui/pos-navigation"
import { openOrderDraft, openStockCountDraft } from "@/lib/pos-ui/stock-count-client"
import {
  navigatePosReceiptPrintTab,
  openPosReceiptPrintTab,
} from "@/lib/pos-ui/pos-receipt-print"
import { openPosRefundReceiptPrint } from "@/lib/pos-ui/pos-refund-receipt-print"
import { fetchPosReceiptNoPreview } from "@/lib/pos-ui/pos-receipt-preview-client"
import {
  fetchPosRefund,
  fetchPosRefundPreviewByReceiptNo,
  fetchPosRefundableReceipts,
} from "@/lib/pos-ui/pos-refund-client"
import type { RefundableReceiptSummary } from "@/lib/pos/search-refundable-receipts"
import { fetchPosProductLookup } from "@/lib/pos-ui/pos-product-lookup"
import { resolvePosReceiptPanelNo } from "@/lib/pos-ui/pos-session-display"
import { fetchSessionUser } from "@/lib/pos-ui/session-client"
import { fetchStaffEvidenceStatus } from "@/lib/pos-ui/staff-evidence-client"
import type { PosKeypadActionId, PosPlaceholderId, PosTerminalSession } from "@/lib/pos-ui/types"
import type { RefundPreviewResult } from "@/lib/pos/refund"
import {
  defaultResolvedThermalLayouts,
  fetchPosThermalLayouts,
} from "@/lib/pos-ui/pos-thermal-layouts-client"
import {
  appendReceiptLookupRunningDigit,
  defaultRunningNoFromNextPreview,
} from "@/lib/pos-ui/build-receipt-lookup-no"
import { bangkokCalendarParts } from "@/lib/reporting/bangkok-calendar"
import type { ResolvedThermalLayout, ThermalDocumentType } from "@/lib/thermal/types"

const PENDING_EVIDENCE_POLL_MS = 60_000
const PENDING_EVIDENCE_OVERLAY_POLL_MS = 10_000
const PENDING_EVIDENCE_QR_POLL_MS = 5_000
const isJestRuntime = typeof process !== "undefined" && Boolean(process.env.JEST_WORKER_ID)

export function PosTerminalPage() {
  const router = useRouter()
  const [session, setSession] = useState<PosTerminalSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [barcode, setBarcode] = useState("")
  const [cartLines, setCartLines] = useState<PosCartLine[]>([])
  const [cartLookupError, setCartLookupError] = useState<string | null>(null)
  const [lookupPending, setLookupPending] = useState(false)
  const [placeholder, setPlaceholder] = useState<PosPlaceholderId | null>(null)
  const [readReport, setReadReport] = useState<ReadReportPayload | null>(null)
  const [readStaffGate, setReadStaffGate] = useState<null | "X" | "Z">(null)
  const [collectorOpen, setCollectorOpen] = useState(false)
  const [repairTicketOpen, setRepairTicketOpen] = useState(false)
  const [staffEvidenceOpen, setStaffEvidenceOpen] = useState(false)
  const [staffEvidenceComplete, setStaffEvidenceComplete] = useState(false)
  const [targetVsSalesOpen, setTargetVsSalesOpen] = useState(false)
  const [worktimeOpen, setWorktimeOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutPending, setCheckoutPending] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [lastReceiptNo, setLastReceiptNo] = useState<string | null>(null)
  const [previewReceiptNo, setPreviewReceiptNo] = useState<string | null>(null)
  const [logoutPending, setLogoutPending] = useState(false)
  const [barcodeFocusRequest, setBarcodeFocusRequest] = useState(0)
  const [refundOpen, setRefundOpen] = useState(false)
  const [receiptLookupOpen, setReceiptLookupOpen] = useState(false)
  const [receiptLookupRunningNo, setReceiptLookupRunningNo] = useState("")
  const [receiptLookupFocusRequest, setReceiptLookupFocusRequest] = useState(0)
  const receiptLookupPanelRef = useRef<PosReceiptLookupPanelHandle>(null)
  const [refundReceiptNo, setRefundReceiptNo] = useState("")
  const [refundReceipts, setRefundReceipts] = useState<RefundableReceiptSummary[]>([])
  const [refundReceiptsLoading, setRefundReceiptsLoading] = useState(false)
  const [refundAmount, setRefundAmount] = useState("")
  const [refundReasonCode, setRefundReasonCode] = useState("")
  const [refundPreview, setRefundPreview] = useState<RefundPreviewResult | null>(null)
  const [refundLookupPending, setRefundLookupPending] = useState(false)
  const [refundPending, setRefundPending] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)
  const [thermalLayouts, setThermalLayouts] = useState<
    Record<ThermalDocumentType, ResolvedThermalLayout>
  >(defaultResolvedThermalLayouts())
  const [pendingEvidenceCount, setPendingEvidenceCount] = useState(0)
  const [pendingEvidenceReceipts, setPendingEvidenceReceipts] = useState<
    PendingPaymentEvidenceRow[]
  >([])
  const [pendingEvidenceLoading, setPendingEvidenceLoading] = useState(false)
  const [pendingEvidenceError, setPendingEvidenceError] = useState<string | null>(
    null
  )
  const [evidencePendingOpen, setEvidencePendingOpen] = useState(false)
  const [evidenceQrModalOpen, setEvidenceQrModalOpen] = useState(false)
  const [stockCountPending, setStockCountPending] = useState(false)
  const [orderPending, setOrderPending] = useState(false)

  const openStockCount = useCallback(async () => {
    if (stockCountPending) return
    setStockCountPending(true)
    try {
      const doc = await openStockCountDraft()
      router.push(stockCountEditorHref(doc.id))
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to open stock count"
      window.alert(message)
    } finally {
      setStockCountPending(false)
    }
  }, [router, stockCountPending])

  const openOrder = useCallback(async () => {
    if (orderPending) return
    setOrderPending(true)
    try {
      const doc = await openOrderDraft()
      router.push(stockCountEditorHref(doc.id))
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to open order"
      window.alert(message)
    } finally {
      setOrderPending(false)
    }
  }, [router, orderPending])

  const refreshStaffEvidenceStatus = useCallback(async () => {
    try {
      const status = await fetchStaffEvidenceStatus()
      setStaffEvidenceComplete(status.evidenceComplete)
    } catch {
      setStaffEvidenceComplete(false)
    }
  }, [])

  const refreshPendingEvidence = useCallback(async () => {
    const result = await fetchPendingPaymentEvidence()
    if (!result.ok) {
      setPendingEvidenceError(result.error)
      return
    }
    setPendingEvidenceError(null)
    setPendingEvidenceCount(result.result.count)
    setPendingEvidenceReceipts(result.result.receipts)
  }, [])

  const openPendingEvidence = useCallback(async () => {
    setEvidencePendingOpen(true)
    setPendingEvidenceLoading(true)
    setPendingEvidenceError(null)
    await refreshPendingEvidence()
    setPendingEvidenceLoading(false)
  }, [refreshPendingEvidence])

  const refreshPreviewReceiptNo = useCallback(async () => {
    const result = await fetchPosReceiptNoPreview()
    if (result.ok) {
      setPreviewReceiptNo(result.receiptNo)
      return
    }
    setPreviewReceiptNo(null)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const result = await fetchSessionUser()
      if (cancelled) return
      if (!result.ok) {
        router.replace("/login")
        return
      }
      setSession(result.user)
      await refreshPreviewReceiptNo()
      try {
        const layoutResult = await fetchPosThermalLayouts()
        if (!cancelled) setThermalLayouts(layoutResult.resolved)
      } catch {
        if (!cancelled) setThermalLayouts(defaultResolvedThermalLayouts())
      }
      if (!cancelled) {
        try {
          const status = await fetchStaffEvidenceStatus()
          if (!cancelled) setStaffEvidenceComplete(status.evidenceComplete)
        } catch {
          if (!cancelled) setStaffEvidenceComplete(false)
        }
      }
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [router, refreshPreviewReceiptNo])

  useEffect(() => {
    if (!session) return
    void refreshPendingEvidence()
    void refreshStaffEvidenceStatus()
  }, [session, refreshPendingEvidence, refreshStaffEvidenceStatus])

  useEffect(() => {
    if (!session || isJestRuntime) return
    const pollMs = evidenceQrModalOpen
      ? PENDING_EVIDENCE_QR_POLL_MS
      : evidencePendingOpen
        ? PENDING_EVIDENCE_OVERLAY_POLL_MS
        : PENDING_EVIDENCE_POLL_MS
    const timer = setInterval(() => {
      void refreshPendingEvidence()
    }, pollMs)
    return () => clearInterval(timer)
  }, [
    session,
    refreshPendingEvidence,
    evidencePendingOpen,
    evidenceQrModalOpen,
  ])

  const onLogout = useCallback(async () => {
    setLogoutPending(true)
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" })
      const payload = (await response.json()) as { redirectTo?: string }
      router.push(payload.redirectTo ?? "/login")
      router.refresh()
    } catch {
      router.push("/login")
      router.refresh()
    } finally {
      setLogoutPending(false)
    }
  }, [router])

  const submitBarcode = useCallback(async (raw: string) => {
    const code = raw.trim()
    if (!code || lookupPending) return

    setLookupPending(true)
    setCartLookupError(null)
    try {
      const result = await fetchPosProductLookup(code)
      if (!result.ok) {
        setCartLookupError(result.error)
        return
      }
      setCartLines((prev) => addProductToCart(prev, result.product))
      setBarcode("")
    } finally {
      setLookupPending(false)
    }
  }, [lookupPending])

  const openCheckout = useCallback(() => {
    if (cartLines.length === 0) {
      setCartLookupError("Cart is empty")
      return
    }
    setCartLookupError(null)
    setCheckoutError(null)
    setReceiptLookupOpen(false)
    setCheckoutOpen(true)
  }, [cartLines.length])

  const resetPosForNextSale = useCallback(() => {
    setCartLines(clearCart())
    setCheckoutOpen(false)
    setCheckoutError(null)
    setCartLookupError(null)
    setLastReceiptNo(null)
    setBarcode("")
    setBarcodeFocusRequest((n) => n + 1)
    void refreshPreviewReceiptNo()
  }, [refreshPreviewReceiptNo])

  const handleCheckoutPrintReceipt = useCallback(
    async (input: PosCheckoutPrintReceiptInput) => {
      if (checkoutPending || cartLines.length === 0) return

      const printTab = openPosReceiptPrintTab()

      setCheckoutPending(true)
      setCheckoutError(null)
      try {
        const result = await fetchPosCheckout(
          cartLines.map((line) => ({ productId: line.productId, qty: line.qty })),
          {
            paymentMethod: input.paymentMethod,
            paidAmount: input.paidAmount,
          }
        )
        if (!result.ok) {
          printTab?.close()
          setCheckoutError(result.error)
          return
        }

        const saleId = result.result.sale.id
        const receiptNo = result.result.receipt.receiptNo
        setLastReceiptNo(receiptNo)
        navigatePosReceiptPrintTab(saleId, printTab)

        if (input.paymentMethod === "BANK_TRANSFER") {
          if (input.bankTransferEvidence) {
            uploadPaymentEvidenceSlipInBackground({
              file: input.bankTransferEvidence,
              receiptNo,
            })
          }
          if (isJestRuntime) {
            void refreshPendingEvidence()
          } else {
            window.setTimeout(() => {
              void refreshPendingEvidence()
            }, 2500)
          }
        }

        resetPosForNextSale()
      } finally {
        setCheckoutPending(false)
      }
    },
    [cartLines, checkoutPending, refreshPendingEvidence, resetPosForNextSale]
  )

  const resetRefundForm = useCallback(() => {
    setRefundReceiptNo("")
    setRefundReceipts([])
    setRefundReceiptsLoading(false)
    setRefundAmount("")
    setRefundReasonCode("")
    setRefundPreview(null)
    setRefundError(null)
  }, [])

  const previewRefundByReceiptNo = useCallback(
    async (receiptNo: string) => {
      const trimmed = receiptNo.trim()
      if (!trimmed || refundLookupPending) return

      setRefundLookupPending(true)
      setRefundError(null)
      setRefundPreview(null)
      setRefundAmount("")
      setRefundReasonCode("")
      try {
        const result = await fetchPosRefundPreviewByReceiptNo(trimmed)
        if (!result.ok) {
          setRefundError(result.error)
          return
        }
        setRefundPreview(result.preview)
        setRefundAmount(result.preview.remainingRefundable)
      } finally {
        setRefundLookupPending(false)
      }
    },
    [refundLookupPending]
  )

  const openRefund = useCallback(() => {
    resetRefundForm()
    setReceiptLookupOpen(false)
    setRefundOpen(true)
    setRefundReceiptsLoading(true)
    void fetchPosRefundableReceipts()
      .then((result) => {
        if (result.ok) {
          setRefundReceipts(result.receipts)
        } else {
          setRefundReceipts([])
        }
      })
      .finally(() => {
        setRefundReceiptsLoading(false)
      })
  }, [resetRefundForm])

  const closeRefund = useCallback(() => {
    if (refundPending || refundLookupPending) return
    setRefundOpen(false)
    resetRefundForm()
  }, [refundPending, refundLookupPending, resetRefundForm])

  const selectRefundReceipt = useCallback(
    (receiptNo: string) => {
      setRefundReceiptNo(receiptNo)
      setRefundPreview(null)
      setRefundAmount("")
      setRefundReasonCode("")
      setRefundError(null)
      if (!receiptNo.trim()) return
      void previewRefundByReceiptNo(receiptNo)
    },
    [previewRefundByReceiptNo]
  )

  const confirmRefund = useCallback(async () => {
    if (refundPending || !refundPreview) return

    setRefundPending(true)
    setRefundError(null)
    try {
      const result = await fetchPosRefund({
        saleId: refundPreview.saleId,
        amount: refundAmount.trim() || undefined,
        reasonCode: refundReasonCode,
      })
      if (!result.ok) {
        setRefundError(result.error)
        return
      }
      openPosRefundReceiptPrint(result.refund.id)
      resetRefundForm()
      setRefundOpen(false)
      setBarcodeFocusRequest((n) => n + 1)
    } finally {
      setRefundPending(false)
    }
  }, [refundAmount, refundPending, refundPreview, refundReasonCode, resetRefundForm])

  const openReceiptLookup = useCallback(() => {
    setCheckoutOpen(false)
    setRefundOpen(false)
    setReadReport(null)
    setReadStaffGate(null)
    setPlaceholder(null)
    const { y, m } = bangkokCalendarParts(new Date())
    setReceiptLookupRunningNo(
      defaultRunningNoFromNextPreview(previewReceiptNo, y, m)
    )
    setReceiptLookupOpen(true)
    setReceiptLookupFocusRequest((n) => n + 1)
  }, [previewReceiptNo])

  const closeReceiptLookup = useCallback(() => {
    setReceiptLookupOpen(false)
  }, [])

  const onKeypadAction = useCallback(
    (id: PosKeypadActionId) => {
      const kind = getPosActionKind(id)

      if (kind === "wire-logout") {
        void onLogout()
        return
      }

      if (kind === "wire-checkout") {
        openCheckout()
        return
      }

      if (kind === "wire-refund") {
        openRefund()
        return
      }

      if (kind === "wire-nav") {
        if (id === "stock-count") {
          void openStockCount()
        }
        if (id === "order") {
          void openOrder()
        }
        return
      }

      if (kind === "wire-target-vs-sales") {
        setTargetVsSalesOpen(true)
        return
      }

      if (kind === "wire-worktime") {
        setWorktimeOpen(true)
        return
      }

      if (kind === "wire-collector") {
        setReadReport(null)
        setCollectorOpen(true)
        return
      }

      if (kind === "wire-repair-ticket") {
        setRepairTicketOpen(true)
        return
      }

      if (kind === "wire-staff-evidence") {
        if (!staffEvidenceComplete) {
          setStaffEvidenceOpen(true)
        }
        return
      }

      if (kind === "wire-read-x") {
        setReadReport(null)
        setReadStaffGate("X")
        return
      }

      if (kind === "wire-read-z") {
        setReadReport(null)
        setReadStaffGate("Z")
        return
      }

      if (kind === "wire-print-report") {
        if (readReport?.mode === "Z") {
          printReadZReportAndExit(readReport, () => setReadReport(null))
        } else {
          printPosReadReport(readReport)
        }
        return
      }

      if (kind === "placeholder" && isPosPlaceholderId(id)) {
        setPlaceholder(id)
        return
      }

      if (kind === "keypad") {
        if (receiptLookupOpen) {
          const digit = keypadDigitChar(id)
          if (digit !== null && digit !== ".") {
            setReceiptLookupRunningNo((prev) =>
              appendReceiptLookupRunningDigit(prev, digit)
            )
            return
          }
          if (id === "backspace") {
            setReceiptLookupRunningNo((prev) => prev.slice(0, -1))
            return
          }
          if (id === "clear") {
            setReceiptLookupRunningNo("")
            return
          }
          if (id === "enter") {
            receiptLookupPanelRef.current?.search()
            return
          }
          return
        }

        const digit = keypadDigitChar(id)
        if (digit !== null) {
          setBarcode((prev) => prev + digit)
          return
        }
        if (id === "backspace") {
          setBarcode((prev) => prev.slice(0, -1))
          return
        }
        if (id === "clear") {
          setBarcode("")
          return
        }
        if (id === "enter") {
          void submitBarcode(barcode)
          return
        }
      }
    },
    [
      barcode,
      onLogout,
      openCheckout,
      openOrder,
      openRefund,
      openStockCount,
      readReport,
      receiptLookupOpen,
      staffEvidenceComplete,
      submitBarcode,
    ]
  )

  if (loading || !session) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-zinc-100 text-zinc-700">
        Loading POS terminal…
      </div>
    )
  }

  return (
    <PosShell
      session={session}
      barcode={barcode}
      onBarcodeChange={setBarcode}
      onBarcodeSubmit={(value) => {
        void submitBarcode(value)
      }}
      onKeypadAction={onKeypadAction}
      onReceiptLookup={openReceiptLookup}
      cartLines={cartLines}
      cartLookupError={cartLookupError}
      onIncrementQty={(productId) => {
        setCartLines((prev) => incrementLineQty(prev, productId))
      }}
      onDecrementQty={(productId) => {
        setCartLines((prev) => decrementLineQty(prev, productId))
      }}
      onRemoveCartLine={(productId) => {
        setCartLines((prev) => removeCartLine(prev, productId))
      }}
      onClearCart={() => {
        setCartLines(clearCart())
        setCartLookupError(null)
      }}
      receiptLookupOpen={receiptLookupOpen}
      onReceiptLookupClose={closeReceiptLookup}
      receiptLookupRunningNo={receiptLookupRunningNo}
      onReceiptLookupRunningNoChange={setReceiptLookupRunningNo}
      receiptLookupFocusRequestId={receiptLookupFocusRequest}
      receiptLookupPanelRef={receiptLookupPanelRef}
      receiptNo={resolvePosReceiptPanelNo(lastReceiptNo, previewReceiptNo)}
      checkoutOpen={checkoutOpen}
      checkoutPending={checkoutPending}
      checkoutError={checkoutError}
      barcodeFocusRequest={barcodeFocusRequest}
      onCheckoutClose={() => {
        if (!checkoutPending) {
          setCheckoutOpen(false)
          setCheckoutError(null)
        }
      }}
      onCheckoutPrintReceipt={(input) => {
        void handleCheckoutPrintReceipt(input)
      }}
      refundOpen={refundOpen}
      refundReceiptNo={refundReceiptNo}
      refundReceipts={refundReceipts}
      refundReceiptsLoading={refundReceiptsLoading}
      onRefundReceiptSelect={selectRefundReceipt}
      refundAmount={refundAmount}
      onRefundAmountChange={setRefundAmount}
      refundReasonCode={refundReasonCode}
      onRefundReasonCodeChange={setRefundReasonCode}
      refundPreview={refundPreview}
      refundLookupPending={refundLookupPending}
      refundPending={refundPending}
      refundError={refundError}
      onRefundClose={() => {
        closeRefund()
      }}
      onRefundConfirm={() => {
        void confirmRefund()
      }}
      placeholderOverlay={placeholder}
      onClosePlaceholder={() => setPlaceholder(null)}
      targetVsSalesOpen={targetVsSalesOpen}
      onCloseTargetVsSales={() => setTargetVsSalesOpen(false)}
      worktimeOpen={worktimeOpen}
      onCloseWorktime={() => setWorktimeOpen(false)}
      collectorOpen={collectorOpen}
      onCloseCollector={() => setCollectorOpen(false)}
      onCollectorReport={(report) => {
        setCollectorOpen(false)
        setReadReport(report)
      }}
      readStaffGate={readStaffGate}
      onCloseReadStaffGate={() => setReadStaffGate(null)}
      onReadReport={(report) => {
        setReadStaffGate(null)
        setReadReport(report)
      }}
      readReport={readReport}
      onCloseReadReport={() => setReadReport(null)}
      repairTicketOpen={repairTicketOpen}
      onCloseRepairTicket={() => setRepairTicketOpen(false)}
      staffEvidenceOpen={staffEvidenceOpen}
      onCloseStaffEvidence={() => setStaffEvidenceOpen(false)}
      staffEvidenceComplete={staffEvidenceComplete}
      onStaffEvidenceComplete={() => {
        setStaffEvidenceComplete(true)
        setStaffEvidenceOpen(false)
        void refreshStaffEvidenceStatus()
      }}
      thermalLayouts={thermalLayouts}
      keypadDisabled={
        logoutPending || lookupPending || checkoutPending || refundPending || refundLookupPending
      }
      pendingEvidenceCount={pendingEvidenceCount}
      onOpenPendingEvidence={() => {
        void openPendingEvidence()
      }}
      evidencePendingOpen={evidencePendingOpen}
      pendingEvidenceReceipts={pendingEvidenceReceipts}
      pendingEvidenceLoading={pendingEvidenceLoading}
      pendingEvidenceError={pendingEvidenceError}
      onClosePendingEvidence={() => {
        setEvidencePendingOpen(false)
        setEvidenceQrModalOpen(false)
      }}
      onPendingEvidenceUploadSuccess={() => {
        void refreshPendingEvidence()
      }}
      onPendingEvidenceQrModalOpenChange={(open) => {
        setEvidenceQrModalOpen(open)
        if (!open) {
          void refreshPendingEvidence()
        }
      }}
    />
  )
}

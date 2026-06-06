"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { PosShell } from "./PosShell"
import {
  addProductToCart,
  clearCart,
  decrementLineQty,
  incrementLineQty,
  removeCartLine,
  type PosCartLine,
} from "@/lib/pos/cart"
import { fetchPosCheckout } from "@/lib/pos-ui/pos-checkout-client"
import {
  getPosActionKind,
  isPosPlaceholderId,
  keypadDigitChar,
} from "@/lib/pos-ui/pos-actions"
import {
  POS_STOCK_COUNT_HREF,
} from "@/lib/pos-ui/pos-navigation"
import { openPosReceiptPrint } from "@/lib/pos-ui/pos-receipt-print"
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
import type { PosKeypadActionId, PosPlaceholderId, PosTerminalSession } from "@/lib/pos-ui/types"
import type { RefundPreviewResult } from "@/lib/pos/refund"

export function PosTerminalPage() {
  const router = useRouter()
  const [session, setSession] = useState<PosTerminalSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [barcode, setBarcode] = useState("")
  const [cartLines, setCartLines] = useState<PosCartLine[]>([])
  const [cartLookupError, setCartLookupError] = useState<string | null>(null)
  const [lookupPending, setLookupPending] = useState(false)
  const [placeholder, setPlaceholder] = useState<PosPlaceholderId | null>(null)
  const [targetVsSalesOpen, setTargetVsSalesOpen] = useState(false)
  const [worktimeOpen, setWorktimeOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutPending, setCheckoutPending] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutSuccess, setCheckoutSuccess] = useState<{
    saleId: string
    receiptNo: string
    total: string
  } | null>(null)
  const [lastReceiptNo, setLastReceiptNo] = useState<string | null>(null)
  const [previewReceiptNo, setPreviewReceiptNo] = useState<string | null>(null)
  const [logoutPending, setLogoutPending] = useState(false)
  const [barcodeFocusRequest, setBarcodeFocusRequest] = useState(0)
  const [refundOpen, setRefundOpen] = useState(false)
  const [refundReceiptNo, setRefundReceiptNo] = useState("")
  const [refundReceipts, setRefundReceipts] = useState<RefundableReceiptSummary[]>([])
  const [refundReceiptsLoading, setRefundReceiptsLoading] = useState(false)
  const [refundAmount, setRefundAmount] = useState("")
  const [refundReasonCode, setRefundReasonCode] = useState("")
  const [refundPreview, setRefundPreview] = useState<RefundPreviewResult | null>(null)
  const [refundLookupPending, setRefundLookupPending] = useState(false)
  const [refundPending, setRefundPending] = useState(false)
  const [refundError, setRefundError] = useState<string | null>(null)

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
      if (!cancelled) setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [router, refreshPreviewReceiptNo])

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
    setCheckoutSuccess(null)
    setCheckoutOpen(true)
  }, [cartLines.length])

  const confirmCheckout = useCallback(async () => {
    if (checkoutPending || cartLines.length === 0) return

    setCheckoutPending(true)
    setCheckoutError(null)
    try {
      const result = await fetchPosCheckout(
        cartLines.map((line) => ({ productId: line.productId, qty: line.qty }))
      )
      if (!result.ok) {
        setCheckoutError(result.error)
        return
      }
      const receiptNo = result.result.receipt.receiptNo
      setCheckoutSuccess({
        saleId: result.result.sale.id,
        receiptNo,
        total: result.result.sale.total.toString(),
      })
      setLastReceiptNo(receiptNo)
    } finally {
      setCheckoutPending(false)
    }
  }, [cartLines, checkoutPending])

  const resetPosForNextSale = useCallback(() => {
    setCartLines(clearCart())
    setCheckoutOpen(false)
    setCheckoutSuccess(null)
    setCheckoutError(null)
    setCartLookupError(null)
    setLastReceiptNo(null)
    setBarcode("")
    setBarcodeFocusRequest((n) => n + 1)
    void refreshPreviewReceiptNo()
  }, [session, refreshPreviewReceiptNo])

  const printReceiptAndNewSale = useCallback(
    (saleId: string) => {
      openPosReceiptPrint(saleId)
      resetPosForNextSale()
    },
    [resetPosForNextSale]
  )

  const newSaleWithoutPrint = useCallback(() => {
    resetPosForNextSale()
  }, [resetPosForNextSale])

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
          router.push(POS_STOCK_COUNT_HREF)
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

      if (kind === "placeholder" && isPosPlaceholderId(id)) {
        setPlaceholder(id)
        return
      }

      if (kind === "keypad") {
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
    [barcode, onLogout, openCheckout, openRefund, router, submitBarcode]
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
      receiptNo={resolvePosReceiptPanelNo(lastReceiptNo, previewReceiptNo)}
      checkoutOpen={checkoutOpen}
      checkoutPending={checkoutPending}
      checkoutError={checkoutError}
      checkoutSuccess={checkoutSuccess}
      barcodeFocusRequest={barcodeFocusRequest}
      onCheckoutClose={() => {
        if (!checkoutPending) {
          if (checkoutSuccess) {
            resetPosForNextSale()
          } else {
            setCheckoutOpen(false)
            setCheckoutError(null)
          }
        }
      }}
      onCheckoutConfirm={() => {
        void confirmCheckout()
      }}
      onCheckoutPrintReceiptAndNewSale={printReceiptAndNewSale}
      onCheckoutNewSaleWithoutPrint={newSaleWithoutPrint}
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
      keypadDisabled={
        logoutPending || lookupPending || checkoutPending || refundPending || refundLookupPending
      }
    />
  )
}

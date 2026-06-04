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
  POS_ORDER_HREF,
  POS_STOCK_COUNT_HREF,
} from "@/lib/pos-ui/pos-navigation"
import { fetchPosProductLookup } from "@/lib/pos-ui/pos-product-lookup"
import { fetchSessionUser } from "@/lib/pos-ui/session-client"
import type { PosKeypadActionId, PosPlaceholderId, PosTerminalSession } from "@/lib/pos-ui/types"

export function PosTerminalPage() {
  const router = useRouter()
  const [session, setSession] = useState<PosTerminalSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [barcode, setBarcode] = useState("")
  const [cartLines, setCartLines] = useState<PosCartLine[]>([])
  const [cartLookupError, setCartLookupError] = useState<string | null>(null)
  const [lookupPending, setLookupPending] = useState(false)
  const [placeholder, setPlaceholder] = useState<PosPlaceholderId | null>(null)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [checkoutPending, setCheckoutPending] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [checkoutSuccess, setCheckoutSuccess] = useState<{
    saleId: string
    receiptNo: string
    total: string
  } | null>(null)
  const [logoutPending, setLogoutPending] = useState(false)

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
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [router])

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
      setCheckoutSuccess({
        saleId: result.result.sale.id,
        receiptNo: result.result.receipt.receiptNo,
        total: result.result.sale.total.toString(),
      })
    } finally {
      setCheckoutPending(false)
    }
  }, [cartLines, checkoutPending])

  const printReceipt = useCallback((saleId: string) => {
    const url = `/shop/receipt/${encodeURIComponent(saleId)}?autoprint=1`
    window.open(url, "_blank", "noopener,noreferrer")
  }, [])

  const finishCheckout = useCallback(() => {
    setCartLines(clearCart())
    setCheckoutOpen(false)
    setCheckoutSuccess(null)
    setCheckoutError(null)
    setCartLookupError(null)
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

      if (kind === "wire-nav") {
        if (id === "order") {
          router.push(POS_ORDER_HREF)
        } else if (id === "stock-count") {
          router.push(POS_STOCK_COUNT_HREF)
        }
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
    [barcode, onLogout, openCheckout, router, submitBarcode]
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
      checkoutOpen={checkoutOpen}
      checkoutPending={checkoutPending}
      checkoutError={checkoutError}
      checkoutSuccess={checkoutSuccess}
      onCheckoutClose={() => {
        if (!checkoutPending) {
          setCheckoutOpen(false)
          setCheckoutError(null)
          if (checkoutSuccess) finishCheckout()
        }
      }}
      onCheckoutConfirm={() => {
        void confirmCheckout()
      }}
      onCheckoutPrintReceipt={printReceipt}
      onCheckoutNewSale={finishCheckout}
      placeholderOverlay={placeholder}
      onClosePlaceholder={() => setPlaceholder(null)}
      keypadDisabled={logoutPending || lookupPending || checkoutPending}
    />
  )
}

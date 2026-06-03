"use client"

import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { PosShell } from "./PosShell"
import {
  getPosActionKind,
  isPosPlaceholderId,
  keypadDigitChar,
} from "@/lib/pos-ui/pos-actions"
import {
  POS_ORDER_HREF,
  POS_STOCK_COUNT_HREF,
} from "@/lib/pos-ui/pos-navigation"
import { fetchSessionUser } from "@/lib/pos-ui/session-client"
import type { PosKeypadActionId, PosPlaceholderId, PosTerminalSession } from "@/lib/pos-ui/types"

export function PosTerminalPage() {
  const router = useRouter()
  const [session, setSession] = useState<PosTerminalSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [barcode, setBarcode] = useState("")
  const [placeholder, setPlaceholder] = useState<PosPlaceholderId | null>(null)
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

  const onKeypadAction = useCallback(
    (id: PosKeypadActionId) => {
      const kind = getPosActionKind(id)

      if (kind === "wire-logout") {
        void onLogout()
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
          return
        }
      }
    },
    [onLogout, router]
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
      onKeypadAction={onKeypadAction}
      placeholderOverlay={placeholder}
      onClosePlaceholder={() => setPlaceholder(null)}
      keypadDisabled={logoutPending}
    />
  )
}

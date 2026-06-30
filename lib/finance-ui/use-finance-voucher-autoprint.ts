"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { runFinanceVoucherPrint } from "@/components/finance/FinancePrintActions"

/** Triggers browser print once when `?autoprint=1` is present (finance inquiry Print link). */
export function useFinanceVoucherAutoprint(enabled: boolean) {
  const searchParams = useSearchParams()
  const firedRef = useRef(false)

  useEffect(() => {
    if (!enabled || firedRef.current) return
    if (searchParams.get("autoprint") !== "1") return
    firedRef.current = true
    void runFinanceVoucherPrint()
  }, [enabled, searchParams])
}

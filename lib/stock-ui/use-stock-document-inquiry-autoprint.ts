"use client"

import { useEffect, useRef } from "react"
import { useSearchParams } from "next/navigation"
import { runStockDocumentInquiryPrint } from "@/components/stock/StockDocumentPrintActions"

/** Triggers browser print once when `?autoprint=1` is present (stock inquiry Print link). */
export function useStockDocumentInquiryAutoprint(enabled: boolean) {
  const searchParams = useSearchParams()
  const firedRef = useRef(false)

  useEffect(() => {
    if (!enabled || firedRef.current) return
    if (searchParams.get("autoprint") !== "1") return
    firedRef.current = true
    void runStockDocumentInquiryPrint()
  }, [enabled, searchParams])
}

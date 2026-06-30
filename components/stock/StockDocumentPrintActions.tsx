"use client"

import { useCallback } from "react"
import { buildStockDocumentInquiryPrintPageCss } from "@/lib/stock-ui/stock-document-inquiry-print-page-css"

const STOCK_DOCUMENT_INQUIRY_PRINT_PAGE_STYLE_ID =
  "stock-document-inquiry-print-page-style"

async function runStockDocumentInquiryPrint(): Promise<void> {
  document.body.classList.add("stock-document-inquiry-print-active")

  let pageStyle = document.getElementById(STOCK_DOCUMENT_INQUIRY_PRINT_PAGE_STYLE_ID)
  if (!pageStyle) {
    pageStyle = document.createElement("style")
    pageStyle.id = STOCK_DOCUMENT_INQUIRY_PRINT_PAGE_STYLE_ID
    pageStyle.textContent = buildStockDocumentInquiryPrintPageCss()
    document.head.appendChild(pageStyle)
  }

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })

  const cleanup = () => {
    document.body.classList.remove("stock-document-inquiry-print-active")
    pageStyle?.remove()
  }
  window.addEventListener("afterprint", cleanup, { once: true })
  window.print()
}

type StockDocumentPrintActionsProps = {
  disabled?: boolean
}

/** Browser print / save-as-PDF controls for finance stock document inquiry. */
export function StockDocumentPrintActions({
  disabled = false,
}: StockDocumentPrintActionsProps) {
  const handlePrint = useCallback(() => {
    if (disabled) return
    void runStockDocumentInquiryPrint()
  }, [disabled])

  return (
    <div
      className="no-print flex flex-wrap items-center gap-2"
      data-testid="stock-document-print-actions"
    >
      <button
        type="button"
        className="rounded border border-border bg-surface px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
        disabled={disabled}
        onClick={handlePrint}
        data-testid="action-print-out"
      >
        Print Out
      </button>
      <button
        type="button"
        className="rounded border border-border bg-surface px-4 py-2 text-sm font-medium text-primary disabled:opacity-50"
        disabled={disabled}
        onClick={handlePrint}
        data-testid="action-save-pdf"
      >
        Save as PDF
      </button>
    </div>
  )
}

export { runStockDocumentInquiryPrint }

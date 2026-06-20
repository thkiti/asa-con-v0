"use client"

import { useCallback } from "react"

const FINANCE_VOUCHER_PRINT_PAGE_STYLE_ID = "finance-voucher-print-page-style"

function runFinanceVoucherPrint(): void {
  document.body.classList.add("finance-voucher-print-active")

  let pageStyle = document.getElementById(FINANCE_VOUCHER_PRINT_PAGE_STYLE_ID)
  if (!pageStyle) {
    pageStyle = document.createElement("style")
    pageStyle.id = FINANCE_VOUCHER_PRINT_PAGE_STYLE_ID
    pageStyle.textContent =
      "@media print { @page { size: A4 portrait; margin: 12mm; } }"
    document.head.appendChild(pageStyle)
  }

  const cleanup = () => {
    document.body.classList.remove("finance-voucher-print-active")
    pageStyle?.remove()
  }
  window.addEventListener("afterprint", cleanup, { once: true })
  window.print()
}

type FinancePrintActionsProps = {
  disabled?: boolean
}

/**
 * Standard finance voucher print controls.
 * Print Out and Save as PDF both use the same on-screen layout via browser print.
 */
export function FinancePrintActions({ disabled = false }: FinancePrintActionsProps) {
  const handlePrint = useCallback(() => {
    if (disabled) return
    runFinanceVoucherPrint()
  }, [disabled])

  return (
    <div className="no-print flex flex-wrap items-center gap-2" data-testid="finance-print-actions">
      <button
        type="button"
        className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
        disabled={disabled}
        onClick={handlePrint}
        data-testid="action-print-out"
      >
        Print Out
      </button>
      <button
        type="button"
        className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-50"
        disabled={disabled}
        onClick={handlePrint}
        data-testid="action-save-pdf"
      >
        Save as PDF
      </button>
    </div>
  )
}

export { runFinanceVoucherPrint }

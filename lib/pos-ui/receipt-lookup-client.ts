import type { ReceiptLookupResult } from "@/lib/pos/receipt-lookup-types"

export type ReceiptLookupSearchParams = {
  branchId: string
  receiptNo?: string
  dateFrom?: string
  dateTo?: string
}

export type ReceiptLookupFetchResult =
  | { ok: true; result: ReceiptLookupResult }
  | { ok: false; error: string }

export async function fetchReceiptLookup(
  params: ReceiptLookupSearchParams
): Promise<ReceiptLookupFetchResult> {
  const search = new URLSearchParams({ branchId: params.branchId.trim() })
  if (params.receiptNo?.trim()) {
    search.set("receiptNo", params.receiptNo.trim())
  }
  if (params.dateFrom?.trim()) {
    search.set("dateFrom", params.dateFrom.trim())
  }
  if (params.dateTo?.trim()) {
    search.set("dateTo", params.dateTo.trim())
  }

  const res = await fetch(`/api/pos/receipts/lookup?${search.toString()}`)
  const body = (await res.json().catch(() => ({}))) as {
    error?: string
    receipts?: ReceiptLookupResult["receipts"]
  }

  if (!res.ok) {
    return { ok: false, error: body.error ?? "Receipt lookup failed" }
  }

  return { ok: true, result: { receipts: body.receipts ?? [] } }
}

export function buildReceiptArchivePdfUrl(
  receiptId: string,
  disposition: "inline" | "attachment" = "inline",
  branchId?: string
): string {
  const params = new URLSearchParams({ disposition })
  if (branchId?.trim()) {
    params.set("branchId", branchId.trim())
  }
  return `/api/pos/receipts/${encodeURIComponent(receiptId)}/pdf?${params.toString()}`
}

export function openReceiptArchivePdf(
  receiptId: string,
  branchId?: string,
  openFn: typeof window.open = window.open
): void {
  const url = buildReceiptArchivePdfUrl(receiptId, "inline", branchId)
  openFn(url, "_blank", "noopener,noreferrer")
}

export function printReceiptArchivePdf(
  receiptId: string,
  branchId?: string,
  openFn: typeof window.open = window.open
): void {
  const url = buildReceiptArchivePdfUrl(receiptId, "inline", branchId)
  const printWindow = openFn(url, "_blank")
  if (!printWindow) return
  printWindow.addEventListener("load", () => {
    printWindow.focus()
    printWindow.print()
  })
}

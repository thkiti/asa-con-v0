import { attachReceiptPdfArchive } from "@/lib/document-archive/attach-receipt-pdf"
import { prisma } from "@/lib/shared/prisma"
import { loadReceiptPrintContext } from "./receipt-print-context"
import { buildReceiptPdfSnapshotFromPrintContext } from "./receipt-pdf-snapshot"

export type ReceiptArchiveAfterCheckoutInput = {
  receiptId: string
  saleId: string
  branchId: string
}

/**
 * Async post-checkout hook — does not block checkout response.
 * Failures are logged; Sale/Receipt remain committed.
 */
export function scheduleReceiptArchiveAfterCheckout(
  input: ReceiptArchiveAfterCheckoutInput
): void {
  void attachReceiptArchiveAfterCheckout(input).catch((err: unknown) => {
    console.error("RECEIPT_ARCHIVE_AFTER_CHECKOUT:", err)
  })
}

export async function attachReceiptArchiveAfterCheckout(
  input: ReceiptArchiveAfterCheckoutInput
) {
  const receiptId = String(input.receiptId ?? "").trim()
  const saleId = String(input.saleId ?? "").trim()
  const branchId = String(input.branchId ?? "").trim()
  if (!receiptId || !saleId || !branchId) {
    return { ok: false as const, error: "receiptId, saleId, and branchId are required" }
  }

  const context = await loadReceiptPrintContext(prisma, { saleId, branchId })
  const snapshot = buildReceiptPdfSnapshotFromPrintContext({
    receiptId,
    branchId,
    context,
  })

  return attachReceiptPdfArchive({
    receiptId,
    branchId,
    snapshot,
  })
}

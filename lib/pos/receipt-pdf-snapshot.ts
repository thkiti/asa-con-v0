import type { PrismaClient } from "@/generated/prisma/client"
import {
  RECEIPT_PDF_SNAPSHOT_VERSION,
  type ReceiptPdfSnapshot,
} from "./receipt-pdf-snapshot-types"
import {
  loadReceiptPrintContext,
  type ReceiptPrintContext,
  type ReceiptPrintDb,
} from "./receipt-print-context"

export function buildReceiptPdfSnapshotFromPrintContext(input: {
  receiptId: string
  branchId: string
  context: ReceiptPrintContext
}): ReceiptPdfSnapshot {
  const receiptId = String(input.receiptId ?? "").trim()
  const branchId = String(input.branchId ?? "").trim()
  const ctx = input.context

  if (!receiptId) {
    throw new Error("receiptId is required for receipt PDF snapshot")
  }
  if (!branchId) {
    throw new Error("branchId is required for receipt PDF snapshot")
  }

  return {
    snapshotVersion: RECEIPT_PDF_SNAPSHOT_VERSION,
    receiptId,
    saleId: ctx.saleId,
    branchId,
    receiptNo: ctx.receiptNo,
    issuedAt: ctx.issuedAt,
    branchCode: ctx.branchCode,
    branchName: ctx.branchName,
    branchAddress: ctx.branchAddress,
    branchPhone: ctx.branchPhone,
    companyDisplayName: ctx.companyDisplayName,
    companyTaxId: ctx.companyTaxId,
    machineTaxId: ctx.machineTaxId,
    cashierDisplay: ctx.cashierDisplay,
    lines: ctx.lines.map((line) => ({
      code: line.code,
      name: line.name,
      qty: line.qty,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
    })),
    total: ctx.total,
    paymentMethod: ctx.paymentMethod,
    cashAmount: ctx.cashAmount,
    change: ctx.change,
    thermalLayout: ctx.thermalLayout,
  }
}

export async function buildReceiptPdfSnapshotForReceipt(
  db: ReceiptPrintDb & Pick<PrismaClient, "receipt">,
  input: { receiptId: string; branchId: string }
): Promise<ReceiptPdfSnapshot | null> {
  const receiptId = String(input.receiptId ?? "").trim()
  const branchId = String(input.branchId ?? "").trim()
  if (!receiptId || !branchId) return null

  const receipt = await db.receipt.findUnique({
    where: { id: receiptId },
    select: { id: true, saleId: true, branchId: true },
  })
  if (!receipt || receipt.branchId !== branchId) return null

  const context = await loadReceiptPrintContext(db, {
    saleId: receipt.saleId,
    branchId,
  })

  return buildReceiptPdfSnapshotFromPrintContext({
    receiptId,
    branchId,
    context,
  })
}

export function receiptPrintContextFromSnapshot(
  snapshot: ReceiptPdfSnapshot
): ReceiptPrintContext {
  return {
    saleId: snapshot.saleId,
    receiptNo: snapshot.receiptNo,
    issuedAt: snapshot.issuedAt,
    branchCode: snapshot.branchCode,
    branchName: snapshot.branchName,
    branchAddress: snapshot.branchAddress,
    branchPhone: snapshot.branchPhone,
    companyDisplayName: snapshot.companyDisplayName,
    companyTaxId: snapshot.companyTaxId,
    machineTaxId: snapshot.machineTaxId,
    cashierDisplay: snapshot.cashierDisplay,
    lines: snapshot.lines,
    total: snapshot.total,
    paymentMethod: snapshot.paymentMethod,
    cashAmount: snapshot.cashAmount,
    change: snapshot.change,
    thermalLayouts: {
      RECEIPT: snapshot.thermalLayout,
      REFUND: snapshot.thermalLayout,
      COLLECTOR: snapshot.thermalLayout,
      REPAIR_TICKET: snapshot.thermalLayout,
      READ_Z: snapshot.thermalLayout,
    },
    thermalLayout: snapshot.thermalLayout,
  }
}

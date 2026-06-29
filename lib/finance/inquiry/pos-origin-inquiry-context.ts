import type { PrismaClient } from "@/generated/prisma/client"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"

/**
 * POS-origin enrichment for Finance Document Inquiry (read-only).
 *
 * REC: Receipt.pdfPath / DocumentArchive on Receipt — inquiry PDF column only.
 *      /shop/receipt reprint does not write or regenerate archive PDFs.
 * REF: Refund has no pdfPath/archive field yet — inquiry PDF column stays "—".
 *      /shop/refund-receipt is thermal reprint only until REF archive is designed.
 */

export type PosOriginReceiptContext = {
  receiptNo: string
  pdfPath: string | null
}

export type PosOriginInquiryPrisma = Pick<PrismaClient, "receipt">

export async function loadPosOriginReceiptContextBySaleId(
  prisma: PosOriginInquiryPrisma,
  saleIds: string[]
): Promise<Map<string, PosOriginReceiptContext>> {
  const uniqueSaleIds = [...new Set(saleIds.map((id) => id.trim()).filter(Boolean))]
  if (!uniqueSaleIds.length) {
    return new Map()
  }

  const receipts = await prisma.receipt.findMany({
    where: { saleId: { in: uniqueSaleIds } },
    select: {
      saleId: true,
      receiptNo: true,
      pdfPath: true,
    },
  })

  return new Map(
    receipts.map((receipt) => [
      receipt.saleId,
      {
        receiptNo: receipt.receiptNo,
        pdfPath: receipt.pdfPath,
      },
    ])
  )
}

export function isPosOriginRefType(refType: string): boolean {
  return (
    refType === FINANCE_REF_TYPES.POS_SALE || refType === FINANCE_REF_TYPES.POS_REFUND
  )
}

export function resolvePosReceiptArchivePdfAvailable(
  pdfPath: string | null | undefined
): boolean {
  return Boolean(String(pdfPath ?? "").trim())
}

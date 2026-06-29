import type { PrismaClient } from "@/generated/prisma/client"
import type { SessionUser } from "@/lib/auth/types"
import { isHoRole } from "@/lib/stock/document-read"
import { resolveHoPrintBranchId } from "./resolve-ho-print-branch"

export type SaleReceiptPrintBranchPrisma = Pick<PrismaClient, "sale">
export type RefundReceiptPrintBranchPrisma = Pick<PrismaClient, "refund">

/**
 * Branch for /shop/receipt print loads.
 * HO audit (Finance Document Inquiry) may omit ?branchId= — resolve from the sale row.
 */
export async function resolveSaleReceiptPrintBranchId(
  prisma: SaleReceiptPrintBranchPrisma,
  session: SessionUser,
  saleId: string,
  queryBranchId?: string | null
): Promise<string> {
  const query = String(queryBranchId ?? "").trim()
  if (query) {
    return resolveHoPrintBranchId(session, query)
  }

  if (isHoRole(session.role)) {
    const sale = await prisma.sale.findUnique({
      where: { id: saleId.trim() },
      select: { branchId: true },
    })
    if (sale?.branchId?.trim()) {
      return sale.branchId.trim()
    }
  }

  return resolveHoPrintBranchId(session, query)
}

/**
 * Branch for /shop/refund-receipt print loads.
 * HO audit may omit ?branchId= — resolve from the refund row.
 */
export async function resolveRefundReceiptPrintBranchId(
  prisma: RefundReceiptPrintBranchPrisma,
  session: SessionUser,
  refundId: string,
  queryBranchId?: string | null
): Promise<string> {
  const query = String(queryBranchId ?? "").trim()
  if (query) {
    return resolveHoPrintBranchId(session, query)
  }

  if (isHoRole(session.role)) {
    const refund = await prisma.refund.findUnique({
      where: { id: refundId.trim() },
      select: { branchId: true },
    })
    if (refund?.branchId?.trim()) {
      return refund.branchId.trim()
    }
  }

  return resolveHoPrintBranchId(session, query)
}

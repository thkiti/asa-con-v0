import {
  PaymentEvidenceStatus,
  PaymentMethod,
  SaleStatus,
  type PrismaClient,
} from "@/generated/prisma/client"
import { formatCashierDisplay } from "@/lib/pos/format-cashier-display"
import type {
  PendingPaymentEvidenceResult,
  PendingPaymentEvidenceRow,
} from "@/lib/pos/pending-payment-evidence-types"
import { PosLookupError } from "@/lib/pos/pos-errors"
import { toDec } from "@/lib/stock/decimal"

type ListPendingPaymentEvidenceDb = Pick<
  PrismaClient,
  "paymentEvidence" | "staff"
>

export async function listPendingPaymentEvidence(
  db: ListPendingPaymentEvidenceDb,
  input: { branchId: string }
): Promise<PendingPaymentEvidenceResult> {
  const branchId = String(input.branchId ?? "").trim()
  if (!branchId) {
    throw new PosLookupError("branchId is required", "INVALID_BRANCH", 400)
  }

  const rows = await db.paymentEvidence.findMany({
    where: {
      branchId,
      status: PaymentEvidenceStatus.PENDING,
      sale: { status: SaleStatus.COMPLETED },
      payment: { method: PaymentMethod.BANK_TRANSFER },
    },
    include: {
      receipt: { select: { receiptNo: true, issuedAt: true } },
      sale: { select: { id: true, total: true, staffId: true } },
    },
    orderBy: { receipt: { issuedAt: "desc" } },
  })

  const staffIds = [
    ...new Set(
      rows
        .map((row) => row.sale.staffId?.trim())
        .filter((id): id is string => Boolean(id))
    ),
  ]
  const staffRows =
    staffIds.length > 0
      ? await db.staff.findMany({
          where: { staffId: { in: staffIds } },
          select: { staffId: true, name: true },
        })
      : []
  const staffNameByStaffId = new Map(
    staffRows.map((row) => [row.staffId, row.name] as const)
  )

  const receipts: PendingPaymentEvidenceRow[] = rows.map((row) => {
    const staffId = row.sale.staffId?.trim() ?? null
    return {
      evidenceId: row.id,
      saleId: row.sale.id,
      receiptNo: row.receipt.receiptNo,
      issuedAt: row.receipt.issuedAt.toISOString(),
      total: toDec(row.sale.total).toFixed(2),
      staff: staffId
        ? formatCashierDisplay(staffId, staffNameByStaffId.get(staffId) ?? null)
        : null,
    }
  })

  return {
    count: receipts.length,
    receipts,
  }
}

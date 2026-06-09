import {
  PaymentEvidenceStatus,
  SaleStatus,
  type PrismaClient,
} from "@/generated/prisma/client"
import { blobUrl } from "@/lib/blob-url"
import { formatCashierDisplay } from "@/lib/pos/format-cashier-display"
import { posReceiptSlipPaymentLabel } from "@/lib/pos-ui/pos-payment-methods"
import { bangkokMonthRange } from "@/lib/reporting/bangkok-calendar"
import { CheckReceiptError } from "@/lib/operations/check-receipt-errors"
import type { CheckReceiptResult, CheckReceiptRow } from "@/lib/operations/check-receipt-types"
import { listActiveShopBranches } from "@/lib/shop/sales-targets"
import { toDec } from "@/lib/stock/decimal"

type CheckReceiptDb = Pick<PrismaClient, "sale" | "staff" | "branch">

function assertYear(year: number): void {
  if (!Number.isFinite(year) || year < 2000 || year > 2100) {
    throw new CheckReceiptError("Invalid year", "INVALID_YEAR", 400)
  }
}

function assertMonth(month: number): void {
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    throw new CheckReceiptError("Invalid month", "INVALID_MONTH", 400)
  }
}

function resolveSlipImageUrl(
  evidence: {
    status: string
    blobUrl: string | null
    blobPathname: string | null
  } | null
): string | null {
  if (!evidence || evidence.status !== PaymentEvidenceStatus.UPLOADED) {
    return null
  }
  const directUrl = evidence.blobUrl?.trim()
  if (directUrl) return directUrl
  const pathname = evidence.blobPathname?.trim()
  if (pathname) return blobUrl(pathname)
  return null
}

export async function listCheckReceiptRows(
  db: CheckReceiptDb,
  input: { branchId: string; year: number; month: number }
): Promise<CheckReceiptResult> {
  const branchId = String(input.branchId ?? "").trim()
  if (!branchId) {
    throw new CheckReceiptError("branchId is required", "BRANCH_REQUIRED", 400)
  }

  const year = input.year
  const month = input.month
  assertYear(year)
  assertMonth(month)

  const branches = await listActiveShopBranches(db)
  const branch = branches.find((row) => row.id === branchId)
  if (!branch) {
    throw new CheckReceiptError("Branch not found", "BRANCH_NOT_FOUND", 404)
  }

  const { start, end } = bangkokMonthRange(year, month)
  const sales = await db.sale.findMany({
    where: {
      branchId,
      status: SaleStatus.COMPLETED,
      createdAt: { gte: start, lte: end },
    },
    include: {
      receipt: true,
      payment: { include: { paymentEvidence: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  const staffIds = [
    ...new Set(
      sales
        .map((sale) => sale.staffId?.trim())
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

  const receipts: CheckReceiptRow[] = []
  for (const sale of sales) {
    if (!sale.receipt || !sale.payment) continue

    const staffId = sale.staffId?.trim() ?? null
    receipts.push({
      saleId: sale.id,
      receiptNo: sale.receipt.receiptNo,
      issuedAt: sale.receipt.issuedAt.toISOString(),
      staff: staffId
        ? formatCashierDisplay(
            staffId,
            staffNameByStaffId.get(staffId) ?? null
          )
        : null,
      total: toDec(sale.total).toFixed(2),
      paymentMethod: posReceiptSlipPaymentLabel(sale.payment.method),
      slipImageUrl: resolveSlipImageUrl(sale.payment.paymentEvidence),
    })
  }

  return {
    branchId,
    branchCode: branch.code,
    year,
    month,
    receipts,
  }
}

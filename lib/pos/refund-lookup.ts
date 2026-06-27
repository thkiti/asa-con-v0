import type { Prisma } from "@/generated/prisma/client"
import {
  buildRefundLookupPdfUrl,
  resolveRefundLookupArchiveStatus,
} from "@/lib/pos/refund-lookup-archive-status"
import type {
  RefundLookupResult,
  RefundLookupRow,
  SearchRefundLookupInput,
} from "@/lib/pos/refund-lookup-types"
import { formatCashierDisplay } from "@/lib/pos/format-cashier-display"
import { COMPANY_TAX_BRANCH_CODE, loadCompanyTaxId } from "@/lib/thermal/company-tax"
import { toDec } from "@/lib/stock/decimal"

export const REFUND_LOOKUP_DEFAULT_LIMIT = 50
export const REFUND_LOOKUP_MAX_LIMIT = 200

type SearchRefundLookupDb = Pick<Prisma.TransactionClient, "refund" | "staff" | "branch">

function normalizeLimit(limit: number | undefined): number {
  const n = Number(limit ?? REFUND_LOOKUP_DEFAULT_LIMIT)
  if (!Number.isFinite(n) || n < 1) return REFUND_LOOKUP_DEFAULT_LIMIT
  return Math.min(Math.trunc(n), REFUND_LOOKUP_MAX_LIMIT)
}

function mapRefundRow(
  refund: {
    id: string
    refundNo: string
    kind: RefundLookupRow["kind"]
    amount: Prisma.Decimal
    reason: string | null
    createdAt: Date
    branchId: string
    staffId: string | null
    saleId: string | null
    originalReceiptId: string | null
    branch: {
      code: string
      name: string
      address: string | null
      phone: string | null
      taxId: string | null
    }
    originalReceipt: { receiptNo: string } | null
    sale: { total: Prisma.Decimal } | null
  },
  staffNameByStaffId: Map<string, string>,
  companyTaxId: string | null
): RefundLookupRow {
  const staffId = refund.staffId?.trim() ?? null
  const branchCode = refund.branch.code
  const machineRaw = refund.branch.taxId?.trim() || null
  const machineTaxId =
    branchCode === COMPANY_TAX_BRANCH_CODE ? null : machineRaw
  const archive = resolveRefundLookupArchiveStatus()

  return {
    refundId: refund.id,
    refundNo: refund.refundNo,
    issuedAt: refund.createdAt.toISOString(),
    kind: refund.kind,
    amount: toDec(refund.amount).toFixed(2),
    reason: refund.reason?.trim() || null,
    branchId: refund.branchId,
    branchCode: refund.branch.code,
    branchName: refund.branch.name,
    branchAddress: refund.branch.address?.trim() || null,
    branchPhone: refund.branch.phone?.trim() || null,
    companyTaxId,
    machineTaxId,
    cashierDisplay: staffId
      ? formatCashierDisplay(staffId, staffNameByStaffId.get(staffId) ?? null)
      : null,
    saleId: refund.saleId,
    originalReceiptId: refund.originalReceiptId,
    originalReceiptNo: refund.originalReceipt?.receiptNo ?? null,
    originalReceiptTotal: refund.sale ? toDec(refund.sale.total).toFixed(2) : null,
    archiveStatus: archive.archiveStatus,
    archiveStatusLabel: archive.archiveStatusLabel,
    archiveError: archive.archiveError,
    pdfUrl: archive.pdfReady ? buildRefundLookupPdfUrl(refund.id) : null,
  }
}

export async function searchRefundLookup(
  db: SearchRefundLookupDb,
  input: SearchRefundLookupInput
): Promise<RefundLookupResult> {
  const branchId = String(input.branchId ?? "").trim()
  if (!branchId) {
    return { refunds: [] }
  }

  const refundNo = input.refundNo?.trim() ?? ""
  const limit = normalizeLimit(input.limit)

  const refunds = await db.refund.findMany({
    where: {
      branchId,
      ...(refundNo
        ? { refundNo: { contains: refundNo, mode: "insensitive" as const } }
        : {}),
    },
    include: {
      branch: {
        select: {
          code: true,
          name: true,
          address: true,
          phone: true,
          taxId: true,
        },
      },
      originalReceipt: { select: { receiptNo: true } },
      sale: { select: { total: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  })

  const staffIds = [
    ...new Set(
      refunds
        .map((row) => row.staffId?.trim())
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

  const companyTaxId = await loadCompanyTaxId(db)

  return {
    refunds: refunds.map((row) => mapRefundRow(row, staffNameByStaffId, companyTaxId)),
  }
}

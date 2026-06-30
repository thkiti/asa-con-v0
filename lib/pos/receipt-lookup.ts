import { SaleStatus, type Prisma } from "@/generated/prisma/client"
import {
  buildReceiptLookupPdfUrl,
  resolveReceiptLookupArchiveStatus,
} from "@/lib/pos/receipt-lookup-archive-status"
import type {
  ReceiptLookupResult,
  ReceiptLookupRow,
  SearchReceiptLookupInput,
} from "@/lib/pos/receipt-lookup-types"
import { cleanGroupDisplayName } from "@/lib/master/build-product-group"
import { formatCashierDisplay } from "@/lib/pos/format-cashier-display"
import { posReceiptSlipPaymentLabel } from "@/lib/pos-ui/pos-payment-methods"
import { COMPANY_TAX_BRANCH_CODE, loadCompanyTaxId } from "@/lib/thermal/company-tax"
import { toDec } from "@/lib/stock/decimal"
import { parseLookupDateRangeFilter } from "@/lib/pos/lookup-date-range"

export const RECEIPT_LOOKUP_DEFAULT_LIMIT = 50
export const RECEIPT_LOOKUP_MAX_LIMIT = 200

type SearchReceiptLookupDb = Pick<
  Prisma.TransactionClient,
  "receipt" | "staff" | "branch"
>

function normalizeLimit(limit: number | undefined): number {
  const n = Number(limit ?? RECEIPT_LOOKUP_DEFAULT_LIMIT)
  if (!Number.isFinite(n) || n < 1) return RECEIPT_LOOKUP_DEFAULT_LIMIT
  return Math.min(Math.trunc(n), RECEIPT_LOOKUP_MAX_LIMIT)
}

function mapReceiptRow(
  receipt: {
    id: string
    receiptNo: string
    issuedAt: Date
    documentArchiveId: string | null
    pdfPath: string | null
    pdfBlobUrl: string | null
    documentArchive: {
      status: string
      pdfPath: string | null
      pdfBlobUrl: string | null
      errorMessage: string | null
    } | null
    sale: {
      id: string
      total: Prisma.Decimal
      staffId: string | null
      branch: {
        code: string
        name: string
        address: string | null
        phone: string | null
        taxId: string | null
      }
      payment: { method: string; amount: Prisma.Decimal; change: Prisma.Decimal } | null
      items: Array<{
        qty: number
        unitPrice: Prisma.Decimal
        lineTotal: Prisma.Decimal
        product: { name: string; code: string }
      }>
    }
  },
  staffNameByStaffId: Map<string, string>,
  companyTaxId: string | null
): ReceiptLookupRow {
  const staffId = receipt.sale.staffId?.trim() ?? null
  const branchCode = receipt.sale.branch.code
  const machineRaw = receipt.sale.branch.taxId?.trim() || null
  const machineTaxId =
    branchCode === COMPANY_TAX_BRANCH_CODE ? null : machineRaw
  const archive = resolveReceiptLookupArchiveStatus({
    documentArchiveId: receipt.documentArchiveId,
    pdfPath: receipt.pdfPath,
    pdfBlobUrl: receipt.pdfBlobUrl,
    documentArchive: receipt.documentArchive,
  })

  const paymentMethod = receipt.sale.payment?.method ?? "CASH"

  return {
    receiptId: receipt.id,
    saleId: receipt.sale.id,
    receiptNo: receipt.receiptNo,
    issuedAt: receipt.issuedAt.toISOString(),
    branchCode: receipt.sale.branch.code,
    branchName: receipt.sale.branch.name,
    branchAddress: receipt.sale.branch.address?.trim() || null,
    branchPhone: receipt.sale.branch.phone?.trim() || null,
    companyTaxId,
    machineTaxId,
    staffDisplay: staffId
      ? formatCashierDisplay(staffId, staffNameByStaffId.get(staffId) ?? null)
      : null,
    total: toDec(receipt.sale.total).toFixed(2),
    paymentMethod,
    paymentMethodLabel: posReceiptSlipPaymentLabel(paymentMethod),
    cashAmount: toDec(receipt.sale.payment?.amount).toFixed(2),
    change: toDec(receipt.sale.payment?.change).toFixed(2),
    archiveStatus: archive.archiveStatus,
    archiveStatusLabel: archive.archiveStatusLabel,
    archiveError: archive.archiveError,
    pdfUrl: archive.pdfReady ? buildReceiptLookupPdfUrl(receipt.id) : null,
    items: receipt.sale.items.map((item) => ({
      code: item.product.code.trim() || "-",
      name: cleanGroupDisplayName(item.product.name),
      qty: item.qty,
      unitPrice: toDec(item.unitPrice).toFixed(2),
      lineTotal: toDec(item.lineTotal).toFixed(2),
    })),
  }
}

export async function searchReceiptLookup(
  db: SearchReceiptLookupDb,
  input: SearchReceiptLookupInput
): Promise<ReceiptLookupResult> {
  const branchId = String(input.branchId ?? "").trim()
  if (!branchId) {
    return { receipts: [] }
  }

  const receiptNo = input.receiptNo?.trim() ?? ""
  const issuedAt = parseLookupDateRangeFilter({
    dateFrom: input.dateFrom,
    dateTo: input.dateTo,
  })
  const limit = normalizeLimit(input.limit)

  const receipts = await db.receipt.findMany({
    where: {
      branchId,
      sale: { status: SaleStatus.COMPLETED },
      ...(receiptNo
        ? { receiptNo: { contains: receiptNo, mode: "insensitive" as const } }
        : {}),
      ...(issuedAt.gte || issuedAt.lte
        ? {
            issuedAt: {
              ...(issuedAt.gte ? { gte: issuedAt.gte } : {}),
              ...(issuedAt.lte ? { lte: issuedAt.lte } : {}),
            },
          }
        : {}),
    },
    include: {
      documentArchive: {
        select: {
          status: true,
          pdfPath: true,
          pdfBlobUrl: true,
          errorMessage: true,
        },
      },
      sale: {
        select: {
          id: true,
          total: true,
          staffId: true,
          branch: {
            select: {
              code: true,
              name: true,
              address: true,
              phone: true,
              taxId: true,
            },
          },
          payment: { select: { method: true, amount: true, change: true } },
          items: {
            select: {
              qty: true,
              unitPrice: true,
              lineTotal: true,
              product: { select: { name: true, code: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
    },
    orderBy: { issuedAt: "desc" },
    take: limit,
  })

  const staffIds = [
    ...new Set(
      receipts
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

  const companyTaxId = await loadCompanyTaxId(db)

  return {
    receipts: receipts.map((row) => mapReceiptRow(row, staffNameByStaffId, companyTaxId)),
  }
}

import { SaleStatus, type Prisma } from "@/generated/prisma/client"
import {
  buildReceiptLookupPdfUrl,
  resolveReceiptLookupArchiveStatus,
} from "@/lib/pos/receipt-lookup-archive-status"
import {
  ReceiptLookupError,
  ReceiptLookupErrorCodes,
} from "@/lib/pos/receipt-lookup-errors"
import type {
  ReceiptLookupResult,
  ReceiptLookupRow,
  SearchReceiptLookupInput,
} from "@/lib/pos/receipt-lookup-types"
import { formatCashierDisplay } from "@/lib/pos/format-cashier-display"
import { posReceiptSlipPaymentLabel } from "@/lib/pos-ui/pos-payment-methods"
import { toDec } from "@/lib/stock/decimal"

export const RECEIPT_LOOKUP_DEFAULT_LIMIT = 50
export const RECEIPT_LOOKUP_MAX_LIMIT = 200

type SearchReceiptLookupDb = Pick<
  Prisma.TransactionClient,
  "receipt" | "staff"
>

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function normalizeLimit(limit: number | undefined): number {
  const n = Number(limit ?? RECEIPT_LOOKUP_DEFAULT_LIMIT)
  if (!Number.isFinite(n) || n < 1) return RECEIPT_LOOKUP_DEFAULT_LIMIT
  return Math.min(Math.trunc(n), RECEIPT_LOOKUP_MAX_LIMIT)
}

function parseBangkokDateBoundary(
  value: string,
  boundary: "start" | "end"
): Date {
  const trimmed = value.trim()
  if (!DATE_ONLY_PATTERN.test(trimmed)) {
    throw new ReceiptLookupError(
      "Invalid date filter (use YYYY-MM-DD)",
      ReceiptLookupErrorCodes.INVALID_DATE,
      400
    )
  }
  const suffix =
    boundary === "start" ? "T00:00:00+07:00" : "T23:59:59.999+07:00"
  const date = new Date(`${trimmed}${suffix}`)
  if (Number.isNaN(date.getTime())) {
    throw new ReceiptLookupError(
      "Invalid date filter",
      ReceiptLookupErrorCodes.INVALID_DATE,
      400
    )
  }
  return date
}

function parseDateRangeFilter(input: SearchReceiptLookupInput): {
  gte?: Date
  lte?: Date
} {
  const fromRaw = input.dateFrom?.trim() ?? ""
  const toRaw = input.dateTo?.trim() ?? ""
  if (!fromRaw && !toRaw) return {}

  const gte = fromRaw ? parseBangkokDateBoundary(fromRaw, "start") : undefined
  const lte = toRaw ? parseBangkokDateBoundary(toRaw, "end") : undefined

  if (gte && lte && gte.getTime() > lte.getTime()) {
    throw new ReceiptLookupError(
      "dateFrom must be on or before dateTo",
      ReceiptLookupErrorCodes.INVALID_DATE_RANGE,
      400
    )
  }

  return { gte, lte }
}

function mapReceiptRow(
  receipt: {
    id: string
    receiptNo: string
    issuedAt: Date
    branch: { code: string; name: string }
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
      total: Prisma.Decimal
      staffId: string | null
      payment: { method: string } | null
    }
  },
  staffNameByStaffId: Map<string, string>
): ReceiptLookupRow {
  const staffId = receipt.sale.staffId?.trim() ?? null
  const archive = resolveReceiptLookupArchiveStatus({
    documentArchiveId: receipt.documentArchiveId,
    pdfPath: receipt.pdfPath,
    pdfBlobUrl: receipt.pdfBlobUrl,
    documentArchive: receipt.documentArchive,
  })

  return {
    receiptId: receipt.id,
    receiptNo: receipt.receiptNo,
    issuedAt: receipt.issuedAt.toISOString(),
    branchCode: receipt.branch.code,
    branchName: receipt.branch.name,
    staffDisplay: staffId
      ? formatCashierDisplay(staffId, staffNameByStaffId.get(staffId) ?? null)
      : null,
    total: toDec(receipt.sale.total).toFixed(2),
    paymentMethodLabel: posReceiptSlipPaymentLabel(
      receipt.sale.payment?.method ?? "CASH"
    ),
    archiveStatus: archive.archiveStatus,
    archiveStatusLabel: archive.archiveStatusLabel,
    archiveError: archive.archiveError,
    pdfUrl: archive.pdfReady ? buildReceiptLookupPdfUrl(receipt.id) : null,
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
  const issuedAt = parseDateRangeFilter(input)
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
      branch: { select: { code: true, name: true } },
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
          total: true,
          staffId: true,
          payment: { select: { method: true } },
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

  return {
    receipts: receipts.map((row) => mapReceiptRow(row, staffNameByStaffId)),
  }
}

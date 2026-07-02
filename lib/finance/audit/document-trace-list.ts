import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { toMoney } from "@/lib/finance/decimal"
import {
  resolvePostedVoucherAmount,
  resolvePostedVoucherDocumentNo,
} from "@/lib/finance/inquiry/finance-document-inquiry-helpers"
import { buildPostedVoucherInquiryPath } from "@/lib/finance/inquiry/finance-document-inquiry-links"
import { buildPosOriginShopPath } from "@/lib/finance/inquiry/pos-origin-shop-path"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { buildStockDocumentInquiryPath } from "@/lib/stock/inquiry/stock-document-inquiry-links"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { formatBusinessDocumentNumber } from "@/lib/stock-ui/business-phase-title"
import { stockInquiryKindToWhere } from "@/lib/stock/inquiry/stock-document-inquiry-kind-filter"
import type { StockDocumentInquiryKindFilter } from "@/lib/stock/inquiry/stock-document-inquiry-types"
import {
  isDocumentTraceDocTypeAllowed,
  isDocumentTraceVoucherSearchOnly,
  resolveDocumentTraceListBranchCode,
  resolveDocumentTraceListDateRange,
  resolveDocumentTraceRefTypes,
  type DocumentTraceDocType,
  type DocumentTraceFilters,
  type DocumentTraceMainDocType,
} from "./document-trace-filters"
import {
  buildDocumentTraceListPageMeta,
  resolveDocumentTraceListPagination,
  type DocumentTraceListPagination,
} from "./document-trace-list-pagination"

export type DocumentTraceListRow = {
  documentNo: string
  date: string
  branchCode: string
  branchName: string
  status: string
  amount: string | null
  voucherNo: string | null
  traceQuery: string
  documentHref?: string | null
}

export type DocumentTraceListResult = {
  rows: DocumentTraceListRow[]
  warnings: string[]
  totalCount: number | null
  hasMore: boolean
  nextOffset: number | null
}

export type DocumentTraceListInput = {
  legalEntityCode: DocumentEntityCode
  docType: DocumentTraceDocType
  period: string
  branchCode?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
}

export type DocumentTraceListPrisma = Pick<
  PrismaClient,
  "receipt" | "refund" | "voucher" | "stockDocument" | "branch"
> & {
  receipt: Pick<PrismaClient["receipt"], "findMany" | "count">
  refund: Pick<PrismaClient["refund"], "findMany" | "count">
  voucher: Pick<PrismaClient["voucher"], "findMany" | "count">
  stockDocument: Pick<PrismaClient["stockDocument"], "findMany" | "count">
}

type DocumentTraceListPageSlice = Pick<
  DocumentTraceListResult,
  "rows" | "totalCount" | "hasMore" | "nextOffset"
>

const EMPTY_LIST_RESULT: Omit<DocumentTraceListResult, "warnings"> = {
  rows: [],
  totalCount: 0,
  hasMore: false,
  nextOffset: null,
}

function normalizeOptional(value: string | undefined): string {
  return String(value ?? "").trim()
}

function mapReceiptRows(
  receipts: Array<{
    receiptNo: string
    issuedAt: Date
    sale: {
      id: string
      status: string
      total: Prisma.Decimal
      branchId: string
      branch: { code: string; name: string }
    } | null
  }>,
  voucherBySaleId: Map<string, string>
): DocumentTraceListRow[] {
  return receipts.map((row) => ({
      documentNo: row.receiptNo,
      date: row.issuedAt.toISOString(),
      branchCode: row.sale?.branch?.code ?? "",
      branchName: row.sale?.branch?.name ?? "",
      status: row.sale?.status ?? "UNKNOWN",
      amount: row.sale ? toMoney(row.sale.total).toFixed(2) : null,
      voucherNo: row.sale ? voucherBySaleId.get(row.sale.id) ?? null : null,
      traceQuery: row.receiptNo,
      documentHref:
        row.sale != null
          ? buildPosOriginShopPath({
              refType: FINANCE_REF_TYPES.POS_SALE,
              refId: row.sale.id,
              branchId: row.sale.branchId,
            })
          : null,
    }))
}

async function listReceiptDocuments(
  prisma: DocumentTraceListPrisma,
  input: DocumentTraceListInput,
  range: { from: Date; to: Date },
  pagination: DocumentTraceListPagination
): Promise<DocumentTraceListPageSlice> {
  const branchCode = normalizeOptional(input.branchCode)
  const saleWhere: Prisma.SaleWhereInput = {}
  if (branchCode) {
    saleWhere.branch = { code: branchCode }
  }

  const where: Prisma.ReceiptWhereInput = {
    issuedAt: { gte: range.from, lte: range.to },
    ...(Object.keys(saleWhere).length > 0 ? { sale: saleWhere } : {}),
  }

  const [receipts, totalCount] = await Promise.all([
    prisma.receipt.findMany({
      where,
      include: {
        sale: {
          select: {
          id: true,
          status: true,
          total: true,
          branchId: true,
          branch: { select: { id: true, code: true, name: true } },
          },
        },
      },
      orderBy: [{ issuedAt: "desc" }, { receiptNo: "desc" }],
      skip: pagination.offset,
      take: pagination.limit + 1,
    }),
    prisma.receipt.count({ where }),
  ])

  const pageReceipts = receipts.slice(0, pagination.limit)
  const saleIds = pageReceipts
    .map((row) => row.sale?.id)
    .filter((value): value is string => Boolean(value))

  const vouchers =
    saleIds.length > 0
      ? await prisma.voucher.findMany({
          where: {
            legalEntityCode: input.legalEntityCode,
            refType: FINANCE_REF_TYPES.POS_SALE,
            refId: { in: saleIds },
          },
          select: { refId: true, voucherNo: true },
        })
      : []

  const voucherBySaleId = new Map(vouchers.map((row) => [row.refId, row.voucherNo]))
  const rows = mapReceiptRows(pageReceipts, voucherBySaleId)

  return {
    rows,
    ...buildDocumentTraceListPageMeta({
      limit: pagination.limit,
      offset: pagination.offset,
      fetchedCount: receipts.length,
      totalCount,
    }),
  }
}

async function listRefundDocuments(
  prisma: DocumentTraceListPrisma,
  input: DocumentTraceListInput,
  range: { from: Date; to: Date },
  pagination: DocumentTraceListPagination
): Promise<DocumentTraceListPageSlice> {
  const branchCode = normalizeOptional(input.branchCode)

  const where: Prisma.RefundWhereInput = {
    createdAt: { gte: range.from, lte: range.to },
    ...(branchCode ? { branch: { code: branchCode } } : {}),
  }

  const [refunds, totalCount] = await Promise.all([
    prisma.refund.findMany({
      where,
      include: {
        branch: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { refundNo: "desc" }],
      skip: pagination.offset,
      take: pagination.limit + 1,
    }),
    prisma.refund.count({ where }),
  ])

  const pageRefunds = refunds.slice(0, pagination.limit)
  const refundIds = pageRefunds.map((row) => row.id)
  const vouchers =
    refundIds.length > 0
      ? await prisma.voucher.findMany({
          where: {
            legalEntityCode: input.legalEntityCode,
            refType: FINANCE_REF_TYPES.POS_REFUND,
            refId: { in: refundIds },
          },
          select: { refId: true, voucherNo: true },
        })
      : []

  const voucherByRefundId = new Map(vouchers.map((row) => [row.refId, row.voucherNo]))
  const rows = pageRefunds.map((row) => ({
    documentNo: row.refundNo,
    date: row.createdAt.toISOString(),
    branchCode: row.branch.code,
    branchName: row.branch.name,
    status: "POSTED",
    amount: toMoney(row.amount).toFixed(2),
    voucherNo: voucherByRefundId.get(row.id) ?? null,
    traceQuery: row.refundNo,
    documentHref: buildPosOriginShopPath({
      refType: FINANCE_REF_TYPES.POS_REFUND,
      refId: row.id,
      branchId: row.branch.id,
    }),
  }))

  return {
    rows,
    ...buildDocumentTraceListPageMeta({
      limit: pagination.limit,
      offset: pagination.offset,
      fetchedCount: refunds.length,
      totalCount,
    }),
  }
}

async function listVoucherDocuments(
  prisma: DocumentTraceListPrisma,
  input: DocumentTraceListInput,
  range: { from: Date; to: Date },
  refTypes: string[],
  pagination: DocumentTraceListPagination
): Promise<DocumentTraceListPageSlice> {
  const branchCode = normalizeOptional(input.branchCode)

  const where: Prisma.VoucherWhereInput = {
    legalEntityCode: input.legalEntityCode,
    refType: { in: refTypes },
    date: { gte: range.from, lte: range.to },
    ...(branchCode ? { branch: { code: branchCode } } : {}),
  }

  const [vouchers, totalCount] = await Promise.all([
    prisma.voucher.findMany({
      where,
      include: {
        branch: { select: { id: true, code: true, name: true } },
        lines: { select: { debit: true, credit: true } },
        manualJournalEntryPosted: { select: { entryNo: true } },
        paymentVoucherPosted: { select: { entryNo: true } },
        revenueVoucherPosted: { select: { entryNo: true } },
        pettyCashVoucherPosted: { select: { entryNo: true } },
      },
      orderBy: [{ date: "desc" }, { voucherNo: "desc" }],
      skip: pagination.offset,
      take: pagination.limit + 1,
    }),
    prisma.voucher.count({ where }),
  ])

  const pageVouchers = vouchers.slice(0, pagination.limit)
  const rows = pageVouchers.map((row) => {
      const documentNo =
        resolvePostedVoucherDocumentNo({
          refType: row.refType,
          refNo: row.refNo,
          manualJournalEntry: row.manualJournalEntryPosted,
          paymentVoucher: row.paymentVoucherPosted,
          revenueVoucher: row.revenueVoucherPosted,
          pettyCashVoucher: row.pettyCashVoucherPosted,
        }) ?? row.voucherNo

      let totalDebit = toMoney(0)
      let totalCredit = toMoney(0)
      for (const line of row.lines) {
        totalDebit = totalDebit.plus(toMoney(line.debit))
        totalCredit = totalCredit.plus(toMoney(line.credit))
      }

      return {
        documentNo,
        date: row.date.toISOString(),
        branchCode: row.branch.code,
        branchName: row.branch.name,
        status: row.status,
        amount: resolvePostedVoucherAmount(
          totalDebit.toFixed(2),
          totalCredit.toFixed(2)
        ),
        voucherNo: row.voucherNo,
        traceQuery: documentNo || row.voucherNo,
        documentHref: buildPostedVoucherInquiryPath(row.id),
    }
  })

  return {
    rows,
    ...buildDocumentTraceListPageMeta({
      limit: pagination.limit,
      offset: pagination.offset,
      fetchedCount: vouchers.length,
      totalCount,
    }),
  }
}

async function listStockDocuments(
  prisma: DocumentTraceListPrisma,
  input: DocumentTraceListInput,
  range: { from: Date; to: Date },
  pagination: DocumentTraceListPagination
): Promise<DocumentTraceListPageSlice> {
  const branchCode = normalizeOptional(input.branchCode)
  const kind = input.docType as StockDocumentInquiryKindFilter

  const kindWhere = stockInquiryKindToWhere(kind, input.legalEntityCode)

  const where: Prisma.StockDocumentWhereInput = {
    legalEntityCode: input.legalEntityCode,
    date: { gte: range.from, lte: range.to },
    ...(branchCode ? { branch: { code: branchCode } } : {}),
    ...(kindWhere ?? {}),
  }

  const [docs, totalCount] = await Promise.all([
    prisma.stockDocument.findMany({
      where,
      include: {
        branch: { select: { id: true, code: true, name: true } },
      },
      orderBy: [{ date: "desc" }, { refNo: "desc" }],
      skip: pagination.offset,
      take: pagination.limit + 1,
    }),
    prisma.stockDocument.count({ where }),
  ])

  const pageDocs = docs.slice(0, pagination.limit)
  const documentIds = pageDocs.map((row) => row.id)
  const vouchers =
    documentIds.length > 0
      ? await prisma.voucher.findMany({
          where: {
            legalEntityCode: input.legalEntityCode,
            refType: FINANCE_REF_TYPES.STOCK_DOC_POST,
            refId: { in: documentIds },
          },
          select: { refId: true, voucherNo: true },
        })
      : []

  const voucherByDocId = new Map(vouchers.map((row) => [row.refId, row.voucherNo]))
  const rows = pageDocs.map((row) => {
    const documentNo = formatBusinessDocumentNumber({
      docType: row.docType,
      status: row.status,
      viewerEntityCode: input.legalEntityCode,
      storedRefNo: row.refNo,
    })

    return {
      documentNo,
      date: row.date.toISOString(),
      branchCode: row.branch.code,
      branchName: row.branch.name,
      status: row.status,
      amount: null,
      voucherNo: voucherByDocId.get(row.id) ?? null,
      traceQuery: row.refNo,
      documentHref: buildStockDocumentInquiryPath(row.id),
    }
  })

  return {
    rows,
    ...buildDocumentTraceListPageMeta({
      limit: pagination.limit,
      offset: pagination.offset,
      fetchedCount: docs.length,
      totalCount,
    }),
  }
}

export function documentTraceListInputFromFilters(
  filters: DocumentTraceFilters,
  request?: { limit?: number; offset?: number }
): DocumentTraceListInput | null {
  if (!filters.docType || isDocumentTraceVoucherSearchOnly(filters.docType)) {
    return null
  }

  return {
    legalEntityCode: filters.legalEntityCode,
    docType: filters.docType,
    period: filters.period,
    branchCode: resolveDocumentTraceListBranchCode(filters),
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    limit: request?.limit,
    offset: request?.offset,
  }
}

export async function listDocumentTraceDocuments(
  prisma: DocumentTraceListPrisma,
  input: DocumentTraceListInput
): Promise<DocumentTraceListResult> {
  const warnings: string[] = []
  const pagination = resolveDocumentTraceListPagination(input)

  if (!isDocumentTraceDocTypeAllowed(input.docType, input.legalEntityCode)) {
    return {
      ...EMPTY_LIST_RESULT,
      warnings: [`${input.docType} is not available for this legal entity.`],
    }
  }

  const range = resolveDocumentTraceListDateRange({
    period: input.period,
    dateFrom: input.dateFrom ?? "",
    dateTo: input.dateTo ?? "",
  })
  if (!range) {
    return {
      ...EMPTY_LIST_RESULT,
      warnings: ["Period must use YYYY-MM format."],
    }
  }

  let page: DocumentTraceListPageSlice = EMPTY_LIST_RESULT

  if (input.docType === "REC") {
    page = await listReceiptDocuments(prisma, input, range, pagination)
  } else if (input.docType === "REF") {
    page = await listRefundDocuments(prisma, input, range, pagination)
  } else {
    const refTypes = resolveDocumentTraceRefTypes(
      input.docType as DocumentTraceMainDocType
    )
    if (refTypes) {
      page = await listVoucherDocuments(prisma, input, range, refTypes, pagination)
    } else if (
      ["CNT", "ADJ", "ORD", "DEY", "ORS", "ORI"].includes(input.docType)
    ) {
      page = await listStockDocuments(prisma, input, range, pagination)
    } else {
      warnings.push(`Listing is not supported for ${input.docType} yet.`)
    }
  }

  return {
    rows: page.rows,
    warnings,
    totalCount: page.totalCount,
    hasMore: page.hasMore,
    nextOffset: page.nextOffset,
  }
}

export async function listDocumentTraceDocumentsFromFilters(
  prisma: DocumentTraceListPrisma,
  filters: DocumentTraceFilters,
  request?: { limit?: number; offset?: number }
): Promise<DocumentTraceListResult> {
  const input = documentTraceListInputFromFilters(filters, request)
  if (!input) {
    return { ...EMPTY_LIST_RESULT, warnings: [] }
  }
  return listDocumentTraceDocuments(prisma, input)
}

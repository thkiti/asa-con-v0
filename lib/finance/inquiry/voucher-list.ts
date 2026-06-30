import type { Prisma, PrismaClient } from "@/generated/prisma/client"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"
import {
  accountingPeriodUniqueWhere,
  resolvePeriodLegalEntityCode,
} from "@/lib/finance/period-lookup"
import type {
  FinanceVoucherListFilter,
  FinanceVoucherListResult,
  FinanceVoucherListRow,
} from "./voucher-list-types"
import {
  applyVoucherInquiryRefTypeFilter,
  resolveVoucherInquiryDocumentTypeCode,
} from "./voucher-document-types"
import {
  loadPosOriginReceiptContextBySaleId,
  resolvePosReceiptArchivePdfAvailable,
} from "./pos-origin-inquiry-context"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import {
  matchesAmountRange,
  matchesPdfStateFilter,
  MANUAL_JOURNAL_FAMILY,
  resolvePostedVoucherAmount,
  resolvePostedVoucherDocumentNo,
} from "./finance-document-inquiry-helpers"
import { buildDocumentArchiveRefKey } from "@/lib/document-archive/kinds"
import { resolveColPayInArchiveWorkflowStatus } from "@/lib/document-archive/col-pay-in-workflow"
import { resolveColBankPayInArchiveAvailable } from "@/lib/document-archive/resolve-col-archive-available"
import {
  OPERATIONAL_VOUCHER_REF_TYPES,
  resolveOperationalVoucherDocumentKind,
} from "@/lib/document-archive/operational-voucher-kind"
import { resolvePdfAvailable } from "@/lib/document-archive/resolve-pdf-available"
import { loadVaultArchivesForRefs } from "@/lib/document-archive/vault-lookup"
import type { VaultArchiveRecord } from "@/lib/document-archive/resolve-status-types"
import { resolveVoucherInquiryVoucherNoSearch } from "./voucher-no-search"

export type { FinanceVoucherListFilter, FinanceVoucherListResult, FinanceVoucherListRow } from "./voucher-list-types"

export { getVoucherDetailById as getFinanceVoucherDetail } from "@/lib/finance/voucher-read"

export type FinanceVoucherListPrisma = Pick<
  PrismaClient,
  "voucher" | "accountingPeriod" | "receipt" | "documentArchiveLink"
>

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

function parseFilterDate(value: Date | string | undefined): Date | undefined {
  if (value == null) return undefined
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

function parsePeriodDateRange(periodKey: string): { from: Date; to: Date } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(periodKey.trim())
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null
  }
  const from = new Date(year, month - 1, 1)
  const to = new Date(year, month, 0, 23, 59, 59, 999)
  return { from, to }
}

async function resolvePeriodId(
  prisma: FinanceVoucherListPrisma,
  periodKey: string,
  legalEntityCode: FinanceVoucherListFilter["legalEntityCode"]
): Promise<string | null> {
  const period = await prisma.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({
      periodKey,
      legalEntityCode: resolvePeriodLegalEntityCode(legalEntityCode),
    }),
    select: { id: true },
  })
  return period?.id ?? null
}

function resolvePostedStatusFilter(
  filter: FinanceVoucherListFilter
): Prisma.VoucherWhereInput["status"] | undefined {
  const postingState = filter.postingState ?? "all"
  if (postingState === "unposted") {
    return { not: "POSTED" }
  }

  const status = filter.status?.trim()
  if (status) {
    if (status === "CANCELLED") return "VOIDED"
    return status as Prisma.VoucherWhereInput["status"]
  }

  if (postingState === "posted") {
    return "POSTED"
  }

  return undefined
}

function buildWhere(
  filter: FinanceVoucherListFilter,
  periodId: string | null
): Prisma.VoucherWhereInput {
  const where: Prisma.VoucherWhereInput = {
    legalEntityCode: filter.legalEntityCode,
  }

  const voucherNoSearch = resolveVoucherInquiryVoucherNoSearch(
    filter.voucherNo,
    filter.periodKey
  )
  if (voucherNoSearch?.mode === "equals") {
    where.voucherNo = voucherNoSearch.value
  } else if (voucherNoSearch?.mode === "contains") {
    where.voucherNo = { contains: voucherNoSearch.value, mode: "insensitive" }
  }

  const refNo = filter.refNo?.trim()
  if (refNo) {
    where.OR = [
      { refNo: { contains: refNo, mode: "insensitive" } },
      {
        manualJournalEntryPosted: {
          entryNo: { contains: refNo, mode: "insensitive" },
        },
      },
      {
        paymentVoucherPosted: {
          entryNo: { contains: refNo, mode: "insensitive" },
        },
      },
      {
        revenueVoucherPosted: {
          entryNo: { contains: refNo, mode: "insensitive" },
        },
      },
      {
        pettyCashVoucherPosted: {
          entryNo: { contains: refNo, mode: "insensitive" },
        },
      },
    ]
  }

  const refTypeIn = filter.refTypeIn
  if (refTypeIn?.length) {
    where.refType = { in: refTypeIn }
  } else {
    const refType = filter.refType?.trim()
    if (refType) {
      where.refType = refType
    }
  }

  if (periodId) {
    where.periodId = periodId
  }

  const dateFrom = parseFilterDate(filter.dateFrom)
  const dateTo = parseFilterDate(filter.dateTo)
  if (dateFrom || dateTo) {
    where.date = {}
    if (dateFrom) where.date.gte = dateFrom
    if (dateTo) {
      const end = new Date(dateTo)
      end.setHours(23, 59, 59, 999)
      where.date.lte = end
    }
  }

  if (filter.branchId?.trim()) {
    where.branchId = filter.branchId.trim()
  }

  const statusFilter = resolvePostedStatusFilter(filter)
  if (statusFilter) {
    where.status = statusFilter
  }

  return where
}

function sumLineTotals(
  lines: Array<{ debit: Prisma.Decimal; credit: Prisma.Decimal }>
): { totalDebit: string; totalCredit: string } {
  let totalDebit = ZERO
  let totalCredit = ZERO
  for (const line of lines) {
    totalDebit = addMoney(totalDebit, toMoney(line.debit))
    totalCredit = addMoney(totalCredit, toMoney(line.credit))
  }
  return {
    totalDebit: totalDebit.toString(),
    totalCredit: totalCredit.toString(),
  }
}

type VoucherListDbRow = {
  id: string
  voucherNo: string
  date: Date
  legalEntityCode: string
  refType: string
  refId: string
  refNo: string | null
  description: string | null
  status: string
  branchId: string
  branch: { code: string; name: string }
  period: { periodKey: string }
  journalEntry: {
    id: string
    lines: Array<{ debit: Prisma.Decimal; credit: Prisma.Decimal }>
  } | null
  lines: Array<{ debit: Prisma.Decimal; credit: Prisma.Decimal }>
  manualJournalEntryPosted: {
    entryNo: string
    status: string
    pdfPath: string | null
    pdfBlobUrl: string | null
  } | null
  paymentVoucherPosted: { entryNo: string } | null
  revenueVoucherPosted: { entryNo: string } | null
  pettyCashVoucherPosted: { entryNo: string } | null
}

function mapVoucherRow(
  row: VoucherListDbRow,
  posReceipt?: { receiptNo: string; pdfPath: string | null },
  vaultByKey?: Map<string, VaultArchiveRecord>,
  colDepositPostedByRefId?: Map<string, boolean>
): FinanceVoucherListRow {
  const amountLines = row.journalEntry?.lines.length ? row.journalEntry.lines : row.lines
  const { totalDebit, totalCredit } = sumLineTotals(amountLines)
  const amount = resolvePostedVoucherAmount(totalDebit, totalCredit)
  const documentNo = resolvePostedVoucherDocumentNo({
    refType: row.refType,
    refNo: row.refNo,
    manualJournalEntry: row.manualJournalEntryPosted,
    paymentVoucher: row.paymentVoucherPosted,
    revenueVoucher: row.revenueVoucherPosted,
    pettyCashVoucher: row.pettyCashVoucherPosted,
  })
  const resolvedDocumentNo =
    row.refType === FINANCE_REF_TYPES.POS_SALE && !documentNo && posReceipt?.receiptNo
      ? posReceipt.receiptNo
      : documentNo
  let pdfAvailable: boolean | null = null
  let archiveAvailable: boolean | null = null
  if (MANUAL_JOURNAL_FAMILY.has(row.refType)) {
    const documentTypeCode = resolveVoucherInquiryDocumentTypeCode(row.refType)
    const documentKind = documentTypeCode === "OPB" ? "OPB" : "MJV"
    const vaultKey = buildDocumentArchiveRefKey(
      documentKind,
      row.refId,
      "DOCUMENT_PDF"
    )
    pdfAvailable = resolvePdfAvailable(
      {
        documentKind,
        documentId: row.refId,
        archiveKind: "DOCUMENT_PDF",
        workflowStatus: row.status,
        legacyPdfPath: row.manualJournalEntryPosted?.pdfPath ?? null,
        legacyPdfBlobUrl: row.manualJournalEntryPosted?.pdfBlobUrl ?? null,
      },
      vaultByKey?.get(vaultKey)
    )
  } else if (OPERATIONAL_VOUCHER_REF_TYPES.has(row.refType)) {
    const documentKind = resolveOperationalVoucherDocumentKind(row.refType)
    if (documentKind) {
      const vaultKey = buildDocumentArchiveRefKey(
        documentKind,
        row.refId,
        "DOCUMENT_PDF"
      )
      pdfAvailable = resolvePdfAvailable(
        {
          documentKind,
          documentId: row.refId,
          archiveKind: "DOCUMENT_PDF",
          workflowStatus: row.status,
        },
        vaultByKey?.get(vaultKey)
      )
    }
  }
  if (row.refType === FINANCE_REF_TYPES.POS_SALE && pdfAvailable === null && posReceipt) {
    pdfAvailable = resolvePosReceiptArchivePdfAvailable(posReceipt.pdfPath)
  }
  if (row.refType === FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP) {
    const depositPosted = colDepositPostedByRefId?.get(row.refId) ?? false
    const workflowStatus = resolveColPayInArchiveWorkflowStatus({
      pickupStatus: row.status,
      depositStatus: depositPosted ? "POSTED" : "NOT_POSTED",
    })
    const vaultKey = buildDocumentArchiveRefKey(
      "COL",
      row.refId,
      "BANK_PAY_IN_SLIP"
    )
    archiveAvailable = resolveColBankPayInArchiveAvailable(
      {
        documentKind: "COL",
        documentId: row.refId,
        documentNo: resolvedDocumentNo,
        archiveKind: "BANK_PAY_IN_SLIP",
        workflowStatus,
      },
      vaultByKey?.get(vaultKey)
    )
  }

  return {
    id: row.id,
    voucherNo: row.voucherNo,
    date: row.date.toISOString(),
    legalEntityCode: row.legalEntityCode,
    periodKey: row.period.periodKey,
    refType: row.refType,
    refId: row.refId,
    refNo: row.refNo,
    description: row.description,
    status: row.status,
    totalDebit,
    totalCredit,
    branchId: row.branchId,
    branchCode: row.branch.code,
    branchName: row.branch.name,
    journalEntryId: row.journalEntry?.id ?? null,
    amount,
    documentTypeCode: resolveVoucherInquiryDocumentTypeCode(row.refType),
    documentNo: resolvedDocumentNo,
    pdfAvailable,
    archiveAvailable,
  }
}

function applyPostQueryFilters(
  rows: FinanceVoucherListRow[],
  filter: FinanceVoucherListFilter
): FinanceVoucherListRow[] {
  return rows.filter((row) => {
    if (!matchesAmountRange(row.amount, filter.amountMin, filter.amountMax)) {
      return false
    }
    if (!matchesPdfStateFilter(row.pdfAvailable, filter.pdfState)) {
      return false
    }
    return true
  })
}

async function loadColDepositPostedByRefId(
  prisma: FinanceVoucherListPrisma,
  refIds: string[]
): Promise<Map<string, boolean>> {
  if (refIds.length === 0 || !prisma.voucher) {
    return new Map()
  }

  const vouchers = await prisma.voucher.findMany({
    where: {
      refType: FINANCE_REF_TYPES.POS_SETTLEMENT_BANK_DEPOSIT,
      refId: { in: refIds },
    },
    select: {
      refId: true,
      journalEntry: {
        select: {
          lines: { select: { id: true }, take: 1 },
        },
      },
    },
  })

  return new Map(
    vouchers.map((row) => [
      row.refId,
      Boolean(row.journalEntry?.lines?.length),
    ])
  )
}

export async function listFinanceVouchers(
  prisma: FinanceVoucherListPrisma,
  filter: FinanceVoucherListFilter
): Promise<FinanceVoucherListResult> {
  const scopedFilter = applyVoucherInquiryRefTypeFilter(filter)
  const postingState = scopedFilter.postingState ?? "all"
  if (postingState === "unposted") {
    return { vouchers: [], total: 0 }
  }

  let periodId: string | null = null
  const periodKey = scopedFilter.periodKey?.trim()
  if (periodKey) {
    periodId = await resolvePeriodId(prisma, periodKey, scopedFilter.legalEntityCode)
    if (!periodId) {
      return { vouchers: [], total: 0 }
    }
  }

  const where = buildWhere(scopedFilter, periodId)
  const limit = Math.min(
    Math.max(Number(filter.limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 1),
    MAX_LIMIT
  )
  const offset = Math.max(Number(filter.offset ?? 0) || 0, 0)
  const hasPostFilters =
    filter.amountMin != null ||
    filter.amountMax != null ||
    Boolean(filter.pdfState)

  const [rows, totalBeforePostFilter] = await Promise.all([
    prisma.voucher.findMany({
      where,
      orderBy: [{ date: "desc" }, { voucherNo: "desc" }],
      take: hasPostFilters ? MAX_LIMIT : limit,
      skip: hasPostFilters ? 0 : offset,
      select: {
        id: true,
        voucherNo: true,
        date: true,
        legalEntityCode: true,
        refType: true,
        refId: true,
        refNo: true,
        description: true,
        status: true,
        branchId: true,
        branch: { select: { code: true, name: true } },
        period: { select: { periodKey: true } },
        journalEntry: {
          select: {
            id: true,
            lines: { select: { debit: true, credit: true } },
          },
        },
        lines: { select: { debit: true, credit: true } },
        manualJournalEntryPosted: {
          select: {
            entryNo: true,
            status: true,
            pdfPath: true,
            pdfBlobUrl: true,
          },
        },
        paymentVoucherPosted: { select: { entryNo: true } },
        revenueVoucherPosted: { select: { entryNo: true } },
        pettyCashVoucherPosted: { select: { entryNo: true } },
      },
    }),
    prisma.voucher.count({ where }),
  ])

  const posSaleIds = (rows as VoucherListDbRow[])
    .filter((row) => row.refType === FINANCE_REF_TYPES.POS_SALE)
    .map((row) => row.refId)
  const receiptBySaleId = prisma.receipt
    ? await loadPosOriginReceiptContextBySaleId(prisma, posSaleIds)
    : new Map()

  const manualJournalRefs = (rows as VoucherListDbRow[])
    .filter((row) => MANUAL_JOURNAL_FAMILY.has(row.refType))
    .map((row) => {
      const documentTypeCode = resolveVoucherInquiryDocumentTypeCode(row.refType)
      const documentKind = documentTypeCode === "OPB" ? "OPB" : "MJV"
      return {
        documentKind: documentKind as "MJV" | "OPB",
        documentId: row.refId,
        archiveKind: "DOCUMENT_PDF" as const,
      }
    })
  const operationalVoucherRefs = (rows as VoucherListDbRow[])
    .filter((row) => OPERATIONAL_VOUCHER_REF_TYPES.has(row.refType))
    .map((row) => {
      const documentKind = resolveOperationalVoucherDocumentKind(row.refType)
      return documentKind
        ? {
            documentKind,
            documentId: row.refId,
            archiveKind: "DOCUMENT_PDF" as const,
          }
        : null
    })
    .filter((ref): ref is NonNullable<typeof ref> => ref != null)
  const colRefIds = (rows as VoucherListDbRow[])
    .filter((row) => row.refType === FINANCE_REF_TYPES.POS_SETTLEMENT_COLLECTOR_PICKUP)
    .map((row) => row.refId)
  const colVaultRefs = colRefIds.map((refId) => ({
    documentKind: "COL" as const,
    documentId: refId,
    archiveKind: "BANK_PAY_IN_SLIP" as const,
  }))
  const vaultRefs = [...manualJournalRefs, ...operationalVoucherRefs, ...colVaultRefs]
  const vaultByKey =
    vaultRefs.length > 0
      ? await loadVaultArchivesForRefs(prisma, vaultRefs)
      : new Map<string, VaultArchiveRecord>()
  const colDepositPostedByRefId = await loadColDepositPostedByRefId(prisma, colRefIds)

  let vouchers = applyPostQueryFilters(
    (rows as VoucherListDbRow[]).map((row) =>
      mapVoucherRow(row, receiptBySaleId.get(row.refId), vaultByKey, colDepositPostedByRefId)
    ),
    scopedFilter
  )

  if (hasPostFilters) {
    const total = vouchers.length
    vouchers = vouchers.slice(offset, offset + limit)
    return { vouchers, total }
  }

  return { vouchers, total: totalBeforePostFilter }
}

export { parsePeriodDateRange }

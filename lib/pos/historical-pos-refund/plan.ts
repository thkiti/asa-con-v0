import type { PrismaClient } from "@/generated/prisma/client"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { toMoney, ZERO } from "@/lib/finance/decimal"
import { formatShopBranchCode } from "@/lib/import/validation/branch-code"
import {
  assertLegacySalesFileExists,
  resolveLegacySalesDbfPath,
} from "@/lib/import/legacy-sales/path"
import { parseHistoricalPostingDateRange } from "@/lib/pos/historical-sale-posting/date-range"
import type { HistoricalRefundCliOptions } from "./types"
import type {
  HistoricalRefundBranchTotal,
  HistoricalRefundDocument,
  HistoricalRefundPlan,
  HistoricalRefundPlanTotals,
} from "./types"
import {
  groupHistoricalRefundDocuments,
  loadHistoricalRefundSourceRows,
  moneyEquals,
} from "./source"

type PlanPrisma = Pick<
  PrismaClient,
  "branch" | "staff" | "legacyRefundReference" | "voucher"
>

function emptyTotals(): HistoricalRefundPlanTotals {
  return {
    sourceRows: 0,
    documents: 0,
    eligibleImport: 0,
    alreadyImported: 0,
    eligiblePosting: 0,
    alreadyPosted: 0,
    incompleteVoucher: 0,
    missingBranch: 0,
    missingStaff: 0,
    zeroAmount: 0,
    gross: "0",
    net: "0",
    vat: "0",
  }
}

export async function planHistoricalPosRefundImport(
  prisma: PlanPrisma,
  options: HistoricalRefundCliOptions
): Promise<HistoricalRefundPlan> {
  const range = parseHistoricalPostingDateRange(
    options.fromDateKey,
    options.beforeDateKey
  )
  const sourceFilePath = resolveLegacySalesDbfPath({ file: options.file })
  assertLegacySalesFileExists(sourceFilePath)

  const source = await loadHistoricalRefundSourceRows(sourceFilePath, {
    fromDateKey: range.fromDateKey,
    beforeDateKey: range.beforeDateKey,
  })

  let rows = source.refundRows
  if (options.branchCode?.trim()) {
    const wanted = options.branchCode.trim().toUpperCase()
    rows = rows.filter(
      (row) => formatShopBranchCode(row.legacyBranchId).toUpperCase() === wanted
    )
  }

  const grouped = groupHistoricalRefundDocuments(source.sourceFileName, rows)
  const limited =
    options.limit != null && Number.isFinite(options.limit) && options.limit > 0
      ? grouped.slice(0, options.limit)
      : grouped

  const branchCodes = [...new Set(limited.map((d) => d.branchCode).filter(Boolean))]
  const branches = await prisma.branch.findMany({
    where: { deleted: false, code: { in: branchCodes } },
    select: { id: true, code: true },
  })
  const branchByCode = new Map(branches.map((b) => [b.code, b.id]))

  const staffIds = [
    ...new Set(limited.map((d) => d.legacyStaffId).filter(Boolean)),
  ] as string[]
  const staffRows =
    staffIds.length > 0
      ? await prisma.staff.findMany({
          where: { deleted: false, staffId: { in: staffIds } },
          select: { staffId: true },
        })
      : []
  const staffSet = new Set(staffRows.map((s) => s.staffId))

  const existingRefs =
    limited.length === 0
      ? []
      : await prisma.legacyRefundReference.findMany({
          where: {
            sourceFileName: source.sourceFileName,
            OR: limited.map((d) => ({
              legacyBranchId: d.legacyBranchId,
              legacyRefundDate: d.legacyRefundDate,
              legacyTransNo: d.legacyTransNo,
            })),
          },
          select: {
            refundId: true,
            legacyBranchId: true,
            legacyRefundDate: true,
            legacyTransNo: true,
          },
        })
  const refByKey = new Map(
    existingRefs.map((r) => [
      `${source.sourceFileName}|${r.legacyBranchId}|${r.legacyRefundDate}|${r.legacyTransNo}`,
      r.refundId,
    ])
  )

  const refundIds = [...refByKey.values()]
  const vouchers =
    refundIds.length > 0
      ? await prisma.voucher.findMany({
          where: {
            refType: FINANCE_REF_TYPES.POS_REFUND,
            refId: { in: refundIds },
          },
          select: {
            refId: true,
            journalEntry: { select: { id: true } },
          },
        })
      : []
  const voucherByRefundId = new Map(
    vouchers.map((v) => [
      v.refId,
      v.journalEntry ? ("POSTED" as const) : ("INCOMPLETE" as const),
    ])
  )

  const documents: HistoricalRefundDocument[] = []
  const totals = emptyTotals()
  let gross = ZERO
  let net = ZERO
  let vat = ZERO

  for (const base of limited) {
    const branchId = branchByCode.get(base.branchCode) ?? null
    const staffId =
      base.legacyStaffId && staffSet.has(base.legacyStaffId)
        ? base.legacyStaffId
        : null

    let skipReason: HistoricalRefundDocument["skipReason"] = null
    const existingRefundId = refByKey.get(base.key) ?? null

    if (!branchId) {
      skipReason = "MISSING_BRANCH"
      totals.missingBranch += 1
    } else if (toMoney(base.gross).lte(ZERO)) {
      skipReason = "ZERO_AMOUNT"
      totals.zeroAmount += 1
    } else if (existingRefundId) {
      const voucherState = voucherByRefundId.get(existingRefundId)
      if (voucherState === "POSTED") {
        skipReason = "ALREADY_POSTED"
        totals.alreadyPosted += 1
        totals.alreadyImported += 1
      } else if (voucherState === "INCOMPLETE") {
        skipReason = "INCOMPLETE_VOUCHER"
        totals.incompleteVoucher += 1
        totals.alreadyImported += 1
      } else {
        skipReason = "ALREADY_IMPORTED"
        totals.alreadyImported += 1
        totals.eligiblePosting += 1
      }
    } else {
      totals.eligibleImport += 1
      totals.eligiblePosting += 1
    }

    if (!staffId && base.legacyStaffId) {
      totals.missingStaff += 1
    }

    gross = gross.plus(base.gross)
    net = net.plus(base.net)
    vat = vat.plus(base.vat)

    documents.push({
      ...base,
      branchId,
      staffId,
      skipReason,
    })
  }

  totals.sourceRows = rows.length
  totals.documents = documents.length
  totals.gross = gross.toFixed(2)
  totals.net = net.toFixed(2)
  totals.vat = vat.toFixed(2)

  if (!moneyEquals(gross, net.plus(vat))) {
    throw new Error(
      `Historical refund plan failed reconciliation: gross ${totals.gross} != net+vat ${net.plus(vat).toFixed(2)}`
    )
  }

  const byBranchMap = new Map<
    string,
    {
      branchCode: string
      legacyBranchId: string
      documents: number
      g: typeof ZERO
      n: typeof ZERO
      v: typeof ZERO
    }
  >()
  for (const doc of documents) {
    const next = byBranchMap.get(doc.branchCode) ?? {
      branchCode: doc.branchCode,
      legacyBranchId: doc.legacyBranchId,
      documents: 0,
      g: ZERO,
      n: ZERO,
      v: ZERO,
    }
    next.documents += 1
    next.g = next.g.plus(doc.gross)
    next.n = next.n.plus(doc.net)
    next.v = next.v.plus(doc.vat)
    byBranchMap.set(doc.branchCode, next)
  }

  const byBranch: HistoricalRefundBranchTotal[] = [...byBranchMap.values()]
    .map((b) => ({
      branchCode: b.branchCode,
      legacyBranchId: b.legacyBranchId,
      documents: b.documents,
      gross: b.g.toFixed(2),
      net: b.n.toFixed(2),
      vat: b.v.toFixed(2),
    }))
    .sort((a, b) => a.branchCode.localeCompare(b.branchCode))

  return {
    sourceFilePath: source.sourceFilePath,
    sourceFileName: source.sourceFileName,
    fromDateKey: range.fromDateKey,
    beforeDateKey: range.beforeDateKey,
    documents,
    totals,
    byBranch,
    sampleDocuments: documents.slice(0, 5),
  }
}

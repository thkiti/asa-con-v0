/**
 * DEVELOPMENT ONLY — inspect SMOKE01 branch dependents (read-only).
 * npx tsx scripts/inspect-smoke01-data.ts
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { requireDatabaseUrl } from "@/lib/shared/env"
import { prisma } from "@/lib/shared/prisma"
import { parseDatabaseTarget } from "@/lib/uat/finance-full-reset"

const BRANCH_CODE = "SMOKE01"

async function main() {
  const dbUrl = requireDatabaseUrl()
  const target = parseDatabaseTarget(dbUrl)
  console.log("Database:", target.maskedUrl)
  console.log("Host:", target.host, "local=", target.isLocalhost)

  const branch = await prisma.branch.findFirst({ where: { code: BRANCH_CODE } })
  if (!branch) {
    console.log(`No branch with code ${BRANCH_CODE}`)
    return
  }

  const id = branch.id
  const sales = await prisma.sale.findMany({
    where: { branchId: id },
    select: { id: true, total: true, createdAt: true, staffId: true },
  })
  const saleIds = sales.map((s) => s.id)
  const refunds = await prisma.refund.findMany({
    where: { branchId: id },
    select: { id: true, refundNo: true, saleId: true, amount: true },
  })
  const refundIds = refunds.map((r) => r.id)
  const receipts =
    saleIds.length > 0
      ? await prisma.receipt.findMany({
          where: { saleId: { in: saleIds } },
          select: {
            id: true,
            receiptNo: true,
            saleId: true,
            documentArchiveId: true,
          },
        })
      : []
  const payments =
    saleIds.length > 0
      ? await prisma.payment.findMany({
          where: { saleId: { in: saleIds } },
          select: { id: true, method: true, amount: true, saleId: true },
        })
      : []
  const paymentEvidence =
    saleIds.length > 0
      ? await prisma.paymentEvidence.findMany({
          where: { saleId: { in: saleIds } },
          select: { id: true, receiptNo: true, status: true },
        })
      : []
  const staff = await prisma.staff.findMany({
    where: { branchId: id },
    select: {
      id: true,
      staffId: true,
      name: true,
      role: true,
      deleted: true,
    },
  })
  const vouchers = await prisma.voucher.findMany({
    where: { branchId: id },
    select: {
      id: true,
      voucherNo: true,
      refType: true,
      refId: true,
      refNo: true,
    },
  })
  const voucherIds = vouchers.map((v) => v.id)
  const voucherLines =
    voucherIds.length > 0
      ? await prisma.voucherLine.count({
          where: { voucherId: { in: voucherIds } },
        })
      : 0
  const journals =
    voucherIds.length > 0
      ? await prisma.journalEntry.findMany({
          where: { voucherId: { in: voucherIds } },
          select: {
            id: true,
            voucherId: true,
            reversalOfJournalEntryId: true,
          },
        })
      : []
  const journalIds = journals.map((j) => j.id)
  const journalEntryLines =
    journalIds.length > 0
      ? await prisma.journalEntryLine.count({
          where: { journalEntryId: { in: journalIds } },
        })
      : 0

  const vouchersBySaleRef =
    saleIds.length > 0
      ? await prisma.voucher.findMany({
          where: {
            refType: FINANCE_REF_TYPES.POS_SALE,
            refId: { in: saleIds },
          },
          select: { id: true, voucherNo: true, branchId: true },
        })
      : []
  const vouchersByRefundRef =
    refundIds.length > 0
      ? await prisma.voucher.findMany({
          where: {
            refType: FINANCE_REF_TYPES.POS_REFUND,
            refId: { in: refundIds },
          },
          select: { id: true, voucherNo: true, branchId: true },
        })
      : []

  const stockTx = await prisma.stockTransaction.findMany({
    where: { branchId: id },
    select: { id: true, refType: true, refId: true, qtyOut: true, qtyIn: true },
  })
  const stockDocs = await prisma.stockDocument.findMany({
    where: { branchId: id },
    select: { id: true, docType: true, refNo: true, status: true },
  })
  const stocks = await prisma.stock.count({ where: { branchId: id } })
  const stockLayers = await prisma.stockLayer.count({ where: { branchId: id } })
  const collectors = await prisma.collectorReport.findMany({
    where: { branchId: id },
    select: { id: true },
  })
  const collectorIds = collectors.map((c) => c.id)
  const payIn =
    collectorIds.length > 0
      ? await prisma.posPayInEvidence.count({
          where: { collectorReportId: { in: collectorIds } },
        })
      : 0

  const archivesByBranch = await prisma.documentArchive.findMany({
    where: { branchId: id },
    select: {
      id: true,
      archiveKind: true,
      documentType: true,
      documentId: true,
    },
  })
  const receiptArchiveIds = receipts
    .map((r) => r.documentArchiveId)
    .filter((x): x is string => Boolean(x))
  const archivesViaReceiptFk =
    receiptArchiveIds.length > 0
      ? await prisma.documentArchive.findMany({
          where: { id: { in: receiptArchiveIds } },
          select: { id: true, documentType: true, documentId: true },
        })
      : []

  let archiveLinks = 0
  try {
    const or: Array<Record<string, unknown>> = []
    if (saleIds.length) {
      or.push({ documentKind: "REC", documentId: { in: saleIds } })
    }
    if (refundIds.length) {
      or.push({ documentKind: "REF", documentId: { in: refundIds } })
    }
    if (collectorIds.length) {
      or.push({ documentKind: "COL", documentId: { in: collectorIds } })
    }
    if (archivesByBranch.length) {
      or.push({ archiveId: { in: archivesByBranch.map((a) => a.id) } })
    }
    archiveLinks =
      or.length === 0
        ? 0
        : await prisma.documentArchiveLink.count({ where: { OR: or } })
  } catch {
    archiveLinks = -1
  }

  const salesTargets = await prisma.branchSalesTarget.count({
    where: { branchId: id },
  })
  const workTimeEntries = await prisma.workTimeEntry.count({
    where: { branchId: id },
  })
  const documentCounters = await prisma.documentCounter.count({
    where: { shopId: id },
  })
  const manualJournalEntries = await prisma.manualJournalEntry.count({
    where: { branchId: id },
  })
  const paymentVouchers = await prisma.paymentVoucher.count({
    where: { branchId: id },
  })
  const pettyCashVouchers = await prisma.pettyCashVoucher.count({
    where: { branchId: id },
  })
  const revenueVouchers = await prisma.revenueVoucher.count({
    where: { branchId: id },
  })
  const invoiceVouchers = await prisma.invoiceVoucher.count({
    where: { branchId: id },
  })
  const reconciliationSnapshots = await prisma.reconciliationSnapshot.count({
    where: { branchId: id },
  })
  const bankReconciliations = await prisma.bankReconciliation.count({
    where: { branchId: id },
  })
  const cashReconciliations = await prisma.cashReconciliation.count({
    where: { branchId: id },
  })
  const accountingPeriods = await prisma.accountingPeriod.count({
    where: { branchId: id },
  })
  const smokeProduct = await prisma.product.findFirst({
    where: { code: "SMOKE-PROD-001" },
    select: { id: true, code: true, name: true, deleted: true },
  })

  console.log(
    JSON.stringify(
      {
        branch,
        counts: {
          staff: staff.length,
          sales: sales.length,
          receipts: receipts.length,
          payments: payments.length,
          paymentEvidence: paymentEvidence.length,
          refunds: refunds.length,
          vouchers: vouchers.length,
          voucherLines,
          journals: journals.length,
          journalEntryLines,
          vouchersBySaleRef: vouchersBySaleRef.length,
          vouchersByRefundRef: vouchersByRefundRef.length,
          stockTransactions: stockTx.length,
          stockDocuments: stockDocs.length,
          stocks,
          stockLayers,
          collectorReports: collectors.length,
          posPayInEvidence: payIn,
          documentArchivesBranch: archivesByBranch.length,
          documentArchivesViaReceiptFk: archivesViaReceiptFk.length,
          documentArchiveLinks: archiveLinks,
          salesTargets,
          workTimeEntries,
          documentCounters,
          manualJournalEntries,
          paymentVouchers,
          pettyCashVouchers,
          revenueVouchers,
          invoiceVouchers,
          reconciliationSnapshots,
          bankReconciliations,
          cashReconciliations,
          accountingPeriods,
        },
        staff,
        sales,
        receipts,
        payments,
        refunds,
        vouchers,
        journals,
        stockDocs,
        stockTxSample: stockTx.slice(0, 15),
        archivesByBranch,
        archivesViaReceiptFk,
        smokeProduct,
      },
      null,
      2
    )
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

/**
 * Finance UAT reference backup — run BEFORE any reset.
 * Does not modify data.
 *
 * Usage: npx tsx scripts/uat/finance-uat-backup.ts
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import fs from "fs"
import path from "path"

import { getBalanceSheet } from "@/lib/finance/reports/balance-sheet"
import { getProfitLoss } from "@/lib/finance/reports/profit-loss"
import { getTrialBalance } from "@/lib/finance/reports/trial-balance"
import { balanceSheetToCsv } from "@/lib/finance-ui/balance-sheet"
import { profitLossToCsv } from "@/lib/finance-ui/profit-loss"
import { trialBalanceToCsv } from "@/lib/finance-ui/trial-balance"
import { prisma } from "@/lib/shared/prisma"

const OUT_DIR = path.resolve(
  `data/uat-backups/finance-pre-reset-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}`
)

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const [coaCount, branches, manualEntries, vouchersByRef] = await Promise.all([
      prisma.glAccount.count({ where: { deleted: false } }),
      prisma.branch.findMany({
        where: { deleted: false, isActive: true },
        orderBy: { code: "asc" },
        select: { id: true, code: true, name: true },
      }),
      prisma.manualJournalEntry.findMany({
        orderBy: [{ entryDate: "asc" }, { entryNo: "asc" }],
        select: {
          id: true,
          entryNo: true,
          entryType: true,
          status: true,
          legalEntityCode: true,
          entryDate: true,
          description: true,
          postedAt: true,
          postedJournalEntryId: true,
          postedVoucherId: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.voucher.groupBy({
        by: ["refType"],
        _count: { _all: true },
      }),
    ])

  const journalRefCounts = await prisma.$queryRaw<{ refType: string; count: bigint }[]>`
    SELECT v."refType" AS "refType", COUNT(j.id)::bigint AS count
    FROM "JournalEntry" j
    JOIN "Voucher" v ON v.id = j."voucherId"
    GROUP BY v."refType"
    ORDER BY v."refType"
  `.then((rows) => rows.map((r) => ({ refType: r.refType, count: Number(r.count) })))

  const periodKey = new Date().toISOString().slice(0, 7)
  const reportExports: Record<string, unknown> = {}

  for (const branch of branches) {
    const filter = { branchId: branch.id, periodKey }
    const [trialBalance, balanceSheet, profitLoss] = await Promise.all([
      getTrialBalance(prisma, filter),
      getBalanceSheet(prisma, filter),
      getProfitLoss(prisma, filter),
    ])

    const prefix = `${branch.code}-${periodKey}`
    fs.writeFileSync(
      path.join(OUT_DIR, `${prefix}-trial-balance.csv`),
      trialBalanceToCsv(trialBalance)
    )
    fs.writeFileSync(
      path.join(OUT_DIR, `${prefix}-balance-sheet.csv`),
      balanceSheetToCsv(balanceSheet)
    )
    fs.writeFileSync(
      path.join(OUT_DIR, `${prefix}-profit-loss.csv`),
      profitLossToCsv(profitLoss)
    )

    reportExports[prefix] = {
      trialBalance: {
        rowCount: trialBalance.rows.length,
        totalDebits: trialBalance.totalDebits,
        totalCredits: trialBalance.totalCredits,
        isBalanced: trialBalance.isBalanced,
      },
      balanceSheet: {
        totalAssets: balanceSheet.totalAssets,
        totalLiabilities: balanceSheet.totalLiabilities,
        totalEquity: balanceSheet.totalEquity,
        isBalanced: balanceSheet.isBalanced,
      },
      profitLoss: {
        totalRevenue: profitLoss.totalRevenue,
        totalExpense: profitLoss.totalExpense,
        netIncome: profitLoss.netIncome,
      },
    }
  }

  const openingBalanceEntries = manualEntries.filter(
    (e) => e.entryType === "OPENING_BALANCE"
  )

  const manifest = {
    exportedAt: new Date().toISOString(),
    outDir: OUT_DIR,
    preservedNote:
      "CoA, branches, staff, products, stock, POS sales are NOT exported here — only finance UAT reference snapshots.",
    counts: {
      chartOfAccounts: coaCount,
      activeBranches: branches.length,
      manualJournalEntries: manualEntries.length,
      openingBalanceDocuments: openingBalanceEntries.length,
    },
    openingBalanceDocuments: openingBalanceEntries.map((e) => ({
      entryNo: e.entryNo,
      status: e.status,
      legalEntityCode: e.legalEntityCode,
      entryDate: e.entryDate,
      description: e.description,
      postedAt: e.postedAt,
    })),
    manualJournalManifest: manualEntries,
    journalEntriesByRefType: journalRefCounts,
    vouchersByRefType: vouchersByRef.map((r) => ({
      refType: r.refType,
      count: r._count._all,
    })),
    reportExports,
  }

  fs.writeFileSync(path.join(OUT_DIR, "manifest.json"), JSON.stringify(manifest, null, 2))
  fs.writeFileSync(
    path.join(OUT_DIR, "manual-journal-entries.json"),
    JSON.stringify(manualEntries, null, 2)
  )

  console.log("Finance UAT backup written to:", OUT_DIR)
  console.log(JSON.stringify(manifest.counts, null, 2))
  console.log("Opening balance documents:", openingBalanceEntries.length)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

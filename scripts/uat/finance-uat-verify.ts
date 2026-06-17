/**
 * Post-reset verification for Finance UAT environment.
 *
 * Usage: npx tsx scripts/uat/finance-uat-verify.ts
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import { getBalanceSheet } from "@/lib/finance/reports/balance-sheet"
import { getProfitLoss } from "@/lib/finance/reports/profit-loss"
import { getTrialBalance } from "@/lib/finance/reports/trial-balance"
import { FINANCE_UAT_MANUAL_REF_TYPES } from "@/lib/uat/finance-uat-scopes"
import { prisma } from "@/lib/shared/prisma"

async function main() {
  const periodKey = new Date().toISOString().slice(0, 7)
  const branch = await prisma.branch.findFirst({
    where: { deleted: false, isActive: true },
    orderBy: { code: "asc" },
  })

  const [
    coaCount,
    manualCount,
    opbCount,
    manualGlJournals,
    allJournals,
    vouchersManual,
  ] = await Promise.all([
    prisma.glAccount.count({ where: { deleted: false } }),
    prisma.manualJournalEntry.count(),
    prisma.manualJournalEntry.count({ where: { entryType: "OPENING_BALANCE" } }),
    prisma.journalEntry.count({
      where: { voucher: { refType: { in: FINANCE_UAT_MANUAL_REF_TYPES } } },
    }),
    prisma.journalEntry.count(),
    prisma.voucher.count({
      where: { refType: { in: FINANCE_UAT_MANUAL_REF_TYPES } },
    }),
  ])

  let reportCheck = {
    branchCode: branch?.code ?? null,
    periodKey,
    trialBalanceRows: 0,
    trialBalanceActivity: false,
    balanceSheetAssets: "0",
    profitLossNetIncome: "0",
  }

  if (branch) {
    const entityFilter = { legalEntityCode: "AS" as const, periodKey }
    const plFilter = { legalEntityCode: "AS" as const, branchId: branch.id, periodKey }
    const [tb, bs, pl] = await Promise.all([
      getTrialBalance(prisma, entityFilter),
      getBalanceSheet(prisma, entityFilter),
      getProfitLoss(prisma, plFilter),
    ])
    const hasActivity = tb.rows.some(
      (r) => r.totalDebit !== "0" || r.totalCredit !== "0" || r.signedBalance !== "0"
    )
    reportCheck = {
      branchCode: branch.code,
      periodKey,
      trialBalanceRows: tb.rows.length,
      trialBalanceActivity: hasActivity,
      balanceSheetAssets: bs.totalAssets,
      profitLossNetIncome: pl.netIncome,
    }
  }

  const checks = {
    coaExists: coaCount > 0,
    openingBalanceListEmpty: opbCount === 0,
    manualJournalEntriesEmpty: manualCount === 0,
    noManualFinanceGl: manualGlJournals === 0 && vouchersManual === 0,
    trialBalanceNoActivity: !reportCheck.trialBalanceActivity,
    balanceSheetZeroAssets: reportCheck.balanceSheetAssets === "0",
    profitLossZeroNet: reportCheck.profitLossNetIncome === "0",
  }

  const allPass = Object.values(checks).every(Boolean)

  console.log("=== Finance UAT Verification ===")
  console.log(JSON.stringify({ counts: { coaCount, manualCount, opbCount, allJournals }, reportCheck }, null, 2))
  console.log("\nChecks:")
  for (const [key, pass] of Object.entries(checks)) {
    console.log(`  ${pass ? "PASS" : "FAIL"} ${key}`)
  }

  if (!checks.trialBalanceNoActivity && allJournals > 0) {
    console.log(
      "\nNote: Trial balance still has activity from non-manual journals (e.g. POS/stock)."
    )
    console.log(`  Remaining journal entries: ${allJournals}`)
  }

  console.log(allPass ? "\nUAT environment ready." : "\nUAT environment NOT ready — review failures.")
  process.exit(allPass ? 0 : 1)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

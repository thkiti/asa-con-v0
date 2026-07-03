/**
 * Diagnostic: Balance Sheet equity mismatch investigation.
 *
 * Usage:
 *   npx tsx scripts/finance/debug-balance-sheet-equity.ts
 *   npx tsx scripts/finance/debug-balance-sheet-equity.ts --entity=AD --period=2026-01
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import { GlAccountType } from "@/generated/prisma/client"
import { getBalanceSheet } from "@/lib/finance/reports/balance-sheet"
import { getChangesInEquity } from "@/lib/finance/reports/changes-in-equity"
import { getProfitLoss } from "@/lib/finance/reports/profit-loss"
import { getRetainedEarnings } from "@/lib/finance/reports/retained-earnings"
import { getTrialBalance } from "@/lib/finance/reports/trial-balance"
import { signedBalanceForAccountType } from "@/lib/finance/reports/balance-helpers"
import { RETAINED_EARNINGS_ACCOUNT_CODE } from "@/lib/finance/reports/retained-earnings"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import { accountingPeriodUniqueWhere } from "@/lib/finance/period-lookup"
import { periodKeyToReportDateRange } from "@/lib/finance/reports/report-filter"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { prisma } from "@/lib/shared/prisma"
import { addMoney, toMoney, ZERO } from "@/lib/finance/decimal"

function parseArgs(argv: string[]): { legalEntityCode: DocumentEntityCode; periodKey: string } {
  const entity =
    argv.find((a) => a.startsWith("--entity="))?.slice("--entity=".length) ?? "AD"
  const period =
    argv.find((a) => a.startsWith("--period="))?.slice("--period=".length) ?? "2026-01"
  return { legalEntityCode: entity as DocumentEntityCode, periodKey: period }
}

function fmt(amount: string | { toString(): string }): string {
  const n = Number(amount.toString())
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function section(title: string) {
  console.log(`\n=== ${title} ===`)
}

async function main() {
  const { legalEntityCode, periodKey } = parseArgs(process.argv.slice(2))
  const filter = { legalEntityCode, periodKey }

  console.log("Balance Sheet Equity Diagnostic")
  console.log("Entity:", legalEntityCode, "| Period:", periodKey)

  const period = await prisma.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({ periodKey, legalEntityCode }),
    select: { id: true, status: true },
  })
  if (!period) {
    console.error("Accounting period not found for", legalEntityCode, periodKey)
    process.exit(1)
  }
  console.log("Period status:", period.status)

  const allEquityAccounts = await prisma.glAccount.findMany({
    where: { deleted: false, isActive: true, accountType: GlAccountType.EQUITY },
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, accountType: true },
  })

  const { endExclusive } = periodKeyToReportDateRange(periodKey).range
  const journalWhere = {
    legalEntityCode,
    date: { lt: endExclusive },
  }

  const equityBalances = new Map<string, { debit: typeof ZERO; credit: typeof ZERO }>()
  for (const account of allEquityAccounts) {
    equityBalances.set(account.id, { debit: ZERO, credit: ZERO })
  }

  const lines = await prisma.journalEntryLine.findMany({
    where: {
      glAccountId: { in: allEquityAccounts.map((a) => a.id) },
      journalEntry: journalWhere,
    },
    select: {
      glAccountId: true,
      debit: true,
      credit: true,
      journalEntry: {
        select: {
          id: true,
          date: true,
          voucher: { select: { refType: true, voucherNo: true } },
        },
      },
    },
  })

  const openingBalanceLines = lines.filter(
    (l) => l.journalEntry.voucher.refType === FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL
  )

  for (const line of lines) {
    const bal = equityBalances.get(line.glAccountId)!
    bal.debit = addMoney(bal.debit, toMoney(line.debit))
    bal.credit = addMoney(bal.credit, toMoney(line.credit))
  }

  const [balanceSheet, profitLoss, retainedEarnings, changesInEquity, trialBalance] =
    await Promise.all([
      getBalanceSheet(prisma, filter),
      getProfitLoss(prisma, filter),
      getRetainedEarnings(prisma, filter),
      getChangesInEquity(prisma, filter),
      getTrialBalance(prisma, { ...filter, hideZeroBalances: false }),
    ])

  const bsEquityCodes = new Set(balanceSheet.equity.map((r) => r.accountCode))
  const tbEquityRows = trialBalance.rows.filter((r) => r.accountType === GlAccountType.EQUITY)

  section("Chart of Accounts — EQUITY accounts")
  for (const account of allEquityAccounts) {
    const bal = equityBalances.get(account.id)!
    const signed = signedBalanceForAccountType(
      GlAccountType.EQUITY,
      bal.debit,
      bal.credit
    )
    const inBs = bsEquityCodes.has(account.code)
    const hasActivity = !bal.debit.equals(ZERO) || !bal.credit.equals(ZERO)
    console.log(
      [
        account.code.padEnd(4),
        account.name.slice(0, 40).padEnd(42),
        `signed=${fmt(signed)}`.padEnd(18),
        hasActivity ? "HAS_ACTIVITY" : "zero",
        inBs ? "IN_BS" : "NOT_IN_BS",
      ].join(" | ")
    )
  }

  section("Balance Sheet totals")
  console.log("Total Assets:              ", fmt(balanceSheet.totalAssets))
  console.log("Total Liabilities:         ", fmt(balanceSheet.totalLiabilities))
  console.log("Total Equity (posted only):", fmt(balanceSheet.totalEquity))
  console.log("Liabilities + Equity:      ", fmt(balanceSheet.totalLiabilitiesAndEquity))
  console.log("Balance difference:        ", fmt(balanceSheet.balanceDifference))
  console.log("Is balanced (posted):      ", balanceSheet.isBalanced)

  section("Equity accounts INCLUDED in Balance Sheet")
  if (balanceSheet.equity.length === 0) {
    console.log("(none)")
  } else {
    for (const row of balanceSheet.equity) {
      console.log(`  ${row.accountCode} ${row.accountName}: ${fmt(row.amount)}`)
    }
  }

  section("Equity accounts EXCLUDED from Balance Sheet (non-zero cumulative)")
  let excludedCount = 0
  for (const account of allEquityAccounts) {
    if (bsEquityCodes.has(account.code)) continue
    const bal = equityBalances.get(account.id)!
    const signed = signedBalanceForAccountType(
      GlAccountType.EQUITY,
      bal.debit,
      bal.credit
    )
    if (signed.equals(ZERO) && bal.debit.equals(ZERO) && bal.credit.equals(ZERO)) continue
    excludedCount++
    console.log(`  ${account.code} ${account.name}: signed=${fmt(signed)} (unexpected exclusion)`)
  }
  if (excludedCount === 0) {
    console.log("(none with non-zero balance)")
  }

  section("Profit & Loss (current period)")
  console.log("Net income:", fmt(profitLoss.netIncome))
  console.log("Expected (auditor): -22,322.02")
  console.log(
    "Matches auditor:",
    profitLoss.netIncome === "-22322.02" || profitLoss.netIncome === "-22322.020000"
      ? "YES"
      : `NO (got ${profitLoss.netIncome})`
  )

  section("Retained Earnings bridge")
  console.log("Posted retained earnings (301):", fmt(retainedEarnings.postedRetainedEarnings))
  console.log("Other equity total:          ", fmt(retainedEarnings.otherEquityTotal))
  console.log("Posted total equity:           ", fmt(retainedEarnings.postedTotalEquity))
  console.log("Current net income:            ", fmt(retainedEarnings.currentNetIncome))
  console.log("Adjusted retained earnings:    ", fmt(retainedEarnings.adjustedRetainedEarnings))
  console.log("Adjusted total equity:         ", fmt(retainedEarnings.adjustedTotalEquity))
  console.log("Unclosed earnings gap:         ", fmt(retainedEarnings.unclosedEarningsGap))
  console.log("Economically balanced:         ", retainedEarnings.isEconomicallyBalanced)
  if (retainedEarnings.warnings.length > 0) {
    console.log("Warnings:")
    for (const w of retainedEarnings.warnings) {
      console.log(`  [${w.code}] ${w.message}`)
    }
  }

  section("Statement of Changes in Equity")
  console.log("Profit for period:", fmt(changesInEquity.profitForPeriod))
  console.log("Profit source:", changesInEquity.profitSource)
  console.log("Columns:", changesInEquity.columns.map((c) => c.accountCode).join(", ") || "(none)")
  for (const row of changesInEquity.rows) {
    console.log(`  ${row.label}: total=${fmt(row.total)}`, row.amounts)
  }
  if (changesInEquity.warnings.length > 0) {
    console.log("Warnings:")
    for (const w of changesInEquity.warnings) {
      console.log(`  [${w.code}] ${w.message}`)
    }
  }

  section("Equity journal sources (by refType)")
  const refTypeTotals = new Map<string, typeof ZERO>()
  for (const line of lines) {
    const refType = line.journalEntry.voucher.refType
    const account = allEquityAccounts.find((a) => a.id === line.glAccountId)!
    const movement = signedBalanceForAccountType(
      GlAccountType.EQUITY,
      toMoney(line.debit),
      toMoney(line.credit)
    )
    refTypeTotals.set(refType, addMoney(refTypeTotals.get(refType) ?? ZERO, movement))
  }
  for (const [refType, total] of [...refTypeTotals.entries()].sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    if (total.equals(ZERO)) continue
    console.log(`  ${refType}: ${fmt(total)}`)
  }

  const obByAccount = new Map<string, { debit: typeof ZERO; credit: typeof ZERO }>()
  for (const account of allEquityAccounts) {
    obByAccount.set(account.id, { debit: ZERO, credit: ZERO })
  }
  for (const line of openingBalanceLines) {
    const bal = obByAccount.get(line.glAccountId)!
    bal.debit = addMoney(bal.debit, toMoney(line.debit))
    bal.credit = addMoney(bal.credit, toMoney(line.credit))
  }
  let obTotal = ZERO
  for (const account of allEquityAccounts) {
    const bal = obByAccount.get(account.id)!
    const signed = signedBalanceForAccountType(
      GlAccountType.EQUITY,
      bal.debit,
      bal.credit
    )
    if (signed.equals(ZERO) && bal.debit.equals(ZERO) && bal.credit.equals(ZERO)) continue
    obTotal = addMoney(obTotal, signed)
    console.log(`  ${account.code} ${account.name}: ${fmt(signed)}`)
  }
  if (obTotal.equals(ZERO)) {
    console.log("(no opening balance equity lines)")
  } else {
    console.log("Opening balance equity total:", fmt(obTotal))
  }

  section("Auditor-style adjusted equity (posted equity + current P&L)")
  const adjustedEquity = addMoney(
    toMoney(balanceSheet.totalEquity),
    toMoney(profitLoss.netIncome)
  )
  const adjustedRetainedEarnings = addMoney(
    toMoney(retainedEarnings.postedRetainedEarnings),
    toMoney(profitLoss.netIncome)
  )
  const adjustedLiabPlusEquity = addMoney(
    toMoney(balanceSheet.totalLiabilities),
    adjustedEquity
  )
  const adjustedDiff = toMoney(balanceSheet.totalAssets).minus(adjustedLiabPlusEquity)
  const bsGap = toMoney(balanceSheet.balanceDifference)
  const netIncome = toMoney(profitLoss.netIncome)
  const gapEqualsNetIncome = bsGap.equals(netIncome)
  const equityGapVsAuditor = toMoney(balanceSheet.totalEquity).minus(adjustedEquity)

  console.log("Auditor-style equity breakdown:")
  console.log("  Paid-up Capital (1):       ", fmt("2000000")) // reference from BS row
  for (const row of balanceSheet.equity) {
    if (row.accountCode === "1" || row.accountCode === "101") {
      console.log(`  ${row.accountName} (${row.accountCode}):`, fmt(row.amount))
    }
  }
  console.log("  Retained Earnings (301) adj:", fmt(adjustedRetainedEarnings))
  console.log("Adjusted total equity:     ", fmt(adjustedEquity))
  console.log("BS equity minus auditor eq:", fmt(equityGapVsAuditor))
  console.log("Assets - (Liab + Adj Eq):  ", fmt(adjustedDiff))
  console.log(
    "Gap vs auditor equity explained by missing P&L bridge:",
    gapEqualsNetIncome
      ? "YES — BS equity excludes current-period net income"
      : "NO — investigate further"
  )
  console.log(
    "Balance difference equals |net income|:",
    bsGap.abs().equals(netIncome.abs()) ? "YES" : "NO"
  )

  section("Trial balance equity rows (reference)")
  for (const row of tbEquityRows) {
    const zero = row.totalDebit === "0" && row.totalCredit === "0"
    if (zero) continue
    console.log(
      `  ${row.accountCode} ${row.accountName}: signed=${fmt(row.signedBalance)}`
    )
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

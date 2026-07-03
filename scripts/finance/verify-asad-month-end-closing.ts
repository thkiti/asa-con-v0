/**
 * Verify ASAD month-end closing workflow (Finance Core 16H + period SOFT close).
 *
 * Usage:
 *   npx tsx scripts/finance/verify-asad-month-end-closing.ts
 *   npx tsx scripts/finance/verify-asad-month-end-closing.ts --entity=AD --period=2026-01
 *   npx tsx scripts/finance/verify-asad-month-end-closing.ts --execute
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import { AccountingPeriodStatus } from "@/generated/prisma/client"
import { previewClosingEntry, postClosingEntry } from "@/lib/finance/closing-entry-post"
import { CLOSING_ENTRY_LINE_REASONS } from "@/lib/finance/closing-entry-types"
import { getActiveClosingEntry } from "@/lib/finance/closing-entry-status"
import { getBalanceSheet } from "@/lib/finance/reports/balance-sheet"
import { getProfitLoss } from "@/lib/finance/reports/profit-loss"
import { RETAINED_EARNINGS_ACCOUNT_CODE } from "@/lib/finance/reports/retained-earnings"
import { accountingPeriodUniqueWhere } from "@/lib/finance/period-lookup"
import { closeAccountingPeriod } from "@/lib/finance/period-close"
import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { prisma } from "@/lib/shared/prisma"
import { addMoney, toMoney } from "@/lib/finance/decimal"

const EXPECTED_NET_INCOME = "-22322.02"
const EXPECTED_ADJUSTED_EQUITY = "4114447.05"
const EXPECTED_ADJUSTED_RE = "1914447.05"

function parseArgs(argv: string[]) {
  const entity =
    argv.find((a) => a.startsWith("--entity="))?.slice("--entity=".length) ?? "AD"
  const period =
    argv.find((a) => a.startsWith("--period="))?.slice("--period=".length) ?? "2026-01"
  const execute = argv.includes("--execute")
  return {
    legalEntityCode: entity as DocumentEntityCode,
    periodKey: period,
    execute,
  }
}

function fmt(amount: string): string {
  return Number(amount).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function section(title: string) {
  console.log(`\n=== ${title} ===`)
}

async function main() {
  const { legalEntityCode, periodKey, execute } = parseArgs(process.argv.slice(2))

  console.log("ASAD Month-End Closing Verification")
  console.log("Entity:", legalEntityCode, "| Period:", periodKey)
  console.log("Mode:", execute ? "EXECUTE (post + soft close)" : "DRY RUN")

  const period = await prisma.accountingPeriod.findUnique({
    where: accountingPeriodUniqueWhere({ periodKey, legalEntityCode }),
  })
  if (!period) {
    console.error("Period not found:", legalEntityCode, periodKey)
    process.exit(1)
  }

  console.log("Period id:", period.id)
  console.log("Period status:", period.status)

  // Step 1 — P&L
  section("Step 1 — Profit & Loss")
  const profitLoss = await getProfitLoss(prisma, { legalEntityCode, periodKey })
  console.log("Net income:", fmt(profitLoss.netIncome))
  console.log("Expected:  ", fmt(EXPECTED_NET_INCOME))
  const plOk = profitLoss.netIncome === EXPECTED_NET_INCOME
  console.log("Match:", plOk ? "YES" : "NO")

  // Step 2 — Preview closing entry
  section("Step 2 — Closing entry preview (16H)")
  const preview = await previewClosingEntry(prisma, {
    periodId: period.id,
    periodKey,
  })
  const sim = preview.simulation
  console.log("Period status:", preview.periodStatus)
  console.log("Required:", sim.isRequired)
  console.log("Balanced:", sim.isBalanced)
  console.log("Net income:", fmt(sim.netIncome))
  console.log("Can post:", preview.canPost)
  console.log("Active entry:", preview.activeEntry?.voucherNo ?? "(none)")
  console.log("Line count:", sim.lines.length)

  const reLine = sim.lines.find((l) => l.accountCode === RETAINED_EARNINGS_ACCOUNT_CODE)
  const revenueLines = sim.lines.filter(
    (l) => l.reason === CLOSING_ENTRY_LINE_REASONS.CLOSE_REVENUE
  )
  const expenseLines = sim.lines.filter(
    (l) => l.reason === CLOSING_ENTRY_LINE_REASONS.CLOSE_EXPENSE
  )

  // Step 3 — Confirm 301 transfer
  section("Step 3 — Retained earnings transfer (account 301)")
  if (!reLine) {
    console.log("ERROR: No line for account 301 in simulation")
  } else {
    console.log("Account 301 line:")
    console.log("  Debit: ", reLine.debit)
    console.log("  Credit:", reLine.credit)
    console.log("  Reason:", reLine.reason)
    const expectedReason = CLOSING_ENTRY_LINE_REASONS.TRANSFER_NET_LOSS_TO_RE
    console.log("Expected reason:", expectedReason)
    console.log(
      "Transfers loss to 301:",
      reLine.reason === expectedReason && reLine.debit === "22322.02" ? "YES" : "CHECK"
    )
  }
  console.log(`Revenue close lines: ${revenueLines.length}`)
  console.log(`Expense close lines: ${expenseLines.length}`)

  const previewOk =
    sim.isRequired &&
    sim.isBalanced &&
    sim.netIncome === EXPECTED_NET_INCOME &&
    reLine?.reason === CLOSING_ENTRY_LINE_REASONS.TRANSFER_NET_LOSS_TO_RE &&
    reLine.debit === "22322.02"

  // Pre-close balance sheet
  section("Balance Sheet (before closing entry)")
  const bsBefore = await getBalanceSheet(prisma, { legalEntityCode, periodKey })
  console.log("Total equity:", fmt(bsBefore.totalEquity))
  console.log("Balance difference:", fmt(bsBefore.balanceDifference))
  console.log("Is balanced:", bsBefore.isBalanced)

  // Step 4 — Post closing entry
  section("Step 4 — Post closing entry")
  let postedVoucherNo: string | null = null
  if (!execute) {
    console.log("Skipped (dry run). Use --execute to post.")
  } else if (!previewOk) {
    console.log("Skipped — preview validation failed.")
    process.exit(1)
  } else if (period.status !== AccountingPeriodStatus.OPEN) {
    console.log("Skipped — period is not OPEN (status:", period.status, ")")
  } else if (preview.activeEntry) {
    console.log("Already posted:", preview.activeEntry.voucherNo)
    postedVoucherNo = preview.activeEntry.voucherNo
  } else {
    const result = await prisma.$transaction((tx) =>
      postClosingEntry(tx, { periodId: period.id, periodKey })
    )
    if (!result.posted) {
      console.log("Not posted:", result.reason ?? "unknown")
    } else {
      console.log("Posted:", result.voucherNo)
      console.log("Journal:", result.journalEntryId)
      console.log("Net income:", fmt(result.netIncome))
      console.log("Line count:", result.lineCount)
      console.log("Already existed:", result.alreadyPosted ?? false)
      postedVoucherNo = result.voucherNo
    }
  }

  // Verify voucher ref type
  if (postedVoucherNo || preview.activeEntry) {
    const voucherNo = postedVoucherNo ?? preview.activeEntry!.voucherNo
    const voucher = await prisma.voucher.findFirst({
      where: { voucherNo },
      select: { refType: true, voucherNo: true, refNo: true },
    })
    section("Closing entry voucher verification")
    console.log("Voucher:", voucher?.voucherNo)
    console.log("refType:", voucher?.refType)
    console.log("refNo:", voucher?.refNo)
    console.log(
      "Is PERIOD_CLOSING_ENTRY:",
      voucher?.refType === FINANCE_REF_TYPES.PERIOD_CLOSING_ENTRY ? "YES" : "NO"
    )
  }

  // Step 5 — Soft close period
  section("Step 5 — Period SOFT close")
  let periodAfter = await prisma.accountingPeriod.findUnique({ where: { id: period.id } })
  if (!execute) {
    console.log("Skipped (dry run). Use --execute to soft close.")
  } else if (periodAfter?.status === AccountingPeriodStatus.SOFT_CLOSED) {
    console.log("Already SOFT_CLOSED")
  } else if (periodAfter?.status === AccountingPeriodStatus.HARD_CLOSED) {
    console.log("Already HARD_CLOSED")
  } else if (periodAfter?.status === AccountingPeriodStatus.OPEN) {
    const active = await getActiveClosingEntry(prisma, period.id)
    if (!active) {
      console.log("Skipped — no active closing entry posted yet.")
    } else {
      await prisma.$transaction((tx) =>
        closeAccountingPeriod(tx, { periodKey, legalEntityCode, mode: "SOFT" })
      )
      periodAfter = await prisma.accountingPeriod.findUnique({ where: { id: period.id } })
      console.log("Period status now:", periodAfter?.status)
    }
  }

  // Step 6–7 — Balance sheet after closing
  section("Step 6–7 — Balance Sheet (after closing entry)")
  const bsAfter = await getBalanceSheet(prisma, { legalEntityCode, periodKey })
  const reRow = bsAfter.equity.find((r) => r.accountCode === RETAINED_EARNINGS_ACCOUNT_CODE)
  console.log("Total assets:     ", fmt(bsAfter.totalAssets))
  console.log("Total liabilities: ", fmt(bsAfter.totalLiabilities))
  console.log("Total equity:      ", fmt(bsAfter.totalEquity))
  console.log("Account 301:       ", reRow ? fmt(reRow.amount) : "(missing)")
  console.log("Expected equity:   ", fmt(EXPECTED_ADJUSTED_EQUITY))
  console.log("Expected 301:      ", fmt(EXPECTED_ADJUSTED_RE))
  console.log("Balance difference:", fmt(bsAfter.balanceDifference))
  console.log("Is balanced:       ", bsAfter.isBalanced)

  const equityOk = bsAfter.totalEquity === EXPECTED_ADJUSTED_EQUITY
  const reOk = reRow?.amount === EXPECTED_ADJUSTED_RE
  const balancedOk = bsAfter.isBalanced

  section("Verification summary")
  console.log("P&L net income matches auditor:     ", plOk ? "PASS" : "FAIL")
  console.log("Closing preview correct:            ", previewOk ? "PASS" : "FAIL")
  console.log("BS equity matches auditor:          ", equityOk ? "PASS" : "FAIL")
  console.log("BS account 301 matches auditor:     ", reOk ? "PASS" : "FAIL")
  console.log("BS balanced after closing entry:    ", balancedOk ? "PASS" : "FAIL")

  await prisma.$disconnect()

  if (!plOk || !previewOk) {
    process.exit(1)
  }
  if (execute && (!equityOk || !balancedOk)) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

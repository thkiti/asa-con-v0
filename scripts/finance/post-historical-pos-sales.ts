/**
 * Historical POS sale posting — dry run by default.
 *
 * Generates POS_SALE vouchers/journals from existing Sale + Receipt rows.
 *
 * Accounting policy (transaction-level posting, monthly rounding MJV):
 *   docs/migration/HISTORICAL_POS_MIGRATION_POLICY.md
 *
 * Usage:
 *   npx tsx scripts/finance/post-historical-pos-sales.ts
 *   npx tsx scripts/finance/post-historical-pos-sales.ts --month=2026-01
 *   npx tsx scripts/finance/post-historical-pos-sales.ts --branch=SH001 --limit=100
 *   npx tsx scripts/finance/post-historical-pos-sales.ts --execute --confirm=HISTORICAL_POS_POSTING_CONFIRMED
 */
import "dotenv/config"
import { writeFileSync } from "fs"
import { resolve } from "path"
import { config } from "dotenv"
config({ path: ".env.local" })

import { requireDatabaseUrl } from "@/lib/shared/env"
import { prisma } from "@/lib/shared/prisma"
import { parseDatabaseTarget } from "@/lib/uat/finance-full-reset"
import {
  parseHistoricalPostingArgs,
  validateHistoricalPostingExecute,
} from "@/lib/pos/historical-sale-posting/cli-args"
import {
  DEFAULT_HISTORICAL_BEFORE,
  DEFAULT_HISTORICAL_FROM,
  HISTORICAL_POS_POSTING_CONFIRM_TOKEN,
} from "@/lib/pos/historical-sale-posting/constants"
import { parseHistoricalPostingDateRange } from "@/lib/pos/historical-sale-posting/date-range"
import {
  buildHistoricalPostingCsvContent,
  historicalPostingCsvFilename,
} from "@/lib/pos/historical-sale-posting/export-csv"
import { executeHistoricalPosSalePosting } from "@/lib/pos/historical-sale-posting/execute"
import {
  formatHistoricalPostingReconciliationTable,
  formatHistoricalPostingSampleTable,
  formatHistoricalPostingShopTable,
  formatHistoricalPostingSkipSummary,
  formatHistoricalPostingStructuredSummary,
} from "@/lib/pos/historical-sale-posting/format-report"
import { planHistoricalPosSalePosting } from "@/lib/pos/historical-sale-posting/plan"

async function main() {
  const cli = parseHistoricalPostingArgs(process.argv.slice(2))
  const dbUrl = requireDatabaseUrl()
  const dbTarget = parseDatabaseTarget(dbUrl)
  const range = parseHistoricalPostingDateRange(cli.fromDateKey, cli.beforeDateKey)

  console.log("=== Historical POS Sale Posting (REC-3) ===")
  console.log("Mode:", cli.execute ? "EXECUTE" : "DRY RUN")
  console.log("Range:", `[${range.fromDateKey}, ${range.beforeDateKey}) Bangkok`)
  if (cli.branchCode) console.log("Branch filter:", cli.branchCode)
  if (cli.limit) console.log("Limit:", cli.limit)
  console.log("Database host:", dbTarget.host)
  console.log("Database name:", dbTarget.database)
  console.log("Database URL:", dbTarget.maskedUrl)
  if (!dbTarget.isLocalhost) {
    console.log(
      `Remote database — execute requires --confirm=${HISTORICAL_POS_POSTING_CONFIRM_TOKEN}`
    )
  }

  try {
    validateHistoricalPostingExecute(cli, dbUrl)
  } catch (err) {
    console.error("\n", err instanceof Error ? err.message : err)
    process.exit(1)
  }

  const plan = await planHistoricalPosSalePosting(prisma, {
    range,
    branchCode: cli.branchCode,
    limit: cli.limit,
  })

  console.log("\n--- Summary ---")
  console.log("total sales:", plan.totalSales)
  console.log("eligible sales:", plan.eligibleCount)
  console.log("expected vouchers:", plan.expectedVoucherCount)
  console.log(formatHistoricalPostingSkipSummary(plan))

  console.log("\n--- Per-shop summary ---")
  console.log(formatHistoricalPostingShopTable(plan))

  console.log("\n--- Sample eligible sales ---")
  console.log(formatHistoricalPostingSampleTable(plan))

  console.log("\n--- Reconciliation ---")
  console.log(formatHistoricalPostingReconciliationTable(plan))

  console.log("\n--- Structured summary ---")
  console.log(formatHistoricalPostingStructuredSummary(plan))

  if (cli.csv) {
    const csvFilename = historicalPostingCsvFilename(plan)
    const csvPath = resolve(process.cwd(), csvFilename)
    writeFileSync(csvPath, buildHistoricalPostingCsvContent(plan.csvRows), "utf8")
    console.log(`\nCSV written: ${csvPath}`)
  }

  if (!cli.execute) {
    console.log("\nDry run complete. No vouchers created.")
    console.log(
      "To execute:\n  npx tsx scripts/finance/post-historical-pos-sales.ts",
      `--from=${DEFAULT_HISTORICAL_FROM}`,
      `--before=${DEFAULT_HISTORICAL_BEFORE}`,
      `--execute --confirm=${HISTORICAL_POS_POSTING_CONFIRM_TOKEN}`
    )
    return
  }

  if (plan.eligibleRows.length === 0) {
    console.log("\nNothing eligible to post.")
    return
  }

  console.log("\nExecuting historical posting…")
  const result = await executeHistoricalPosSalePosting(prisma, plan)

  console.log("\n--- Execute result ---")
  console.log(
    JSON.stringify(
      {
        attempted: result.attempted,
        created: result.created,
        alreadyPosted: result.alreadyPosted,
        failedCount: result.failed.length,
        failures: result.failed,
      },
      null,
      2
    )
  )

  if (result.failed.length > 0) {
    console.error("\nHistorical posting completed with failures.")
    process.exit(1)
  }

  console.log("\nHistorical posting complete.")
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

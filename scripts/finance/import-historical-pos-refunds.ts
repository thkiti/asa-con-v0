/**
 * Historical ASAS POS refund import from SAE.dbf (R* S_TRANS).
 *
 * Dry-run (default):
 *   npx tsx scripts/finance/import-historical-pos-refunds.ts --month=2026-01
 *
 * Execute (requires confirm on remote DB):
 *   npx tsx scripts/finance/import-historical-pos-refunds.ts --month=2026-01 --execute --confirm=HISTORICAL_POS_REFUND_IMPORT_CONFIRMED
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import { requireDatabaseUrl } from "@/lib/shared/env"
import { prisma } from "@/lib/shared/prisma"
import { parseDatabaseTarget } from "@/lib/uat/finance-full-reset"
import {
  executeHistoricalPosRefundImport,
  formatHistoricalRefundExecuteReport,
  formatHistoricalRefundPlanReport,
  parseHistoricalRefundImportArgs,
  planHistoricalPosRefundImport,
  validateHistoricalRefundImportExecute,
  writeHistoricalRefundPlanCsv,
  HISTORICAL_POS_REFUND_IMPORT_CONFIRM_TOKEN,
} from "@/lib/pos/historical-pos-refund"

async function main() {
  const options = parseHistoricalRefundImportArgs(process.argv.slice(2))
  const dbUrl = requireDatabaseUrl()
  const dbTarget = parseDatabaseTarget(dbUrl)

  console.log("=== Historical POS Refund Import ===")
  console.log("Mode:", options.execute ? "EXECUTE" : "DRY RUN")
  console.log("Database host:", dbTarget.host)
  console.log("Database name:", dbTarget.database)
  if (options.monthKey) console.log("Month:", options.monthKey)
  console.log(`Range: ${options.fromDateKey} .. < ${options.beforeDateKey}`)
  if (options.branchCode) console.log("Branch filter:", options.branchCode)

  validateHistoricalRefundImportExecute(options, dbUrl)

  const plan = await planHistoricalPosRefundImport(prisma, options)
  console.log("\n" + formatHistoricalRefundPlanReport(plan))

  if (options.csv) {
    const scope = options.monthKey ?? `${options.fromDateKey}_${options.beforeDateKey}`
    const filename = `historical-pos-refunds-${scope}.csv`
    writeHistoricalRefundPlanCsv(plan, filename)
    console.log(`\nCSV written: ${filename}`)
  }

  if (!options.execute) {
    console.log("\nDry-run only — no Refund / Voucher / Journal writes.")
    console.log("To execute:")
    const fileFlag = options.file ? ` --file=${options.file}` : ""
    const monthFlag = options.monthKey ?? "2026-01"
    console.log(
      `  npx tsx scripts/finance/import-historical-pos-refunds.ts --month=${monthFlag}${fileFlag} --execute --confirm=${HISTORICAL_POS_REFUND_IMPORT_CONFIRM_TOKEN}`
    )
    return
  }

  const result = await executeHistoricalPosRefundImport(prisma, plan)
  console.log("\n" + formatHistoricalRefundExecuteReport(result))
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

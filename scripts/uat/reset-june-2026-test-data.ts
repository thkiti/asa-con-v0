/**
 * June 2026 UAT / smoke / mock data reset — DRY RUN by default.
 *
 * Deletes operational POS/Shop/Finance test data in [from, before) while preserving
 * Jan–May 2026 baseline and all master/setup tables.
 *
 * Usage:
 *   npx tsx scripts/uat/reset-june-2026-test-data.ts
 *   npx tsx scripts/uat/reset-june-2026-test-data.ts --from=2026-06-01 --before=2026-07-01
 *   npx tsx scripts/uat/reset-june-2026-test-data.ts --execute --confirm=JUNE_UAT_RESET_CONFIRMED
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import { requireDatabaseUrl } from "@/lib/shared/env"
import { prisma } from "@/lib/shared/prisma"
import { parseDatabaseTarget } from "@/lib/uat/finance-full-reset"
import {
  countProtectedMasterData,
  countUatResetTargets,
  DEFAULT_UAT_RESET_BEFORE,
  DEFAULT_UAT_RESET_FROM,
  executeUatReset,
  JUNE_UAT_RESET_CONFIRM_TOKEN,
  parseUatResetArgs,
  parseUatResetDateRange,
  resolveUatResetScope,
  validateUatResetExecute,
} from "@/lib/uat/june-uat-reset"

async function main() {
  const cli = parseUatResetArgs(process.argv.slice(2))
  const dbUrl = requireDatabaseUrl()
  const dbTarget = parseDatabaseTarget(dbUrl)
  const range = parseUatResetDateRange(cli.fromDateKey, cli.beforeDateKey)

  console.log("=== June 2026 UAT Reset ===")
  console.log("Mode:", cli.execute ? "EXECUTE" : "DRY RUN")
  console.log("Range:", `[${range.fromDateKey}, ${range.beforeDateKey}) Bangkok`)
  console.log("Period key:", range.periodKey)
  console.log("Database host:", dbTarget.host)
  console.log("Database name:", dbTarget.database)
  console.log("Database URL:", dbTarget.maskedUrl)
  if (!dbTarget.isLocalhost) {
    console.log(
      `⚠ Remote database — execute requires --confirm=${JUNE_UAT_RESET_CONFIRM_TOKEN}`
    )
  }

  try {
    validateUatResetExecute(cli, dbUrl)
  } catch (err) {
    console.error("\n", err instanceof Error ? err.message : err)
    process.exit(1)
  }

  const scope = await resolveUatResetScope(prisma, range)
  const toRemove = await countUatResetTargets(prisma, scope, range)
  const protectedCounts = await countProtectedMasterData(prisma, range)

  console.log("\n--- Scope IDs ---")
  console.log(
    JSON.stringify(
      {
        saleIds: scope.saleIds.length,
        refundIds: scope.refundIds.length,
        collectorReportIds: scope.collectorReportIds.length,
        stockDocumentIds: scope.stockDocumentIds.length,
        voucherIds: scope.voucherIds.length,
        archiveIds: scope.archiveIds.length,
      },
      null,
      2
    )
  )

  console.log("\n--- Will remove (by table) ---")
  console.log(JSON.stringify(toRemove, null, 2))

  console.log("\n--- Master data preserved ---")
  console.log(JSON.stringify(protectedCounts, null, 2))

  if (protectedCounts.baselineSaleBeforeRange > 0) {
    console.log(
      `\nJan–May baseline: ${protectedCounts.baselineSaleBeforeRange} sale(s) before ${range.fromDateKey} will be kept.`
    )
  }

  if (!cli.execute) {
    console.log("\nDry run complete. No data changed.")
    console.log(
      "To execute after backup:\n  npx tsx scripts/uat/reset-june-2026-test-data.ts",
      `--from=${DEFAULT_UAT_RESET_FROM}`,
      `--before=${DEFAULT_UAT_RESET_BEFORE}`,
      `--execute --confirm=${JUNE_UAT_RESET_CONFIRM_TOKEN}`
    )
    return
  }

  console.log("\nExecuting reset in a single transaction…")
  await prisma.$transaction(async (tx) => {
    await executeUatReset(tx, scope, range)
  })

  const afterScope = await resolveUatResetScope(prisma, range)
  const afterRemove = await countUatResetTargets(prisma, afterScope, range)
  const afterProtected = await countProtectedMasterData(prisma, range)

  console.log("\n--- After reset: remaining scoped rows ---")
  console.log(JSON.stringify(afterRemove, null, 2))
  console.log("\n--- After reset: master data ---")
  console.log(JSON.stringify(afterProtected, null, 2))
  console.log("\nReset complete.")
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

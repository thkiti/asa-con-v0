/**
 * DEVELOPMENT architectural cleanup — delete all retired per-event StockTransaction rows.
 *
 * Dry-run by default. Does not delete Sale, Receipt, StockDocument, Stock, StockLayer,
 * or Finance vouchers. Idempotent: safe to re-run when count is already 0.
 *
 * Usage:
 *   npx tsx scripts/cleanup-retired-stock-transactions.ts
 *   npx tsx scripts/cleanup-retired-stock-transactions.ts --execute --confirm=STOCK_TX_RETIRED_CLEANUP_CONFIRMED
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import {
  executeRetiredStockTransactionCleanup,
  inspectRetiredStockTransactions,
} from "@/lib/stock/cleanup-retired-stock-transactions"
import { requireDatabaseUrl } from "@/lib/shared/env"
import { prisma } from "@/lib/shared/prisma"
import { parseDatabaseTarget } from "@/lib/uat/finance-full-reset"

export const STOCK_TX_RETIRED_CLEANUP_CONFIRM_TOKEN =
  "STOCK_TX_RETIRED_CLEANUP_CONFIRMED"

function parseArgs(argv: string[]) {
  const execute = argv.includes("--execute")
  const confirm =
    argv.find((a) => a.startsWith("--confirm="))?.slice("--confirm=".length) ??
    ""
  return { execute, confirm }
}

async function main() {
  const { execute, confirm } = parseArgs(process.argv.slice(2))
  const dbUrl = requireDatabaseUrl()
  const dbTarget = parseDatabaseTarget(dbUrl)

  console.log("=== Retired StockTransaction cleanup ===")
  console.log("Mode:", execute ? "EXECUTE" : "DRY RUN")
  console.log("Database host:", dbTarget.host)
  console.log("Database name:", dbTarget.database)
  console.log("Database URL:", dbTarget.maskedUrl)
  console.log("Localhost:", dbTarget.isLocalhost)
  console.log(
    "\nDecision: ASA-CON retired per-event StockTransaction creation.",
    "Operational REC, DEY, and CNT remain source documents.",
    "Future StockTransaction rows will be generated only from Cost Calculation",
    "based on locked END Stock Documents. Historical per-event rows are obsolete",
    "and are removed so the ledger can be reconstructed from period 2026-01 onward."
  )

  if (!dbTarget.isLocalhost) {
    console.log(
      "\n⚠ Connected database is NOT localhost. Treat as shared remote DEV only."
    )
  }

  const report = await inspectRetiredStockTransactions(prisma)
  console.log("\n--- Pre-delete report ---")
  console.log(JSON.stringify(report, null, 2))
  console.log("\n--- Dependency findings ---")
  console.log(
    "No Prisma models hold a foreign key to StockTransaction.id.",
    "StockTransaction.documentId → StockDocument is optional outbound only.",
    "Deleting StockTransaction does not cascade to Sale, StockDocument, Stock, or Finance vouchers.",
    "Stock.qty / StockLayer rows are left in place as transitional stale balances",
    "(no longer updated by operational workflows)."
  )

  if (!execute) {
    console.log("\nDry run only. Re-run with:")
    console.log(
      `  npx tsx scripts/cleanup-retired-stock-transactions.ts --execute --confirm=${STOCK_TX_RETIRED_CLEANUP_CONFIRM_TOKEN}`
    )
    return
  }

  if (confirm !== STOCK_TX_RETIRED_CLEANUP_CONFIRM_TOKEN) {
    throw new Error(
      `Refusing execute: pass --confirm=${STOCK_TX_RETIRED_CLEANUP_CONFIRM_TOKEN}`
    )
  }

  const result = await executeRetiredStockTransactionCleanup(prisma)
  console.log("\n--- Execute result ---")
  console.log(
    JSON.stringify(
      {
        deleted: result.deleted,
        remaining: result.remaining,
        reportBeforeTotal: result.reportBefore.total,
      },
      null,
      2
    )
  )

  const after = await inspectRetiredStockTransactions(prisma)
  console.log("\n--- Post-delete verification ---")
  console.log(JSON.stringify({ total: after.total, byRefType: after.byRefType }, null, 2))

  if (after.total !== 0) {
    throw new Error(`Verification failed: StockTransaction count is ${after.total}`)
  }

  console.log("\nOK: StockTransaction count = 0")
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

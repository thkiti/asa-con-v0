/**
 * DEVELOPMENT ONLY — purge SMOKE01 smoke-test branch and dependents.
 *
 * Dry-run by default. Does not create migrations. Does not touch SH001…SH030 / HO999
 * rows other than rehoming AccountingPeriod + DEV staff away from SMOKE01 → HO999.
 *
 * Usage:
 *   npx tsx scripts/cleanup-smoke01-branch.ts
 *   npx tsx scripts/cleanup-smoke01-branch.ts --execute --confirm=SMOKE01_DEV_CLEANUP_CONFIRMED
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import {
  executeSmoke01Cleanup,
  inspectSmoke01Data,
  SMOKE01_BRANCH_CODE,
  SMOKE01_CLEANUP_CONFIRM_TOKEN,
  verifySmoke01Gone,
} from "@/lib/dev/smoke01-cleanup"
import { requireDatabaseUrl } from "@/lib/shared/env"
import { prisma } from "@/lib/shared/prisma"
import { parseDatabaseTarget } from "@/lib/uat/finance-full-reset"

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

  console.log("=== SMOKE01 development cleanup ===")
  console.log("Mode:", execute ? "EXECUTE" : "DRY RUN")
  console.log("Target branch code:", SMOKE01_BRANCH_CODE)
  console.log("Database host:", dbTarget.host)
  console.log("Database name:", dbTarget.database)
  console.log("Database URL:", dbTarget.maskedUrl)
  console.log("Localhost:", dbTarget.isLocalhost)

  if (!dbTarget.isLocalhost) {
    console.log(
      "\n⚠ Connected database is NOT localhost. Treat as shared remote DEV only."
    )
    console.log("  Production data must not be targeted with this script.")
  }

  const report = await inspectSmoke01Data(prisma)
  console.log("\n--- Inspection ---")
  console.log(JSON.stringify(report, null, 2))

  console.log("\n--- Dependency / deletion order ---")
  console.log(`
1. Unlink PosPayInEvidence.bankDepositVoucherId → smoke vouchers
2. Clear ManualJournalEntry posted* links → smoke vouchers (if any)
3. JournalEntry (reversals first) → cascade JournalEntryLine
4. Voucher → cascade VoucherLine
5. DocumentArchiveLink → DocumentArchive (receipt FK cleared first)
6. CollectorReport (+ PosPayInEvidence)
7. Refund
8. StockTransaction (branch)
9. StockDocument (branch)
10. Sale → cascade SaleItem, Payment, Receipt, PaymentEvidence
11. ReconciliationSnapshot / WorkTime / SalesTarget / DocumentCounter
12. StockLayer / Stock
13. Bank/Cash reconciliation + workflow vouchers (if any)
14. REHOME AccountingPeriod(+ evidence branchId strings) → HO999  [do NOT delete periods]
15. REHOME Staff home branch → HO999  [do NOT delete DEV]
16. DELETE Branch SMOKE01
`)

  if (!report.branch) {
    console.log(`${SMOKE01_BRANCH_CODE} already absent. Nothing to delete.`)
    const verify = await verifySmoke01Gone(prisma)
    console.log("Verification:", JSON.stringify(verify, null, 2))
    return
  }

  if (!report.fallbackHomeBranch) {
    console.error(
      "Abort: HO999 fallback home branch missing — cannot rehome periods/DEV staff."
    )
    process.exit(1)
  }

  if (!execute) {
    console.log("Dry run complete. No data changed.")
    console.log(
      `To execute:\n  npx tsx scripts/cleanup-smoke01-branch.ts --execute --confirm=${SMOKE01_CLEANUP_CONFIRM_TOKEN}`
    )
    return
  }

  if (confirm !== SMOKE01_CLEANUP_CONFIRM_TOKEN) {
    console.error(
      `Refusing execute without --confirm=${SMOKE01_CLEANUP_CONFIRM_TOKEN}`
    )
    process.exit(1)
  }

  console.log("\nExecuting cleanup in one transaction…")
  const result = await executeSmoke01Cleanup(prisma)
  console.log("\n--- Result ---")
  console.log(JSON.stringify(result, null, 2))

  const verify = await verifySmoke01Gone(prisma)
  console.log("\n--- Verification ---")
  console.log(JSON.stringify(verify, null, 2))
  if (!verify.ok) {
    console.error("Verification FAILED")
    process.exit(1)
  }
  console.log("\nSMOKE01 cleanup verified OK.")
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

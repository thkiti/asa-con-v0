/**
 * Full finance workflow reset — dry run by default.
 *
 * Removes ManualJournalEntry (OPB/MJV), PaymentVoucher, PettyCashVoucher,
 * RevenueVoucher (when migrated), and related finance Voucher/JournalEntry rows.
 * Does NOT remove POS/stock GL or master/setup data.
 *
 * Usage:
 *   npm run uat:finance:reset:full
 *   npm run uat:finance:reset:full -- --dry-run
 *   npm run uat:finance:reset:full -- --execute --confirm=FINANCE_RESET_CONFIRMED --include-posted-opb
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import { requireDatabaseUrl } from "@/lib/shared/env"
import {
  countFinanceFullResetTargets,
  countPreservedMaster,
  executeFinanceFullReset,
  FINANCE_FULL_RESET_CONFIRM_TOKEN,
  FINANCE_FULL_RESET_REF_TYPES,
  financeTableExists,
  parseDatabaseTarget,
  runFinanceFullResetPreflight,
  validateFinanceFullResetExecute,
} from "@/lib/uat/finance-full-reset"
import { prisma } from "@/lib/shared/prisma"

function parseArgs(argv: string[]) {
  const execute = argv.includes("--execute")
  const dryRun = argv.includes("--dry-run") || !execute
  const includePostedOpb = argv.includes("--include-posted-opb")
  const confirmArg = argv.find((a) => a.startsWith("--confirm="))
  const confirm = confirmArg?.split("=")[1] ?? ""
  return { execute, dryRun, includePostedOpb, confirm }
}

async function detectTablePresence() {
  const queryRaw = prisma.$queryRaw.bind(prisma)
  const [paymentVoucher, revenueVoucher, pettyCashVoucher] = await Promise.all([
    financeTableExists(queryRaw, "PaymentVoucher"),
    financeTableExists(queryRaw, "RevenueVoucher"),
    financeTableExists(queryRaw, "PettyCashVoucher"),
  ])
  return { paymentVoucher, revenueVoucher, pettyCashVoucher }
}

async function main() {
  const { execute, dryRun, includePostedOpb, confirm } = parseArgs(
    process.argv.slice(2)
  )
  const dbUrl = requireDatabaseUrl()
  const dbTarget = parseDatabaseTarget(dbUrl)
  const tablePresence = await detectTablePresence()

  console.log("=== Finance Full Reset ===")
  console.log("Mode:", execute ? "EXECUTE" : "DRY RUN")
  console.log("Include POSTED OPB:", includePostedOpb)
  console.log("Database host:", dbTarget.host)
  console.log("Database name:", dbTarget.database)
  console.log("Database URL:", dbTarget.maskedUrl)
  if (!dbTarget.isLocalhost) {
    console.log(
      "⚠ Remote database detected — execute requires explicit --confirm token."
    )
  }
  console.log("Ref types targeted:", FINANCE_FULL_RESET_REF_TYPES.join(", "))
  console.log("Table presence:", tablePresence)

  const preflight = await runFinanceFullResetPreflight(prisma, tablePresence)
  const postedOpbIds = preflight.postedOpb.map((o) => o.id)
  const postedOpbVoucherIds = preflight.postedOpb
    .map((o) => o.postedVoucherId)
    .filter((id): id is string => Boolean(id))

  try {
    validateFinanceFullResetExecute(
      { execute, confirm, includePostedOpb },
      preflight
    )
  } catch (err) {
    console.error("\n", err instanceof Error ? err.message : err)
    process.exit(1)
  }

  if (preflight.postedOpb.length > 0 && !includePostedOpb && dryRun) {
    console.log(
      "\nNote: POSTED OPB present — execute would be refused without --include-posted-opb."
    )
    console.log(
      "  Documents:",
      preflight.postedOpb.map((o) => o.entryNo).join(", ")
    )
  }

  const countOptions = {
    includePostedOpb,
    postedOpbIds,
    postedOpbVoucherIds,
    tablePresence,
  }

  const beforeRemove = await countFinanceFullResetTargets(
    prisma,
    FINANCE_FULL_RESET_REF_TYPES,
    countOptions
  )
  const beforePreserved = await countPreservedMaster(prisma)

  console.log("\n--- Before: will remove ---")
  console.log(JSON.stringify(beforeRemove, null, 2))
  console.log("\n--- Before: will preserve ---")
  console.log(JSON.stringify(beforePreserved, null, 2))

  if (beforeRemove.pdfArtifacts.length > 0) {
    console.log("\n--- PDF artifacts (manual/blob cleanup after execute) ---")
    for (const path of beforeRemove.pdfArtifacts) {
      console.log(`  ${path}`)
    }
  }

  if (dryRun) {
    console.log("\nDry run complete. No data changed.")
    console.log(
      "To execute after backup:\n  npm run uat:finance:reset:full -- --execute",
      `--confirm=${FINANCE_FULL_RESET_CONFIRM_TOKEN}`,
      preflight.postedOpb.length > 0 ? "--include-posted-opb" : ""
    )
    return
  }

  console.log("\nExecuting reset…")
  await prisma.$transaction(async (tx) => {
    await executeFinanceFullReset(tx, FINANCE_FULL_RESET_REF_TYPES, countOptions)
  })

  const afterRemove = await countFinanceFullResetTargets(
    prisma,
    FINANCE_FULL_RESET_REF_TYPES,
    { ...countOptions, includePostedOpb: true }
  )
  const afterPreserved = await countPreservedMaster(prisma)

  console.log("\n--- After: removed targets ---")
  console.log(JSON.stringify(afterRemove, null, 2))
  console.log("\n--- After: preserved ---")
  console.log(JSON.stringify(afterPreserved, null, 2))
  console.log("\nReset complete. Run: npm run uat:finance:verify")
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

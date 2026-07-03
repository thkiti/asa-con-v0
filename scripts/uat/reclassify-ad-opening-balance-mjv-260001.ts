/**
 * UAT data correction: reclassify AD posted MJV-260001 as OPENING_BALANCE.
 *
 * Aligns document identity only — no line/amount/date/period/PDF changes.
 *
 * Dry run (default):
 *   npx tsx scripts/uat/reclassify-ad-opening-balance-mjv-260001.ts
 *
 * Execute (requires env guard + confirmation token):
 *   FINANCE_OPENING_BALANCE_RECLASSIFY_ENABLED=true npx tsx scripts/uat/reclassify-ad-opening-balance-mjv-260001.ts --execute --confirm=AD_OPB_RECLASSIFY_CONFIRMED
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import { requireDatabaseUrl } from "@/lib/shared/env"
import { prisma } from "@/lib/shared/prisma"
import { parseDatabaseTarget } from "@/lib/uat/finance-full-reset"
import {
  AD_OPENING_BALANCE_RECLASSIFY_CONFIRM_TOKEN,
  AD_OPENING_BALANCE_RECLASSIFY_TARGET,
  assertOpeningBalanceReviewQueryFindsRow,
  executeReclassifyAdOpeningBalanceMjv,
  formatReclassifyAdOpeningBalanceSnapshot,
  planReclassifyAdOpeningBalanceMjv,
  ReclassifyAdOpeningBalanceError,
  verifyOpeningBalanceReviewAfterReclassify,
} from "@/lib/finance/manual-journal-entry/reclassify-ad-opening-balance-mjv"

const RECLASSIFY_ENV_FLAG = "FINANCE_OPENING_BALANCE_RECLASSIFY_ENABLED"

function parseArgs(argv: string[]) {
  const confirmArg = argv.find((arg) => arg.startsWith("--confirm="))
  return {
    execute: argv.includes("--execute"),
    confirm: confirmArg?.slice("--confirm=".length) ?? null,
  }
}

function validateExecute(input: { execute: boolean; confirm: string | null }, dbUrl: string) {
  if (!input.execute) return

  if (input.confirm !== AD_OPENING_BALANCE_RECLASSIFY_CONFIRM_TOKEN) {
    throw new ReclassifyAdOpeningBalanceError(
      `Execute requires --confirm=${AD_OPENING_BALANCE_RECLASSIFY_CONFIRM_TOKEN}`,
      "CONFIRMATION_REQUIRED"
    )
  }

  if (process.env[RECLASSIFY_ENV_FLAG] !== "true") {
    throw new ReclassifyAdOpeningBalanceError(
      `Refusing --execute without ${RECLASSIFY_ENV_FLAG}=true`,
      "ENV_GUARD_REQUIRED"
    )
  }

  const dbTarget = parseDatabaseTarget(dbUrl)
  if (!dbTarget.isLocalhost && input.confirm !== AD_OPENING_BALANCE_RECLASSIFY_CONFIRM_TOKEN) {
    throw new ReclassifyAdOpeningBalanceError(
      "Remote database execute requires explicit confirmation token",
      "REMOTE_CONFIRMATION_REQUIRED"
    )
  }
}

async function main() {
  const cli = parseArgs(process.argv.slice(2))
  const dbUrl = requireDatabaseUrl()
  const dbTarget = parseDatabaseTarget(dbUrl)

  console.log("=== AD Opening Balance Reclassify (MJV-260001) ===")
  console.log("Mode:", cli.execute ? "EXECUTE" : "DRY RUN")
  console.log(
    "Target:",
    `${AD_OPENING_BALANCE_RECLASSIFY_TARGET.legalEntityCode} / ${AD_OPENING_BALANCE_RECLASSIFY_TARGET.entryNo}`
  )
  console.log("Period:", AD_OPENING_BALANCE_RECLASSIFY_TARGET.targetPeriodKey)
  console.log(
    "Change:",
    "ManualJournalEntry.entryType MANUAL -> OPENING_BALANCE;",
    "Voucher.refType MANUAL_JOURNAL -> OPENING_BALANCE_JOURNAL"
  )
  console.log("Database host:", dbTarget.host)
  console.log("Database name:", dbTarget.database)
  console.log("Database URL:", dbTarget.maskedUrl)

  try {
    validateExecute(cli, dbUrl)
  } catch (err) {
    console.error("\n", err instanceof Error ? err.message : err)
    process.exit(1)
  }

  try {
    const planned = await planReclassifyAdOpeningBalanceMjv()
    console.log("\n--- Before ---")
    console.log(formatReclassifyAdOpeningBalanceSnapshot(planned.before, "before"))
    console.log("\n--- After (planned) ---")
    console.log(formatReclassifyAdOpeningBalanceSnapshot(planned.after, "after"))

    const { totalDebit, totalCredit } = planned.before.journalEntry
    const balanced = totalDebit === totalCredit
    console.log("\n--- Validation (pre-execute) ---")
    console.log(`debit = credit: ${balanced ? "PASS" : "FAIL"} (${totalDebit} / ${totalCredit})`)

    if (planned.unchanged) {
      console.log("\nNo changes required — document identity already matches OPENING_BALANCE flow.")
      const lookup = await assertOpeningBalanceReviewQueryFindsRow(prisma, {
        legalEntityCode: AD_OPENING_BALANCE_RECLASSIFY_TARGET.legalEntityCode,
        periodKey: AD_OPENING_BALANCE_RECLASSIFY_TARGET.targetPeriodKey,
      })
      console.log("Opening Balance Review lookup:", lookup)
      const verification = await verifyOpeningBalanceReviewAfterReclassify(
        prisma,
        planned.accountingPeriodId
      )
      console.log("Opening Balance Review status:", verification.review.status)
      return
    }

    if (!cli.execute) {
      console.log("\nDry run only. No data changed.")
      console.log(
        "To execute after backup:\n  FINANCE_OPENING_BALANCE_RECLASSIFY_ENABLED=true npx tsx scripts/uat/reclassify-ad-opening-balance-mjv-260001.ts",
        `--execute --confirm=${AD_OPENING_BALANCE_RECLASSIFY_CONFIRM_TOKEN}`
      )
      return
    }

    console.log("\nApplying reclassify in transaction…")
    const applied = await executeReclassifyAdOpeningBalanceMjv()
    console.log("\n--- After (applied) ---")
    console.log(formatReclassifyAdOpeningBalanceSnapshot(applied.after, "after"))

    const postBalanced =
      applied.after.journalEntry.totalDebit === applied.after.journalEntry.totalCredit
    console.log("\n--- Validation (post-execute) ---")
    console.log(
      `debit = credit: ${postBalanced ? "PASS" : "FAIL"} (${applied.after.journalEntry.totalDebit} / ${applied.after.journalEntry.totalCredit})`
    )

    const lookup = await assertOpeningBalanceReviewQueryFindsRow(prisma, {
      legalEntityCode: AD_OPENING_BALANCE_RECLASSIFY_TARGET.legalEntityCode,
      periodKey: AD_OPENING_BALANCE_RECLASSIFY_TARGET.targetPeriodKey,
    })
    console.log("Opening Balance Review lookup:", lookup)

    const verification = await verifyOpeningBalanceReviewAfterReclassify(
      prisma,
      applied.accountingPeriodId
    )
    console.log("Opening Balance Review status:", verification.review.status)
    for (const item of verification.review.items) {
      console.log(`  ${item.passed ? "PASS" : "FAIL"} — ${item.title}: ${item.detail}`)
    }
  } catch (err: unknown) {
    if (err instanceof ReclassifyAdOpeningBalanceError) {
      console.error(`\nReclassify aborted (${err.code}): ${err.message}`)
      process.exit(1)
    }
    throw err
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

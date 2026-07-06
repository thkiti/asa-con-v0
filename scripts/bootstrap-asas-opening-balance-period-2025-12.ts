/**
 * One-time ops: bootstrap AS/2025-12 for ASAS Opening Balance 2026 (MJV-260001) UI post.
 *
 * Does not post, reclassify, or modify vouchers/journals/lines/amounts. AD untouched.
 *
 * Dry run (default):
 *   npx tsx scripts/bootstrap-asas-opening-balance-period-2025-12.ts
 *
 * Execute (requires env guard):
 *   FINANCE_ASAS_OPENING_BALANCE_PERIOD_BOOTSTRAP_ENABLED=true npx tsx scripts/bootstrap-asas-opening-balance-period-2025-12.ts --execute
 *
 * Verify post-execute (or check current state):
 *   npx tsx scripts/bootstrap-asas-opening-balance-period-2025-12.ts --verify
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import { requireDatabaseUrl } from "@/lib/shared/env"
import { prisma } from "@/lib/shared/prisma"
import { parseDatabaseTarget } from "@/lib/uat/finance-full-reset"
import {
  ASAS_OPENING_BALANCE_PERIOD_BOOTSTRAP_TARGET,
  assertBootstrapAsasOpeningBalancePeriodVerifyPassed,
  BootstrapAsasOpeningBalancePeriodError,
  executeBootstrapAsasOpeningBalancePeriod,
  formatBootstrapAsasOpeningBalancePeriodPlan,
  formatBootstrapAsasOpeningBalancePeriodVerify,
  planBootstrapAsasOpeningBalancePeriod,
  verifyBootstrapAsasOpeningBalancePeriod,
} from "@/lib/finance/bootstrap-asas-opening-balance-period"

const BOOTSTRAP_ENV_FLAG = "FINANCE_ASAS_OPENING_BALANCE_PERIOD_BOOTSTRAP_ENABLED"

function parseArgs(argv: string[]) {
  return {
    execute: argv.includes("--execute"),
    verify: argv.includes("--verify"),
  }
}

async function main() {
  const cli = parseArgs(process.argv.slice(2))
  const dbUrl = requireDatabaseUrl()
  const dbTarget = parseDatabaseTarget(dbUrl)

  console.log("=== ASAS Opening Balance Period Bootstrap (2025-12) ===")
  console.log(
    "Mode:",
    cli.verify ? "VERIFY" : cli.execute ? "EXECUTE" : "DRY RUN"
  )
  console.log(
    "Target:",
    `${ASAS_OPENING_BALANCE_PERIOD_BOOTSTRAP_TARGET.legalEntityCode} / ${ASAS_OPENING_BALANCE_PERIOD_BOOTSTRAP_TARGET.periodKey}`
  )
  console.log(
    "Manual journal:",
    `${ASAS_OPENING_BALANCE_PERIOD_BOOTSTRAP_TARGET.entryNo} — ${ASAS_OPENING_BALANCE_PERIOD_BOOTSTRAP_TARGET.description}`
  )
  console.log("Database host:", dbTarget.host)
  console.log("Database name:", dbTarget.database)
  console.log("Database URL:", dbTarget.maskedUrl)

  try {
    if (cli.verify) {
      const verification = await verifyBootstrapAsasOpeningBalancePeriod({
        requireConfirmedMjv: true,
      })
      console.log("\n" + formatBootstrapAsasOpeningBalancePeriodVerify(verification))
      assertBootstrapAsasOpeningBalancePeriodVerifyPassed(verification)
      console.log("\nVerification passed.")
      return
    }

    const plan = await planBootstrapAsasOpeningBalancePeriod()
    console.log("\n" + formatBootstrapAsasOpeningBalancePeriodPlan(plan))

    if (!plan.willBootstrap) {
      console.log(
        "\nAS/2025-12 already exists and is OPEN — no bootstrap required."
      )
      const verification = await verifyBootstrapAsasOpeningBalancePeriod({
        adPeriodsBefore: plan.adPeriods,
        requireConfirmedMjv: true,
      })
      console.log("\n" + formatBootstrapAsasOpeningBalancePeriodVerify(verification))
      assertBootstrapAsasOpeningBalancePeriodVerifyPassed(verification)
      return
    }

    if (!cli.execute) {
      console.log("\nDry run only. No data changed.")
      console.log(
        "To execute after backup:\n  FINANCE_ASAS_OPENING_BALANCE_PERIOD_BOOTSTRAP_ENABLED=true npx tsx scripts/bootstrap-asas-opening-balance-period-2025-12.ts --execute"
      )
      return
    }

    if (process.env[BOOTSTRAP_ENV_FLAG] !== "true") {
      throw new BootstrapAsasOpeningBalancePeriodError(
        `Refusing --execute without ${BOOTSTRAP_ENV_FLAG}=true`,
        "ENV_GUARD_REQUIRED"
      )
    }

    console.log("\nBootstrapping AS/2025-12…")
    const result = await executeBootstrapAsasOpeningBalancePeriod()
    console.log(
      result.bootstrapped
        ? `Created AS/2025-12 (${result.period.id}) status=${result.period.status}`
        : `AS/2025-12 already present (${result.period.id}) status=${result.period.status}`
    )

    const verification = await verifyBootstrapAsasOpeningBalancePeriod({
      adPeriodsBefore: result.adPeriodsBefore,
      requireConfirmedMjv: true,
    })
    console.log("\n" + formatBootstrapAsasOpeningBalancePeriodVerify(verification))
    assertBootstrapAsasOpeningBalancePeriodVerifyPassed(verification)
    console.log(
      "\nBootstrap complete. Post AS MJV-260001 through the UI, then run reclassify script."
    )
  } catch (err: unknown) {
    if (err instanceof BootstrapAsasOpeningBalancePeriodError) {
      console.error(`\nBootstrap aborted (${err.code}): ${err.message}`)
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

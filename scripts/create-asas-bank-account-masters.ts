/**
 * One-time ops: create missing AS BankAccount masters for period-close readiness.
 *
 * Targets:
 *   AS / Bangkok Bank Current / 2193020274 / GL 1021002
 *   AS / Bangkok Bank Savings / 2190280806 / GL 1021003
 *
 * Does not touch AD 2193020266, delete GL accounts, or modify bank statements.
 *
 * Dry run (default):
 *   npx tsx scripts/create-asas-bank-account-masters.ts
 *
 * Execute (requires env guard):
 *   FINANCE_ASAS_BANK_ACCOUNT_MASTERS_BOOTSTRAP_ENABLED=true npx tsx scripts/create-asas-bank-account-masters.ts --execute
 *
 * Verify post-execute (or check current state):
 *   npx tsx scripts/create-asas-bank-account-masters.ts --verify
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import { requireDatabaseUrl } from "@/lib/shared/env"
import { prisma } from "@/lib/shared/prisma"
import { parseDatabaseTarget } from "@/lib/uat/finance-full-reset"
import {
  AD_PROTECTED_BANK_ACCOUNT_NUMBER,
  ASAS_BANK_ACCOUNT_MASTER_TARGETS,
  assertBootstrapAsasBankAccountMastersVerifyPassed,
  assertTargetGlAccountsAreBankRole,
  BootstrapAsasBankAccountMastersError,
  executeBootstrapAsasBankAccountMasters,
  formatBootstrapAsasBankAccountMastersPlan,
  formatBootstrapAsasBankAccountMastersVerify,
  planBootstrapAsasBankAccountMasters,
  verifyBootstrapAsasBankAccountMasters,
} from "@/lib/finance/bootstrap-asas-bank-account-masters"

const BOOTSTRAP_ENV_FLAG = "FINANCE_ASAS_BANK_ACCOUNT_MASTERS_BOOTSTRAP_ENABLED"

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

  console.log("=== AS Bank Account Master Bootstrap ===")
  console.log(
    "Mode:",
    cli.verify ? "VERIFY" : cli.execute ? "EXECUTE" : "DRY RUN"
  )
  console.log(
    "Targets:",
    ASAS_BANK_ACCOUNT_MASTER_TARGETS.map(
      (target) =>
        `${target.legalEntityCode} / ${target.accountName} / ${target.accountNumber} / GL ${target.glAccountCode}`
    ).join("; ")
  )
  console.log("AD protected (untouched):", AD_PROTECTED_BANK_ACCOUNT_NUMBER)
  console.log("Database host:", dbTarget.host)
  console.log("Database name:", dbTarget.database)
  console.log("Database URL:", dbTarget.maskedUrl)

  try {
    if (cli.verify) {
      const verification = await verifyBootstrapAsasBankAccountMasters()
      console.log("\n" + formatBootstrapAsasBankAccountMastersVerify(verification))
      assertBootstrapAsasBankAccountMastersVerifyPassed(verification)
      console.log("\nVerification passed.")
      return
    }

    await assertTargetGlAccountsAreBankRole()
    const plan = await planBootstrapAsasBankAccountMasters()
    console.log("\n" + formatBootstrapAsasBankAccountMastersPlan(plan))

    if (plan.willCreateCount === 0) {
      console.log("\nAll AS bank account masters already exist.")
      const verification = await verifyBootstrapAsasBankAccountMasters()
      console.log("\n" + formatBootstrapAsasBankAccountMastersVerify(verification))
      assertBootstrapAsasBankAccountMastersVerifyPassed(verification)
      return
    }

    if (!cli.execute) {
      console.log("\nDry run only. No data changed.")
      console.log(
        `To execute after backup:\n  ${BOOTSTRAP_ENV_FLAG}=true npx tsx scripts/create-asas-bank-account-masters.ts --execute`
      )
      return
    }

    if (process.env[BOOTSTRAP_ENV_FLAG] !== "true") {
      throw new BootstrapAsasBankAccountMastersError(
        `Refusing --execute without ${BOOTSTRAP_ENV_FLAG}=true`,
        "ENV_GUARD_REQUIRED"
      )
    }

    console.log("\nCreating AS bank account masters…")
    const result = await executeBootstrapAsasBankAccountMasters()
    if (result.created.length > 0) {
      console.log(
        "Created:",
        result.created
          .map((row) => `${row.accountNumber} (${row.id}) -> GL ${row.glAccountCode}`)
          .join("; ")
      )
    }
    if (result.skipped.length > 0) {
      console.log(
        "Skipped (already exist):",
        result.skipped.map((row) => `${row.accountNumber} (${row.id})`).join("; ")
      )
    }

    const verification = await verifyBootstrapAsasBankAccountMasters()
    console.log("\n" + formatBootstrapAsasBankAccountMastersVerify(verification))
    assertBootstrapAsasBankAccountMastersVerifyPassed(verification)
    console.log("\nBootstrap complete.")
  } catch (err: unknown) {
    if (err instanceof BootstrapAsasBankAccountMastersError) {
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

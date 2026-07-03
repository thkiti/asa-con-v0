/**
 * UAT accounting period cleanup — normalize to a single closed prior month and one OPEN current month.
 *
 * Target end state (per legal entity):
 *   YYYY-12 (prior year December) HARD_CLOSED
 *   YYYY+1-01 OPEN
 * Later periods should be created automatically by hard close in normal operation.
 *
 * Dry run (default):
 *   npx tsx scripts/cleanup-uat-accounting-periods.ts --legal-entity=AD
 *
 * Execute (requires explicit env guard):
 *   FINANCE_PERIOD_UAT_CLEANUP_ENABLED=true npx tsx scripts/cleanup-uat-accounting-periods.ts --legal-entity=AD --execute
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import { AccountingPeriodStatus } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { prisma } from "@/lib/shared/prisma"

const CLEANUP_ENV_FLAG = "FINANCE_PERIOD_UAT_CLEANUP_ENABLED"

const TARGET_HARD_CLOSED_KEY = "2025-12"
const TARGET_OPEN_KEY = "2026-01"

function parseArgs(argv: string[]) {
  const legalEntityArg = argv.find((arg) => arg.startsWith("--legal-entity="))
  return {
    execute: argv.includes("--execute"),
    legalEntityCode: (legalEntityArg?.split("=")[1]?.trim() || "AD") as DocumentEntityCode,
  }
}

async function main() {
  const { execute, legalEntityCode } = parseArgs(process.argv.slice(2))

  console.log(`UAT period cleanup for ${legalEntityCode}`)
  console.log(`Target: ${TARGET_HARD_CLOSED_KEY} HARD_CLOSED, ${TARGET_OPEN_KEY} OPEN`)

  const periods = await prisma.accountingPeriod.findMany({
    where: { legalEntityCode },
    orderBy: { periodKey: "asc" },
  })

  console.log("\nCurrent periods:")
  for (const period of periods) {
    console.log(`  ${period.periodKey} ${period.status}`)
  }

  const toDelete = periods.filter(
    (period) =>
      period.periodKey !== TARGET_HARD_CLOSED_KEY && period.periodKey !== TARGET_OPEN_KEY
  )

  const hardClosed = periods.find((p) => p.periodKey === TARGET_HARD_CLOSED_KEY)
  const openPeriod = periods.find((p) => p.periodKey === TARGET_OPEN_KEY)

  console.log("\nPlanned changes:")
  if (!hardClosed) {
    console.log(`  create ${TARGET_HARD_CLOSED_KEY} HARD_CLOSED (requires existing branch bootstrap)`)
  } else if (hardClosed.status !== AccountingPeriodStatus.HARD_CLOSED) {
    console.log(`  set ${TARGET_HARD_CLOSED_KEY} -> HARD_CLOSED`)
  } else {
    console.log(`  keep ${TARGET_HARD_CLOSED_KEY} HARD_CLOSED`)
  }

  if (!openPeriod) {
    console.log(`  create ${TARGET_OPEN_KEY} OPEN`)
  } else if (openPeriod.status !== AccountingPeriodStatus.OPEN) {
    console.log(`  set ${TARGET_OPEN_KEY} -> OPEN`)
  } else {
    console.log(`  keep ${TARGET_OPEN_KEY} OPEN`)
  }

  if (toDelete.length === 0) {
    console.log("  no extra periods to delete")
  } else {
    console.log(`  delete ${toDelete.length} extra period(s): ${toDelete.map((p) => p.periodKey).join(", ")}`)
  }

  if (!execute) {
    console.log("\nDry run only. Re-run with --execute after review.")
    return
  }

  if (process.env[CLEANUP_ENV_FLAG] !== "true") {
    console.error(`\nRefusing --execute without ${CLEANUP_ENV_FLAG}=true.`)
    process.exit(1)
  }

  const hoBranch = await prisma.branch.findFirst({ where: { code: "HO999" }, select: { id: true } })
  if (!hoBranch) {
    console.error("HO999 branch not found — cannot bootstrap periods.")
    process.exit(1)
  }

  await prisma.$transaction(async (tx) => {
    if (toDelete.length > 0) {
      await tx.accountingPeriod.deleteMany({
        where: { id: { in: toDelete.map((p) => p.id) } },
      })
    }

    await tx.accountingPeriod.upsert({
      where: {
        legalEntityCode_periodKey: {
          legalEntityCode,
          periodKey: TARGET_HARD_CLOSED_KEY,
        },
      },
      create: {
        branchId: hoBranch.id,
        legalEntityCode,
        periodKey: TARGET_HARD_CLOSED_KEY,
        status: AccountingPeriodStatus.HARD_CLOSED,
        closedAt: new Date("2025-12-31T23:59:59.000Z"),
      },
      update: {
        status: AccountingPeriodStatus.HARD_CLOSED,
        closedAt: new Date("2025-12-31T23:59:59.000Z"),
      },
    })

    await tx.accountingPeriod.upsert({
      where: {
        legalEntityCode_periodKey: {
          legalEntityCode,
          periodKey: TARGET_OPEN_KEY,
        },
      },
      create: {
        branchId: hoBranch.id,
        legalEntityCode,
        periodKey: TARGET_OPEN_KEY,
        status: AccountingPeriodStatus.OPEN,
        closedAt: null,
      },
      update: {
        status: AccountingPeriodStatus.OPEN,
        closedAt: null,
      },
    })
  })

  console.log("\nCleanup applied.")
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

/**
 * One-time data correction: rename ASAS Opening Balance 2026 from MJV-250001 to MJV-260001.
 *
 * Dry run (default):
 *   npx tsx scripts/repair-asas-opening-balance-mjv-260001.ts
 *
 * Execute (requires explicit env guard):
 *   FINANCE_OPENING_BALANCE_REPAIR_ENABLED=true npx tsx scripts/repair-asas-opening-balance-mjv-260001.ts --execute
 *
 * Execute + regenerate archived PDF (POSTED entries only):
 *   FINANCE_OPENING_BALANCE_REPAIR_ENABLED=true FINANCE_PDF_REPAIR_ENABLED=true npx tsx scripts/repair-asas-opening-balance-mjv-260001.ts --execute --regenerate-pdf
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import {
  ASAS_OPENING_BALANCE_MJV_RENUMBER_TARGET,
  executeRepairAsasOpeningBalanceMjv,
  formatRepairAsasOpeningBalanceMjvAudit,
  planRepairAsasOpeningBalanceMjv,
  RepairAsasOpeningBalanceMjvError,
} from "@/lib/finance/manual-journal-entry/repair-asas-opening-balance-mjv"
import { prisma } from "@/lib/shared/prisma"

const REPAIR_ENV_FLAG = "FINANCE_OPENING_BALANCE_REPAIR_ENABLED"
const PDF_REPAIR_ENV_FLAG = "FINANCE_PDF_REPAIR_ENABLED"

function parseArgs(argv: string[]) {
  return {
    execute: argv.includes("--execute"),
    regeneratePdf: argv.includes("--regenerate-pdf"),
    verifyOnly: argv.includes("--verify"),
  }
}

async function verifyAfterRepair() {
  const { legalEntityCode, targetEntryNo, sourceEntryNo } =
    ASAS_OPENING_BALANCE_MJV_RENUMBER_TARGET

  const asTarget = await prisma.manualJournalEntry.findFirst({
    where: {
      legalEntityCode,
      entryNo: targetEntryNo,
      description: ASAS_OPENING_BALANCE_MJV_RENUMBER_TARGET.description,
    },
    select: { id: true, entryNo: true, status: true, entryDate: true },
  })

  const asSourceLeft = await prisma.manualJournalEntry.count({
    where: {
      legalEntityCode,
      entryNo: sourceEntryNo,
      description: ASAS_OPENING_BALANCE_MJV_RENUMBER_TARGET.description,
    },
  })

  const adTarget = await prisma.manualJournalEntry.findFirst({
    where: { legalEntityCode: "AD", entryNo: targetEntryNo },
    select: { id: true, entryNo: true, status: true },
  })

  console.log("\n=== Verification ===")
  console.log(
    JSON.stringify(
      {
        asOpeningBalance: asTarget,
        asSourceOpeningBalanceRemaining: asSourceLeft,
        adMjv260001: adTarget,
      },
      null,
      2
    )
  )

  if (!asTarget) {
    throw new Error(`Expected AS ${targetEntryNo} Opening Balance row`)
  }
  if (asSourceLeft > 0) {
    throw new Error(`AS still has ${sourceEntryNo} Opening Balance row(s)`)
  }
  if (!adTarget || adTarget.entryNo !== targetEntryNo) {
    throw new Error("AD MJV-260001 missing or changed")
  }
}

async function main() {
  const { execute, regeneratePdf, verifyOnly } = parseArgs(process.argv.slice(2))

  if (verifyOnly) {
    await verifyAfterRepair()
    return
  }

  console.log(
    `Target: ${ASAS_OPENING_BALANCE_MJV_RENUMBER_TARGET.legalEntityCode} / ${ASAS_OPENING_BALANCE_MJV_RENUMBER_TARGET.sourceEntryNo} -> ${ASAS_OPENING_BALANCE_MJV_RENUMBER_TARGET.targetEntryNo}`
  )
  console.log(
    `Description: "${ASAS_OPENING_BALANCE_MJV_RENUMBER_TARGET.description}"`
  )

  try {
    const planned = await planRepairAsasOpeningBalanceMjv()
    console.log(formatRepairAsasOpeningBalanceMjvAudit(planned))

    const unchanged = planned.oldEntryNo === planned.newEntryNo

    if (unchanged) {
      console.log("\nNo changes required — target already uses MJV-260001.")
      await verifyAfterRepair()
      return
    }

    if (!execute) {
      console.log("\nDry run only. Re-run with --execute after review.")
      return
    }

    if (process.env[REPAIR_ENV_FLAG] !== "true") {
      console.error(
        `\nRefusing --execute without ${REPAIR_ENV_FLAG}=true (posted-document repair is admin-only).`
      )
      process.exit(1)
    }

    if (regeneratePdf && process.env[PDF_REPAIR_ENV_FLAG] !== "true") {
      console.error(`\nRefusing --regenerate-pdf without ${PDF_REPAIR_ENV_FLAG}=true.`)
      process.exit(1)
    }

    const result = await executeRepairAsasOpeningBalanceMjv({ regeneratePdf })
    console.log("\nRepair applied:")
    console.log(formatRepairAsasOpeningBalanceMjvAudit(result.audit))

    if (regeneratePdf) {
      if (result.pdfRegenerated) {
        console.log("Archived PDF regenerated with corrected document number.")
      } else if (result.pdfRegenerationError) {
        console.warn(`PDF regeneration skipped or failed: ${result.pdfRegenerationError}`)
      }
    }

    await verifyAfterRepair()
  } catch (err: unknown) {
    if (err instanceof RepairAsasOpeningBalanceMjvError) {
      console.error(`Repair aborted (${err.code}): ${err.message}`)
      process.exit(1)
    }
    throw err
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

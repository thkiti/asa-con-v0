/**
 * UAT data correction: move AD posted opening balance MJV-260001 to 2025-12-31 / AD 2025-12.
 *
 * Dry run (default):
 *   npx tsx scripts/repair-asad-opening-balance-mjv-260001.ts
 *
 * Execute (requires explicit env guard):
 *   FINANCE_OPENING_BALANCE_REPAIR_ENABLED=true npx tsx scripts/repair-asad-opening-balance-mjv-260001.ts --execute
 *
 * Execute + regenerate archived PDF snapshot:
 *   FINANCE_OPENING_BALANCE_REPAIR_ENABLED=true FINANCE_PDF_REPAIR_ENABLED=true npx tsx scripts/repair-asad-opening-balance-mjv-260001.ts --execute --regenerate-pdf
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import {
  ASAD_OPENING_BALANCE_REPAIR_TARGET,
  executeRepairAsadOpeningBalanceMjv,
  formatRepairAsadOpeningBalanceAudit,
  planRepairAsadOpeningBalanceMjv,
  RepairAsadOpeningBalanceError,
} from "@/lib/finance/manual-journal-entry/repair-asad-opening-balance-mjv"

const REPAIR_ENV_FLAG = "FINANCE_OPENING_BALANCE_REPAIR_ENABLED"
const PDF_REPAIR_ENV_FLAG = "FINANCE_PDF_REPAIR_ENABLED"

function parseArgs(argv: string[]) {
  return {
    execute: argv.includes("--execute"),
    regeneratePdf: argv.includes("--regenerate-pdf"),
  }
}

async function main() {
  const { execute, regeneratePdf } = parseArgs(process.argv.slice(2))

  console.log(
    `Target: ${ASAD_OPENING_BALANCE_REPAIR_TARGET.legalEntityCode} / ${ASAD_OPENING_BALANCE_REPAIR_TARGET.entryNo}`
  )
  console.log(
    `Correction: entry date -> ${ASAD_OPENING_BALANCE_REPAIR_TARGET.correctedEntryDate.toISOString().slice(0, 10)}, period -> ${ASAD_OPENING_BALANCE_REPAIR_TARGET.targetPeriodKey}`
  )

  try {
    const planned = await planRepairAsadOpeningBalanceMjv()
    console.log(formatRepairAsadOpeningBalanceAudit(planned, "before"))
    console.log("")
    console.log(formatRepairAsadOpeningBalanceAudit(planned, "after"))

    const unchanged =
      planned.oldEntryDate === planned.newEntryDate &&
      planned.oldPeriodKey === planned.newPeriodKey

    if (unchanged) {
      console.log("\nNo changes required — target already matches corrected opening-balance flow.")
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
      console.error(
        `\nRefusing --regenerate-pdf without ${PDF_REPAIR_ENV_FLAG}=true.`
      )
      process.exit(1)
    }

    const result = await executeRepairAsadOpeningBalanceMjv({ regeneratePdf })
    console.log("\nRepair applied:")
    console.log(formatRepairAsadOpeningBalanceAudit(result.audit, "after"))

    if (regeneratePdf) {
      if (result.pdfRegenerated) {
        console.log("Archived PDF regenerated with corrected entry date.")
      } else if (result.pdfRegenerationError) {
        console.warn(
          `PDF regeneration skipped or failed: ${result.pdfRegenerationError}`
        )
      } else {
        console.log("No archived PDF existed; regeneration not required.")
      }
    } else if (result.audit.pdfCleared) {
      console.log(
        "Archived PDF snapshot cleared (stale). Regenerate with repair-manual-journal-archived-pdfs.ts when ready."
      )
    }
  } catch (err: unknown) {
    if (err instanceof RepairAsadOpeningBalanceError) {
      console.error(`Repair aborted (${err.code}): ${err.message}`)
      process.exit(1)
    }
    throw err
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

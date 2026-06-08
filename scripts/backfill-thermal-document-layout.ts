/**
 * Backfill ThermalDocumentLayout from ReceiptPrintSettings + code defaults.
 * Use after `prisma db push` (migrations do not run seeds on push).
 *
 * Usage:
 *   npx tsx scripts/backfill-thermal-document-layout.ts
 *   npx tsx scripts/backfill-thermal-document-layout.ts --dry-run
 */
import "dotenv/config"
import { config } from "dotenv"

config({ path: ".env.local" })

import {
  backfillThermalDocumentLayouts,
  THERMAL_DOCUMENT_TYPES,
  verifyThermalDocumentLayoutsSeeded,
} from "../lib/thermal/backfill-document-layouts"
import { prisma } from "../lib/shared/prisma"

const DRY_RUN = process.argv.includes("--dry-run")

async function main() {
  const before = await verifyThermalDocumentLayoutsSeeded(prisma)
  console.log(
    `Before: ${before.count} row(s) in ThermalDocumentLayout` +
      (before.missing.length ? ` — missing: ${before.missing.join(", ")}` : "")
  )

  const legacy = await prisma.receiptPrintSettings.findUnique({
    where: { id: "default" },
  })
  console.log(
    legacy
      ? `ReceiptPrintSettings default row present (companyDisplayName=${legacy.companyDisplayName ?? "(null)"})`
      : "ReceiptPrintSettings default row not found"
  )

  if (DRY_RUN) {
    console.log("Dry run — no writes. Re-run without --dry-run to apply backfill.")
    if (!before.ok) {
      console.log(`Would seed missing types: ${before.missing.join(", ")}`)
      process.exit(1)
    }
    return
  }

  const result = await backfillThermalDocumentLayouts(prisma)
  console.log(
    `Backfill complete: created [${result.created.join(", ") || "none"}], ` +
      `receiptCopiedFromLegacy=${result.receiptCopiedFromLegacy}, total=${result.total}`
  )

  if (!result.ok) {
    console.error(`Verification failed — still missing: ${result.missing.join(", ")}`)
    process.exit(1)
  }

  const rows = await prisma.thermalDocumentLayout.findMany({
    orderBy: { documentType: "asc" },
    select: {
      documentType: true,
      headerLine1: true,
      headerLine2: true,
      headerLine3: true,
      footerLine1: true,
    },
  })

  console.log(`Verified ${result.total}/${THERMAL_DOCUMENT_TYPES.length} rows:`)
  for (const row of rows) {
    console.log(
      `  ${row.documentType}: header1=${row.headerLine1 ?? "(null)"} footer1=${row.footerLine1 ?? "(null)"}`
    )
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

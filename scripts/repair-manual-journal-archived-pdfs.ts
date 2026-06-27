/**
 * Repair stale MJV archived PDF snapshots (PDFKit bytes only).
 *
 * Re-renders posted manual journal vouchers with the current THSarabunNew PDFKit
 * renderer and replaces stored snapshot bytes. Does not change accounting data.
 *
 * Usage (dry run — default):
 *   npx tsx scripts/repair-manual-journal-archived-pdfs.ts
 *   npx tsx scripts/repair-manual-journal-archived-pdfs.ts --entry-id=<uuid>
 *
 * Execute (requires explicit env guard):
 *   FINANCE_PDF_REPAIR_ENABLED=true npx tsx scripts/repair-manual-journal-archived-pdfs.ts --execute
 *   FINANCE_PDF_REPAIR_ENABLED=true npx tsx scripts/repair-manual-journal-archived-pdfs.ts --execute --entry-id=<uuid>
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import { regenerateManualJournalEntryArchivedPdf } from "@/lib/finance/manual-journal-entry/manual-journal-entry-pdf-repair"
import { prisma } from "@/lib/shared/prisma"

const REPAIR_ENV_FLAG = "FINANCE_PDF_REPAIR_ENABLED"

function parseArgs(argv: string[]) {
  const execute = argv.includes("--execute")
  const entryIdArg = argv.find((a) => a.startsWith("--entry-id="))
  const entryId = entryIdArg?.split("=")[1]?.trim() || null
  return { execute, entryId }
}

async function listRepairCandidates(entryId: string | null) {
  if (entryId) {
    const entry = await prisma.manualJournalEntry.findUnique({
      where: { id: entryId },
      select: {
        id: true,
        entryNo: true,
        status: true,
        legalEntityCode: true,
        pdfPath: true,
        pdfBlobUrl: true,
        pdfGeneratedAt: true,
      },
    })
    return entry ? [entry] : []
  }

  return prisma.manualJournalEntry.findMany({
    where: {
      status: "POSTED",
      OR: [{ pdfPath: { not: null } }, { pdfBlobUrl: { not: null } }],
    },
    select: {
      id: true,
      entryNo: true,
      status: true,
      legalEntityCode: true,
      pdfPath: true,
      pdfBlobUrl: true,
      pdfGeneratedAt: true,
    },
    orderBy: { entryNo: "asc" },
  })
}

async function main() {
  const { execute, entryId } = parseArgs(process.argv.slice(2))

  if (execute && process.env[REPAIR_ENV_FLAG] !== "true") {
    console.error(
      `Refusing --execute without ${REPAIR_ENV_FLAG}=true (PDF snapshot repair is dev/admin only).`
    )
    process.exit(1)
  }

  const candidates = await listRepairCandidates(entryId)
  if (entryId && candidates.length === 0) {
    console.error(`No manual journal entry found for id ${entryId}`)
    process.exit(1)
  }

  console.log(
    execute
      ? "MJV archived PDF repair — EXECUTE"
      : "MJV archived PDF repair — DRY RUN (pass --execute with env guard to apply)"
  )
  console.log(`Candidates: ${candidates.length}`)

  let ok = 0
  let failed = 0
  let skipped = 0

  for (const entry of candidates) {
    const label = `${entry.entryNo} (${entry.id})`
    const hasPdf =
      Boolean(String(entry.pdfPath ?? "").trim()) ||
      Boolean(String(entry.pdfBlobUrl ?? "").trim())

    if (entry.status !== "POSTED") {
      console.log(`SKIP | ${label} | status=${entry.status}`)
      skipped += 1
      continue
    }

    if (!hasPdf) {
      console.log(`SKIP | ${label} | no archived PDF metadata`)
      skipped += 1
      continue
    }

    if (!execute) {
      console.log(
        `PLAN | ${label} | would regenerate archived PDF (pdfGeneratedAt=${entry.pdfGeneratedAt?.toISOString() ?? "null"})`
      )
      continue
    }

    const result = await regenerateManualJournalEntryArchivedPdf(
      entry.id,
      entry.legalEntityCode as "AS" | "AD"
    )
    if (result.ok) {
      console.log(
        `OK   | ${label} | pdfPath=${result.pdfPath} pdfGeneratedAt=${result.pdfGeneratedAt.toISOString()}`
      )
      ok += 1
    } else {
      console.log(`FAIL | ${label} | ${result.error}`)
      failed += 1
    }
  }

  if (execute) {
    console.log(`Done. ok=${ok} failed=${failed} skipped=${skipped}`)
    if (failed > 0) process.exit(1)
  } else {
    console.log(
      `Dry run complete. To repair: ${REPAIR_ENV_FLAG}=true npx tsx scripts/repair-manual-journal-archived-pdfs.ts --execute`
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

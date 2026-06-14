/**
 * Stage legacy SAE.dbf rows into LegacySalesImportRow (2026+ only).
 *
 * Examples:
 *   npm run legacy:sales:stage -- --file SAE.dbf --year 2026
 *   npm run legacy:sales:stage -- --file O:/OFFICE/document/ASACOM/DATA/SAE.dbf --apply
 */
import "dotenv/config"

import {
  assertLegacySalesFileExists,
  basenameSourceFileName,
  parseLegacySalesCliArgs,
  printLegacySalesStageSummary,
  resolveLegacySalesDbfPath,
  runLegacySalesStageImport,
  toStageOptions,
} from "@/lib/import/legacy-sales"
import { assertImportApplyAllowed } from "@/lib/import/safety"
import { prisma } from "@/lib/shared/prisma"

async function main() {
  const cli = parseLegacySalesCliArgs(["stage", ...process.argv.slice(2)])
  assertImportApplyAllowed(cli.apply)

  const filePath = resolveLegacySalesDbfPath({ file: cli.file, sourceDir: cli.sourceDir })
  assertLegacySalesFileExists(filePath)

  if (!cli.apply) {
    console.log("Dry-run mode (default). Pass --apply to write staging rows.")
  }

  const summary = await runLegacySalesStageImport(
    prisma,
    toStageOptions(cli, filePath, basenameSourceFileName(filePath))
  )
  printLegacySalesStageSummary(summary)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

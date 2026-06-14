/**
 * Convert VALID staged legacy sales rows into Sale / SaleItem / Payment / Receipt.
 * Does not post finance or stock movement.
 *
 * Examples:
 *   npm run legacy:sales:convert -- --batch latest
 *   npm run legacy:sales:convert -- --batch latest --apply
 */
import "dotenv/config"

import {
  parseLegacySalesCliArgs,
  printLegacySalesConvertSummary,
  resolveLegacySalesBatchId,
  runLegacySalesConvertStaging,
  toConvertOptions,
} from "@/lib/import/legacy-sales"
import { assertImportApplyAllowed } from "@/lib/import/safety"
import { prisma } from "@/lib/shared/prisma"

async function main() {
  const cli = parseLegacySalesCliArgs(["convert", ...process.argv.slice(2)])
  assertImportApplyAllowed(cli.apply)

  const batchId = await resolveLegacySalesBatchId(prisma, cli.batch)

  if (!cli.apply) {
    console.log("Dry-run mode (default). Pass --apply to create Sale/Receipt rows.")
  }

  const summary = await runLegacySalesConvertStaging(
    prisma,
    toConvertOptions(cli, batchId)
  )
  printLegacySalesConvertSummary(summary)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

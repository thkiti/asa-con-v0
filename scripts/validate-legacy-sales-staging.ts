/**
 * Validate staged legacy sales rows — map branch/product/staff.
 *
 * Examples:
 *   npm run legacy:sales:validate -- --batch latest
 *   npm run legacy:sales:validate -- --batch latest --apply
 */
import "dotenv/config"

import {
  parseLegacySalesCliArgs,
  printLegacySalesValidationSummary,
  resolveLegacySalesBatchId,
  runLegacySalesValidateStaging,
  toValidateOptions,
} from "@/lib/import/legacy-sales"
import { assertImportApplyAllowed } from "@/lib/import/safety"
import { prisma } from "@/lib/shared/prisma"

async function main() {
  const cli = parseLegacySalesCliArgs(["validate", ...process.argv.slice(2)])
  assertImportApplyAllowed(cli.apply)

  const batchId = await resolveLegacySalesBatchId(prisma, cli.batch)

  if (!cli.apply) {
    console.log("Dry-run mode (default). Pass --apply to persist VALID/INVALID status.")
  }

  const summary = await runLegacySalesValidateStaging(
    prisma,
    toValidateOptions(cli, batchId)
  )
  printLegacySalesValidationSummary(summary)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

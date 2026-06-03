/**
 * Devboard master data import CLI.
 *
 * Examples:
 *   npx tsx scripts/import/run.ts --profile=devboard-v1 --dry-run
 *   npx tsx scripts/import/run.ts --profile=devboard-v1 --apply
 *   npx tsx scripts/import/run.ts --profile=devboard-v1 --entity=staff --dry-run
 *   npx tsx scripts/import/run.ts --profile=devboard-v1 --entity=staff --apply
 */
import "dotenv/config"

import {
  parseImportCliArgs,
  runMasterDataImport,
} from "../../lib/import/run-import"
import { prisma } from "../../lib/shared/prisma"

async function main() {
  const options = parseImportCliArgs(process.argv.slice(2))

  if (!options.apply) {
    console.log("Dry-run mode (default). Pass --apply to write changes.")
  }

  await runMasterDataImport(options)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

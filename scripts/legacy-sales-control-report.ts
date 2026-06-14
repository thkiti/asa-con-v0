/**
 * Pre-convert control report for legacy sales staging.
 *
 * Example:
 *   npm run legacy:sales:control -- --batch latest
 */
import "dotenv/config"

import {
  printLegacySalesControlReport,
  runLegacySalesControlReport,
} from "@/lib/import/legacy-sales/control-report"
import { resolveLegacySalesBatchId } from "@/lib/import/legacy-sales/resolve-batch"
import { prisma } from "@/lib/shared/prisma"

function readBatchArg(argv: string[]): string | undefined {
  const direct = argv.find((arg) => arg.startsWith("--batch="))
  if (direct) return direct.slice("--batch=".length).trim() || undefined
  const index = argv.indexOf("--batch")
  if (index >= 0) return argv[index + 1]?.trim() || undefined
  return undefined
}

async function main() {
  const batchId = await resolveLegacySalesBatchId(prisma, readBatchArg(process.argv.slice(2)))
  const report = await runLegacySalesControlReport(prisma, batchId)
  printLegacySalesControlReport(report)
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

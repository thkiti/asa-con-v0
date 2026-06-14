/**
 * Seed products required for legacy SAE.dbf sales import compatibility.
 *
 * Usage:
 *   npx tsx scripts/seed-legacy-sales-import-products.ts
 *   npx tsx scripts/seed-legacy-sales-import-products.ts --apply
 */
import "dotenv/config"

import {
  printLegacySalesImportProductResults,
  upsertLegacySalesImportProducts,
} from "@/lib/import/legacy-sales/legacy-import-products"
import { assertImportApplyAllowed } from "@/lib/import/safety"
import { prisma } from "@/lib/shared/prisma"

async function main() {
  const apply = process.argv.includes("--apply")
  assertImportApplyAllowed(apply)

  if (!apply) {
    console.log("Dry-run mode (default). Pass --apply to write products.")
  }

  const results = await upsertLegacySalesImportProducts(prisma, { apply })
  printLegacySalesImportProductResults(results, apply ? "apply" : "dry-run")
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

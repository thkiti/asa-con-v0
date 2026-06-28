/**
 * Backfill Sale VAT snapshot columns for rows created before P1.25 checkout.
 * Uses default AS 7% VAT-inclusive policy (700 bps, account 4602).
 *
 * Usage:
 *   npx tsx scripts/backfill-sale-vat-snapshot.ts
 *   npx tsx scripts/backfill-sale-vat-snapshot.ts --dry-run
 */
import { SaleStatus } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import { splitPosVatIncludedTotal } from "@/lib/finance/pos-sale-vat"
import {
  DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS,
  VAT_OUTPUT_STANDARD_TAX_CODE,
} from "@/lib/finance/tax-policy"
import { prisma } from "@/lib/shared/prisma"

const BATCH_SIZE = 500

async function main() {
  const dryRun = process.argv.includes("--dry-run")
  let lastId: string | undefined
  let updated = 0
  let scanned = 0

  for (;;) {
    const rows = await prisma.sale.findMany({
      where: {
        status: SaleStatus.COMPLETED,
        netAmount: null,
        ...(lastId ? { id: { gt: lastId } } : {}),
      },
      select: { id: true, total: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
    })

    if (rows.length === 0) break

    for (const row of rows) {
      scanned += 1
      const split = splitPosVatIncludedTotal(
        row.total,
        DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS
      )
      if (!dryRun) {
        await prisma.sale.update({
          where: { id: row.id },
          data: {
            netAmount: split.net,
            vatAmount: split.vat,
            vatRateBps: DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS,
            taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
            outputVatAccountCode: DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
          },
        })
      }
      updated += 1
    }

    lastId = rows[rows.length - 1]?.id
    if (rows.length < BATCH_SIZE) break
  }

  console.log(
    dryRun
      ? `[dry-run] Would backfill ${updated} sale(s) (scanned ${scanned})`
      : `Backfilled ${updated} sale(s)`
  )
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

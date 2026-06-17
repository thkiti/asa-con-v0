/**
 * Finance UAT reset — DRY RUN by default. Does NOT delete unless --execute --confirm=FINANCE_UAT_RESET_CONFIRMED
 *
 * Usage:
 *   npx tsx scripts/uat/finance-uat-reset.ts
 *   npx tsx scripts/uat/finance-uat-reset.ts --scope=manual-only
 *   npx tsx scripts/uat/finance-uat-reset.ts --scope=all-gl --execute --confirm=FINANCE_UAT_RESET_CONFIRMED
 */
import "dotenv/config"
import { config } from "dotenv"
config({ path: ".env.local" })

import {
  FINANCE_UAT_OPERATIONAL_REF_TYPES,
  FINANCE_UAT_RESET_CONFIRM_TOKEN,
  type FinanceUatResetScope,
  refTypesForScope,
} from "@/lib/uat/finance-uat-scopes"
import { prisma } from "@/lib/shared/prisma"

function parseArgs(argv: string[]) {
  const execute = argv.includes("--execute")
  const scopeArg = argv.find((a) => a.startsWith("--scope="))
  const confirmArg = argv.find((a) => a.startsWith("--confirm="))
  const scope = (scopeArg?.split("=")[1] ?? "manual-only") as FinanceUatResetScope
  const confirm = confirmArg?.split("=")[1] ?? ""
  return { execute, scope, confirm }
}

async function countScoped(refTypes: string[]) {
  const voucherWhere = { refType: { in: refTypes } }
  const [vouchers, journals, manualEntries, manualLines] = await Promise.all([
    prisma.voucher.count({ where: voucherWhere }),
    prisma.journalEntry.count({ where: { voucher: voucherWhere } }),
    prisma.manualJournalEntry.count(),
    prisma.manualJournalEntryLine.count(),
  ])
  return { vouchers, journals, manualEntries, manualLines }
}

async function countPreserved() {
  const [coa, branches, staff, products, sales, stockDocs, periods] =
    await Promise.all([
      prisma.glAccount.count({ where: { deleted: false } }),
      prisma.branch.count({ where: { deleted: false } }),
      prisma.staff.count({ where: { deleted: false } }),
      prisma.product.count({ where: { deleted: false } }),
      prisma.sale.count(),
      prisma.stockDocument.count(),
      prisma.accountingPeriod.count(),
    ])
  return { coa, branches, staff, products, sales, stockDocs, periods }
}

async function executeReset(refTypes: string[]) {
  await prisma.$transaction(async (tx) => {
    const voucherIds = (
      await tx.voucher.findMany({
        where: { refType: { in: refTypes } },
        select: { id: true },
      })
    ).map((v) => v.id)

    if (voucherIds.length > 0) {
      await tx.manualJournalEntry.updateMany({
        where: {
          OR: [
            { postedVoucherId: { in: voucherIds } },
            {
              postedJournalEntry: {
                voucherId: { in: voucherIds },
              },
            },
            {
              reversalJournalEntry: {
                voucherId: { in: voucherIds },
              },
            },
          ],
        },
        data: {
          postedVoucherId: null,
          postedJournalEntryId: null,
          reversalJournalEntryId: null,
        },
      })

      // Reversal journals first (self-FK on JournalEntry)
      await tx.journalEntry.deleteMany({
        where: {
          reversalOfJournalEntryId: { not: null },
          voucherId: { in: voucherIds },
        },
      })
      await tx.journalEntry.deleteMany({
        where: { voucherId: { in: voucherIds } },
      })
      await tx.voucher.deleteMany({ where: { id: { in: voucherIds } } })
    }

    // Workflow documents (OPB, MAJ, etc.) — all statuses including posted links cleared above
    await tx.manualJournalEntry.deleteMany({})
  })
}

async function main() {
  const { execute, scope, confirm } = parseArgs(process.argv.slice(2))
  const refTypes = refTypesForScope(scope)

  console.log("=== Finance UAT Reset ===")
  console.log("Mode:", execute ? "EXECUTE" : "DRY RUN")
  console.log("Scope:", scope)
  console.log("Ref types targeted:", refTypes.join(", "))

  const toRemove = await countScoped(refTypes)
  const preserved = await countPreserved()

  const operationalJournals =
    scope === "manual-only"
      ? await prisma.journalEntry.count({
          where: { voucher: { refType: { in: [...FINANCE_UAT_OPERATIONAL_REF_TYPES] } } },
        })
      : 0

  console.log("\n--- Will remove (scope) ---")
  console.log(JSON.stringify(toRemove, null, 2))
  console.log("\n--- Will preserve ---")
  console.log(JSON.stringify(preserved, null, 2))

  if (scope === "manual-only" && operationalJournals > 0) {
    console.log("\n⚠ RISK: manual-only scope leaves operational GL postings:")
    console.log(`  ${operationalJournals} journal(s) from POS_SALE / POS_REFUND / STOCK_DOC_POST`)
    console.log("  Trial Balance may still show balances until those are removed (scope=all-gl).")
  }

  if (scope === "all-gl") {
    console.log("\n⚠ RISK: all-gl scope deletes POS/stock GL vouchers.")
    console.log("  POS sales and stock documents remain, but GL trace vouchers will be removed.")
  }

  if (!execute) {
    console.log("\nDry run complete. No data changed.")
    console.log(
      "To execute after backup: npx tsx scripts/uat/finance-uat-reset.ts",
      `--scope=${scope} --execute --confirm=${FINANCE_UAT_RESET_CONFIRM_TOKEN}`
    )
    return
  }

  if (confirm !== FINANCE_UAT_RESET_CONFIRM_TOKEN) {
    console.error(
      `\nRefusing execute: pass --confirm=${FINANCE_UAT_RESET_CONFIRM_TOKEN}`
    )
    process.exit(1)
  }

  console.log("\nExecuting reset…")
  await executeReset(refTypes)
  console.log("Reset complete. Run: npx tsx scripts/uat/finance-uat-verify.ts")
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

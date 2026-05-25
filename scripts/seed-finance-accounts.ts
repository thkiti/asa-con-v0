/**
 * Minimal chart-of-accounts seed for local dev.
 * Usage: npx tsx scripts/seed-finance-accounts.ts
 */
import { GlAccountType } from "../generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "../lib/finance/account-map"
import { prisma } from "../lib/shared/prisma"

const ROWS: { code: string; name: string; accountType: GlAccountType }[] = [
  { code: DEFAULT_ACCOUNT_CODES.INVENTORY, name: "Inventory", accountType: GlAccountType.ASSET },
  { code: DEFAULT_ACCOUNT_CODES.CASH, name: "Cash", accountType: GlAccountType.ASSET },
  { code: DEFAULT_ACCOUNT_CODES.CARD_CLEARING, name: "Card clearing", accountType: GlAccountType.ASSET },
  { code: DEFAULT_ACCOUNT_CODES.REVENUE, name: "Sales revenue", accountType: GlAccountType.REVENUE },
  { code: DEFAULT_ACCOUNT_CODES.COGS, name: "Cost of goods sold", accountType: GlAccountType.EXPENSE },
  { code: DEFAULT_ACCOUNT_CODES.AP, name: "Accounts payable", accountType: GlAccountType.LIABILITY },
]

async function main() {
  for (const row of ROWS) {
    await prisma.glAccount.upsert({
      where: { code: row.code },
      create: row,
      update: { name: row.name, accountType: row.accountType, isActive: true, deleted: false },
    })
  }
  console.log(`Seeded ${ROWS.length} GL accounts`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
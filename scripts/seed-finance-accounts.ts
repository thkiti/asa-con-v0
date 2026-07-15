/**
 * Minimal chart-of-accounts seed for local dev.
 * Usage: npx tsx scripts/seed-finance-accounts.ts
 *
 * Does not run automatically — invoke manually against a dev database only.
 */
import { GlAccountType } from "../generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "../lib/finance/account-map"
import { prisma } from "../lib/shared/prisma"

type SeedRow = {
  code: string
  name: string
  accountType: GlAccountType
  /** Parent account code when a matching header row exists in this seed. */
  parentCode?: string
}

const ROWS: SeedRow[] = [
  { code: DEFAULT_ACCOUNT_CODES.INVENTORY, name: "Inventory", accountType: GlAccountType.ASSET },
  { code: DEFAULT_ACCOUNT_CODES.CASH, name: "Cash in Drawer", accountType: GlAccountType.ASSET },
  {
    code: DEFAULT_ACCOUNT_CODES.CASH_IN_TRANSIT_COLLECTOR,
    name: "Cash in Transit",
    accountType: GlAccountType.ASSET,
  },
  { code: DEFAULT_ACCOUNT_CODES.BANK, name: "Bank Account", accountType: GlAccountType.ASSET },
  { code: DEFAULT_ACCOUNT_CODES.CARD_CLEARING, name: "Card Clearing", accountType: GlAccountType.ASSET },
  {
    code: DEFAULT_ACCOUNT_CODES.BANK_TRANSFER_CLEARING,
    name: "Bank Transfer Clearing",
    accountType: GlAccountType.ASSET,
  },
  {
    code: DEFAULT_ACCOUNT_CODES.POS_OTHER_CLEARING,
    name: "POS Other Clearing",
    accountType: GlAccountType.ASSET,
  },
  { code: DEFAULT_ACCOUNT_CODES.REVENUE, name: "Sales Revenue", accountType: GlAccountType.REVENUE },
  {
    code: DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
    name: "Output VAT",
    accountType: GlAccountType.LIABILITY,
  },
  { code: DEFAULT_ACCOUNT_CODES.COGS, name: "Cost of goods sold", accountType: GlAccountType.EXPENSE },
  { code: DEFAULT_ACCOUNT_CODES.AP, name: "Accounts payable", accountType: GlAccountType.LIABILITY },
]

async function main() {
  for (const row of ROWS) {
    await prisma.glAccount.upsert({
      where: { code: row.code },
      create: {
        code: row.code,
        name: row.name,
        accountType: row.accountType,
        isActive: true,
        deleted: false,
      },
      update: {
        name: row.name,
        accountType: row.accountType,
        isActive: true,
        deleted: false,
      },
    })
  }

  for (const row of ROWS) {
    if (!row.parentCode) {
      await prisma.glAccount.update({
        where: { code: row.code },
        data: { parentId: null },
      })
      continue
    }
    const parent = await prisma.glAccount.findUnique({
      where: { code: row.parentCode },
      select: { id: true },
    })
    if (!parent) continue
    await prisma.glAccount.update({
      where: { code: row.code },
      data: { parentId: parent.id },
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

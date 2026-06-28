/**
 * Seed default AS/ASAS VAT output policy for POS checkout.
 * Usage: npx tsx scripts/seed-tax-policies.ts
 */
import { DEFAULT_ACCOUNT_CODES } from "../lib/finance/account-map"
import {
  DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS,
  DEFAULT_VAT_POLICY_EFFECTIVE_FROM,
  VAT_OUTPUT_STANDARD_TAX_CODE,
} from "../lib/finance/tax-policy"
import { prisma } from "../lib/shared/prisma"

async function main() {
  await prisma.taxPolicy.upsert({
    where: { id: "seed-as-vat-output-standard-2026" },
    create: {
      id: "seed-as-vat-output-standard-2026",
      legalEntityCode: "AS",
      taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
      rateBps: DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS,
      inclusive: true,
      outputVatAccountCode: DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
      effectiveFrom: new Date(`${DEFAULT_VAT_POLICY_EFFECTIVE_FROM}T00:00:00.000Z`),
      effectiveTo: null,
      isActive: true,
      description: "Standard 7% VAT-inclusive POS output tax (AS/ASAS)",
    },
    update: {
      rateBps: DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS,
      inclusive: true,
      outputVatAccountCode: DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
      effectiveFrom: new Date(`${DEFAULT_VAT_POLICY_EFFECTIVE_FROM}T00:00:00.000Z`),
      effectiveTo: null,
      isActive: true,
      description: "Standard 7% VAT-inclusive POS output tax (AS/ASAS)",
    },
  })

  console.log("Seeded AS VAT_OUTPUT_STANDARD tax policy")
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

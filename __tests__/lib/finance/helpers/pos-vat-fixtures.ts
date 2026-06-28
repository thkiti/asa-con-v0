import { Prisma } from "@/generated/prisma/client"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import {
  buildPosVatEconomics,
  splitPosVatIncludedTotal,
} from "@/lib/finance/pos-sale-vat"
import {
  DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS,
  VAT_OUTPUT_STANDARD_TAX_CODE,
} from "@/lib/finance/tax-policy"

/** Test fixture — not used by production pos-sale-vat logic. */
export const TEST_VAT_OUTPUT_STANDARD_POLICY = {
  taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
  rateBps: DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS,
  inclusive: true as const,
  outputVatAccountCode: DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
}

export function testVatEconomicsForGross(
  gross: string,
  rateBps = DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS,
  outputVatAccountCode = DEFAULT_ACCOUNT_CODES.OUTPUT_VAT
) {
  return buildPosVatEconomics(gross, {
    taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
    rateBps,
    inclusive: true,
    outputVatAccountCode,
  })
}

export function expectVatSplit(
  gross: string,
  rateBps: number,
  expected: { net: string; vat: string }
) {
  const split = splitPosVatIncludedTotal(gross, rateBps)
  expect(split.gross).toEqual(new Prisma.Decimal(gross))
  expect(split.net).toEqual(new Prisma.Decimal(expected.net))
  expect(split.vat).toEqual(new Prisma.Decimal(expected.vat))
}

import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { DEFAULT_ACCOUNT_CODES } from "@/lib/finance/account-map"
import {
  DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS,
  VAT_OUTPUT_STANDARD_TAX_CODE,
} from "./constants"
import type { ResolvedTaxPolicy } from "./types"

export function defaultAsVatOutputStandardPolicy(
  overrides: Partial<ResolvedTaxPolicy> = {}
): ResolvedTaxPolicy {
  return {
    legalEntityCode: "AS",
    taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
    rateBps: DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS,
    inclusive: true,
    outputVatAccountCode: DEFAULT_ACCOUNT_CODES.OUTPUT_VAT,
    effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
    effectiveTo: null,
    description: "Standard 7% VAT-inclusive POS output tax (AS/ASAS)",
    ...overrides,
  }
}

import type { Prisma } from "@/generated/prisma/client"
import { buildPosVatEconomics, type PosVatEconomics } from "@/lib/finance/pos-sale-vat"
import {
  resolveEffectiveTaxPolicy,
  VAT_OUTPUT_STANDARD_TAX_CODE,
} from "@/lib/finance/tax-policy"
import {
  DEFAULT_DOCUMENT_ENTITY_CODE,
  type DocumentEntityCode,
} from "@/lib/legal-entity/constants"

/** POS checkout finance posting is AS / ASAS only in this phase. */
export function resolvePosLegalEntityCode(): DocumentEntityCode {
  return DEFAULT_DOCUMENT_ENTITY_CODE
}

export async function resolvePosSaleVatEconomics(
  tx: Prisma.TransactionClient,
  input: {
    documentDate: Date
    grossTotal: Parameters<typeof buildPosVatEconomics>[0]
  }
): Promise<PosVatEconomics> {
  const policy = await resolveEffectiveTaxPolicy(tx, {
    legalEntityCode: resolvePosLegalEntityCode(),
    taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
    documentDate: input.documentDate,
  })
  return buildPosVatEconomics(input.grossTotal, policy)
}

export function saleVatSnapshotFields(vatEconomics: PosVatEconomics) {
  return {
    netAmount: vatEconomics.net,
    vatAmount: vatEconomics.vat,
    vatRateBps: vatEconomics.rateBps,
    taxCode: vatEconomics.taxCode,
    outputVatAccountCode: vatEconomics.outputVatAccountCode,
  }
}

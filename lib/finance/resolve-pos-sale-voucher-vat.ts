import type { Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"
import {
  buildPosVatEconomics,
  posVatEconomicsFromSaleSnapshot,
  type PosVatEconomics,
} from "./pos-sale-vat"
import {
  resolveEffectiveTaxPolicy,
  VAT_OUTPUT_STANDARD_TAX_CODE,
} from "./tax-policy"
import type { PostSaleVoucherInput } from "./posting-types"

export async function resolvePosSaleVoucherVatEconomics(
  tx: Prisma.TransactionClient,
  input: {
    legalEntityCode?: DocumentEntityCode
    sale: PostSaleVoucherInput["sale"]
    vatEconomics?: PosVatEconomics
  }
): Promise<PosVatEconomics> {
  if (input.vatEconomics) {
    return input.vatEconomics
  }

  const {
    total,
    netAmount,
    vatAmount,
    vatRateBps,
    taxCode,
    outputVatAccountCode,
    createdAt,
  } = input.sale

  if (
    netAmount != null &&
    vatAmount != null &&
    vatRateBps != null &&
    taxCode &&
    outputVatAccountCode
  ) {
    return posVatEconomicsFromSaleSnapshot({
      total,
      netAmount,
      vatAmount,
      vatRateBps,
      taxCode,
      outputVatAccountCode,
    })
  }

  const legalEntityCode = input.legalEntityCode ?? DEFAULT_DOCUMENT_ENTITY_CODE
  const policy = await resolveEffectiveTaxPolicy(tx, {
    legalEntityCode,
    taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
    documentDate: createdAt,
  })
  return buildPosVatEconomics(total, policy)
}

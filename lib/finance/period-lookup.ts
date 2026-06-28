import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { DEFAULT_DOCUMENT_ENTITY_CODE } from "@/lib/legal-entity/constants"

export function resolvePeriodLegalEntityCode(
  legalEntityCode?: DocumentEntityCode | null
): DocumentEntityCode {
  return legalEntityCode ?? DEFAULT_DOCUMENT_ENTITY_CODE
}

export function accountingPeriodUniqueWhere(input: {
  periodKey: string
  legalEntityCode: DocumentEntityCode
}) {
  return {
    legalEntityCode_periodKey: {
      legalEntityCode: input.legalEntityCode,
      periodKey: input.periodKey,
    },
  }
}

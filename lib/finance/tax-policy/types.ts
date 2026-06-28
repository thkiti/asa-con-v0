import type { DocumentEntityCode } from "@/lib/legal-entity/constants"

export type ResolvedTaxPolicy = {
  legalEntityCode: DocumentEntityCode
  taxCode: string
  rateBps: number
  inclusive: boolean
  outputVatAccountCode: string
  effectiveFrom: Date
  effectiveTo: Date | null
  description: string | null
}

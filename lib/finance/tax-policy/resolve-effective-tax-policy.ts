import type { Prisma } from "@/generated/prisma/client"
import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { defaultAsVatOutputStandardPolicy } from "./default-tax-policies"
import type { ResolvedTaxPolicy } from "./types"

export function toPolicyCalendarDate(value: Date): Date {
  return new Date(
    Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate())
  )
}

function mapRow(row: {
  legalEntityCode: string
  taxCode: string
  rateBps: number
  inclusive: boolean
  outputVatAccountCode: string
  effectiveFrom: Date
  effectiveTo: Date | null
  description: string | null
}): ResolvedTaxPolicy {
  return {
    legalEntityCode: row.legalEntityCode as DocumentEntityCode,
    taxCode: row.taxCode,
    rateBps: row.rateBps,
    inclusive: row.inclusive,
    outputVatAccountCode: row.outputVatAccountCode,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    description: row.description,
  }
}

export async function resolveEffectiveTaxPolicy(
  tx: Prisma.TransactionClient,
  input: {
    legalEntityCode: DocumentEntityCode
    taxCode: string
    documentDate: Date
  }
): Promise<ResolvedTaxPolicy> {
  const documentDate = toPolicyCalendarDate(input.documentDate)

  const rows = await tx.taxPolicy.findMany({
    where: {
      legalEntityCode: input.legalEntityCode,
      taxCode: input.taxCode,
      isActive: true,
      effectiveFrom: { lte: documentDate },
      OR: [{ effectiveTo: null }, { effectiveTo: { gte: documentDate } }],
    },
    orderBy: { effectiveFrom: "desc" },
    take: 1,
  })

  const row = rows[0]
  if (row) {
    return mapRow(row)
  }

  const fallback = defaultAsVatOutputStandardPolicy()
  if (
    input.legalEntityCode === fallback.legalEntityCode &&
    input.taxCode === fallback.taxCode &&
    documentDate >= toPolicyCalendarDate(fallback.effectiveFrom)
  ) {
    return fallback
  }

  throw new FinancePostingError(
    `No active tax policy for ${input.legalEntityCode}/${input.taxCode} on ${documentDate.toISOString().slice(0, 10)}`,
    "TAX_POLICY_NOT_FOUND"
  )
}

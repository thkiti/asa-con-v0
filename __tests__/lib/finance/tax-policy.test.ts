import type { DocumentEntityCode } from "@/lib/legal-entity/constants"
import {
  resolveEffectiveTaxPolicy,
  toPolicyCalendarDate,
  VAT_OUTPUT_STANDARD_TAX_CODE,
} from "@/lib/finance/tax-policy"
import { createMockTx } from "../stock/helpers/mock-tx"

type TaxPolicyRow = {
  id: string
  legalEntityCode: string
  taxCode: string
  rateBps: number
  inclusive: boolean
  outputVatAccountCode: string
  effectiveFrom: Date
  effectiveTo: Date | null
  isActive: boolean
  description: string | null
}

function createTaxPolicyMockTx(rows: TaxPolicyRow[]) {
  const { tx } = createMockTx()
  return {
    tx: {
      ...tx,
      taxPolicy: {
        findMany: async ({
          where,
          take,
        }: {
          where: {
            legalEntityCode: string
            taxCode: string
            isActive: boolean
            effectiveFrom: { lte: Date }
            OR: Array<{ effectiveTo: null } | { effectiveTo: { gte: Date } }>
          }
          orderBy: { effectiveFrom: "desc" }
          take: number
        }) => {
          const documentDate = where.effectiveFrom.lte
          const matched = rows
            .filter((row) => {
              if (row.legalEntityCode !== where.legalEntityCode) return false
              if (row.taxCode !== where.taxCode) return false
              if (!row.isActive) return false
              if (row.effectiveFrom.getTime() > documentDate.getTime()) return false
              if (row.effectiveTo && row.effectiveTo.getTime() < documentDate.getTime()) {
                return false
              }
              return true
            })
            .sort((a, b) => b.effectiveFrom.getTime() - a.effectiveFrom.getTime())
          return matched.slice(0, take)
        },
      },
    },
  }
}

describe("resolveEffectiveTaxPolicy", () => {
  const policies: TaxPolicyRow[] = [
    {
      id: "p7",
      legalEntityCode: "AS",
      taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
      rateBps: 700,
      inclusive: true,
      outputVatAccountCode: "4602",
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      effectiveTo: new Date("2026-12-31T00:00:00.000Z"),
      isActive: true,
      description: "7% policy",
    },
    {
      id: "p10",
      legalEntityCode: "AS",
      taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
      rateBps: 1000,
      inclusive: true,
      outputVatAccountCode: "4602",
      effectiveFrom: new Date("2027-01-01T00:00:00.000Z"),
      effectiveTo: null,
      isActive: true,
      description: "10% policy",
    },
  ]

  it("selects 7% policy for 2026-06-15", async () => {
    const { tx } = createTaxPolicyMockTx(policies)
    const policy = await resolveEffectiveTaxPolicy(tx as never, {
      legalEntityCode: "AS" as DocumentEntityCode,
      taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
      documentDate: new Date("2026-06-15T12:00:00.000Z"),
    })
    expect(policy.rateBps).toBe(700)
    expect(policy.outputVatAccountCode).toBe("4602")
  })

  it("selects 10% policy for 2027-03-01", async () => {
    const { tx } = createTaxPolicyMockTx(policies)
    const policy = await resolveEffectiveTaxPolicy(tx as never, {
      legalEntityCode: "AS" as DocumentEntityCode,
      taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
      documentDate: new Date("2027-03-01T09:00:00.000Z"),
    })
    expect(policy.rateBps).toBe(1000)
  })

  it("normalizes document date to UTC calendar day", () => {
    expect(
      toPolicyCalendarDate(new Date("2026-06-15T23:59:59.999Z")).toISOString()
    ).toBe("2026-06-15T00:00:00.000Z")
  })
})

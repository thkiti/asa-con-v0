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
import { expectVatSplit } from "./helpers/pos-vat-fixtures"

describe("pos-sale-vat", () => {
  it("splits 107 gross at 700 bps into net 100 and VAT 7", () => {
    expectVatSplit("107", DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS, {
      net: "100",
      vat: "7",
    })
  })

  it("splits 110 gross at 1000 bps into net 100 and VAT 10", () => {
    expectVatSplit("110", 1000, {
      net: "100",
      vat: "10",
    })
  })

  it("buildPosVatEconomics carries policy output VAT account code", () => {
    const economics = buildPosVatEconomics("107", {
      taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
      rateBps: DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS,
      inclusive: true,
      outputVatAccountCode: "4699",
    })
    expect(economics.outputVatAccountCode).toBe("4699")
    expect(economics.net).toEqual(new Prisma.Decimal("100"))
    expect(economics.vat).toEqual(new Prisma.Decimal("7"))
  })

  it("does not hardcode rate constants in pos-sale-vat module source", () => {
    const source = require("fs").readFileSync(
      require("path").join(__dirname, "../../../lib/finance/pos-sale-vat.ts"),
      "utf8"
    )
    expect(source).not.toMatch(/0\.07/)
    expect(source).not.toMatch(/POS_VAT_INCLUDED_RATE/)
  })
})

describe("pos-sale-vat rounding", () => {
  it("preserves 250 gross split at 700 bps", () => {
    const split = splitPosVatIncludedTotal("250", DEFAULT_VAT_OUTPUT_STANDARD_RATE_BPS)
    expect(split.net).toEqual(new Prisma.Decimal("233.64"))
    expect(split.vat).toEqual(new Prisma.Decimal("16.36"))
    expect(split.net.plus(split.vat)).toEqual(split.gross)
  })
})

describe("pos-sale-vat account defaults in fixtures only", () => {
  it("uses 4602 in test fixture policy only", () => {
    expect(DEFAULT_ACCOUNT_CODES.OUTPUT_VAT).toBe("4602")
  })
})

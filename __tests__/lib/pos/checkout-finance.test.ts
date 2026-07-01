import { Prisma } from "@/generated/prisma/client"
import { PaymentMethod } from "@/generated/prisma/client"
import { VAT_OUTPUT_STANDARD_TAX_CODE } from "@/lib/finance/tax-policy"
import {
  buildPostSaleVoucherInput,
  sumCogsFromLedgerIssues,
} from "@/lib/pos/checkout-finance"
import { testVatEconomicsForGross } from "../finance/helpers/pos-vat-fixtures"

describe("checkout-finance DTO helpers", () => {
  it("sumCogsFromLedgerIssues uses ledger unitCost not sale price", () => {
    const ledgerRows = [
      { qtyOut: 2, unitCost: new Prisma.Decimal("12.50") },
      { qtyOut: 1, unitCost: new Prisma.Decimal("8.00") },
    ]
    const salePrices = [{ qty: 2, unitPrice: 99 }, { qty: 1, unitPrice: 50 }]

    const cogs = sumCogsFromLedgerIssues(ledgerRows)
    const salePriceSum = salePrices.reduce(
      (s, l) => s + l.qty * l.unitPrice,
      0
    )

    expect(cogs.toNumber()).toBe(33)
    expect(Number(salePriceSum)).toBe(248)
    expect(cogs.toNumber()).not.toBe(salePriceSum)
  })

  it("ignores rows with zero qtyOut", () => {
    const cogs = sumCogsFromLedgerIssues([
      { qtyOut: 0, unitCost: new Prisma.Decimal("100") },
      { qtyOut: 3, unitCost: new Prisma.Decimal("5") },
    ])
    expect(cogs.toNumber()).toBe(15)
  })

  it("buildPostSaleVoucherInput shapes normalized payload", () => {
    const tx = {} as Parameters<typeof buildPostSaleVoucherInput>[0]["tx"]
    const createdAt = new Date("2026-06-15T10:00:00.000Z")
    const vatEconomics = testVatEconomicsForGross("100")
    const payload = buildPostSaleVoucherInput({
      tx,
      receiptNo: "REC-SH001-202606-0042",
      legalEntityCode: "AS",
      sale: {
        id: "sale-1",
        branchId: "branch-1",
        total: new Prisma.Decimal("100"),
        createdAt,
        netAmount: vatEconomics.net,
        vatAmount: vatEconomics.vat,
        vatRateBps: vatEconomics.rateBps,
        taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
        outputVatAccountCode: vatEconomics.outputVatAccountCode,
      },
      payment: { method: PaymentMethod.CASH },
      ledgerRows: [{ qtyOut: 2, unitCost: new Prisma.Decimal("10") }],
      vatEconomics,
    })

    expect(payload.tx).toBe(tx)
    expect(payload.legalEntityCode).toBe("AS")
    expect(payload.sale).toMatchObject({
      id: "sale-1",
      branchId: "branch-1",
      receiptNo: "REC-SH001-202606-0042",
      total: new Prisma.Decimal("100"),
      paymentMethod: PaymentMethod.CASH,
      createdAt,
      vatRateBps: 700,
      taxCode: VAT_OUTPUT_STANDARD_TAX_CODE,
    })
    expect(payload.vatEconomics).toBe(vatEconomics)
    expect(payload.ledgerResult?.cogsAmount?.toNumber()).toBe(20)
  })
})

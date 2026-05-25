import { Prisma } from "@/generated/prisma/client"
import { PaymentMethod } from "@/generated/prisma/client"
import {
  buildPostSaleVoucherInput,
  sumCogsFromLedgerIssues,
} from "@/lib/pos/checkout-finance"

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
    const payload = buildPostSaleVoucherInput({
      tx,
      sale: {
        id: "sale-1",
        branchId: "branch-1",
        total: new Prisma.Decimal("100"),
      },
      payment: { method: PaymentMethod.CASH },
      ledgerRows: [{ qtyOut: 2, unitCost: new Prisma.Decimal("10") }],
    })

    expect(payload.tx).toBe(tx)
    expect(payload.sale).toEqual({
      id: "sale-1",
      branchId: "branch-1",
      total: new Prisma.Decimal("100"),
      paymentMethod: PaymentMethod.CASH,
    })
    expect(payload.ledgerResult?.cogsAmount?.toNumber()).toBe(20)
  })
})

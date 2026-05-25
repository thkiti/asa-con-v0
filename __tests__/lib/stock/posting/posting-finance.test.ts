import { Prisma } from "@/generated/prisma/client"
import {
  buildPostStockDocumentVoucherInput,
  sumInboundValueFromLedger,
} from "@/lib/stock/posting-finance"

describe("posting-finance DTO helpers", () => {
  it("sumInboundValueFromLedger sums qtyIn × unitCost from ledger rows", () => {
    const rows = [
      { qtyIn: 3, qtyOut: 0, unitCost: new Prisma.Decimal("12.50") },
      { qtyIn: 2, qtyOut: 0, unitCost: new Prisma.Decimal("8.00") },
    ]

    expect(sumInboundValueFromLedger(rows).toNumber()).toBe(53.5)
  })

  it("ignores rows with zero qtyIn", () => {
    const inbound = sumInboundValueFromLedger([
      { qtyIn: 0, qtyOut: 1, unitCost: new Prisma.Decimal("100") },
      { qtyIn: 4, qtyOut: 0, unitCost: new Prisma.Decimal("5") },
    ])
    expect(inbound.toNumber()).toBe(20)
  })

  it("buildPostStockDocumentVoucherInput uses ledger inbound totals", () => {
    const tx = {} as Parameters<typeof buildPostStockDocumentVoucherInput>[0]["tx"]
    const payload = buildPostStockDocumentVoucherInput({
      tx,
      doc: {
        id: "doc-1",
        refNo: "REF-1",
        branchId: "branch-1",
        docType: "PURCHASE",
      },
      ledgerRows: [{ qtyIn: 3, qtyOut: 0, unitCost: new Prisma.Decimal("10") }],
    })

    expect(payload.tx).toBe(tx)
    expect(payload.ledgerResult.inboundValue.toNumber()).toBe(30)
  })
})

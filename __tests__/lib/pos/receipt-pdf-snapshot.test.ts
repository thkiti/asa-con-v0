import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import {
  buildReceiptPdfSnapshotFromPrintContext,
  receiptPrintContextFromSnapshot,
} from "@/lib/pos/receipt-pdf-snapshot"
import type { ReceiptPrintContext } from "@/lib/pos/receipt-print-context"

const sampleContext: ReceiptPrintContext = {
  saleId: "sale-1",
  receiptNo: "REC-SH001-202606-0001",
  issuedAt: "2026-06-15T10:00:00.000Z",
  branchCode: "SH001",
  branchName: "Shop",
  branchAddress: "123 Main",
  branchPhone: "02-000-0000",
  companyDisplayName: "ASA SERVICES",
  companyTaxId: "TAX-1",
  machineTaxId: "M-1",
  cashierDisplay: "103-Somsak",
  lines: [
    {
      code: "0101001",
      name: "Widget",
      qty: 2,
      unitPrice: "50.00",
      lineTotal: "100.00",
    },
  ],
  total: "100.00",
  paymentMethod: "CASH",
  cashAmount: "100.00",
  change: "0.00",
  thermalLayouts: DEFAULT_THERMAL_LAYOUTS,
  thermalLayout: {
    ...DEFAULT_THERMAL_LAYOUTS.RECEIPT,
    headerBlockText: "ASA SERVICES",
    footerBlockText: "Thank you",
  },
}

describe("buildReceiptPdfSnapshotFromPrintContext", () => {
  it("freezes receipt identity, lines, payment, and layout settings", () => {
    const snapshot = buildReceiptPdfSnapshotFromPrintContext({
      receiptId: "receipt-1",
      branchId: "branch-1",
      context: sampleContext,
    })

    expect(snapshot.snapshotVersion).toBe(1)
    expect(snapshot.receiptId).toBe("receipt-1")
    expect(snapshot.saleId).toBe("sale-1")
    expect(snapshot.branchId).toBe("branch-1")
    expect(snapshot.receiptNo).toBe("REC-SH001-202606-0001")
    expect(snapshot.issuedAt).toBe(sampleContext.issuedAt)
    expect(snapshot.branchCode).toBe("SH001")
    expect(snapshot.branchName).toBe("Shop")
    expect(snapshot.branchAddress).toBe("123 Main")
    expect(snapshot.cashierDisplay).toBe("103-Somsak")
    expect(snapshot.lines).toEqual([
      {
        code: "0101001",
        name: "Widget",
        qty: 2,
        unitPrice: "50.00",
        lineTotal: "100.00",
      },
    ])
    expect(snapshot.total).toBe("100.00")
    expect(snapshot.paymentMethod).toBe("CASH")
    expect(snapshot.cashAmount).toBe("100.00")
    expect(snapshot.change).toBe("0.00")
    expect(snapshot.thermalLayout.headerBlockText).toBe("ASA SERVICES")
    expect(snapshot.thermalLayout.footerBlockText).toBe("Thank you")
  })

  it("round-trips through receiptPrintContextFromSnapshot for PDF render input", () => {
    const snapshot = buildReceiptPdfSnapshotFromPrintContext({
      receiptId: "receipt-1",
      branchId: "branch-1",
      context: sampleContext,
    })
    const roundTrip = receiptPrintContextFromSnapshot(snapshot)
    expect(roundTrip.receiptNo).toBe(sampleContext.receiptNo)
    expect(roundTrip.lines).toEqual(sampleContext.lines)
    expect(roundTrip.thermalLayout).toEqual(snapshot.thermalLayout)
  })
})

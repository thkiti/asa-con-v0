import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import { renderReceiptPdfFromSnapshot } from "@/lib/pos/receipt-pdf-render"
import type { ReceiptPdfSnapshot } from "@/lib/pos/receipt-pdf-snapshot-types"

const snapshot: ReceiptPdfSnapshot = {
  snapshotVersion: 1,
  receiptId: "receipt-1",
  saleId: "sale-1",
  branchId: "branch-1",
  receiptNo: "REC-SH001-202606-0001",
  issuedAt: "2026-06-15T10:00:00.000Z",
  branchCode: "SH001",
  branchName: "Shop",
  branchAddress: null,
  branchPhone: null,
  companyDisplayName: "ASA SERVICES",
  companyTaxId: "TAX-1",
  machineTaxId: null,
  cashierDisplay: "103-Somsak",
  lines: [
    {
      code: "0101001",
      name: "Widget",
      qty: 1,
      unitPrice: "100.00",
      lineTotal: "100.00",
    },
  ],
  total: "100.00",
  paymentMethod: "CASH",
  cashAmount: "100.00",
  change: "0.00",
  thermalLayout: DEFAULT_THERMAL_LAYOUTS.RECEIPT,
}

describe("renderReceiptPdfFromSnapshot", () => {
  it("returns valid PDF bytes from frozen snapshot", async () => {
    const buffer = await renderReceiptPdfFromSnapshot(snapshot)
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-")
    expect(buffer.length).toBeGreaterThan(100)
  })
})

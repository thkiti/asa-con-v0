import {
  buildReceiptSlipText,
  padReceiptLine,
  RECEIPT_PRINT_COLUMNS,
} from "@/lib/pos/receipt-slip-format"

describe("receipt-slip-format", () => {
  it("pads label lines to fixed column width", () => {
    const line = padReceiptLine("TOTAL", "123.45")
    expect(line.length).toBe(RECEIPT_PRINT_COLUMNS)
    expect(line.endsWith("123.45")).toBe(true)
  })

  it("builds text slip with required sections", () => {
    const text = buildReceiptSlipText({
      branchCode: "SH01",
      branchName: "Shop One",
      receiptNo: "R-abc-20260101-0001",
      issuedAt: "2026-01-15T10:30:00.000Z",
      cashierStaffId: "S001",
      lines: [
        {
          name: "Widget",
          code: "0101001",
          qty: 2,
          unitPrice: "50.00",
          lineTotal: "100.00",
        },
      ],
      total: "100.00",
      cashAmount: "100.00",
      change: "0.00",
    })

    expect(text).toContain("ASA SERVICES")
    expect(text).toContain("Receipt")
    expect(text).toContain("R-abc-20260101-0001")
    expect(text).toContain("Cashier")
    expect(text).toContain("S001")
    expect(text).toContain("Widget")
    expect(text).toContain("TOTAL")
    expect(text).toContain("CASH")
    expect(text).toContain("CHANGE")
    const rows = text.split("\n").filter((line) => line.length > 0)
    expect(rows.every((line) => line.length <= RECEIPT_PRINT_COLUMNS)).toBe(true)
  })
})

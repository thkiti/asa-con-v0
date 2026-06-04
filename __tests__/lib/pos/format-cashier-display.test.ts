import { formatCashierDisplay } from "@/lib/pos/format-cashier-display"

describe("formatCashierDisplay", () => {
  it("formats staff id and name", () => {
    expect(formatCashierDisplay("103", "Somsak Kamnuch")).toBe("103-Somsak Kamnuch")
  })

  it("falls back to staff id only", () => {
    expect(formatCashierDisplay("103", null)).toBe("103")
    expect(formatCashierDisplay("103", "")).toBe("103")
  })

  it("returns null when staff id missing", () => {
    expect(formatCashierDisplay(null, "Name")).toBeNull()
    expect(formatCashierDisplay("", "Name")).toBeNull()
  })
})

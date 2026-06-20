import {
  FINANCE_VOUCHER_PRINT_FONT_DATA_ATTR,
  FINANCE_VOUCHER_PRINT_FONT_NAME,
  FINANCE_VOUCHER_PRINT_FONT_STACK,
} from "@/lib/finance-ui/finance-voucher-print-font"

describe("finance-voucher-print-font", () => {
  it("defines THSarabunNew as the finance voucher print font", () => {
    expect(FINANCE_VOUCHER_PRINT_FONT_NAME).toBe("THSarabunNew")
    expect(FINANCE_VOUCHER_PRINT_FONT_STACK).toContain("THSarabunNew")
    expect(FINANCE_VOUCHER_PRINT_FONT_STACK).toContain("var(--font-finance-voucher")
    expect(FINANCE_VOUCHER_PRINT_FONT_DATA_ATTR).toBe("THSarabunNew")
  })
})

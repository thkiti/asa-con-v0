import { buildFinanceVoucherPrintCompactContextLines } from "@/lib/finance-ui/finance-voucher-print-compact-context"

describe("buildFinanceVoucherPrintCompactContextLines", () => {
  it("returns no lines when reference is empty and description matches header", () => {
    expect(
      buildFinanceVoucherPrintCompactContextLines({
        headerDescription: "OPENING BALANCE 2026",
        reference: null,
        description: "OPENING BALANCE 2026",
        remarks: null,
      })
    ).toEqual([])
  })

  it("omits empty reference and does not reserve a reference line", () => {
    expect(
      buildFinanceVoucherPrintCompactContextLines({
        headerDescription: "OPENING BALANCE 2026",
        reference: "   ",
        description: "OPENING BALANCE 2026",
        remarks: null,
      })
    ).toEqual([])
  })

  it("includes reference only when present", () => {
    expect(
      buildFinanceVoucherPrintCompactContextLines({
        headerDescription: "Monthly accrual",
        reference: "INV-100",
        description: "Monthly accrual",
        remarks: null,
      })
    ).toEqual([{ label: "Reference", value: "INV-100" }])
  })

  it("includes description only when it differs from the header", () => {
    expect(
      buildFinanceVoucherPrintCompactContextLines({
        headerDescription: "Header text",
        reference: null,
        description: "Different being text",
        remarks: null,
      })
    ).toEqual([{ label: "Description", value: "Different being text" }])
  })

  it("includes remarks when present", () => {
    expect(
      buildFinanceVoucherPrintCompactContextLines({
        headerDescription: "OPENING BALANCE 2026",
        reference: null,
        description: "OPENING BALANCE 2026",
        remarks: "Posted after TB review",
      })
    ).toEqual([{ label: "Remarks", value: "Posted after TB review" }])
  })

  it("includes PAV payee, pay from, and cheque fields", () => {
    expect(
      buildFinanceVoucherPrintCompactContextLines({
        headerDescription: "Office supplies",
        reference: "INV-1",
        description: "Office supplies",
        remarks: null,
        payeeName: "ABC Co.",
        payFromLabel: "10101001 — Bank",
        chequeNo: "999",
      })
    ).toEqual([
      { label: "Payee", value: "ABC Co." },
      { label: "Pay from", value: "10101001 — Bank" },
      { label: "Reference", value: "INV-1" },
      { label: "Cheque", value: "999" },
    ])
  })
})

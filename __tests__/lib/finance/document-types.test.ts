import {
  buildFinanceDocumentTypeSelectItems,
  FINANCE_DOCUMENT_TYPE_GROUP_LABELS,
  FINANCE_DOCUMENT_TYPES,
  formatFinanceDocumentTypeLabel,
  listFinanceDocumentTypeOptions,
} from "@/lib/finance/document-types"

describe("finance document types", () => {
  it("formats labels as code and business name", () => {
    expect(formatFinanceDocumentTypeLabel("REC")).toBe("REC • Receipt")
    expect(formatFinanceDocumentTypeLabel("MJV")).toBe("MJV • Manual Journal Voucher")
    expect(formatFinanceDocumentTypeLabel("ORI")).toBe("ORI • Shop Receipt")
  })

  it("keeps workflow order without alphabetical sorting", () => {
    expect(listFinanceDocumentTypeOptions().map((option) => option.value)).toEqual([
      "REC",
      "REF",
      "PAY",
      "PAV",
      "REV",
      "PCV",
      "MJV",
      "OPB",
      "CNT",
      "ADJ",
      "ORD",
      "DEY",
      "ORS",
      "ORI",
    ])
  })

  it("builds grouped select items with disabled section headers", () => {
    const items = buildFinanceDocumentTypeSelectItems(
      listFinanceDocumentTypeOptions({
        allowedValues: new Set(["REC", "MJV", "CNT"]),
      })
    )

    expect(items).toEqual([
      { kind: "group", group: "POS", label: FINANCE_DOCUMENT_TYPE_GROUP_LABELS.POS },
      { kind: "option", value: "REC", label: "REC • Receipt" },
      { kind: "group", group: "FINANCE", label: FINANCE_DOCUMENT_TYPE_GROUP_LABELS.FINANCE },
      { kind: "option", value: "MJV", label: "MJV • Manual Journal Voucher" },
      { kind: "group", group: "STOCK", label: FINANCE_DOCUMENT_TYPE_GROUP_LABELS.STOCK },
      { kind: "option", value: "CNT", label: "CNT • Stock Count" },
    ])
  })

  it("omits empty groups when filtering allowed values", () => {
    const items = buildFinanceDocumentTypeSelectItems(
      listFinanceDocumentTypeOptions({
        allowedValues: new Set(["MJV", "OPB"]),
      })
    )

    expect(items.map((item) => item.kind)).toEqual(["group", "option", "option"])
    expect(items.some((item) => item.kind === "group" && item.group === "POS")).toBe(false)
  })

  it("exposes reusable option metadata", () => {
    expect(FINANCE_DOCUMENT_TYPES[0]).toEqual({
      value: "REC",
      businessName: "Receipt",
      group: "POS",
      label: "REC • Receipt",
    })
  })
})

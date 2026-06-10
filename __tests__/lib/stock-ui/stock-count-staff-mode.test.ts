import {
  buildStockCountStaffHeadingLine,
  filterEditorActionsForStockCountStaff,
  formatStockCountStaffDate,
  isStockCountStaffEntry,
  STOCK_COUNT_STAFF_BACK_HREF,
  STOCK_COUNT_STAFF_FROM,
} from "@/lib/stock-ui/stock-count-staff-mode"
import { getEditorWorkflowActions } from "@/lib/stock-ui/document-permissions"

describe("stock-count-staff-mode", () => {
  it("detects staff entry from query param", () => {
    expect(STOCK_COUNT_STAFF_FROM).toBe("shop")
    expect(isStockCountStaffEntry("shop")).toBe(true)
    expect(isStockCountStaffEntry(" count ")).toBe(false)
    expect(isStockCountStaffEntry(undefined)).toBe(false)
  })

  it("builds one-line staff heading with metadata separators", () => {
    expect(
      buildStockCountStaffHeadingLine({
        refNo: "ADJ-SH001-202606-0001",
        branchCode: "SH001",
        branchName: "Chidlom",
        staffCode: "103",
        staffName: "Somsak Kamnuch",
        documentDate: "2026-06-10",
      })
    ).toBe(
      "ตรวจนับสต๊อก — ADJ-SH001-202606-0001 | SH001 • Chidlom | 103 • Somsak Kamnuch | 2026.06.10"
    )
  })

  it("formats document date for staff heading", () => {
    expect(formatStockCountStaffDate("2026-06-10")).toBe("2026.06.10")
    expect(formatStockCountStaffDate("2026-06-10T00:00:00.000Z")).toBe("2026.06.10")
  })

  it("filters toolbar to save and submit only", () => {
    const actions = getEditorWorkflowActions(
      { role: "SH_STAFF", docType: "ADJUSTMENT", status: "DRAFT" },
      { hasDocumentId: true }
    )
    const staffActions = filterEditorActionsForStockCountStaff(actions)

    expect(staffActions.map((action) => action.id)).toEqual(["save", "submit"])
    expect(staffActions.every((action) => action.visible)).toBe(true)
  })

  it("exposes POS back destination", () => {
    expect(STOCK_COUNT_STAFF_BACK_HREF).toBe("/shop")
  })
})

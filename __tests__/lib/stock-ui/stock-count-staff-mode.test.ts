import {
  buildStaffOperationalHeadingLine,
  buildStockCountStaffHeadingLine,
  filterEditorActionsForStockCountStaff,
  formatStaffOperationalSheetRefNo,
  formatStockCountStaffDate,
  isStaffOperationalSheet,
  isStockCountStaffEntry,
  OPERATIONAL_HEADING_SEGMENT_SEP,
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

  it("enables operational sheet for shop transfer-out and adjustment drafts", () => {
    const base = {
      documentId: "doc-1",
      refNo: "TO-1",
      status: "DRAFT" as const,
      date: "2026-06-10",
      branchId: "branch-shop",
      fromLocId: "branch-shop",
      toLocId: "",
      readOnly: false,
      lines: [],
    }

    expect(
      isStaffOperationalSheet({ ...base, docType: "TRANSFER_OUT" }, true)
    ).toBe(true)
    expect(
      isStaffOperationalSheet({ ...base, docType: "ADJUSTMENT" }, true)
    ).toBe(true)
    expect(
      isStaffOperationalSheet({ ...base, docType: "PERFORMANCE" }, true)
    ).toBe(false)
    expect(
      isStaffOperationalSheet(
        { ...base, docType: "TRANSFER_OUT", readOnly: true },
        true
      )
    ).toBe(false)
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
      "ตรวจนับสต๊อก • CNT-SH001-202606-0001 • SH001 • Chidlom • 103 • Somsak Kamnuch • 2026.06.10"
    )
  })

  it("builds ORDER staff heading for transfer-out operational sheet", () => {
    expect(
      buildStaffOperationalHeadingLine(
        {
          refNo: "TRO-SH001-202606-0002",
          branchCode: "SH001",
          branchName: "Chidlom",
          staffCode: "103",
          staffName: "Somsak Kamnuch",
          documentDate: "2026-06-10",
        },
        {
          docType: "TRANSFER_OUT",
          status: "DRAFT",
          viewerEntityCode: "AS",
        }
      )
    ).toBe(
      "ใบสั่งของ • ORD-SH001-202606-0002 • SH001 • Chidlom • 103 • Somsak Kamnuch • 2026.06.10"
    )
  })

  it("formats stored running refs for POS staff identity lines", () => {
    expect(
      formatStaffOperationalSheetRefNo(
        {
          docType: "ADJUSTMENT",
          status: "DRAFT",
          viewerEntityCode: "AS",
        },
        "ADJ-SH001-202606-0001"
      )
    ).toBe("CNT-SH001-202606-0001")

    expect(
      formatStaffOperationalSheetRefNo(
        {
          docType: "TRANSFER_OUT",
          status: "DRAFT",
          viewerEntityCode: "AS",
        },
        "TRO-SH001-202606-0001"
      )
    ).toBe("ORD-SH001-202606-0001")
  })

  it("uses bullet separators only on operational identity headings", () => {
    const line = buildStaffOperationalHeadingLine(
      {
        refNo: "TRO-SH001-202606-0001",
        branchCode: "SH001",
        branchName: "Chidlom",
        staffCode: "103",
        staffName: "Somsak Kamnuch",
        documentDate: "2026-06-12",
      },
      {
        docType: "TRANSFER_OUT",
        status: "DRAFT",
        viewerEntityCode: "AS",
      }
    )

    expect(line).toBe(
      "ใบสั่งของ • ORD-SH001-202606-0001 • SH001 • Chidlom • 103 • Somsak Kamnuch • 2026.06.12"
    )
    expect(line).not.toContain("|")
    expect(line).not.toContain(" — ")
    expect(line.split(OPERATIONAL_HEADING_SEGMENT_SEP)).toHaveLength(7)
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

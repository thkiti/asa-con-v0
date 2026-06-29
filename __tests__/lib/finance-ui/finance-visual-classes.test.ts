import {
  collectorPickupSettlementTable,
  collectorPickupSettlementTableWrap,
  financeAccountCode,
  financeNumber,
  financeReportTable,
  financeTable,
  financeTableScroll,
  financeTextPrimary,
  themePanelList,
} from "@/lib/finance-ui/finance-visual-classes"
import { financeWorkPanelClass } from "@/lib/main-ui/finance-page-layout"

describe("finance visual standard classes", () => {
  it("exports stable class names for finance tables", () => {
    expect(financeTable).toBe("finance-table")
    expect(financeReportTable).toBe("finance-table finance-report-table")
    expect(financeTableScroll).toContain("finance-table-scroll")
    expect(financeTextPrimary).toBe("finance-text-primary")
    expect(financeAccountCode).toContain("finance-account-code")
    expect(financeNumber).toContain("finance-number")
    expect(themePanelList).toContain("theme-panel-list")
    expect(collectorPickupSettlementTable).toContain("collector-pickup-settlement-table")
    expect(collectorPickupSettlementTableWrap).toContain("collector-pickup-settlement-table-wrap")
    expect(financeWorkPanelClass).toContain("finance-work-panel")
  })
})

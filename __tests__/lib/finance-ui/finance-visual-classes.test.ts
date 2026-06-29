import {
  collectorPickupSettlementTable,
  collectorPickupSettlementTableWrap,
  financeAccountCode,
  financeFilterSelect,
  financeNumber,
  financePdfIndicator,
  financePdfIndicatorExists,
  financePdfMissing,
  financeReportTable,
  financeTable,
  financeTableScroll,
  financeTextPrimary,
  themePanelList,
  voucherInquiryFilterControl,
  voucherInquiryFilterFramed,
  voucherInquiryFilterSelect,
} from "@/lib/finance-ui/finance-visual-classes"
import { financeWorkPanelClass } from "@/lib/main-ui/finance-page-layout"

describe("finance visual standard classes", () => {
  it("exports stable class names for finance tables", () => {
    expect(financeTable).toBe("finance-table")
    expect(financeReportTable).toBe("finance-table finance-report-table")
    expect(financeTableScroll).toContain("finance-table-scroll")
    expect(financeTextPrimary).toBe("finance-text-primary")
    expect(financeFilterSelect).toBe("finance-filter-select")
    expect(financePdfMissing).toBe("finance-pdf-missing")
    expect(financePdfIndicator).toBe("finance-pdf-indicator")
    expect(financePdfIndicatorExists).toBe("finance-pdf-indicator--exists")
    expect(voucherInquiryFilterControl).toBe("voucher-inquiry-filter-control")
    expect(voucherInquiryFilterFramed).toBe("voucher-inquiry-filter-framed")
    expect(voucherInquiryFilterSelect).toContain(financeFilterSelect)
    expect(voucherInquiryFilterSelect).toContain(voucherInquiryFilterControl)
    expect(financeAccountCode).toContain("finance-account-code")
    expect(financeNumber).toContain("finance-number")
    expect(themePanelList).toContain("theme-panel-list")
    expect(collectorPickupSettlementTable).toContain("collector-pickup-settlement-table")
    expect(collectorPickupSettlementTableWrap).toContain("collector-pickup-settlement-table-wrap")
    expect(financeWorkPanelClass).toContain("finance-work-panel")
  })
})

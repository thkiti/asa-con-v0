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
  voucherInquiryMoreFilterButton,
  voucherInquiryMoreFilterPopover,
  voucherInquiryMoreFilterPopoverHidden,
  voucherInquiryMoreFilterDateInput,
  voucherInquiryFilterPeriodGroup,
  voucherInquiryFilterPeriodMonth,
  voucherInquiryFilterPeriodYear,
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
    expect(voucherInquiryMoreFilterButton).toContain("voucher-inquiry-more-filter-button")
    expect(voucherInquiryMoreFilterPopover).toBe("voucher-inquiry-more-filter-popover")
    expect(voucherInquiryMoreFilterPopoverHidden).toBe(
      "voucher-inquiry-more-filter-popover--hidden"
    )
    expect(voucherInquiryMoreFilterDateInput).toContain("voucher-inquiry-more-filter-date")
    expect(voucherInquiryFilterPeriodGroup).toBe("voucher-inquiry-filter-period-group shrink-0")
    expect(voucherInquiryFilterPeriodYear).toBe(
      "voucher-inquiry-filter-field voucher-inquiry-filter-period-year"
    )
    expect(voucherInquiryFilterPeriodMonth).toBe(
      "voucher-inquiry-filter-field voucher-inquiry-filter-period-month"
    )
    expect(financeAccountCode).toContain("finance-account-code")
    expect(financeNumber).toContain("finance-number")
    expect(themePanelList).toContain("theme-panel-list")
    expect(collectorPickupSettlementTable).toContain("collector-pickup-settlement-table")
    expect(collectorPickupSettlementTableWrap).toContain("collector-pickup-settlement-table-wrap")
    expect(financeWorkPanelClass).toContain("finance-work-panel")
  })
})

import { renderToStaticMarkup } from "react-dom/server"
import { PosReadReportPanel } from "@/components/pos/PosReadReportPanel"
import { ReadZTodayWorkspace } from "@/components/pos/ReadZTodayWorkspace"
import { PosReadZLookupControls } from "@/components/pos/PosReadZLookupControls"
import {
  READ_REPORT_PAYMENT_LABEL,
  READ_REPORT_PAYMENT_ORDER,
} from "@/lib/pos/readReportPayment"
import {
  posReadXPanel,
  posReadXTitleBadge,
  posReadXTotalPinned,
  posReadZLookupField,
  posReadZPrintButton,
  posReadZTitleBadge,
} from "@/lib/pos-ui/pos-read-report-classes"
import {
  POLICY_SUMMARY_HEADERS,
  resolveReadReportDisplayCatalog,
} from "@/lib/product-groups/management-product-group"
import { DEFAULT_THERMAL_LAYOUTS } from "@/lib/thermal/layout-defaults"
import type { ReadReportPayload } from "@/lib/pos/read-report-types"

const displayCatalog = resolveReadReportDisplayCatalog(POLICY_SUMMARY_HEADERS, [])
const policyGroupLines = displayCatalog.map((headerCode) => ({
  lineKey: headerCode,
  displayLeft: `${headerCode}-${headerCode}`,
  qty: 0,
  amount: 0,
}))

const baseReport: ReadReportPayload = {
  mode: "X",
  bangkokDate: "2026-06-07",
  generatedAt: "2026-06-07T10:00:00.000Z",
  staffId: "001",
  staffName: "Test",
  branchCode: "SH001",
  branchName: "Chidlom",
  groupLines: policyGroupLines,
  paymentLines: READ_REPORT_PAYMENT_ORDER.map((key) => ({
    key,
    label: READ_REPORT_PAYMENT_LABEL[key],
    amount: 0,
  })),
  grandTotal: 0,
  saleCount: 0,
  refundCount: 0,
  refundTotal: 0,
  netTotal: 0,
}

describe("POS READ X/Z visual classes", () => {
  it("READ X panel uses cyan-accent classes and pinned total block", () => {
    const html = renderToStaticMarkup(
      <PosReadReportPanel
        report={baseReport}
        onClose={() => {}}
        readZLayout={DEFAULT_THERMAL_LAYOUTS.READ_Z}
      />
    )

    expect(html).toContain(posReadXPanel)
    expect(html).toContain(posReadXTitleBadge)
    expect(html).toContain(posReadXTotalPinned)
    expect(html).toContain("pos-read-x-group-scroll")
    expect(html).toContain('data-testid="pos-read-x-panel"')
    expect(html).not.toContain(posReadZTitleBadge)
  })

  it("READ Z Today uses red-accent title badge and framed print button", () => {
    const html = renderToStaticMarkup(
      <ReadZTodayWorkspace
        report={{ ...baseReport, mode: "Z", netTotal: 0 }}
        readZLayout={DEFAULT_THERMAL_LAYOUTS.READ_Z}
        onClose={() => {}}
      />
    )

    expect(html).toContain(posReadZTitleBadge)
    expect(html).toContain(posReadZPrintButton)
    expect(html).toContain("pos-read-z-today-workspace")
    expect(html).not.toContain(posReadXTitleBadge)
    expect(html).not.toContain("receipt-lookup-copy-watermark")
  })

  it("READ Z lookup controls use framed equal-height field classes", () => {
    const html = renderToStaticMarkup(
      <PosReadZLookupControls
        selectedDate="2026-06-27"
        lookupMode="daily"
        onDateSelect={() => {}}
        onCumulativePress={() => {}}
      />
    )

    expect(html).toContain(posReadZLookupField)
    expect(html).toContain("pos-read-z-lookup-cumulative-idle")
  })
})

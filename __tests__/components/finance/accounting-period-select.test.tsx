/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { AccountingPeriodSelect } from "@/components/finance/AccountingPeriodSelect"
import type { AccountingPeriodRow } from "@/lib/finance-ui/types"

const periods: AccountingPeriodRow[] = [
  {
    id: "p1",
    periodKey: "2026-01",
    legalEntityCode: "AD",
    branchId: "b1",
    branchName: "HQ",
    status: "SOFT_CLOSED",
    openedAt: "2026-01-01T00:00:00.000Z",
    closedAt: "2026-02-01T00:00:00.000Z",
  },
  {
    id: "p2",
    periodKey: "2025-12",
    legalEntityCode: "AD",
    branchId: "b1",
    branchName: "HQ",
    status: "HARD_CLOSED",
    openedAt: "2025-12-01T00:00:00.000Z",
    closedAt: "2026-01-02T00:00:00.000Z",
  },
]

describe("AccountingPeriodSelect", () => {
  it("shows compact periodKey in closed control with status tooltip", () => {
    const html = renderToStaticMarkup(
      <AccountingPeriodSelect
        periods={periods}
        value="2026-01"
        onChange={() => undefined}
        selectedLabelMode="periodKey"
        showEmptyHint={false}
        data-testid="bank-cash-period-key"
      />
    )

    expect(html).toContain('data-testid="bank-cash-period-key"')
    expect(html).toContain(">2026-01<")
    expect(html).toContain('title="2026-01 • Soft closed"')
    expect(html).not.toContain("SOFT CLOSED")
  })

  it("keeps status labels in full mode select options", () => {
    const html = renderToStaticMarkup(
      <AccountingPeriodSelect
        periods={periods}
        value="2026-01"
        onChange={() => undefined}
        showEmptyHint={false}
      />
    )

    expect(html).toContain("2026-01 (SOFT CLOSED)")
    expect(html).toContain("2025-12 (HARD CLOSED)")
  })
})

/** @jest-environment jsdom */

import { act, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import { PeriodReconciliationFilterBar } from "@/components/finance/PeriodReconciliationFilterBar"
import { defaultPeriodReconciliationUiFilter } from "@/lib/finance-ui/period-reconciliation-list-filter"

jest.mock("@/lib/finance-ui/period-reconciliation-accounts", () => ({
  fetchReconciliationAccounts: jest.fn().mockResolvedValue({
    items: [{ id: "gl-bank-1", code: "1021", name: "Main Bank" }],
  }),
}))

jest.mock("@/lib/finance-ui/pos-settlement-branches", () => ({
  fetchPosSettlementBranches: jest.fn().mockResolvedValue({
    items: [{ id: "branch-1", code: "HO001", name: "Head Office" }],
  }),
  formatPosSettlementBranchLabel: (branch: { code: string; name: string }) =>
    `${branch.code} — ${branch.name}`,
}))

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function ControlledFilterBar(props: { mode?: "bank" | "cash" }) {
  const [draft, setDraft] = useState(defaultPeriodReconciliationUiFilter())
  const [isMoreFilterOpen, setIsMoreFilterOpen] = useState(false)

  return (
    <PeriodReconciliationFilterBar
      mode={props.mode ?? "bank"}
      draft={draft}
      onDraftChange={setDraft}
      isMoreFilterOpen={isMoreFilterOpen}
      setIsMoreFilterOpen={setIsMoreFilterOpen}
      onApply={jest.fn()}
      onClear={jest.fn()}
    />
  )
}

describe("PeriodReconciliationFilterBar interactions", () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(() => {
    container = document.createElement("div")
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    document.body.removeChild(container)
  })

  it("renders period and apply by default without date panel", async () => {
    await act(async () => {
      root.render(<ControlledFilterBar />)
    })

    expect(
      container.querySelector('[data-testid="bank-reconciliation-filter-period"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="bank-reconciliation-apply"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="bank-reconciliation-more-filter-panel"]')
    ).toBeNull()
  })

  it("opens more filter panel from dot toggle", async () => {
    await act(async () => {
      root.render(<ControlledFilterBar />)
    })

    const toggle = container.querySelector(
      '[data-testid="bank-reconciliation-more-filter"]'
    ) as HTMLButtonElement | null
    expect(toggle).not.toBeNull()

    await act(async () => {
      toggle?.click()
    })

    expect(
      container.querySelector('[data-testid="bank-reconciliation-more-filter-panel"]')
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="bank-reconciliation-filter-from"]')
    ).not.toBeNull()
  })

  it("uses wide branch and gl account filter classes on cash mode", async () => {
    await act(async () => {
      root.render(<ControlledFilterBar mode="cash" />)
    })

    expect(container.querySelector(".voucher-inquiry-filter-branch-wide")).not.toBeNull()
    expect(container.querySelector(".voucher-inquiry-filter-gl-account")).not.toBeNull()
    expect(
      container.querySelector('[data-testid="cash-reconciliation-branch-select"]')
    ).not.toBeNull()
  })
})

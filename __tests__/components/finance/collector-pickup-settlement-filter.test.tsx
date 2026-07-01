import { readFileSync } from "node:fs"
import { join } from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { CollectorPickupSettlementFilterBar } from "@/components/finance/CollectorPickupSettlementFilterBar"
import {
  defaultCollectorPickupSettlementUiFilter,
  isCollectorPickupMoreFilterActive,
} from "@/lib/finance-ui/collector-pickup-settlement-list-filter"
import { voucherInquiryFilterBar } from "@/lib/finance-ui/finance-visual-classes"

jest.mock("@/lib/finance-ui/pos-settlement-branches", () => ({
  fetchPosSettlementBranches: jest.fn().mockResolvedValue({
    items: [{ id: "branch-sh001", code: "SH001", name: "Chidlom" }],
  }),
  formatPosSettlementBranchLabel: (branch: { code: string; name: string }) =>
    `${branch.code} — ${branch.name}`,
}))

describe("CollectorPickupSettlementFilterBar", () => {
  const baseDraft = {
    ...defaultCollectorPickupSettlementUiFilter(new Date("2026-06-15T12:00:00.000Z")),
    branchId: "branch-sh001",
  }

  function renderBar(
    overrides: Partial<Parameters<typeof CollectorPickupSettlementFilterBar>[0]> = {}
  ) {
    return renderToStaticMarkup(
      <CollectorPickupSettlementFilterBar
        draft={baseDraft}
        onDraftChange={() => undefined}
        isMoreFilterOpen={false}
        setIsMoreFilterOpen={() => undefined}
        onApply={() => undefined}
        onClear={() => undefined}
        {...overrides}
      />
    )
  }

  it("renders Branch / Period / dot / Apply / Clear in order", () => {
    const html = renderBar()

    const branchIdx = html.indexOf('data-testid="collector-pickup-filter-branch"')
    const periodIdx = html.indexOf('data-testid="collector-pickup-filter-period"')
    const dotIdx = html.indexOf('data-testid="collector-pickup-more-filter"')
    const applyIdx = html.indexOf('data-testid="collector-pickup-apply"')
    const clearIdx = html.indexOf('data-testid="collector-pickup-clear"')

    expect(branchIdx).toBeGreaterThan(-1)
    expect(periodIdx).toBeGreaterThan(branchIdx)
    expect(dotIdx).toBeGreaterThan(periodIdx)
    expect(applyIdx).toBeGreaterThan(dotIdx)
    expect(clearIdx).toBeGreaterThan(applyIdx)
  })

  it("hides date from/to by default", () => {
    const html = renderBar()

    expect(html).not.toContain('data-testid="collector-pickup-more-filter-panel"')
    expect(html).not.toContain('data-testid="collector-pickup-filter-from"')
  })

  it("opens date from/to panel when more-dot is open", () => {
    const html = renderBar({ isMoreFilterOpen: true })

    expect(html).toContain('data-testid="collector-pickup-more-filter-panel"')
    expect(html).toContain('data-testid="collector-pickup-filter-from"')
    expect(html).toContain('data-testid="collector-pickup-filter-to"')
  })

  it("shows dot active when advanced dates differ from period range", () => {
    const inactiveHtml = renderBar()
    expect(inactiveHtml).toContain('data-active="false"')

    const activeHtml = renderToStaticMarkup(
      <CollectorPickupSettlementFilterBar
        draft={{
          ...baseDraft,
          dateFrom: "2026-06-30",
          dateTo: "2026-07-01",
        }}
        onDraftChange={() => undefined}
        isMoreFilterOpen={false}
        setIsMoreFilterOpen={() => undefined}
        onApply={() => undefined}
        onClear={() => undefined}
      />
    )

    expect(
      isCollectorPickupMoreFilterActive({
        periodKey: "2026-06",
        dateFrom: "2026-06-30",
        dateTo: "2026-07-01",
      })
    ).toBe(true)
    expect(activeHtml).toContain('data-active="true"')
  })

  it("uses voucher inquiry filter bar styling", () => {
    const html = renderBar()
    expect(html).toContain(voucherInquiryFilterBar)
    const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8")
    expect(css).toContain(".voucher-inquiry-filter-bar")
  })

  it("wires Period Enter to Apply via DocumentInquiryMoreFilter", () => {
    const html = renderBar()
    expect(html).toContain('data-testid="collector-pickup-filter-period"')
    expect(html).toContain('placeholder="2026-06"')
  })
})

import {
  applyAccountingPeriodInputBlur,
  applyAccountingPeriodInputChange,
} from "@/lib/finance-ui/accounting-period-input"

describe("accounting period input helpers", () => {
  it("normalizes compact input immediately on change", () => {
    const changes: string[] = []
    applyAccountingPeriodInputChange("202601", (value) => changes.push(value))
    expect(changes).toEqual(["202601", "2026-01"])
  })

  it("does not normalize partial typing", () => {
    const changes: string[] = []
    applyAccountingPeriodInputChange("2026", (value) => changes.push(value))
    expect(changes).toEqual(["2026"])
  })

  it("normalizes separated formats on blur", () => {
    const changes: string[] = []
    applyAccountingPeriodInputBlur("2026/01", (value) => changes.push(value))
    expect(changes).toEqual(["2026-01"])
  })
})

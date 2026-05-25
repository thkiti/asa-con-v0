import { renderToStaticMarkup } from "react-dom/server"
import { ReconciliationTable } from "@/components/finance/ReconciliationTable"
import type { ReconciliationVariance } from "@/lib/finance-ui/types"

const sampleRows: ReconciliationVariance[] = [
  {
    domain: "inventory",
    label: "Total inventory",
    operationalAmount: "1000.00",
    glAmount: "995.00",
    variance: "5",
    varianceReason: "Timing difference",
  },
]

describe("ReconciliationTable", () => {
  it("renders DTO rows with formatted amounts and variance badge", () => {
    const html = renderToStaticMarkup(<ReconciliationTable rows={sampleRows} />)
    expect(html).toContain("inventory")
    expect(html).toContain("Total inventory")
    expect(html).toContain("1,000.00")
    expect(html).toContain("995.00")
    expect(html).toContain("Timing difference")
    expect(html).toContain("bg-amber-100")
  })

  it("shows empty state when no rows", () => {
    const html = renderToStaticMarkup(<ReconciliationTable rows={[]} />)
    expect(html).toContain("No variances")
  })
})

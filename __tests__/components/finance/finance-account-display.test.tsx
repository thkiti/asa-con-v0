import { renderToStaticMarkup } from "react-dom/server"
import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"

describe("FinanceAccountDisplay", () => {
  it("renders fixed-width code, separator, and name parts for alignment", () => {
    const html = renderToStaticMarkup(
      <FinanceAccountDisplay accountCode="101" accountName="สำรองตามกฎหมาย" />
    )

    expect(html).toContain('class="finance-account"')
    expect(html).toContain('class="finance-account-code-part">101</span>')
    expect(html).toContain('class="finance-account-separator"> • </span>')
    expect(html).not.toContain("finance-account-code-slot-width")
    expect(html).toContain('class="finance-account-name-part">สำรองตามกฎหมาย</span>')
  })
})

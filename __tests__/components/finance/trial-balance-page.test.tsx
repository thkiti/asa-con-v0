/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"
import fs from "fs"
import path from "path"

describe("Trial Balance account code presentation", () => {
  it("left-aligns account codes only inside .trial-balance-report", () => {
    const css = fs.readFileSync(path.join(process.cwd(), "app", "globals.css"), "utf8")
    expect(css).toMatch(
      /\.trial-balance-report \.finance-account-code[\s\S]*text-align: left/
    )
    // Global default remains right for voucher/MJV entry forms
    expect(css).toMatch(
      /^\.finance-account-code,[\s\S]*?text-align: right;/m
    )
  })

  it("renders account code with the finance-account-code class used by TB CSS", () => {
    const html = renderToStaticMarkup(
      <section className="trial-balance-report">
        <FinanceAccountDisplay accountCode="1001" accountName="Cash" />
      </section>
    )
    expect(html).toContain('class="trial-balance-report"')
    expect(html).toContain('class="finance-account-code finance-account-code-part">1001</span>')
    expect(html).toContain("Cash")
  })
})

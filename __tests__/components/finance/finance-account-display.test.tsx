import { renderToStaticMarkup } from "react-dom/server"
import { FinanceAccountDisplay } from "@/components/finance/FinanceAccountDisplay"

describe("FinanceAccountDisplay", () => {
  it("renders grid-aligned code, separator, and name parts", () => {
    const html = renderToStaticMarkup(
      <FinanceAccountDisplay accountCode="101" accountName="สำรองตามกฎหมาย" />
    )

    expect(html).toContain('class="finance-account-display finance-account"')
    expect(html).toContain('class="finance-account-code finance-account-code-part">101</span>')
    expect(html).toContain('class="finance-account-separator">•</span>')
    expect(html).toContain(
      'class="finance-account-name finance-account-name-part">สำรองตามกฎหมาย</span>'
    )
    expect(html).not.toContain("&nbsp;")
    expect(html).not.toMatch(/>\s{2,}</)
  })

  it("accepts code/name shorthand props", () => {
    const html = renderToStaticMarkup(
      <FinanceAccountDisplay code="1021001" name="เงินฝากธนาคารกรุงเทพ" />
    )

    expect(html).toContain("1021001")
    expect(html).toContain("เงินฝากธนาคารกรุงเทพ")
    expect(html).not.toContain("uuid")
  })

  it("does not render internal account id", () => {
    const html = renderToStaticMarkup(
      <FinanceAccountDisplay code="1303" name="วัสดุรองเท้า" />
    )

    expect(html).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/)
  })
})

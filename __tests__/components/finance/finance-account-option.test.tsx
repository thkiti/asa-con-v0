import { renderToStaticMarkup } from "react-dom/server"
import { FinanceAccountOption } from "@/components/finance/FinanceAccountOption"

describe("FinanceAccountOption", () => {
  it("renders separate code and name columns", () => {
    const html = renderToStaticMarkup(
      <FinanceAccountOption code="1021001" name="เงินฝากธนาคารกรุงเทพ - บัญชีกระแสรายวัน 0266" />
    )

    expect(html).toContain('class="finance-account-option"')
    expect(html).toContain('class="finance-account-option-code">1021001</span>')
    expect(html).toContain('class="finance-account-option-name">')
    expect(html).not.toContain('class="finance-account-separator"')
    expect(html).not.toContain("&nbsp;")
    expect(html).not.toMatch(/>\s{2,}</)
  })

  it("includes bullet and account name in column 2", () => {
    const html = renderToStaticMarkup(
      <FinanceAccountOption code="101" name="สำรองตามกฎหมาย" />
    )

    expect(html).toContain(
      'class="finance-account-option-name">• สำรองตามกฎหมาย</span>'
    )
  })

  it("does not use padded text strings for alignment", () => {
    const html = renderToStaticMarkup(
      <FinanceAccountOption code="1" name="ทุนหุ้นสามัญ" />
    )

    expect(html).not.toMatch(/>\s{2,}•/)
    expect(html).not.toContain("padding")
  })

  it("keeps code and name in separate spans so name can wrap independently", () => {
    const longName =
      "เงินฝากธนาคารกรุงเทพ - บัญชีกระแสรายวัน 0266 ชื่อยาวมากเพื่อทดสอบการขึ้นบรรทัดใหม่"
    const html = renderToStaticMarkup(
      <FinanceAccountOption code="1021001" name={longName} />
    )

    expect(html).toMatch(
      /<span class="finance-account-option-code">1021001<\/span><span class="finance-account-option-name">/
    )
    expect(html).toContain(`• ${longName}`)
  })
})

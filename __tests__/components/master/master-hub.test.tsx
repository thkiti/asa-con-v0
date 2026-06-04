/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { MasterHubView } from "@/components/master/MasterHubView"

describe("MasterHubView", () => {
  it("renders administration hub cards", () => {
    const html = renderToStaticMarkup(<MasterHubView />)
    expect(html).toContain("ADMINISTRATION")
    expect(html).toContain('href="/main"')
    expect(html).toContain("Product &amp; Reference Stock")
    expect(html).toContain('href="/master/product-reference"')
    expect(html).toContain('href="/master/branch"')
    expect(html).toContain('href="/master/staff"')
    expect(html).toContain('href="/master/pricing"')
    expect(html).toContain("Receipt Setup")
    expect(html).toContain('href="/admin/receipt-setup"')
    expect(html).toContain('href="/system/import"')
  })
})

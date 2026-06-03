/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { MasterHubView } from "@/components/master/MasterHubView"

describe("MasterHubView", () => {
  it("renders navigation to all master maintenance routes", () => {
    const html = renderToStaticMarkup(<MasterHubView />)
    expect(html).toContain("Product &amp; Reference Stock")
    expect(html).toContain('href="/master/product-reference"')
    expect(html).toContain('href="/master/branch"')
    expect(html).toContain('href="/master/staff"')
    expect(html).toContain('href="/system/import"')
  })
})

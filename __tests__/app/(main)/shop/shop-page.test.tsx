import { renderToStaticMarkup } from "react-dom/server"
import ShopPage from "@/app/(main)/shop/page"

describe("ShopPage", () => {
  it("links to stock documents", () => {
    const html = renderToStaticMarkup(<ShopPage />)
    expect(html).toContain("Stock documents")
    expect(html).toContain('href="/shop/stock-documents"')
  })
})

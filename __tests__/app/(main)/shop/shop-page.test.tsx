import { renderToStaticMarkup } from "react-dom/server"
import ShopPage from "@/app/(main)/shop/page"

jest.mock("@/components/pos/PosTerminalPage", () => ({
  PosTerminalPage: () => <div data-testid="pos-terminal-page">POS Terminal</div>,
}))

describe("ShopPage", () => {
  it("renders POS terminal page", () => {
    const html = renderToStaticMarkup(<ShopPage />)
    expect(html).toContain("POS Terminal")
  })
})

import { renderToStaticMarkup } from "react-dom/server"
import { StockDocumentHookTabs } from "@/components/stock/StockDocumentHookTabs"

describe("StockDocumentHookTabs", () => {
  it("renders K/C/M/O/S tabs with labels", () => {
    const html = renderToStaticMarkup(
      <StockDocumentHookTabs
        activeHookGroup="K"
        countedByGroup={{ K: 2, S: 1 }}
        onChange={() => {}}
      />
    )

    expect(html).toContain("Home Key")
    expect(html).toContain("Shoe Materials")
    expect(html).toContain('aria-selected="true"')
  })
})

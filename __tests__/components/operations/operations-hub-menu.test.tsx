/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { OperationsHubMenu } from "@/components/operations/OperationsHubMenu"
import { getMainMenuSectionDetail } from "@/lib/main-ui/main-menu"

describe("OperationsHubMenu", () => {
  it("renders operations cards in the required grid layout", () => {
    const section = getMainMenuSectionDetail("HO_ADMIN", "operations")
    expect(section).not.toBeNull()

    const html = renderToStaticMarkup(
      <OperationsHubMenu section={section!} />
    )

    expect(html).toContain('href="/shop/stock-documents"')
    expect(html).toContain('href="/operations/catalog-image"')
    expect(html).not.toContain('href="/operations/catalog-upload"')
    expect(html).toContain("Stock Card")
    expect(html).toContain("Stock Movement")
    expect(html).toContain("Supplier Order")
    expect(html).not.toContain("Export Image To Cloud")
    expect(html).toContain("Planned")
    expect(html).toContain("min-h-[5.5rem]")
    expect(html).toContain('aria-label="OPERATIONS"')
  })
})

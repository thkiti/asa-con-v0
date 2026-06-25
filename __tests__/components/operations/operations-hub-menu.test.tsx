/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { MainMenuSectionView } from "@/components/main/MainMenuSectionView"
import { getMainMenuSectionDetail } from "@/lib/main-ui/main-menu"
import { mainMenuGridClass } from "@/lib/main-ui/main-menu-layout"

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

const hoAdmin = {
  userId: "u1",
  staffId: "001",
  name: "Admin User",
  role: "HO_ADMIN" as const,
  branchId: "b1",
  branchCode: "HO999",
  branchName: "Head Office",
}

describe("operations hub via MainMenuSectionView", () => {
  it("renders operations cards through the shared main menu grid", () => {
    const section = getMainMenuSectionDetail("HO_ADMIN", "operations")
    expect(section).not.toBeNull()

    const html = renderToStaticMarkup(
      <MainMenuSectionView user={hoAdmin} section={section!} />
    )

    expect(html).toContain(mainMenuGridClass)
    expect(html).toContain('href="/operations/check-receipt"')
    expect(html).toContain('href="/operations/catalog-image"')
    expect(html).toContain('href="/shop/stock-documents"')
    expect(html).not.toContain('href="/operations/catalog-upload"')
    expect(html).toContain("Stock Card")
    expect(html).toContain("Stock Movement")
    expect(html).toContain("Supplier Order")
    expect(html).not.toContain("Export Image To Cloud")
    expect(html).toContain("Planned")
    expect(html).toContain("w-[482px]")
    expect(html).toContain("h-[108px]")
    expect(html).toContain("max-h-[108px]")
    expect(html).toContain('aria-label="OPERATIONS"')

    const checkReceiptIndex = html.indexOf('href="/operations/check-receipt"')
    const catalogImageIndex = html.indexOf('href="/operations/catalog-image"')
    const stockDocumentsIndex = html.indexOf('href="/shop/stock-documents"')
    expect(checkReceiptIndex).toBeGreaterThan(-1)
    expect(catalogImageIndex).toBeGreaterThan(checkReceiptIndex)
    expect(stockDocumentsIndex).toBeGreaterThan(catalogImageIndex)
  })

  it("renders Product & Reference Stock for HO_OPERATIONS", () => {
    const section = getMainMenuSectionDetail("HO_OPERATIONS", "operations")
    expect(section).not.toBeNull()

    const html = renderToStaticMarkup(
      <MainMenuSectionView
        user={{ ...hoAdmin, role: "HO_OPERATIONS", name: "Ops User" }}
        section={section!}
      />
    )

    expect(html).toContain('href="/master/product-reference"')
    expect(html).toContain("Product &amp; Reference Stock")
    expect(html).toContain(
      "Product, category, brand, unit, barcode and stock reference setup"
    )
  })
})

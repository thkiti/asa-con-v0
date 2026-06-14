/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { MainMenuSectionView } from "@/components/main/MainMenuSectionView"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { getMainMenuSectionDetail } from "@/lib/main-ui/main-menu"

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

const hoAdmin: SessionUserApi = {
  userId: "u1",
  staffId: "001",
  name: "Admin User",
  role: "HO_ADMIN",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "Head Office",
}

describe("MainMenuSectionView", () => {
  it("renders back link to main menu", () => {
    const section = getMainMenuSectionDetail("HO_ADMIN", "finance")
    expect(section).not.toBeNull()
    const html = renderToStaticMarkup(
      <MainMenuSectionView user={hoAdmin} section={section!} />
    )
    expect(html).toContain('href="/main"')
    expect(html).toContain("Back to Main Menu")
  })

  it("renders grouped finance hub cards on finance section", () => {
    const section = getMainMenuSectionDetail("HO_ADMIN", "finance")
    const html = renderToStaticMarkup(
      <MainMenuSectionView user={hoAdmin} section={section!} />
    )
    expect(html).not.toContain('href="/finance"')
    expect(html).toContain("Reports")
    expect(html).toContain("Operations")
    expect(html).toContain("Reconciliation")
    expect(html).toContain("Period Management")
    expect(html).toContain('href="/finance/reports/trial-balance"')
    expect(html).toContain('href="/finance/accounts/import"')
    expect(html).toContain('href="/finance/reconciliation"')
    expect(html).toContain('href="/finance/periods"')
    expect(html).toContain("Journal Entry Workflow")
    expect(html).toContain("Planned")
    expect(html).toContain("h-[108px]")
    expect(html).toContain("line-clamp-2")
  })

  it("renders administration master links", () => {
    const section = getMainMenuSectionDetail("HO_ADMIN", "administration")
    const html = renderToStaticMarkup(
      <MainMenuSectionView user={hoAdmin} section={section!} />
    )
    expect(html).toContain('href="/master/product-reference"')
    expect(html).toContain('href="/master/branch"')
    expect(html).toContain('href="/master/staff"')
    expect(html).toContain('href="/admin/receipt-setup"')
  })

  it("renders operations section as card grid", () => {
    const section = getMainMenuSectionDetail("HO_ADMIN", "operations")
    const html = renderToStaticMarkup(
      <MainMenuSectionView user={hoAdmin} section={section!} />
    )
    expect(html).toContain("Stock Card")
    expect(html).toContain('aria-disabled="true"')
    expect(html).toContain('href="/operations/check-receipt"')
    expect(html).toContain('href="/operations/catalog-image"')
    expect(html).toContain('href="/shop/stock-documents"')
    expect(html).toContain("w-[482px]")
    expect(html).toContain("h-[108px]")
    expect(html).toContain("max-h-[108px]")
    expect(html).toContain("line-clamp-2")
    expect(html).not.toContain("Export Image To Cloud")
  })

  it("renders shop section through the shared main menu card grid", () => {
    const section = getMainMenuSectionDetail("HO_ADMIN", "shop")
    expect(section).not.toBeNull()
    const html = renderToStaticMarkup(
      <MainMenuSectionView user={hoAdmin} section={section!} />
    )
    expect(html).toContain('href="/shop/sales-targets"')
    expect(html).toContain("Sales Target Setup")
    expect(html).toContain("Target / Sales")
    expect(html).toContain("Planned")
    expect(html).toContain("h-[108px]")
    expect(html).toContain("line-clamp-2")
    expect(html).not.toContain("min-h-[5.5rem]")
  })
})

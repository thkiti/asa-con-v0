import { renderToStaticMarkup } from "react-dom/server"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

jest.mock("@/lib/stock-ui/session", () => ({
  fetchShopSession: jest.fn().mockResolvedValue({
    sessionId: "s1",
    role: "SH_STAFF",
    staffId: "staff-1",
    name: "Staff",
    branchId: "branch-shop",
  }),
}))

import NewStockDocumentPage from "@/app/(main)/shop/stock-documents/new/page"

describe("NewStockDocumentPage", () => {
  it("shows error when type is missing", async () => {
    const element = await NewStockDocumentPage({
      searchParams: Promise.resolve({}),
    })
    const html = renderToStaticMarkup(element)
    expect(html).toContain("Missing or invalid type")
  })

  it("renders editor shell for valid shop types", async () => {
    const element = await NewStockDocumentPage({
      searchParams: Promise.resolve({ type: "PERFORMANCE" }),
    })
    const html = renderToStaticMarkup(element)
    expect(html).toContain("New stock document")
    expect(html).toContain("Loading document")
  })
})

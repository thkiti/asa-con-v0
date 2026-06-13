import { renderToStaticMarkup } from "react-dom/server"

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: jest.fn(), push: jest.fn() }),
}))

jest.mock("@/lib/stock-ui/session", () => ({
  fetchShopSession: jest.fn().mockResolvedValue({
    sessionId: "s1",
    role: "SH_STAFF",
    staffId: "103",
    name: "Somsak Kamnuch",
    branchId: "branch-shop",
    branchCode: "SH001",
    branchName: "Chidlom",
  }),
}))

import NewStockDocumentPage from "@/app/(main)/shop/stock-documents/new/page"

describe("NewStockDocumentPage", () => {
  it("enters staff operational mode for POS ORDER entry", async () => {
    const element = await NewStockDocumentPage({
      searchParams: Promise.resolve({ type: "TRANSFER_OUT", from: "shop" }),
    })
    const html = renderToStaticMarkup(element)

    expect(html).not.toContain("Stock documents")
    expect(html).toContain("h-dvh")
    expect(html).toContain("overflow-hidden")
    expect(html).toContain("p-2")
    expect(html).toContain("Loading document")
  })

  it("keeps full document chrome without staff entry query", async () => {
    const element = await NewStockDocumentPage({
      searchParams: Promise.resolve({ type: "TRANSFER_OUT" }),
    })
    const html = renderToStaticMarkup(element)

    expect(html).toContain("Stock documents")
    expect(html).toContain('class="p-8"')
    expect(html).toContain("ASAS • ORD")
  })
})

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

import EditStockDocumentPage from "@/app/(main)/shop/stock-documents/[id]/page"

describe("EditStockDocumentPage", () => {
  it("enters stock count staff mode when from=shop", async () => {
    const element = await EditStockDocumentPage({
      params: Promise.resolve({ id: "doc-adj-1" }),
      searchParams: Promise.resolve({ from: "shop" }),
    })
    const html = renderToStaticMarkup(element)

    expect(html).not.toContain("Edit stock document")
    expect(html).not.toContain("Stock documents")
    expect(html).toContain("h-dvh")
    expect(html).toContain("overflow-hidden")
    expect(html).toContain("p-2")
    expect(html).toContain("Loading document")
  })

  it("keeps full document chrome without staff entry query", async () => {
    const element = await EditStockDocumentPage({
      params: Promise.resolve({ id: "doc-adj-1" }),
      searchParams: Promise.resolve({}),
    })
    const html = renderToStaticMarkup(element)

    expect(html).toContain("Edit stock document")
    expect(html).toContain("Stock documents")
    expect(html).toContain('class="p-8"')
  })
})

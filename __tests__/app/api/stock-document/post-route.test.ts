import { POST } from "@/app/api/stock-document/[id]/post/route"
import { FinancePostingError } from "@/lib/finance/posting-errors"
import { postDocument } from "@/lib/stock/posting"
import { PostingError } from "@/lib/stock/posting-errors"

jest.mock("@/lib/stock/posting", () => ({
  postDocument: jest.fn(),
}))

const mockedPostDocument = postDocument as jest.MockedFunction<typeof postDocument>

function postStockDocument(id: string, body: unknown) {
  return POST(
    new Request(`http://localhost/api/stock-document/${id}/post`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }) as never,
    { params: Promise.resolve({ id }) }
  )
}

describe("POST /api/stock-document/[id]/post", () => {
  beforeEach(() => {
    mockedPostDocument.mockReset()
  })

  it("maps FinancePostingError PERIOD_CLOSED to structured 400 JSON", async () => {
    mockedPostDocument.mockRejectedValue(
      new FinancePostingError("period closed", "PERIOD_CLOSED")
    )

    const res = await postStockDocument("doc-1", { staffId: "staff-1" })

    expect(res.status).toBe(400)
    await expect(res.json()).resolves.toEqual({
      error: "period closed",
      code: "PERIOD_CLOSED",
    })
  })

  it("maps PostingError to structured JSON with route status", async () => {
    mockedPostDocument.mockRejectedValue(
      new PostingError("Document not found", "DOCUMENT_NOT_FOUND", 404)
    )

    const res = await postStockDocument("missing-doc", { staffId: "staff-1" })

    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({
      error: "Document not found",
      code: "DOCUMENT_NOT_FOUND",
    })
  })
})
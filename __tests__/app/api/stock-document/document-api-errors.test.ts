import { documentErrorResponse } from "@/app/api/stock-document/shared/document-api-errors"
import { DocumentError, DocumentErrorCodes } from "@/lib/stock/document/document-errors"

describe("document-api-errors", () => {
  it("wraps mapped DocumentError as NextResponse", async () => {
    const res = documentErrorResponse(
      new DocumentError(
        "Document not found",
        DocumentErrorCodes.DOCUMENT_NOT_FOUND,
        404
      ),
      "test"
    )
    expect(res.status).toBe(404)
    await expect(res.json()).resolves.toEqual({
      error: "Document not found",
      code: DocumentErrorCodes.DOCUMENT_NOT_FOUND,
    })
  })
})

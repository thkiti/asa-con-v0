import { DocumentError, DocumentErrorCodes } from "@/lib/stock/document/document-errors"
import {
  mapDocumentRouteError,
  normalizeDocumentErrorCode,
} from "@/lib/stock/document/document-route-errors"

describe("document-route-errors", () => {
  it("normalizes legacy NOT_FOUND to DOCUMENT_NOT_FOUND", () => {
    expect(normalizeDocumentErrorCode("NOT_FOUND")).toBe(
      DocumentErrorCodes.DOCUMENT_NOT_FOUND
    )
    expect(normalizeDocumentErrorCode("IMMUTABLE_DOCUMENT")).toBe(
      DocumentErrorCodes.DOCUMENT_IMMUTABLE
    )
  })

  it("maps DocumentError to status and body", () => {
    const mapped = mapDocumentRouteError(
      new DocumentError(
        "Document not found",
        DocumentErrorCodes.DOCUMENT_NOT_FOUND,
        404
      )
    )
    expect(mapped).toEqual({
      status: 404,
      body: {
        error: "Document not found",
        code: DocumentErrorCodes.DOCUMENT_NOT_FOUND,
      },
    })
  })

  it("normalizes legacy codes in mapped body", () => {
    const mapped = mapDocumentRouteError(
      new DocumentError("Cannot cancel", "IMMUTABLE_DOCUMENT", 400)
    )
    expect(mapped?.body.code).toBe(DocumentErrorCodes.DOCUMENT_IMMUTABLE)
  })
})

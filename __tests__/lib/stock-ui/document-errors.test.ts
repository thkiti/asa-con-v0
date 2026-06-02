import { DocumentErrorCodes } from "@/lib/stock/document/document-errors"
import {
  messageForDocumentErrorCode,
  StockDocumentUiError,
  toStockDocumentUiError,
} from "@/lib/stock-ui/document-errors"

describe("document-errors", () => {
  it("maps known document codes to user messages", () => {
    expect(messageForDocumentErrorCode(DocumentErrorCodes.EMPTY_DOCUMENT)).toContain(
      "at least one line"
    )
  })

  it("wraps StockDocumentUiError", () => {
    const err = toStockDocumentUiError(
      new StockDocumentUiError("x", DocumentErrorCodes.DOCUMENT_NOT_FOUND)
    )
    expect(err.code).toBe(DocumentErrorCodes.DOCUMENT_NOT_FOUND)
  })
})

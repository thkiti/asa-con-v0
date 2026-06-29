import {
  posDocumentLookupButton,
  posDocumentLookupInput,
  posDocumentLookupLabel,
  posDocumentLookupMuted,
  posDocumentLookupPanel,
  posDocumentLookupSelect,
  posDocumentLookupTitle,
} from "@/lib/pos-ui/pos-document-lookup-classes"

describe("pos document lookup classes", () => {
  it("exports stable POS lookup readability class hooks", () => {
    expect(posDocumentLookupPanel).toBe("pos-document-lookup-panel")
    expect(posDocumentLookupTitle).toBe("pos-document-lookup-title")
    expect(posDocumentLookupLabel).toBe("pos-document-lookup-label")
    expect(posDocumentLookupSelect).toBe("pos-document-lookup-select")
    expect(posDocumentLookupInput).toBe("pos-document-lookup-input")
    expect(posDocumentLookupButton).toBe("pos-document-lookup-button")
    expect(posDocumentLookupMuted).toBe("pos-document-lookup-muted")
  })
})

import {
  documentLookupUsesCumulativeAction,
  documentLookupUsesDaySelector,
  documentLookupUsesReadZLookup,
  documentLookupUsesReceiptDateFilter,
  documentLookupUsesRunningDropdown,
  documentLookupUsesRunningInput,
  isPosDocumentLookupDocTypeAvailable,
  isPosDocumentLookupDocTypeEnabled,
  POS_DOCUMENT_LOOKUP_DOC_TYPES,
} from "@/lib/pos-ui/document-lookup-doc-types"

describe("document-lookup-doc-types", () => {
  it("enables Receipt, Refund, Collector, and READ Z", () => {
    expect(isPosDocumentLookupDocTypeEnabled("receipt")).toBe(true)
    expect(isPosDocumentLookupDocTypeEnabled("refund")).toBe(true)
    expect(isPosDocumentLookupDocTypeEnabled("collector")).toBe(true)
    expect(isPosDocumentLookupDocTypeEnabled("read-z")).toBe(true)
  })

  it("makes READ Z available to shop staff and HO roles", () => {
    expect(isPosDocumentLookupDocTypeAvailable("read-z", "HO_ADMIN")).toBe(true)
    expect(isPosDocumentLookupDocTypeAvailable("read-z", "SH_STAFF")).toBe(true)
    expect(isPosDocumentLookupDocTypeAvailable("receipt", "SH_STAFF")).toBe(true)
  })

  it("uses running dropdown for receipt and other enabled types", () => {
    expect(documentLookupUsesRunningInput("receipt")).toBe(false)
    expect(documentLookupUsesRunningDropdown("receipt")).toBe(true)
    expect(documentLookupUsesReceiptDateFilter("receipt")).toBe(true)
    expect(documentLookupUsesRunningInput("refund")).toBe(false)
    expect(documentLookupUsesRunningDropdown("refund")).toBe(true)
    expect(documentLookupUsesRunningDropdown("collector")).toBe(true)
    expect(documentLookupUsesRunningDropdown("read-z")).toBe(true)
    expect(documentLookupUsesReceiptDateFilter("read-z")).toBe(true)
    expect(documentLookupUsesReceiptDateFilter("refund")).toBe(false)
  })

  it("keeps standard running field and calendar for READ Z lookup", () => {
    expect(documentLookupUsesReadZLookup("read-z")).toBe(true)
    expect(documentLookupUsesReadZLookup("receipt")).toBe(false)
    expect(documentLookupUsesDaySelector("read-z")).toBe(false)
    expect(documentLookupUsesCumulativeAction("read-z")).toBe(true)
  })

  it("lists Document Lookup document types without Repair Ticket", () => {
    expect(POS_DOCUMENT_LOOKUP_DOC_TYPES.map((row) => row.label)).toEqual([
      "Receipt",
      "Refund",
      "Collector",
      "READ Z",
    ])
    expect(POS_DOCUMENT_LOOKUP_DOC_TYPES.map((row) => row.id)).not.toContain(
      "repair-ticket"
    )
  })
})

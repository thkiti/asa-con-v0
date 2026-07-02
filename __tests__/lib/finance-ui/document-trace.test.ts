import { fetchDocumentTraceList } from "@/lib/finance-ui/document-trace"
import type { DocumentTraceFilters } from "@/lib/finance/audit/document-trace-filters"

const baseFilters = (): DocumentTraceFilters => ({
  legalEntityCode: "AS",
  docType: "MJV",
  branchCode: "SH001",
  period: "2026-01",
  dateFrom: "",
  dateTo: "",
})

describe("fetchDocumentTraceList", () => {
  const fetchMock = jest.fn()

  beforeEach(() => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ rows: [], warnings: [] }),
    })
    global.fetch = fetchMock
  })

  afterEach(() => {
    fetchMock.mockReset()
  })

  it("omits branchCode for finance document types", async () => {
    await fetchDocumentTraceList(baseFilters())

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain("docType=MJV")
    expect(url).not.toContain("branchCode")
  })

  it("includes branchCode for REC", async () => {
    await fetchDocumentTraceList({
      ...baseFilters(),
      docType: "REC",
    })

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain("branchCode=SH001")
  })

  it("includes branchCode for REC", async () => {
    await fetchDocumentTraceList({
      ...baseFilters(),
      docType: "REC",
    })

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain("branchCode=SH001")
  })

  it("includes limit and offset in list requests", async () => {
    await fetchDocumentTraceList({
      ...baseFilters(),
      docType: "REC",
    })

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain("limit=30")
    expect(url).not.toContain("offset=")
  })

  it("includes dateFrom and dateTo when set", async () => {
    await fetchDocumentTraceList({
      ...baseFilters(),
      docType: "REC",
      dateFrom: "2026-01-10",
      dateTo: "2026-01-20",
    })

    const url = String(fetchMock.mock.calls[0]?.[0])
    expect(url).toContain("dateFrom=2026-01-10")
    expect(url).toContain("dateTo=2026-01-20")
  })
})

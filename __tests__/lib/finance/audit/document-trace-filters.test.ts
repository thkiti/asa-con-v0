import { Prisma } from "@/generated/prisma/client"
import {
  buildDocumentTraceListFetchKey,
  createDefaultDocumentTraceFilters,
  DOCUMENT_TRACE_VOUCHER_SEARCH_TYPE,
  formatDocumentTraceDocTypeLabel,
  isDocumentTraceDocTypeAllowed,
  isDocumentTraceMoreFilterActive,
  isDocumentTracePeriodValid,
  listDocumentTraceDocTypeOptions,
  listDocumentTraceDocTypeSelectOptions,
  parseDocumentTraceFilterDate,
  resolveDocumentTraceListDateRange,
  shouldApplyDocumentTraceBranchFilter,
  showDocumentTraceShopInMoreFilter,
  showDocumentTraceShopOnMainRow,
  resolveDocumentTraceListBranchCode,
  resolveDocumentTraceSearchError,
  type DocumentTraceFilters,
} from "@/lib/finance/audit/document-trace-filters"
import { listDocumentTraceDocuments } from "@/lib/finance/audit/document-trace-list"
import { clearDocumentTraceFilters } from "@/lib/finance-ui/document-trace-filters"

const asFilters = (
  overrides: Partial<DocumentTraceFilters> = {}
): DocumentTraceFilters => ({
  legalEntityCode: "AS",
  docType: "",
  branchCode: "",
  period: "2026-01",
  dateFrom: "",
  dateTo: "",
  ...overrides,
})

describe("document trace doc type helpers", () => {
  it("renames voucher search type in the dropdown", () => {
    expect(formatDocumentTraceDocTypeLabel(DOCUMENT_TRACE_VOUCHER_SEARCH_TYPE)).toBe(
      "Voucher No."
    )

    const options = listDocumentTraceDocTypeOptions("AS")
    expect(options.at(-1)).toEqual({
      value: "VOUCHER",
      label: "Voucher No.",
    })
    expect(options.some((option) => option.label === "VOUCHER")).toBe(false)
  })

  it("disallows REC for ASAD and omits it from doc type options", () => {
    expect(isDocumentTraceDocTypeAllowed("REC", "AD")).toBe(false)
    expect(isDocumentTraceDocTypeAllowed("REF", "AD")).toBe(false)
    expect(isDocumentTraceDocTypeAllowed("PAY", "AD")).toBe(false)
    expect(isDocumentTraceDocTypeAllowed("MJV", "AD")).toBe(true)
    expect(listDocumentTraceDocTypeOptions("AD").map((row) => row.value)).not.toContain(
      "REC"
    )
    expect(listDocumentTraceDocTypeOptions("AD").map((row) => row.value)).not.toContain(
      "REF"
    )

    expect(resolveDocumentTraceSearchError(asFilters({ docType: "REC", legalEntityCode: "AD" }))).toContain(
      "not available"
    )
  })

  it("builds grouped select options for the document trace dropdown", () => {
    const items = listDocumentTraceDocTypeSelectOptions("AS")

    expect(items.filter((item) => item.kind === "group").map((item) => item.label)).toEqual([
      "──────── POS ────────",
      "──────── FINANCE ────────",
      "──────── STOCK ────────",
    ])
    expect(items.at(-1)).toEqual({
      kind: "option",
      value: "VOUCHER",
      label: "Voucher No.",
    })
  })
})

describe("document trace more filter active state", () => {
  it("marks the more filter active only when date fields or ASAD shop have values", () => {
    expect(isDocumentTraceMoreFilterActive(createDefaultDocumentTraceFilters("AS"))).toBe(
      false
    )
    expect(
      isDocumentTraceMoreFilterActive(
        asFilters({
          docType: "REC",
          branchCode: "SH001",
        })
      )
    ).toBe(false)
    expect(
      isDocumentTraceMoreFilterActive(
        asFilters({
          docType: "CNT",
          legalEntityCode: "AD",
          branchCode: "SH001",
        })
      )
    ).toBe(true)
    expect(
      isDocumentTraceMoreFilterActive(
        asFilters({
          dateFrom: "2026-01-10",
        })
      )
    ).toBe(true)
    expect(
      isDocumentTraceMoreFilterActive(
        asFilters({
          dateTo: "2026-01-20",
        })
      )
    ).toBe(true)
  })
})

describe("resolveDocumentTraceListDateRange", () => {
  it("uses the full period when both date fields are empty", () => {
    const range = resolveDocumentTraceListDateRange(asFilters({ period: "2026-01" }))
    expect(range?.from).toEqual(new Date(2026, 0, 1))
    expect(range?.to).toEqual(new Date(2026, 0, 31, 23, 59, 59, 999))
  })

  it("narrows to a from date within the period", () => {
    const range = resolveDocumentTraceListDateRange(
      asFilters({ period: "2026-01", dateFrom: "2026-01-15" })
    )
    expect(range?.from).toEqual(parseDocumentTraceFilterDate("2026-01-15"))
    expect(range?.to).toEqual(new Date(2026, 0, 31, 23, 59, 59, 999))
  })

  it("narrows to a to date within the period", () => {
    const range = resolveDocumentTraceListDateRange(
      asFilters({ period: "2026-01", dateTo: "2026-01-10" })
    )
    expect(range?.from).toEqual(new Date(2026, 0, 1))
    expect(range?.to).toEqual(new Date(2026, 0, 10, 23, 59, 59, 999))
  })
})

describe("document trace shop filter visibility", () => {
  it("shows shop on the main row for ASAS regardless of doc type", () => {
    expect(showDocumentTraceShopOnMainRow("AS")).toBe(true)
    expect(showDocumentTraceShopOnMainRow("AS", "")).toBe(true)
    expect(showDocumentTraceShopOnMainRow("AS", "REC")).toBe(true)
    expect(showDocumentTraceShopOnMainRow("AS", "MJV")).toBe(true)
    expect(showDocumentTraceShopOnMainRow("AD", "REC")).toBe(false)
  })

  it("applies branchCode only for POS and shop stock document types", () => {
    expect(shouldApplyDocumentTraceBranchFilter("REC")).toBe(true)
    expect(shouldApplyDocumentTraceBranchFilter("REF")).toBe(true)
    expect(shouldApplyDocumentTraceBranchFilter("CNT")).toBe(true)
    expect(shouldApplyDocumentTraceBranchFilter("MJV")).toBe(false)
    expect(shouldApplyDocumentTraceBranchFilter("")).toBe(false)

    expect(
      resolveDocumentTraceListBranchCode(
        asFilters({
          docType: "MJV",
          branchCode: "SH001",
        })
      )
    ).toBe("")
    expect(
      resolveDocumentTraceListBranchCode(
        asFilters({
          docType: "REC",
          branchCode: "SH001",
        })
      )
    ).toBe("SH001")
  })

  it("keeps shop in more filter only for ASAD branch-specific docs", () => {
    expect(showDocumentTraceShopInMoreFilter("AS", "REC")).toBe(false)
    expect(showDocumentTraceShopInMoreFilter("AS", "MJV")).toBe(false)
    expect(showDocumentTraceShopInMoreFilter("AD", "CNT")).toBe(true)
    expect(showDocumentTraceShopInMoreFilter("AD", "MJV")).toBe(false)
  })
})

describe("document trace filter reset helpers", () => {
  it("clears filters back to empty defaults", () => {
    const cleared = clearDocumentTraceFilters("AS")
    expect(cleared).toEqual(createDefaultDocumentTraceFilters("AS"))
    expect(cleared.period).toBe("")
    expect(cleared.dateFrom).toBe("")
    expect(cleared.dateTo).toBe("")
    expect(cleared.docType).toBe("")
  })
})

describe("buildDocumentTraceListFetchKey", () => {
  it("returns null until doc type and valid period are both set", () => {
    expect(buildDocumentTraceListFetchKey(asFilters())).toBeNull()
    expect(buildDocumentTraceListFetchKey(asFilters({ docType: "MJV", period: "" }))).toBeNull()
    expect(buildDocumentTraceListFetchKey(asFilters({ period: "2026-01" }))).toBeNull()
    expect(
      buildDocumentTraceListFetchKey(asFilters({ docType: "MJV", period: "2026-1" }))
    ).toBeNull()
  })

  it("returns a stable key when list filters are complete", () => {
    expect(
      buildDocumentTraceListFetchKey(
        asFilters({
          docType: "MJV",
          period: "2026-01",
          dateFrom: "2026-01-10",
        })
      )
    ).toBe("MJV|2026-01||2026-01-10|")

    expect(
      buildDocumentTraceListFetchKey(
        asFilters({
          docType: "REC",
          period: "2026-01",
          branchCode: "SH001",
          dateTo: "2026-01-20",
        })
      )
    ).toBe("REC|2026-01|SH001||2026-01-20")
  })

  it("validates period with YYYY-MM", () => {
    expect(isDocumentTracePeriodValid("2026-01")).toBe(true)
    expect(isDocumentTracePeriodValid("2026-1")).toBe(false)
    expect(isDocumentTracePeriodValid("")).toBe(false)
  })
})

describe("listDocumentTraceDocuments", () => {
  it("lists receipts for REC + period with stable traceQuery", async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        receiptNo: "REC-SH001-202601-000123",
        issuedAt: new Date("2026-01-15T10:00:00.000Z"),
        sale: {
          id: "sale-1",
          status: "COMPLETED",
          total: new Prisma.Decimal("1500"),
          branchId: "branch-1",
          branch: { id: "branch-1", code: "SH001", name: "Shop 1" },
        },
      },
    ])
    const count = jest.fn().mockResolvedValue(1)
    const voucherFindMany = jest.fn().mockResolvedValue([
      { refId: "sale-1", voucherNo: "V-2026-01-00001" },
    ])

    const result = await listDocumentTraceDocuments(
      {
        receipt: { findMany, count },
        refund: { findMany: jest.fn(), count: jest.fn() },
        voucher: { findMany: voucherFindMany },
        stockDocument: { findMany: jest.fn(), count: jest.fn() },
        branch: { findFirst: jest.fn() },
      },
      {
        legalEntityCode: "AS",
        docType: "REC",
        period: "2026-01",
      }
    )

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 31,
        skip: 0,
        where: expect.objectContaining({
          issuedAt: {
            gte: new Date(2026, 0, 1),
            lte: new Date(2026, 0, 31, 23, 59, 59, 999),
          },
        }),
      })
    )
    expect(count).toHaveBeenCalled()
    expect(result.rows).toEqual([
      expect.objectContaining({
        documentNo: "REC-SH001-202601-000123",
        branchCode: "SH001",
        amount: "1500.00",
        voucherNo: "V-2026-01-00001",
        traceQuery: "REC-SH001-202601-000123",
      }),
    ])
    expect(result.totalCount).toBe(1)
    expect(result.hasMore).toBe(false)
    expect(result.nextOffset).toBeNull()
  })

  it("applies dateFrom and dateTo within the selected period", async () => {
    const findMany = jest.fn().mockResolvedValue([])
    const count = jest.fn().mockResolvedValue(0)

    await listDocumentTraceDocuments(
      {
        receipt: { findMany, count },
        refund: { findMany: jest.fn(), count: jest.fn() },
        voucher: { findMany: jest.fn() },
        stockDocument: { findMany: jest.fn(), count: jest.fn() },
        branch: { findFirst: jest.fn() },
      },
      {
        legalEntityCode: "AS",
        docType: "REC",
        period: "2026-01",
        dateFrom: "2026-01-10",
        dateTo: "2026-01-20",
      }
    )

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          issuedAt: {
            gte: new Date("2026-01-10T00:00:00"),
            lte: new Date(2026, 0, 20, 23, 59, 59, 999),
          },
        },
      })
    )
  })
})

import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import {
  appendFinanceReturnTo,
  buildFinanceCurrentReturnPath,
  buildFinanceJournalInquiryPath,
  buildOperationalParentDocumentPath,
  FINANCE_RETURN_TO_QUERY,
  formatFinanceDocumentBackLabel,
  resolveFinanceDocumentBackLink,
  resolveSafeFinanceReturnTo,
} from "@/lib/finance-ui/finance-navigation"

describe("finance-navigation", () => {
  it("appends safe finance returnTo to drill-down paths", () => {
    const href = buildFinanceJournalInquiryPath(
      "journal-1",
      "/finance/opening-balance/entry-1"
    )
    expect(href).toContain("/finance/journal-entries/journal-1")
    expect(href).toContain(
      `${FINANCE_RETURN_TO_QUERY}=${encodeURIComponent("/finance/opening-balance/entry-1")}`
    )
  })

  it("rejects unsafe returnTo targets", () => {
    expect(resolveSafeFinanceReturnTo("https://evil.test")).toBeNull()
    expect(resolveSafeFinanceReturnTo("//evil.test")).toBeNull()
    expect(resolveSafeFinanceReturnTo("/shop")).toBeNull()
    expect(resolveSafeFinanceReturnTo("/finance/opening-balance/entry-1")).toBe(
      "/finance/opening-balance/entry-1"
    )
  })

  it("builds operational parent paths from refType and refId", () => {
    expect(
      buildOperationalParentDocumentPath(
        FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL,
        "entry-1"
      )
    ).toBe("/finance/opening-balance/entry-1")
    expect(
      buildOperationalParentDocumentPath(FINANCE_REF_TYPES.MANUAL_JOURNAL, "entry-2")
    ).toBe("/finance/manual-journal-entries/entry-2")
    expect(
      buildOperationalParentDocumentPath(
        FINANCE_REF_TYPES.MANUAL_JOURNAL_REVERSAL,
        "rev-1"
      )
    ).toBeNull()
  })

  it("resolves back link with returnTo priority", () => {
    const link = resolveFinanceDocumentBackLink({
      returnTo: "/finance/opening-balance/entry-1",
      refType: FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL,
      refId: "entry-1",
      documentNo: "OPB-260001",
      entryType: "OPENING_BALANCE",
      moduleDefaultHref: "/finance/journal-entries",
      moduleDefaultLabel: "← Manual journals",
    })

    expect(link).toEqual({
      href: "/finance/opening-balance/entry-1",
      label: "← OPB-260001",
    })
  })

  it("falls back to operational parent when returnTo is absent", () => {
    const link = resolveFinanceDocumentBackLink({
      returnTo: null,
      refType: FINANCE_REF_TYPES.OPENING_BALANCE_JOURNAL,
      refId: "entry-1",
      documentNo: "OPB-260001",
      entryType: "OPENING_BALANCE",
      moduleDefaultHref: "/finance/journal-entries",
      moduleDefaultLabel: "← Manual journals",
    })

    expect(link.href).toBe("/finance/opening-balance/entry-1")
    expect(link.label).toBe("← OPB-260001")
  })

  it("uses module default when no returnTo or operational parent exists", () => {
    const link = resolveFinanceDocumentBackLink({
      returnTo: null,
      refType: FINANCE_REF_TYPES.POS_SALE,
      refId: "sale-1",
      documentNo: null,
      entryType: null,
      moduleDefaultHref: "/finance/journal-entries",
      moduleDefaultLabel: "← Manual journals",
    })

    expect(link).toEqual({
      href: "/finance/journal-entries",
      label: "← Manual journals",
    })
  })

  it("formats fallback labels from entry type and href", () => {
    expect(
      formatFinanceDocumentBackLabel({
        href: "/finance/opening-balance/entry-1",
        entryType: "OPENING_BALANCE",
      })
    ).toBe("← Opening Balance")
    expect(
      formatFinanceDocumentBackLabel({
        href: "/finance/reports/general-ledger",
      })
    ).toBe("← General Ledger")
  })

  it("builds current return path from pathname and search", () => {
    expect(buildFinanceCurrentReturnPath("/finance/opening-balance/entry-1", "")).toBe(
      "/finance/opening-balance/entry-1"
    )
    expect(
      buildFinanceCurrentReturnPath(
        "/finance/reports/general-ledger",
        "branchId=branch-1"
      )
    ).toBe("/finance/reports/general-ledger?branchId=branch-1")
  })

  it("appends returnTo to paths that already have query params", () => {
    const href = appendFinanceReturnTo(
      "/finance/journal-entries/journal-1?foo=bar",
      "/finance/opening-balance/entry-1"
    )
    expect(href).toContain("foo=bar")
    expect(href).toContain(`${FINANCE_RETURN_TO_QUERY}=`)
  })
})

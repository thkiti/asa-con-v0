import { FINANCE_REF_TYPES } from "@/lib/finance/posting-types"
import {
  buildGeneralLedgerRefPath,
  formatGeneralLedgerRefDisplay,
} from "@/lib/finance-ui/general-ledger-display"
import { formatGeneralLedgerDate } from "@/lib/finance-ui/format"

describe("general-ledger-display", () => {
  it("formats GL dates as dd.mm.yyyy without time", () => {
    expect(formatGeneralLedgerDate("2026-01-31T07:00:00.000Z")).toBe("31.01.2026")
    expect(formatGeneralLedgerDate("2026-05-10")).toBe("10.05.2026")
    expect(formatGeneralLedgerDate("2026-01-31T07:00:00.000Z")).not.toContain("AM")
    expect(formatGeneralLedgerDate("2026-01-31T07:00:00.000Z")).not.toContain("Jan")
  })

  it("prefers source document ref over voucher number for display", () => {
    expect(
      formatGeneralLedgerRefDisplay({
        sourceRef: "MJV-260007",
        entryNo: "V-2026-01-00007",
      })
    ).toBe("MJV-260007")
  })

  it("falls back to voucher number when source document ref is missing", () => {
    expect(
      formatGeneralLedgerRefDisplay({
        sourceRef: null,
        entryNo: "V-2026-01-00007",
      })
    ).toBe("V-2026-01-00007")
  })

  it("links to source document detail when ref type and id are available", () => {
    const href = buildGeneralLedgerRefPath(
      {
        journalEntryId: "je-1",
        entryNo: "V-2026-01-00007",
        sourceRef: "MJV-260007",
        sourceRefType: FINANCE_REF_TYPES.MANUAL_JOURNAL,
        sourceRefId: "mje-7",
        voucherId: "voucher-je-1",
      },
      "/finance/reports/general-ledger"
    )

    expect(href).toContain("/finance/manual-journal-entries/mje-7")
    expect(href).toContain("returnTo=")
  })

  it("falls back to voucher detail when source document cannot be resolved", () => {
    const href = buildGeneralLedgerRefPath(
      {
        journalEntryId: "je-1",
        entryNo: "V-2026-01-00007",
        sourceRef: null,
        sourceRefType: null,
        sourceRefId: null,
        voucherId: "voucher-je-1",
      },
      "/finance/reports/general-ledger"
    )

    expect(href).toContain("/finance/vouchers/voucher-je-1")
  })

  it("falls back to journal inquiry when only journal entry id is available", () => {
    const href = buildGeneralLedgerRefPath(
      {
        journalEntryId: "je-1",
        entryNo: "V-2026-01-00007",
        sourceRef: null,
        sourceRefType: null,
        sourceRefId: null,
        voucherId: null,
      },
      "/finance/reports/general-ledger"
    )

    expect(href).toContain("/finance/journal-entries/je-1")
  })
})

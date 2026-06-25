import {
  assertSafeReceiptNo,
  buildReceiptArchivePdfPathname,
} from "@/lib/document-archive/paths/receipt"
import { bangkokInstant } from "@/lib/reporting/bangkok-calendar"

describe("buildReceiptArchivePdfPathname", () => {
  it("builds year/month folders from Bangkok calendar and receiptNo filename", () => {
    const issuedAt = bangkokInstant(2026, 6, 15)
    expect(
      buildReceiptArchivePdfPathname("REC-SH001-202606-0001", issuedAt)
    ).toBe("documents/receipt/2026/06/REC-SH001-202606-0001.pdf")
  })

  it("uses Bangkok date when UTC instant crosses month boundary", () => {
    const issuedAt = new Date("2026-05-31T20:00:00.000Z")
    expect(
      buildReceiptArchivePdfPathname("REC-SH001-202605-0099", issuedAt)
    ).toBe("documents/receipt/2026/06/REC-SH001-202605-0099.pdf")
  })

  it("rejects invalid receipt numbers", () => {
    expect(() => assertSafeReceiptNo("bad/no")).toThrow("Invalid receipt number")
    expect(() => buildReceiptArchivePdfPathname("../escape", new Date())).toThrow(
      "Invalid receipt number"
    )
    expect(() =>
      buildReceiptArchivePdfPathname("REC-SH001-202606-0001", new Date())
    ).not.toThrow()
  })
})

import {
  REFUND_LOOKUP_ARCHIVE_STATUS_LABEL,
  resolveRefundLookupArchiveStatus,
} from "@/lib/pos/refund-lookup-archive-status"

describe("resolveRefundLookupArchiveStatus", () => {
  it("returns legacy until refund PDF archive is wired", () => {
    const status = resolveRefundLookupArchiveStatus()
    expect(status).toEqual({
      archiveStatus: "legacy",
      archiveStatusLabel: REFUND_LOOKUP_ARCHIVE_STATUS_LABEL.legacy,
      pdfReady: false,
    })
  })
})

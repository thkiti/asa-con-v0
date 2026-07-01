import type { ManualJournalEntryPdfSnapshot } from "./manual-journal-entry-pdf-snapshot-types"
import { resolveManualJournalEntrySnapshotBranchLabel } from "./manual-journal-entry-pdf-branch"
import { prisma } from "@/lib/shared/prisma"

/** Render PDF bytes from frozen POST-time snapshot using canonical print layout. */
export async function renderManualJournalEntryPdf(
  snapshot: ManualJournalEntryPdfSnapshot
): Promise<Buffer> {
  const [{ buildManualJournalEntryPdfDocumentHtml }, { renderFinanceVoucherPrintHtmlToPdf }] =
    await Promise.all([
      import("./manual-journal-entry-pdf-document-html"),
      import("@/lib/finance/finance-voucher-html-pdf"),
    ])

  const branchLabel = await resolveManualJournalEntrySnapshotBranchLabel(
    prisma,
    snapshot
  )
  const html = await buildManualJournalEntryPdfDocumentHtml({ snapshot, branchLabel })
  return renderFinanceVoucherPrintHtmlToPdf(html)
}

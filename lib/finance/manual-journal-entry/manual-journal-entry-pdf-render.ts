import PDFDocument from "pdfkit"
import { buildManualJournalPdfHeaderLines } from "./manual-journal-entry-pdf-header"
import type { ManualJournalEntryPdfSnapshot } from "./manual-journal-entry-pdf-snapshot-types"
import { resolveThaiFontPathForPdf } from "./pdf-font"

function formatMoney(value: string): string {
  const n = Number(value)
  if (!Number.isFinite(n) || n === 0) return ""
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function renderPdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)
  })
}

/** Render PDF bytes from a frozen POST-time snapshot only. */
export async function renderManualJournalEntryPdf(
  snapshot: ManualJournalEntryPdfSnapshot
): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 40, size: "A4" })
  const bufferPromise = renderPdfToBuffer(doc)

  doc.font(await resolveThaiFontPathForPdf())

  const header = buildManualJournalPdfHeaderLines(snapshot)

  doc.fillColor("#000").fontSize(9)
  doc.text(header.auditLine)

  if (header.description) {
    doc.moveDown(0.35)
    doc.text(`Description: ${header.description}`)
  }

  doc.moveDown(0.45)
  doc.fontSize(8).text("Line  Account   Name                    Debit        Credit       Memo")
  doc.moveDown(0.2)

  for (const line of snapshot.lines) {
    const row = [
      String(line.lineNo).padStart(2),
      line.accountCode.padEnd(8),
      line.accountName.slice(0, 22).padEnd(22),
      formatMoney(line.debit).padStart(12),
      formatMoney(line.credit).padStart(12),
      (line.memo ?? "").slice(0, 24),
    ].join("  ")
    doc.text(row)
  }

  doc.moveDown()
  doc.text(
    `Totals${"".padEnd(34)}${formatMoney(snapshot.totalDebit).padStart(12)}${formatMoney(snapshot.totalCredit).padStart(12)}`
  )
  doc.moveDown()
  doc.fontSize(7).fillColor("#666").text(
    `Voucher ${snapshot.postedVoucherNo} • Posted by ${snapshot.postedByStaffId} • Immutable snapshot (v${snapshot.snapshotVersion}) • Journal ${snapshot.postedJournalEntryId}`
  )

  doc.end()
  return bufferPromise
}

import PDFDocument from "pdfkit"
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

  const fontPath = await resolveThaiFontPathForPdf()
  if (fontPath) {
    doc.font(fontPath)
  }

  doc.fontSize(14).text(snapshot.entryTypeLabel, { align: "center" })
  doc.moveDown(0.3)
  doc.fontSize(11).text(snapshot.entryNo, { align: "center" })
  doc.moveDown()

  const meta: Array<[string, string]> = [
    ["Entry date", snapshot.entryDate],
    ["Legal entity", snapshot.legalEntityCode],
    ["Branch", snapshot.branchId],
    ...(snapshot.refNo ? [["Reference", snapshot.refNo] as [string, string]] : []),
    ...(snapshot.description ? [["Description", snapshot.description] as [string, string]] : []),
    ["Voucher no.", snapshot.postedVoucherNo],
    ["Posted at", snapshot.postedAt],
    ["Posted by", snapshot.postedByStaffId],
  ]

  doc.fontSize(9)
  for (const [label, value] of meta) {
    doc.text(`${label}: ${value}`)
  }

  doc.moveDown()
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
    `Immutable posted snapshot (v${snapshot.snapshotVersion}). Journal entry ${snapshot.postedJournalEntryId}`
  )

  doc.end()
  return bufferPromise
}

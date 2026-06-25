import PDFDocument from "pdfkit"
import { buildReceiptSlipText } from "@/lib/thermal/build-receipt-slip"
import { THERMAL_PAPER_WIDTH_MM } from "@/lib/thermal/thermal-paper"
import { receiptPrintContextFromSnapshot } from "./receipt-pdf-snapshot"
import type { ReceiptPdfSnapshot } from "./receipt-pdf-snapshot-types"

const THERMAL_PDF_MARGIN_PT = 8
const THERMAL_PDF_LINE_HEIGHT_PT = 9
const THERMAL_PDF_FONT_SIZE_PT = 8
const THERMAL_PDF_MIN_HEIGHT_PT = 120

function mmToPt(mm: number): number {
  return (mm * 72) / 25.4
}

function renderPdfToBuffer(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on("data", (chunk: Buffer) => chunks.push(chunk))
    doc.on("end", () => resolve(Buffer.concat(chunks)))
    doc.on("error", reject)
  })
}

/** Render 80mm thermal receipt PDF bytes from a frozen checkout snapshot only. */
export async function renderReceiptPdfFromSnapshot(
  snapshot: ReceiptPdfSnapshot
): Promise<Buffer> {
  const context = receiptPrintContextFromSnapshot(snapshot)
  const slipText = buildReceiptSlipText(context, snapshot.thermalLayout)
  const lines = slipText.split("\n").filter((line) => line.length > 0)

  const pageWidthPt = mmToPt(THERMAL_PAPER_WIDTH_MM)
  const contentHeightPt = Math.max(
    THERMAL_PDF_MIN_HEIGHT_PT,
    lines.length * THERMAL_PDF_LINE_HEIGHT_PT + THERMAL_PDF_MARGIN_PT * 2
  )

  const doc = new PDFDocument({
    size: [pageWidthPt, contentHeightPt],
    margin: THERMAL_PDF_MARGIN_PT,
    autoFirstPage: true,
  })
  const bufferPromise = renderPdfToBuffer(doc)

  doc.font("Courier").fontSize(THERMAL_PDF_FONT_SIZE_PT)
  for (const line of lines) {
    doc.text(line, { lineBreak: false, width: pageWidthPt - THERMAL_PDF_MARGIN_PT * 2 })
  }

  doc.end()
  return bufferPromise
}

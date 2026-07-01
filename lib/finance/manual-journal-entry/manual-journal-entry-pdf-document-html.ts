import { readFileSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"
import { createElement } from "react"
import { FinanceVoucherPrintSheet } from "@/components/finance/FinanceVoucherPrintSheet"
import { resolveBundledFinancePrintFontPath } from "@/lib/finance/finance-print-font"
import { FINANCE_VOUCHER_PRINT_FONT_DATA_ATTR } from "@/lib/finance-ui/finance-voucher-print-font"
import { buildFinanceVoucherPrintPageCss } from "@/lib/finance-ui/finance-voucher-print-page-css"
import { buildFinanceVoucherPrintModelFromManualJournalEntryPdfSnapshot } from "@/lib/finance-ui/finance-voucher-print-from-snapshot"
import type { ManualJournalEntryPdfSnapshot } from "./manual-journal-entry-pdf-snapshot-types"

let cachedDocumentCss: string | null = null

function loadFinanceVoucherPrintDocumentCss(): string {
  if (cachedDocumentCss) return cachedDocumentCss
  cachedDocumentCss = readFileSync(
    path.join(
      process.cwd(),
      "lib/finance/manual-journal-entry/manual-journal-entry-pdf-document.css"
    ),
    "utf8"
  )
  return cachedDocumentCss
}

function buildFontFaceCss(): string {
  const regularPath = pathToFileURL(resolveBundledFinancePrintFontPath()).href
  const boldPath = pathToFileURL(
    path.join(process.cwd(), "public", "fonts", "THSarabunNew-Bold.ttf")
  ).href

  return `@font-face {
  font-family: "THSarabunNew";
  src: url("${regularPath}") format("truetype");
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: "THSarabunNew";
  src: url("${boldPath}") format("truetype");
  font-weight: 700;
  font-style: normal;
}`
}

export type ManualJournalEntryPdfDocumentInput = {
  snapshot: ManualJournalEntryPdfSnapshot
  branchLabel?: string | null
}

/** Full standalone HTML document for archived PDF — same sheet as browser Print Out. */
export async function buildManualJournalEntryPdfDocumentHtml(
  input: ManualJournalEntryPdfDocumentInput
): Promise<string> {
  const { renderToStaticMarkup } = await import("react-dom/server")
  const { snapshot, branchLabel } = input
  const model = buildFinanceVoucherPrintModelFromManualJournalEntryPdfSnapshot(
    snapshot,
    { branchLabel }
  )
  const description = snapshot.description?.trim() ?? ""

  const sheetMarkup = renderToStaticMarkup(
    createElement(FinanceVoucherPrintSheet, {
      model,
      entryType: snapshot.entryType,
      legalEntityCode: snapshot.legalEntityCode,
      entryDate: snapshot.entryDate,
      description,
    })
  )

  const styles = [
    buildFontFaceCss(),
    loadFinanceVoucherPrintDocumentCss(),
    buildFinanceVoucherPrintPageCss(),
  ].join("\n")

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${model.documentNo}</title>
  <style>${styles}</style>
</head>
<body class="finance-voucher-print-active">
  <div class="finance-voucher-print-root finance-voucher-print-font" data-finance-print-font="${FINANCE_VOUCHER_PRINT_FONT_DATA_ATTR}">
    ${sheetMarkup}
  </div>
</body>
</html>`
}

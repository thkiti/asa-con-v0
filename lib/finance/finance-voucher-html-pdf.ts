const FINANCE_VOUCHER_PDF_MARGIN_MM = "12mm"

/** Render standalone finance voucher HTML to A4 PDF bytes (same layout as browser print). */
export async function renderFinanceVoucherPrintHtmlToPdf(
  html: string
): Promise<Buffer> {
  const { chromium } = await import("playwright")

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.setContent(html, { waitUntil: "networkidle" })
    await page.emulateMedia({ media: "print" })

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: FINANCE_VOUCHER_PDF_MARGIN_MM,
        bottom: FINANCE_VOUCHER_PDF_MARGIN_MM,
        left: FINANCE_VOUCHER_PDF_MARGIN_MM,
        right: FINANCE_VOUCHER_PDF_MARGIN_MM,
      },
    })

    await page.close()
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

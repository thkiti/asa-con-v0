/** A4 at 96dpi — matches browser print page width for layout scale. */
const FINANCE_VOUCHER_PDF_VIEWPORT = { width: 794, height: 1123 } as const

/** Render standalone finance voucher HTML to A4 PDF bytes (same layout as browser print). */
export async function renderFinanceVoucherPrintHtmlToPdf(
  html: string
): Promise<Buffer> {
  const { chromium } = await import("playwright")

  const browser = await chromium.launch({ headless: true })
  try {
    const page = await browser.newPage()
    await page.emulateMedia({ media: "print" })
    await page.setViewportSize(FINANCE_VOUCHER_PDF_VIEWPORT)
    await page.setContent(html, { waitUntil: "networkidle" })

    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
      },
    })

    await page.close()
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}

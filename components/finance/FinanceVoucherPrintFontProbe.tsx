"use client"

import { useEffect, useState } from "react"
import {
  verifyFinanceVoucherFont,
  type FinanceVoucherFontVerification,
} from "@/lib/finance-ui/finance-voucher-font-verify"

/**
 * Development-only font verification (screen). Hidden from print via no-print.
 * Reports computed font-family and document.fonts.check() for the voucher sheet.
 */
export function FinanceVoucherPrintFontProbe() {
  const [report, setReport] = useState<FinanceVoucherFontVerification | null>(null)

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return

    const run = () => setReport(verifyFinanceVoucherFont())
    run()
    const id = window.setTimeout(run, 500)
    return () => window.clearTimeout(id)
  }, [])

  if (process.env.NODE_ENV !== "development" || !report) {
    return null
  }

  return (
    <div
      className="no-print mt-2 space-y-1 text-xs text-zinc-500"
      data-testid="finance-voucher-font-probe"
      data-font-match={report.stackNamesExpectedFont ? "true" : "false"}
      data-fonts-check-regular={
        report.fontsCheckRegular == null ? "unknown" : String(report.fontsCheckRegular)
      }
    >
      <p>
        Dev font probe — selector: <code>{report.sheetSelector}</code>
      </p>
      <p data-testid="finance-voucher-font-probe-sheet">
        Sheet computed: {report.computedFontFamily ?? "—"}
      </p>
      <p data-testid="finance-voucher-font-probe-root">
        Root computed: {report.rootComputedFontFamily ?? "—"}
      </p>
      <p>
        Primary family: {report.primaryComputedFamily ?? "—"}
      </p>
      <p>
        document.fonts.check(16px):{" "}
        {report.fontsCheckRegular == null ? "n/a" : String(report.fontsCheckRegular)}
        {" · "}
        bold: {report.fontsCheckBold == null ? "n/a" : String(report.fontsCheckBold)}
      </p>
      {!report.stackNamesExpectedFont ? (
        <p className="text-amber-800">
          Expected THSarabunNew / Sarabun in computed stack — browser may be using fallback.
        </p>
      ) : null}
    </div>
  )
}

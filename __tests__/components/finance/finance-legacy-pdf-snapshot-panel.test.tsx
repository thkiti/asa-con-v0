import { renderToStaticMarkup } from "react-dom/server"
import { FinanceLegacyPdfSnapshotPanel } from "@/components/finance/FinanceLegacyPdfSnapshotPanel"
import { LEGACY_PDF_SNAPSHOT_MISSING_MESSAGE } from "@/lib/finance-ui/finance-legacy-pdf-snapshot"

describe("FinanceLegacyPdfSnapshotPanel", () => {
  it("shows friendly message when archived snapshot is not ready", () => {
    const html = renderToStaticMarkup(
      <FinanceLegacyPdfSnapshotPanel
        entryId="entry-1"
        entryNo="MJV-260001"
        pdfSnapshotReady={false}
      />
    )

    expect(html).toContain('data-testid="legacy-pdf-missing-message"')
    expect(html).toContain(LEGACY_PDF_SNAPSHOT_MISSING_MESSAGE)
    expect(html).not.toContain('data-testid="action-view-pdf"')
  })

  it("shows de-emphasized archived PDF actions when snapshot is ready", () => {
    const html = renderToStaticMarkup(
      <FinanceLegacyPdfSnapshotPanel
        entryId="entry-1"
        entryNo="MJV-260001"
        pdfSnapshotReady={true}
      />
    )

    expect(html).toContain("Legacy PDF snapshot (archived)")
    expect(html).toContain('data-testid="action-view-pdf"')
    expect(html).toContain("View archived PDF")
  })
})

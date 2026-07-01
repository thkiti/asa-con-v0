import { renderToStaticMarkup } from "react-dom/server"
import { FinanceLegacyPdfSnapshotPanel } from "@/components/finance/FinanceLegacyPdfSnapshotPanel"
import {
  LEGACY_PDF_SNAPSHOT_MISSING_BODY,
  LEGACY_PDF_SNAPSHOT_MISSING_READONLY_BODY,
  LEGACY_PDF_SNAPSHOT_MISSING_TITLE,
} from "@/lib/finance-ui/finance-legacy-pdf-snapshot"
import {
  financeLegacyPdfSnapshotPanel,
  financeLegacyPdfSnapshotTitle,
} from "@/lib/finance-ui/finance-visual-classes"

describe("FinanceLegacyPdfSnapshotPanel", () => {
  it("shows dark-theme panel and regenerate action when allowed", () => {
    const html = renderToStaticMarkup(
      <FinanceLegacyPdfSnapshotPanel
        entryId="entry-1"
        entryNo="MJV-260001"
        pdfSnapshotReady={false}
        showRegenerateButton
        onRegenerate={() => undefined}
      />
    )

    expect(html).toContain('data-testid="finance-legacy-pdf-snapshot"')
    expect(html).toContain(financeLegacyPdfSnapshotPanel)
    expect(html).toContain(financeLegacyPdfSnapshotTitle)
    expect(html).toContain(LEGACY_PDF_SNAPSHOT_MISSING_TITLE)
    expect(html).toContain(LEGACY_PDF_SNAPSHOT_MISSING_BODY)
    expect(html).toContain('data-testid="action-regenerate-pdf"')
    expect(html).toContain("Regenerate archived PDF")
    expect(html).not.toContain("Retry archived PDF generation")
    expect(html).not.toContain("border-zinc-300 bg-zinc-50")
    expect(html).not.toContain('data-testid="action-view-pdf"')
  })

  it("shows read-only missing message without regenerate for finance users", () => {
    const html = renderToStaticMarkup(
      <FinanceLegacyPdfSnapshotPanel
        entryId="entry-1"
        entryNo="MJV-260001"
        pdfSnapshotReady={false}
        showRegenerateButton={false}
      />
    )

    expect(html).toContain(LEGACY_PDF_SNAPSHOT_MISSING_READONLY_BODY)
    expect(html).not.toContain('data-testid="action-regenerate-pdf"')
  })

  it("shows archived PDF actions when snapshot is ready", () => {
    const html = renderToStaticMarkup(
      <FinanceLegacyPdfSnapshotPanel
        entryId="entry-1"
        entryNo="MJV-260001"
        pdfSnapshotReady={true}
      />
    )

    expect(html).toContain("Archived PDF snapshot")
    expect(html).toContain('data-testid="action-view-pdf"')
    expect(html).toContain("View archived PDF")
    expect(html).not.toContain(LEGACY_PDF_SNAPSHOT_MISSING_TITLE)
  })
})

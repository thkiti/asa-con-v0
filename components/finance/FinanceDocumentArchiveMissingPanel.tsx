import {
  DOCUMENT_ARCHIVE_MISSING_READONLY_BODY,
  DOCUMENT_ARCHIVE_MISSING_TITLE,
} from "@/lib/document-archive-ui/document-archive-messages"
import {
  financeLegacyPdfSnapshotPanel,
  financeLegacyPdfSnapshotTitle,
} from "@/lib/finance-ui/finance-visual-classes"
import { themeTextSecondary } from "@/lib/theme/theme-classes"

/** Read-only panel when document vault has no archived PDF. */
export function FinanceDocumentArchiveMissingPanel() {
  return (
    <div
      className={`${financeLegacyPdfSnapshotPanel} no-print`}
      data-testid="document-archive-missing-panel"
    >
      <p className={financeLegacyPdfSnapshotTitle} data-testid="document-archive-missing-title">
        {DOCUMENT_ARCHIVE_MISSING_TITLE}
      </p>
      <p className={`text-sm ${themeTextSecondary}`} data-testid="document-archive-missing-body">
        {DOCUMENT_ARCHIVE_MISSING_READONLY_BODY}
      </p>
    </div>
  )
}

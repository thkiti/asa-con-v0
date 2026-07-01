"use client"

import { useState } from "react"
import { LEGACY_PDF_SNAPSHOT_REPLACE_HELPER } from "@/lib/finance-ui/finance-legacy-pdf-snapshot"
import {
  themeBtnSecondary,
  themeInlineError,
  themeLinkMuted,
  themeTextSecondary,
} from "@/lib/theme/theme-classes"

type FinanceArchivedPdfAdminRepairProps = {
  disabled?: boolean
  regenerating?: boolean
  regenerateError?: string | null
  deleting?: boolean
  onRegenerate?: () => void | Promise<void>
  onDelete?: () => void | Promise<void>
}

/** HO_ADMIN repair controls — hidden until expanded. */
export function FinanceArchivedPdfAdminRepair({
  disabled = false,
  regenerating = false,
  regenerateError = null,
  deleting = false,
  onRegenerate,
  onDelete,
}: FinanceArchivedPdfAdminRepairProps) {
  const [open, setOpen] = useState(false)
  const canRegenerate = Boolean(onRegenerate)
  const canDelete = Boolean(onDelete)
  if (!canRegenerate && !canDelete) return null

  return (
    <div className="mt-1" data-testid="legacy-pdf-admin-repair">
      {!open ? (
        <button
          type="button"
          className={`text-sm ${themeLinkMuted}`}
          onClick={() => setOpen(true)}
          data-testid="action-archive-repair-toggle"
        >
          Archive repair
        </button>
      ) : (
        <div
          className="space-y-2 rounded border border-[var(--finance-grid)] px-3 py-2"
          data-testid="legacy-pdf-replace-section"
        >
          {canRegenerate ? (
            <>
              <p className={`text-sm ${themeTextSecondary}`} data-testid="legacy-pdf-replace-helper">
                {LEGACY_PDF_SNAPSHOT_REPLACE_HELPER}
              </p>
              <button
                type="button"
                className={themeBtnSecondary}
                disabled={disabled || regenerating || deleting}
                onClick={() => void onRegenerate!()}
                data-testid="action-replace-pdf"
              >
                {regenerating ? "Regenerating…" : "Replace archived PDF"}
              </button>
            </>
          ) : null}
          {canDelete ? (
            <button
              type="button"
              className={themeBtnSecondary}
              disabled={disabled || regenerating || deleting}
              onClick={() => void onDelete!()}
              data-testid="action-delete-pdf"
            >
              {deleting ? "Deleting…" : "Delete archived PDF"}
            </button>
          ) : null}
          {regenerateError ? (
            <p className={`text-sm ${themeInlineError}`} data-testid="pdf-error-message">
              {regenerateError}
            </p>
          ) : null}
        </div>
      )}
    </div>
  )
}

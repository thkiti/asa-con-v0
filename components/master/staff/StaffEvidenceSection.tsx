"use client"

import { useCallback, useEffect, useState } from "react"
import {
  deleteMasterStaffEvidence,
  fetchMasterStaffEvidence,
  type MasterStaffEvidenceDetail,
} from "@/lib/master-ui/fetchers"
import { themeBtnPrimary, themeBtnSecondary } from "@/lib/theme/theme-classes"
import { StaffConfirmDialog } from "./StaffConfirmDialog"

type StaffEvidenceSectionProps = {
  staffRowId: string
  staffCode: string
  refreshKey?: number
  onEvidenceChanged?: () => void
}

export function StaffEvidenceSection({
  staffRowId,
  staffCode,
  refreshKey = 0,
  onEvidenceChanged,
}: StaffEvidenceSectionProps) {
  const [detail, setDetail] = useState<MasterStaffEvidenceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await fetchMasterStaffEvidence(staffRowId)
      setDetail(result)
    } catch (err: unknown) {
      setDetail(null)
      setError(err instanceof Error ? err.message : "Failed to load evidence")
    } finally {
      setLoading(false)
    }
  }, [staffRowId])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  const hasAnyEvidence = Boolean(detail?.photoUploaded || detail?.idCardUploaded)

  const handleDelete = async () => {
    setDeletePending(true)
    setDeleteError(null)
    try {
      await deleteMasterStaffEvidence(staffRowId)
      setDeleteOpen(false)
      await load()
      onEvidenceChanged?.()
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <section
      className="rounded-md border border-border bg-muted/20 p-3"
      data-testid="staff-evidence-section"
    >
      <h3 className="text-sm font-semibold">Evidence</h3>
      <p className="mt-1 text-xs text-muted-foreground">
        POS staff photo and ID card (blob storage). Complete when both files exist.
      </p>

      {loading ? (
        <p className="mt-2 text-sm text-muted-foreground">Loading evidence…</p>
      ) : error ? (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : (
        <div className="mt-3 space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">Staff photo:</span>
            {detail?.photoUploaded && detail.photoUrl ? (
              <a
                href={detail.photoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sky-700 underline"
                data-testid="staff-evidence-view-ph"
              >
                View Staff Photo
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground">ID card:</span>
            {detail?.idCardUploaded && detail.idCardUrl ? (
              <a
                href={detail.idCardUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sky-700 underline"
                data-testid="staff-evidence-view-id"
              >
                View ID Card
              </a>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Status:{" "}
            {detail?.evidenceComplete
              ? "Complete (both files)"
              : detail?.photoUploaded || detail?.idCardUploaded
                ? "Incomplete"
                : "No files"}
          </p>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={themeBtnSecondary}
          disabled={!hasAnyEvidence || loading || deletePending}
          onClick={() => {
            setDeleteError(null)
            setDeleteOpen(true)
          }}
          data-testid="staff-evidence-delete-button"
        >
          Delete Evidence
        </button>
      </div>

      <StaffConfirmDialog
        open={deleteOpen}
        title="Delete staff evidence"
        message={`Delete all evidence files (PH and ID) for ${staffCode}? Staff can upload again from POS.`}
        confirmLabel="Delete Evidence"
        pending={deletePending}
        error={deleteError}
        onClose={() => {
          if (!deletePending) setDeleteOpen(false)
        }}
        onConfirm={() => void handleDelete()}
      />
    </section>
  )
}

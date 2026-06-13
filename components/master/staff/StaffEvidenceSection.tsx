"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  deleteMasterStaffEvidence,
  fetchMasterStaffEvidence,
  uploadMasterStaffEvidence,
  type MasterStaffEvidenceDetail,
} from "@/lib/master-ui/fetchers"
import {
  staffEvidenceCacheBustUrl,
  staffEvidenceUpdatedAtForKind,
} from "@/lib/master-ui/staff-evidence-view"
import type { StaffEvidenceFileKind } from "@/lib/pos/staff-evidence-blob"
import { themeBtnSecondary } from "@/lib/theme/theme-classes"
import { StaffConfirmDialog } from "./StaffConfirmDialog"
import { StaffEvidenceImageViewModal } from "./StaffEvidenceImageViewModal"
import { StaffEvidenceUploadDialog } from "./StaffEvidenceUploadDialog"

type StaffEvidenceSectionProps = {
  staffRowId: string
  staffCode: string
  refreshKey?: number
  onEvidenceChanged?: () => void
  /** Called after HO recovery upload succeeds — closes edit flow upstream. */
  onUploadSuccess?: () => void
}

function evidenceUrlForKind(
  detail: MasterStaffEvidenceDetail,
  kind: StaffEvidenceFileKind
): string | null {
  const raw = kind === "ph" ? detail.photoUrl : detail.idCardUrl
  if (typeof raw !== "string") return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function StaffEvidenceSection({
  staffRowId,
  staffCode,
  refreshKey = 0,
  onEvidenceChanged,
  onUploadSuccess,
}: StaffEvidenceSectionProps) {
  const viewRequestRef = useRef(0)

  const [detail, setDetail] = useState<MasterStaffEvidenceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deletePending, setDeletePending] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadPending, setUploadPending] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [viewKind, setViewKind] = useState<StaffEvidenceFileKind | null>(null)
  const [viewUrlLoading, setViewUrlLoading] = useState(false)
  const [viewFetchError, setViewFetchError] = useState<string | null>(null)
  const [viewImageUrl, setViewImageUrl] = useState<string | null>(null)
  const [evidenceCacheNonce, setEvidenceCacheNonce] = useState(0)

  const bumpEvidenceCache = useCallback(() => {
    setEvidenceCacheNonce((value) => value + 1)
  }, [])

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

  const closeView = useCallback(() => {
    viewRequestRef.current += 1
    setViewKind(null)
    setViewUrlLoading(false)
    setViewFetchError(null)
    setViewImageUrl(null)
  }, [])

  const openView = useCallback(
    (kind: StaffEvidenceFileKind) => {
      const requestId = viewRequestRef.current + 1
      viewRequestRef.current = requestId

      setViewKind(kind)
      setViewUrlLoading(true)
      setViewFetchError(null)
      setViewImageUrl(null)

      void fetchMasterStaffEvidence(staffRowId)
        .then((evidence) => {
          if (viewRequestRef.current !== requestId) return

          const url = evidenceUrlForKind(evidence, kind)
          if (!url) {
            console.warn("[StaffEvidenceSection] evidence image URL missing", {
              staffRowId,
              staffCode,
              kind,
              photoUploaded: evidence.photoUploaded,
              idCardUploaded: evidence.idCardUploaded,
            })
            return
          }

          setViewImageUrl(
            staffEvidenceCacheBustUrl(
              url,
              staffEvidenceUpdatedAtForKind(evidence, kind),
              evidenceCacheNonce
            )
          )
        })
        .catch((err: unknown) => {
          if (viewRequestRef.current !== requestId) return
          console.error("[StaffEvidenceSection] failed to fetch evidence for view", {
            staffRowId,
            staffCode,
            kind,
            error: err,
          })
          setViewFetchError("Failed to load image")
        })
        .finally(() => {
          if (viewRequestRef.current !== requestId) return
          setViewUrlLoading(false)
        })
    },
    [evidenceCacheNonce, staffCode, staffRowId]
  )

  const hasAnyEvidence = Boolean(detail?.photoUploaded || detail?.idCardUploaded)
  const hasNoEvidence = Boolean(detail && !detail.photoUploaded && !detail.idCardUploaded)

  const handleDelete = async () => {
    setDeletePending(true)
    setDeleteError(null)
    try {
      await deleteMasterStaffEvidence(staffRowId)
      setDeleteOpen(false)
      closeView()
      bumpEvidenceCache()
      await load()
      onEvidenceChanged?.()
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed")
    } finally {
      setDeletePending(false)
    }
  }

  const handleUploadConfirm = async (input: { photo: Blob; idCard: Blob }) => {
    setUploadPending(true)
    setUploadError(null)
    try {
      const result = await uploadMasterStaffEvidence(staffRowId, input)
      setDetail(result)
      setUploadOpen(false)
      closeView()
      bumpEvidenceCache()
      await load()
      onEvidenceChanged?.()
      onUploadSuccess?.()
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploadPending(false)
    }
  }

  return (
    <section
      className="flex flex-wrap items-center gap-2"
      data-testid="staff-evidence-section"
    >
      <span className="text-sm font-semibold">Evidence</span>

      {loading ? (
        <span className="text-sm text-muted-foreground">Loading…</span>
      ) : error ? (
        <span className="text-sm text-red-600" role="alert">
          {error}
        </span>
      ) : hasNoEvidence ? (
        <button
          type="button"
          className={themeBtnSecondary}
          onClick={() => {
            setUploadError(null)
            setUploadOpen(true)
          }}
          data-testid="staff-evidence-upload-button"
        >
          Upload
        </button>
      ) : (
        <>
          {detail?.photoUploaded ? (
            <button
              type="button"
              className={themeBtnSecondary}
              onClick={() => openView("ph")}
              data-testid="staff-evidence-view-ph"
            >
              Photo
            </button>
          ) : null}
          {detail?.idCardUploaded ? (
            <button
              type="button"
              className={themeBtnSecondary}
              onClick={() => openView("id")}
              data-testid="staff-evidence-view-id"
            >
              ID Card
            </button>
          ) : null}
          {hasAnyEvidence ? (
            <button
              type="button"
              className={themeBtnSecondary}
              disabled={deletePending}
              onClick={() => {
                setDeleteError(null)
                setDeleteOpen(true)
              }}
              data-testid="staff-evidence-delete-button"
            >
              Delete
            </button>
          ) : null}
        </>
      )}

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

      <StaffEvidenceUploadDialog
        open={uploadOpen}
        staffRowId={staffRowId}
        pending={uploadPending}
        error={uploadError}
        onClose={() => {
          if (!uploadPending) {
            setUploadOpen(false)
            setUploadError(null)
          }
        }}
        onConfirm={(input) => void handleUploadConfirm(input)}
      />

      <StaffEvidenceImageViewModal
        open={viewKind !== null}
        title={viewKind === "id" ? "ID card" : "Staff photo"}
        staffCode={staffCode}
        kind={viewKind ?? "ph"}
        urlLoading={viewUrlLoading}
        fetchError={viewFetchError}
        imageUrl={viewImageUrl}
        onClose={closeView}
      />
    </section>
  )
}

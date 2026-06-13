"use client"

import { useCallback, useRef, useState } from "react"
import { fetchMasterStaffEvidence } from "@/lib/master-ui/fetchers"
import {
  staffEvidenceCacheBustUrl,
  staffEvidenceUpdatedAtForKind,
} from "@/lib/master-ui/staff-evidence-view"
import type { StaffEvidenceFileKind } from "@/lib/pos/staff-evidence-blob"
import { StaffEvidenceImageViewModal } from "./StaffEvidenceImageViewModal"

type StaffEvidenceBadgeHoverProps = {
  staffRowId: string
  staffCode: string
  kind: StaffEvidenceFileKind
  tooltip: string
  exists: boolean
}

function circleClassName(kind: StaffEvidenceFileKind, exists: boolean): string {
  const base =
    "inline-block h-3 w-3 shrink-0 rounded-full border border-transparent"
  if (!exists) {
    return `${base} bg-zinc-300`
  }
  if (kind === "ph") {
    return `${base} cursor-pointer bg-emerald-500`
  }
  return `${base} cursor-pointer bg-blue-500`
}

export function StaffEvidenceBadgeHover({
  staffRowId,
  staffCode,
  kind,
  tooltip,
  exists,
}: StaffEvidenceBadgeHoverProps) {
  const requestIdRef = useRef(0)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const closePreview = useCallback(() => {
    setOpen(false)
    setLoading(false)
    setFetchError(null)
    requestIdRef.current += 1
  }, [])

  const openPreview = useCallback(() => {
    if (!exists) return
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setOpen(true)
    setLoading(true)
    setImageUrl(null)
    setFetchError(null)

    void fetchMasterStaffEvidence(staffRowId)
      .then((detail) => {
        if (requestIdRef.current !== requestId) return
        const url = kind === "ph" ? detail.photoUrl : detail.idCardUrl
        const trimmed = typeof url === "string" ? url.trim() : ""
        if (!trimmed) {
          console.warn("[StaffEvidenceBadgeHover] evidence image URL missing", {
            staffRowId,
            staffCode,
            kind,
          })
          return
        }
        setImageUrl(
          staffEvidenceCacheBustUrl(
            trimmed,
            staffEvidenceUpdatedAtForKind(detail, kind)
          )
        )
      })
      .catch((err: unknown) => {
        if (requestIdRef.current !== requestId) return
        console.error("[StaffEvidenceBadgeHover] failed to fetch evidence for view", {
          staffRowId,
          staffCode,
          kind,
          error: err,
        })
        setFetchError("Failed to load image")
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) return
        setLoading(false)
      })
  }, [exists, kind, staffCode, staffRowId])

  return (
    <>
      <span
        role="button"
        className={circleClassName(kind, exists)}
        data-testid={`staff-evidence-dot-${kind}`}
        data-evidence-present={exists ? "true" : "false"}
        title={tooltip}
        tabIndex={exists ? 0 : -1}
        onClick={() => openPreview()}
        onKeyDown={(event) => {
          if (!exists) return
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            openPreview()
          }
        }}
        aria-label={
          exists
            ? `${tooltip} uploaded for ${staffCode}`
            : `${tooltip} missing for ${staffCode}`
        }
      />
      <StaffEvidenceImageViewModal
        open={open}
        title={kind === "ph" ? "Staff photo" : "ID card"}
        staffCode={staffCode}
        kind={kind}
        urlLoading={loading}
        fetchError={fetchError}
        imageUrl={imageUrl}
        onClose={closePreview}
      />
    </>
  )
}

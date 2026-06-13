"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FocusEvent,
} from "react"
import { createPortal } from "react-dom"
import { fetchMasterStaffEvidence } from "@/lib/master-ui/fetchers"
import type { StaffEvidenceFileKind } from "@/lib/pos/staff-evidence-blob"
import { StaffEvidenceImageHoverPreview } from "./StaffEvidenceImageHoverPreview"

type StaffEvidenceBadgeHoverProps = {
  staffRowId: string
  staffCode: string
  kind: StaffEvidenceFileKind
  tooltip: string
  exists: boolean
}

function circleClassName(kind: StaffEvidenceFileKind, exists: boolean): string {
  const base = "inline-block h-3 w-3 shrink-0 rounded-full border border-transparent"
  if (!exists) {
    return `${base} bg-zinc-300`
  }
  if (kind === "ph") {
    return `${base} bg-emerald-500`
  }
  return `${base} bg-blue-500`
}

function computePreviewPosition(trigger: HTMLElement): { top: number; left: number } {
  const rect = trigger.getBoundingClientRect()
  const gap = 8
  const maxWidth = 320
  const maxHeight = 360

  let left = rect.right + gap
  if (left + maxWidth > window.innerWidth - gap) {
    left = Math.max(gap, rect.left - maxWidth - gap)
  }

  let top = rect.top
  if (top + maxHeight > window.innerHeight - gap) {
    top = Math.max(gap, window.innerHeight - maxHeight - gap)
  }

  return { top, left }
}

export function StaffEvidenceBadgeHover({
  staffRowId,
  staffCode,
  kind,
  tooltip,
  exists,
}: StaffEvidenceBadgeHoverProps) {
  const triggerRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [imageFailed, setImageFailed] = useState(false)
  const requestIdRef = useRef(0)

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    setPosition(computePreviewPosition(trigger))
  }, [])

  const closePreview = useCallback(() => {
    setOpen(false)
    setLoading(false)
    setImageFailed(false)
    requestIdRef.current += 1
  }, [])

  const openPreview = useCallback(() => {
    if (!exists) return
    const requestId = requestIdRef.current + 1
    updatePosition()
    setOpen(true)
    setLoading(true)
    setImageUrl(null)
    setImageFailed(false)

    void fetchMasterStaffEvidence(staffRowId)
      .then((detail) => {
        if (requestIdRef.current !== requestId) return
        const url = kind === "ph" ? detail.photoUrl : detail.idCardUrl
        setImageUrl(url)
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return
        setImageFailed(true)
      })
      .finally(() => {
        if (requestIdRef.current !== requestId) return
        setLoading(false)
      })
  }, [exists, kind, staffRowId, updatePosition])

  useEffect(() => {
    if (!open) return
    const onScroll = () => updatePosition()
    window.addEventListener("scroll", onScroll, true)
    window.addEventListener("resize", onScroll)
    return () => {
      window.removeEventListener("scroll", onScroll, true)
      window.removeEventListener("resize", onScroll)
    }
  }, [open, updatePosition])

  return (
    <>
      <span
        ref={triggerRef}
        role="img"
        className={circleClassName(kind, exists)}
        data-testid={`staff-evidence-dot-${kind}`}
        data-evidence-present={exists ? "true" : "false"}
        title={tooltip}
        tabIndex={exists ? 0 : -1}
        onMouseEnter={openPreview}
        onMouseLeave={closePreview}
        onFocus={openPreview}
        onBlur={(event: FocusEvent<HTMLSpanElement>) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            closePreview()
          }
        }}
        aria-label={
          exists
            ? `${tooltip} uploaded for ${staffCode}`
            : `${tooltip} missing for ${staffCode}`
        }
      />
      {open && typeof document !== "undefined"
        ? createPortal(
            <StaffEvidenceImageHoverPreview
              kind={kind}
              staffId={staffCode}
              top={position.top}
              left={position.left}
              loading={loading}
              imageUrl={imageUrl}
              imageFailed={imageFailed}
              onImageError={() => setImageFailed(true)}
            />,
            document.body
          )
        : null}
    </>
  )
}

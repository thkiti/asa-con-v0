"use client"

import { useEffect, useRef, useState } from "react"
import { StaffEvidenceMobileQrPanel } from "@/components/pos/StaffEvidenceMobileQrPanel"
import {
  fetchMasterStaffEvidenceMobileLink,
  fetchMasterStaffEvidenceMobileStatus,
} from "@/lib/master-ui/staff-evidence-mobile-client"
import type { StaffEvidenceFileKind } from "@/lib/pos/staff-evidence-blob"
import {
  processStaffEvidenceFileForKind,
  rotateStaffEvidenceImageForUpload,
  STAFF_EVIDENCE_UPLOAD_DIALOG_ID_PREVIEW_CLASS,
  STAFF_EVIDENCE_UPLOAD_DIALOG_PHOTO_PREVIEW_CLASS,
} from "@/lib/pos-ui/staff-evidence-image"
import { themeBtnPrimary, themeBtnSecondary, themeMuted } from "@/lib/theme/theme-classes"

type StaffEvidenceUploadDialogProps = {
  open: boolean
  staffRowId: string
  pending?: boolean
  error?: string | null
  onClose: () => void
  onConfirm: (input: { photo: Blob; idCard: Blob }) => void
}

type MobilePick = {
  kind: StaffEvidenceFileKind
  token: string
  uploadUrl: string | null
  expiresAt: string | null
  linkLoading: boolean
  linkError: string | null
}

function pickImageFile(file: File): File {
  return new File([file], file.name, {
    type: file.type || "image/jpeg",
    lastModified: file.lastModified,
  })
}

function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type || "image/jpeg" })
}

function RotateIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  )
}

function RotateIconButton({
  disabled,
  spinning,
  onClick,
  testId,
}: {
  disabled: boolean
  spinning: boolean
  onClick: () => void
  testId: string
}) {
  return (
    <button
      type="button"
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-background text-foreground disabled:opacity-50"
      disabled={disabled}
      onClick={onClick}
      aria-label={spinning ? "Rotating" : "Rotate"}
      data-testid={testId}
    >
      <RotateIcon className={`h-4 w-4${spinning ? " animate-spin" : ""}`} />
    </button>
  )
}

export function StaffEvidenceUploadDialog({
  open,
  staffRowId,
  pending = false,
  error,
  onClose,
  onConfirm,
}: StaffEvidenceUploadDialogProps) {
  const photoInputRef = useRef<HTMLInputElement>(null)
  const idInputRef = useRef<HTMLInputElement>(null)

  const [staffPhoto, setStaffPhoto] = useState<File | null>(null)
  const [idCardPhoto, setIdCardPhoto] = useState<File | null>(null)
  const [staffPreviewUrl, setStaffPreviewUrl] = useState<string | null>(null)
  const [idPreviewUrl, setIdPreviewUrl] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [rotating, setRotating] = useState<"ph" | "id" | null>(null)
  const [mobilePick, setMobilePick] = useState<MobilePick | null>(null)

  useEffect(() => {
    if (!open) {
      setStaffPhoto(null)
      setIdCardPhoto(null)
      setLocalError(null)
      setProcessing(false)
      setRotating(null)
      setMobilePick(null)
    }
  }, [open])

  useEffect(() => {
    if (!staffPhoto) {
      setStaffPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(staffPhoto)
    setStaffPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [staffPhoto])

  useEffect(() => {
    if (!idCardPhoto) {
      setIdPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(idCardPhoto)
    setIdPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [idCardPhoto])

  useEffect(() => {
    if (!open || !mobilePick?.token || mobilePick.linkLoading) return

    let cancelled = false
    const pollToken = mobilePick.token
    const pollKind = mobilePick.kind

    const applyMobileBlob = async (raw: Blob) => {
      const filename = pollKind === "ph" ? "mobile-photo.jpg" : "mobile-id.jpg"
      const processed = await processStaffEvidenceFileForKind(blobToFile(raw, filename), pollKind)
      const finalFile = blobToFile(
        processed,
        pollKind === "ph" ? "staff-photo.jpg" : "staff-id.jpg"
      )
      if (pollKind === "ph") {
        setStaffPhoto(finalFile)
      } else {
        setIdCardPhoto(finalFile)
      }
      setMobilePick(null)
    }

    const poll = async () => {
      const status = await fetchMasterStaffEvidenceMobileStatus(staffRowId, pollToken)
      if (cancelled || !status.ok || !status.ready || !status.blobUrl) return false

      setProcessing(true)
      setLocalError(null)
      try {
        const response = await fetch(status.blobUrl, { cache: "no-store" })
        if (!response.ok) throw new Error("download failed")
        const raw = await response.blob()
        await applyMobileBlob(raw)
        return true
      } catch {
        setLocalError("Mobile upload receive failed")
        return false
      } finally {
        if (!cancelled) setProcessing(false)
      }
    }

    const intervalId = window.setInterval(() => {
      void poll().then((done) => {
        if (done) window.clearInterval(intervalId)
      })
    }, 2000)

    void poll()

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [open, mobilePick?.token, mobilePick?.linkLoading, mobilePick?.kind, staffRowId])

  if (!open) return null

  const uploadPending = pending
  const confirmBlocked =
    uploadPending ||
    processing ||
    rotating !== null ||
    Boolean(mobilePick?.linkLoading)

  function columnBusy(kind: StaffEvidenceFileKind) {
    return (
      uploadPending ||
      processing ||
      Boolean(mobilePick?.kind === kind && mobilePick.linkLoading)
    )
  }

  const canConfirm = Boolean(staffPhoto && idCardPhoto) && !confirmBlocked
  const displayError = localError ?? error

  async function handlePhotoPick(file: File) {
    setProcessing(true)
    setLocalError(null)
    setMobilePick(null)
    try {
      const processed = await processStaffEvidenceFileForKind(pickImageFile(file), "ph")
      setStaffPhoto(blobToFile(processed, "staff-photo.jpg"))
    } catch {
      setLocalError("Staff photo processing failed")
    } finally {
      setProcessing(false)
    }
  }

  async function handleIdPick(file: File) {
    setProcessing(true)
    setLocalError(null)
    setMobilePick(null)
    try {
      const processed = await processStaffEvidenceFileForKind(pickImageFile(file), "id")
      setIdCardPhoto(blobToFile(processed, "staff-id.jpg"))
    } catch {
      setLocalError("ID card processing failed")
    } finally {
      setProcessing(false)
    }
  }

  async function startMobilePick(kind: StaffEvidenceFileKind) {
    setLocalError(null)
    setMobilePick({
      kind,
      token: "",
      uploadUrl: null,
      expiresAt: null,
      linkLoading: true,
      linkError: null,
    })

    try {
      const result = await fetchMasterStaffEvidenceMobileLink(staffRowId, { kind })
      if (!result.ok) {
        setMobilePick({
          kind,
          token: "",
          uploadUrl: null,
          expiresAt: null,
          linkLoading: false,
          linkError: result.error,
        })
        setLocalError(result.error)
        return
      }

      setMobilePick({
        kind,
        token: result.token,
        uploadUrl: result.uploadUrl,
        expiresAt: result.expiresAt,
        linkLoading: false,
        linkError: null,
      })
    } catch {
      const message = "Failed to create mobile upload link"
      setMobilePick({
        kind,
        token: "",
        uploadUrl: null,
        expiresAt: null,
        linkLoading: false,
        linkError: message,
      })
      setLocalError(message)
    }
  }

  async function handleRotate(kind: "ph" | "id") {
    const current = kind === "ph" ? staffPhoto : idCardPhoto
    if (!current) return
    setRotating(kind)
    setLocalError(null)
    try {
      const rotated = await rotateStaffEvidenceImageForUpload(current)
      const filename = kind === "ph" ? "staff-photo.jpg" : "staff-id.jpg"
      const file = blobToFile(rotated, filename)
      if (kind === "ph") {
        setStaffPhoto(file)
      } else {
        setIdCardPhoto(file)
      }
    } catch {
      setLocalError("Rotate failed")
    } finally {
      setRotating(null)
    }
  }

  function handleConfirm() {
    if (!staffPhoto || !idCardPhoto) {
      setLocalError("Select both Staff Photo and ID Card")
      return
    }
    setLocalError(null)
    onConfirm({ photo: staffPhoto, idCard: idCardPhoto })
  }

  function renderColumn(kind: StaffEvidenceFileKind) {
    const isPhoto = kind === "ph"
    const label = isPhoto ? "Staff Photo" : "ID Card"
    const file = isPhoto ? staffPhoto : idCardPhoto
    const previewUrl = isPhoto ? staffPreviewUrl : idPreviewUrl
    const inputRef = isPhoto ? photoInputRef : idInputRef
    const onPick = isPhoto ? handlePhotoPick : handleIdPick
    const previewClass = isPhoto
      ? STAFF_EVIDENCE_UPLOAD_DIALOG_PHOTO_PREVIEW_CLASS
      : STAFF_EVIDENCE_UPLOAD_DIALOG_ID_PREVIEW_CLASS
    const mobileActive = mobilePick?.kind === kind
    const otherMobileActive = mobilePick !== null && mobilePick.kind !== kind

    return (
      <div className="flex min-w-0 flex-col gap-2">
        <span className="text-sm font-medium">{label}</span>
        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              const picked = event.target.files?.[0]
              event.currentTarget.value = ""
              if (!picked) return
              void onPick(picked)
            }}
          />
          <button
            type="button"
            className={themeBtnSecondary}
            disabled={columnBusy(kind) || otherMobileActive}
            onClick={() => inputRef.current?.click()}
            data-testid={isPhoto ? "staff-evidence-pick-photo-local" : "staff-evidence-pick-id-local"}
          >
            Local PC
          </button>
          <button
            type="button"
            className={themeBtnSecondary}
            disabled={columnBusy(kind) || otherMobileActive}
            onClick={() => void startMobilePick(kind)}
            data-testid={isPhoto ? "staff-evidence-pick-photo-mobile" : "staff-evidence-pick-id-mobile"}
          >
            Mobile
          </button>
          <RotateIconButton
            disabled={confirmBlocked || !file}
            spinning={rotating === kind}
            onClick={() => void handleRotate(kind)}
            testId={isPhoto ? "staff-evidence-rotate-photo" : "staff-evidence-rotate-id"}
          />
        </div>

        {mobileActive && mobilePick ? (
          <StaffEvidenceMobileQrPanel
            label={label}
            loading={mobilePick.linkLoading}
            error={mobilePick.linkError}
            uploadUrl={mobilePick.uploadUrl}
            expiresAt={mobilePick.expiresAt}
            onClose={() => setMobilePick(null)}
          />
        ) : null}

        <div
          className={`flex min-h-[220px] items-center justify-center${isPhoto ? "" : " w-full"}`}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt={`${label} preview`}
              className={previewClass}
              data-testid={isPhoto ? "staff-evidence-photo-preview" : "staff-evidence-id-preview"}
            />
          ) : (
            <div
              className={`rounded border border-dashed border-border bg-muted/30${
                isPhoto ? "h-[220px] w-[165px]" : "h-[139px] w-full max-w-[360px]"
              }`}
              aria-hidden="true"
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="staff-evidence-upload-title"
      data-testid="staff-evidence-upload-dialog"
    >
      <div className="w-full max-w-3xl rounded-lg border border-border bg-card p-4 text-card-foreground shadow-lg">
        <h2 id="staff-evidence-upload-title" className="text-base font-semibold">
          Upload staff evidence
        </h2>
        <p className={`mt-1 text-xs ${themeMuted}`}>
          Pick both images from Local PC or Mobile, then confirm once.
        </p>

        <div className="mt-3 grid grid-cols-2 gap-4">
          {renderColumn("ph")}
          {renderColumn("id")}
        </div>

        {displayError ? (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {displayError}
          </p>
        ) : null}

        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} disabled={confirmBlocked} className={themeBtnSecondary}>
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!canConfirm}
            className={themeBtnPrimary}
            data-testid="staff-evidence-upload-confirm"
          >
            {uploadPending ? "Uploading…" : "Confirm Upload"}
          </button>
        </div>
      </div>
    </div>
  )
}

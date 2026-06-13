"use client"

import { useEffect, useRef, useState } from "react"
import {
  captureVideoFrame,
  startCameraStream,
  stopMediaStream,
  type CameraFacingMode,
} from "@/lib/pos-ui/capture-video-frame"
import { processIdCardForUpload } from "@/lib/pos-ui/id-card-image-enhance"
import { submitStaffEvidenceCapture } from "@/lib/pos-ui/staff-evidence-client"
import {
  fetchStaffEvidenceMobileLink,
  fetchStaffEvidenceMobileStatus,
} from "@/lib/pos-ui/staff-evidence-mobile-client"
import {
  STAFF_CONFIRM_BODY_CLASS,
  STAFF_CONFIRM_FOOTER_CLASS,
  STAFF_CONFIRM_ID_PREVIEW_CLASS,
  STAFF_CONFIRM_MODAL_PANEL_CLASS,
  STAFF_CONFIRM_PHOTO_PREVIEW_CLASS,
  STAFF_CONFIRM_PREVIEW_ROW_CLASS,
  STAFF_EVIDENCE_UPLOAD_WARNING,
  STAFF_ID_CARD_PREVIEW_IMAGE_CLASS,
  STAFF_ID_SCAN_HELPER_TEXT,
  STAFF_PHOTO_PREVIEW_IMAGE_CLASS,
  STAFF_WEBCAM_ID_OVERLAY_CLASS,
  STAFF_WEBCAM_PORTRAIT_OVERLAY_CLASS,
  STAFF_WEBCAM_VIDEO_WRAPPER_CLASS,
  resizeStaffPhotoForUpload,
  rotateStaffEvidenceImageForUpload,
} from "@/lib/pos-ui/staff-evidence-image"
import type { StaffEvidenceFileKind } from "@/lib/pos/staff-evidence-blob"
import type { PosTerminalSession } from "@/lib/pos-ui/types"
import { StaffEvidenceMobileQrPanel } from "./StaffEvidenceMobileQrPanel"

type WizardStep = 1 | 2 | 3

type CaptureView = "live" | "preview" | "qr"

type StaffEvidenceDraft = {
  staffPhoto: File | null
  idCardPhoto: File | null
}

type PosStaffEvidenceOverlayProps = {
  session: PosTerminalSession
  onClose: () => void
  onEvidenceComplete: () => void
}

function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type || "image/jpeg" })
}

function stepInstruction(wizardStep: WizardStep, uploading: boolean, success: boolean): string {
  if (success) return "บันทึกประวัติพนักงานสำเร็จ"
  if (uploading) return "กำลังอัปโหลด…"
  switch (wizardStep) {
    case 1:
      return "Step 1/3 — ถ่ายรูปพนักงาน"
    case 2:
      return "Step 2/3 — สแกนบัตรประชาชน"
    case 3:
      return "Step 3/3 — ยืนยันอัปโหลด"
    default:
      return ""
  }
}

function currentKind(wizardStep: WizardStep): StaffEvidenceFileKind {
  return wizardStep === 1 ? "ph" : "id"
}

function webcamFacing(wizardStep: WizardStep): CameraFacingMode {
  return wizardStep === 1 ? "user" : "environment"
}

export function PosStaffEvidenceOverlay({
  session,
  onClose,
  onEvidenceComplete,
}: PosStaffEvidenceOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const staffPreviewUrlRef = useRef<string | null>(null)
  const idPreviewUrlRef = useRef<string | null>(null)

  const [wizardStep, setWizardStep] = useState<WizardStep>(1)
  const [captureView, setCaptureView] = useState<CaptureView>("live")
  const [draft, setDraft] = useState<StaffEvidenceDraft>({
    staffPhoto: null,
    idCardPhoto: null,
  })
  const [staffPreviewUrl, setStaffPreviewUrl] = useState<string | null>(null)
  const [idPreviewUrl, setIdPreviewUrl] = useState<string | null>(null)
  const [uploadToken, setUploadToken] = useState<string | null>(null)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [uploadExpiresAt, setUploadExpiresAt] = useState<string | null>(null)
  const [uploadLinkLoading, setUploadLinkLoading] = useState(false)
  const [uploadLinkError, setUploadLinkError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)

  staffPreviewUrlRef.current = staffPreviewUrl
  idPreviewUrlRef.current = idPreviewUrl

  useEffect(() => {
    return () => {
      stopMediaStream(streamRef.current)
      streamRef.current = null
      if (staffPreviewUrlRef.current) URL.revokeObjectURL(staffPreviewUrlRef.current)
      if (idPreviewUrlRef.current) URL.revokeObjectURL(idPreviewUrlRef.current)
    }
  }, [])

  useEffect(() => {
    const useWebcam =
      (wizardStep === 1 || wizardStep === 2) && captureView === "live"
    if (!useWebcam) {
      stopMediaStream(streamRef.current)
      streamRef.current = null
      const video = videoRef.current
      if (video) video.srcObject = null
      return
    }

    let cancelled = false
    setCameraError(null)
    void (async () => {
      const stream = await startCameraStream(videoRef.current, webcamFacing(wizardStep))
      if (cancelled) {
        stopMediaStream(stream)
        return
      }
      if (!stream) {
        setCameraError("เปิดกล้องไม่ได้ — ตรวจสอบสิทธิ์กล้อง")
        return
      }
      streamRef.current = stream
    })()

    return () => {
      cancelled = true
      stopMediaStream(streamRef.current)
      streamRef.current = null
      const video = videoRef.current
      if (video) video.srcObject = null
    }
  }, [wizardStep, captureView])

  useEffect(() => {
    if (captureView !== "qr" || !uploadToken) return
    if (wizardStep !== 1 && wizardStep !== 2) return

    let cancelled = false
    const poll = async () => {
      const status = await fetchStaffEvidenceMobileStatus(uploadToken)
      if (cancelled || !status.ok || !status.ready || !status.blobUrl) return false

      setProcessing(true)
      setError(null)
      try {
        const response = await fetch(status.blobUrl, { cache: "no-store" })
        if (!response.ok) throw new Error("download failed")
        const raw = await response.blob()
        if (wizardStep === 1) {
          await applyPhotoBlob(raw)
        } else {
          await applyIdBlob(raw)
        }
        clearQrState()
        return true
      } catch {
        setError("รับไฟล์จากมือถือไม่สำเร็จ")
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
  }, [captureView, uploadToken, wizardStep])

  function clearQrState() {
    setUploadToken(null)
    setUploadUrl(null)
    setUploadExpiresAt(null)
    setUploadLinkLoading(false)
    setUploadLinkError(null)
  }

  function resetQrToLive() {
    clearQrState()
    setCaptureView("live")
  }

  function revokeStaffPreview() {
    if (staffPreviewUrl) URL.revokeObjectURL(staffPreviewUrl)
    setStaffPreviewUrl(null)
  }

  function revokeIdPreview() {
    if (idPreviewUrl) URL.revokeObjectURL(idPreviewUrl)
    setIdPreviewUrl(null)
  }

  function setStaffPreviewFromFile(file: File) {
    revokeStaffPreview()
    setStaffPreviewUrl(URL.createObjectURL(file))
  }

  function setIdPreviewFromFile(file: File) {
    revokeIdPreview()
    setIdPreviewUrl(URL.createObjectURL(file))
  }

  function syncConfirmPreviewUrls(staffPhoto: File, idCardPhoto: File) {
    setStaffPreviewFromFile(staffPhoto)
    setIdPreviewFromFile(idCardPhoto)
  }

  async function applyPhotoBlob(blob: Blob) {
    const processed = await resizeStaffPhotoForUpload(blob)
    const file = blobToFile(processed, "staff-photo.jpg")
    setDraft((prev) => ({ ...prev, staffPhoto: file }))
    setStaffPreviewFromFile(file)
    setCaptureView("preview")
  }

  async function applyIdBlob(blob: Blob) {
    const processed = await processIdCardForUpload(blob)
    const file = blobToFile(processed, "staff-id.jpg")
    setDraft((prev) => ({ ...prev, idCardPhoto: file }))
    setIdPreviewFromFile(file)
    setCaptureView("preview")
  }

  async function startUploadFlow() {
    setError(null)
    setUploadLinkError(null)
    setUploadLinkLoading(true)
    const kind = currentKind(wizardStep)
    const result = await fetchStaffEvidenceMobileLink({ kind })
    setUploadLinkLoading(false)
    if (!result.ok) {
      setUploadLinkError(result.error)
      setError(result.error)
      return
    }
    setUploadToken(result.token)
    setUploadUrl(result.uploadUrl)
    setUploadExpiresAt(result.expiresAt)
    setCaptureView("qr")
  }

  async function handleWebcamCapture() {
    setProcessing(true)
    setError(null)
    setCameraError(null)
    try {
      const raw = await captureVideoFrame(videoRef.current, { quality: 0.92 })
      if (!raw) {
        setCameraError("ถ่ายภาพไม่สำเร็จ — รอให้กล้องพร้อมแล้วลองอีกครั้ง")
        return
      }
      if (wizardStep === 1) {
        await applyPhotoBlob(raw)
      } else {
        await applyIdBlob(raw)
      }
    } catch {
      setError(wizardStep === 1 ? "ประมวลผลรูปไม่สำเร็จ" : "ประมวลผลบัตรไม่สำเร็จ")
    } finally {
      setProcessing(false)
    }
  }

  function handleRetake() {
    setError(null)
    clearQrState()
    if (wizardStep === 1) {
      revokeStaffPreview()
      setDraft((prev) => ({ ...prev, staffPhoto: null }))
    } else {
      revokeIdPreview()
      setDraft((prev) => ({ ...prev, idCardPhoto: null }))
    }
    setCaptureView("live")
  }

  async function handleRotate() {
    const currentFile = wizardStep === 1 ? draft.staffPhoto : draft.idCardPhoto
    if (!currentFile) return
    setProcessing(true)
    setError(null)
    try {
      const rotated = await rotateStaffEvidenceImageForUpload(currentFile)
      const filename = wizardStep === 1 ? "staff-photo.jpg" : "staff-id.jpg"
      const file = blobToFile(rotated, filename)
      if (wizardStep === 1) {
        revokeStaffPreview()
        setDraft((prev) => ({ ...prev, staffPhoto: file }))
        setStaffPreviewFromFile(file)
      } else {
        revokeIdPreview()
        setDraft((prev) => ({ ...prev, idCardPhoto: file }))
        setIdPreviewFromFile(file)
      }
    } catch {
      setError("หมุนรูปไม่สำเร็จ")
    } finally {
      setProcessing(false)
    }
  }

  function handleNext() {
    if (processing) return
    if (wizardStep === 1) {
      if (!draft.staffPhoto) return
      clearQrState()
      setWizardStep(2)
      setCaptureView(draft.idCardPhoto ? "preview" : "live")
      return
    }
    if (wizardStep === 2) {
      if (!draft.staffPhoto || !draft.idCardPhoto) return
      clearQrState()
      syncConfirmPreviewUrls(draft.staffPhoto, draft.idCardPhoto)
      setWizardStep(3)
    }
  }

  function handleBackFromConfirm() {
    setWizardStep(2)
    setCaptureView(draft.idCardPhoto ? "preview" : "live")
  }

  function handleRetakeStaffPhoto() {
    clearQrState()
    revokeStaffPreview()
    setDraft((prev) => ({ ...prev, staffPhoto: null }))
    setWizardStep(1)
    setCaptureView("live")
  }

  function handleRetakeIdCardPhoto() {
    clearQrState()
    revokeIdPreview()
    setDraft((prev) => ({ ...prev, idCardPhoto: null }))
    setWizardStep(2)
    setCaptureView("live")
  }

  async function handleConfirmUpload() {
    if (!draft.staffPhoto || !draft.idCardPhoto) return
    setUploading(true)
    setError(null)
    try {
      await submitStaffEvidenceCapture({
        photo: draft.staffPhoto,
        idCard: draft.idCardPhoto,
      })
      setSuccess(true)
      window.setTimeout(() => {
        onEvidenceComplete()
        onClose()
      }, 1500)
    } catch (err: unknown) {
      setUploading(false)
      setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ")
    }
  }

  const isCaptureStep = wizardStep === 1 || wizardStep === 2
  const showWebcam = isCaptureStep && captureView === "live"
  const showPreview = isCaptureStep && captureView === "preview"
  const showUploadQr = isCaptureStep && captureView === "qr"
  const isConfirm = wizardStep === 3

  const currentPreviewUrl = wizardStep === 1 ? staffPreviewUrl : idPreviewUrl

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4"
      data-testid="pos-staff-evidence-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={STAFF_CONFIRM_MODAL_PANEL_CLASS}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-staff-evidence-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={isConfirm ? STAFF_CONFIRM_BODY_CLASS : "p-4"}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="pos-staff-evidence-title" className="text-lg font-semibold">
                ทำประวัติพนักงาน
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                รหัส {session.staffId} • {session.name}
              </p>
            </div>
            <button
              type="button"
              className="rounded border border-zinc-300 px-3 py-1 text-sm"
              onClick={onClose}
              disabled={uploading || success}
            >
              ปิด
            </button>
          </div>

          <p className="mt-4 text-center text-base font-semibold" data-testid="pos-staff-evidence-step">
            {stepInstruction(wizardStep, uploading, success)}
          </p>

          {error ? (
            <p className="mt-2 text-center text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          {cameraError ? (
            <p
              className="mt-2 text-center text-sm text-red-700"
              role="alert"
              data-testid="pos-staff-evidence-camera-error"
            >
              {cameraError}
            </p>
          ) : null}

          {success ? (
            <p
              className="mt-6 text-center text-sm font-medium text-emerald-700"
              data-testid="pos-staff-evidence-success"
            >
              บันทึกประวัติพนักงานสำเร็จ
            </p>
          ) : isConfirm && !uploading ? (
            <div className="mt-4 space-y-3" data-testid="pos-staff-evidence-upload-warning">
              <p className="text-center text-sm font-medium text-amber-800">
                {STAFF_EVIDENCE_UPLOAD_WARNING}
              </p>
              <div className={STAFF_CONFIRM_PREVIEW_ROW_CLASS}>
                {staffPreviewUrl ? (
                  <img
                    src={staffPreviewUrl}
                    alt="Staff photo preview"
                    className={STAFF_CONFIRM_PHOTO_PREVIEW_CLASS}
                    data-testid="pos-staff-evidence-preview-photo"
                  />
                ) : null}
                {idPreviewUrl ? (
                  <img
                    src={idPreviewUrl}
                    alt="ID card preview"
                    className={STAFF_CONFIRM_ID_PREVIEW_CLASS}
                    data-testid="pos-staff-evidence-preview-id"
                  />
                ) : null}
              </div>
            </div>
          ) : isConfirm && uploading ? (
            <p className="mt-6 text-center text-sm text-zinc-600">กำลังอัปโหลด…</p>
          ) : showWebcam ? (
            <div className="mt-4 space-y-2">
              <div className={STAFF_WEBCAM_VIDEO_WRAPPER_CLASS} data-testid="pos-staff-evidence-webcam">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 h-full w-full object-cover"
                  data-testid="pos-staff-evidence-webcam-video"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div
                    className={
                      wizardStep === 1
                        ? STAFF_WEBCAM_PORTRAIT_OVERLAY_CLASS
                        : STAFF_WEBCAM_ID_OVERLAY_CLASS
                    }
                    data-testid={
                      wizardStep === 1
                        ? "pos-staff-evidence-portrait-frame"
                        : "pos-staff-evidence-id-frame"
                    }
                  />
                </div>
              </div>
              {wizardStep === 2 ? (
                <p className="text-center text-xs text-zinc-600">{STAFF_ID_SCAN_HELPER_TEXT}</p>
              ) : null}
            </div>
          ) : showPreview && currentPreviewUrl ? (
            <div className="mt-4 flex justify-center">
              <img
                src={currentPreviewUrl}
                alt={wizardStep === 1 ? "Staff photo preview" : "ID card preview"}
                className={
                  wizardStep === 1
                    ? STAFF_PHOTO_PREVIEW_IMAGE_CLASS
                    : STAFF_ID_CARD_PREVIEW_IMAGE_CLASS
                }
                data-testid="pos-staff-evidence-preview-image"
              />
            </div>
          ) : null}

          {showUploadQr ? (
            <StaffEvidenceMobileQrPanel
              label={currentKind(wizardStep) === "ph" ? "Staff Photo" : "ID Card"}
              loading={uploadLinkLoading}
              error={uploadLinkError}
              uploadUrl={uploadUrl}
              expiresAt={uploadExpiresAt}
              onClose={resetQrToLive}
            />
          ) : null}

          {isCaptureStep && !success ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {captureView === "live" ? (
                <>
                  <button
                    type="button"
                    className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    onClick={() => void handleWebcamCapture()}
                    disabled={processing || Boolean(cameraError)}
                    data-testid="pos-staff-evidence-webcam-capture"
                  >
                    {processing ? "กำลังประมวลผล…" : "ถ่ายรูป"}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-60"
                    onClick={() => void startUploadFlow()}
                    disabled={uploadLinkLoading || processing}
                    data-testid="pos-staff-evidence-upload-start"
                  >
                    Upload from Mobile
                  </button>
                </>
              ) : null}

              {captureView === "preview" ? (
                <>
                  <button
                    type="button"
                    className="rounded border border-zinc-300 px-4 py-2 text-sm"
                    onClick={() => void handleRotate()}
                    disabled={processing}
                    data-testid="pos-staff-evidence-rotate"
                  >
                    {processing ? "กำลังประมวลผล…" : "Rotate"}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-zinc-300 px-4 py-2 text-sm"
                    onClick={handleRetake}
                    disabled={processing}
                    data-testid="pos-staff-evidence-retake"
                  >
                    ถ่ายใหม่
                  </button>
                  <button
                    type="button"
                    className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    onClick={handleNext}
                    disabled={processing}
                    data-testid="pos-staff-evidence-next"
                  >
                    ถัดไป
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        {isConfirm && !success ? (
          <div className={STAFF_CONFIRM_FOOTER_CLASS}>
            {!uploading ? (
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  className="rounded border border-zinc-300 px-4 py-2 text-sm"
                  onClick={handleBackFromConfirm}
                  data-testid="pos-staff-evidence-back"
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  className="rounded border border-zinc-300 px-4 py-2 text-sm"
                  onClick={handleRetakeStaffPhoto}
                  data-testid="pos-staff-evidence-retake-staff"
                >
                  Retake Staff Photo
                </button>
                <button
                  type="button"
                  className="rounded border border-zinc-300 px-4 py-2 text-sm"
                  onClick={handleRetakeIdCardPhoto}
                  data-testid="pos-staff-evidence-retake-id"
                >
                  Retake ID Card Photo
                </button>
                <button
                  type="button"
                  className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  onClick={() => void handleConfirmUpload()}
                  disabled={!draft.staffPhoto || !draft.idCardPhoto || processing || uploading}
                  data-testid="pos-staff-evidence-upload"
                >
                  Confirm & Upload
                </button>
              </div>
            ) : (
              <p className="text-center text-sm text-zinc-600">กำลังอัปโหลด…</p>
            )}
          </div>
        ) : null}

        <p
          className="shrink-0 px-4 pb-3 text-center text-xs text-zinc-400"
          data-testid="pos-staff-evidence-version"
        >
          Staff Evidence Phase 1
        </p>
      </div>
    </div>
  )
}

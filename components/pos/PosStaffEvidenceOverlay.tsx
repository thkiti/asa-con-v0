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
  STAFF_ID_SCAN_FRAME_CLASS,
  STAFF_ID_SCAN_HELPER_TEXT,
  STAFF_PHOTO_FRAME_CLASS,
  STAFF_WEBCAM_ID_OVERLAY_CLASS,
  STAFF_WEBCAM_PORTRAIT_OVERLAY_CLASS,
  STAFF_WEBCAM_VIDEO_WRAPPER_CLASS,
  resizeStaffPhotoForUpload,
} from "@/lib/pos-ui/staff-evidence-image"
import type { StaffEvidenceFileKind } from "@/lib/pos/staff-evidence-blob"
import type { PosTerminalSession } from "@/lib/pos-ui/types"
import { StaffEvidenceMobileQrPanel } from "./StaffEvidenceMobileQrPanel"

type CaptureStep =
  | "photo"
  | "photo-preview"
  | "id"
  | "id-preview"
  | "confirm-upload"
  | "uploading"

type InteractionMode = "idle" | "webcam" | "upload"

type PosStaffEvidenceOverlayProps = {
  session: PosTerminalSession
  onClose: () => void
  onEvidenceComplete: () => void
}

function stepInstruction(step: CaptureStep): string {
  switch (step) {
    case "photo":
    case "photo-preview":
      return "ถ่ายรูปพนักงาน"
    case "id":
    case "id-preview":
      return "สแกนบัตรประชาชน"
    case "confirm-upload":
      return "ยืนยันอัปโหลด"
    case "uploading":
      return "กำลังอัปโหลด…"
    default:
      return ""
  }
}

function currentKind(step: CaptureStep): StaffEvidenceFileKind {
  return step === "photo" || step === "photo-preview" ? "ph" : "id"
}

function webcamFacing(step: CaptureStep): CameraFacingMode {
  return step === "photo" ? "user" : "environment"
}

export function PosStaffEvidenceOverlay({
  session,
  onClose,
  onEvidenceComplete,
}: PosStaffEvidenceOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [step, setStep] = useState<CaptureStep>("photo")
  const [interaction, setInteraction] = useState<InteractionMode>("idle")
  const [uploadToken, setUploadToken] = useState<string | null>(null)
  const [uploadUrl, setUploadUrl] = useState<string | null>(null)
  const [uploadExpiresAt, setUploadExpiresAt] = useState<string | null>(null)
  const [uploadLinkLoading, setUploadLinkLoading] = useState(false)
  const [uploadLinkError, setUploadLinkError] = useState<string | null>(null)
  const [faceBlob, setFaceBlob] = useState<Blob | null>(null)
  const [idBlob, setIdBlob] = useState<Blob | null>(null)
  const [facePreviewUrl, setFacePreviewUrl] = useState<string | null>(null)
  const [idPreviewUrl, setIdPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      stopMediaStream(streamRef.current)
      streamRef.current = null
      if (facePreviewUrl) URL.revokeObjectURL(facePreviewUrl)
      if (idPreviewUrl) URL.revokeObjectURL(idPreviewUrl)
    }
  }, [facePreviewUrl, idPreviewUrl])

  useEffect(() => {
    const useWebcam =
      interaction === "webcam" && (step === "photo" || step === "id")
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
      const stream = await startCameraStream(videoRef.current, webcamFacing(step))
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
  }, [interaction, step])

  useEffect(() => {
    if (interaction !== "upload" || !uploadToken) return
    if (step !== "photo" && step !== "id") return

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
        if (step === "photo") {
          await applyPhotoBlob(raw)
        } else {
          await applyIdBlob(raw)
        }
        setInteraction("idle")
        setUploadToken(null)
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
  }, [interaction, uploadToken, step])

  function revokeFacePreview() {
    if (facePreviewUrl) URL.revokeObjectURL(facePreviewUrl)
    setFacePreviewUrl(null)
  }

  function revokeIdPreview() {
    if (idPreviewUrl) URL.revokeObjectURL(idPreviewUrl)
    setIdPreviewUrl(null)
  }

  async function applyPhotoBlob(blob: Blob) {
    const processed = await resizeStaffPhotoForUpload(blob)
    revokeFacePreview()
    setFaceBlob(processed)
    setFacePreviewUrl(URL.createObjectURL(processed))
    setStep("photo-preview")
  }

  async function applyIdBlob(blob: Blob) {
    const processed = await processIdCardForUpload(blob)
    revokeIdPreview()
    setIdBlob(processed)
    setIdPreviewUrl(URL.createObjectURL(processed))
    setStep("id-preview")
  }

  function resetInteraction() {
    setInteraction("idle")
    setUploadToken(null)
    setUploadUrl(null)
    setUploadExpiresAt(null)
    setUploadLinkLoading(false)
    setUploadLinkError(null)
    setCameraError(null)
  }

  async function startUploadFlow() {
    setError(null)
    setUploadLinkError(null)
    setUploadLinkLoading(true)
    const kind = currentKind(step)
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
    setInteraction("upload")
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
      if (step === "photo") {
        await applyPhotoBlob(raw)
      } else {
        await applyIdBlob(raw)
      }
      resetInteraction()
    } catch {
      setError(step === "photo" ? "ประมวลผลรูปไม่สำเร็จ" : "ประมวลผลบัตรไม่สำเร็จ")
    } finally {
      setProcessing(false)
    }
  }

  function handleRetake() {
    setError(null)
    resetInteraction()
    if (step === "photo-preview") {
      revokeFacePreview()
      setFaceBlob(null)
      setStep("photo")
      return
    }
    if (step === "id-preview") {
      revokeIdPreview()
      setIdBlob(null)
      setStep("id")
    }
  }

  function handleConfirmPhoto() {
    if (!faceBlob) return
    resetInteraction()
    setStep("id")
  }

  function handleConfirmId() {
    if (!faceBlob || !idBlob) return
    resetInteraction()
    setStep("confirm-upload")
  }

  async function handleUpload() {
    if (!faceBlob || !idBlob) return
    setStep("uploading")
    setError(null)
    try {
      await submitStaffEvidenceCapture({ photo: faceBlob, idCard: idBlob })
      onEvidenceComplete()
      onClose()
    } catch (err: unknown) {
      setStep("confirm-upload")
      setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ")
    }
  }

  const isPhotoStep = step === "photo" || step === "photo-preview"
  const isIdStep = step === "id" || step === "id-preview"
  const showWebcam = interaction === "webcam" && (step === "photo" || step === "id")
  const showUploadQr = interaction === "upload" && (step === "photo" || step === "id")
  const isConfirm = step === "confirm-upload" || step === "uploading"

  const modalClass = isConfirm ? STAFF_CONFIRM_MODAL_PANEL_CLASS : STAFF_CONFIRM_MODAL_PANEL_CLASS

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4"
      data-testid="pos-staff-evidence-overlay"
      role="presentation"
      onClick={onClose}
    >
      <div
        className={modalClass}
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
              disabled={step === "uploading"}
            >
              ปิด
            </button>
          </div>

          <p className="mt-4 text-center text-base font-semibold" data-testid="pos-staff-evidence-step">
            {stepInstruction(step)}
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

          {step === "confirm-upload" ? (
            <div className="mt-4 space-y-3" data-testid="pos-staff-evidence-upload-warning">
              <p className="text-center text-sm font-medium text-amber-800">
                {STAFF_EVIDENCE_UPLOAD_WARNING}
              </p>
              <div className={STAFF_CONFIRM_PREVIEW_ROW_CLASS}>
                {facePreviewUrl ? (
                  <img
                    src={facePreviewUrl}
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
          ) : step === "uploading" ? (
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
                      step === "photo"
                        ? STAFF_WEBCAM_PORTRAIT_OVERLAY_CLASS
                        : STAFF_WEBCAM_ID_OVERLAY_CLASS
                    }
                    data-testid={
                      step === "photo"
                        ? "pos-staff-evidence-portrait-frame"
                        : "pos-staff-evidence-id-frame"
                    }
                  />
                </div>
              </div>
              {step === "id" ? (
                <p className="text-center text-xs text-zinc-600">{STAFF_ID_SCAN_HELPER_TEXT}</p>
              ) : null}
            </div>
          ) : isPhotoStep && step === "photo-preview" && facePreviewUrl ? (
            <div className="mt-4 flex justify-center">
              <img
                src={facePreviewUrl}
                alt="Staff photo preview"
                className="mx-auto max-h-[280px] max-w-[220px] object-contain aspect-[3/4]"
                data-testid="pos-staff-evidence-preview-image"
              />
            </div>
          ) : isIdStep && step === "id-preview" && idPreviewUrl ? (
            <div className="mt-4 flex justify-center">
              <img
                src={idPreviewUrl}
                alt="ID card preview"
                className="mx-auto max-h-[240px] max-w-[360px] object-contain aspect-[1.586/1]"
                data-testid="pos-staff-evidence-preview-image"
              />
            </div>
          ) : isPhotoStep && step === "photo" ? (
            <div className="mt-4">
              <div
                className={STAFF_PHOTO_FRAME_CLASS}
                data-testid="pos-staff-evidence-portrait-frame"
                aria-label="กรอบถ่ายรูปพนักงาน"
              />
            </div>
          ) : isIdStep && step === "id" ? (
            <div className="mt-4">
              <div className={STAFF_ID_SCAN_FRAME_CLASS} data-testid="pos-staff-evidence-id-frame">
                <p className="px-4 text-center text-sm text-zinc-200">{STAFF_ID_SCAN_HELPER_TEXT}</p>
              </div>
              <p className="mt-2 text-center text-xs text-zinc-600">{STAFF_ID_SCAN_HELPER_TEXT}</p>
            </div>
          ) : null}

          {showUploadQr ? (
            <StaffEvidenceMobileQrPanel
              label={currentKind(step) === "ph" ? "Staff Photo" : "ID Card"}
              loading={uploadLinkLoading}
              error={uploadLinkError}
              uploadUrl={uploadUrl}
              expiresAt={uploadExpiresAt}
              onClose={resetInteraction}
            />
          ) : null}

          {!isConfirm ? (
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {(step === "photo" || step === "id") && interaction === "idle" ? (
                <>
                  <button
                    type="button"
                    className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white"
                    onClick={() => {
                      setCameraError(null)
                      setInteraction("webcam")
                    }}
                    data-testid="pos-staff-evidence-webcam-start"
                  >
                    ถ่ายรูป
                  </button>
                  <button
                    type="button"
                    className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 disabled:opacity-60"
                    onClick={() => void startUploadFlow()}
                    disabled={uploadLinkLoading}
                    data-testid="pos-staff-evidence-upload-start"
                  >
                    Upload
                  </button>
                </>
              ) : null}

              {showWebcam ? (
                <>
                  <button
                    type="button"
                    className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                    onClick={() => void handleWebcamCapture()}
                    disabled={processing || Boolean(cameraError)}
                    data-testid="pos-staff-evidence-webcam-capture"
                  >
                    {processing ? "กำลังประมวลผล…" : "ถ่าย"}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-zinc-300 px-4 py-2 text-sm"
                    onClick={resetInteraction}
                  >
                    ยกเลิก
                  </button>
                </>
              ) : null}

              {step === "photo-preview" || step === "id-preview" ? (
                <>
                  <button
                    type="button"
                    className="rounded border border-zinc-300 px-4 py-2 text-sm"
                    onClick={handleRetake}
                    data-testid="pos-staff-evidence-retake"
                  >
                    ถ่ายใหม่
                  </button>
                  <button
                    type="button"
                    className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                    onClick={step === "photo-preview" ? handleConfirmPhoto : handleConfirmId}
                    data-testid="pos-staff-evidence-confirm"
                  >
                    ตกลง
                  </button>
                </>
              ) : null}
            </div>
          ) : null}
        </div>

        {isConfirm ? (
          <div className={STAFF_CONFIRM_FOOTER_CLASS}>
            {step === "confirm-upload" ? (
              <div className="flex flex-wrap justify-center gap-2">
                <button
                  type="button"
                  className="rounded border border-zinc-300 px-4 py-2 text-sm"
                  onClick={() => setStep("id-preview")}
                >
                  ย้อนกลับ
                </button>
                <button
                  type="button"
                  className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
                  onClick={() => void handleUpload()}
                  data-testid="pos-staff-evidence-upload"
                >
                  Upload
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

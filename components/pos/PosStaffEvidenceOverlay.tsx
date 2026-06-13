"use client"

import { useEffect, useRef, useState } from "react"
import {
  captureVideoFrame,
  startCameraStream,
  stopMediaStream,
  type CameraFacingMode,
} from "@/lib/pos-ui/capture-video-frame"
import { enhanceIdCardImage } from "@/lib/pos-ui/id-card-image-enhance"
import { submitStaffEvidenceCapture } from "@/lib/pos-ui/staff-evidence-client"
import type { PosTerminalSession } from "@/lib/pos-ui/types"

type CaptureStep = "face" | "face-preview" | "id" | "id-preview" | "uploading" | "success"

type PosStaffEvidenceOverlayProps = {
  session: PosTerminalSession
  onClose: () => void
  onEvidenceComplete: () => void
}

function stepInstruction(step: CaptureStep): string {
  switch (step) {
    case "face":
    case "face-preview":
      return "ถ่ายรูปพนักงาน"
    case "id":
    case "id-preview":
      return "ถ่ายบัตรประชาชน"
    case "uploading":
      return "กำลังอัปโหลด…"
    case "success":
      return "บันทึกประวัติเรียบร้อย"
    default:
      return ""
  }
}

function cameraFacingForStep(step: CaptureStep): CameraFacingMode {
  return step === "face" || step === "face-preview" ? "user" : "environment"
}

function cameraActiveStep(step: CaptureStep): boolean {
  return step === "face" || step === "id"
}

export function PosStaffEvidenceOverlay({
  session,
  onClose,
  onEvidenceComplete,
}: PosStaffEvidenceOverlayProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [step, setStep] = useState<CaptureStep>("face")
  const [faceBlob, setFaceBlob] = useState<Blob | null>(null)
  const [idBlob, setIdBlob] = useState<Blob | null>(null)
  const [facePreviewUrl, setFacePreviewUrl] = useState<string | null>(null)
  const [idPreviewUrl, setIdPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enhancingId, setEnhancingId] = useState(false)

  useEffect(() => {
    return () => {
      if (facePreviewUrl) URL.revokeObjectURL(facePreviewUrl)
      if (idPreviewUrl) URL.revokeObjectURL(idPreviewUrl)
    }
  }, [facePreviewUrl, idPreviewUrl])

  useEffect(() => {
    if (!cameraActiveStep(step)) {
      stopMediaStream(streamRef.current)
      streamRef.current = null
      const video = videoRef.current
      if (video) video.srcObject = null
      return
    }

    let cancelled = false
    ;(async () => {
      const stream = await startCameraStream(videoRef.current, cameraFacingForStep(step))
      if (cancelled) {
        stopMediaStream(stream)
        return
      }
      if (!stream) {
        setError("เปิดกล้องไม่สำเร็จ — ตรวจสอบสิทธิ์หรืออุปกรณ์กล้อง")
        return
      }
      streamRef.current = stream
      setError(null)
    })()

    return () => {
      cancelled = true
      stopMediaStream(streamRef.current)
      streamRef.current = null
      const video = videoRef.current
      if (video) video.srcObject = null
    }
  }, [step])

  const handleClose = () => {
    stopMediaStream(streamRef.current)
    streamRef.current = null
    onClose()
  }

  async function handleCapture() {
    setError(null)
    const blob = await captureVideoFrame(videoRef.current)
    if (!blob) {
      setError("รอให้ภาพจากกล้องพร้อมก่อน")
      return
    }

    if (step === "face") {
      if (facePreviewUrl) URL.revokeObjectURL(facePreviewUrl)
      setFaceBlob(blob)
      setFacePreviewUrl(URL.createObjectURL(blob))
      setStep("face-preview")
      return
    }

    if (step === "id") {
      setEnhancingId(true)
      try {
        const enhanced = await enhanceIdCardImage(blob)
        if (idPreviewUrl) URL.revokeObjectURL(idPreviewUrl)
        setIdBlob(enhanced)
        setIdPreviewUrl(URL.createObjectURL(enhanced))
        setStep("id-preview")
      } catch {
        if (idPreviewUrl) URL.revokeObjectURL(idPreviewUrl)
        setIdBlob(blob)
        setIdPreviewUrl(URL.createObjectURL(blob))
        setStep("id-preview")
      } finally {
        setEnhancingId(false)
      }
    }
  }

  function handleRetake() {
    setError(null)
    if (step === "face-preview") {
      if (facePreviewUrl) URL.revokeObjectURL(facePreviewUrl)
      setFaceBlob(null)
      setFacePreviewUrl(null)
      setStep("face")
      return
    }
    if (step === "id-preview") {
      if (idPreviewUrl) URL.revokeObjectURL(idPreviewUrl)
      setIdBlob(null)
      setIdPreviewUrl(null)
      setStep("id")
    }
  }

  function handleConfirmFace() {
    if (!faceBlob) return
    setStep("id")
  }

  async function handleConfirmId() {
    if (!faceBlob || !idBlob) return
    setStep("uploading")
    setError(null)
    try {
      await submitStaffEvidenceCapture({ photo: faceBlob, idCard: idBlob })
      setStep("success")
      onEvidenceComplete()
    } catch (err: unknown) {
      setStep("id-preview")
      setError(err instanceof Error ? err.message : "อัปโหลดไม่สำเร็จ")
    }
  }

  const previewUrl =
    step === "face-preview" ? facePreviewUrl : step === "id-preview" ? idPreviewUrl : null

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4"
      data-testid="pos-staff-evidence-overlay"
      role="presentation"
      onClick={handleClose}
    >
      <div
        className="flex w-full max-w-lg flex-col rounded-xl border border-zinc-300 bg-white p-4 text-zinc-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pos-staff-evidence-title"
        onClick={(event) => event.stopPropagation()}
      >
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
            onClick={handleClose}
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

        <div className="mt-4 flex min-h-[280px] items-center justify-center overflow-hidden rounded-lg border border-zinc-200 bg-zinc-950">
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="Captured preview"
              className="max-h-[360px] w-full object-contain"
              data-testid="pos-staff-evidence-preview-image"
            />
          ) : step === "success" ? (
            <p className="px-4 text-center text-sm text-emerald-700">
              อัปโหลด staff-evidence/{session.staffId}-ph.jpg และ -id.jpg เรียบร้อย
            </p>
          ) : step === "uploading" ? (
            <p className="px-4 text-center text-sm text-zinc-200">กำลังอัปโหลด…</p>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="max-h-[360px] w-full object-contain"
              data-testid="pos-staff-evidence-camera"
            />
          )}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {step === "face" || step === "id" ? (
            <button
              type="button"
              className="rounded bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              onClick={() => void handleCapture()}
              disabled={enhancingId}
              data-testid="pos-staff-evidence-capture"
            >
              ถ่ายภาพ
            </button>
          ) : null}

          {step === "face-preview" || step === "id-preview" ? (
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
                onClick={
                  step === "face-preview"
                    ? handleConfirmFace
                    : () => void handleConfirmId()
                }
                data-testid="pos-staff-evidence-confirm"
              >
                ตกลง
              </button>
            </>
          ) : null}

          {step === "success" ? (
            <button
              type="button"
              className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white"
              onClick={handleClose}
            >
              เสร็จสิ้น
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** Staff evidence image sizing — aligned with catalog hover preview philosophy. */
import type { StaffEvidenceFileKind } from "@/lib/pos/staff-evidence-blob"

export const STAFF_EVIDENCE_JPEG_QUALITY = 0.8

/** Max long edge (px) for staff photo and ID card uploads — same standard for all paths. */
export const STAFF_EVIDENCE_UPLOAD_MAX_LONG_EDGE = 360
export const STAFF_ID_CARD_ASPECT_RATIO = 1.586
export const STAFF_PHOTO_ASPECT_RATIO = 3 / 4

export const STAFF_PHOTO_PREVIEW_MAX_WIDTH = "280px"
export const STAFF_ID_CARD_PREVIEW_MAX_WIDTH = "400px"

export const STAFF_EVIDENCE_UPLOAD_WARNING =
  "Upload แล้วจะแก้ไขเองไม่ได้ หากรูปไม่ชัด HO จะลบไฟล์ให้ถ่ายใหม่"

export const STAFF_PHOTO_FRAME_CLASS =
  "mx-auto flex w-full max-w-[280px] aspect-[3/4] items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-zinc-400 bg-zinc-100"

export const STAFF_ID_SCAN_FRAME_CLASS =
  "mx-auto flex w-full max-w-[400px] aspect-[1.586/1] items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-sky-500/70 bg-zinc-900/90"

export const STAFF_PHOTO_PREVIEW_IMAGE_CLASS =
  "mx-auto max-h-[280px] max-w-[360px] object-contain"

export const STAFF_ID_CARD_PREVIEW_IMAGE_CLASS =
  "mx-auto max-h-[280px] max-w-[360px] object-contain"

/** Edit Staff upload dialog — portrait staff photo preview. */
export const STAFF_EVIDENCE_UPLOAD_DIALOG_PHOTO_PREVIEW_CLASS =
  "max-h-[220px] w-auto max-w-full rounded border border-border object-contain"

/** Edit Staff upload dialog — landscape ID card preview. */
export const STAFF_EVIDENCE_UPLOAD_DIALOG_ID_PREVIEW_CLASS =
  "max-h-[220px] w-full max-w-[360px] rounded border border-border object-contain"

export const STAFF_CONFIRM_MODAL_PANEL_CLASS =
  "flex max-h-[90vh] w-full max-w-[820px] flex-col overflow-hidden rounded-xl border border-zinc-300 bg-white text-zinc-900 shadow-2xl"

export const STAFF_CONFIRM_BODY_CLASS = "min-h-0 flex-1 overflow-y-auto p-4"

export const STAFF_CONFIRM_FOOTER_CLASS =
  "shrink-0 border-t border-zinc-200 bg-white px-4 py-3"

export const STAFF_CONFIRM_PREVIEW_ROW_CLASS =
  "flex flex-wrap items-start justify-center gap-4"

export const STAFF_CONFIRM_PHOTO_PREVIEW_CLASS =
  "mx-auto max-h-[260px] w-auto max-w-[360px] object-contain"

export const STAFF_CONFIRM_ID_PREVIEW_CLASS =
  "mx-auto max-h-[260px] w-auto max-w-[360px] object-contain"

export const STAFF_ID_SCAN_HELPER_TEXT =
  "วางบัตรให้อยู่เต็มกรอบและเห็นข้อมูลชัดเจน"

export const STAFF_WEBCAM_VIDEO_WRAPPER_CLASS =
  "relative mx-auto w-full max-w-[420px] overflow-hidden rounded-lg bg-zinc-900 aspect-[4/3]"

export const STAFF_WEBCAM_PORTRAIT_OVERLAY_CLASS =
  "pointer-events-none w-[55%] max-w-[240px] border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] aspect-[3/4]"

export const STAFF_WEBCAM_ID_OVERLAY_CLASS =
  "pointer-events-none w-[88%] max-w-[380px] border-2 border-sky-400/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] aspect-[1.586/1]"

export type ScaledDimensions = {
  width: number
  height: number
}

/** Scale down so width does not exceed maxWidth; never upscale. */
export function computeScaledDimensions(
  width: number,
  height: number,
  maxWidth: number
): ScaledDimensions {
  if (width <= 0 || height <= 0 || maxWidth <= 0) {
    return { width: Math.max(1, width), height: Math.max(1, height) }
  }
  if (width <= maxWidth) {
    return { width: Math.round(width), height: Math.round(height) }
  }
  const scale = maxWidth / width
  return {
    width: Math.round(maxWidth),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Scale down so the longest edge does not exceed maxLongEdge; never upscale. */
export function computeScaledDimensionsByLongEdge(
  width: number,
  height: number,
  maxLongEdge: number
): ScaledDimensions {
  if (width <= 0 || height <= 0 || maxLongEdge <= 0) {
    return { width: Math.max(1, width), height: Math.max(1, height) }
  }
  const longEdge = Math.max(width, height)
  if (longEdge <= maxLongEdge) {
    return { width: Math.round(width), height: Math.round(height) }
  }
  const scale = maxLongEdge / longEdge
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  }
}

/** Center-crop source rectangle to target aspect (width / height). */
export function centerCropSourceRect(
  width: number,
  height: number,
  aspectRatio: number
): { sx: number; sy: number; sw: number; sh: number } {
  if (width <= 0 || height <= 0 || aspectRatio <= 0) {
    return { sx: 0, sy: 0, sw: Math.max(1, width), sh: Math.max(1, height) }
  }

  const sourceAspect = width / height
  if (sourceAspect > aspectRatio) {
    const sh = height
    const sw = Math.round(height * aspectRatio)
    return {
      sx: Math.round((width - sw) / 2),
      sy: 0,
      sw,
      sh,
    }
  }

  const sw = width
  const sh = Math.round(width / aspectRatio)
  return {
    sx: 0,
    sy: Math.round((height - sh) / 2),
    sw,
    sh,
  }
}

export function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Failed to load image"))
    }
    image.src = url
  })
}

type OrientedImageSource = {
  width: number
  height: number
  draw: (ctx: CanvasRenderingContext2D, targetWidth: number, targetHeight: number) => void
  close: () => void
}

async function loadOrientedImageSource(blob: Blob): Promise<OrientedImageSource> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(blob, { imageOrientation: "from-image" })
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw: (ctx, targetWidth, targetHeight) => {
          ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight)
        },
        close: () => bitmap.close(),
      }
    } catch {
      // Fall back to HTMLImageElement when ImageBitmap is unavailable.
    }
  }

  const image = await loadImageFromBlob(blob)
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    draw: (ctx, targetWidth, targetHeight) => {
      ctx.drawImage(image, 0, 0, targetWidth, targetHeight)
    },
    close: () => {},
  }
}

async function renderStaffEvidenceJpeg(
  source: OrientedImageSource,
  targetWidth: number,
  targetHeight: number
): Promise<Blob | null> {
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, targetWidth)
  canvas.height = Math.max(1, targetHeight)
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  source.draw(ctx, canvas.width, canvas.height)
  return canvasToJpegBlob(canvas, STAFF_EVIDENCE_JPEG_QUALITY)
}

/** Normalize EXIF orientation, resize to long-edge limit, preserve aspect ratio, no crop. */
export async function processStaffEvidenceImageForUpload(blob: Blob): Promise<Blob> {
  const source = await loadOrientedImageSource(blob)
  try {
    const { width, height } = computeScaledDimensionsByLongEdge(
      source.width,
      source.height,
      STAFF_EVIDENCE_UPLOAD_MAX_LONG_EDGE
    )
    return (await renderStaffEvidenceJpeg(source, width, height)) ?? blob
  } finally {
    source.close()
  }
}

/** Normalize staff evidence file for upload — same processor for photo and ID card. */
export async function processStaffEvidenceFileForKind(
  blob: Blob,
  _kind: StaffEvidenceFileKind
): Promise<Blob> {
  return processStaffEvidenceImageForUpload(blob)
}

function canvasToJpegBlob(
  canvas: HTMLCanvasElement,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality)
  })
}

export async function drawImageToCanvas(
  image: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  sourceRect?: { sx: number; sy: number; sw: number; sh: number }
): Promise<HTMLCanvasElement | null> {
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, targetWidth)
  canvas.height = Math.max(1, targetHeight)
  const ctx = canvas.getContext("2d")
  if (!ctx) return null

  const sx = sourceRect?.sx ?? 0
  const sy = sourceRect?.sy ?? 0
  const sw = sourceRect?.sw ?? image.naturalWidth
  const sh = sourceRect?.sh ?? image.naturalHeight
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return canvas
}

export async function resizeStaffPhotoForUpload(blob: Blob): Promise<Blob> {
  return processStaffEvidenceImageForUpload(blob)
}

export async function resizeIdCardForUpload(blob: Blob): Promise<Blob> {
  return processStaffEvidenceImageForUpload(blob)
}

/** Rotate preview/upload image 90° clockwise, then re-apply long-edge JPEG compression. */
export async function rotateStaffEvidenceImageForUpload(blob: Blob): Promise<Blob> {
  const image = await loadImageFromBlob(blob)
  const rotatedCanvas = document.createElement("canvas")
  rotatedCanvas.width = image.naturalHeight
  rotatedCanvas.height = image.naturalWidth
  const rotatedCtx = rotatedCanvas.getContext("2d")
  if (!rotatedCtx) return blob

  rotatedCtx.translate(rotatedCanvas.width, 0)
  rotatedCtx.rotate(Math.PI / 2)
  rotatedCtx.drawImage(image, 0, 0)

  const { width, height } = computeScaledDimensionsByLongEdge(
    rotatedCanvas.width,
    rotatedCanvas.height,
    STAFF_EVIDENCE_UPLOAD_MAX_LONG_EDGE
  )
  const outputCanvas = document.createElement("canvas")
  outputCanvas.width = width
  outputCanvas.height = height
  const outputCtx = outputCanvas.getContext("2d")
  if (!outputCtx) return blob
  outputCtx.drawImage(rotatedCanvas, 0, 0, width, height)

  return (await canvasToJpegBlob(outputCanvas, STAFF_EVIDENCE_JPEG_QUALITY)) ?? blob
}
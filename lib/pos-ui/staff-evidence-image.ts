/** Staff evidence image sizing — aligned with catalog hover preview philosophy. */
export const STAFF_EVIDENCE_JPEG_QUALITY = 0.78

export const STAFF_PHOTO_UPLOAD_MAX_WIDTH = 600
export const STAFF_ID_CARD_UPLOAD_MAX_WIDTH = 900
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
  "mx-auto h-full w-full max-w-[280px] object-cover aspect-[3/4]"

export const STAFF_ID_CARD_PREVIEW_IMAGE_CLASS =
  "mx-auto h-full w-full max-w-[400px] object-cover aspect-[1.586/1]"

export const STAFF_CONFIRM_MODAL_PANEL_CLASS =
  "flex max-h-[90vh] w-full max-w-[820px] flex-col overflow-hidden rounded-xl border border-zinc-300 bg-white text-zinc-900 shadow-2xl"

export const STAFF_CONFIRM_BODY_CLASS = "min-h-0 flex-1 overflow-y-auto p-4"

export const STAFF_CONFIRM_FOOTER_CLASS =
  "shrink-0 border-t border-zinc-200 bg-white px-4 py-3"

export const STAFF_CONFIRM_PREVIEW_ROW_CLASS =
  "flex flex-wrap items-start justify-center gap-4"

export const STAFF_CONFIRM_PHOTO_PREVIEW_CLASS =
  "mx-auto max-h-[260px] w-auto max-w-[200px] object-contain aspect-[3/4]"

export const STAFF_CONFIRM_ID_PREVIEW_CLASS =
  "mx-auto max-h-[220px] w-auto max-w-[340px] object-contain aspect-[1.586/1]"

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
  const image = await loadImageFromBlob(blob)
  const crop = centerCropSourceRect(
    image.naturalWidth,
    image.naturalHeight,
    STAFF_PHOTO_ASPECT_RATIO
  )
  const { width, height } = computeScaledDimensions(
    crop.sw,
    crop.sh,
    STAFF_PHOTO_UPLOAD_MAX_WIDTH
  )
  const canvas = await drawImageToCanvas(image, width, height, crop)
  if (!canvas) return blob
  return (await canvasToJpegBlob(canvas, STAFF_EVIDENCE_JPEG_QUALITY)) ?? blob
}

export async function resizeIdCardForUpload(blob: Blob): Promise<Blob> {
  const { processIdCardForUpload } = await import("./id-card-image-enhance")
  return processIdCardForUpload(blob)
}
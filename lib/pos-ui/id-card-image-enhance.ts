/**
 * ID card processing: center-crop to card ratio, mild scan tone, resize, JPEG.
 * No auto edge detection or document detection.
 */
import {
  STAFF_EVIDENCE_JPEG_QUALITY,
  STAFF_ID_CARD_ASPECT_RATIO,
  STAFF_ID_CARD_UPLOAD_MAX_WIDTH,
  centerCropSourceRect,
  computeScaledDimensions,
  drawImageToCanvas,
  loadImageFromBlob,
} from "./staff-evidence-image"

export async function processIdCardForUpload(blob: Blob): Promise<Blob> {
  const image = await loadImageFromBlob(blob)
  const crop = centerCropSourceRect(
    image.naturalWidth,
    image.naturalHeight,
    STAFF_ID_CARD_ASPECT_RATIO
  )

  const croppedCanvas = await drawImageToCanvas(image, crop.sw, crop.sh, crop)
  if (!croppedCanvas) return blob

  applyMildScanTone(croppedCanvas)

  const { width, height } = computeScaledDimensions(
    crop.sw,
    crop.sh,
    STAFF_ID_CARD_UPLOAD_MAX_WIDTH
  )
  const outputCanvas = document.createElement("canvas")
  outputCanvas.width = width
  outputCanvas.height = height
  const outputCtx = outputCanvas.getContext("2d")
  if (!outputCtx) return blob
  outputCtx.drawImage(croppedCanvas, 0, 0, width, height)

  return (await canvasToJpegBlob(outputCanvas, STAFF_EVIDENCE_JPEG_QUALITY)) ?? blob
}

/** @deprecated Use processIdCardForUpload. */
export async function enhanceIdCardImageForUpload(blob: Blob): Promise<Blob> {
  return processIdCardForUpload(blob)
}

/** @deprecated Use processIdCardForUpload. */
export async function enhanceIdCardImage(blob: Blob): Promise<Blob> {
  return processIdCardForUpload(blob)
}

function applyMildScanTone(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext("2d")
  if (!ctx) return

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const { data } = imageData
  let min = 255
  let max = 0

  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!
    if (lum < min) min = lum
    if (lum > max) max = lum
  }

  const range = Math.max(1, max - min)
  const contrast = 1.1

  for (let i = 0; i < data.length; i += 4) {
    for (let channel = 0; channel < 3; channel += 1) {
      const normalized = ((data[i + channel]! - min) / range) * 255
      const boosted = 128 + (normalized - 128) * contrast
      data[i + channel] = Math.max(0, Math.min(255, Math.round(boosted)))
    }
  }

  ctx.putImageData(imageData, 0, 0)
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), "image/jpeg", quality)
  })
}

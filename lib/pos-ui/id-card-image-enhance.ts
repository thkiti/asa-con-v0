/**
 * ID card upload uses the same import pipeline as staff photo:
 * EXIF normalize, long-edge resize, no automatic crop.
 */
import { processStaffEvidenceImageForUpload } from "./staff-evidence-image"

export async function processIdCardForUpload(blob: Blob): Promise<Blob> {
  return processStaffEvidenceImageForUpload(blob)
}

/** @deprecated Use processIdCardForUpload. */
export async function enhanceIdCardImageForUpload(blob: Blob): Promise<Blob> {
  return processIdCardForUpload(blob)
}

/** @deprecated Use processIdCardForUpload. */
export async function enhanceIdCardImage(blob: Blob): Promise<Blob> {
  return processIdCardForUpload(blob)
}

/** @jest-environment jsdom */

import {
  STAFF_ID_CARD_ASPECT_RATIO,
  STAFF_ID_CARD_PREVIEW_IMAGE_CLASS,
  STAFF_ID_SCAN_FRAME_CLASS,
  STAFF_ID_SCAN_HELPER_TEXT,
  STAFF_PHOTO_FRAME_CLASS,
  STAFF_PHOTO_PREVIEW_IMAGE_CLASS,
  STAFF_CONFIRM_ID_PREVIEW_CLASS,
  STAFF_CONFIRM_PHOTO_PREVIEW_CLASS,
  STAFF_CONFIRM_PREVIEW_ROW_CLASS,
  STAFF_WEBCAM_ID_OVERLAY_CLASS,
  STAFF_WEBCAM_PORTRAIT_OVERLAY_CLASS,
  STAFF_PHOTO_UPLOAD_MAX_WIDTH,
  STAFF_ID_CARD_UPLOAD_MAX_WIDTH,
  STAFF_PHOTO_ASPECT_RATIO,
  STAFF_EVIDENCE_JPEG_QUALITY,
  centerCropSourceRect,
  computeScaledDimensions,
} from "@/lib/pos-ui/staff-evidence-image"

describe("staff-evidence-image sizing", () => {
  it("limits staff photo upload width to 600px", () => {
    expect(computeScaledDimensions(4000, 3000, STAFF_PHOTO_UPLOAD_MAX_WIDTH)).toEqual({
      width: 600,
      height: 450,
    })
  })

  it("does not upscale small staff photos", () => {
    expect(computeScaledDimensions(400, 500, STAFF_PHOTO_UPLOAD_MAX_WIDTH)).toEqual({
      width: 400,
      height: 500,
    })
  })

  it("limits ID card upload width to 900px", () => {
    expect(computeScaledDimensions(2400, 1500, STAFF_ID_CARD_UPLOAD_MAX_WIDTH)).toEqual({
      width: 900,
      height: 563,
    })
  })

  it("center-crops landscape source to ID card aspect", () => {
    const crop = centerCropSourceRect(1600, 900, STAFF_ID_CARD_ASPECT_RATIO)
    expect(crop.sh).toBe(900)
    expect(crop.sw).toBe(Math.round(900 * STAFF_ID_CARD_ASPECT_RATIO))
    expect(crop.sx).toBeGreaterThan(0)
  })

  it("uses portrait preview ratio class for staff photo", () => {
    expect(STAFF_PHOTO_PREVIEW_IMAGE_CLASS).toContain("aspect-[3/4]")
    expect(STAFF_PHOTO_PREVIEW_IMAGE_CLASS).toContain("max-w-[280px]")
    expect(STAFF_PHOTO_PREVIEW_IMAGE_CLASS).toContain("object-cover")
  })

  it("uses card preview ratio class for ID card", () => {
    expect(STAFF_ID_CARD_PREVIEW_IMAGE_CLASS).toContain("aspect-[1.586/1]")
    expect(STAFF_ID_CARD_PREVIEW_IMAGE_CLASS).toContain("max-w-[400px]")
  })

  it("uses portrait capture frame for staff photo", () => {
    expect(STAFF_PHOTO_FRAME_CLASS).toContain("aspect-[3/4]")
    expect(STAFF_PHOTO_FRAME_CLASS).toContain("max-w-[280px]")
  })

  it("uses horizontal scan frame for ID card capture", () => {
    expect(STAFF_ID_SCAN_FRAME_CLASS).toContain("aspect-[1.586/1]")
    expect(STAFF_ID_SCAN_FRAME_CLASS).toContain("max-w-[400px]")
  })

  it("center-crops staff photo source to portrait aspect", () => {
    const crop = centerCropSourceRect(1600, 900, STAFF_PHOTO_ASPECT_RATIO)
    expect(crop.sw).toBe(675)
    expect(crop.sh).toBe(900)
    expect(crop.sx).toBeGreaterThan(0)
  })

  it("uses webcam portrait overlay ratio class", () => {
    expect(STAFF_WEBCAM_PORTRAIT_OVERLAY_CLASS).toContain("aspect-[3/4]")
  })

  it("uses webcam ID card overlay ratio class", () => {
    expect(STAFF_WEBCAM_ID_OVERLAY_CLASS).toContain("aspect-[1.586/1]")
  })

  it("uses compact horizontal confirm preview classes", () => {
    expect(STAFF_CONFIRM_PHOTO_PREVIEW_CLASS).toContain("max-h-[260px]")
    expect(STAFF_CONFIRM_ID_PREVIEW_CLASS).toContain("max-h-[220px]")
    expect(STAFF_CONFIRM_PREVIEW_ROW_CLASS).toContain("flex")
  })

  it("uses JPEG quality in catalog-like range", () => {
    expect(STAFF_EVIDENCE_JPEG_QUALITY).toBeGreaterThanOrEqual(0.75)
    expect(STAFF_EVIDENCE_JPEG_QUALITY).toBeLessThanOrEqual(0.8)
  })

  it("includes ID card placement helper text", () => {
    expect(STAFF_ID_SCAN_HELPER_TEXT).toBe(
      "วางบัตรให้อยู่เต็มกรอบและเห็นข้อมูลชัดเจน"
    )
  })
})

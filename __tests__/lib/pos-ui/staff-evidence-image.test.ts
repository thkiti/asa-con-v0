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
  STAFF_EVIDENCE_UPLOAD_MAX_LONG_EDGE,
  STAFF_EVIDENCE_UPLOAD_DIALOG_ID_PREVIEW_CLASS,
  STAFF_EVIDENCE_UPLOAD_DIALOG_PHOTO_PREVIEW_CLASS,
  STAFF_PHOTO_ASPECT_RATIO,
  STAFF_EVIDENCE_JPEG_QUALITY,
  centerCropSourceRect,
  computeScaledDimensionsByLongEdge,
} from "@/lib/pos-ui/staff-evidence-image"

describe("staff-evidence-image sizing", () => {
  it("uses 360px max long edge for all staff evidence uploads", () => {
    expect(STAFF_EVIDENCE_UPLOAD_MAX_LONG_EDGE).toBe(360)
  })

  it("limits staff photo upload long edge to 360px", () => {
    expect(
      computeScaledDimensionsByLongEdge(4000, 3000, STAFF_EVIDENCE_UPLOAD_MAX_LONG_EDGE)
    ).toEqual({
      width: 360,
      height: 270,
    })
  })

  it("scales down small staff photos when long edge exceeds limit", () => {
    expect(
      computeScaledDimensionsByLongEdge(360, 450, STAFF_EVIDENCE_UPLOAD_MAX_LONG_EDGE)
    ).toEqual({
      width: 288,
      height: 360,
    })
  })

  it("limits ID card upload long edge to 360px", () => {
    expect(
      computeScaledDimensionsByLongEdge(2400, 1500, STAFF_EVIDENCE_UPLOAD_MAX_LONG_EDGE)
    ).toEqual({
      width: 360,
      height: 225,
    })
  })

  it("does not upscale small ID card images", () => {
    expect(
      computeScaledDimensionsByLongEdge(320, 200, STAFF_EVIDENCE_UPLOAD_MAX_LONG_EDGE)
    ).toEqual({
      width: 320,
      height: 200,
    })
  })

  it("center-crops landscape source to ID card aspect", () => {
    const crop = centerCropSourceRect(1600, 900, STAFF_ID_CARD_ASPECT_RATIO)
    expect(crop.sh).toBe(900)
    expect(crop.sw).toBe(Math.round(900 * STAFF_ID_CARD_ASPECT_RATIO))
    expect(crop.sx).toBeGreaterThan(0)
  })

  it("uses object-contain preview classes without forced crop aspect", () => {
    expect(STAFF_PHOTO_PREVIEW_IMAGE_CLASS).toContain("object-contain")
    expect(STAFF_PHOTO_PREVIEW_IMAGE_CLASS).not.toContain("object-cover")
    expect(STAFF_PHOTO_PREVIEW_IMAGE_CLASS).not.toContain("aspect-[3/4]")
    expect(STAFF_ID_CARD_PREVIEW_IMAGE_CLASS).toContain("object-contain")
    expect(STAFF_ID_CARD_PREVIEW_IMAGE_CLASS).not.toContain("aspect-[1.586/1]")
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
    expect(STAFF_CONFIRM_ID_PREVIEW_CLASS).toContain("max-h-[260px]")
    expect(STAFF_CONFIRM_PREVIEW_ROW_CLASS).toContain("flex")
  })

  it("uses JPEG quality 0.80 for upload", () => {
    expect(STAFF_EVIDENCE_JPEG_QUALITY).toBe(0.8)
  })

  it("uses upload dialog preview classes for two-column layout", () => {
    expect(STAFF_EVIDENCE_UPLOAD_DIALOG_PHOTO_PREVIEW_CLASS).toContain("max-h-[220px]")
    expect(STAFF_EVIDENCE_UPLOAD_DIALOG_PHOTO_PREVIEW_CLASS).toContain("object-contain")
    expect(STAFF_EVIDENCE_UPLOAD_DIALOG_ID_PREVIEW_CLASS).toContain("max-w-[360px]")
    expect(STAFF_EVIDENCE_UPLOAD_DIALOG_ID_PREVIEW_CLASS).toContain("object-contain")
  })

  it("resizes portrait import example to 227x360 without crop", () => {
    expect(
      computeScaledDimensionsByLongEdge(1547, 2456, STAFF_EVIDENCE_UPLOAD_MAX_LONG_EDGE)
    ).toEqual({
      width: 227,
      height: 360,
    })
  })

  it("keeps rotated portrait example at 360x227 long edge", () => {
    expect(
      computeScaledDimensionsByLongEdge(640, 403, STAFF_EVIDENCE_UPLOAD_MAX_LONG_EDGE)
    ).toEqual({
      width: 360,
      height: 227,
    })
  })

  it("includes ID card placement helper text", () => {
    expect(STAFF_ID_SCAN_HELPER_TEXT).toBe(
      "วางบัตรให้อยู่เต็มกรอบและเห็นข้อมูลชัดเจน"
    )
  })
})

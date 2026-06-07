export type CropTemplate = {
  rotateDeg: number
  columns: number
  rows: number
  cropX: number
  cropY: number
  cropWidth: number
  cropHeight: number
}

export const MIN_CROP_SIZE = 50

export function roundCropDecimal(value: number): number {
  return Math.round(value * 10) / 10
}

export type CropRect = {
  cropX: number
  cropY: number
  cropWidth: number
  cropHeight: number
}

export const DEFAULT_CATALOG_CROP_POSITION: CropRect = {
  cropX: 116,
  cropY: 97,
  cropWidth: 1007,
  cropHeight: 1472,
}

export function defaultCropRect(
  imageWidth: number,
  imageHeight: number
): CropRect {
  return {
    cropX: 0,
    cropY: 0,
    cropWidth: Math.max(0, imageWidth),
    cropHeight: Math.max(0, imageHeight),
  }
}

export function defaultCatalogCropRect(
  imageWidth: number,
  imageHeight: number
): CropRect {
  return clampCropRect(
    DEFAULT_CATALOG_CROP_POSITION,
    imageWidth,
    imageHeight,
    1
  )
}

export function buildCropTemplate(
  settings: Pick<CropTemplate, "rotateDeg" | "columns" | "rows">,
  imageWidth: number,
  imageHeight: number,
  rect: CropRect = defaultCropRect(imageWidth, imageHeight)
): CropTemplate {
  return {
    rotateDeg: settings.rotateDeg,
    columns: settings.columns,
    rows: settings.rows,
    ...clampCropRect(rect, imageWidth, imageHeight),
  }
}

export type CropImageSize = {
  width: number
  height: number
}

export type CropRectFieldBounds = {
  min: number
  max: number
}

export function getCropRectFieldBounds(
  rect: CropRect,
  imageWidth: number,
  imageHeight: number
): Record<keyof CropRect, CropRectFieldBounds> {
  return {
    cropX: {
      min: 0,
      max: Math.max(0, roundCropDecimal(imageWidth - rect.cropWidth)),
    },
    cropY: {
      min: 0,
      max: Math.max(0, roundCropDecimal(imageHeight - rect.cropHeight)),
    },
    cropWidth: {
      min: 1,
      max: Math.max(1, roundCropDecimal(imageWidth - rect.cropX)),
    },
    cropHeight: {
      min: 1,
      max: Math.max(1, roundCropDecimal(imageHeight - rect.cropY)),
    },
  }
}

export function applyCropRectFieldUpdate(
  rect: CropRect,
  field: keyof CropRect,
  value: number,
  imageWidth: number,
  imageHeight: number
): CropRect {
  const minSize =
    field === "cropWidth" || field === "cropHeight" ? 1 : MIN_CROP_SIZE

  return clampCropRect(
    { ...rect, [field]: roundCropDecimal(value) },
    imageWidth,
    imageHeight,
    minSize
  )
}

export function clampCropRect(
  rect: CropRect,
  imageWidth: number,
  imageHeight: number,
  minSize: number = MIN_CROP_SIZE
): CropRect {
  const maxW = Math.max(imageWidth, 0)
  const maxH = Math.max(imageHeight, 0)
  const min = Math.max(1, Math.min(minSize, maxW, maxH))

  let cropWidth = Math.max(min, Math.min(rect.cropWidth, maxW))
  let cropHeight = Math.max(min, Math.min(rect.cropHeight, maxH))
  let cropX = rect.cropX
  let cropY = rect.cropY

  if (cropX < 0) cropX = 0
  if (cropY < 0) cropY = 0
  if (cropX + cropWidth > maxW) cropX = Math.max(0, maxW - cropWidth)
  if (cropY + cropHeight > maxH) cropY = Math.max(0, maxH - cropHeight)

  cropWidth = Math.min(cropWidth, maxW - cropX)
  cropHeight = Math.min(cropHeight, maxH - cropY)

  return {
    cropX: roundCropDecimal(cropX),
    cropY: roundCropDecimal(cropY),
    cropWidth: roundCropDecimal(Math.max(min, cropWidth)),
    cropHeight: roundCropDecimal(Math.max(min, cropHeight)),
  }
}

export function moveCropRect(
  rect: CropRect,
  deltaX: number,
  deltaY: number,
  imageWidth: number,
  imageHeight: number
): CropRect {
  return clampCropRect(
    {
      cropX: rect.cropX + deltaX,
      cropY: rect.cropY + deltaY,
      cropWidth: rect.cropWidth,
      cropHeight: rect.cropHeight,
    },
    imageWidth,
    imageHeight
  )
}

export type ResizeHandle = "nw" | "ne" | "sw" | "se"

export function resizeCropRect(
  rect: CropRect,
  handle: ResizeHandle,
  deltaX: number,
  deltaY: number,
  imageWidth: number,
  imageHeight: number
): CropRect {
  let { cropX, cropY, cropWidth, cropHeight } = rect

  switch (handle) {
    case "nw":
      cropX += deltaX
      cropY += deltaY
      cropWidth -= deltaX
      cropHeight -= deltaY
      break
    case "ne":
      cropY += deltaY
      cropWidth += deltaX
      cropHeight -= deltaY
      break
    case "sw":
      cropX += deltaX
      cropWidth -= deltaX
      cropHeight += deltaY
      break
    case "se":
      cropWidth += deltaX
      cropHeight += deltaY
      break
  }

  return clampCropRect(
    { cropX, cropY, cropWidth, cropHeight },
    imageWidth,
    imageHeight
  )
}

export function adjustCropSize(
  rect: CropRect,
  deltaWidth: number,
  deltaHeight: number,
  imageWidth: number,
  imageHeight: number
): CropRect {
  return clampCropRect(
    {
      cropX: rect.cropX,
      cropY: rect.cropY,
      cropWidth: rect.cropWidth + deltaWidth,
      cropHeight: rect.cropHeight + deltaHeight,
    },
    imageWidth,
    imageHeight
  )
}

export function nudgeCropRect(
  rect: CropRect,
  direction: "left" | "right" | "up" | "down",
  amount: number,
  imageWidth: number,
  imageHeight: number
): CropRect {
  switch (direction) {
    case "left":
      return moveCropRect(rect, -amount, 0, imageWidth, imageHeight)
    case "right":
      return moveCropRect(rect, amount, 0, imageWidth, imageHeight)
    case "up":
      return moveCropRect(rect, 0, -amount, imageWidth, imageHeight)
    case "down":
      return moveCropRect(rect, 0, amount, imageWidth, imageHeight)
  }
}

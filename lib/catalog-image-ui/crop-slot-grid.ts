export type CropArea = {
  cropX: number
  cropY: number
  cropWidth: number
  cropHeight: number
}

export type SlotRect = {
  left: number
  top: number
  width: number
  height: number
}

export class CropSlotGridError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "CropSlotGridError"
  }
}

export function resolveCropArea(
  cropArea: CropArea | null | undefined,
  pageWidth: number,
  pageHeight: number
): CropArea {
  if (!cropArea) {
    return {
      cropX: 0,
      cropY: 0,
      cropWidth: pageWidth,
      cropHeight: pageHeight,
    }
  }

  const cropX = Math.round(Number(cropArea.cropX ?? 0))
  const cropY = Math.round(Number(cropArea.cropY ?? 0))
  const cropWidth = Math.round(Number(cropArea.cropWidth ?? 0))
  const cropHeight = Math.round(Number(cropArea.cropHeight ?? 0))

  if (cropWidth <= 0 || cropHeight <= 0) {
    throw new CropSlotGridError("cropWidth and cropHeight must be greater than zero")
  }
  if (cropX < 0 || cropY < 0) {
    throw new CropSlotGridError("cropX and cropY must be non-negative")
  }
  if (cropX + cropWidth > pageWidth || cropY + cropHeight > pageHeight) {
    throw new CropSlotGridError("crop area is outside page bounds")
  }

  return { cropX, cropY, cropWidth, cropHeight }
}

export function computeSlotRects(
  croppedWidth: number,
  croppedHeight: number,
  columns: number,
  rows: number
): SlotRect[] {
  if (columns < 1 || rows < 1) {
    throw new CropSlotGridError("columns and rows must be at least 1")
  }

  const slotWidth = Math.floor(croppedWidth / columns)
  const slotHeight = Math.floor(croppedHeight / rows)
  const rects: SlotRect[] = []
  let slotNo = 1

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const left = col * slotWidth
      const top = row * slotHeight
      const width = col === columns - 1 ? croppedWidth - left : slotWidth
      const height = row === rows - 1 ? croppedHeight - top : slotHeight
      rects.push({ left, top, width, height })
      slotNo += 1
    }
  }

  return rects
}

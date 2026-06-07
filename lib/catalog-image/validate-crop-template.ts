import type { CropRect } from "@/lib/catalog-image-ui/crop-template"
import { CatalogImageError } from "./errors"

const CROP_FIELDS = ["cropX", "cropY", "cropWidth", "cropHeight"] as const

type CropFieldBody = {
  cropX?: unknown
  cropY?: unknown
  cropWidth?: unknown
  cropHeight?: unknown
}

function isProvided(value: unknown): boolean {
  return value !== undefined && value !== null && value !== ""
}

export function parseCropAreaInput(body: CropFieldBody): CropRect | null {
  const provided = CROP_FIELDS.filter((field) => isProvided(body[field]))
  if (provided.length === 0) return null
  if (provided.length !== CROP_FIELDS.length) {
    throw new CatalogImageError(
      "Crop template must include cropX, cropY, cropWidth, and cropHeight together",
      "INVALID_CROP_TEMPLATE",
      400
    )
  }

  const cropX = Number(body.cropX)
  const cropY = Number(body.cropY)
  const cropWidth = Number(body.cropWidth)
  const cropHeight = Number(body.cropHeight)

  if (
    !Number.isFinite(cropX) ||
    !Number.isFinite(cropY) ||
    !Number.isFinite(cropWidth) ||
    !Number.isFinite(cropHeight)
  ) {
    throw new CatalogImageError(
      "Crop template values must be numbers",
      "INVALID_CROP_TEMPLATE",
      400
    )
  }

  if (cropWidth <= 0 || cropHeight <= 0) {
    throw new CatalogImageError(
      "Crop width and height must be greater than zero",
      "INVALID_CROP_TEMPLATE",
      400
    )
  }

  if (cropX < 0 || cropY < 0) {
    throw new CatalogImageError(
      "Crop position must be non-negative",
      "INVALID_CROP_TEMPLATE",
      400
    )
  }

  return {
    cropX: Math.round(cropX),
    cropY: Math.round(cropY),
    cropWidth: Math.round(cropWidth),
    cropHeight: Math.round(cropHeight),
  }
}

import { roundCropDecimal } from "./crop-template"

export type CatalogNumericFormat = "integer" | "decimal"

export function formatNumericStepperValue(
  value: number,
  format: CatalogNumericFormat
): string {
  return format === "decimal" ? value.toFixed(1) : String(Math.round(value))
}

export function normalizeNumericStepperValue(
  value: number,
  format: CatalogNumericFormat,
  min?: number,
  max?: number
): number {
  let next = format === "decimal" ? roundCropDecimal(value) : Math.round(value)
  if (min != null && next < min) next = min
  if (max != null && next > max) next = max
  return next
}

export function adjustNumericStepperValue(
  value: number,
  step: number,
  direction: "up" | "down",
  format: CatalogNumericFormat,
  min?: number,
  max?: number
): number {
  const delta = direction === "up" ? step : -step
  return normalizeNumericStepperValue(value + delta, format, min, max)
}

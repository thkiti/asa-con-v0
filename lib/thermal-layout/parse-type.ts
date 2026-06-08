import type { ThermalDocumentType } from "@/lib/thermal/types"
import { THERMAL_DOCUMENT_TYPES } from "@/lib/thermal/types"

export function parseThermalDocumentType(value: string): ThermalDocumentType {
  if ((THERMAL_DOCUMENT_TYPES as readonly string[]).includes(value)) {
    return value as ThermalDocumentType
  }
  throw new Error(`Invalid thermal document type: ${value}`)
}

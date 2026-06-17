import { formatEntityShort } from "./display"

export const HO_BRANCH_CODE = "HO999"

export const LEGAL_ENTITY_CODES = ["AS", "AD"] as const

export type DocumentEntityCode = (typeof LEGAL_ENTITY_CODES)[number]

export const DEFAULT_DOCUMENT_ENTITY_CODE: DocumentEntityCode = "AS"

/** @deprecated Prefer formatEntityShort / formatEntityDisplay from ./display */
export const LEGAL_ENTITY_DISPLAY_NAMES: Record<DocumentEntityCode, string> = {
  AS: "ASAS",
  AD: "ASAD",
}

export function getLegalEntityDisplayName(code: DocumentEntityCode): string {
  return formatEntityShort(code)
}

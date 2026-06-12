export const HO_BRANCH_CODE = "HO999"

export const LEGAL_ENTITY_CODES = ["AS", "AD"] as const

export type DocumentEntityCode = (typeof LEGAL_ENTITY_CODES)[number]

export const DEFAULT_DOCUMENT_ENTITY_CODE: DocumentEntityCode = "AS"

export const LEGAL_ENTITY_DISPLAY_NAMES: Record<DocumentEntityCode, string> = {
  AS: "ASAS",
  AD: "ASAD",
}

export function getLegalEntityDisplayName(code: DocumentEntityCode): string {
  return LEGAL_ENTITY_DISPLAY_NAMES[code]
}

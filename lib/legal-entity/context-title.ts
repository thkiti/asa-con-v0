import { formatEntityShort } from "./display"
import {
  DEFAULT_DOCUMENT_ENTITY_CODE,
  type DocumentEntityCode,
} from "./constants"

/** Page heading prefix: ASAS • MAIN MENU */
export function formatEntityContextTitle(
  documentEntityCode: DocumentEntityCode,
  ...segments: string[]
): string {
  const entity = formatEntityShort(documentEntityCode)
  const normalized = segments
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => segment.toUpperCase())
  return [entity, ...normalized].join(" • ")
}

export function formatEntityContextTitleOrDefault(
  documentEntityCode: DocumentEntityCode | undefined | null,
  ...segments: string[]
): string {
  return formatEntityContextTitle(
    documentEntityCode ?? DEFAULT_DOCUMENT_ENTITY_CODE,
    ...segments
  )
}

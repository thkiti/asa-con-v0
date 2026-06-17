import type { DocumentEntityCode } from "./constants"

export type EntityDisplayLocale = "en" | "th"

const ENTITY_SHORT_NAMES: Record<DocumentEntityCode, string> = {
  AS: "ASAS",
  AD: "ASAD",
}

const ENTITY_THAI_NAMES: Record<DocumentEntityCode, string> = {
  AS: "อาสา เซอร์วิส",
  AD: "อาสา ดิสทริบิวชั่น",
}

/** Map AS/AD/ASAS/ASAD to canonical document entity code. */
export function normalizeDocumentEntityCode(
  value: string | null | undefined
): DocumentEntityCode | null {
  const raw = String(value ?? "").trim().toUpperCase()
  if (raw === "AS" || raw === "ASAS") return "AS"
  if (raw === "AD" || raw === "ASAD") return "AD"
  return null
}

/** English short form: ASAS / ASAD (never AD or AS alone). */
export function formatEntityShort(value: string | null | undefined): string {
  const code = normalizeDocumentEntityCode(value)
  if (code) return ENTITY_SHORT_NAMES[code]
  const raw = String(value ?? "").trim()
  return raw || "—"
}

/** Thai full legal name for UI. */
export function formatEntityThai(value: string | null | undefined): string {
  const code = normalizeDocumentEntityCode(value)
  if (code) return ENTITY_THAI_NAMES[code]
  return formatEntityShort(value)
}

/** Locale-aware entity label for UI surfaces. */
export function formatEntityDisplay(
  value: string | null | undefined,
  locale: EntityDisplayLocale = "en"
): string {
  return locale === "th" ? formatEntityThai(value) : formatEntityShort(value)
}

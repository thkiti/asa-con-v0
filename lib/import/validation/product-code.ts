export type ProductCodeParts = {
  code: string
  groupCode: number
  typeCode: number
  runningCode: number
}

export function normalizePosinyProductCode(rawId: unknown): ProductCodeParts | null {
  const trimmed = String(rawId ?? "").trim()
  if (!trimmed || !/^\d+$/.test(trimmed)) return null

  const raw = trimmed.padStart(7, "0")
  if (!/^\d{7}$/.test(raw)) return null

  const groupCode = parseInt(raw.substring(0, 2), 10)
  const typeCode = parseInt(raw.substring(2, 4), 10)
  const runningCode = parseInt(raw.substring(4, 7), 10)

  if ([groupCode, typeCode, runningCode].some((value) => Number.isNaN(value))) {
    return null
  }

  return { code: raw, groupCode, typeCode, runningCode }
}

export function normalizeReferenceProductCode(raw: unknown): string {
  let value = String(raw ?? "")
    .trim()
    .replace(/-/g, "")
    .replace(/"/g, "")

  if (!value) return ""

  if (/^\d+$/.test(value) && value.length >= 2) {
    value = value.slice(0, -1)
  }

  return value.padStart(7, "0")
}

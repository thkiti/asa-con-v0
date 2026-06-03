const DEFAULT_RUN = "900"

export function buildProductGroup(productCode: string, run: string): string {
  const digits = String(productCode || "").replace(/\D/g, "")
  const prefix = digits.slice(0, 4)
  const normalizedRun = String(run || "")
    .replace(/\D/g, "")
    .padStart(3, "0")
    .slice(0, 3)

  if (!prefix || normalizedRun.length !== 3) {
    return ""
  }

  return `${prefix}${normalizedRun}`
}

export function extractRunFromProductGroup(productGroup: string | null | undefined): string {
  const code = String(productGroup || "").replace(/\D/g, "")
  if (code.length >= 7) {
    return code.slice(4, 7)
  }
  return DEFAULT_RUN
}

export function cleanGroupDisplayName(name: string): string {
  return String(name || "")
    .replace(/\bsize\b.*$/i, "")
    .replace(/ไซส์.*$/i, "")
    .replace(/\s+/g, " ")
    .trim()
}

export const DEFAULT_PRODUCT_GROUP_RUN = DEFAULT_RUN

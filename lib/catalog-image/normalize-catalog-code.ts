import { CatalogImageError } from "./errors"

export function extractCatalogCodeBase(rawCode: string): string {
  const digits = String(rawCode ?? "").replace(/\D/g, "")

  if (digits.length < 2) {
    throw new CatalogImageError(
      "Catalog code is too short",
      "CATALOG_CODE_TOO_SHORT",
      400
    )
  }

  const withoutChecksum = digits.slice(0, -1)

  if (withoutChecksum.length !== 6 && withoutChecksum.length !== 7) {
    throw new CatalogImageError(
      "Invalid catalog code length after checksum removal",
      "INVALID_CATALOG_CODE_LENGTH",
      400
    )
  }

  return withoutChecksum
}

export function formatProductCodeFromBase(withoutChecksum: string): string {
  if (withoutChecksum.length === 6) {
    return `0${withoutChecksum}`
  }

  if (withoutChecksum.length === 7) {
    return withoutChecksum
  }

  throw new CatalogImageError(
    "Invalid catalog code length after checksum removal",
    "INVALID_CATALOG_CODE_LENGTH",
    400
  )
}

export function normalizeCatalogProductCode(rawCode: string): string {
  return formatProductCodeFromBase(extractCatalogCodeBase(rawCode))
}

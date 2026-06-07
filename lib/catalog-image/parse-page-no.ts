import { CatalogImageError } from "./errors"

export function parsePageNo(value: unknown, defaultValue?: number): number {
  const resolved =
    value === undefined || value === null || value === ""
      ? defaultValue
      : Number(value)

  if (resolved === undefined) {
    throw new CatalogImageError("pageNo is required", "INVALID_PAGE_NO", 400)
  }

  if (!Number.isFinite(resolved) || !Number.isInteger(resolved) || resolved < 1) {
    throw new CatalogImageError("pageNo must be a positive integer", "INVALID_PAGE_NO", 400)
  }

  return resolved
}

export function parseOptionalPageNo(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined
  }
  return parsePageNo(value)
}

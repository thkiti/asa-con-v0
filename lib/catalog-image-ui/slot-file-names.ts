export function getSlotSourceFileName(localFilePath: string): string {
  const normalized = localFilePath.replace(/\\/g, "/")
  const lastSlash = normalized.lastIndexOf("/")
  return lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized
}

export function buildFinalFileName(productCode: string | null): string | null {
  if (!productCode) return null
  return `${productCode}.png`
}

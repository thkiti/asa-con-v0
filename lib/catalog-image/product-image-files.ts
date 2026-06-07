import fs from "fs/promises"
import path from "path"
import { getCatalogProductImageDir } from "./config"
import { assertSafeProductCode } from "./paths"

export const CATALOG_PRODUCT_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const

export type CatalogProductImageExtension =
  (typeof CATALOG_PRODUCT_IMAGE_EXTENSIONS)[number]

function normalizeExtension(ext: string): string {
  const lower = ext.toLowerCase()
  return lower === ".jpeg" ? ".jpeg" : lower
}

export function isCatalogProductImageExtension(
  ext: string
): ext is CatalogProductImageExtension {
  const normalized = normalizeExtension(ext.startsWith(".") ? ext : `.${ext}`)
  return (CATALOG_PRODUCT_IMAGE_EXTENSIONS as readonly string[]).includes(
    normalized
  )
}

export function isCatalogProductImageFileName(fileName: string): boolean {
  const base = path.basename(String(fileName ?? "").trim())
  if (!base || base !== fileName.trim()) return false
  const ext = path.extname(base)
  if (!isCatalogProductImageExtension(ext)) return false
  const stem = base.slice(0, -ext.length)
  if (!stem) return false
  try {
    assertSafeProductCode(stem)
    return true
  } catch {
    return false
  }
}

export function getProductCodeFromImageFileName(fileName: string): string | null {
  const base = path.basename(String(fileName ?? "").trim())
  if (!isCatalogProductImageFileName(base)) return null
  const ext = path.extname(base)
  const stem = base.slice(0, -ext.length)
  try {
    return assertSafeProductCode(stem)
  } catch {
    return null
  }
}

export function getImageExtensionFromFileName(fileName: string): string | null {
  const base = path.basename(String(fileName ?? "").trim())
  if (!isCatalogProductImageFileName(base)) return null
  return path.extname(base).toLowerCase()
}

function productImagePath(dir: string, productCode: string, ext: string): string {
  const safeCode = assertSafeProductCode(productCode)
  return path.resolve(dir, `${safeCode}${ext}`)
}

export async function findExistingProductImageFiles(
  dir: string,
  productCode: string
): Promise<string[]> {
  const safeCode = assertSafeProductCode(productCode)
  const found: string[] = []

  for (const ext of CATALOG_PRODUCT_IMAGE_EXTENSIONS) {
    const filePath = productImagePath(dir, safeCode, ext)
    try {
      await fs.access(filePath)
      found.push(filePath)
    } catch {
      // not found
    }
  }

  return found
}

export async function hasProductImageConflict(
  dir: string,
  productCode: string
): Promise<boolean> {
  const existing = await findExistingProductImageFiles(dir, productCode)
  return existing.length > 0
}

export async function discoverProductCodesInImageDir(
  dir: string
): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const codes = new Set<string>()

  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!isCatalogProductImageFileName(entry.name)) continue
    const code = getProductCodeFromImageFileName(entry.name)
    if (code) codes.add(code)
  }

  return [...codes].sort()
}

export async function ensureCatalogProductImageDir(): Promise<string> {
  const dir = getCatalogProductImageDir()
  await fs.mkdir(dir, { recursive: true })
  return dir
}

export async function removeProductImageFilesForCode(
  dir: string,
  productCode: string
): Promise<string[]> {
  const existing = await findExistingProductImageFiles(dir, productCode)
  for (const filePath of existing) {
    await fs.unlink(filePath)
  }
  return existing
}

import { randomUUID } from "crypto"
import fs from "fs/promises"
import path from "path"
import {
  getCatalogImageFinalDir,
  getCatalogImageInputDir,
  getCatalogImageWorkDir,
} from "./config"
import { CatalogImageError } from "./errors"

export type PdfFileEntry = {
  fileName: string
  sizeBytes: number
  modifiedAt: string
}

export type FinalPngFileEntry = {
  fileName: string
  sizeBytes: number
  modifiedAt: string
}

function isInsideDir(resolved: string, root: string): boolean {
  const normalizedRoot = path.resolve(root)
  const normalizedResolved = path.resolve(resolved)
  const relative = path.relative(normalizedRoot, normalizedResolved)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

export function assertBasenameOnly(fileName: string): string {
  const trimmed = String(fileName ?? "").trim()
  if (!trimmed) {
    throw new CatalogImageError("File name is required", "INVALID_FILE_NAME", 400)
  }
  if (
    trimmed.includes("..") ||
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    trimmed !== path.basename(trimmed)
  ) {
    throw new CatalogImageError("Invalid file name", "PATH_TRAVERSAL", 400)
  }
  if (!trimmed.toLowerCase().endsWith(".pdf")) {
    throw new CatalogImageError("Only PDF files are allowed", "INVALID_FILE_TYPE", 400)
  }
  return trimmed
}

export function createUniqueInputPdfFileName(originalName: string): string {
  const safe = assertBasenameOnly(originalName)
  const stem = safe.slice(0, -4)
  const id = randomUUID().replace(/-/g, "").slice(0, 12)
  return `${stem}-${id}.pdf`
}

export function resolveInputPdfPath(fileName: string): string {
  const safeName = assertBasenameOnly(fileName)
  const inputDir = getCatalogImageInputDir()
  const resolved = path.resolve(inputDir, safeName)
  if (!isInsideDir(resolved, inputDir)) {
    throw new CatalogImageError("Path traversal detected", "PATH_TRAVERSAL", 400)
  }
  return resolved
}

export function assertSafeProductCode(productCode: string): string {
  const trimmed = String(productCode ?? "").trim()
  if (!trimmed) {
    throw new CatalogImageError("productCode is required", "VALIDATION_ERROR", 400)
  }
  if (
    trimmed.includes("..") ||
    trimmed.includes("/") ||
    trimmed.includes("\\") ||
    trimmed !== path.basename(trimmed)
  ) {
    throw new CatalogImageError("Invalid product code", "INVALID_PRODUCT_CODE", 400)
  }
  return trimmed
}

export function resolveFinalProductImagePath(productCode: string): string {
  const safeCode = assertSafeProductCode(productCode)
  const finalDir = getCatalogImageFinalDir()
  const resolved = path.resolve(finalDir, `${safeCode}.png`)
  if (!isInsideDir(resolved, finalDir)) {
    throw new CatalogImageError("Path traversal detected", "PATH_TRAVERSAL", 400)
  }
  return resolved
}

export function resolveFinalWorkFilePath(localFilePath: string): string {
  const finalDir = getCatalogImageFinalDir()
  const resolved = path.resolve(localFilePath)
  if (!isInsideDir(resolved, finalDir)) {
    throw new CatalogImageError(
      "File path must be inside final work folder",
      "PATH_TRAVERSAL",
      400
    )
  }
  if (!resolved.toLowerCase().endsWith(".png")) {
    throw new CatalogImageError("Only PNG files are allowed", "INVALID_FILE_TYPE", 400)
  }
  return resolved
}

export function resolveWorkFilePath(localFilePath: string): string {
  const workDir = getCatalogImageWorkDir()
  const resolved = path.resolve(localFilePath)
  if (!isInsideDir(resolved, workDir)) {
    throw new CatalogImageError(
      "File path must be inside work directory",
      "PATH_TRAVERSAL",
      400
    )
  }
  if (!resolved.toLowerCase().endsWith(".png")) {
    throw new CatalogImageError("Only PNG files are allowed", "INVALID_FILE_TYPE", 400)
  }
  return resolved
}

export function resolveWorkPreviewPath(
  batchId: string,
  pageNo: number,
  slotNo: number
): string {
  const safeBatchId = String(batchId ?? "").trim()
  if (!safeBatchId || safeBatchId.includes("..") || /[/\\]/.test(safeBatchId)) {
    throw new CatalogImageError("Invalid batch id", "INVALID_BATCH_ID", 400)
  }
  if (!Number.isInteger(pageNo) || pageNo < 1) {
    throw new CatalogImageError("Invalid page number", "INVALID_PAGE_NO", 400)
  }
  if (!Number.isInteger(slotNo) || slotNo < 1) {
    throw new CatalogImageError("Invalid slot number", "INVALID_SLOT_NO", 400)
  }

  const workDir = getCatalogImageWorkDir()
  const resolved = path.resolve(
    workDir,
    safeBatchId,
    `page-${pageNo}`,
    `slot-${slotNo}.png`
  )
  if (!isInsideDir(resolved, workDir)) {
    throw new CatalogImageError("Path traversal detected", "PATH_TRAVERSAL", 400)
  }
  return resolved
}

export async function ensureCatalogImageDirs(): Promise<void> {
  await fs.mkdir(getCatalogImageInputDir(), { recursive: true })
  await fs.mkdir(getCatalogImageWorkDir(), { recursive: true })
}

export async function ensureCatalogImageFinalDir(): Promise<void> {
  await ensureCatalogImageDirs()
  await fs.mkdir(getCatalogImageFinalDir(), { recursive: true })
}

export async function listInputPdfFiles(): Promise<PdfFileEntry[]> {
  await ensureCatalogImageDirs()
  const inputDir = getCatalogImageInputDir()
  const entries = await fs.readdir(inputDir, { withFileTypes: true })
  const files: PdfFileEntry[] = []

  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!entry.name.toLowerCase().endsWith(".pdf")) continue
    const fullPath = path.join(inputDir, entry.name)
    const stat = await fs.stat(fullPath)
    files.push({
      fileName: entry.name,
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    })
  }

  files.sort((a, b) => a.fileName.localeCompare(b.fileName))
  return files
}

export function resolveWorkBatchDir(batchId: string): string {
  const safeBatchId = String(batchId ?? "").trim()
  if (!safeBatchId || safeBatchId.includes("..") || /[/\\]/.test(safeBatchId)) {
    throw new CatalogImageError("Invalid batch id", "INVALID_BATCH_ID", 400)
  }

  const workDir = getCatalogImageWorkDir()
  const resolved = path.resolve(workDir, safeBatchId)
  if (!isInsideDir(resolved, workDir)) {
    throw new CatalogImageError("Path traversal detected", "PATH_TRAVERSAL", 400)
  }
  if (path.resolve(resolved) === path.resolve(workDir)) {
    throw new CatalogImageError("Invalid batch id", "INVALID_BATCH_ID", 400)
  }
  if (path.resolve(path.dirname(resolved)) !== path.resolve(workDir)) {
    throw new CatalogImageError("Invalid batch id", "INVALID_BATCH_ID", 400)
  }

  return resolved
}

export async function deleteCatalogImageBatch(batchId: string): Promise<void> {
  const batchDir = resolveWorkBatchDir(batchId)
  await fs.rm(batchDir, { recursive: true, force: true })
}

export async function listFinalWorkFiles(): Promise<FinalPngFileEntry[]> {
  await ensureCatalogImageFinalDir()
  const finalDir = getCatalogImageFinalDir()
  const entries = await fs.readdir(finalDir, { withFileTypes: true })
  const files: FinalPngFileEntry[] = []

  for (const entry of entries) {
    if (!entry.isFile()) continue
    if (!entry.name.toLowerCase().endsWith(".png")) continue
    const fullPath = path.join(finalDir, entry.name)
    const stat = await fs.stat(fullPath)
    files.push({
      fileName: entry.name,
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
    })
  }

  files.sort((a, b) => a.fileName.localeCompare(b.fileName))
  return files
}

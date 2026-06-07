import { spawn } from "child_process"
import fs from "fs/promises"
import path from "path"
import { PDF_PAGE_RENDER_SCALE } from "./constants"
import { getCatalogImageWorkDir } from "./config"
import { CatalogImageError } from "./errors"
import type { CropRect } from "@/lib/catalog-image-ui/crop-template"

export type CropCatalogPdfInput = {
  pdfPath: string
  batchId: string
  rotateDeg: number
  columns: number
  rows: number
  cropArea?: CropRect | null
  pageNo?: number
}

export type CropSlotResult = {
  sourcePage: number
  sourceSlot: number
  localFilePath: string
  previewPath: string
}

export type CropPageResult = {
  pageNo: number
  slots: CropSlotResult[]
}

export type CropCatalogPdfResult = {
  batchId: string
  pages: CropPageResult[]
}

export function getCatalogImageCropWorkerPath(): string {
  return path.resolve(process.cwd(), "scripts/catalog-image-crop-worker.mjs")
}

function isInsideDir(resolved: string, root: string): boolean {
  const normalizedRoot = path.resolve(root)
  const normalizedResolved = path.resolve(resolved)
  const relative = path.relative(normalizedRoot, normalizedResolved)
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))
}

function assertCropResultPaths(
  result: CropCatalogPdfResult,
  workDir: string
): CropCatalogPdfResult {
  for (const page of result.pages) {
    for (const slot of page.slots) {
      if (!isInsideDir(slot.localFilePath, workDir)) {
        throw new CatalogImageError(
          "Crop worker returned path outside work directory",
          "PATH_TRAVERSAL",
          500
        )
      }
      if (!isInsideDir(slot.previewPath, workDir)) {
        throw new CatalogImageError(
          "Crop worker returned preview path outside work directory",
          "PATH_TRAVERSAL",
          500
        )
      }
    }
  }
  return result
}

type WorkerInput = {
  pdfPath: string
  workDir: string
  batchId: string
  rotateDeg: number
  columns: number
  rows: number
  renderScale: number
  cropX?: number
  cropY?: number
  cropWidth?: number
  cropHeight?: number
  pageNo?: number
}

export async function runCatalogImageCropWorker(
  input: WorkerInput,
  workerPath: string = getCatalogImageCropWorkerPath()
): Promise<CropCatalogPdfResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [workerPath], {
      stdio: ["pipe", "pipe", "pipe"],
    })

    const stdoutChunks: Buffer[] = []
    const stderrChunks: Buffer[] = []

    child.stdout.on("data", (chunk: Buffer) => stdoutChunks.push(chunk))
    child.stderr.on("data", (chunk: Buffer) => stderrChunks.push(chunk))

    child.on("error", (err) => reject(err))

    child.on("close", (code) => {
      const stderr = Buffer.concat(stderrChunks).toString("utf8").trim()
      if (code !== 0) {
        if (stderr) {
          console.error("catalog-image crop worker stderr:", stderr)
        }
        if (stderr.includes("INVALID_CROP_TEMPLATE")) {
          reject(
            new CatalogImageError(
              "Invalid crop template",
              "INVALID_CROP_TEMPLATE",
              400
            )
          )
          return
        }
        reject(
          new CatalogImageError("PDF crop failed", "PDF_CROP_FAILED", 500)
        )
        return
      }

      const stdout = Buffer.concat(stdoutChunks).toString("utf8").trim()
      try {
        const parsed = JSON.parse(stdout) as CropCatalogPdfResult
        resolve(parsed)
      } catch (err) {
        console.error("catalog-image crop worker stdout parse failed:", err)
        if (stderr) {
          console.error("catalog-image crop worker stderr:", stderr)
        }
        reject(
          new CatalogImageError("PDF crop failed", "PDF_CROP_FAILED", 500)
        )
      }
    })

    child.stdin.write(JSON.stringify(input))
    child.stdin.end()
  })
}

function buildWorkerInput(
  input: CropCatalogPdfInput,
  workDir: string
): WorkerInput {
  const workerInput: WorkerInput = {
    pdfPath: input.pdfPath,
    workDir,
    batchId: input.batchId,
    rotateDeg: input.rotateDeg,
    columns: input.columns,
    rows: input.rows,
    renderScale: PDF_PAGE_RENDER_SCALE,
  }

  if (input.cropArea) {
    workerInput.cropX = input.cropArea.cropX
    workerInput.cropY = input.cropArea.cropY
    workerInput.cropWidth = input.cropArea.cropWidth
    workerInput.cropHeight = input.cropArea.cropHeight
  }

  if (input.pageNo != null) {
    workerInput.pageNo = input.pageNo
  }

  return workerInput
}

export async function cropCatalogPdf(
  input: CropCatalogPdfInput
): Promise<CropCatalogPdfResult> {
  const { pdfPath, batchId, rotateDeg, columns, rows } = input

  if (columns < 1 || rows < 1) {
    throw new CatalogImageError(
      "Columns and rows must be at least 1",
      "VALIDATION_ERROR",
      400
    )
  }

  const workerPath = getCatalogImageCropWorkerPath()
  try {
    await fs.access(workerPath)
  } catch {
    throw new CatalogImageError(
      "PDF crop is not available",
      "NOT_IMPLEMENTED",
      501
    )
  }

  const workDir = getCatalogImageWorkDir()
  const result = await runCatalogImageCropWorker(
    buildWorkerInput(input, workDir)
  )

  return assertCropResultPaths(result, workDir)
}

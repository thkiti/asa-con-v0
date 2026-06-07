import { spawn } from "child_process"
import fs from "fs/promises"
import path from "path"
import { PDF_PAGE_RENDER_SCALE } from "./constants"
import { CatalogImageError } from "./errors"

export function getCatalogImagePagePreviewWorkerPath(): string {
  return path.resolve(
    process.cwd(),
    "scripts/catalog-image-page-preview-worker.mjs"
  )
}

export async function runCatalogImagePagePreviewWorker(
  input: {
    pdfPath: string
    rotateDeg: number
    renderScale?: number
    pageNo?: number
  },
  workerPath: string = getCatalogImagePagePreviewWorkerPath()
): Promise<Buffer> {
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
          console.error("catalog-image page-preview worker stderr:", stderr)
        }
        reject(
          new CatalogImageError(
            "Page preview failed",
            "PAGE_PREVIEW_FAILED",
            500
          )
        )
        return
      }

      const buffer = Buffer.concat(stdoutChunks)
      const pngSignature = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ])
      if (buffer.length < 8 || !buffer.subarray(0, 8).equals(pngSignature)) {
        if (stderr) {
          console.error("catalog-image page-preview worker stderr:", stderr)
        }
        reject(
          new CatalogImageError(
            "Page preview failed",
            "PAGE_PREVIEW_FAILED",
            500
          )
        )
        return
      }

      resolve(buffer)
    })

    child.stdin.write(JSON.stringify(input))
    child.stdin.end()
  })
}

export async function renderCatalogPagePreview(
  pdfPath: string,
  rotateDeg: number,
  pageNo: number = 1
): Promise<Buffer> {
  const workerPath = getCatalogImagePagePreviewWorkerPath()
  try {
    await fs.access(workerPath)
  } catch {
    throw new CatalogImageError(
      "Page preview is not available",
      "NOT_IMPLEMENTED",
      501
    )
  }

  return runCatalogImagePagePreviewWorker(
    { pdfPath, rotateDeg, renderScale: PDF_PAGE_RENDER_SCALE, pageNo },
    workerPath
  )
}

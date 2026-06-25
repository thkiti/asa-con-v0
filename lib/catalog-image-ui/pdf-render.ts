import { PDF_PAGE_RENDER_SCALE } from "@/lib/catalog-image/constants"
import type { CropTemplate } from "./crop-template"
import {
  computeSlotRects,
  resolveCropArea,
  type CropArea,
} from "./crop-slot-grid"

type PdfJsModule = typeof import("pdfjs-dist")

let pdfJsModulePromise: Promise<PdfJsModule> | null = null
let workerConfigured = false

async function loadPdfJs(): Promise<PdfJsModule> {
  if (!pdfJsModulePromise) {
    pdfJsModulePromise = import("pdfjs-dist").then((pdfjs) => {
      if (typeof window !== "undefined" && !workerConfigured) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`
        workerConfigured = true
      }
      return pdfjs
    })
  }
  return pdfJsModulePromise
}

export type RenderCatalogPdfPageParams = {
  file: File
  pageNo?: number
  rotateDeg?: number
  renderScale?: number
}

export type RenderCatalogPdfPageResult = {
  blobUrl: string
  width: number
  height: number
}

export type CropCatalogPdfSlotsParams = {
  file: File
  pageNo?: number
  rotateDeg?: number
  columns: number
  rows: number
  cropArea?: CropArea | CropTemplate | null
  renderScale?: number
}

export type CropCatalogPdfSlotResult = {
  sourcePage: number
  sourceSlot: number
  blob: Blob
}

function rotateCanvas(
  source: HTMLCanvasElement,
  rotateDeg: number
): HTMLCanvasElement {
  const radians = (rotateDeg * Math.PI) / 180
  const sin = Math.abs(Math.sin(radians))
  const cos = Math.abs(Math.cos(radians))
  const width = source.width
  const height = source.height
  const nextWidth = Math.max(1, Math.floor(width * cos + height * sin))
  const nextHeight = Math.max(1, Math.floor(width * sin + height * cos))

  const canvas = document.createElement("canvas")
  canvas.width = nextWidth
  canvas.height = nextHeight
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Canvas 2D context is not available")
  }

  ctx.translate(nextWidth / 2, nextHeight / 2)
  ctx.rotate(radians)
  ctx.drawImage(source, -width / 2, -height / 2)
  return canvas
}

function extractCanvasRegion(
  source: HTMLCanvasElement,
  rect: { left: number; top: number; width: number; height: number }
): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = Math.max(1, rect.width)
  canvas.height = Math.max(1, rect.height)
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Canvas 2D context is not available")
  }
  ctx.drawImage(
    source,
    rect.left,
    rect.top,
    rect.width,
    rect.height,
    0,
    0,
    rect.width,
    rect.height
  )
  return canvas
}

async function canvasToPngBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to export PNG from canvas"))
          return
        }
        resolve(blob)
      },
      "image/png"
    )
  })
}

async function renderPdfPageCanvas(
  file: File,
  pageNo: number,
  renderScale: number
): Promise<HTMLCanvasElement> {
  const pdfjs = await loadPdfJs()
  const data = new Uint8Array(await file.arrayBuffer())
  const task = pdfjs.getDocument({ data })
  const pdf = await task.promise

  if (pageNo < 1 || pageNo > pdf.numPages) {
    await pdf.destroy()
    throw new Error(`Page ${pageNo} not found`)
  }

  const page = await pdf.getPage(pageNo)
  const viewport = page.getViewport({ scale: renderScale })
  const canvas = document.createElement("canvas")
  canvas.width = Math.floor(viewport.width)
  canvas.height = Math.floor(viewport.height)
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    await pdf.destroy()
    throw new Error("Canvas 2D context is not available")
  }

  await page.render({ canvas, canvasContext: ctx, viewport }).promise
  await pdf.destroy()
  return canvas
}

export async function renderCatalogPdfPagePreview(
  params: RenderCatalogPdfPageParams
): Promise<RenderCatalogPdfPageResult> {
  const pageNo = params.pageNo ?? 1
  const rotateDeg = Number(params.rotateDeg ?? 180)
  const renderScale = params.renderScale ?? PDF_PAGE_RENDER_SCALE

  const pageCanvas = await renderPdfPageCanvas(params.file, pageNo, renderScale)
  const rotatedCanvas = rotateCanvas(pageCanvas, rotateDeg)
  const blob = await canvasToPngBlob(rotatedCanvas)
  const blobUrl = URL.createObjectURL(blob)

  return {
    blobUrl,
    width: rotatedCanvas.width,
    height: rotatedCanvas.height,
  }
}

export async function cropCatalogPdfPageSlots(
  params: CropCatalogPdfSlotsParams
): Promise<CropCatalogPdfSlotResult[]> {
  const pageNo = params.pageNo ?? 1
  const rotateDeg = Number(params.rotateDeg ?? 180)
  const renderScale = params.renderScale ?? PDF_PAGE_RENDER_SCALE
  const columns = Number(params.columns)
  const rows = Number(params.rows)

  const pageCanvas = await renderPdfPageCanvas(params.file, pageNo, renderScale)
  const rotatedCanvas = rotateCanvas(pageCanvas, rotateDeg)
  const area = resolveCropArea(
    params.cropArea ?? null,
    rotatedCanvas.width,
    rotatedCanvas.height
  )

  const croppedCanvas = extractCanvasRegion(rotatedCanvas, {
    left: area.cropX,
    top: area.cropY,
    width: area.cropWidth,
    height: area.cropHeight,
  })

  const slotRects = computeSlotRects(
    croppedCanvas.width,
    croppedCanvas.height,
    columns,
    rows
  )

  const slots: CropCatalogPdfSlotResult[] = []
  for (let index = 0; index < slotRects.length; index += 1) {
    const rect = slotRects[index]!
    const slotCanvas = extractCanvasRegion(croppedCanvas, rect)
    const blob = await canvasToPngBlob(slotCanvas)
    slots.push({
      sourcePage: pageNo,
      sourceSlot: index + 1,
      blob,
    })
  }

  return slots
}

export function revokeCatalogPdfBlobUrl(blobUrl: string | null | undefined): void {
  if (blobUrl && blobUrl.startsWith("blob:")) {
    URL.revokeObjectURL(blobUrl)
  }
}

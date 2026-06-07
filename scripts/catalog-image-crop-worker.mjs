import fs from "fs/promises"
import path from "path"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const sharp = require("sharp")
const { pdf } = await import("pdf-to-img")

async function readInput() {
  const arg = process.argv[2]
  if (arg) {
    const raw = await fs.readFile(arg, "utf8")
    return JSON.parse(raw)
  }
  const chunks = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim()
  if (!raw) throw new Error("No input provided")
  return JSON.parse(raw)
}

function failInvalidCrop(message) {
  console.error(`INVALID_CROP_TEMPLATE: ${message}`)
  process.exit(2)
}

function resolveCropArea(cropArea, pageWidth, pageHeight) {
  if (!cropArea) {
    return { cropX: 0, cropY: 0, cropWidth: pageWidth, cropHeight: pageHeight }
  }

  const cropX = Math.round(Number(cropArea.cropX ?? 0))
  const cropY = Math.round(Number(cropArea.cropY ?? 0))
  const cropWidth = Math.round(Number(cropArea.cropWidth ?? 0))
  const cropHeight = Math.round(Number(cropArea.cropHeight ?? 0))

  if (cropWidth <= 0 || cropHeight <= 0) {
    failInvalidCrop("cropWidth and cropHeight must be greater than zero")
  }
  if (cropX < 0 || cropY < 0) {
    failInvalidCrop("cropX and cropY must be non-negative")
  }
  if (cropX + cropWidth > pageWidth || cropY + cropHeight > pageHeight) {
    failInvalidCrop("crop area is outside page bounds")
  }

  return { cropX, cropY, cropWidth, cropHeight }
}

async function cropPageIntoSlots(
  pageBuffer,
  pageNo,
  batchId,
  workDir,
  rotateDeg,
  columns,
  rows,
  cropArea
) {
  const pageDir = path.join(workDir, batchId, `page-${pageNo}`)
  await fs.mkdir(pageDir, { recursive: true })

  const rotated = await sharp(pageBuffer).rotate(rotateDeg).png().toBuffer()
  const meta = await sharp(rotated).metadata()
  const pageWidth = meta.width ?? 0
  const pageHeight = meta.height ?? 0

  if (pageWidth === 0 || pageHeight === 0) {
    throw new Error(`Invalid page dimensions for page ${pageNo}`)
  }

  const area = resolveCropArea(cropArea, pageWidth, pageHeight)
  const cropped = await sharp(rotated)
    .extract({
      left: area.cropX,
      top: area.cropY,
      width: area.cropWidth,
      height: area.cropHeight,
    })
    .png()
    .toBuffer()

  const croppedMeta = await sharp(cropped).metadata()
  const width = croppedMeta.width ?? 0
  const height = croppedMeta.height ?? 0

  const slotWidth = Math.floor(width / columns)
  const slotHeight = Math.floor(height / rows)
  const slots = []
  let slotNo = 1

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < columns; col++) {
      const left = col * slotWidth
      const top = row * slotHeight
      const extractWidth = col === columns - 1 ? width - left : slotWidth
      const extractHeight = row === rows - 1 ? height - top : slotHeight

      const slotPath = path.join(pageDir, `slot-${slotNo}.png`)
      await sharp(cropped)
        .extract({ left, top, width: extractWidth, height: extractHeight })
        .png()
        .toFile(slotPath)

      slots.push({
        sourcePage: pageNo,
        sourceSlot: slotNo,
        localFilePath: slotPath,
        previewPath: slotPath,
      })
      slotNo++
    }
  }

  return slots
}

async function main() {
  const input = await readInput()
  const pdfPath = String(input.pdfPath ?? "")
  const workDir = path.resolve(String(input.workDir ?? ""))
  const batchId = String(input.batchId ?? "")
  const rotateDeg = Number(input.rotateDeg ?? 180)
  const columns = Number(input.columns ?? 3)
  const rows = Number(input.rows ?? 2)
  const renderScale = Number(input.renderScale ?? 2)
  const cropArea =
    input.cropX !== undefined &&
    input.cropY !== undefined &&
    input.cropWidth !== undefined &&
    input.cropHeight !== undefined
      ? {
          cropX: input.cropX,
          cropY: input.cropY,
          cropWidth: input.cropWidth,
          cropHeight: input.cropHeight,
        }
      : null

  if (!pdfPath || !workDir || !batchId) {
    throw new Error("pdfPath, workDir, and batchId are required")
  }
  if (columns < 1 || rows < 1) {
    throw new Error("columns and rows must be at least 1")
  }

  const selectedPageNo =
    input.pageNo !== undefined && input.pageNo !== null
      ? Number(input.pageNo)
      : null

  if (
    selectedPageNo !== null &&
    (!Number.isInteger(selectedPageNo) || selectedPageNo < 1)
  ) {
    throw new Error("pageNo must be a positive integer")
  }

  const document = await pdf(pdfPath, { scale: renderScale })
  const pages = []
  let pageNo = 0

  for await (const image of document) {
    pageNo += 1
    if (selectedPageNo !== null && pageNo !== selectedPageNo) {
      continue
    }

    const slots = await cropPageIntoSlots(
      Buffer.from(image),
      pageNo,
      batchId,
      workDir,
      rotateDeg,
      columns,
      rows,
      cropArea
    )
    pages.push({ pageNo, slots })

    if (selectedPageNo !== null) {
      break
    }
  }

  if (selectedPageNo !== null && pages.length === 0) {
    throw new Error(`Page ${selectedPageNo} not found`)
  }

  process.stdout.write(JSON.stringify({ batchId, pages }))
}

main().catch((err) => {
  console.error("catalog-image-crop-worker failed:", err)
  process.exit(1)
})

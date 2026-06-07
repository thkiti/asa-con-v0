import { randomUUID } from "crypto"
import fs from "fs/promises"
import { getCatalogImageFinalDir } from "./config"
import { cropCatalogPdf } from "./crop-pdf"
import { CatalogImageError } from "./errors"
import {
  assertSafeProductCode,
  deleteCatalogImageBatch,
  resolveInputPdfPath,
} from "./paths"
import { parseOptionalPageNo } from "./parse-page-no"
import {
  saveMatchedCatalogImages,
  type SaveMatchedItemInput,
  type SaveMatchedItemResult,
} from "./save-matched"
import { parseCropAreaInput } from "./validate-crop-template"

export type ConfirmedSaveSlotInput = {
  sourceSlot: number
  productCode: string
}

export type ConfirmedSaveRequest = {
  fileName: string
  pageNo?: number
  rotateDeg?: number
  columns?: number
  rows?: number
  cropX?: number
  cropY?: number
  cropWidth?: number
  cropHeight?: number
  assignedSlots: ConfirmedSaveSlotInput[]
  replace?: boolean
}

export type ConfirmedSaveSlotStatus = "SAVED" | "DUPLICATE" | "ERROR"

export type ConfirmedSaveSlotResult = {
  sourceSlot: number
  productCode: string
  finalFileName: string
  status: ConfirmedSaveSlotStatus
  error?: string
}

export type ConfirmedSaveResult = {
  batchId: string
  finalDir: string
  savedCount: number
  items: ConfirmedSaveSlotResult[]
}

type ProductLookupDb = {
  product: {
    findUnique: (args: {
      where: { code: string }
      select: { id: true }
    }) => Promise<{ id: string } | null>
  }
}

function toSlotError(
  sourceSlot: number,
  productCode: string,
  message: string
): ConfirmedSaveSlotResult {
  let finalFileName = ""
  try {
    finalFileName = `${assertSafeProductCode(productCode)}.png`
  } catch {
    finalFileName = productCode ? `${productCode}.png` : ""
  }

  return {
    sourceSlot,
    productCode,
    finalFileName,
    status: "ERROR",
    error: message,
  }
}

function mapSaveResult(
  sourceSlot: number,
  result: SaveMatchedItemResult
): ConfirmedSaveSlotResult {
  return {
    sourceSlot,
    productCode: result.productCode,
    finalFileName: result.finalFileName,
    status: result.status,
    ...(result.error ? { error: result.error } : {}),
  }
}

export async function confirmedSaveCatalogImages(
  db: ProductLookupDb,
  request: ConfirmedSaveRequest
): Promise<ConfirmedSaveResult> {
  const fileName = String(request.fileName ?? "").trim()
  if (!fileName) {
    throw new CatalogImageError("fileName is required", "VALIDATION_ERROR", 400)
  }

  const assignedSlots = Array.isArray(request.assignedSlots)
    ? request.assignedSlots
    : []
  if (assignedSlots.length === 0) {
    throw new CatalogImageError(
      "assignedSlots is required",
      "VALIDATION_ERROR",
      400
    )
  }

  const pdfPath = resolveInputPdfPath(fileName)
  try {
    await fs.access(pdfPath)
  } catch {
    throw new CatalogImageError("PDF file not found", "FILE_NOT_FOUND", 404)
  }

  const cropArea = parseCropAreaInput(request)
  const pageNo = parseOptionalPageNo(request.pageNo) ?? 1
  const batchId = randomUUID()

  const cropResult = await cropCatalogPdf({
    pdfPath,
    batchId,
    rotateDeg: Number(request.rotateDeg ?? 180),
    columns: Number(request.columns ?? 3),
    rows: Number(request.rows ?? 2),
    cropArea,
    pageNo,
  })

  const page = cropResult.pages.find((entry) => entry.pageNo === pageNo)
  if (!page) {
    await deleteCatalogImageBatch(batchId).catch(() => undefined)
    throw new CatalogImageError(
      `Crop page ${pageNo} was not produced`,
      "CROP_PAGE_NOT_FOUND",
      500
    )
  }

  const slotByNo = new Map(
    page.slots.map((slot) => [slot.sourceSlot, slot] as const)
  )

  const saveItems: SaveMatchedItemInput[] = []
  const slotMeta: number[] = []
  const preErrors: ConfirmedSaveSlotResult[] = []

  for (const assigned of assignedSlots) {
    const sourceSlot = Number(assigned.sourceSlot)
    const productCode = String(assigned.productCode ?? "").trim()
    if (!Number.isInteger(sourceSlot) || sourceSlot < 1) {
      preErrors.push(
        toSlotError(sourceSlot, productCode, "Invalid source slot number")
      )
      continue
    }

    let safeCode: string
    try {
      safeCode = assertSafeProductCode(productCode)
    } catch (err) {
      const message =
        err instanceof CatalogImageError ? err.message : "Invalid product code"
      preErrors.push(toSlotError(sourceSlot, productCode, message))
      continue
    }

    const slot = slotByNo.get(sourceSlot)
    if (!slot) {
      preErrors.push(
        toSlotError(sourceSlot, safeCode, "Crop slot not found")
      )
      continue
    }

    saveItems.push({
      productCode: safeCode,
      localFilePath: slot.localFilePath,
      replace: request.replace === true,
    })
    slotMeta.push(sourceSlot)
  }

  const saveResults = await saveMatchedCatalogImages(db, saveItems)
  const savedItems = saveResults.map((result, index) =>
    mapSaveResult(slotMeta[index], result)
  )

  await deleteCatalogImageBatch(batchId)

  const items = [...preErrors, ...savedItems].sort(
    (a, b) => a.sourceSlot - b.sourceSlot
  )
  const savedCount = items.filter((item) => item.status === "SAVED").length

  return {
    batchId,
    finalDir: getCatalogImageFinalDir(),
    savedCount,
    items,
  }
}

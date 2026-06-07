import type { CropTemplate } from "./crop-template"
import type {
  CatalogImageConfirmedSaveResult,
  CatalogImageCropResult,
  CatalogImageFinalScanResult,
  CatalogImageMatchResult,
  CatalogImageSaveMatchedResult,
  CatalogImageScanResult,
  CatalogImageUploadToCloudResult,
} from "./types"

export class CatalogImageUiError extends Error {
  readonly code: string | undefined
  readonly httpStatus: number

  constructor(message: string, code?: string, httpStatus = 500) {
    super(message)
    this.name = "CatalogImageUiError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

async function parseJsonError(res: Response): Promise<CatalogImageUiError> {
  let body: { error?: string; code?: string } = {}
  try {
    body = (await res.json()) as { error?: string; code?: string }
  } catch {
    // ignore
  }
  return new CatalogImageUiError(
    body.error ?? `Request failed (${res.status})`,
    body.code,
    res.status
  )
}

function isPdfFile(file: File): boolean {
  const name = String(file.name ?? "").trim().toLowerCase()
  if (name.endsWith(".pdf")) return true
  const type = String(file.type ?? "").trim().toLowerCase()
  return type === "application/pdf" || type === "application/x-pdf"
}

function toUploadPdfFile(file: File): File {
  const type = file.type || "application/pdf"
  return new File([file], file.name, { type, lastModified: file.lastModified })
}

export async function fetchCatalogImageOpenFile(
  file: File
): Promise<{ fileName: string; inputPath: string; originalFileName?: string }> {
  if (!(file instanceof File) || file.size <= 0) {
    throw new CatalogImageUiError(
      "PDF file is required",
      "VALIDATION_ERROR",
      400
    )
  }

  if (!isPdfFile(file)) {
    throw new CatalogImageUiError(
      "Only PDF files are allowed",
      "INVALID_FILE_TYPE",
      400
    )
  }

  const uploadFile = toUploadPdfFile(file)
  const formData = new FormData()
  formData.append("file", uploadFile, uploadFile.name)

  const res = await fetch("/api/operation/catalog-image/open-file", {
    method: "POST",
    body: formData,
  })
  if (!res.ok) throw await parseJsonError(res)
  return (await res.json()) as {
    fileName: string
    inputPath: string
    originalFileName?: string
  }
}

export async function fetchCatalogImageScan(): Promise<CatalogImageScanResult> {
  const res = await fetch("/api/operation/catalog-image/scan")
  if (!res.ok) throw await parseJsonError(res)
  return (await res.json()) as CatalogImageScanResult
}

export type CatalogImageCropPreviewParams = {
  fileName: string
  rotateDeg: number
  columns: number
  rows: number
  pageNo?: number
  cropX?: number
  cropY?: number
  cropWidth?: number
  cropHeight?: number
}

export function buildCropPreviewRequestBody(
  params: CatalogImageCropPreviewParams,
  cropTemplate?: CropTemplate | null
): CatalogImageCropPreviewParams {
  if (!cropTemplate) return params
  return {
    ...params,
    cropX: cropTemplate.cropX,
    cropY: cropTemplate.cropY,
    cropWidth: cropTemplate.cropWidth,
    cropHeight: cropTemplate.cropHeight,
  }
}

export async function fetchCatalogImageCropPreview(
  params: CatalogImageCropPreviewParams
): Promise<CatalogImageCropResult> {
  const res = await fetch("/api/operation/catalog-image/crop-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw await parseJsonError(res)
  return (await res.json()) as CatalogImageCropResult
}

export async function fetchCatalogImageMatchCode(
  rawCode: string
): Promise<CatalogImageMatchResult> {
  const res = await fetch("/api/operation/catalog-image/match-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rawCode }),
  })
  if (!res.ok) throw await parseJsonError(res)
  return (await res.json()) as CatalogImageMatchResult
}

export async function fetchCatalogImageFinalScan(): Promise<CatalogImageFinalScanResult> {
  const res = await fetch("/api/operation/catalog-image/final-scan")
  if (!res.ok) throw await parseJsonError(res)
  return (await res.json()) as CatalogImageFinalScanResult
}

export type CatalogImageSaveMatchedParams = {
  items: Array<{
    productCode: string
    localFilePath: string
    replace?: boolean
  }>
}

export async function fetchCatalogImageSaveMatched(
  params: CatalogImageSaveMatchedParams
): Promise<CatalogImageSaveMatchedResult> {
  const res = await fetch("/api/operation/catalog-image/save-matched", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw await parseJsonError(res)
  return (await res.json()) as CatalogImageSaveMatchedResult
}

export type CatalogImageConfirmedSaveParams = {
  fileName: string
  pageNo?: number
  rotateDeg: number
  columns: number
  rows: number
  cropX?: number
  cropY?: number
  cropWidth?: number
  cropHeight?: number
  assignedSlots: Array<{
    sourceSlot: number
    productCode: string
  }>
  replace?: boolean
}

export function buildConfirmedSaveRequestBody(
  params: {
    fileName: string
    pageNo?: number
    rotateDeg: number
    columns: number
    rows: number
  },
  cropTemplate: CropTemplate,
  assignedSlots: Array<{ sourceSlot: number; productCode: string }>,
  options?: { replace?: boolean }
): CatalogImageConfirmedSaveParams {
  return {
    ...params,
    cropX: cropTemplate.cropX,
    cropY: cropTemplate.cropY,
    cropWidth: cropTemplate.cropWidth,
    cropHeight: cropTemplate.cropHeight,
    assignedSlots,
    replace: options?.replace,
  }
}

export async function fetchCatalogImageConfirmedSave(
  params: CatalogImageConfirmedSaveParams
): Promise<CatalogImageConfirmedSaveResult> {
  const res = await fetch("/api/operation/catalog-image/confirmed-save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw await parseJsonError(res)
  return (await res.json()) as CatalogImageConfirmedSaveResult
}

export async function fetchCatalogImageUpload(params: {
  productCode: string
  localFilePath: string
  replace?: boolean
}): Promise<{ cloudPath: string; publicUrl?: string | null }> {
  const res = await fetch("/api/operation/catalog-image/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })
  if (!res.ok) throw await parseJsonError(res)
  return (await res.json()) as { cloudPath: string; publicUrl?: string | null }
}

export async function fetchCatalogImageUploadToCloud(
  productCodes: string[]
): Promise<CatalogImageUploadToCloudResult> {
  const res = await fetch("/api/operation/catalog-image/upload-to-cloud", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productCodes }),
  })
  if (!res.ok) throw await parseJsonError(res)
  return (await res.json()) as CatalogImageUploadToCloudResult
}

export function catalogImagePreviewUrl(
  batchId: string,
  pageNo: number,
  slotNo: number
): string {
  const params = new URLSearchParams({
    batchId,
    pageNo: String(pageNo),
    slotNo: String(slotNo),
  })
  return `/api/operation/catalog-image/preview?${params.toString()}`
}

export function catalogImagePagePreviewUrl(params: {
  fileName: string
  rotateDeg: number
  pageNo?: number
  refreshKey?: number
}): string {
  const search = new URLSearchParams({
    fileName: params.fileName,
    rotateDeg: String(params.rotateDeg),
    pageNo: String(params.pageNo ?? 1),
  })
  if (params.refreshKey != null && params.refreshKey > 0) {
    search.set("v", String(params.refreshKey))
  }
  return `/api/operation/catalog-image/page-preview?${search.toString()}`
}

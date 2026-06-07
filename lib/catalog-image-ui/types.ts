export type CatalogImagePdfFile = {
  fileName: string
  sizeBytes: number
  modifiedAt: string
}

export type CatalogImageScanResult = {
  inputDir: string
  files: CatalogImagePdfFile[]
}

export type CatalogImageFinalScanResult = {
  finalDir: string
  files: CatalogImagePdfFile[]
}

export type SaveMatchedItemStatus = "SAVED" | "DUPLICATE" | "ERROR"

export type CatalogImageSaveMatchedItemResult = {
  productCode: string
  finalFilePath: string
  finalFileName: string
  status: SaveMatchedItemStatus
  error?: string
}

export type CatalogImageSaveMatchedResult = {
  items: CatalogImageSaveMatchedItemResult[]
}

export type CatalogImageCropSlot = {
  sourcePage: number
  sourceSlot: number
  localFilePath: string
  previewPath: string
}

export type CatalogImageCropPage = {
  pageNo: number
  slots: CatalogImageCropSlot[]
}

export type CatalogImageCropResult = {
  batchId: string
  pages: CatalogImageCropPage[]
}

export type CatalogMatchStatus = "MATCHED" | "UNMATCHED" | "INVALID" | "DUPLICATE" | "SKIPPED"

export type CatalogImageSlotVM = {
  key: string
  sourcePage: number
  sourceSlot: number
  localFilePath: string
  sourceFile: string
  rawCode: string
  productCode: string | null
  finalFileName: string | null
  finalFilePath: string | null
  saveStatus: SaveMatchedItemStatus | null
  saveMessage?: string
  status: CatalogMatchStatus
  productId: string | null
  errorCode?: string
  skipped: boolean
}

export type CatalogImageMatchResult = {
  rawCode: string
  productCode: string | null
  status: "MATCHED" | "UNMATCHED" | "INVALID"
  productId: string | null
  errorCode?: string
}

export type CatalogImageAssignedSlot = {
  sourceSlot: number
  productCode: string
  finalFileName: string
}

export type CatalogImageConfirmedSaveSlotResult = {
  sourceSlot: number
  productCode: string
  finalFileName: string
  status: "SAVED" | "DUPLICATE" | "ERROR"
  error?: string
}

export type CatalogImageConfirmedSaveResult = {
  batchId: string
  finalDir: string
  savedCount: number
  items: CatalogImageConfirmedSaveSlotResult[]
}

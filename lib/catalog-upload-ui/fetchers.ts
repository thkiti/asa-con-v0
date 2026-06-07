import type { CatalogUploadScanRow } from "@/lib/catalog-upload/scan-local-images"

export class CatalogUploadUiError extends Error {
  readonly code: string | undefined
  readonly httpStatus: number

  constructor(message: string, code?: string, httpStatus = 500) {
    super(message)
    this.name = "CatalogUploadUiError"
    this.code = code
    this.httpStatus = httpStatus
  }
}

async function parseJsonError(res: Response): Promise<CatalogUploadUiError> {
  let body: { error?: string; code?: string } = {}
  try {
    body = (await res.json()) as { error?: string; code?: string }
  } catch {
    // ignore
  }
  return new CatalogUploadUiError(
    body.error ?? `Request failed (${res.status})`,
    body.code,
    res.status
  )
}

export type CatalogUploadScanResult = {
  imageDir: string
  rows: CatalogUploadScanRow[]
  duplicateBasenames: string[]
}

export async function fetchCatalogUploadScan(): Promise<CatalogUploadScanResult> {
  const res = await fetch("/api/operation/catalog-upload/scan")
  if (!res.ok) throw await parseJsonError(res)
  return (await res.json()) as CatalogUploadScanResult
}

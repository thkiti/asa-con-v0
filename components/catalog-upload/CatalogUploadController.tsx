"use client"

import { useCallback, useState } from "react"
import { fetchCatalogUploadScan } from "@/lib/catalog-upload-ui/fetchers"
import type { CatalogUploadScanRow } from "@/lib/catalog-upload/scan-local-images"
import { CatalogUploadView } from "./CatalogUploadView"

export function CatalogUploadController() {
  const [imageDir, setImageDir] = useState<string | null>(null)
  const [rows, setRows] = useState<CatalogUploadScanRow[]>([])
  const [duplicateBasenames, setDuplicateBasenames] = useState<string[]>([])
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleScan = useCallback(async () => {
    setScanning(true)
    setError(null)
    try {
      const result = await fetchCatalogUploadScan()
      setImageDir(result.imageDir)
      setRows(result.rows)
      setDuplicateBasenames(result.duplicateBasenames)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Scan failed")
    } finally {
      setScanning(false)
    }
  }, [])

  return (
    <CatalogUploadView
      imageDir={imageDir}
      rows={rows}
      duplicateBasenames={duplicateBasenames}
      scanning={scanning}
      error={error}
      onScan={handleScan}
    />
  )
}

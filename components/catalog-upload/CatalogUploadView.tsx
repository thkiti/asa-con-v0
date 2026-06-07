"use client"

import type { CatalogUploadScanRow } from "@/lib/catalog-upload/scan-local-images"
import {
  themeBtnPrimary,
  themeMenuGroup,
  themeMuted,
} from "@/lib/theme/theme-classes"

type CatalogUploadViewProps = {
  imageDir: string | null
  rows: CatalogUploadScanRow[]
  duplicateBasenames: string[]
  scanning: boolean
  error: string | null
  onScan: () => void
}

function formatBytes(sizeBytes: number): string {
  if (sizeBytes < 1024) return `${sizeBytes} B`
  if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} KB`
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export function CatalogUploadView({
  imageDir,
  rows,
  duplicateBasenames,
  scanning,
  error,
  onScan,
}: CatalogUploadViewProps) {
  return (
    <div className="space-y-4">
      <section className={themeMenuGroup}>
        <h2 className="text-sm font-semibold text-card-foreground">
          Catalog images folder
        </h2>
        <p className={`mt-2 font-mono text-sm ${themeMuted}`}>
          {imageDir ?? "Scan to load folder path"}
        </p>
        <button
          type="button"
          className={`${themeBtnPrimary} mt-4`}
          onClick={onScan}
          disabled={scanning}
        >
          {scanning ? "Scanning…" : "Scan Images"}
        </button>
      </section>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}

      {duplicateBasenames.length > 0 ? (
        <p className="text-sm text-amber-700" role="status">
          Duplicate product codes: {duplicateBasenames.join(", ")}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <section className={themeMenuGroup}>
          <h2 className="text-sm font-semibold text-card-foreground">
            Scan results ({rows.length})
          </h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-2 py-2">Product code</th>
                  <th className="px-2 py-2">File name</th>
                  <th className="px-2 py-2">Extension</th>
                  <th className="px-2 py-2">Product</th>
                  <th className="px-2 py-2">Local</th>
                  <th className="px-2 py-2">Size</th>
                  <th className="px-2 py-2">Modified</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.productCode}-${row.fileName}`}
                    className="border-b border-border"
                  >
                    <td className="px-2 py-2 font-mono">{row.productCode}</td>
                    <td className="px-2 py-2 font-mono">{row.fileName}</td>
                    <td className="px-2 py-2">{row.extension}</td>
                    <td className="px-2 py-2">{row.productStatus}</td>
                    <td className="px-2 py-2">{row.localStatus}</td>
                    <td className="px-2 py-2">{formatBytes(row.sizeBytes)}</td>
                    <td className="px-2 py-2">{formatDate(row.modifiedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}

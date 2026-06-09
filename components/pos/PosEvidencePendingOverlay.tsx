"use client"

import { useRef, useState } from "react"
import type { PendingPaymentEvidenceRow } from "@/lib/pos/pending-payment-evidence-types"
import { uploadPaymentEvidenceSlip } from "@/lib/pos-ui/payment-evidence-upload-client"
import { PosEvidenceMobileQrModal } from "./PosEvidenceMobileQrModal"

type PosEvidencePendingOverlayProps = {
  receipts: PendingPaymentEvidenceRow[]
  loading: boolean
  error: string | null
  branchCode: string
  branchName: string
  onClose: () => void
  onUploadSuccess: () => void
  onQrModalOpenChange?: (open: boolean) => void
}

function formatIssuedAt(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function formatMoney(value: string): string {
  const n = Number(value)
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function PosEvidencePendingOverlay({
  receipts,
  loading,
  error,
  branchCode,
  branchName,
  onClose,
  onUploadSuccess,
  onQrModalOpenChange,
}: PosEvidencePendingOverlayProps) {
  const [uploadingReceiptNo, setUploadingReceiptNo] = useState<string | null>(
    null
  )
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [mobileQrRow, setMobileQrRow] =
    useState<PendingPaymentEvidenceRow | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  function openMobileQr(row: PendingPaymentEvidenceRow) {
    setMobileQrRow(row)
    onQrModalOpenChange?.(true)
  }

  function closeMobileQr() {
    setMobileQrRow(null)
    onQrModalOpenChange?.(false)
  }

  async function handleFileSelected(
    receiptNo: string,
    fileList: FileList | null
  ) {
    const file = fileList?.[0]
    if (!file) return

    setUploadingReceiptNo(receiptNo)
    setRowErrors((prev) => {
      const next = { ...prev }
      delete next[receiptNo]
      return next
    })

    const result = await uploadPaymentEvidenceSlip({
      file,
      receiptNo,
      fileName: file.name || `${receiptNo}.jpg`,
    })

    setUploadingReceiptNo(null)

    if (
      result.ok ||
      (!result.ok && result.code === "EVIDENCE_ALREADY_UPLOADED")
    ) {
      onUploadSuccess()
      return
    }

    setRowErrors((prev) => ({
      ...prev,
      [receiptNo]: result.error,
    }))
  }

  return (
    <>
      {mobileQrRow ? (
        <PosEvidenceMobileQrModal
          row={mobileQrRow}
          branchCode={branchCode}
          branchName={branchName}
          onClose={closeMobileQr}
        />
      ) : null}
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-3 sm:p-4"
        data-testid="pos-evidence-pending-overlay"
      >
        <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-zinc-600 bg-zinc-900 text-white shadow-2xl">
          <header className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-700 px-4 py-3">
            <div>
              <h2 className="text-lg font-bold">Bank Transfer Slip Pending</h2>
              <p className="mt-1 text-sm text-zinc-300">
                Upload slip image for each receipt below. Sale stays valid until
                slip is uploaded.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded border border-zinc-500 bg-zinc-800 px-3 py-1.5 text-sm font-semibold hover:bg-zinc-700"
            >
              Close
            </button>
          </header>

          {error ? (
            <p
              className="shrink-0 px-4 py-2 text-sm text-red-300"
              role="alert"
              data-testid="pos-evidence-pending-error"
            >
              {error}
            </p>
          ) : null}

          <div className="min-h-0 flex-1 overflow-auto px-4 py-3">
            {loading ? (
              <p className="py-8 text-center text-sm text-zinc-300">
                Loading pending receipts…
              </p>
            ) : receipts.length === 0 ? (
              <p
                className="py-8 text-center text-sm text-zinc-300"
                data-testid="pos-evidence-pending-empty"
              >
                No pending bank transfer slips.
              </p>
            ) : (
              <table
                className="min-w-full text-sm"
                data-testid="pos-evidence-pending-table"
              >
                <thead>
                  <tr className="border-b border-zinc-700 text-left text-xs uppercase tracking-wide text-zinc-400">
                    <th className="px-2 py-2 font-semibold">Receipt No</th>
                    <th className="px-2 py-2 font-semibold">Issued At</th>
                    <th className="px-2 py-2 text-right font-semibold">Total</th>
                    <th className="px-2 py-2 font-semibold">Staff</th>
                    <th className="px-2 py-2 font-semibold">Upload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800">
                  {receipts.map((row) => {
                    const busy = uploadingReceiptNo === row.receiptNo
                    const rowError = rowErrors[row.receiptNo]
                    return (
                      <tr
                        key={row.evidenceId}
                        data-testid="pos-evidence-pending-row"
                        data-receipt-no={row.receiptNo}
                      >
                        <td className="px-2 py-2 font-mono text-xs">
                          {row.receiptNo}
                        </td>
                        <td className="px-2 py-2 tabular-nums">
                          {formatIssuedAt(row.issuedAt)}
                        </td>
                        <td className="px-2 py-2 text-right tabular-nums">
                          {formatMoney(row.total)}
                        </td>
                        <td className="px-2 py-2">{row.staff ?? "—"}</td>
                        <td className="px-2 py-2">
                          <input
                            ref={(el) => {
                              fileInputRefs.current[row.receiptNo] = el
                            }}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={busy}
                            onChange={(event) => {
                              void handleFileSelected(
                                row.receiptNo,
                                event.target.files
                              )
                              event.target.value = ""
                            }}
                          />
                          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openMobileQr(row)}
                              className="rounded bg-lime-600 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
                              data-testid="pos-evidence-pending-mobile-upload"
                            >
                              Mobile Upload
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() =>
                                fileInputRefs.current[row.receiptNo]?.click()
                              }
                              className="rounded border border-zinc-500 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-100 hover:bg-zinc-700 disabled:opacity-50"
                              data-testid="pos-evidence-pending-pc-upload"
                            >
                              {busy ? "Uploading…" : "Upload from PC"}
                            </button>
                          </div>
                          {rowError ? (
                            <p className="mt-1 text-xs text-red-300">
                              {rowError}
                            </p>
                          ) : null}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

"use client"

import Link from "next/link"
import { useState } from "react"
import type { GlAccountImportPreview, GlAccountPreviewRow } from "@/lib/finance/gl-account-import-types"
import {
  applyCoaImport,
  downloadCoaTemplate,
  previewCoaImport,
} from "@/lib/finance-ui/gl-accounts"

type PreviewTab = "inserts" | "updates" | "blocked" | "errors"

export function GlAccountImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<GlAccountImportPreview | null>(null)
  const [tab, setTab] = useState<PreviewTab>("inserts")
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [applyMessage, setApplyMessage] = useState<string | null>(null)

  async function handlePreview() {
    if (!file) {
      setError("Select a CSV file first")
      return
    }
    setLoading(true)
    setError(null)
    setApplyMessage(null)
    try {
      const result = await previewCoaImport(file)
      setPreview(result)
      if (result.summary.insertCount > 0) setTab("inserts")
      else if (result.summary.updateCount > 0) setTab("updates")
      else if (result.summary.blockedCount > 0) setTab("blocked")
      else if (result.summary.errorCount > 0) setTab("errors")
    } catch (err) {
      setPreview(null)
      setError(err instanceof Error ? err.message : "Preview failed")
    } finally {
      setLoading(false)
    }
  }

  async function handleApply() {
    if (!file) {
      setError("Select a CSV file first")
      return
    }
    if (
      preview &&
      (preview.summary.errorCount > 0 || preview.summary.blockedCount > 0)
    ) {
      setError("Fix errors and blocked rows before applying")
      return
    }
    setApplying(true)
    setError(null)
    try {
      const result = await applyCoaImport(file)
      setApplyMessage(
        `Import complete: ${result.inserted} inserted, ${result.updated} updated.`
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed")
    } finally {
      setApplying(false)
    }
  }

  const canApply =
    preview != null &&
    preview.summary.errorCount === 0 &&
    preview.summary.blockedCount === 0 &&
    (preview.summary.insertCount > 0 || preview.summary.updateCount > 0)

  const tabRows: GlAccountPreviewRow[] =
    preview == null
      ? []
      : tab === "inserts"
        ? preview.inserts
        : tab === "updates"
          ? preview.updates
          : tab === "blocked"
            ? preview.blocked
            : []

  return (
    <div className="space-y-6">
      <p className="text-sm text-zinc-600">
        Upload a CSV chart of accounts. Preview changes before apply. Accounts
        not in the file are never deleted.{" "}
        <button
          type="button"
          className="underline"
          onClick={() => downloadCoaTemplate()}
        >
          Download template
        </button>
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null)
            setPreview(null)
            setApplyMessage(null)
            setError(null)
          }}
        />
        <button
          type="button"
          className="rounded border border-zinc-300 bg-white px-3 py-1.5 text-sm hover:bg-zinc-50 disabled:opacity-50"
          onClick={() => void handlePreview()}
          disabled={!file || loading}
        >
          {loading ? "Previewing…" : "Preview"}
        </button>
        <button
          type="button"
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
          onClick={() => void handleApply()}
          disabled={!file || !canApply || applying}
        >
          {applying ? "Applying…" : "Apply import"}
        </button>
        <Link href="/finance/accounts" className="text-sm underline">
          Back to browser
        </Link>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {applyMessage ? (
        <p className="text-sm text-green-700">{applyMessage}</p>
      ) : null}

      {preview ? (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4 text-sm">
            <span>Inserts: {preview.summary.insertCount}</span>
            <span>Updates: {preview.summary.updateCount}</span>
            <span>Blocked: {preview.summary.blockedCount}</span>
            <span>Errors: {preview.summary.errorCount}</span>
            <span>Warnings: {preview.summary.warningCount}</span>
          </div>

          {preview.warnings.length > 0 ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-amber-800">
              {preview.warnings.map((w, i) => (
                <li key={i}>{w}</li>
              ))}
            </ul>
          ) : null}

          <div className="flex gap-2 border-b border-zinc-200 text-sm">
            {(
              [
                ["inserts", "Inserts"],
                ["updates", "Updates"],
                ["blocked", "Blocked"],
                ["errors", "Errors"],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={`border-b-2 px-2 py-1 ${
                  tab === key
                    ? "border-zinc-900 text-zinc-900"
                    : "border-transparent text-zinc-500"
                }`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "errors" ? (
            <ErrorTable errors={preview.errors} />
          ) : (
            <PreviewTable rows={tabRows} />
          )}
        </div>
      ) : null}
    </div>
  )
}

function PreviewTable({ rows }: { rows: GlAccountPreviewRow[] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">No rows in this tab.</p>
  }
  return (
    <div className="overflow-x-auto rounded border border-zinc-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-3 py-2">Row</th>
            <th className="px-3 py-2">Action</th>
            <th className="px-3 py-2">Code</th>
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Type</th>
            <th className="px-3 py-2">Parent</th>
            <th className="px-3 py-2">Changes / notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.rowNumber}-${row.accountCode}`} className="border-t">
              <td className="px-3 py-2">{row.rowNumber}</td>
              <td className="px-3 py-2">
                <span
                  className={
                    row.action === "BLOCKED"
                      ? "text-red-700"
                      : row.action === "INSERT"
                        ? "text-green-700"
                        : "text-blue-700"
                  }
                >
                  {row.action}
                  {row.blockReason ? ` (${row.blockReason})` : ""}
                </span>
              </td>
              <td className="px-3 py-2 font-mono">{row.accountCode}</td>
              <td className="px-3 py-2">{row.accountName}</td>
              <td className="px-3 py-2">{row.accountType}</td>
              <td className="px-3 py-2 font-mono">{row.parentAccountCode ?? "—"}</td>
              <td className="px-3 py-2 text-xs text-zinc-600">
                {row.changes?.map((c) => `${c.field}: ${c.before} → ${c.after}`).join("; ")}
                {row.warnings?.length ? ` ${row.warnings.join("; ")}` : ""}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ErrorTable({
  errors,
}: {
  errors: GlAccountImportPreview["errors"]
}) {
  if (errors.length === 0) {
    return <p className="text-sm text-zinc-500">No errors.</p>
  }
  return (
    <div className="overflow-x-auto rounded border border-zinc-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-zinc-50 text-zinc-600">
          <tr>
            <th className="px-3 py-2">Row</th>
            <th className="px-3 py-2">Account</th>
            <th className="px-3 py-2">Error code</th>
            <th className="px-3 py-2">Message</th>
          </tr>
        </thead>
        <tbody>
          {errors.map((e, i) => (
            <tr key={i} className="border-t">
              <td className="px-3 py-2">{e.rowNumber ?? "—"}</td>
              <td className="px-3 py-2 font-mono">{e.accountCode ?? "—"}</td>
              <td className="px-3 py-2">{e.code}</td>
              <td className="px-3 py-2">{e.message}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

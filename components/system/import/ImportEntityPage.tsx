"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  fetchImportReport,
  fetchImportReports,
  fetchImportStatus,
  postImportApply,
  postImportDryRun,
  postLogout,
} from "@/lib/system-ui/import-fetchers"
import {
  formatImportOutcomeFailure,
  formatImportOutcomeSuccess,
  hasMoreImportOutcomeErrors,
  previewImportOutcomeErrors,
} from "@/lib/system-ui/import-format"
import { getImportEntityConfig } from "@/lib/system-ui/import-entity-config"
import type {
  ImportApiResultView,
  ImportEntityKey,
  ImportReportView,
  ImportStatusResponse,
} from "@/lib/system-ui/import-types"
import { canEnableApplyFromResult } from "@/lib/system-ui/import-state"
import { ApplyConfirmDialog } from "./ApplyConfirmDialog"
import { ArchiveStatusPanel } from "./ArchiveStatusPanel"
import { ImportReportSummary } from "./ImportReportSummary"
import { StaffImportNotices } from "./StaffImportNotices"
import { SystemImportShell } from "./SystemImportShell"

type ImportEntityPageProps = {
  entity: ImportEntityKey
}

export function ImportEntityPage({ entity }: ImportEntityPageProps) {
  const router = useRouter()
  const config = useMemo(() => getImportEntityConfig(entity), [entity])

  const [status, setStatus] = useState<ImportStatusResponse | null>(null)
  const [dryRunResult, setDryRunResult] = useState<ImportApiResultView | null>(null)
  const [latestReport, setLatestReport] = useState<ImportReportView | null>(null)
  const [lastApplyResult, setLastApplyResult] = useState<ImportApiResultView | null>(null)
  const [loading, setLoading] = useState(true)
  const [dryRunPending, setDryRunPending] = useState(false)
  const [applyPending, setApplyPending] = useState(false)
  const [logoutPending, setLogoutPending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applyEnabled = canEnableApplyFromResult(dryRunResult)
  const outcomeBanner = lastApplyResult ?? dryRunResult

  const loadPage = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [statusPayload, reportsPayload] = await Promise.all([
        fetchImportStatus(),
        fetchImportReports(entity),
      ])
      setStatus(statusPayload)

      const latestDryRun = reportsPayload.reports.find(
        (item) => item.mode === "dry-run" && item.entity === entity
      )
      const latestAny = reportsPayload.reports[0]

      if (latestDryRun) {
        const report = await fetchImportReport(latestDryRun.reportId)
        if (report.totals.errors === 0) {
          setDryRunResult({
            success: true,
            failed: false,
            mode: "dry-run",
            entity,
            inserted: report.totals.inserted,
            updated: report.totals.updated,
            skipped: report.totals.skipped,
            errors: [],
            warnings: report.phases.flatMap((phase) => phase.warnings),
            report,
          })
        }
      }

      if (latestAny) {
        const report = await fetchImportReport(latestAny.reportId)
        setLatestReport(report)
      } else {
        setLatestReport(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดข้อมูลไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }, [entity])

  useEffect(() => {
    void loadPage()
  }, [loadPage])

  const onDryRun = useCallback(async () => {
    setDryRunPending(true)
    setError(null)
    setLastApplyResult(null)
    try {
      const result = await postImportDryRun(entity)
      setDryRunResult(result)
      setLatestReport(result.report)
    } catch (err) {
      setDryRunResult(null)
      setError(err instanceof Error ? err.message : "Dry Run ไม่สำเร็จ")
    } finally {
      setDryRunPending(false)
    }
  }, [entity])

  const onApplyConfirm = useCallback(async () => {
    if (!dryRunResult?.report.meta?.reportId) return

    setApplyPending(true)
    setError(null)
    try {
      const result = await postImportApply({
        entity,
        dryRunReportId: dryRunResult.report.meta.reportId,
      })
      setLastApplyResult(result)
      setLatestReport(result.report)
      setConfirmOpen(false)

      if (result.failed) {
        setDryRunResult(null)
        return
      }

      setDryRunResult(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply ไม่สำเร็จ")
    } finally {
      setApplyPending(false)
    }
  }, [dryRunResult, entity])

  const onLogout = useCallback(async () => {
    setLogoutPending(true)
    setError(null)
    try {
      const payload = await postLogout()
      router.push(payload.redirectTo ?? "/login")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logout ไม่สำเร็จ")
    } finally {
      setLogoutPending(false)
    }
  }, [router])

  const displayReport = latestReport ?? dryRunResult?.report ?? null

  return (
    <SystemImportShell
      title={config.title}
      onLogout={onLogout}
      logoutPending={logoutPending}
    >
      {loading ? <p className="text-sm text-zinc-600">กำลังโหลด…</p> : null}
      {error ? (
        <p className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          {error}
        </p>
      ) : null}

      {outcomeBanner && !loading ? (
        <div
          className={
            outcomeBanner.success
              ? "mb-4 rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-900"
              : "mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900"
          }
        >
          <p className="font-medium">
            {outcomeBanner.success
              ? formatImportOutcomeSuccess(outcomeBanner)
              : formatImportOutcomeFailure(outcomeBanner)}
          </p>
          {outcomeBanner.failed && outcomeBanner.errors.length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-xs">
              {previewImportOutcomeErrors(outcomeBanner.errors).map((item) => (
                <li key={item}>{item}</li>
              ))}
              {hasMoreImportOutcomeErrors(outcomeBanner.errors) ? (
                <li>…และ error เพิ่มเติม</li>
              ) : null}
            </ul>
          ) : null}
        </div>
      ) : null}

      {status?.productionGuardActive ? (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          โหมด production guard เปิดอยู่ — Apply อาจถูกบล็อกจนกว่าจะตั้งค่า IMPORT_ALLOW_PRODUCTION
        </div>
      ) : null}

      <section className="mb-6 rounded border border-zinc-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-zinc-900">วัตถุประสงค์</h2>
        <p className="mt-2 text-sm text-zinc-700">{config.purpose}</p>
        <p className="mt-2 text-sm text-zinc-600">
          ไฟล์ต้นทาง: {config.sourceFiles.join(", ")}
        </p>
        {config.bootstrapNote ? (
          <p className="mt-3 rounded border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
            {config.bootstrapNote}
          </p>
        ) : null}
        {entity === "staff" ? (
          <StaffImportNotices staffBootstrap={status?.staffBootstrap} />
        ) : null}
      </section>

      {status ? (
        <div className="mb-6">
          <ArchiveStatusPanel archive={status.archive} roles={config.archiveRoles} />
        </div>
      ) : null}

      <section className="mb-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void onDryRun()}
          disabled={dryRunPending || loading}
          className="rounded bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {dryRunPending ? "กำลัง Dry Run…" : "Dry Run"}
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={!applyEnabled || applyPending || loading}
          title={
            applyEnabled
              ? undefined
              : "ต้อง Dry Run สำเร็จก่อน (ไม่มี errors) จึงจะ Apply ได้"
          }
          className="rounded border border-zinc-900 px-4 py-2 text-sm text-zinc-900 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {applyPending ? "กำลัง Apply…" : "Apply"}
        </button>
      </section>

      {!applyEnabled && !loading ? (
        <p className="mb-4 text-sm text-zinc-500">
          Apply ถูกปิดไว้จนกว่าจะมี Dry Run สำเร็จ (ไม่มี errors) — Apply จะ upsert
          เท่านั้น ไม่ reset หรือลบข้อมูล
        </p>
      ) : null}

      {displayReport ? (
        <ImportReportSummary
          report={displayReport}
          showMissingReferences={entity === "reference-stock"}
        />
      ) : (
        <p className="text-sm text-zinc-500">ยังไม่มี Report — กด Dry Run เพื่อเริ่ม</p>
      )}

      <ApplyConfirmDialog
        open={confirmOpen}
        pending={applyPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => void onApplyConfirm()}
      />
    </SystemImportShell>
  )
}

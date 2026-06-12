"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  fetchImportStatus,
  postImportApply,
  postImportDryRun,
  postLogout,
} from "@/lib/system-ui/import-fetchers"
import {
  IMPORT_ENTITY_CONFIGS,
} from "@/lib/system-ui/import-entity-config"
import type {
  ImportApiResultView,
  ImportEntityKey,
  ImportReportListItemView,
  ImportStatusResponse,
} from "@/lib/system-ui/import-types"
import { formatReportTimestamp } from "@/lib/system-ui/import-format"
import { canEnableApplyFromResult } from "@/lib/system-ui/import-state"
import { ApplyConfirmDialog } from "./ApplyConfirmDialog"
import { EntityImportCard } from "./EntityImportCard"
import { SystemImportShell } from "./SystemImportShell"
import type { DocumentEntityCode } from "@/lib/legal-entity"

function latestReportForEntity(
  reports: ImportReportListItemView[],
  entity: ImportEntityKey
): ImportReportListItemView | null {
  return reports.find((item) => item.entity === entity) ?? null
}

export function ImportDashboard({
  documentEntityCode,
}: {
  documentEntityCode: DocumentEntityCode
}) {
  const router = useRouter()
  const [status, setStatus] = useState<ImportStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logoutPending, setLogoutPending] = useState(false)
  const [dryRunByEntity, setDryRunByEntity] = useState<
    Partial<Record<ImportEntityKey, ImportApiResultView>>
  >({})
  const [dryRunPendingEntity, setDryRunPendingEntity] =
    useState<ImportEntityKey | null>(null)
  const [applyPendingEntity, setApplyPendingEntity] =
    useState<ImportEntityKey | null>(null)
  const [confirmEntity, setConfirmEntity] = useState<ImportEntityKey | null>(null)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const payload = await fetchImportStatus()
      setStatus(payload)
    } catch (err) {
      setError(err instanceof Error ? err.message : "โหลดสถานะไม่สำเร็จ")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

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

  const recentReports = useMemo(
    () => status?.latestReports ?? [],
    [status?.latestReports]
  )

  const onCardDryRun = useCallback(async (entity: ImportEntityKey) => {
    setDryRunPendingEntity(entity)
    setError(null)
    try {
      const result = await postImportDryRun(entity)
      setDryRunByEntity((prev) => ({ ...prev, [entity]: result }))
      if (!result.success) {
        setDryRunByEntity((prev) => {
          const next = { ...prev }
          delete next[entity]
          return next
        })
      }
      await loadStatus()
    } catch (err) {
      setDryRunByEntity((prev) => {
        const next = { ...prev }
        delete next[entity]
        return next
      })
      setError(err instanceof Error ? err.message : "Dry Run ไม่สำเร็จ")
    } finally {
      setDryRunPendingEntity(null)
    }
  }, [loadStatus])

  const onApplyConfirm = useCallback(async () => {
    if (!confirmEntity) return
    const dryRunResult = dryRunByEntity[confirmEntity]
    const reportId = dryRunResult?.report.meta?.reportId
    if (!reportId) return

    setApplyPendingEntity(confirmEntity)
    setError(null)
    try {
      const result = await postImportApply({
        entity: confirmEntity,
        dryRunReportId: reportId,
      })
      setConfirmEntity(null)
      if (result.failed) {
        setDryRunByEntity((prev) => {
          const next = { ...prev }
          delete next[confirmEntity]
          return next
        })
      } else {
        setDryRunByEntity((prev) => {
          const next = { ...prev }
          delete next[confirmEntity]
          return next
        })
      }
      await loadStatus()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply ไม่สำเร็จ")
    } finally {
      setApplyPendingEntity(null)
    }
  }, [confirmEntity, dryRunByEntity, loadStatus])

  const actionsBusy = loading || logoutPending

  return (
    <SystemImportShell
      title="System Import Console"
      documentEntityCode={documentEntityCode}
      onLogout={onLogout}
      logoutPending={logoutPending}
    >
      {loading ? <p className="text-sm text-zinc-600">กำลังโหลดสถานะ…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {status?.productionGuardActive ? (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          โหมด production guard เปิดอยู่ — Apply อาจถูกบล็อกจนกว่าจะตั้งค่า IMPORT_ALLOW_PRODUCTION
        </div>
      ) : null}

      {status ? (
        <section className="mb-4 rounded border border-zinc-200 bg-zinc-50 p-3">
          <h2 className="text-sm font-semibold text-zinc-900">Archive รวม</h2>
          <p className="mt-1 text-sm text-zinc-700">
            {status.archive.manifestPresent ? "Manifest พร้อม" : "ไม่พบ Manifest"} ·{" "}
            {status.archive.files.filter((file) => file.exists).length}/
            {status.archive.files.length} ไฟล์ใน catalog
          </p>
        </section>
      ) : null}

      <div className="grid items-start gap-3 md:grid-cols-2">
        {IMPORT_ENTITY_CONFIGS.map((config) => {
          const entity = config.key
          const dryRunResult = dryRunByEntity[entity] ?? null
          return (
            <EntityImportCard
              key={entity}
              config={config}
              archive={status?.archive ?? null}
              latestReport={latestReportForEntity(recentReports, entity)}
              dryRunPending={dryRunPendingEntity === entity}
              applyPending={applyPendingEntity === entity}
              applyEnabled={canEnableApplyFromResult(dryRunResult)}
              actionsBusy={actionsBusy}
              onDryRun={() => void onCardDryRun(entity)}
              onApplyClick={() => setConfirmEntity(entity)}
            />
          )
        })}
      </div>

      {status && recentReports.length > 0 ? (
        <section className="mt-6 rounded border border-zinc-200 bg-white p-3">
          <h2 className="text-sm font-semibold text-zinc-900">Report ล่าสุด (Session)</h2>
          <ul className="mt-2 divide-y divide-zinc-100">
            {recentReports.map((report) => (
              <li key={report.reportId} className="py-1.5 text-sm">
                <span className="font-medium text-zinc-900">
                  {report.entity ?? "unknown"} ·{" "}
                  {report.mode === "dry-run" ? "Dry Run" : "Apply"}
                </span>
                <span className="ml-2 text-zinc-500">
                  {formatReportTimestamp(report.startedAt)}
                </span>
                <span className="ml-2 font-mono text-xs text-zinc-400">
                  {report.reportId}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ApplyConfirmDialog
        open={confirmEntity !== null}
        pending={applyPendingEntity !== null}
        onCancel={() => setConfirmEntity(null)}
        onConfirm={() => void onApplyConfirm()}
      />
    </SystemImportShell>
  )
}

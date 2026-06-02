"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import {
  fetchImportStatus,
  postLogout,
} from "@/lib/system-ui/import-fetchers"
import {
  IMPORT_ENTITY_CONFIGS,
} from "@/lib/system-ui/import-entity-config"
import type {
  ImportEntityKey,
  ImportReportListItemView,
  ImportStatusResponse,
} from "@/lib/system-ui/import-types"
import { formatReportTimestamp } from "@/lib/system-ui/import-format"
import { EntityImportCard } from "./EntityImportCard"
import { SystemImportShell } from "./SystemImportShell"

function latestReportForEntity(
  reports: ImportReportListItemView[],
  entity: ImportEntityKey
): ImportReportListItemView | null {
  return reports.find((item) => item.entity === entity) ?? null
}

export function ImportDashboard() {
  const router = useRouter()
  const [status, setStatus] = useState<ImportStatusResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [logoutPending, setLogoutPending] = useState(false)

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

  return (
    <SystemImportShell title="System Import Console" onLogout={onLogout} logoutPending={logoutPending}>
      {loading ? <p className="text-sm text-zinc-600">กำลังโหลดสถานะ…</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {status?.productionGuardActive ? (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          โหมด production guard เปิดอยู่ — Apply อาจถูกบล็อกจนกว่าจะตั้งค่า IMPORT_ALLOW_PRODUCTION
        </div>
      ) : null}

      {status ? (
        <>
          <section className="mb-6 rounded border border-zinc-200 bg-zinc-50 p-4">
            <h2 className="text-sm font-semibold text-zinc-900">Archive รวม</h2>
            <p className="mt-1 text-sm text-zinc-700">
              {status.archive.manifestPresent ? "Manifest พร้อม" : "ไม่พบ Manifest"} ·{" "}
              {status.archive.files.filter((file) => file.exists).length}/
              {status.archive.files.length} ไฟล์ใน catalog
            </p>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            {IMPORT_ENTITY_CONFIGS.map((config) => (
              <EntityImportCard
                key={config.key}
                config={config}
                archive={status.archive}
                latestReport={latestReportForEntity(recentReports, config.key)}
              />
            ))}
          </div>

          {recentReports.length > 0 ? (
            <section className="mt-8 rounded border border-zinc-200 bg-white p-4">
              <h2 className="text-sm font-semibold text-zinc-900">Report ล่าสุด (Session)</h2>
              <ul className="mt-3 divide-y divide-zinc-100">
                {recentReports.map((report) => (
                  <li key={report.reportId} className="py-2 text-sm">
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
        </>
      ) : null}
    </SystemImportShell>
  )
}

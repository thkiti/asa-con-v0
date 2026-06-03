import Link from "next/link"
import type { ImportEntityConfig } from "@/lib/system-ui/import-entity-config"
import {
  importButtonOpenClass,
  importButtonPrimaryClass,
  importButtonSecondaryClass,
} from "@/lib/system-ui/import-button-styles"
import type { ImportReportListItemView } from "@/lib/system-ui/import-types"
import {
  formatReportTimestamp,
  summarizeArchiveFilesForRoles,
} from "@/lib/system-ui/import-format"
import type { ImportArchiveStatusView } from "@/lib/system-ui/import-types"

type EntityImportCardProps = {
  config: ImportEntityConfig
  archive: ImportArchiveStatusView | null
  latestReport: ImportReportListItemView | null
  dryRunPending?: boolean
  applyPending?: boolean
  applyEnabled?: boolean
  actionsBusy?: boolean
  onDryRun?: () => void
  onApplyClick?: () => void
}

export function EntityImportCard({
  config,
  archive,
  latestReport,
  dryRunPending = false,
  applyPending = false,
  applyEnabled = false,
  actionsBusy = false,
  onDryRun,
  onApplyClick,
}: EntityImportCardProps) {
  const href = `/system/import/${config.key}`
  const showQuickActions = Boolean(onDryRun)

  const summary = archive
    ? summarizeArchiveFilesForRoles(archive.files, config.archiveRoles)
    : null

  const dryRunDisabled = actionsBusy || dryRunPending
  const applyDisabled = actionsBusy || applyPending || !applyEnabled

  return (
    <article className="flex flex-col rounded border border-zinc-200 bg-white p-3">
      <h2 className="text-sm font-semibold text-zinc-900">{config.title}</h2>
      <p className="mt-1 line-clamp-2 text-xs leading-snug text-zinc-600">
        {config.purpose}
      </p>

      <dl className="mt-2 grid grid-cols-[5.75rem_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs">
        <dt className="text-zinc-500">ไฟล์ต้นทาง</dt>
        <dd className="text-zinc-800">{config.sourceFiles.join(", ")}</dd>
        <dt className="text-zinc-500">Archive</dt>
        <dd className="text-zinc-800">
          {summary ? (
            <>
              {summary.present}/{summary.total} ไฟล์พร้อม
              {summary.missingRequired > 0 ? (
                <span className="text-red-700"> · ขาดไฟล์จำเป็น</span>
              ) : null}
            </>
          ) : (
            "…"
          )}
        </dd>
        <dt className="text-zinc-500">Report ล่าสุด</dt>
        <dd className="text-zinc-800">
          {latestReport ? (
            <>
              {latestReport.mode === "dry-run" ? "Dry Run" : "Apply"} ·{" "}
              {formatReportTimestamp(latestReport.startedAt)}
            </>
          ) : (
            "ยังไม่มี"
          )}
        </dd>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-3">
        {showQuickActions ? (
          <>
            <button
              type="button"
              onClick={onDryRun}
              disabled={dryRunDisabled}
              className={importButtonPrimaryClass}
            >
              {dryRunPending ? "กำลัง Dry Run…" : "Dry Run"}
            </button>
            <button
              type="button"
              onClick={onApplyClick}
              disabled={applyDisabled}
              title={
                applyEnabled
                  ? undefined
                  : "ต้อง Dry Run สำเร็จก่อน (ไม่มี errors) จึงจะ Apply ได้"
              }
              className={importButtonSecondaryClass}
            >
              {applyPending ? "กำลัง Apply…" : "Apply"}
            </button>
          </>
        ) : null}
        <Link href={href} className={importButtonOpenClass}>
          เปิดหน้า Import
        </Link>
      </div>
    </article>
  )
}

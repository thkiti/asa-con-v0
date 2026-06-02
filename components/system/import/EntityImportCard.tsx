import Link from "next/link"
import type { ImportEntityConfig } from "@/lib/system-ui/import-entity-config"
import type { ImportReportListItemView } from "@/lib/system-ui/import-types"
import {
  formatReportTimestamp,
  summarizeArchiveFilesForRoles,
} from "@/lib/system-ui/import-format"
import type { ImportArchiveStatusView } from "@/lib/system-ui/import-types"

type EntityImportCardProps = {
  config: ImportEntityConfig
  archive: ImportArchiveStatusView
  latestReport: ImportReportListItemView | null
}

export function EntityImportCard({ config, archive, latestReport }: EntityImportCardProps) {
  const summary = summarizeArchiveFilesForRoles(archive.files, config.archiveRoles)
  const href = `/system/import/${config.key}`

  return (
    <article className="rounded border border-zinc-200 bg-white p-4">
      <h2 className="text-base font-semibold text-zinc-900">{config.title}</h2>
      <p className="mt-2 text-sm text-zinc-600">{config.purpose}</p>
      <dl className="mt-4 space-y-2 text-sm">
        <div>
          <dt className="text-zinc-500">ไฟล์ต้นทาง</dt>
          <dd className="text-zinc-800">{config.sourceFiles.join(", ")}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Archive</dt>
          <dd className="text-zinc-800">
            {summary.present}/{summary.total} ไฟล์พร้อม
            {summary.missingRequired > 0 ? (
              <span className="text-red-700"> · ขาดไฟล์จำเป็น</span>
            ) : null}
          </dd>
        </div>
        <div>
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
        </div>
      </dl>
      <Link
        href={href}
        className="mt-4 inline-block rounded border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-50"
      >
        เปิดหน้า Import
      </Link>
    </article>
  )
}

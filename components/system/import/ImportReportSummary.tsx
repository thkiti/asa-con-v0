import type { ImportReportView } from "@/lib/system-ui/import-types"
import {
  collectMissingProductReferences,
  collectReportErrors,
  collectReportWarnings,
  formatReportTimestamp,
  insertCount,
  reportModeLabel,
  updateCount,
} from "@/lib/system-ui/import-format"

type ImportReportSummaryProps = {
  report: ImportReportView
  title?: string
  showMissingReferences?: boolean
}

export function ImportReportSummary({
  report,
  title = "Report สรุปล่าสุด",
  showMissingReferences = false,
}: ImportReportSummaryProps) {
  const errors = collectReportErrors(report)
  const warnings = collectReportWarnings(report)
  const missingRefs = collectMissingProductReferences(report)

  return (
    <section className="rounded border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <dt className="text-zinc-500">Report ID</dt>
          <dd className="font-mono text-xs text-zinc-800">{report.meta?.reportId ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Mode</dt>
          <dd>{reportModeLabel(report.mode)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">เริ่มเมื่อ</dt>
          <dd>{formatReportTimestamp(report.startedAt)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">เสร็จเมื่อ</dt>
          <dd>{formatReportTimestamp(report.completedAt)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Rows read</dt>
          <dd>{report.totals.rowsRead}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Insert</dt>
          <dd>{insertCount(report)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Update</dt>
          <dd>{updateCount(report)}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Skipped</dt>
          <dd>{report.totals.skipped}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Errors</dt>
          <dd className={report.totals.errors > 0 ? "text-red-700" : ""}>
            {report.totals.errors}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Warnings</dt>
          <dd className={report.totals.warnings > 0 ? "text-amber-700" : ""}>
            {report.totals.warnings}
          </dd>
        </div>
        {showMissingReferences ? (
          <div>
            <dt className="text-zinc-500">Missing product refs</dt>
            <dd className={missingRefs.length > 0 ? "text-red-700" : ""}>
              {missingRefs.length}
            </dd>
          </div>
        ) : null}
      </dl>

      {errors.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-red-800">Errors</h3>
          <ul className="mt-1 list-disc pl-5 text-sm text-red-700">
            {errors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {warnings.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-amber-800">Warnings</h3>
          <ul className="mt-1 list-disc pl-5 text-sm text-amber-800">
            {warnings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {showMissingReferences && missingRefs.length > 0 ? (
        <div className="mt-4">
          <h3 className="text-sm font-medium text-red-800">
            รหัส Product ที่ยังไม่มีในระบบ
          </h3>
          <ul className="mt-1 max-h-48 list-disc overflow-y-auto pl-5 text-sm text-red-700">
            {missingRefs.map((code) => (
              <li key={code} className="font-mono">
                {code}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}

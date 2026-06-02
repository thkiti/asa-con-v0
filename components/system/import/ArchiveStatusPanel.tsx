import type { ImportArchiveStatusView } from "@/lib/system-ui/import-types"
import {
  formatFileSize,
  formatSha256Prefix,
  summarizeArchiveFilesForRoles,
} from "@/lib/system-ui/import-format"

type ArchiveStatusPanelProps = {
  archive: ImportArchiveStatusView
  roles: string[]
  title?: string
}

export function ArchiveStatusPanel({
  archive,
  roles,
  title = "สถานะแหล่งข้อมูล (Archive)",
}: ArchiveStatusPanelProps) {
  const summary = summarizeArchiveFilesForRoles(archive.files, roles)
  const matchedFiles = archive.files.filter((file) => roles.includes(file.importRole))

  return (
    <section className="rounded border border-zinc-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
      <p className="mt-1 text-xs text-zinc-500">โฟลเดอร์: {archive.archiveRoot}</p>
      <p className="mt-2 text-sm text-zinc-700">
        Manifest: {archive.manifestPresent ? "พบแล้ว" : "ไม่พบ"} | ไฟล์ที่เกี่ยวข้อง{" "}
        {summary.present}/{summary.total}
        {summary.missingRequired > 0 ? (
          <span className="ml-2 text-red-700">
            (ขาดไฟล์จำเป็น {summary.missingRequired} รายการ)
          </span>
        ) : null}
      </p>
      {archive.warnings.length > 0 ? (
        <ul className="mt-2 list-disc pl-5 text-sm text-amber-800">
          {archive.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      ) : null}
      <ul className="mt-3 space-y-2">
        {matchedFiles.map((file) => (
          <li
            key={file.filename}
            className="flex flex-wrap items-center justify-between gap-2 rounded border border-zinc-100 px-3 py-2 text-sm"
          >
            <span className="font-mono text-zinc-800">{file.filename}</span>
            <span className={file.exists ? "text-green-700" : "text-red-700"}>
              {file.exists ? "พร้อมใช้งาน" : file.required ? "ไม่พบ (จำเป็น)" : "ไม่พบ (ไม่บังคับ)"}
            </span>
            <span className="text-xs text-zinc-500">
              {formatFileSize(file.sizeBytes)} · SHA {formatSha256Prefix(file.sha256)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

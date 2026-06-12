import Link from "next/link"
import { CatalogUploadController } from "@/components/catalog-upload/CatalogUploadController"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import {
  themeLinkMuted,
  themeMuted,
  themePage,
} from "@/lib/theme/theme-classes"

export default function CatalogUploadPage() {
  return (
    <main className={`mx-auto max-w-5xl p-6 ${themePage}`}>
      <header className="border-b border-border pb-4">
        <Link href="/main/operations" className={`text-sm ${themeLinkMuted}`}>
          ← Operations
        </Link>
        <EntityContextPageHeading
          title="Export Image To Cloud"
          className="mt-3 text-2xl font-semibold tracking-tight"
        />
        <p className={`mt-2 max-w-3xl text-sm ${themeMuted}`}>
          Scan the standard catalog product images folder, verify product codes,
          and review files before cloud upload.
        </p>
      </header>
      <div className="mt-6">
        <CatalogUploadController />
      </div>
    </main>
  )
}

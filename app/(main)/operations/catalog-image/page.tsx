import Link from "next/link"
import { CatalogImageController } from "@/components/catalog-image/CatalogImageController"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"
import {
  themeLinkMuted,
  themeMuted,
  themePage,
} from "@/lib/theme/theme-classes"

export default function CatalogImagePage() {
  return (
    <main className={`mx-auto max-w-5xl p-6 ${themePage}`}>
      <header className="border-b border-border pb-4">
        <Link href="/main/operations" className={`text-sm ${themeLinkMuted}`}>
          ← Operations
        </Link>
        <EntityContextPageHeading
          title="Catalog Image"
          className="mt-3 text-2xl font-semibold tracking-tight"
        />
        <p className={`mt-2 max-w-3xl text-sm ${themeMuted}`}>
          Open a catalog PDF, adjust crop, assign product codes, and save PNGs to
          the standard catalog product images folder.
        </p>
      </header>
      <div className="mt-6">
        <CatalogImageController />
      </div>
    </main>
  )
}

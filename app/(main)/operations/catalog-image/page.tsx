import Link from "next/link"
import { CatalogImageController } from "@/components/catalog-image/CatalogImageController"
import {
  themeLinkMuted,
  themeMuted,
  themePage,
  themePageTitle,
} from "@/lib/theme/theme-classes"

export default function CatalogImagePage() {
  return (
    <main className={`mx-auto max-w-5xl p-6 ${themePage}`}>
      <header className="border-b border-border pb-4">
        <Link href="/main/operations" className={`text-sm ${themeLinkMuted}`}>
          ← Operations
        </Link>
        <h1 className={`mt-3 ${themePageTitle}`}>Catalog Image</h1>
        <p className={`mt-2 max-w-3xl text-sm ${themeMuted}`}>
          Open a catalog PDF, adjust crop, assign product codes, and save PNGs to
          the final folder.
        </p>
      </header>
      <div className="mt-6">
        <CatalogImageController />
      </div>
    </main>
  )
}

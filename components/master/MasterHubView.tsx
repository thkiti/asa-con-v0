import Link from "next/link"
import {
  themeMenuCard,
  themeMenuCardHint,
  themeMenuCardTitle,
  themeMuted,
  themePage,
  themePageTitle,
} from "@/lib/theme/theme-classes"

const MASTER_ENTRIES = [
  {
    href: "/master/product-reference",
    title: "Product & Reference Stock",
    hint: "Search product and hook reference links; view product with reference stock together.",
  },
  {
    href: "/master/branch",
    title: "Branch",
    hint: "List branches by code or name; active and deleted status.",
  },
  {
    href: "/master/staff",
    title: "Staff",
    hint: "List staff by ID or name; role, branch, active and deleted status.",
  },
  {
    href: "/master/pricing",
    title: "Pricing",
    hint: "HO transfer policy, global retail selling price, promotion (planned).",
  },
] as const

export function MasterHubView() {
  return (
    <main className={`mx-auto max-w-5xl p-6 ${themePage}`}>
      <header className="border-b border-border pb-4">
        <Link href="/main/administration" className={`text-sm ${themeMuted} underline hover:text-foreground`}>
          ← Main Menu
        </Link>
        <h1 className={`mt-3 ${themePageTitle}`}>Master Database</h1>
        <p className={`mt-2 max-w-3xl text-sm ${themeMuted}`}>
          Maintenance screens for product master, reference stock links, branches, and staff.
          Bulk load from legacy files remains under{" "}
          <Link href="/system/import" className="underline hover:text-foreground">
            System Import
          </Link>
          .
        </p>
      </header>

      <nav className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Master Database maintenance">
        {MASTER_ENTRIES.map((entry) => (
          <Link key={entry.href} href={entry.href} className={themeMenuCard}>
            <span className={themeMenuCardTitle}>{entry.title}</span>
            <span className={themeMenuCardHint}>{entry.hint}</span>
          </Link>
        ))}
      </nav>
    </main>
  )
}

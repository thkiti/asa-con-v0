import Link from "next/link"
import { financeAdminPageClass } from "@/lib/main-ui/finance-page-layout"
import { GlAccountBrowserPage } from "@/components/finance/GlAccountBrowserPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function FinanceAccountsPage() {
  return (
    <main className={financeAdminPageClass}>
      <Link href="/finance">← Finance</Link>
      <EntityContextPageHeading title="Chart of accounts" className="mt-4 text-xl font-semibold" />
      <p className="mt-2 text-zinc-600">
        Browse GL accounts. Export, edit, and re-import to maintain the chart.
      </p>
      <div className="mt-6">
        <GlAccountBrowserPage />
      </div>
    </main>
  )
}

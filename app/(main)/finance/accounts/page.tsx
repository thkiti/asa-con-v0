import Link from "next/link"
import { GlAccountBrowserPage } from "@/components/finance/GlAccountBrowserPage"

export default function FinanceAccountsPage() {
  return (
    <main className="p-8">
      <Link href="/main/finance">← Finance</Link>
      <h1 className="mt-4 text-xl font-semibold">Chart of accounts</h1>
      <p className="mt-2 text-zinc-600">
        Browse GL accounts. Export, edit, and re-import to maintain the chart.
      </p>
      <div className="mt-6">
        <GlAccountBrowserPage />
      </div>
    </main>
  )
}

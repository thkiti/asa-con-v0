import Link from "next/link"
import { ProfitLossPage } from "@/components/finance/ProfitLossPage"

export default function Page() {
  return (
    <main className="p-8">
      <Link href="/finance" className="text-sm text-zinc-600 underline print:hidden">
        ← Finance
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Profit &amp; Loss</h1>
      <div className="mt-6">
        <ProfitLossPage />
      </div>
    </main>
  )
}

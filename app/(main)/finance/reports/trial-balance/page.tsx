import Link from "next/link"
import { TrialBalancePage } from "@/components/finance/TrialBalancePage"

export default function Page() {
  return (
    <main className="p-8">
      <Link href="/main/finance" className="text-sm text-zinc-600 underline print:hidden">
        ← Finance
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Trial Balance</h1>
      <div className="mt-6">
        <TrialBalancePage />
      </div>
    </main>
  )
}

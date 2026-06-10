import Link from "next/link"
import { GeneralLedgerPage } from "@/components/finance/GeneralLedgerPage"

export default function Page() {
  return (
    <main className="p-8">
      <Link href="/finance" className="text-sm text-zinc-600 underline print:hidden">
        ← Finance
      </Link>
      <h1 className="mt-4 text-xl font-semibold">General Ledger</h1>
      <div className="mt-6">
        <GeneralLedgerPage />
      </div>
    </main>
  )
}

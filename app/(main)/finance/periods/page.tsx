import Link from "next/link"
import { PeriodAdminPage } from "@/components/finance/PeriodAdminPage"

export default function FinancePeriodsPage() {
  return (
    <main className="p-8">
      <Link href="/main/finance">← Finance</Link>
      <h1 className="mt-4 text-xl font-semibold">Accounting periods</h1>
      <p className="mt-2 text-zinc-600">
        Admin setup for accounting period open, close, and reopen.
      </p>
      <div className="mt-6">
        <PeriodAdminPage />
      </div>
    </main>
  )
}

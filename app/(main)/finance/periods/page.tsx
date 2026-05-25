import Link from "next/link"
import { PeriodsAdminView } from "@/components/finance/PeriodsAdminView"

export default function PeriodsAdminPage() {
  return (
    <main className="p-8">
      <Link href="/finance" className="text-sm text-zinc-600 hover:text-zinc-900">
        ← Finance
      </Link>
      <h1 className="mt-4 text-xl font-semibold">Accounting periods</h1>
      <p className="mt-2 text-zinc-600">
        View period close status and apply admin status transitions.
      </p>
      <div className="mt-6">
        <PeriodsAdminView />
      </div>
    </main>
  )
}

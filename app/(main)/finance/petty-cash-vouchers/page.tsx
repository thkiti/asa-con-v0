import Link from "next/link"
import { PettyCashVoucherListPage } from "@/components/finance/PettyCashVoucherListPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function PettyCashVouchersPage() {
  return (
    <main className="p-8">
      <Link href="/finance/daily-work" className="text-sm text-zinc-600 underline">
        ← Daily Work
      </Link>
      <EntityContextPageHeading
        title="Petty cash vouchers (PCV)"
        className="mt-4 text-xl font-semibold"
      />
      <p className="mt-2 text-zinc-600">
        Petty cash payment vouchers — pay from the locked petty cash account, allocate debits,
        post to GL. Document numbers use the PCV-YYnnnn format.
      </p>
      <div className="mt-6">
        <PettyCashVoucherListPage />
      </div>
    </main>
  )
}

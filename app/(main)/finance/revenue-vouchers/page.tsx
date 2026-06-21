import Link from "next/link"
import { RevenueVoucherListPage } from "@/components/finance/RevenueVoucherListPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function RevenueVouchersPage() {
  return (
    <main className="p-8">
      <Link href="/finance/daily-work" className="text-sm text-zinc-600 underline">
        ← Daily Work
      </Link>
      <EntityContextPageHeading
        title="Revenue vouchers (REV)"
        className="mt-4 text-xl font-semibold"
      />
      <p className="mt-2 text-zinc-600">
        Inbound revenue vouchers — receive to bank or cash, allocate credits, post to GL.
        Document numbers use the REV-YYnnnn format.
      </p>
      <div className="mt-6">
        <RevenueVoucherListPage />
      </div>
    </main>
  )
}

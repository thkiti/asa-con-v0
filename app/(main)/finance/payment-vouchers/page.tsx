import Link from "next/link"
import { PaymentVoucherListPage } from "@/components/finance/PaymentVoucherListPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function PaymentVouchersPage() {
  return (
    <main className="p-8">
      <Link href="/finance/daily-work" className="text-sm text-zinc-600 underline">
        ← Daily Work
      </Link>
      <EntityContextPageHeading
        title="Payment vouchers (PAV)"
        className="mt-4 text-xl font-semibold"
      />
      <p className="mt-2 text-zinc-600">
        Outbound payment vouchers — pay from bank or cash, allocate debits, post to GL.
        Document numbers use the PAV-YYnnnn format.
      </p>
      <div className="mt-6">
        <PaymentVoucherListPage />
      </div>
    </main>
  )
}

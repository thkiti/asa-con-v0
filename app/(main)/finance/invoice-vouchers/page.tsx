import Link from "next/link"
import { InvoiceVoucherListPage } from "@/components/finance/InvoiceVoucherListPage"
import { EntityContextPageHeading } from "@/components/main/EntityContextPageHeading"

export default function InvoiceVouchersPage() {
  return (
    <main className="p-8">
      <Link href="/finance/daily-work" className="text-sm text-zinc-600 underline">
        ← Daily Work
      </Link>
      <EntityContextPageHeading
        title="Invoice vouchers (INV)"
        className="mt-4 text-xl font-semibold"
      />
      <p className="mt-2 text-zinc-600">
        Finance invoices with due dates and customer counterparties, controlled through the
        SAVE/SUBMIT/CONFIRM/POST workflow.
      </p>
      <div className="mt-6">
        <InvoiceVoucherListPage />
      </div>
    </main>
  )
}

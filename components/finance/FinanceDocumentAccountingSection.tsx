import { formatDateTime } from "@/lib/finance-ui/format"

type FinanceDocumentAccountingSectionProps = {
  voucherNo: string
  refType: string
  postedAt: string | null
}

export function FinanceDocumentAccountingSection({
  voucherNo,
  refType,
  postedAt,
}: FinanceDocumentAccountingSectionProps) {
  return (
    <section
      className="w-full max-w-full rounded border border-zinc-200 bg-zinc-50/60 p-4"
      data-testid="finance-document-accounting-information"
    >
      <h3 className="text-sm font-semibold text-zinc-900">Accounting Information</h3>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-zinc-500">Voucher</dt>
          <dd className="font-mono" data-testid="finance-accounting-voucher-no">
            {voucherNo}
          </dd>
        </div>
        <div>
          <dt className="text-zinc-500">Journal Type</dt>
          <dd data-testid="finance-accounting-journal-type">{refType}</dd>
        </div>
        <div>
          <dt className="text-zinc-500">Posted</dt>
          <dd data-testid="finance-accounting-posted-at">
            {postedAt ? formatDateTime(postedAt) : "—"}
          </dd>
        </div>
      </dl>
    </section>
  )
}

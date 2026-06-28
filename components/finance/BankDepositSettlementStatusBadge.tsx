import type { BankDepositSettlementStatus } from "@/lib/finance-ui/bank-deposit-settlement"

const toneClasses: Record<BankDepositSettlementStatus, string> = {
  NOT_POSTED: "bg-zinc-100 text-zinc-800",
  POSTED: "bg-green-100 text-green-800",
  VARIANCE: "bg-amber-100 text-amber-800",
  INVALID_SOURCE: "bg-orange-100 text-orange-900",
  NOT_ELIGIBLE: "bg-slate-100 text-slate-700",
}

type BankDepositSettlementStatusBadgeProps = {
  status: BankDepositSettlementStatus
}

export function BankDepositSettlementStatusBadge({
  status,
}: BankDepositSettlementStatusBadgeProps) {
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${toneClasses[status]}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  )
}

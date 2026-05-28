import type { TraceStepKind } from "@/lib/finance-ui/traceability"

const KIND_LABELS: Record<TraceStepKind, string> = {
  operational: "Operational",
  voucher: "Voucher",
  journal: "Journal",
  issue: "Issue",
  evidence: "Evidence",
}

const KIND_TONE: Record<TraceStepKind, string> = {
  operational: "border-sky-200 bg-sky-50 text-sky-900",
  voucher: "border-violet-200 bg-violet-50 text-violet-900",
  journal: "border-indigo-200 bg-indigo-50 text-indigo-900",
  issue: "border-amber-200 bg-amber-50 text-amber-900",
  evidence: "border-zinc-300 bg-zinc-100 text-zinc-800",
}

export function TraceStepKindBadge({ kind }: { kind: TraceStepKind }) {
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${KIND_TONE[kind]}`}
    >
      {KIND_LABELS[kind]}
    </span>
  )
}

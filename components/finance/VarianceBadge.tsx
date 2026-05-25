import { formatVarianceLabel, getVarianceTone } from "@/lib/finance-ui/format"

const toneClasses: Record<ReturnType<typeof getVarianceTone>, string> = {
  zero: "bg-green-100 text-green-800",
  positive: "bg-amber-100 text-amber-800",
  negative: "bg-red-100 text-red-800",
}

type VarianceBadgeProps = {
  variance: string
}

export function VarianceBadge({ variance }: VarianceBadgeProps) {
  const tone = getVarianceTone(variance)
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-sm font-medium ${toneClasses[tone]}`}
    >
      {formatVarianceLabel(variance)}
    </span>
  )
}

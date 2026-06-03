import { COUNTING_HOOK_GROUPS, type CountingHookGroup } from "@/lib/stock-ui/counting-hook-groups"
import { COUNTING_HOOK_GROUP_LABELS_TH } from "@/lib/stock-ui/counting-sheet-labels"

type StockDocumentHookTabsProps = {
  activeHookGroup: CountingHookGroup
  countedByGroup: Partial<Record<CountingHookGroup, number>>
  onChange: (hookGroup: CountingHookGroup) => void
}

export function StockDocumentHookTabs({
  activeHookGroup,
  countedByGroup,
  onChange,
}: StockDocumentHookTabsProps) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="tablist"
      aria-label="กลุ่มตะขอ"
    >
      {COUNTING_HOOK_GROUPS.map((group) => {
        const counted = countedByGroup[group] ?? 0
        const active = activeHookGroup === group

        return (
          <button
            key={group}
            type="button"
            role="tab"
            aria-selected={active}
            className={`rounded border px-3 py-1.5 text-sm font-semibold ${
              active
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-400 bg-white text-zinc-950 hover:bg-zinc-50"
            }`}
            onClick={() => onChange(group)}
          >
            {group}
            <span
              className={
                active
                  ? "ml-1 text-xs font-medium text-white/90"
                  : "ml-1 text-xs font-medium text-zinc-700"
              }
            >
              {COUNTING_HOOK_GROUP_LABELS_TH[group]}
            </span>
            {counted > 0 ? (
              <span
                className={
                  active
                    ? "ml-2 rounded bg-white/25 px-1.5 py-0.5 text-xs font-semibold text-white"
                    : "ml-2 rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-semibold text-zinc-950"
                }
              >
                {counted}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

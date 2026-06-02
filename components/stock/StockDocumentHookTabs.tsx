import {
  COUNTING_HOOK_GROUPS,
  COUNTING_HOOK_GROUP_LABELS,
  type CountingHookGroup,
} from "@/lib/stock-ui/counting-hook-groups"

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
      aria-label="Hook groups"
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
            className={`rounded border px-3 py-1.5 text-sm font-medium ${
              active
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"
            }`}
            onClick={() => onChange(group)}
          >
            {group}
            <span className="ml-1 text-xs opacity-80">
              {COUNTING_HOOK_GROUP_LABELS[group]}
            </span>
            {counted > 0 ? (
              <span className="ml-2 rounded bg-white/20 px-1.5 py-0.5 text-xs">
                {counted}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

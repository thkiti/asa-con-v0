export const COUNTING_HOOK_GROUPS = ["K", "C", "M", "O", "S"] as const

export type CountingHookGroup = (typeof COUNTING_HOOK_GROUPS)[number]

export const COUNTING_HOOK_GROUP_LABELS: Record<CountingHookGroup, string> = {
  K: "Home Key",
  C: "Auto Key",
  M: "Motorcycle Key",
  O: "Other Special Key",
  S: "Shoe Materials",
}

export const SHOE_PREFIX_SECTIONS = [
  { prefix: "51", title: "51 - Ladies' Heel" },
  { prefix: "55", title: "55 - Ladies' Sole" },
  { prefix: "61", title: "61 - Men's Heel" },
  { prefix: "65", title: "65 - Men's Sole" },
] as const

export function isCountingHookGroup(value: string): value is CountingHookGroup {
  return (COUNTING_HOOK_GROUPS as readonly string[]).includes(value)
}

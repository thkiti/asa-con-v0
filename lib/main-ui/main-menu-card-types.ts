import type { MainMenuItem } from "@/lib/main-ui/main-menu"

export type MainMenuCardItem = {
  key: string
  label: string
  hint?: string
  href?: string
  status: "available" | "planned"
}

export function toMainMenuCardItems(
  items: readonly MainMenuItem[]
): MainMenuCardItem[] {
  return items.map((item) => ({
    key: item.key,
    label: item.label,
    hint: item.hint,
    href: item.href,
    status: item.status,
  }))
}

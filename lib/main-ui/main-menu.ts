import { canAccessMenu } from "@/lib/permissions/menu"
import type { Role } from "@/lib/shared"

export type MainMenuItemStatus = "available" | "coming-soon"

export type MainMenuItem = {
  key: string
  label: string
  hint?: string
  href?: string
  status: MainMenuItemStatus
}

const COMING_SOON_ITEMS: readonly MainMenuItem[] = [
  { key: "product", label: "Product", status: "coming-soon" },
  { key: "reference-stock", label: "Reference Stock", status: "coming-soon" },
  { key: "branch", label: "Branch", status: "coming-soon" },
  { key: "staff", label: "Staff", status: "coming-soon" },
] as const

/** Main menu entries for `/main` — visibility uses existing menu/area guards. */
export function getMainMenuItems(role: Role): MainMenuItem[] {
  const items: MainMenuItem[] = []

  if (canAccessMenu(role, "shop")) {
    items.push({
      key: "stock-documents",
      label: "Stock Documents",
      hint: "Transfers, performance, adjustments",
      href: "/shop/stock-documents",
      status: "available",
    })
    items.push({
      key: "stock-new",
      label: "New Stock Document",
      hint: "Create or open counting / editor flow",
      href: "/shop/stock-documents/new",
      status: "available",
    })
  }

  if (canAccessMenu(role, "system")) {
    items.push({
      key: "system-import",
      label: "System Import",
      hint: "Bootstrap / recovery imports",
      href: "/system/import",
      status: "available",
    })
  }

  if (canAccessMenu(role, "finance")) {
    items.push({
      key: "finance",
      label: "Finance",
      hint: "Periods, reconciliation, vouchers",
      href: "/finance",
      status: "available",
    })
  }

  items.push(...COMING_SOON_ITEMS)
  return items
}

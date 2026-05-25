import type { Role } from "@/lib/shared"
import { roleHasArea, type AppArea } from "./roles"

export type MenuItem = {
  key: AppArea
  label: string
  path: string
}

/** Top-level menu entries — paths must match route-access area prefixes. */
export const MENU_ITEMS: readonly MenuItem[] = [
  { key: "finance", label: "Finance", path: "/finance" },
  { key: "admin", label: "Admin", path: "/admin" },
  { key: "operations", label: "Operations", path: "/operations" },
  { key: "shop", label: "Shop", path: "/shop" },
] as const

/** Pure menu guard — components should call this, not embed role matrices. */
export function canAccessMenu(
  role: Role | null | undefined,
  area: AppArea
): boolean {
  if (!role) return false
  return roleHasArea(role, area)
}

export function getMenuItemsForRole(role: Role): MenuItem[] {
  return MENU_ITEMS.filter((item) => canAccessMenu(role, item.key))
}
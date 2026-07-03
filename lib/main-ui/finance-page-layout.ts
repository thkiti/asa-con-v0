import { themeMuted, themePage, themePageTitle } from "@/lib/theme/theme-classes"
import {
  mainMenuBackLinkClass,
  mainMenuPageClass,
  MAIN_MENU_PAGE_MAX_WIDTH_PX,
} from "./main-menu-layout"
import {
  appPageContainerClass,
  appPageShellClass,
  APP_PAGE_CONTENT_WIDTH_PX,
  APP_PAGE_MAX_WIDTH_PX,
} from "./page-container"

/**
 * Canonical Finance page shell — outer `<main>` (max-w-5xl + horizontal padding).
 * Matches Finance hub and all Finance admin routes.
 */
export const financePageShellClass = appPageShellClass

/**
 * Canonical Finance content column — single inner wrapper, full width of the shell
 * content area (976px at the reference viewport). No nested max-width.
 */
export const financePageContentClass = `${appPageContainerClass} finance-page-content`

/** Spacing-only block below header/intro; must not introduce a second width constraint. */
export const financePageBodyClass = "finance-page-body w-full max-w-full"

/** @deprecated Use {@link financePageShellClass} */
export const financeAdminPageClass = financePageShellClass

/**
 * Finance document pages (MJV, OPB, journal lists using FinanceDocumentContainer).
 * Width and horizontal padding come from FinanceDocumentContainer only (1120px).
 */
export const financeDocumentPageClass = `w-full ${themePage}`

export {
  appPageContainerClass,
  appPageShellClass,
  APP_PAGE_CONTENT_WIDTH_PX,
  APP_PAGE_MAX_WIDTH_PX,
}

export const financeAdminBackLinkClass = mainMenuBackLinkClass

/** Entity-context page titles on finance admin routes. */
export const financeAdminPageTitleClass = `mt-4 text-xl font-semibold ${themePageTitle}`

export const financeAdminIntroClass = `mt-2 w-full max-w-full text-sm ${themeMuted}`

/** Tighter intro spacing for settlement workflow pages. */
export const financeAdminIntroSettlementClass = `mt-2 w-full max-w-full text-sm leading-snug ${themeMuted}`

/** @deprecated Use {@link financePageBodyClass} */
export const financeAdminContentClass = `${financePageBodyClass} mt-6`

/** Settlement pages — less gap between intro and filter/table. */
export const financeAdminContentSettlementClass = `${financePageBodyClass} mt-4`

/**
 * Narrow centered work panel for compact settlement workflows.
 * Opt-in only — do not use on standard Finance list/detail pages.
 */
export const financeWorkPanelClass = "finance-work-panel mx-auto mt-6 w-full max-w-xl"

export const FINANCE_ADMIN_PAGE_MAX_WIDTH_PX = MAIN_MENU_PAGE_MAX_WIDTH_PX

/** Finance menu dashboard hub — report pages reached from dashboard use this for back links. */
export const FINANCE_DASHBOARD_HREF = "/finance/dashboard"

export const FINANCE_WORK_PANEL_MAX_WIDTH_PX = 576

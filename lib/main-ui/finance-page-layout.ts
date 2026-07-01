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

/** Finance admin/list pages — same centered container as `/main` (max-w-5xl / 1024px). */
export const financeAdminPageClass = mainMenuPageClass

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

export const financeAdminIntroClass = `mt-2 w-full text-sm ${themeMuted}`

/** Tighter intro spacing for settlement workflow pages. */
export const financeAdminIntroSettlementClass = `mt-2 w-full max-w-full text-sm leading-snug ${themeMuted}`

/** Default content block below heading — full inner width of admin page. */
export const financeAdminContentClass = "mt-6 w-full"

/** Settlement pages — less gap between intro and filter/table. */
export const financeAdminContentSettlementClass = "mt-4 w-full"

/**
 * Narrow centered work panel for compact settlement workflows.
 * Sits inside financeAdminPageClass; table/filter share this width.
 */
export const financeWorkPanelClass = "finance-work-panel mx-auto mt-6 w-full max-w-xl"

export const FINANCE_ADMIN_PAGE_MAX_WIDTH_PX = MAIN_MENU_PAGE_MAX_WIDTH_PX

export const FINANCE_WORK_PANEL_MAX_WIDTH_PX = 576

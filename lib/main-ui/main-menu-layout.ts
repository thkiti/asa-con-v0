import {
  themeBtnSecondary,
  themeLinkMuted,
  themeMenuSummary,
  themeMuted,
  themePageTitle,
} from "@/lib/theme/theme-classes"
import {
  APP_PAGE_CONTENT_WIDTH_PX,
  APP_PAGE_MAX_WIDTH_PX,
  APP_PAGE_PADDING_PX,
  appPageContainerClass,
  appPageShellClass,
} from "./page-container"

export {
  APP_PAGE_CONTENT_WIDTH_PX,
  APP_PAGE_MAX_WIDTH_PX,
  APP_PAGE_PADDING_PX,
  appPageContainerClass,
  appPageShellClass,
}

/**
 * /main reference box model at 16px root, max-w-5xl page:
 * inner width = 1024 - 48 padding = 976px
 * two columns + 12px gap => card width = (976 - 12) / 2 = 482px
 */
export const MAIN_MENU_PAGE_MAX_WIDTH_PX = APP_PAGE_MAX_WIDTH_PX
export const MAIN_MENU_PAGE_PADDING_PX = APP_PAGE_PADDING_PX
export const MAIN_MENU_INNER_WIDTH_PX = APP_PAGE_CONTENT_WIDTH_PX
export const MAIN_MENU_GRID_WIDTH_PX = APP_PAGE_CONTENT_WIDTH_PX
export const MAIN_MENU_GRID_GAP_PX = 12
export const MAIN_MENU_CARD_WIDTH_PX = 482
export const MAIN_MENU_CARD_HEIGHT_PX = 108
export const MAIN_MENU_CARD_PADDING_PX = 12
export const MAIN_MENU_CARD_INNER_WIDTH_PX =
  MAIN_MENU_CARD_WIDTH_PX - MAIN_MENU_CARD_PADDING_PX * 2

/** `/main` page shell — same as {@link appPageShellClass}. */
export const mainMenuPageClass = appPageShellClass

/** Hub header — full container width; logout is absolutely positioned. */
export const mainMenuHeaderClass =
  "relative w-full border-b border-border pb-4"

/** Logout control — top-right of header; does not shrink content column width. */
export const mainMenuLogoutAnchorClass = "absolute right-0 top-0 z-10 shrink-0"

/** Shell feature pages — full-width header stack (logout does not block above content). */
export const mainMenuShellHeaderClass = "w-full border-b border-border pb-4"

/** @deprecated Hub header no longer uses a flex main column; kept for compatibility. */
export const mainMenuHeaderMainClass = "min-w-0 w-full"

/** Single column shared by header profile, filters, dashboard, and calendar on shell pages. */
export const mainMenuShellContentClass = appPageContainerClass

export const mainMenuShellBodyClass = "mt-4 w-full space-y-4"

export const mainMenuBackLinkClass = `text-sm ${themeLinkMuted}`

export const mainMenuBackLinkSlotClass = "text-sm leading-none"

export const mainMenuTitleClass = `mt-3 min-h-[2rem] ${themePageTitle}`

/** Optional larger page title (+6px vs default text-2xl) for primary feature pages. */
export const mainMenuLargePageTitleClass =
  "mt-3 min-h-[2rem] text-3xl font-bold tracking-tight text-foreground"

export const mainMenuProfileClass = `mt-3 w-full text-sm ${themeMenuSummary}`

export const mainMenuIntroClass = `mt-6 w-full text-sm ${themeMuted}`

/** Group heading above a hub card grid (finance section groups). */
export const mainMenuGroupHeadingClass =
  "text-xs font-semibold uppercase tracking-wide text-muted-foreground"

export const mainMenuGroupSectionClass = "space-y-3"

export const mainMenuGroupedGridsClass = "mt-4 space-y-8"

export const mainMenuDescriptionLinkClass = `underline hover:text-foreground ${themeMuted}`

export const mainMenuLogoutButtonClass = `${themeBtnSecondary} shrink-0`

/** Fixed two-column hub card grid — 976px total, 482px tracks (Main Menu reference). */
export const mainMenuGridClass =
  "hub-menu-grid mt-4 grid w-[976px] max-w-full grid-cols-[482px_482px] gap-[12px]"

/** @alias mainMenuGridClass — shared hub menu grid on all section pages. */
export const hubMenuGridClass = mainMenuGridClass

/** Fixed hub card outer width — never driven by content length. */
export const mainMenuCardWidthClass =
  "hub-menu-card w-[482px] min-w-[482px] max-w-[482px]"

/** @alias mainMenuCardWidthClass */
export const hubMenuCardWidthClass = mainMenuCardWidthClass

export const mainMenuCardHeightClass =
  "h-[108px] min-h-[108px] max-h-[108px]"

export const mainMenuCardShellClass = `box-border flex ${mainMenuCardWidthClass} ${mainMenuCardHeightClass} flex-none flex-col overflow-hidden rounded border p-3`

export const mainMenuCardClass = `${mainMenuCardShellClass} border-[var(--btn-secondary-border)] bg-card transition-colors hover:bg-[var(--btn-secondary-hover)]`

/** @alias mainMenuCardClass */
export const hubMenuCardClass = mainMenuCardClass

export const mainMenuCardPlannedClass = `${mainMenuCardShellClass} border-border bg-[var(--btn-disabled-bg)]`

export const mainMenuCardTitleSlotClass =
  "hub-menu-card-title-slot flex w-[458px] min-w-[458px] max-w-[458px] min-h-[2.5rem] max-h-[2.5rem] shrink-0 items-start justify-between gap-2 overflow-hidden"

export const mainMenuCardHintSlotClass =
  "hub-menu-card-hint-slot mt-1 w-[458px] min-w-[458px] max-w-[458px] min-h-[2.5rem] max-h-[2.5rem] shrink-0 overflow-hidden"

export const mainMenuCardTitleClass =
  "block overflow-hidden text-ellipsis line-clamp-2 text-sm font-semibold leading-5 text-card-foreground"

export const mainMenuCardHintClass =
  "block overflow-hidden text-ellipsis line-clamp-2 text-xs leading-5 text-muted-foreground"

export const mainMenuCardBadgeClass =
  "shrink-0 self-start rounded bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"

export const MAIN_MENU_LAYOUT_SPEC = {
  pageMaxWidthPx: MAIN_MENU_PAGE_MAX_WIDTH_PX,
  pagePaddingPx: MAIN_MENU_PAGE_PADDING_PX,
  pageInnerWidthPx: MAIN_MENU_INNER_WIDTH_PX,
  gridWidthPx: MAIN_MENU_GRID_WIDTH_PX,
  gridGapPx: MAIN_MENU_GRID_GAP_PX,
  cardWidthPx: MAIN_MENU_CARD_WIDTH_PX,
  cardHeightPx: MAIN_MENU_CARD_HEIGHT_PX,
  cardPaddingPx: MAIN_MENU_CARD_PADDING_PX,
  cardInnerWidthPx: MAIN_MENU_CARD_INNER_WIDTH_PX,
  cardTitleSlotHeightPx: 40,
  cardHintSlotHeightPx: 40,
} as const

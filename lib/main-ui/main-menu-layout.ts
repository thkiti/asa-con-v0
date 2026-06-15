import {
  themeBtnSecondary,
  themeLinkMuted,
  themeMenuSummary,
  themeMuted,
  themePage,
  themePageTitle,
} from "@/lib/theme/theme-classes"

/**
 * /main reference box model at 16px root, max-w-5xl page:
 * inner width = 1024 - 48 padding = 976px
 * two columns + 12px gap => card width = (976 - 12) / 2 = 482px
 */
export const MAIN_MENU_PAGE_MAX_WIDTH_PX = 1024
export const MAIN_MENU_PAGE_PADDING_PX = 24
export const MAIN_MENU_INNER_WIDTH_PX = 976
export const MAIN_MENU_GRID_WIDTH_PX = 976
export const MAIN_MENU_GRID_GAP_PX = 12
export const MAIN_MENU_CARD_WIDTH_PX = 482
export const MAIN_MENU_CARD_HEIGHT_PX = 108
export const MAIN_MENU_CARD_PADDING_PX = 12
export const MAIN_MENU_CARD_INNER_WIDTH_PX =
  MAIN_MENU_CARD_WIDTH_PX - MAIN_MENU_CARD_PADDING_PX * 2

/** `/main` page shell — container width and horizontal margins. */
export const mainMenuPageClass = `mx-auto max-w-5xl p-6 ${themePage}`

/**
 * Header row — nowrap keeps logout on the same row as /main at all hub widths.
 */
export const mainMenuHeaderClass =
  "flex flex-nowrap items-start justify-between gap-4 border-b border-border pb-4"

export const mainMenuHeaderMainClass = "min-w-0 w-full flex-1"

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

/**
 * Fixed grid — 976px total, two 482px columns, 12px gap. No 1fr / w-full tracks.
 * Literal Tailwind strings (not template literals) so the compiler emits these rules.
 */
export const mainMenuGridClass =
  "mt-4 grid w-[976px] grid-cols-[482px_482px] gap-[12px]"

/** Fixed menu card outer box — identical on every hub page. */
export const mainMenuCardWidthClass =
  "w-[482px] min-w-[482px] max-w-[482px]"

export const mainMenuCardHeightClass =
  "h-[108px] min-h-[108px] max-h-[108px]"

export const mainMenuCardShellClass = `box-border flex ${mainMenuCardWidthClass} ${mainMenuCardHeightClass} flex-none flex-col overflow-hidden rounded border p-3`

export const mainMenuCardClass = `${mainMenuCardShellClass} border-[var(--btn-secondary-border)] bg-card transition-colors hover:bg-[var(--btn-secondary-hover)]`

export const mainMenuCardPlannedClass = `${mainMenuCardShellClass} border-border bg-[var(--btn-disabled-bg)]`

export const mainMenuCardTitleSlotClass =
  "flex w-[458px] min-w-[458px] max-w-[458px] min-h-[2.5rem] max-h-[2.5rem] shrink-0 items-start justify-between gap-2 overflow-hidden"

export const mainMenuCardHintSlotClass =
  "mt-1 w-[458px] min-w-[458px] max-w-[458px] min-h-[2.5rem] max-h-[2.5rem] shrink-0 overflow-hidden"

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

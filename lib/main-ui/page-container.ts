import { themePage } from "@/lib/theme/theme-classes"

/** max-w-5xl (1024px) outer frame; inner content width = 1024 − 2×24px padding = 976px. */
export const APP_PAGE_MAX_WIDTH_PX = 1024
export const APP_PAGE_PADDING_PX = 24
export const APP_PAGE_CONTENT_WIDTH_PX = 976

/**
 * Centered page shell — max width and horizontal padding.
 * Used on `<main>` for hub menus, finance admin pages, and feature shells.
 */
export const appPageShellClass = `mx-auto w-full max-w-5xl p-6 ${themePage}`

/**
 * Inner content column inside the shell.
 * Heading, staff panel, filters, tables, and card grids share this width.
 */
export const appPageContainerClass = "app-page-container w-full max-w-full"

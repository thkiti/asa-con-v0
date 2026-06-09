/**
 * Measures hub card pixel boxes with Playwright.
 * Run: npx tsx scripts/measure-main-menu-card-pixels.ts
 */
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { chromium } from "playwright"
import { MainMenuView } from "../components/main/MainMenuView"
import { MainMenuSectionView } from "../components/main/MainMenuSectionView"
import { OperationsHubView } from "../components/operations/OperationsHubView"
import { MasterHubView } from "../components/master/MasterHubView"
import type { SessionUserApi } from "../lib/auth/session-user-api"
import { getMainMenuSectionDetail } from "../lib/main-ui/main-menu"
import {
  MAIN_MENU_CARD_HEIGHT_PX,
  MAIN_MENU_CARD_WIDTH_PX,
  mainMenuCardClass,
  mainMenuGridClass,
} from "../lib/main-ui/main-menu-layout"

const hoAdmin: SessionUserApi = {
  userId: "u1",
  staffId: "001",
  name: "Admin User",
  role: "HO_ADMIN",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "Head Office",
}

const PAGE_SHELL = `
  * { box-sizing: border-box; }
  body { margin: 0; font-family: system-ui, sans-serif; }
  .page { max-width: 1024px; margin: 0 auto; padding: 24px; }
`

const FLEX_BEFORE_GRID = `
  .grid { display: grid; margin-top: 16px; width: 100%; gap: 12px; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .card { display: flex; flex-direction: column; width: 100%; height: 108px; padding: 12px; border: 1px solid #3f3f46; overflow: hidden; }
`

function buildHtml(body: string, extraCss: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>${PAGE_SHELL}${extraCss}</style></head><body><div class="page">${body}</div></body></html>`
}

function extractFirstCardMarkup(fullHtml: string): string {
  const match = fullHtml.match(
    /<(?:a|div)[^>]*data-testid="main-menu-card"[^>]*>[\s\S]*?<\/(?:a|div)>/
  )
  return match?.[0] ?? ""
}

function injectUtilityCss(html: string): string {
  return html
    .replaceAll(mainMenuGridClass, "grid")
    .replaceAll(mainMenuCardClass, "card")
    .replaceAll("cursor-pointer", "")
}

async function measureFirstCard(
  pageName: string,
  rendered: string,
  extraCss: string
): Promise<{ page: string; width: number; height: number }> {
  const card = extractFirstCardMarkup(rendered)
  const grid = `<nav class="grid">${card}</nav>`
  const file = join(process.cwd(), `.tmp-measure-${pageName.replace(/\//g, "_")}.html`)
  writeFileSync(file, buildHtml(injectUtilityCss(grid), extraCss), "utf8")

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
  await page.goto(`file:///${file.replace(/\\/g, "/")}`)
  const box = await page.locator(".card").first().boundingBox()
  await browser.close()

  return {
    page: pageName,
    width: Math.round(box?.width ?? 0),
    height: Math.round(box?.height ?? 0),
  }
}

async function main() {
  const operations = getMainMenuSectionDetail("HO_ADMIN", "operations")!
  const finance = getMainMenuSectionDetail("HO_ADMIN", "finance")!
  const system = getMainMenuSectionDetail("HO_ADMIN", "system")!
  const shop = getMainMenuSectionDetail("HO_ADMIN", "shop")!

  const pages: Array<{ name: string; html: string }> = [
    {
      name: "/main",
      html: renderToStaticMarkup(createElement(MainMenuView, { user: hoAdmin })),
    },
    {
      name: "/main/operations",
      html: renderToStaticMarkup(
        createElement(MainMenuSectionView, { user: hoAdmin, section: operations })
      ),
    },
    {
      name: "/operations",
      html: renderToStaticMarkup(
        createElement(OperationsHubView, { user: hoAdmin, section: operations })
      ),
    },
    {
      name: "/master",
      html: renderToStaticMarkup(createElement(MasterHubView, { user: hoAdmin })),
    },
    {
      name: "/main/finance",
      html: renderToStaticMarkup(
        createElement(MainMenuSectionView, { user: hoAdmin, section: finance })
      ),
    },
    {
      name: "/main/system",
      html: renderToStaticMarkup(
        createElement(MainMenuSectionView, { user: hoAdmin, section: system })
      ),
    },
    {
      name: "/main/shop",
      html: renderToStaticMarkup(
        createElement(MainMenuSectionView, { user: hoAdmin, section: shop })
      ),
    },
  ]

  const beforeMain = await measureFirstCard("/main", pages[0].html, FLEX_BEFORE_GRID)
  console.log("BEFORE /main (flexible 1fr + w-full card):")
  console.table([{ ...beforeMain, page: "/main" }])

  const fixedCss = `
  .grid { display: grid; margin-top: 16px; width: 976px; gap: 12px; grid-template-columns: 482px 482px; }
  .card { display: flex; flex-direction: column; width: 482px; min-width: 482px; max-width: 482px; height: 108px; padding: 12px; border: 1px solid #3f3f46; overflow: hidden; }
`

  const after: Array<{ page: string; width: number; height: number }> = []
  for (const entry of pages) {
    after.push(await measureFirstCard(entry.name, entry.html, fixedCss))
  }

  console.log("AFTER all hub pages (fixed 482x108px cards):")
  console.table(after)

  const ok = after.every(
    (row) =>
      row.width === MAIN_MENU_CARD_WIDTH_PX && row.height === MAIN_MENU_CARD_HEIGHT_PX
  )
  console.log(`Target: ${MAIN_MENU_CARD_WIDTH_PX}x${MAIN_MENU_CARD_HEIGHT_PX}px`)
  console.log(`All pages identical: ${ok}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})

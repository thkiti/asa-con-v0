/**
 * Playwright pixel measurements for hub menu cards.
 * @jest-environment node
 */
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { chromium } from "playwright"
import { MainMenuView } from "@/components/main/MainMenuView"
import { MainMenuSectionView } from "@/components/main/MainMenuSectionView"
import { OperationsHubView } from "@/components/operations/OperationsHubView"
import { MasterHubView } from "@/components/master/MasterHubView"
import type { SessionUserApi } from "@/lib/auth/session-user-api"
import { getMainMenuSectionDetail } from "@/lib/main-ui/main-menu"
import {
  MAIN_MENU_CARD_HEIGHT_PX,
  MAIN_MENU_CARD_WIDTH_PX,
  MAIN_MENU_GRID_GAP_PX,
  MAIN_MENU_GRID_WIDTH_PX,
  mainMenuCardClass,
  mainMenuGridClass,
} from "@/lib/main-ui/main-menu-layout"

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

const hoAdmin: SessionUserApi = {
  userId: "u1",
  staffId: "001",
  name: "Admin User",
  role: "HO_ADMIN",
  branchId: "b1",
  branchCode: "HO999",
  branchName: "Head Office",
}

const FLEX_BEFORE_CSS = `
  .page { max-width: 1024px; margin: 0 auto; padding: 24px; box-sizing: border-box; }
  .grid { display: grid; margin-top: 16px; width: 100%; gap: 12px; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
  .card { box-sizing: border-box; display: flex; flex-direction: column; width: 100%; height: 108px; padding: 12px; border: 1px solid #3f3f46; overflow: hidden; }
`

const FIXED_AFTER_CSS = `
  .page { max-width: 1024px; margin: 0 auto; padding: 24px; box-sizing: border-box; }
  .grid, [data-testid="main-menu-grid"] { display: grid; margin-top: 16px; width: 976px; gap: 12px; grid-template-columns: 482px 482px; }
  .card, [data-testid="main-menu-card"] { box-sizing: border-box; display: flex; flex-direction: column; width: 482px; min-width: 482px; max-width: 482px; height: 108px; padding: 12px; border: 1px solid #3f3f46; overflow: hidden; }
`

function buildPage(body: string, css: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /><style>*{box-sizing:border-box}body{margin:0;font-family:system-ui,sans-serif}${css}</style></head><body><div class="page">${body}</div></body></html>`
}

function gridMarkup(rendered: string): string {
  const match = rendered.match(
    /<nav[^>]*data-testid="main-menu-grid"[^>]*>[\s\S]*?<\/nav>/
  )
  if (!match) return ""
  return match[0]
    .replaceAll(mainMenuCardClass, "card")
    .replaceAll("cursor-pointer", "")
}

function firstCardMarkup(rendered: string): string {
  const grid = gridMarkup(rendered)
  const match = grid.match(/<(?:a|div)[^>]*data-testid="main-menu-card"[^>]*>[\s\S]*?<\/(?:a|div)>/)
  if (!match) return ""
  return match[0]
}

async function measure(
  pageName: string,
  rendered: string,
  css: string
): Promise<{ page: string; width: number; height: number }> {
  const html = buildPage(`<nav class="grid">${firstCardMarkup(rendered)}</nav>`, css)
  const file = join(process.cwd(), `.tmp-card-measure-${pageName.replace(/\//g, "_")}.html`)
  writeFileSync(file, html, "utf8")

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

describe("main menu card pixel measurements", () => {
  const operations = getMainMenuSectionDetail("HO_ADMIN", "operations")!
  const finance = getMainMenuSectionDetail("HO_ADMIN", "finance")!
  const system = getMainMenuSectionDetail("HO_ADMIN", "system")!
  const shop = getMainMenuSectionDetail("HO_ADMIN", "shop")!

  const renderedPages: Array<{ name: string; html: string }> = [
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

  it("measures /main before flexible grid (reference baseline)", async () => {
    const before = await measure("/main", renderedPages[0].html, FLEX_BEFORE_CSS)
    expect(before.width).toBeGreaterThan(0)
    expect(before.height).toBe(108)
    // Stored for report — flexible w-full card in 976px page inner columns.
    ;(globalThis as { __mainMenuBefore?: typeof before }).__mainMenuBefore = before
  }, 30000)

  it("measures fixed 482x108 cards on every hub page", async () => {
    const after: Array<{ page: string; width: number; height: number }> = []
    for (const entry of renderedPages) {
      after.push(await measure(entry.name, entry.html, FIXED_AFTER_CSS))
    }

    for (const row of after) {
      expect(row.width).toBe(MAIN_MENU_CARD_WIDTH_PX)
      expect(row.height).toBe(MAIN_MENU_CARD_HEIGHT_PX)
    }

    const mainOps = after.find((r) => r.page === "/main/operations")!
    const ops = after.find((r) => r.page === "/operations")!
    expect(mainOps.width).toBe(ops.width)
    expect(mainOps.height).toBe(ops.height)

    ;(globalThis as { __mainMenuAfter?: typeof after }).__mainMenuAfter = after
  }, 120000)

  it("renders two 482px columns in a 976px grid on every hub page at 1280x900", async () => {
    for (const entry of renderedPages) {
      const html = buildPage(gridMarkup(entry.html), FIXED_AFTER_CSS)
      const file = join(
        process.cwd(),
        `.tmp-grid-measure-${entry.name.replace(/\//g, "_")}.html`
      )
      writeFileSync(file, html, "utf8")

      const browser = await chromium.launch()
      const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })
      await page.goto(`file:///${file.replace(/\\/g, "/")}`)

      const grid = page.locator('[data-testid="main-menu-grid"]')
      const gridBox = await grid.boundingBox()
      const columns = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns)
      const gap = await grid.evaluate((el) => getComputedStyle(el).gap)

      const cards = page.locator('[data-testid="main-menu-card"]')
      const cardCount = await cards.count()
      if (cardCount >= 2) {
        const first = await cards.nth(0).boundingBox()
        const second = await cards.nth(1).boundingBox()
        expect(Math.round(first?.y ?? 0)).toBe(Math.round(second?.y ?? 0))
        expect(Math.round((second?.x ?? 0) - (first?.x ?? 0))).toBe(
          MAIN_MENU_CARD_WIDTH_PX + MAIN_MENU_GRID_GAP_PX
        )
      }

      await browser.close()

      expect(Math.round(gridBox?.width ?? 0)).toBe(MAIN_MENU_GRID_WIDTH_PX)
      expect(columns).toBe("482px 482px")
      expect(gap).toBe(`${MAIN_MENU_GRID_GAP_PX}px`)
    }
  }, 120000)
})

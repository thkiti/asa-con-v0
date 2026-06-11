/**
 * @jest-environment jsdom
 */
import { renderToStaticMarkup } from "react-dom/server"
import { MainMenuGrid } from "@/components/main/MainMenuGrid"
import {
  mainMenuCardHeightClass,
  mainMenuCardHintSlotClass,
  mainMenuCardTitleSlotClass,
  mainMenuCardWidthClass,
  mainMenuGridClass,
} from "@/lib/main-ui/main-menu-layout"

describe("MainMenuGrid", () => {
  it("uses shared fixed menu card box primitives", () => {
    const html = renderToStaticMarkup(
      <MainMenuGrid
        ariaLabel="Test menu"
        items={[
          {
            key: "short",
            label: "Finance",
            hint: "Periods",
            href: "/main/finance",
            status: "available",
          },
          {
            key: "long",
            label: "Product & Reference Stock",
            hint: "Search product and hook reference links; view product with reference stock together.",
            href: "/master/product-reference",
            status: "available",
          },
          {
            key: "planned",
            label: "Journal",
            hint: "General ledger entries and posting workflow for accounting periods.",
            status: "planned",
          },
        ]}
      />
    )

    expect(html).toContain(mainMenuGridClass)
    expect(html).toContain(mainMenuCardWidthClass)
    expect(html).toContain(mainMenuCardHeightClass)
    expect(html).toContain(mainMenuCardTitleSlotClass)
    expect(html).toContain(mainMenuCardHintSlotClass)
    expect(html).toContain("w-[976px]")
    expect(html).toContain("482px")
    expect(html).toContain("line-clamp-2")
    expect(html).toContain("max-h-[108px]")
    expect(html).not.toContain("min-h-[5.25rem]")
    expect(html).not.toContain("min-h-[5.5rem]")
  })
})

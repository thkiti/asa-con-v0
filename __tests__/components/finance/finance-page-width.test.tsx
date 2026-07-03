import fs from "node:fs"
import path from "node:path"
import { renderToStaticMarkup } from "react-dom/server"
import { FinanceAdminPageShell } from "@/components/finance/FinanceAdminPageShell"
import { FinanceMenuView } from "@/components/finance/FinanceMenuView"
import { FinancePageShell } from "@/components/finance/FinancePageShell"
import {
  financePageContentClass,
  financePageShellClass,
} from "@/lib/main-ui/finance-page-layout"

jest.mock("@/lib/finance-ui/period-fetchers", () => ({
  fetchAccountingPeriods: jest.fn().mockResolvedValue({ periods: [] }),
  fetchSessionDisplay: jest.fn().mockResolvedValue(null),
}))

jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

const FINANCE_WIDTH_TARGET_PAGES = [
  "app/(main)/finance/page.tsx",
  "app/(main)/finance/periods/page.tsx",
  "app/(main)/finance/periods/[id]/review/page.tsx",
  "app/(main)/finance/periods/[id]/close-readiness/page.tsx",
  "app/(main)/finance/periods/[id]/timeline/page.tsx",
  "app/(main)/finance/periods/[id]/reopen-evidence/page.tsx",
] as const

function readRepoFile(relativePath: string): string {
  return fs.readFileSync(path.join(process.cwd(), relativePath), "utf8")
}

describe("Finance page width shell", () => {
  it("defines one shared shell and content column", () => {
    expect(financePageShellClass).toContain("max-w-5xl")
    expect(financePageShellClass).toContain("p-6")
    expect(financePageContentClass).toContain("finance-page-content")
    expect(financePageContentClass).toContain("app-page-container")
    expect(financePageContentClass).not.toContain("max-w-xl")
    expect(financePageContentClass).not.toContain("976px")
  })

  it("FinancePageShell renders the shared shell and content wrapper", () => {
    const html = renderToStaticMarkup(
      <FinancePageShell testId="finance-page-test">
        <p>Body</p>
      </FinancePageShell>
    )

    expect(html).toContain("max-w-5xl")
    expect(html).toContain("finance-page-content")
    expect(html).toContain('data-testid="finance-page-content"')
    expect(html).not.toContain("max-w-xl")
  })

  it("FinanceAdminPageShell uses FinancePageShell content wrapper", () => {
    const html = renderToStaticMarkup(
      <FinanceAdminPageShell
        backHref="/finance/periods"
        backLabel="← Accounting periods"
        heading={<h1>Title</h1>}
        intro="Intro"
      >
        <table className="theme-admin-table w-full" />
      </FinanceAdminPageShell>
    )

    expect(html).toContain("finance-page-content")
    expect(html).toContain('data-testid="finance-page-body"')
    expect(html).toContain("finance-page-body")
    expect(html).not.toContain("max-w-xl")
  })

  it("Finance hub uses the same FinancePageShell content wrapper", () => {
    const html = renderToStaticMarkup(
      <FinanceMenuView
        user={{
          name: "Finance User",
          role: "HO_FINANCE",
          staffId: "staff-1",
          branchId: "branch-1",
          documentEntityCode: "AS",
        }}
      />
    )

    expect(html).toContain('data-testid="finance-hub-page"')
    expect(html).toContain("finance-page-content")
    expect(html).not.toContain('data-testid="main-menu-page"')
  })

  it("target Finance routes use FinancePageShell or FinanceAdminPageShell", () => {
    for (const relativePath of FINANCE_WIDTH_TARGET_PAGES) {
      const source = readRepoFile(relativePath)
      if (relativePath === "app/(main)/finance/page.tsx") {
        expect(source).toContain("FinanceMenuView")
      } else {
        expect(source).toContain("FinanceAdminPageShell")
      }
      expect(source).not.toMatch(/<main className=\{financeAdminPageClass\}/)
    }
  })

  it("globals.css stretches finance admin tables and panels to full column width", () => {
    const css = readRepoFile("app/globals.css")
    expect(css).toContain(".finance-page-body > *")
    expect(css).toContain(".finance-page-content .theme-admin-table")
    expect(css).toMatch(/width:\s*100%/)
  })

  it("period table uses w-full admin table class", () => {
    const source = readRepoFile("components/finance/PeriodTable.tsx")
    expect(source).toContain("themeAdminTable")
    expect(source).not.toContain("min-w-full")
  })

  it("period review and close readiness panels use w-full sections", () => {
    expect(readRepoFile("components/finance/PeriodReviewPage.tsx")).toContain(
      'className="w-full rounded border'
    )
    expect(readRepoFile("components/finance/CloseReadinessPage.tsx")).toContain(
      'className="w-full rounded border'
    )
    expect(
      readRepoFile("components/finance/CloseReadinessEvidenceActions.tsx")
    ).toContain('className="w-full rounded border')
  })
})

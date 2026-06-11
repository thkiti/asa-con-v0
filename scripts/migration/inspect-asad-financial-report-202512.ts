/**
 * Inspection-only parser for ASAD FinReport-202512.xls (31/12/2025 closing).
 * No database writes. Outputs CSV extracts under data/migration/inspection/.
 *
 * Usage:
 *   npx tsx scripts/migration/inspect-asad-financial-report-202512.ts
 *   npx tsx scripts/migration/inspect-asad-financial-report-202512.ts --file="O:/asa-con/account/asad/FinReport-202512.xls"
 *
 * xlsx dependency: resolved from asa-con-v0 (if installed) or sibling ../asa-con/node_modules/xlsx.
 * To add locally: npm install -D xlsx
 */
import fs from "node:fs"
import path from "node:path"

type XlsxModule = typeof import("xlsx")

type SheetRow = (string | number)[]

type TbAccount = {
  name: string
  code: number
  debit: number
  credit: number
  inferredType: string
  inferredGroup: string
  hasBalance: boolean
}

const DEFAULT_FILE = "O:/asa-con/account/asad/FinReport-202512.xls"
const OUT_DIR = path.join(process.cwd(), "data/migration/inspection")

function parseArgs(argv: string[]): { filePath: string } {
  const fileFlag = argv.find((a) => a.startsWith("--file="))
  return { filePath: fileFlag?.slice("--file=".length) ?? DEFAULT_FILE }
}

function resolveXlsx(): XlsxModule {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("xlsx") as XlsxModule
  } catch {
    const sibling = path.resolve(process.cwd(), "../asa-con/node_modules/xlsx")
    if (fs.existsSync(sibling)) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require(sibling) as XlsxModule
    }
    throw new Error(
      "xlsx package not found. Install in asa-con-v0 (npm install -D xlsx) or ensure ../asa-con/node_modules/xlsx exists.",
    )
  }
}

function csvEscape(value: string | number | boolean): string {
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function writeCsv(fileName: string, headers: string[], rows: (string | number | boolean)[][]): void {
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ]
  fs.mkdirSync(OUT_DIR, { recursive: true })
  fs.writeFileSync(path.join(OUT_DIR, fileName), lines.join("\n") + "\n", "utf8")
}

function inferAccountType(code: number): string {
  if (code < 1000) return "EQUITY"
  const prefix = Math.floor(code / 1000)
  if (prefix === 1) return "ASSET"
  if (prefix === 2) return "ASSET"
  if (prefix === 3) return "ASSET"
  if (prefix === 4) return "LIABILITY"
  if (prefix === 5) return "REVENUE"
  if (prefix >= 6 && prefix <= 8) return "EXPENSE"
  if (prefix === 9) return "EXPENSE"
  return "UNKNOWN"
}

function inferGroup(code: number): string {
  if (code < 1000) return "EQUITY"
  const prefix = Math.floor(code / 1000)
  const map: Record<number, string> = {
    1: "CURRENT_ASSET",
    2: "NON_CURRENT_ASSET",
    3: "OTHER_ASSET",
    4: "LIABILITY",
    5: "REVENUE",
    6: "COGS",
    7: "SELLING_EXPENSE",
    8: "ADMIN_EXPENSE",
    9: "TAX_SPECIAL",
  }
  return map[prefix] ?? "UNKNOWN"
}

function isBalanceSheetAccount(code: number): boolean {
  if (code < 1000) return true
  const prefix = Math.floor(code / 1000)
  return prefix >= 1 && prefix <= 4
}

function isProfitLossAccount(code: number): boolean {
  const prefix = Math.floor(code / 1000)
  return prefix >= 5 && prefix <= 9
}

function parseTrialBalance(rows: SheetRow[]): TbAccount[] {
  const accounts: TbAccount[] = []
  for (let i = 7; i < rows.length; i++) {
    const r = rows[i]
    const name = String(r[0] ?? "").trim()
    const code = r[1]
    if (typeof code !== "number" || !name) continue
    const debit = Number(r[2]) || 0
    const credit = Number(r[3]) || 0
    accounts.push({
      name,
      code,
      debit,
      credit,
      inferredType: inferAccountType(code),
      inferredGroup: inferGroup(code),
      hasBalance: debit !== 0 || credit !== 0,
    })
  }
  return accounts
}

function sumDebitCredit(accounts: TbAccount[]): { debit: number; credit: number } {
  return accounts.reduce(
    (acc, a) => ({ debit: acc.debit + a.debit, credit: acc.credit + a.credit }),
    { debit: 0, credit: 0 },
  )
}

function parseBalanceSheetLines(rows: SheetRow[]): { section: string; label: string; note: string; amount2568: number | ""; amount2567: number | "" }[] {
  const out: { section: string; label: string; note: string; amount2568: number | ""; amount2567: number | "" }[] = []
  let section = ""
  for (const r of rows) {
    const col0 = String(r[0] ?? "").trim()
    const col1 = String(r[1] ?? "").trim()
    if (col0 && !col1 && !r[4]) {
      if (col0.includes("สินทรัพย์") || col0.includes("หนี้สิน") || col0.includes("ส่วนของผู้ถือหุ้น")) {
        section = col0
      }
    }
    const label = col1 || col0
    if (!label) continue
    const note = String(r[6] ?? "").trim()
    const amount2568 = typeof r[8] === "number" ? r[8] : ""
    const amount2567 = typeof r[10] === "number" ? r[10] : ""
    if (amount2568 !== "" || amount2567 !== "") {
      out.push({ section, label, note, amount2568, amount2567 })
    }
  }
  return out
}

function parseProfitLossLines(rows: SheetRow[]): { label: string; amount2568: number | ""; amount2567: number | "" }[] {
  const out: { label: string; amount2568: number | ""; amount2567: number | "" }[] = []
  for (const r of rows) {
    const label = [0, 1, 2, 3]
      .map((i) => String(r[i] ?? "").trim())
      .filter(Boolean)
      .join(" ")
    const amount2568 = typeof r[8] === "number" ? r[8] : ""
    const amount2567 = typeof r[10] === "number" ? r[10] : ""
    if (!label) continue
    if (amount2568 !== "" || amount2567 !== "") {
      out.push({ label, amount2568, amount2567 })
    }
  }
  return out
}

function main(): void {
  const { filePath } = parseArgs(process.argv.slice(2))
  if (!fs.existsSync(filePath)) {
    throw new Error(`Source file not found: ${filePath}`)
  }

  const XLSX = resolveXlsx()
  const wb = XLSX.readFile(filePath)
  const stat = fs.statSync(filePath)

  const sheetInventory = wb.SheetNames.map((name) => {
    const sheet = wb.Sheets[name]
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as SheetRow[]
    const maxCols = rows.reduce((m, r) => Math.max(m, r.length), 0)
    const meta = wb.Workbook?.Sheets?.find((s) => s.name === name)
    const hidden = meta?.Hidden === 1 ? "hidden" : meta?.Hidden === 2 ? "very_hidden" : "visible"
    return { name, rows: rows.length, cols: maxCols, hidden }
  })

  writeCsv(
    "asad_202512_sheets_inventory.csv",
    ["sheet_name", "row_count", "col_count", "visibility", "detected_sections"],
    sheetInventory.map((s) => {
      const sections: Record<string, string> = {
        "Trial Balance": "GL trial balance (account code, debit, credit)",
        "Working Paper": "Cross-check TB + P&L + BS columns",
        "Profit Loss": "P&L statement (summary lines)",
        "Profit Loss Compare": "P&L month/YTD comparison",
        "Balance Sheet": "Balance sheet (summary lines, 2568 vs 2567)",
        "งบแสดงการเปลี่ยนแปลงส่วน": "Statement of changes in equity",
      }
      return [s.name, s.rows, s.cols, s.hidden, sections[s.name] ?? ""]
    }),
  )

  const tbRows = XLSX.utils.sheet_to_json(wb.Sheets["Trial Balance"], {
    header: 1,
    defval: "",
  }) as SheetRow[]
  const accounts = parseTrialBalance(tbRows)

  writeCsv(
    "asad_202512_coa_candidate.csv",
    ["account_code", "account_name", "inferred_type", "inferred_group", "parent_note"],
    accounts.map((a) => [a.code, a.name, a.inferredType, a.inferredGroup, "from TB row order; no explicit parent id"]),
  )

  writeCsv(
    "asad_202512_trial_balance_candidate.csv",
    ["account_code", "account_name", "debit", "credit", "inferred_type", "has_balance", "as_of_date"],
    accounts.map((a) => [
      a.code,
      a.name,
      a.debit.toFixed(2),
      a.credit.toFixed(2),
      a.inferredType,
      a.hasBalance,
      "2025-12-31",
    ]),
  )

  const bsLines = parseBalanceSheetLines(
    XLSX.utils.sheet_to_json(wb.Sheets["Balance Sheet"], { header: 1, defval: "" }) as SheetRow[],
  )
  writeCsv(
    "asad_202512_balance_sheet_candidate.csv",
    ["section", "line_label", "note_ref", "amount_2568_baht", "amount_2567_baht", "as_of_date"],
    bsLines.map((l) => [l.section, l.label, l.note, l.amount2568, l.amount2567, "2025-12-31"]),
  )

  const plLines = parseProfitLossLines(
    XLSX.utils.sheet_to_json(wb.Sheets["Profit Loss"], { header: 1, defval: "" }) as SheetRow[],
  )
  writeCsv(
    "asad_202512_pl_candidate.csv",
    ["line_label", "amount_2568_baht", "amount_2567_baht", "period_end"],
    plLines.map((l) => [l.label, l.amount2568, l.amount2567, "2025-12-31"]),
  )

  const fullTb = sumDebitCredit(accounts)
  const bsAccounts = accounts.filter((a) => isBalanceSheetAccount(a.code))
  const plAccounts = accounts.filter((a) => isProfitLossAccount(a.code))
  const bsTotals = sumDebitCredit(bsAccounts.filter((a) => a.hasBalance))
  const plTotals = sumDebitCredit(plAccounts)
  // P&L accounts (5xxx–9xxx) already include tax expense (9001); net = credits − debits.
  const netProfitAfterTax = plTotals.credit - plTotals.debit

  const reAccount = accounts.find((a) => a.code === 301)
  const closedReCredit = (reAccount?.credit ?? 0) + netProfitAfterTax
  const closedOpeningDebit = bsTotals.debit
  const closedOpeningCredit =
    bsTotals.credit - (reAccount?.credit ?? 0) + closedReCredit

  const summary = {
    sourceFile: filePath,
    fileSizeBytes: stat.size,
    fileModified: stat.mtime.toISOString(),
    sheets: sheetInventory,
    trialBalance: {
      accountRows: accounts.length,
      nonZeroBalanceRows: accounts.filter((a) => a.hasBalance).length,
      totalDebit: fullTb.debit,
      totalCredit: fullTb.credit,
      balanced: Math.abs(fullTb.debit - fullTb.credit) < 0.02,
      asOfDate: "2025-12-31",
      reportTitleYear: "2568 (Buddhist) = 2025-12-31",
    },
    openingJournal: {
      fullTrialBalance: {
        totalDebit: fullTb.debit,
        totalCredit: fullTb.credit,
        difference: fullTb.debit - fullTb.credit,
        balanced: Math.abs(fullTb.debit - fullTb.credit) < 0.02,
        note: "Includes open YTD P&L accounts — not suitable as 01/01/2026 opening without year-end close.",
      },
      balanceSheetOnlyNonZero: {
        totalDebit: bsTotals.debit,
        totalCredit: bsTotals.credit,
        difference: bsTotals.debit - bsTotals.credit,
        balanced: Math.abs(bsTotals.debit - bsTotals.credit) < 0.02,
        note: "Unclosed P&L remains in revenue/expense accounts; equity RE (301) is pre-current-year-profit.",
      },
      closedToEquityEstimate: {
        netProfitAfterTax,
        retainedEarnings301Before: reAccount?.credit ?? 0,
        retainedEarnings301After: closedReCredit,
        totalDebit: closedOpeningDebit,
        totalCredit: closedOpeningCredit,
        difference: closedOpeningDebit - closedOpeningCredit,
        balanced: Math.abs(closedOpeningDebit - closedOpeningCredit) < 0.02,
        note: "Estimate: roll all P&L (5xxx–9xxx) into account 301; zero P&L lines for 01/01/2026 opening.",
      },
    },
    balanceSheetHighlights: {
      totalAssets: bsLines.find((l) => l.label === "รวมสินทรัพย์")?.amount2568,
      totalLiabilities: bsLines.find((l) => l.label === "รวมหนี้สิน")?.amount2568,
      totalEquity: bsLines.find((l) => l.label === "รวมส่วนของผู้ถือหุ้น")?.amount2568,
      inventory: bsLines.find((l) => l.label === "สินค้าคงเหลือ")?.amount2568,
      bank: bsLines.find((l) => l.label.includes("เงินสดและรายการเทียบเท่า"))?.amount2568,
    },
    profitLossHighlights: {
      revenue: plLines.find((l) => l.label.includes("รวมรายได้"))?.amount2568,
      expenses: plLines.find((l) => l.label.includes("รวมค่าใช้จ่าย"))?.amount2568,
      netProfit: plLines.find((l) => l.label.includes("กำไร (ขาดทุน) สุทธิ"))?.amount2568,
    },
    outputDir: OUT_DIR,
  }

  console.log(JSON.stringify(summary, null, 2))
}

main()

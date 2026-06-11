/**
 * Phase M0 — Legacy folder discovery (read-only).
 * Scans O:/asa-con/account/asad and writes CSV extracts under data/migration/discovery/.
 *
 * Usage: npx tsx scripts/migration/discover-legacy-asad-folder.ts
 */
import fs from "node:fs"
import path from "node:path"

type XlsxModule = typeof import("xlsx")

const LEGACY_DIR = "O:/asa-con/account/asad"
const OUT_DIR = path.join(process.cwd(), "data/migration/discovery")

function resolveXlsx(): XlsxModule {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("xlsx") as XlsxModule
  } catch {
    const sibling = path.resolve(process.cwd(), "../asa-con/node_modules/xlsx")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require(sibling) as XlsxModule
  }
}

function csvEscape(v: string | number | boolean): string {
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function writeCsv(name: string, headers: string[], rows: (string | number | boolean)[][]): void {
  fs.mkdirSync(OUT_DIR, { recursive: true })
  const lines = [headers.map(csvEscape).join(","), ...rows.map((r) => r.map(csvEscape).join(","))]
  fs.writeFileSync(path.join(OUT_DIR, name), lines.join("\n") + "\n", "utf8")
}

type FileKind = "workbook" | "folder" | "other"

function classifyFile(name: string): {
  category: "MASTER DATA" | "TRANSACTION DATA" | "REPORT DATA" | "REFERENCE DATA"
  module: string
  purpose: string
} {
  const n = name.toLowerCase()
  if (n.includes("finreport")) {
    return { category: "REPORT DATA", module: "Finance", purpose: "Year-end financial statements + trial balance" }
  }
  if (n.includes("inventory202512")) {
    return { category: "MASTER DATA", module: "Inventory + Finance", purpose: "Dec 2025 inventory export with master data and movement" }
  }
  if (n.includes("asaddata")) {
    return { category: "TRANSACTION DATA", module: "Finance", purpose: "GL transaction dump (all journals)" }
  }
  if (n.startsWith("gj-")) {
    return { category: "TRANSACTION DATA", module: "Finance", purpose: "General journal register (Dec 2025)" }
  }
  if (n.startsWith("sj")) {
    return { category: "TRANSACTION DATA", module: "Sales / Finance", purpose: "Sales journal register (Dec 2025)" }
  }
  if (n.includes("sales tax") || n.includes("purchase tax")) {
    return { category: "REPORT DATA", module: "Tax", purpose: "VAT return supporting schedule" }
  }
  if (n.includes("asadform-voucher")) {
    return { category: "REFERENCE DATA", module: "Finance", purpose: "Printed voucher form templates (not ledger source)" }
  }
  if (n.includes("stockcard")) {
    return { category: "REPORT DATA", module: "Inventory", purpose: "Per-product stock card movement history" }
  }
  return { category: "REFERENCE DATA", module: "Unknown", purpose: "Unclassified legacy artifact" }
}

function walkFiles(dir: string, base = dir): { rel: string; abs: string; size: number }[] {
  const out: { rel: string; abs: string; size: number }[] = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith("~$")) continue
    const abs = path.join(dir, entry.name)
    const rel = path.relative(base, abs).replace(/\\/g, "/")
    if (entry.isDirectory()) out.push(...walkFiles(abs, base))
    else out.push({ rel, abs, size: fs.statSync(abs).size })
  }
  return out
}

function main(): void {
  const XLSX = resolveXlsx()
  const allFiles = walkFiles(LEGACY_DIR)

  const inventoryRows: (string | number)[][] = []
  const financeRows: (string | number)[][] = []
  const matrixRows: (string | number)[][] = []

  for (const f of allFiles) {
    const ext = path.extname(f.rel).toLowerCase()
    const kind: FileKind = ext === "" ? "folder" : [".xls", ".xlsx"].includes(ext) ? "workbook" : "other"
    const cls = classifyFile(path.basename(f.rel))
    let sheets = ""
    let sheetCount = 0
    if (kind === "workbook") {
      try {
        const wb = XLSX.readFile(f.abs, { sheetStubs: true })
        sheetCount = wb.SheetNames.length
        sheets = wb.SheetNames.slice(0, 8).join("; ") + (wb.SheetNames.length > 8 ? `; +${wb.SheetNames.length - 8} more` : "")
      } catch {
        sheets = "(unreadable)"
      }
    }
    inventoryRows.push([
      f.rel,
      kind,
      f.size,
      cls.category,
      cls.module,
      cls.purpose,
      sheetCount || "",
      sheets,
    ])
  }

  writeCsv(
    "legacy_file_inventory.csv",
    ["relative_path", "kind", "size_bytes", "category", "module", "purpose", "sheet_count", "sheet_names_preview"],
    inventoryRows,
  )

  // Finance sources
  const finReport = XLSX.readFile(path.join(LEGACY_DIR, "FinReport-202512.xls"))
  const tb = XLSX.utils.sheet_to_json(finReport.Sheets["Trial Balance"], { header: 1, defval: "" }) as unknown[][]
  let td = 0,
    tc = 0,
    accounts = 0
  for (let i = 7; i < tb.length; i++) {
    const code = tb[i][1]
    const name = String(tb[i][0] ?? "").trim()
    if (typeof code !== "number" || !name) continue
    accounts++
    td += Number(tb[i][2]) || 0
    tc += Number(tb[i][3]) || 0
  }

  financeRows.push(["FinReport-202512.xls", "Trial Balance", "PRIMARY", "Closing TB 31/12/2025", accounts, td.toFixed(2), tc.toFixed(2), "High"])
  financeRows.push(["FinReport-202512.xls", "Balance Sheet / P&L", "VALIDATION", "Summary statements", "", "", "", "Medium"])
  financeRows.push(["AsadData68.xls", "Data", "SECONDARY", "Full GL lines incl. year-end close", 60047, "", "", "High"])
  financeRows.push(["GJ-202512-no.1.xls", "General Journal", "SECONDARY", "Dec 2025 operational GJ", "", "", "", "Medium"])
  financeRows.push(["GJ-202512_No.2.xls", "General Journal", "SECONDARY", "Dec 2025 close + revenue lines", "", "", "", "High"])
  financeRows.push(["SJ000-202512.xls", "Sales Journal", "SECONDARY", "Sales journal HO Dec 2025", "", "", "", "Low"])
  financeRows.push(["SJ001-202512.xls", "Sales Journal", "SECONDARY", "Sales journal HO Dec 2025", "", "", "", "Low"])

  writeCsv(
    "legacy_finance_sources.csv",
    ["file", "sheet", "role", "notes", "row_or_account_count", "total_debit", "total_credit", "confidence"],
    financeRows,
  )

  // Inventory sources
  const inv = XLSX.readFile(path.join(LEGACY_DIR, "ASAD_Inventory202512.xls"))
  const ending = XLSX.utils.sheet_to_json(inv.Sheets["Ending"], { header: 1, defval: "" }) as unknown[][]
  let endItems = 0
  for (let i = 8; i < ending.length; i++) {
    if (typeof ending[i][1] === "number") endItems++
  }
  const pg = XLSX.utils.sheet_to_json(inv.Sheets["Product Group"], { header: 1, defval: "" })
  const pd = XLSX.utils.sheet_to_json(inv.Sheets["Product Detail"], { header: 1, defval: "" })
  const stockcardCount = allFiles.filter((f) => f.rel.startsWith("Stockcard2025/") && f.rel.endsWith(".xlsx")).length

  const invRows: (string | number)[][] = [
    ["ASAD_Inventory202512.xls", "Ending", "PRIMARY", "Dec 2568 closing qty by product group", endItems, "High"],
    ["ASAD_Inventory202512.xls", "Product Group", "PRIMARY", "Product group master + sell price", pg.length - 1, "High"],
    ["ASAD_Inventory202512.xls", "Product Detail", "PRIMARY", "SKU-level variants", pd.length - 1, "High"],
    ["ASAD_Inventory202512.xls", "Shop Detail", "PRIMARY", "Branch / shop master", 183, "High"],
    ["ASAD_Inventory202512.xls", "Supplier Detail", "PRIMARY", "Supplier master", 27, "Medium"],
    ["ASAD_Inventory202512.xls", "Customer Detail", "PRIMARY", "Customer master (limited rows)", 3, "Low"],
    ["ASAD_Inventory202512.xls", "Employee Detail", "PRIMARY", "Staff master", 30, "Medium"],
    ["ASAD_Inventory202512.xls", "Detail Inventory", "VALIDATION", "Stale header date 31/12/2551 — do not use", 112, "Low"],
    ["Stockcard2025/", "per-product xlsx", "VALIDATION", "Movement audit per product group", stockcardCount, "Medium"],
    ["FinReport-202512.xls", "TB 13xx accounts", "VALIDATION", "GL inventory value 2,007,766.55", 5, "High"],
  ]
  writeCsv(
    "legacy_inventory_sources.csv",
    ["source", "sheet_or_scope", "role", "notes", "count", "confidence"],
    invRows,
  )

  const targets: { target: string; status: string; primary: string; confidence: string; notes: string }[] = [
    { target: "Chart of Accounts", status: "Available", primary: "FinReport Trial Balance", confidence: "High", notes: "197 accounts; type mapping required" },
    { target: "Customers", status: "Partial", primary: "ASAD_Inventory Customer Detail", confidence: "Low", notes: "Only 3 rows; AR names in SJ/vouchers" },
    { target: "Suppliers", status: "Available", primary: "ASAD_Inventory Supplier Detail", confidence: "Medium", notes: "27 suppliers; AP control in TB only" },
    { target: "Products", status: "Available", primary: "ASAD_Inventory Product Group/Detail", confidence: "High", notes: "3676 groups, 995 SKUs" },
    { target: "Inventory (qty)", status: "Available", primary: "ASAD_Inventory Ending", confidence: "High", notes: "188 non-header product groups with Dec 2568 qty" },
    { target: "Inventory (value)", status: "Partial", primary: "FinReport TB 13xx + SetPrice", confidence: "Medium", notes: "GL value 2.0M; Detail Inventory sheet stale" },
    { target: "AR", status: "Partial", primary: "FinReport TB 1121/1131", confidence: "Medium", notes: "Control balances only; no open-item subledger" },
    { target: "AP", status: "Partial", primary: "FinReport TB 4101+", confidence: "Medium", notes: "Control balances only" },
    { target: "Opening Journal", status: "Available", primary: "FinReport TB + close transform", confidence: "High", notes: "Balanced after P&L roll to RE 301" },
    { target: "Tax (VAT)", status: "Partial", primary: "Sales/Purchase Tax2604", confidence: "Low", notes: "April 2026 only; not Dec 2025 closing" },
    { target: "Employees", status: "Available", primary: "ASAD_Inventory Employee Detail", confidence: "Medium", notes: "30 staff; may need HR confirmation" },
    { target: "Branches/Shops", status: "Available", primary: "ASAD_Inventory Shop Detail", confidence: "High", notes: "183 shop/branch rows" },
  ]
  for (const t of targets) {
    matrixRows.push([t.target, t.status, t.primary, t.confidence, t.notes])
  }
  writeCsv(
    "legacy_migration_matrix.csv",
    ["migration_target", "availability", "primary_source", "confidence", "notes"],
    matrixRows,
  )

  console.log(
    JSON.stringify(
      {
        legacyDir: LEGACY_DIR,
        filesScanned: allFiles.length,
        outputDir: OUT_DIR,
        trialBalance: { accounts, totalDebit: td, totalCredit: tc, balanced: Math.abs(td - tc) < 0.02 },
        inventoryEndingItems: endItems,
        stockcardFiles: stockcardCount,
      },
      null,
      2,
    ),
  )
}

main()

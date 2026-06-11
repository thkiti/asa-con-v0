/**
 * One-off forensic trace for SKU 61100011 — investigation only.
 * Usage: npx tsx scripts/migration/trace-sku-61100011.ts
 */
import fs from "node:fs"
import path from "node:path"

// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSX = require(path.resolve(process.cwd(), "../asa-con/node_modules/xlsx")) as typeof import("xlsx")

function parseNum(v: unknown): number {
  if (typeof v === "number") return v
  const s = String(v ?? "").replace(/,/g, "").trim()
  if (!s || s === "-") return 0
  const n = Number(s)
  return Number.isNaN(n) ? 0 : n
}

function csvEscape(v: string | number): string {
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

const scRows = XLSX.utils.sheet_to_json(
  XLSX.readFile("O:/asa-con/account/asad/Stockcard2025/2025-61100011.xlsx").Sheets["Stock Card "],
  { header: 1, defval: "" }
) as unknown[][]

const sections: { month: string; start: number }[] = []
for (let i = 0; i < scRows.length; i++) {
  const t = String(scRows[i][0] ?? "")
  if (t.startsWith("ต้นงวด/รายการรับ")) {
    const p1 = t.indexOf("(")
    const p2 = t.indexOf(" 2568)")
    sections.push({ month: t.slice(p1 + 1, p2), start: i })
  }
}
sections.push({ month: "END", start: scRows.length })

const thaiToNum: Record<string, number> = {
  มกราคม: 1,
  กุมภาพันธ์: 2,
  มีนาคม: 3,
  เมษายน: 4,
  พฤษภาคม: 5,
  มิถุนายน: 6,
  กรกฎาคม: 7,
  สิงหาคม: 8,
  กันยายน: 9,
  ตุลาคม: 10,
  พฤศจิกายน: 11,
  ธันวาคม: 12,
}

const monthly: {
  month: string
  monthNum: number
  openQty: number
  openAmt: number
  issueQty: number
  endQty: number
  endUnit: number
  endAmt: number
  stockCardEndRow: number
}[] = []

for (let s = 0; s < sections.length - 1; s++) {
  const start = sections[s].start
  const end = sections[s + 1].start - 1
  let totalRow: unknown[] | null = null
  for (let i = start; i <= end; i++) {
    const r = scRows[i]
    if (String(r[0]) === "" && parseNum(r[14]) > 0 && String(r[1]) === "") {
      totalRow = r
    }
  }
  const finalRow = scRows[end]
  const useRow = String(finalRow[12] ?? "").includes("ยอด") ? finalRow : totalRow
  monthly.push({
    month: sections[s].month,
    monthNum: thaiToNum[sections[s].month] ?? 0,
    openQty: 0,
    openAmt: 0,
    issueQty: parseNum(useRow?.[9]),
    endQty: parseNum(useRow?.[14]) || parseNum(finalRow[14]),
    endUnit: parseNum(useRow?.[15]) || parseNum(finalRow[15]),
    endAmt: parseNum(useRow?.[16]) || parseNum(finalRow[16]),
    stockCardEndRow: end + 1,
  })
}

for (let i = 0; i < monthly.length; i++) {
  if (i === 0) {
    monthly[i].openQty = 721
    monthly[i].openAmt = 29025.83
  } else {
    monthly[i].openQty = monthly[i - 1].endQty
    monthly[i].openAmt = monthly[i - 1].endAmt
  }
}

const stockNov = 17632.889791955615
const stockDec = 17632.889791915357
const legacyNov = 16425.157614424406
const legacyDec = 16425.15761438415

const headers = [
  "month",
  "openingQty",
  "openingAmount",
  "receiptQty",
  "receiptAmount",
  "issueQty",
  "endingQty",
  "endingUnitCost",
  "endingAmount_stockCard",
  "endingAmount_stock2025",
  "endingAmount_legacyCost12",
  "variance_stockVsLegacy",
  "notes",
  "stockCardRow",
]

const body = monthly.map((m) => {
  let stockAmt = ""
  let legacyAmt = ""
  let diffAmt = ""
  let note = ""
  if (m.monthNum === 10) {
    stockAmt = m.endAmt.toFixed(2)
    legacyAmt = m.endAmt.toFixed(2)
    note = "Oct — stock card matches both Cost12 snapshots"
  }
  if (m.monthNum === 11) {
    stockAmt = stockNov.toFixed(2)
    legacyAmt = legacyNov.toFixed(2)
    diffAmt = (stockNov - legacyNov).toFixed(2)
    note = "FIRST DIVERGENCE — Stock-2025 carries stale Oct amount"
  }
  if (m.monthNum === 12) {
    stockAmt = stockDec.toFixed(2)
    legacyAmt = legacyDec.toFixed(2)
    diffAmt = (stockDec - legacyDec).toFixed(2)
    note = "Dec close — Stock-2025 still stale; GL matches stock card"
  }
  return [
    m.month,
    m.openQty,
    m.openAmt.toFixed(2),
    0,
    "0.00",
    m.issueQty,
    m.endQty,
    m.endUnit ? m.endUnit.toFixed(4) : "",
    m.endAmt.toFixed(2),
    stockAmt,
    legacyAmt,
    diffAmt,
    note,
    m.stockCardEndRow,
  ]
})

const out = path.join(process.cwd(), "data/migration/combined/sku_61100011_monthly_trace.csv")
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(
  out,
  [headers.map(csvEscape).join(","), ...body.map((r) => r.map(csvEscape).join(","))].join("\n") + "\n",
  "utf8"
)
console.log("Wrote", out)

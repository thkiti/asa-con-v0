const THAI_DIGITS = [
  "ศูนย์",
  "หนึ่ง",
  "สอง",
  "สาม",
  "สี่",
  "ห้า",
  "หก",
  "เจ็ด",
  "แปด",
  "เก้า",
] as const

function readTwoDigits(value: number): string {
  if (value === 0) return ""
  if (value < 10) return THAI_DIGITS[value]!

  const tens = Math.floor(value / 10)
  const ones = value % 10
  let text = ""

  if (tens === 1) {
    text = "สิบ"
  } else if (tens === 2) {
    text = "ยี่สิบ"
  } else {
    text = `${THAI_DIGITS[tens]}สิบ`
  }

  if (ones === 1) {
    text += "เอ็ด"
  } else if (ones > 0) {
    text += THAI_DIGITS[ones]
  }

  return text
}

function readThreeDigits(value: number): string {
  if (value === 0) return ""

  const hundreds = Math.floor(value / 100)
  const remainder = value % 100
  let text = ""

  if (hundreds > 0) {
    text += hundreds === 1 ? "หนึ่ง" : THAI_DIGITS[hundreds]
    text += "ร้อย"
  }

  text += readTwoDigits(remainder)
  return text
}

function readInteger(value: number): string {
  if (value === 0) return THAI_DIGITS[0]

  const parts: string[] = []
  let remaining = value

  const millions = Math.floor(remaining / 1_000_000)
  if (millions > 0) {
    parts.push(`${readThreeDigits(millions)}ล้าน`)
    remaining %= 1_000_000
  }

  const hundredThousands = Math.floor(remaining / 100_000)
  if (hundredThousands > 0) {
    parts.push(`${THAI_DIGITS[hundredThousands]}แสน`)
    remaining %= 100_000
  }

  const tenThousands = Math.floor(remaining / 10_000)
  if (tenThousands > 0) {
    parts.push(`${readTwoDigits(tenThousands)}หมื่น`)
    remaining %= 10_000
  }

  const thousands = Math.floor(remaining / 1_000)
  if (thousands > 0) {
    parts.push(`${readThreeDigits(thousands)}พัน`)
    remaining %= 1_000
  }

  if (remaining > 0) {
    parts.push(readThreeDigits(remaining))
  }

  return parts.join("")
}

function parseAmount(value: number | string): number {
  const n = Number(String(value ?? "").trim().replace(/,/g, "") || "0")
  return Number.isFinite(n) ? n : 0
}

/** Thai baht amount in words — e.g. "## สามพันบาทถ้วน ##" */
export function formatThaiBahtAmountInWords(amount: number | string): string {
  const absolute = Math.abs(parseAmount(amount))
  const baht = Math.floor(absolute)
  const satang = Math.round((absolute - baht) * 100)

  if (baht === 0 && satang === 0) {
    return "## ศูนย์บาทถ้วน ##"
  }

  let text = readInteger(baht) + "บาท"
  if (satang === 0) {
    text += "ถ้วน"
  } else {
    text += readInteger(satang) + "สตางค์"
  }

  return `## ${text} ##`
}

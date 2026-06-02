import iconv from "iconv-lite"

export function decodeTis620(value: unknown): string {
  if (value == null || value === "") return ""
  return iconv
    .decode(Buffer.from(String(value), "binary"), "tis620")
    .replace(/\0/g, "")
    .trim()
}

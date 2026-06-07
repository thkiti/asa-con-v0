import fs from "fs/promises"
import { createRequire } from "node:module"

const require = createRequire(import.meta.url)
const sharp = require("sharp")
const { pdf } = await import("pdf-to-img")

async function readInput() {
  const arg = process.argv[2]
  if (arg) {
    const raw = await fs.readFile(arg, "utf8")
    return JSON.parse(raw)
  }
  const chunks = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim()
  if (!raw) throw new Error("No input provided")
  return JSON.parse(raw)
}

async function main() {
  const input = await readInput()
  const pdfPath = String(input.pdfPath ?? "")
  const rotateDeg = Number(input.rotateDeg ?? 180)

  if (!pdfPath) {
    throw new Error("pdfPath is required")
  }

  const renderScale = Number(input.renderScale ?? 2)
  const pageNo = Number(input.pageNo ?? 1)
  if (!Number.isInteger(pageNo) || pageNo < 1) {
    throw new Error("pageNo must be a positive integer")
  }

  const document = await pdf(pdfPath, { scale: renderScale })
  let pageBuffer = null
  let currentPage = 0

  for await (const image of document) {
    currentPage += 1
    if (currentPage === pageNo) {
      pageBuffer = Buffer.from(image)
      break
    }
  }

  if (typeof document.destroy === "function") {
    await document.destroy()
  }

  if (!pageBuffer) {
    throw new Error(`Page ${pageNo} not found`)
  }

  const png = await sharp(pageBuffer).rotate(rotateDeg).png().toBuffer()
  process.stdout.write(png)
}

main().catch((err) => {
  console.error("catalog-image-page-preview-worker failed:", err)
  process.exit(1)
})

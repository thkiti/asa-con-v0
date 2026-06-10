import type { NextRequest } from "next/server"
import { GlAccountImportError } from "@/lib/finance/gl-account-import-errors"

const MAX_CSV_BYTES = 2 * 1024 * 1024

export async function readCoaCsvFromRequest(req: NextRequest): Promise<string> {
  const form = await req.formData()
  const file = form.get("file")

  if (!file || typeof file === "string") {
    throw new GlAccountImportError("CSV file is required", "EMPTY_FILE")
  }

  const blob = file as Blob
  if (blob.size === 0) {
    throw new GlAccountImportError("CSV file is empty", "EMPTY_FILE")
  }
  if (blob.size > MAX_CSV_BYTES) {
    throw new GlAccountImportError(
      `CSV file exceeds maximum size of ${MAX_CSV_BYTES} bytes`,
      "FILE_TOO_LARGE"
    )
  }

  const name = "name" in file ? String((file as File).name) : ""
  if (name && !name.toLowerCase().endsWith(".csv")) {
    throw new GlAccountImportError(
      "Only .csv files are supported in this release",
      "VALIDATION_FAILED"
    )
  }

  return blob.text()
}

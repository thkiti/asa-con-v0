export type ConfirmedSaveUxItem = {
  productCode: string
  finalFileName?: string
  status: "SAVED" | "DUPLICATE" | "ERROR"
  error?: string
}

export type ConfirmedSaveUxResult = {
  uploadableProductCodes: string[]
  saveMessage: string | null
  errorMessage: string | null
  shouldResetPage: boolean
}

export function getUploadableProductCodesFromSaveItems(
  items: ConfirmedSaveUxItem[]
): string[] {
  return items
    .filter((item) => item.status === "SAVED" || item.status === "DUPLICATE")
    .map((item) => item.productCode)
}

function formatErrorDetail(items: ConfirmedSaveUxItem[]): string {
  return items
    .map((item) => {
      const label = item.finalFileName || item.productCode
      return `${label}: ${item.error ?? item.status}`
    })
    .join("; ")
}

function formatSavedMessage(finalDir: string, savedCount: number): string {
  return `Saved ${savedCount} file${savedCount === 1 ? "" : "s"} to ${finalDir}`
}

export function buildConfirmedSaveUxResult(params: {
  finalDir: string
  items: ConfirmedSaveUxItem[]
}): ConfirmedSaveUxResult {
  const { finalDir, items } = params
  const savedItems = items.filter((item) => item.status === "SAVED")
  const duplicateItems = items.filter((item) => item.status === "DUPLICATE")
  const errorItems = items.filter((item) => item.status === "ERROR")

  const savedCount = savedItems.length
  const duplicateCount = duplicateItems.length
  const errorCount = errorItems.length
  const uploadableProductCodes = getUploadableProductCodesFromSaveItems(items)

  let saveMessage: string | null = null
  let errorMessage: string | null = null
  let shouldResetPage = false

  if (errorCount > 0) {
    const detail = formatErrorDetail(errorItems)
    errorMessage =
      uploadableProductCodes.length > 0
        ? `Some files were not saved — ${detail}`
        : `No files were saved — ${detail}`
  }

  if (errorCount === 0) {
    if (savedCount > 0 && duplicateCount === 0) {
      saveMessage = formatSavedMessage(finalDir, savedCount)
      shouldResetPage = true
    } else if (savedCount === 0 && duplicateCount > 0) {
      saveMessage = `Local files already exist. Ready to upload. Duplicate local files: ${duplicateCount}`
      shouldResetPage = true
    } else if (savedCount > 0 && duplicateCount > 0) {
      saveMessage = `${formatSavedMessage(finalDir, savedCount)}. Duplicate local files: ${duplicateCount}`
      shouldResetPage = true
    }
  } else if (uploadableProductCodes.length > 0) {
    const parts: string[] = []
    if (savedCount > 0) {
      parts.push(formatSavedMessage(finalDir, savedCount))
    }
    if (duplicateCount > 0) {
      parts.push(`Duplicate local files: ${duplicateCount}`)
    }
    saveMessage = parts.join(". ")
  }

  return {
    uploadableProductCodes,
    saveMessage,
    errorMessage,
    shouldResetPage,
  }
}

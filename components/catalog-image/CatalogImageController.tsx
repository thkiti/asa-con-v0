"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { assignCatalogSlotProductCodes } from "@/lib/catalog-image/assign-slot-codes"
import {
  hasManualAssignedSlotEdits,
  resolveAssignedSlotsForSave,
  updateAssignedSlotProductId,
  validateAssignedSlotProductIds,
} from "@/lib/catalog-image/assigned-slot-product-ids"
import { CatalogImageError } from "@/lib/catalog-image/errors"
import {
  applyCropRectFieldUpdate,
  buildCropTemplate,
  nudgeCropRect,
  roundCropDecimal,
  type CropImageSize,
  type CropRect,
  type CropTemplate,
} from "@/lib/catalog-image-ui/crop-template"
import { buildConfirmedSaveUxResult } from "@/lib/catalog-image-ui/confirmed-save-ux"
import {
  buildConfirmedSaveBlobFormData,
  fetchCatalogImageConfirmedSaveBlobs,
  fetchCatalogImageOpenFile,
  fetchCatalogImageUploadToCloud,
} from "@/lib/catalog-image-ui/fetchers"
import type { CatalogImageCloudUploadItemResult } from "@/lib/catalog-image-ui/types"
import type { CatalogImageAssignedSlot } from "@/lib/catalog-image-ui/types"
import {
  cropCatalogPdfPageSlots,
  renderCatalogPdfPagePreview,
  revokeCatalogPdfBlobUrl,
} from "@/lib/catalog-image-ui/pdf-render"
import {
  CatalogImageView,
  type CatalogImageCropSettingsVM,
} from "./CatalogImageView"

const CROP_NUDGE_STEP = 0.1

const DEFAULT_CROP_SETTINGS: CatalogImageCropSettingsVM = {
  rotateDeg: 180,
  columns: 3,
  rows: 2,
}

function getOpenedFileDisplayPath(file: File): string {
  const withPath = file as File & { path?: string }
  if (withPath.path) return withPath.path
  return file.name
}

export function CatalogImageController() {
  const [openedFilePath, setOpenedFilePath] = useState<string | null>(null)
  const [opening, setOpening] = useState(false)
  const [cropSettings, setCropSettings] =
    useState<CatalogImageCropSettingsVM>(DEFAULT_CROP_SETTINGS)
  const [cropRect, setCropRect] = useState<CropRect | null>(null)
  const [imageNaturalSize, setImageNaturalSize] = useState<CropImageSize | null>(
    null
  )
  const imageNaturalSizeRef = useRef<CropImageSize | null>(null)
  const cropTemplateRef = useRef<CropTemplate | null>(null)
  const [layoutPreviewUrl, setLayoutPreviewUrl] = useState<string | null>(null)
  const [layoutPreviewLoading, setLayoutPreviewLoading] = useState(false)
  const [selectedPage] = useState(1)
  const [productIdInput, setProductIdInput] = useState("")
  const [assignedSlots, setAssignedSlots] = useState<CatalogImageAssignedSlot[]>(
    []
  )
  const [saving, setSaving] = useState(false)
  const [replaceLocalFilesOnSave, setReplaceLocalFilesOnSave] = useState(false)
  const [lastSaveMessage, setLastSaveMessage] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [lastUploadMessage, setLastUploadMessage] = useState<string | null>(
    null
  )
  const [uploadErrorDetail, setUploadErrorDetail] = useState<
    CatalogImageCloudUploadItemResult[] | null
  >(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const openFileInFlightRef = useRef(false)
  const prevRotateDegRef = useRef(cropSettings.rotateDeg)
  const selectedPdfFileRef = useRef<File | null>(null)
  const previewRenderIdRef = useRef(0)
  const layoutPreviewUrlRef = useRef<string | null>(null)

  const resetPreviewWorkflowState = useCallback(() => {
    setCropRect(null)
    imageNaturalSizeRef.current = null
    setImageNaturalSize(null)
    cropTemplateRef.current = null
    setAssignedSlots([])
    setProductIdInput("")
  }, [])

  const revokeLayoutPreviewUrl = useCallback(() => {
    revokeCatalogPdfBlobUrl(layoutPreviewUrlRef.current)
    layoutPreviewUrlRef.current = null
    setLayoutPreviewUrl(null)
  }, [])

  const resetPageAfterSuccessfulSave = useCallback(() => {
    revokeLayoutPreviewUrl()
    setOpenedFilePath(null)
    selectedPdfFileRef.current = null
    setLayoutPreviewLoading(false)
    setCropSettings(DEFAULT_CROP_SETTINGS)
    prevRotateDegRef.current = DEFAULT_CROP_SETTINGS.rotateDeg
    setProductIdInput("")
    setAssignedSlots([])
    setError(null)
    resetPreviewWorkflowState()
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [resetPreviewWorkflowState, revokeLayoutPreviewUrl])

  const clearPreviewForNewFile = useCallback(() => {
    revokeLayoutPreviewUrl()
    resetPreviewWorkflowState()
    setLayoutPreviewLoading(false)
  }, [resetPreviewWorkflowState, revokeLayoutPreviewUrl])

  const renderClientPreview = useCallback(
    async (file: File, rotateDeg: number) => {
      const renderId = previewRenderIdRef.current + 1
      previewRenderIdRef.current = renderId
      setLayoutPreviewLoading(true)
      setError(null)

      try {
        const preview = await renderCatalogPdfPagePreview({
          file,
          pageNo: selectedPage,
          rotateDeg,
        })

        if (previewRenderIdRef.current !== renderId) {
          revokeCatalogPdfBlobUrl(preview.blobUrl)
          return
        }

        revokeLayoutPreviewUrl()
        layoutPreviewUrlRef.current = preview.blobUrl
        setLayoutPreviewUrl(preview.blobUrl)
        setLayoutPreviewLoading(false)
      } catch (err) {
        if (previewRenderIdRef.current !== renderId) return
        setLayoutPreviewLoading(false)
        setError(err instanceof Error ? err.message : "Page preview failed")
      }
    },
    [revokeLayoutPreviewUrl, selectedPage]
  )

  useEffect(() => {
    return () => {
      previewRenderIdRef.current += 1
      revokeCatalogPdfBlobUrl(layoutPreviewUrlRef.current)
      layoutPreviewUrlRef.current = null
    }
  }, [])

  useEffect(() => {
    const file = selectedPdfFileRef.current
    if (!file) return
    if (prevRotateDegRef.current === cropSettings.rotateDeg) return
    prevRotateDegRef.current = cropSettings.rotateDeg
    resetPreviewWorkflowState()
    void renderClientPreview(file, cropSettings.rotateDeg)
  }, [cropSettings.rotateDeg, renderClientPreview, resetPreviewWorkflowState])

  const handleOpenFile = useCallback(
    async (file: File) => {
      if (!(file instanceof File) || file.size <= 0) {
        return
      }
      if (openFileInFlightRef.current) {
        return
      }

      openFileInFlightRef.current = true
      setOpening(true)
      setError(null)
      setLastSaveMessage(null)
      setLastUploadMessage(null)
      setUploadErrorDetail(null)
      clearPreviewForNewFile()
      setOpenedFilePath(getOpenedFileDisplayPath(file))
      selectedPdfFileRef.current = file
      prevRotateDegRef.current = cropSettings.rotateDeg

      try {
        await fetchCatalogImageOpenFile(file)
        await renderClientPreview(file, cropSettings.rotateDeg)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to open file"
        setError(message)
        setOpenedFilePath(null)
        selectedPdfFileRef.current = null
        clearPreviewForNewFile()
        setLayoutPreviewLoading(false)
      } finally {
        openFileInFlightRef.current = false
        setOpening(false)
      }
    },
    [clearPreviewForNewFile, cropSettings.rotateDeg, renderClientPreview]
  )

  const handleLayoutPreviewLoad = useCallback(() => {
    setLayoutPreviewLoading(false)
  }, [])

  const handleLayoutPreviewError = useCallback(() => {
    setLayoutPreviewLoading(false)
    setError("Page preview failed to load")
  }, [])

  const handleImageDimensionsChange = useCallback((size: CropImageSize) => {
    if (size.width > 0 && size.height > 0) {
      imageNaturalSizeRef.current = size
      setImageNaturalSize(size)
    } else {
      imageNaturalSizeRef.current = null
      setImageNaturalSize(null)
    }
  }, [])

  const handleCropRectChange = useCallback((rect: CropRect) => {
    setCropRect(rect)
  }, [])

  const handleCropRectFieldChange = useCallback(
    (field: keyof CropRect, value: number) => {
      if (!Number.isFinite(value)) return
      setCropRect((prev) => {
        const size = imageNaturalSizeRef.current
        if (!prev || !size) return prev
        return applyCropRectFieldUpdate(
          prev,
          field,
          value,
          size.width,
          size.height
        )
      })
    },
    []
  )

  const handleCropNudge = useCallback(
    (direction: "left" | "right" | "up" | "down") => {
      setCropRect((prev) => {
        const size = imageNaturalSizeRef.current
        if (!prev || !size) return prev
        return nudgeCropRect(
          prev,
          direction,
          CROP_NUDGE_STEP,
          size.width,
          size.height
        )
      })
    },
    []
  )

  const handleCropSettingsChange = useCallback(
    (settings: CatalogImageCropSettingsVM) => {
      setCropSettings({
        ...settings,
        rotateDeg: roundCropDecimal(settings.rotateDeg),
      })
    },
    []
  )

  const handleCropTemplateChange = useCallback((template: CropTemplate) => {
    cropTemplateRef.current = template
  }, [])

  const handleAssignSlots = useCallback(() => {
    setError(null)
    const trimmed = productIdInput.trim()
    if (!trimmed) {
      setError("Enter a starting Product ID before assigning slots")
      return
    }

    if (
      assignedSlots.length > 0 &&
      hasManualAssignedSlotEdits(assignedSlots, trimmed)
    ) {
      const confirmed = window.confirm(
        "One or more slot Product IDs were edited manually. Assign Slot will recalculate all slot IDs. Continue?"
      )
      if (!confirmed) return
    }

    const slotCount = Math.max(1, cropSettings.rows) * Math.max(1, cropSettings.columns)
    try {
      const slots = assignCatalogSlotProductCodes(trimmed, slotCount)
      setAssignedSlots(slots)
    } catch (err) {
      const message =
        err instanceof CatalogImageError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Failed to assign slots"
      setError(message)
    }
  }, [
    assignedSlots,
    cropSettings.columns,
    cropSettings.rows,
    productIdInput,
  ])

  const handleAssignedSlotProductIdChange = useCallback(
    (sourceSlot: number, productId: string) => {
      setError(null)
      setAssignedSlots((prev) =>
        updateAssignedSlotProductId(prev, sourceSlot, productId)
      )
    },
    []
  )

  const handleConfirmedSave = useCallback(async () => {
    setError(null)
    setLastSaveMessage(null)
    setLastUploadMessage(null)
    setUploadErrorDetail(null)

    const pdfFile = selectedPdfFileRef.current
    if (!pdfFile) {
      setError("Open a PDF file first")
      return
    }
    if (!cropRect || !imageNaturalSizeRef.current) {
      setError("Crop position is not ready")
      return
    }
    if (assignedSlots.length === 0) {
      setError("Assign slots before saving")
      return
    }

    const validation = validateAssignedSlotProductIds(assignedSlots)
    if (!validation.ok) {
      setError(validation.message)
      return
    }

    let resolvedSlots
    try {
      resolvedSlots = resolveAssignedSlotsForSave(assignedSlots)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid assigned Product ID"
      )
      return
    }

    const cropTemplate =
      cropTemplateRef.current ??
      buildCropTemplate(
        cropSettings,
        imageNaturalSizeRef.current.width,
        imageNaturalSizeRef.current.height,
        cropRect
      )

    setSaving(true)
    try {
      const croppedSlots = await cropCatalogPdfPageSlots({
        file: pdfFile,
        pageNo: selectedPage,
        rotateDeg: cropSettings.rotateDeg,
        columns: cropSettings.columns,
        rows: cropSettings.rows,
        cropArea: cropTemplate,
      })

      const assignedBySlot = new Map(
        resolvedSlots.map((slot) => [slot.sourceSlot, slot] as const)
      )
      const uploadSlots = croppedSlots
        .filter((slot) => assignedBySlot.has(slot.sourceSlot))
        .map((slot) => {
          const assigned = assignedBySlot.get(slot.sourceSlot)!
          return {
            sourceSlot: slot.sourceSlot,
            productCode: assigned.productCode,
            blob: slot.blob,
          }
        })

      if (uploadSlots.length === 0) {
        setError("No cropped slots matched assigned product codes")
        return
      }

      const result = await fetchCatalogImageConfirmedSaveBlobs(
        buildConfirmedSaveBlobFormData({
          assignedSlots: uploadSlots,
          replace: replaceLocalFilesOnSave,
        })
      )

      const uxResult = buildConfirmedSaveUxResult({
        finalDir: result.finalDir,
        items: result.items,
      })

      setLastSaveMessage(uxResult.saveMessage)
      setError(uxResult.errorMessage)

      if (uxResult.shouldResetPage) {
        resetPageAfterSuccessfulSave()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmed save failed")
    } finally {
      setSaving(false)
    }
  }, [
    assignedSlots,
    cropRect,
    cropSettings,
    replaceLocalFilesOnSave,
    resetPageAfterSuccessfulSave,
    selectedPage,
  ])

  const handleUploadToCloud = useCallback(async () => {
    setUploading(true)
    setLastUploadMessage(null)
    setUploadErrorDetail(null)
    setError(null)

    try {
      const result = await fetchCatalogImageUploadToCloud()
      const { summary } = result
      const issueCount =
        summary.skippedExists +
        summary.localMissing +
        summary.localDuplicate +
        summary.error +
        summary.unmatchedProduct

      setLastUploadMessage(
        `Uploaded ${summary.uploaded} / Skipped existing ${summary.skippedExists} / Local duplicates ${summary.localDuplicate} / Errors ${summary.error + summary.localMissing + summary.unmatchedProduct}`
      )

      if (issueCount > 0) {
        const detailItems = result.results.filter(
          (item) => item.status !== "UPLOADED"
        )
        setUploadErrorDetail(detailItems)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Cloud upload failed")
    } finally {
      setUploading(false)
    }
  }, [])

  return (
    <CatalogImageView
      fileInputRef={fileInputRef}
      openedFilePath={openedFilePath}
      opening={opening}
      cropSettings={cropSettings}
      cropRect={cropRect}
      imageNaturalSize={imageNaturalSize}
      assignedSlots={assignedSlots}
      productIdInput={productIdInput}
      layoutPreviewUrl={layoutPreviewUrl}
      layoutPreviewLoading={layoutPreviewLoading}
      saving={saving}
      replaceLocalFilesOnSave={replaceLocalFilesOnSave}
      onReplaceLocalFilesOnSaveChange={setReplaceLocalFilesOnSave}
      lastSaveMessage={lastSaveMessage}
      uploading={uploading}
      lastUploadMessage={lastUploadMessage}
      uploadErrorDetail={uploadErrorDetail}
      error={error}
      onOpenFile={handleOpenFile}
      onCropSettingsChange={handleCropSettingsChange}
      onCropRectChange={handleCropRectChange}
      onCropRectFieldChange={handleCropRectFieldChange}
      onCropNudge={handleCropNudge}
      onProductIdInputChange={setProductIdInput}
      onAssignSlots={handleAssignSlots}
      onAssignedSlotProductIdChange={handleAssignedSlotProductIdChange}
      onConfirmedSave={handleConfirmedSave}
      onUploadToCloud={handleUploadToCloud}
      onLayoutPreviewLoad={handleLayoutPreviewLoad}
      onLayoutPreviewError={handleLayoutPreviewError}
      onImageDimensionsChange={handleImageDimensionsChange}
      onCropTemplateChange={handleCropTemplateChange}
    />
  )
}

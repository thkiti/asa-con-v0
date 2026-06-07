"use client"

import { useMemo, type RefObject } from "react"
import {
  getCropRectFieldBounds,
  type CropImageSize,
  type CropRect,
} from "@/lib/catalog-image-ui/crop-template"
import type {
  CatalogImageAssignedSlot,
  CatalogImageCloudUploadItemResult,
} from "@/lib/catalog-image-ui/types"
import {
  themeBtnSecondary,
  themeMenuGroup,
  themeMuted,
} from "@/lib/theme/theme-classes"
import { CatalogImageLayoutPreview } from "./CatalogImageLayoutPreview"
import { CatalogNumericStepper } from "./CatalogNumericStepper"
import type { CropTemplate } from "@/lib/catalog-image-ui/crop-template"

export type CatalogImageCropSettingsVM = {
  rotateDeg: number
  columns: number
  rows: number
}

type CatalogImageViewProps = {
  fileInputRef: RefObject<HTMLInputElement | null>
  openedFilePath: string | null
  opening: boolean
  cropSettings: CatalogImageCropSettingsVM
  cropRect: CropRect | null
  imageNaturalSize: CropImageSize | null
  assignedSlots: CatalogImageAssignedSlot[]
  productIdInput: string
  layoutPreviewUrl: string | null
  layoutPreviewLoading: boolean
  saving: boolean
  replaceLocalFilesOnSave: boolean
  onReplaceLocalFilesOnSaveChange: (value: boolean) => void
  lastSaveMessage: string | null
  uploading: boolean
  lastUploadMessage: string | null
  uploadErrorDetail: CatalogImageCloudUploadItemResult[] | null
  error: string | null
  onOpenFile: (file: File) => void | Promise<void>
  onCropSettingsChange: (settings: CatalogImageCropSettingsVM) => void
  onCropRectChange: (rect: CropRect) => void
  onCropRectFieldChange: (field: keyof CropRect, value: number) => void
  onCropNudge: (direction: "left" | "right" | "up" | "down") => void
  onProductIdInputChange: (value: string) => void
  onAssignSlots: () => void
  onConfirmedSave: () => void
  onUploadToCloud: () => void
  onLayoutPreviewLoad: () => void
  onLayoutPreviewError: () => void
  onImageDimensionsChange: (size: CropImageSize) => void
  onCropTemplateChange: (template: CropTemplate) => void
}

const MOVE_BUTTON_CLASS =
  "flex h-5 w-5 items-center justify-center rounded border border-border bg-card text-[10px] leading-none text-foreground hover:bg-[var(--btn-secondary-hover)] disabled:cursor-not-allowed disabled:opacity-50"

const FIELD_INPUT_CLASS =
  "min-w-[140px] rounded border border-border bg-card px-2 py-1 font-mono text-sm text-foreground"

export function CatalogImageView({
  fileInputRef,
  openedFilePath,
  opening,
  cropSettings,
  cropRect,
  imageNaturalSize,
  assignedSlots,
  productIdInput,
  layoutPreviewUrl,
  layoutPreviewLoading,
  saving,
  replaceLocalFilesOnSave,
  onReplaceLocalFilesOnSaveChange,
  lastSaveMessage,
  uploading,
  lastUploadMessage,
  uploadErrorDetail,
  error,
  onOpenFile,
  onCropSettingsChange,
  onCropRectChange,
  onCropRectFieldChange,
  onCropNudge,
  onProductIdInputChange,
  onAssignSlots,
  onConfirmedSave,
  onUploadToCloud,
  onLayoutPreviewLoad,
  onLayoutPreviewError,
  onImageDimensionsChange,
  onCropTemplateChange,
}: CatalogImageViewProps) {
  const cropFieldBounds = useMemo(() => {
    if (!cropRect || !imageNaturalSize) return null
    return getCropRectFieldBounds(
      cropRect,
      imageNaturalSize.width,
      imageNaturalSize.height
    )
  }, [cropRect, imageNaturalSize])

  const canAssign = Boolean(layoutPreviewUrl && cropRect)
  const canSave = canAssign && assignedSlots.length > 0 && !saving
  const canUploadToCloud = !uploading && !saving

  return (
    <div className={themeMenuGroup}>
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.PDF,application/pdf"
          className="hidden"
          onChange={(event) => {
            const picked = event.target.files?.[0]
            if (!picked) return
            const file = new File([picked], picked.name, {
              type: picked.type || "application/pdf",
              lastModified: picked.lastModified,
            })
            event.currentTarget.value = ""
            void onOpenFile(file)
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={opening}
          className={themeBtnSecondary}
        >
          {opening ? "Opening…" : "Open File"}
        </button>
        {openedFilePath ? (
          <span className={`font-mono text-sm ${themeMuted}`}>
            {openedFilePath}
          </span>
        ) : null}
        {lastSaveMessage ? (
          <span className="text-sm text-emerald-400">{lastSaveMessage}</span>
        ) : null}
        {lastUploadMessage ? (
          <span className="text-sm text-sky-300">{lastUploadMessage}</span>
        ) : null}
      </div>

      {error ? (
        <p className="mt-3 rounded border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <div className="mt-4 space-y-0 divide-y divide-border rounded-lg border border-border bg-card">
        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3">
          <h2 className="text-sm font-semibold text-card-foreground">
            Preview Images • Crop Settings
          </h2>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <CatalogNumericStepper
              label="Degree"
              value={cropSettings.rotateDeg}
              step={0.1}
              format="decimal"
              onChange={(rotateDeg) =>
                onCropSettingsChange({ ...cropSettings, rotateDeg })
              }
            />
            <CatalogNumericStepper
              label="Rows"
              value={cropSettings.rows}
              step={1}
              format="integer"
              min={1}
              onChange={(rows) =>
                onCropSettingsChange({ ...cropSettings, rows })
              }
            />
            <CatalogNumericStepper
              label="Columns"
              value={cropSettings.columns}
              step={1}
              format="integer"
              min={1}
              onChange={(columns) =>
                onCropSettingsChange({ ...cropSettings, columns })
              }
            />
          </div>
        </div>

        <div className="bg-[var(--btn-secondary-hover)]/40 px-4 py-4">
          <CatalogImageLayoutPreview
            imageUrl={layoutPreviewUrl}
            cropSettings={cropSettings}
            cropRect={cropRect}
            assignedSlots={assignedSlots}
            loading={layoutPreviewLoading}
            onImageLoad={onLayoutPreviewLoad}
            onImageError={onLayoutPreviewError}
            onCropRectChange={onCropRectChange}
            onCropTemplateChange={onCropTemplateChange}
            onImageDimensionsChange={onImageDimensionsChange}
          />
        </div>

        <div className="flex min-w-0 flex-nowrap items-center gap-1.5 px-3 py-3">
          <span className="shrink-0 text-sm font-medium text-card-foreground">
            Crop Position
          </span>
          {cropRect && cropFieldBounds ? (
            <>
              <CatalogNumericStepper
                compact
                label="X"
                value={cropRect.cropX}
                step={0.1}
                format="decimal"
                min={cropFieldBounds.cropX.min}
                max={cropFieldBounds.cropX.max}
                onChange={(value) => onCropRectFieldChange("cropX", value)}
              />
              <CatalogNumericStepper
                compact
                label="Y"
                value={cropRect.cropY}
                step={0.1}
                format="decimal"
                min={cropFieldBounds.cropY.min}
                max={cropFieldBounds.cropY.max}
                onChange={(value) => onCropRectFieldChange("cropY", value)}
              />
              <CatalogNumericStepper
                compact
                label="Width"
                value={cropRect.cropWidth}
                step={0.1}
                format="decimal"
                min={cropFieldBounds.cropWidth.min}
                max={cropFieldBounds.cropWidth.max}
                onChange={(value) =>
                  onCropRectFieldChange("cropWidth", value)
                }
              />
              <CatalogNumericStepper
                compact
                label="Height"
                value={cropRect.cropHeight}
                step={0.1}
                format="decimal"
                min={cropFieldBounds.cropHeight.min}
                max={cropFieldBounds.cropHeight.max}
                onChange={(value) =>
                  onCropRectFieldChange("cropHeight", value)
                }
              />
              <div className="ml-auto flex shrink-0 items-center gap-0.5">
                <button
                  type="button"
                  className={MOVE_BUTTON_CLASS}
                  aria-label="Move crop left"
                  disabled={!canAssign}
                  onClick={() => onCropNudge("left")}
                >
                  ◀
                </button>
                <button
                  type="button"
                  className={MOVE_BUTTON_CLASS}
                  aria-label="Move crop up"
                  disabled={!canAssign}
                  onClick={() => onCropNudge("up")}
                >
                  ▲
                </button>
                <button
                  type="button"
                  className={MOVE_BUTTON_CLASS}
                  aria-label="Move crop down"
                  disabled={!canAssign}
                  onClick={() => onCropNudge("down")}
                >
                  ▼
                </button>
                <button
                  type="button"
                  className={MOVE_BUTTON_CLASS}
                  aria-label="Move crop right"
                  disabled={!canAssign}
                  onClick={() => onCropNudge("right")}
                >
                  ▶
                </button>
              </div>
            </>
          ) : (
            <span className={`text-sm ${themeMuted}`}>
              Available after preview loads.
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <label className="flex items-center gap-2 text-sm font-medium text-card-foreground">
            Product ID
            <input
              type="text"
              value={productIdInput}
              onChange={(event) => onProductIdInputChange(event.target.value)}
              placeholder="1010152"
              className={FIELD_INPUT_CLASS}
            />
          </label>
          <button
            type="button"
            className={themeBtnSecondary}
            disabled={!canAssign}
            onClick={onAssignSlots}
          >
            Assign Slot
          </button>
          <label className="flex items-center gap-2 text-sm text-card-foreground">
            <input
              type="checkbox"
              checked={replaceLocalFilesOnSave}
              disabled={saving}
              onChange={(event) =>
                onReplaceLocalFilesOnSaveChange(event.target.checked)
              }
            />
            Replace local files on Confirmed &amp; Save
          </label>
          <button
            type="button"
            className="rounded border border-sky-800 bg-sky-950/40 px-4 py-2 text-sm font-medium text-sky-200 hover:bg-sky-900/50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canSave}
            onClick={onConfirmedSave}
          >
            {saving ? "Saving…" : "Confirmed & Save"}
          </button>
          {lastSaveMessage ? (
            <span className="text-sm text-emerald-400">{lastSaveMessage}</span>
          ) : null}
          <button
            type="button"
            className="rounded border border-violet-800 bg-violet-950/40 px-4 py-2 text-sm font-medium text-violet-200 hover:bg-violet-900/50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!canUploadToCloud}
            onClick={onUploadToCloud}
          >
            {uploading ? "Uploading…" : "Upload to Cloud"}
          </button>
        </div>

        {uploadErrorDetail && uploadErrorDetail.length > 0 ? (
          <div className="border-t border-border px-4 py-3">
            <p className={`mb-2 text-sm font-medium ${themeMuted}`}>
              Cloud upload details
            </p>
            <ul className="space-y-1 text-sm text-amber-200">
              {uploadErrorDetail.map((item) => (
                <li key={`${item.productCode}-${item.status}`}>
                  <span className="font-mono">{item.productCode}</span>:{" "}
                  {item.status}
                  {item.error ? ` — ${item.error}` : ""}
                  {item.cloudPath ? ` (${item.cloudPath})` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {assignedSlots.length > 0 ? (
          <div className="px-4 py-3">
            <p className={`mb-2 text-sm font-medium ${themeMuted}`}>
              Assigned filenames
            </p>
            <div className="flex flex-wrap gap-2">
              {assignedSlots.map((slot) => (
                <span
                  key={slot.sourceSlot}
                  className="rounded border border-border bg-card px-2 py-1 font-mono text-xs text-card-foreground"
                >
                  slot {slot.sourceSlot}: {slot.finalFileName}
                </span>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

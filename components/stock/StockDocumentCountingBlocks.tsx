import { useMemo } from "react"
import {
  SHOE_PREFIX_SECTIONS,
  type CountingHookGroup,
} from "@/lib/stock-ui/counting-hook-groups"
import {
  SHOE_OTHER_SECTION_TITLE_TH,
  shoeSectionTitleTh,
} from "@/lib/stock-ui/counting-sheet-labels"
import { chunkCountingRows } from "@/lib/stock-ui/counting-sheet-layout"
import { sortCountingRowsByHookNo } from "@/lib/stock-ui/sort-counting-rows-by-hook"
import type { EditorLineRowVM } from "@/lib/stock-ui/editor-types"
import { StockDocumentCountingBlock } from "./StockDocumentCountingBlock"
import {
  countingBlockShellClass,
  countingBlockShellShoeClass,
  countingShoeScrollClass,
  countingShoeStripClass,
} from "./counting-sheet-styles"

export type StockDocumentCountingBlocksProps = {
  lines: EditorLineRowVM[]
  activeHookGroup: CountingHookGroup
  readOnly: boolean
  onLineChange: (key: string, patch: Partial<EditorLineRowVM>) => void
  qtyColumnLabel?: string
}

type ShoeSectionBlock = {
  key: string
  title: string
  rows: EditorLineRowVM[]
}

function buildShoeSections(rows: EditorLineRowVM[]): ShoeSectionBlock[] {
  const byPrefix = new Map<string, EditorLineRowVM[]>()
  const orphans: EditorLineRowVM[] = []

  for (const line of rows) {
    const section = SHOE_PREFIX_SECTIONS.find((item) =>
      line.productCode.startsWith(item.prefix)
    )
    if (section) {
      const bucket = byPrefix.get(section.prefix) ?? []
      bucket.push(line)
      byPrefix.set(section.prefix, bucket)
    } else {
      orphans.push(line)
    }
  }

  const blocks: ShoeSectionBlock[] = SHOE_PREFIX_SECTIONS.map((section) => ({
    key: section.prefix,
    title: shoeSectionTitleTh(section.prefix, section.title),
    rows: byPrefix.get(section.prefix) ?? [],
  })).filter((block) => block.rows.length > 0)

  if (orphans.length > 0) {
    blocks.push({
      key: "other",
      title: SHOE_OTHER_SECTION_TITLE_TH,
      rows: orphans,
    })
  }

  return blocks
}

function HorizontalBlockRow({
  rowChunks,
  showHook,
  showProductName,
  hookGroup,
  blockShellClass,
  readOnly,
  onLineChange,
  qtyColumnLabel,
}: {
  rowChunks: EditorLineRowVM[][]
  showHook: boolean
  showProductName?: boolean
  hookGroup?: CountingHookGroup
  blockShellClass: string
  readOnly: boolean
  onLineChange: StockDocumentCountingBlocksProps["onLineChange"]
  qtyColumnLabel?: string
}) {
  return (
    <div className="flex flex-nowrap gap-3">
      {rowChunks.map((chunk, index) => (
        <div
          key={`block-${index}-${chunk[0]?.key ?? "empty"}`}
          className={blockShellClass}
        >
          <StockDocumentCountingBlock
            rows={chunk}
            showHook={showHook}
            showProductName={showProductName}
            hookGroup={hookGroup}
            readOnly={readOnly}
            onLineChange={onLineChange}
            qtyColumnLabel={qtyColumnLabel}
          />
        </div>
      ))}
    </div>
  )
}

/**
 * Shoe Materials: groups and chunk tables flow left → right.
 * Wider shells than Key; overflow scrolls horizontally (no vertical stack on desktop).
 */
function ShoeMaterialSections({
  sections,
  readOnly,
  onLineChange,
  qtyColumnLabel,
}: {
  sections: ShoeSectionBlock[]
  readOnly: boolean
  onLineChange: StockDocumentCountingBlocksProps["onLineChange"]
  qtyColumnLabel?: string
}) {
  return (
    <div className={countingShoeScrollClass}>
      <div className={countingShoeStripClass}>
        {sections.map((section) => (
          <div key={section.key} className="flex shrink-0 flex-col gap-1.5">
            <h3 className="whitespace-nowrap px-0.5 text-xs font-semibold text-zinc-900">
              {section.title}
            </h3>
            <HorizontalBlockRow
              rowChunks={chunkCountingRows(section.rows)}
              showHook={false}
              showProductName
              hookGroup="S"
              blockShellClass={countingBlockShellShoeClass}
              readOnly={readOnly}
              onLineChange={onLineChange}
              qtyColumnLabel={qtyColumnLabel}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export function StockDocumentCountingBlocks({
  lines,
  activeHookGroup,
  readOnly,
  onLineChange,
  qtyColumnLabel,
}: StockDocumentCountingBlocksProps) {
  const visibleRows = useMemo(
    () => lines.filter((line) => line.hookGroup === activeHookGroup),
    [activeHookGroup, lines]
  )

  const sortedVisibleRows = useMemo(
    () =>
      activeHookGroup === "S"
        ? visibleRows
        : sortCountingRowsByHookNo(visibleRows),
    [activeHookGroup, visibleRows]
  )

  const rowChunks = useMemo(
    () => chunkCountingRows(sortedVisibleRows),
    [sortedVisibleRows]
  )

  const shoeSections = useMemo(
    () => (activeHookGroup === "S" ? buildShoeSections(visibleRows) : []),
    [activeHookGroup, visibleRows]
  )

  if (visibleRows.length === 0) {
    return (
      <p className="text-sm text-zinc-800">ไม่มีรายการในกลุ่มตะขอนี้</p>
    )
  }

  if (activeHookGroup === "S") {
    if (shoeSections.length === 0) {
      return (
        <p className="text-sm text-zinc-800">ไม่มีรายการในกลุ่มตะขอนี้</p>
      )
    }
    return (
      <ShoeMaterialSections
        sections={shoeSections}
        readOnly={readOnly}
        onLineChange={onLineChange}
        qtyColumnLabel={qtyColumnLabel}
      />
    )
  }

  return (
    <div className={countingShoeScrollClass}>
      <HorizontalBlockRow
        rowChunks={rowChunks}
        showHook
        hookGroup={activeHookGroup}
        blockShellClass={countingBlockShellClass}
        readOnly={readOnly}
        onLineChange={onLineChange}
        qtyColumnLabel={qtyColumnLabel}
      />
    </div>
  )
}

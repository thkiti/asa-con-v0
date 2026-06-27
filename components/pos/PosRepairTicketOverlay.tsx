"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { PosRepairTicketSlip } from "@/components/pos/PosRepairTicketSlip"
import {
  PosRepairTicketPhotoPreviewSlot,
  type SelectedRepairPhoto,
} from "@/components/pos/PosRepairTicketPhotoPreviewSlot"
import {
  appendRepairTicketRecord,
  buildRepairTicketNo,
  loadRepairTicketsFromStorage,
  type RepairTicketRecord,
} from "@/lib/pos-ui/repair-ticket-storage"
import { repairPhotoBlobPath, resolveRepairPhotoUrl } from "@/lib/pos/repair-photo-url"
import type { RepairPhotoListItem } from "@/lib/pos/repair-photo-list"
import type { PosTerminalSession } from "@/lib/pos-ui/types"
import { printThermalSlipClone, thermalPrintSourceSelector } from "@/lib/thermal/print-dom"
import type { ResolvedThermalLayout } from "@/lib/thermal/types"

type PosRepairTicketOverlayProps = {
  session: PosTerminalSession
  onClose: () => void
  repairLayout: ResolvedThermalLayout
  /** Keypad-side host for list-mode photo preview (sibling of list panel). */
  photoPreviewHost?: HTMLElement | null
}

export function PosRepairTicketOverlay({
  session,
  onClose,
  repairLayout,
  photoPreviewHost = null,
}: PosRepairTicketOverlayProps) {
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const repairSessionFilesRef = useRef<string[]>([])
  const pendingRepairTicketNoRef = useRef<string | null>(null)

  const [panel, setPanel] = useState<"capture" | "list">("capture")
  const [sessionTicketNo, setSessionTicketNo] = useState<string | null>(null)
  const [sessionFileNames, setSessionFileNames] = useState<string[]>([])
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptAt, setReceiptAt] = useState("")
  const [uploadBusy, setUploadBusy] = useState(false)
  const [ticketList, setTicketList] = useState<RepairTicketRecord[]>([])
  const [photoByFileName, setPhotoByFileName] = useState<Record<string, RepairPhotoListItem>>({})
  const [selectedRepairPhoto, setSelectedRepairPhoto] = useState<SelectedRepairPhoto | null>(null)
  const [previewImageError, setPreviewImageError] = useState(false)

  const resolvePhotoUrl = useCallback(
    (fileName: string): string => {
      const fromApi = photoByFileName[fileName]
      if (fromApi?.url) return fromApi.url
      const record = ticketList.find((t) => t.fileName === fileName)
      return resolveRepairPhotoUrl(fileName, {
        url: record?.url,
        blobPath: record?.blobPath,
      })
    },
    [photoByFileName, ticketList]
  )

  const loadRepairPhotoList = useCallback(async () => {
    try {
      const res = await fetch("/api/repair-photo", { method: "GET" })
      const data = (await res.json().catch(() => ({}))) as {
        photos?: RepairPhotoListItem[]
        error?: string
      }
      if (!res.ok || !Array.isArray(data.photos)) {
        console.error("REPAIR_PHOTO_LIST_FETCH_ERROR:", data.error ?? res.status)
        return
      }
      const next: Record<string, RepairPhotoListItem> = {}
      for (const photo of data.photos) {
        if (photo.fileName && photo.url) {
          next[photo.fileName] = photo
        }
      }
      setPhotoByFileName(next)
    } catch (err) {
      console.error("REPAIR_PHOTO_LIST_FETCH_ERROR:", err)
    }
  }, [])

  function closePhotoPreview() {
    setSelectedRepairPhoto(null)
    setPreviewImageError(false)
  }

  function handlePhotoClick(fileName: string, ticketNo: string) {
    if (selectedRepairPhoto?.fileName === fileName) {
      closePhotoPreview()
      return
    }
    const url = resolvePhotoUrl(fileName)
    setSelectedRepairPhoto({ fileName, url, ticketNo })
    setPreviewImageError(false)
  }

  useEffect(() => {
    if (panel !== "list") return
    void loadRepairPhotoList()
  }, [panel, loadRepairPhotoList])

  useEffect(() => {
    if (!selectedRepairPhoto) return
    const refreshed = resolvePhotoUrl(selectedRepairPhoto.fileName)
    if (refreshed !== selectedRepairPhoto.url) {
      setSelectedRepairPhoto({ ...selectedRepairPhoto, url: refreshed })
      setPreviewImageError(false)
    }
  }, [photoByFileName, selectedRepairPhoto, resolvePhotoUrl])

  function handlePrintRepairTicket() {
    const printed = printThermalSlipClone(thermalPrintSourceSelector("repair-ticket"))
    if (!printed) {
      alert("พิมพ์ใบรับซ่อมไม่สำเร็จ")
      return
    }
    handleClose()
  }

  useEffect(() => {
    if (panel !== "capture") return
    let stream: MediaStream | null = null
    ;(async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        })
        const el = cameraVideoRef.current
        if (el) el.srcObject = stream
      } catch {
        alert("เปิดกล้องไม่สำเร็จ — ตรวจสอบสิทธิ์หรืออุปกรณ์กล้อง")
        onClose()
      }
    })()
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
      const el = cameraVideoRef.current
      if (el) el.srcObject = null
    }
  }, [panel, onClose])

  function resetSession() {
    repairSessionFilesRef.current = []
    pendingRepairTicketNoRef.current = null
    setSessionTicketNo(null)
    setSessionFileNames([])
    setShowReceipt(false)
    closePhotoPreview()
  }

  function handleClose() {
    resetSession()
    setPanel("capture")
    onClose()
  }

  async function capturePhoto() {
    if (uploadBusy) return
    const branchCode = session.branchCode?.trim()
    if (!branchCode) {
      alert("ไม่พบรหัสสาขา")
      return
    }
    const video = cameraVideoRef.current
    if (!video || video.videoWidth < 2) {
      alert("รอให้ภาพจากกล้องพร้อมก่อน")
      return
    }
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), "image/jpeg", 0.92)
    })
    if (!blob) {
      alert("สร้างรูปไม่สำเร็จ")
      return
    }

    let ticketNo = sessionTicketNo
    if (!ticketNo) {
      if (!pendingRepairTicketNoRef.current) {
        pendingRepairTicketNoRef.current = buildRepairTicketNo(branchCode)
      }
      ticketNo = pendingRepairTicketNoRef.current
    }
    const safeTicket = ticketNo.replace(/[/\\?%*:|"<>]/g, "-")
    const nextIdx = repairSessionFilesRef.current.length + 1
    const fileName = `${safeTicket}-${String(nextIdx).padStart(2, "0")}.jpg`

    const fd = new FormData()
    fd.set("file", blob, fileName)
    fd.set("fileName", fileName)

    setUploadBusy(true)
    try {
      const res = await fetch("/api/repair-photo", { method: "POST", body: fd })
      const data = (await res.json().catch(() => ({}))) as {
        error?: string
        url?: string
        pathname?: string
        fileName?: string
      }
      if (!res.ok) {
        alert(typeof data?.error === "string" ? data.error : "บันทึกรูปไม่สำเร็จ")
        return
      }
      const uploadedUrl = typeof data.url === "string" ? data.url.trim() : ""
      const uploadedPath =
        typeof data.pathname === "string" ? data.pathname.trim() : repairPhotoBlobPath(fileName)
      if (!sessionTicketNo) {
        setSessionTicketNo(ticketNo)
        pendingRepairTicketNoRef.current = null
      }
      repairSessionFilesRef.current.push(fileName)
      setSessionFileNames([...repairSessionFilesRef.current])
      const list = appendRepairTicketRecord({
        ticketNo,
        fileName,
        url: uploadedUrl || undefined,
        blobPath: uploadedPath,
        createdAt: new Date().toISOString(),
        branchCode: branchCode.toUpperCase(),
        staffId: String(session.staffId || ""),
      })
      setTicketList(list)
      if (uploadedUrl) {
        setPhotoByFileName((prev) => ({
          ...prev,
          [fileName]: {
            fileName,
            blobPath: uploadedPath,
            url: uploadedUrl,
          },
        }))
      }
      setReceiptAt(new Date().toISOString())
      setShowReceipt(true)
    } catch {
      alert("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ")
    } finally {
      setUploadBusy(false)
    }
  }

  return (
    <>
      {panel === "list" && photoPreviewHost
        ? createPortal(
            <PosRepairTicketPhotoPreviewSlot
              selected={selectedRepairPhoto}
              previewImageError={previewImageError}
              onClose={closePhotoPreview}
              onImageError={(url) => {
                console.error("REPAIR_PHOTO_PREVIEW_ERROR:", url)
                setPreviewImageError(true)
              }}
            />,
            photoPreviewHost
          )
        : null}
    <div className="absolute inset-0 z-50 flex min-h-0 flex-col bg-black/90 pt-11 text-white">
      <button
        type="button"
        aria-label="ปิด"
        onClick={handleClose}
        className="absolute right-2 top-2 z-[60] flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/80 bg-white/20 text-lg font-bold leading-none text-white shadow hover:bg-white/30"
      >
        ×
      </button>

      {panel === "capture" ? (
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3 pt-1">
          <p className="shrink-0 text-center text-xs font-bold leading-snug">
            REPAIR TICKET — ตั๋วรับซ่อม
          </p>
          <p className="shrink-0 text-center text-[10px] font-medium leading-snug text-white/80">
            ถ่ายแล้วบันทึกลงคลังภาพบนคลาวด์ — หลายภาพต่อตั๋วเดียวได้
          </p>
          <div className="relative min-h-0 w-full flex-1">
            <video
              ref={cameraVideoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 h-full w-full rounded-md border border-white/30 bg-black object-contain"
            />
            {showReceipt && sessionTicketNo ? (
              <div
                id="repair-ticket-print"
                className="absolute inset-0 z-10 flex flex-col overflow-hidden rounded-md border-2 border-lime-500 bg-white p-2 text-zinc-900 shadow-xl"
              >
                <div className="mx-auto min-h-0 flex-1 overflow-y-auto">
                  <PosRepairTicketSlip
                    ticketNo={sessionTicketNo}
                    branchCode={session.branchCode}
                    branchName={session.branchName}
                    issuedAt={receiptAt || new Date().toISOString()}
                    fileNames={sessionFileNames}
                    layout={repairLayout}
                    staffId={session.staffId}
                    staffName={session.name}
                    framed
                  />
                </div>
                <div className="no-print mt-1 flex shrink-0 flex-wrap justify-center gap-1.5 border-t border-zinc-200 pt-1.5 print:hidden">
                  <button
                    type="button"
                    onClick={() => setShowReceipt(false)}
                    className="rounded bg-sky-600 px-2 py-1.5 text-[10px] font-semibold text-white"
                  >
                    ถ่ายต่อ
                  </button>
                  <button
                    type="button"
                    onClick={handlePrintRepairTicket}
                    className="rounded bg-green-600 px-2 py-1.5 text-[10px] font-semibold text-white"
                  >
                    🖨 พิมพ์
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded bg-blue-600 px-2 py-1.5 text-[10px] font-semibold text-white"
                  >
                    กลับ POS
                  </button>
                </div>
              </div>
            ) : null}
          </div>
          {!showReceipt ? (
            <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                disabled={uploadBusy}
                onClick={() => void capturePhoto()}
                className="rounded-lg bg-lime-600 px-4 py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-50"
              >
                {uploadBusy ? "กำลังบันทึก…" : "ถ่ายและบันทึก"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReceipt(false)
                  closePhotoPreview()
                  setTicketList(loadRepairTicketsFromStorage())
                  setPanel("list")
                }}
                className="rounded-lg border border-white/50 bg-sky-800 px-4 py-2.5 text-sm font-semibold text-white"
              >
                ดู Repair Ticket
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pb-3 pt-1">
          <p className="shrink-0 text-center text-sm font-bold">
            รายการ Repair Ticket (เครื่องนี้)
          </p>
          <p className="shrink-0 text-center text-[10px] text-white/75">
            จัดกลุ่มตามเลขตั๋ว — แตะชื่อไฟล์เพื่อดูภาพ
          </p>
          <div
            className="repairTicketListPanel min-h-0 flex-1 overflow-y-auto rounded-md border border-white/20 bg-black/40 p-2"
            data-testid="repair-ticket-list-panel"
          >
            {ticketList.length === 0 ? (
              <p className="py-6 text-center text-sm text-white/60">ยังไม่มีตั๋วในครั้งนี้</p>
            ) : (
              <ul className="space-y-3">
                {Array.from(
                  ticketList.reduce((map, t) => {
                    const arr = map.get(t.ticketNo) ?? []
                    arr.push(t)
                    map.set(t.ticketNo, arr)
                    return map
                  }, new Map<string, RepairTicketRecord[]>())
                ).map(([ticketNo, rows]) => {
                  const sorted = [...rows].sort((a, b) =>
                    a.createdAt.localeCompare(b.createdAt)
                  )
                  return (
                    <li
                      key={ticketNo}
                      className="rounded border border-white/15 bg-white/5 px-2 py-2 text-xs"
                    >
                      <div className="font-mono font-bold text-lime-300">{ticketNo}</div>
                      <div className="mt-0.5 text-[10px] text-white/80">
                        {sorted[0]
                          ? new Date(sorted[0].createdAt).toLocaleString("th-TH", {
                              timeZone: "Asia/Bangkok",
                            })
                          : ""}{" "}
                        · {sorted[0]?.branchCode}
                        {sorted[0]?.staffId ? ` · staff ${sorted[0].staffId}` : ""}
                      </div>
                      <ul className="mt-1 space-y-0.5 pl-1 font-mono text-[10px]">
                        {sorted.map((r) => {
                          const fn = r.fileName
                          if (!fn) {
                            return (
                              <li key={`${r.createdAt}-${r.ticketNo}`} className="text-white/50">
                                {`${r.ticketNo}.jpg (เก่า)`}
                              </li>
                            )
                          }
                          const isSelected = selectedRepairPhoto?.fileName === fn
                          return (
                            <li key={`${r.createdAt}-${fn}`}>
                              <button
                                type="button"
                                onClick={() => handlePhotoClick(fn, ticketNo)}
                                className={`flex w-full items-center gap-1 rounded px-1 py-0.5 text-left transition-colors touch-manipulation ${
                                  isSelected
                                    ? "bg-lime-600/25 text-lime-100"
                                    : "text-white/70 hover:bg-white/10 active:bg-white/15"
                                }`}
                                aria-pressed={isSelected}
                                aria-label={`${isSelected ? "ปิด" : "เปิด"} ${fn}`}
                              >
                                <span className="min-w-0 break-all">{fn}</span>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                closePhotoPreview()
                setPanel("capture")
              }}
              className="rounded-lg bg-lime-600 px-4 py-2.5 text-sm font-bold text-white shadow-md"
            >
              กลับไปถ่ายรูป
            </button>
          </div>
        </div>
      )}
    </div>
    </>
  )
}

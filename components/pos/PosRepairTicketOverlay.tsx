"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { blobUrl } from "@/lib/blob-url"
import { RECEIPT_COLUMNS } from "@/lib/pos/receipt-slip-format"
import {
  REPAIR_PICKUP_WARN_DAYS,
  appendRepairTicketRecord,
  buildRepairTicketNo,
  loadRepairTicketsFromStorage,
  type RepairTicketRecord,
} from "@/lib/pos-ui/repair-ticket-storage"
import type { PosTerminalSession } from "@/lib/pos-ui/types"

type PosRepairTicketOverlayProps = {
  session: PosTerminalSession
  onClose: () => void
}

export function PosRepairTicketOverlay({
  session,
  onClose,
}: PosRepairTicketOverlayProps) {
  const cameraVideoRef = useRef<HTMLVideoElement>(null)
  const repairSessionFilesRef = useRef<string[]>([])
  const pendingRepairTicketNoRef = useRef<string | null>(null)
  const printCloneRef = useRef<HTMLElement | null>(null)

  const [panel, setPanel] = useState<"capture" | "list">("capture")
  const [sessionTicketNo, setSessionTicketNo] = useState<string | null>(null)
  const [sessionFileNames, setSessionFileNames] = useState<string[]>([])
  const [showReceipt, setShowReceipt] = useState(false)
  const [receiptAt, setReceiptAt] = useState("")
  const [uploadBusy, setUploadBusy] = useState(false)
  const [ticketList, setTicketList] = useState<RepairTicketRecord[]>([])
  const [hoverFile, setHoverFile] = useState<string | null>(null)
  const [hoverPos, setHoverPos] = useState({ x: 0, y: 0 })

  const repairSlipWidth = `${RECEIPT_COLUMNS}ch`
  const repairSlipStyle = {
    ["--receipt-slip-ch-width"]: repairSlipWidth,
    width: repairSlipWidth,
    maxWidth: repairSlipWidth,
  } as CSSProperties

  useEffect(() => {
    const cleanup = () => {
      document.body.classList.remove("printing-repair-ticket")
      printCloneRef.current?.remove()
      printCloneRef.current = null
    }
    window.addEventListener("afterprint", cleanup)
    return () => {
      window.removeEventListener("afterprint", cleanup)
      cleanup()
    }
  }, [])

  function handlePrintRepairTicket() {
    const source = document.querySelector<HTMLElement>(
      "[data-repair-ticket-print-source]"
    )
    if (!source) return

    printCloneRef.current?.remove()
    const clone = source.cloneNode(true) as HTMLElement
    clone.setAttribute("data-repair-ticket-print-clone", "")
    printCloneRef.current = clone
    document.body.appendChild(clone)

    document.body.classList.add("printing-repair-ticket")
    window.print()
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
    setHoverFile(null)
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
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        alert(typeof data?.error === "string" ? data.error : "บันทึกรูปไม่สำเร็จ")
        return
      }
      if (!sessionTicketNo) {
        setSessionTicketNo(ticketNo)
        pendingRepairTicketNoRef.current = null
      }
      repairSessionFilesRef.current.push(fileName)
      setSessionFileNames([...repairSessionFilesRef.current])
      const list = appendRepairTicketRecord({
        ticketNo,
        fileName,
        createdAt: new Date().toISOString(),
        branchCode: branchCode.toUpperCase(),
        staffId: String(session.staffId || ""),
      })
      setTicketList(list)
      setReceiptAt(new Date().toISOString())
      setShowReceipt(true)
    } catch {
      alert("เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ")
    } finally {
      setUploadBusy(false)
    }
  }

  return (
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
                <div
                  data-repair-ticket-print-source
                  className="repair-ticket-print-area mx-auto min-h-0 flex-1 overflow-y-auto text-center"
                  style={repairSlipStyle}
                >
                  <div className="font-bold">🔧 REPAIR TICKET</div>
                  <div>ตั๋วรับซ่อม / ฝากซ่อม</div>
                  <div className="text-zinc-600">ASA SERVICES</div>
                  <div className="mb-1 font-medium">{session.branchName}</div>
                  <div className="border-t border-zinc-200 pt-1 text-left">
                    <div className="font-bold">{sessionTicketNo}</div>
                    <div className="text-zinc-600">
                      {(receiptAt ? new Date(receiptAt) : new Date()).toLocaleString(
                        "th-TH",
                        { timeZone: "Asia/Bangkok" }
                      )}
                    </div>
                  </div>
                  <div className="mt-2 border-t border-zinc-200 pt-1 text-left">
                    <div className="mb-0.5 font-semibold">
                      รายการภาพ ({sessionFileNames.length})
                    </div>
                    <ol className="list-decimal space-y-0.5 pl-4 text-left">
                      {sessionFileNames.map((name) => (
                        <li key={name} className="break-all">
                          {name}
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div className="mt-2 border-t border-amber-200 bg-amber-50 px-1 py-1.5 text-left leading-snug text-amber-950">
                    <span className="font-bold">คำเตือน:</span> นำหลักฐานนี้มาเมื่อมารับของ{" "}
                    <span className="font-bold">ภายใน {REPAIR_PICKUP_WARN_DAYS} วัน</span> นับจากวันที่ออกตั๋ว
                  </div>
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
                  setHoverFile(null)
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
            จัดกลุ่มตามเลขตั๋ว — ชี้เมาส์ที่ชื่อไฟล์เพื่อดูภาพ
          </p>
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md border border-white/20 bg-black/40 p-2">
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
                      <ul className="mt-1 list-inside list-disc font-mono text-[10px] text-white/70">
                        {sorted.map((r) => {
                          const fn = r.fileName
                          return (
                            <li
                              key={`${r.createdAt}-${fn ?? r.ticketNo}`}
                              className={
                                fn
                                  ? "cursor-default marker:text-lime-400 hover:text-lime-200"
                                  : ""
                              }
                              onMouseEnter={
                                fn
                                  ? (e) => {
                                      setHoverFile(fn)
                                      setHoverPos({ x: e.clientX, y: e.clientY })
                                    }
                                  : undefined
                              }
                              onMouseMove={
                                fn
                                  ? (e) =>
                                      setHoverPos({ x: e.clientX, y: e.clientY })
                                  : undefined
                              }
                              onMouseLeave={fn ? () => setHoverFile(null) : undefined}
                            >
                              {fn ?? `${r.ticketNo}.jpg (เก่า)`}
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
                setHoverFile(null)
                setPanel("capture")
              }}
              className="rounded-lg bg-lime-600 px-4 py-2.5 text-sm font-bold text-white shadow-md"
            >
              กลับไปถ่ายรูป
            </button>
          </div>
          {hoverFile ? (
            <div
              className="pointer-events-none fixed z-[9999]"
              style={{
                left: Math.min(
                  hoverPos.x + 14,
                  Math.max(8, (typeof window !== "undefined" ? window.innerWidth : 9999) - 224)
                ),
                top: Math.min(
                  hoverPos.y + 14,
                  Math.max(8, (typeof window !== "undefined" ? window.innerHeight : 9999) - 240)
                ),
              }}
            >
              <div className="w-52 rounded-xl border bg-white p-2 shadow-2xl">
                <img
                  src={blobUrl(`repair/${hoverFile}`)}
                  alt={hoverFile}
                  className="h-52 w-full object-contain"
                  loading="eager"
                />
                <p className="truncate pt-1 text-center font-mono text-[9px] text-zinc-600">
                  {hoverFile}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}

declare module "react-qr-code" {
  import type { CSSProperties } from "react"

  export type QRCodeProps = {
    value: string
    size?: number
    level?: "L" | "M" | "Q" | "H"
    bgColor?: string
    fgColor?: string
    style?: CSSProperties
    className?: string
  }

  export default function QRCode(props: QRCodeProps): JSX.Element
}

"use client"

import type { DocumentEntityCode } from "@/lib/legal-entity"
import { themeMuted } from "@/lib/theme/theme-classes"

type LoginEntityToggleProps = {
  value: DocumentEntityCode
  onChange: (code: DocumentEntityCode) => void
  disabled?: boolean
}

export function LoginEntityToggle({
  value,
  onChange,
  disabled = false,
}: LoginEntityToggleProps) {
  return (
    <fieldset
      className="space-y-2"
      data-testid="login-entity-toggle"
      disabled={disabled}
    >
      <legend className="text-sm font-medium">นิติบุคคล (เอกสาร)</legend>
      <div className="flex gap-4 text-sm">
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="documentEntityCode"
            value="AS"
            checked={value === "AS"}
            onChange={() => onChange("AS")}
            disabled={disabled}
          />
          <span>ASAS</span>
        </label>
        <label className="inline-flex cursor-pointer items-center gap-2">
          <input
            type="radio"
            name="documentEntityCode"
            value="AD"
            checked={value === "AD"}
            onChange={() => onChange("AD")}
            disabled={disabled}
          />
          <span>ASAD</span>
        </label>
      </div>
      <p className={`text-xs ${themeMuted}`}>
        เลือกนิติบุคคลที่เอกสารใหม่จะอยู่ภายใต้
      </p>
    </fieldset>
  )
}

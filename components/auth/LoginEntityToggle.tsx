"use client"

import type { DocumentEntityCode } from "@/lib/legal-entity"
import { formatEntityThai } from "@/lib/legal-entity"
import { themeLabel, themeTextSecondary } from "@/lib/theme/theme-classes"

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
      <legend className={`text-sm ${themeLabel}`}>นิติบุคคล (เอกสาร)</legend>
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
          <span>{formatEntityThai("AS")}</span>
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
          <span>{formatEntityThai("AD")}</span>
        </label>
      </div>
      <p className={`text-xs ${themeTextSecondary}`}>
        เลือกนิติบุคคลที่เอกสารใหม่จะอยู่ภายใต้
      </p>
    </fieldset>
  )
}

"use client"

import { useCallback, useEffect, useId, useRef, useState } from "react"
import { FinanceAccountOption } from "@/components/finance/FinanceAccountOption"
import { formatAccountDisplay } from "@/lib/finance-ui/format-account"
import { filterAndSortGlAccountsForInquiry } from "@/lib/finance-ui/gl-account-inquiry-search"
import { fetchGlAccounts } from "@/lib/finance-ui/gl-accounts"
import type { GlAccountListRow } from "@/lib/finance/gl-account-list"

type GlAccountComboboxProps = {
  accountCode: string
  accountName?: string
  onAccountChange: (accountCode: string, accountName: string) => void
  label?: string
  disabled?: boolean
  placeholder?: string
  inputTestId?: string
  listTestId?: string
}

export function GlAccountCombobox({
  accountCode,
  accountName = "",
  onAccountChange,
  label = "Account",
  disabled = false,
  placeholder = "Search account code or name…",
  inputTestId = "gl-account-combobox-input",
  listTestId = "gl-account-combobox-list",
}: GlAccountComboboxProps) {
  const listId = useId()
  const inputId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const selectingRef = useRef(false)
  const [focused, setFocused] = useState(false)
  const [query, setQuery] = useState("")
  const [resolvedName, setResolvedName] = useState(accountName)
  const [options, setOptions] = useState<GlAccountListRow[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  useEffect(() => {
    setResolvedName(accountName)
  }, [accountName])

  const loadOptions = useCallback(async (search: string) => {
    setLoading(true)
    try {
      const result = await fetchGlAccounts({
        search: search.trim() || undefined,
        view: "flat",
        isActive: "true",
        limit: 200,
      })
      if (result.view === "flat") {
        setOptions(filterAndSortGlAccountsForInquiry(result.accounts, search))
      } else {
        setOptions([])
      }
    } catch {
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      void loadOptions(query)
    }, 150)
    return () => window.clearTimeout(timer)
  }, [open, query, loadOptions])

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false)
        setFocused(false)
      }
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [])

  function selectOption(option: GlAccountListRow) {
    setQuery("")
    setResolvedName(option.name)
    onAccountChange(option.code, option.name)
    setOpen(false)
    setFocused(false)
    setActiveIndex(-1)
  }

  function findExactOption(code: string): GlAccountListRow | undefined {
    const trimmed = code.trim()
    if (!trimmed) return undefined
    return options.find((row) => row.code === trimmed)
  }

  function trySelectFromEnter(): boolean {
    if (activeIndex >= 0 && options[activeIndex]) {
      selectOption(options[activeIndex])
      return true
    }
    if (options.length === 1) {
      selectOption(options[0])
      return true
    }
    const exact = findExactOption(query)
    if (exact) {
      selectOption(exact)
      return true
    }
    return false
  }

  function handleFocus() {
    setFocused(true)
    setOpen(true)
    setQuery(accountCode)
    void loadOptions(accountCode)
  }

  function handleBlur() {
    if (selectingRef.current) {
      selectingRef.current = false
      return
    }
    setFocused(false)
    setOpen(false)

    const trimmed = query.trim()
    if (!trimmed) {
      setQuery("")
      onAccountChange("", "")
      setResolvedName("")
      return
    }

    const exact = findExactOption(trimmed)
    if (exact) {
      selectOption(exact)
      return
    }

    setQuery("")
    setActiveIndex(-1)
  }

  const showResolvedLabel =
    !focused && accountCode.trim().length > 0 && resolvedName.trim().length > 0

  const inputValue = focused
    ? query
    : showResolvedLabel
      ? formatAccountDisplay(accountCode, resolvedName)
      : accountCode

  return (
    <div ref={rootRef} className="gl-account-combobox-root finance-filter-field finance-filter-field--account relative">
      <label htmlFor={inputId} className="finance-filter-label">
        {label}
      </label>
      <input
        id={inputId}
        className="finance-filter-control finance-filter-control--mono w-full min-w-0"
          value={inputValue}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => {
            setQuery(event.target.value)
            setOpen(true)
            setActiveIndex(-1)
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              setOpen(true)
              setActiveIndex((prev) => Math.min(prev + 1, options.length - 1))
            } else if (event.key === "ArrowUp") {
              event.preventDefault()
              setActiveIndex((prev) => Math.max(prev - 1, 0))
            } else if (event.key === "Enter") {
              event.preventDefault()
              trySelectFromEnter()
            } else if (event.key === "Escape") {
              setOpen(false)
            }
          }}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          data-testid={inputTestId}
        />

      {open ? (
        <div
          id={listId}
          role="listbox"
          className="gl-account-combobox-panel account-combobox-dropdown absolute z-20 mt-1 max-h-64 overflow-y-auto rounded"
          data-testid={listTestId}
        >
          {loading ? (
            <p className="px-2 py-2 text-sm text-muted">Loading accounts…</p>
          ) : null}
          {!loading && options.length === 0 ? (
            <p className="px-2 py-2 text-sm text-muted">No accounts found</p>
          ) : null}
          {!loading
            ? options.map((option, index) => (
                <button
                  key={option.id}
                  type="button"
                  role="option"
                  aria-selected={activeIndex === index}
                  data-active={activeIndex === index ? "true" : "false"}
                  className="gl-account-combobox-option"
                  onMouseDown={(event) => {
                    selectingRef.current = true
                    event.preventDefault()
                  }}
                  onClick={() => selectOption(option)}
                  data-testid={`gl-account-option-${option.code}`}
                >
                  <FinanceAccountOption code={option.code} name={option.name} />
                </button>
              ))
            : null}
        </div>
      ) : null}
    </div>
  )
}

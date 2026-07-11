import { useEffect, useRef, useState } from 'react'

export interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectProps {
  label: string
  options: MultiSelectOption[]
  selected: string[]
  onChange: (values: string[]) => void
}

const MultiSelect = ({ label, options, selected, onChange }: MultiSelectProps) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggle = (value: string) => {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  const summary =
    selected.length === 0
      ? 'vše'
      : selected.length <= 2
        ? options.filter((o) => selected.includes(o.value)).map((o) => o.label).join(', ')
        : `${selected.length} vybráno`

  return (
    <div className="multiselect" ref={ref}>
      <button type="button" className="multiselect-toggle" onClick={() => setOpen((o) => !o)}>
        <span className="multiselect-label">{label}:</span> <strong>{summary}</strong>
        <span className="multiselect-caret">▾</span>
      </button>
      {open && (
        <div className="multiselect-panel">
          {selected.length > 0 && (
            <button type="button" className="multiselect-clear" onClick={() => onChange([])}>
              ✕ Zrušit výběr
            </button>
          )}
          {options.length === 0 ? (
            <span className="multiselect-empty">Žádné možnosti</span>
          ) : (
            options.map((o) => (
              <label key={o.value} className="multiselect-option">
                <input
                  type="checkbox"
                  checked={selected.includes(o.value)}
                  onChange={() => toggle(o.value)}
                />
                {o.label}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default MultiSelect

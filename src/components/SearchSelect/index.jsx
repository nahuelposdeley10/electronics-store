import { useRef, useState } from 'react'

import './styles.css'

export default function SearchSelect({
  id,
  label,
  value,
  onChange,
  options,
  allLabel = 'Todas',
  allValue = '',
  placeholder,
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [hi, setHi] = useState(0)
  const inputRef = useRef(null)

  const selected = options.find((o) => o.value === value)
  const list = [{ value: allValue, label: allLabel }, ...options]
  const q = text.trim().toLowerCase()
  const filtered = list.filter(
    (o) => o.value === allValue || !q || o.label.toLowerCase().includes(q),
  )

  const shown = open ? text : selected ? selected.label : ''

  const selectOption = (o) => {
    onChange(o.value)
    setOpen(false)
    setText('')
    inputRef.current?.blur()
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) {
        setHi(0)
        setOpen(true)
        return
      }
      setHi((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (!open) return
      setHi((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (open) {
        const o = filtered[Math.min(hi, filtered.length - 1)]
        if (o) selectOption(o)
      } else {
        setOpen(true)
        setText('')
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setText('')
      inputRef.current?.blur()
    }
  }

  return (
    <div className="filter-combo">
      {label && (
        <label className="filter-combo-label" htmlFor={id}>
          {label}
        </label>
      )}
      <div className="filter-combo-field">
        <input
          ref={inputRef}
          id={id}
          className="filter-combo-input"
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={`${id}-menu`}
          aria-activedescendant={open ? `${id}-opt-${hi}` : undefined}
          value={shown}
          placeholder={value === allValue ? allLabel : placeholder}
          onChange={(e) => {
            setText(e.target.value)
            setOpen(true)
            setHi(0)
          }}
          onFocus={() => {
            setOpen(true)
            setText('')
            setHi(0)
          }}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
        />
        {open && (
          <ul className="filter-combo-menu" id={`${id}-menu`} role="listbox">
            {filtered.length === 0 && (
              <li className="filter-combo-empty" role="option" aria-disabled="true">
                Sin resultados
              </li>
            )}
            {filtered.map((o, i) => (
              <li key={`${o.value}-${o.label}`} role="option" aria-selected={o.value === value}>
                <button
                  id={`${id}-opt-${i}`}
                  type="button"
                  className={`filter-combo-option${i === hi ? ' hi' : ''}`}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectOption(o)}
                >
                  {o.label}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
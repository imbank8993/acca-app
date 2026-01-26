'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

interface Option {
  value: string | number
  label: string
  subLabel?: string
}

interface SearchableSelectProps {
  options: Option[]
  value: string | number | (string | number)[]
  onChange: (value: string | (string | number)[]) => void
  placeholder?: string
  label?: string
  className?: string
  disabled?: boolean
  multiple?: boolean
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Pilih...',
  label,
  className = '',
  disabled = false,
  multiple = false
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setIsOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    // reset search saat dropdown ditutup
    if (!isOpen) setSearch('')
    // autofocus input saat dibuka
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  const selectedOptions = useMemo(() => {
    if (multiple) {
      const values = Array.isArray(value) ? value : []
      return options.filter((opt) => values.includes(opt.value))
    } else {
      return options.find((opt) => opt.value === value) ? [options.find((opt) => opt.value === value)!] : []
    }
  }, [options, value, multiple])

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) || (opt.subLabel && opt.subLabel.toLowerCase().includes(q))
    )
  }, [options, search])

  const toggle = () => {
    if (disabled) return
    setIsOpen((v) => !v)
  }

  const pick = (opt: Option) => {
    if (multiple) {
      const currentValues = Array.isArray(value) ? value : []
      const isSelected = currentValues.includes(opt.value)

      let newValues: (string | number)[]
      if (isSelected) {
        newValues = currentValues.filter(v => v !== opt.value)
      } else {
        newValues = [...currentValues, opt.value]
      }

      onChange(newValues)
      // Don't close dropdown for multiselect
    } else {
      onChange(String(opt.value))
      setIsOpen(false)
    }
  }

  return (
    <div
      ref={wrapperRef}
      className={`ss ${disabled ? 'ss--disabled' : ''} ${className}`}
      aria-disabled={disabled}
    >
      {label && <label className="ss__label">{label}</label>}

      {/* Trigger */}
      <button
        type="button"
        className={`ss__trigger ${isOpen ? 'is-open' : ''}`}
        onClick={toggle}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {selectedOptions.length > 0 ? (
          multiple ? (
            <div className="ss__selected">
              <span className="ss__selectedMain">
                {selectedOptions.length} siswa dipilih
              </span>
              <span className="ss__selectedSub">
                {selectedOptions.slice(0, 2).map(opt => opt.label).join(', ')}
                {selectedOptions.length > 2 && ` +${selectedOptions.length - 2} lagi`}
              </span>
            </div>
          ) : (
            <div className="ss__selected">
              <span className="ss__selectedMain">{selectedOptions[0].label}</span>
              {selectedOptions[0].subLabel && <span className="ss__selectedSub">{selectedOptions[0].subLabel}</span>}
            </div>
          )
        ) : (
          <span className="ss__placeholder">{placeholder}</span>
        )}

        <i className={`bi bi-chevron-down ss__chev ${isOpen ? 'rot' : ''}`} aria-hidden="true" />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="ss__drop" role="listbox">
          <div className="ss__searchWrap">
            <i className="bi bi-search ss__searchIcon" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              className="ss__searchInput"
              placeholder="Cari..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="ss__list">
            {filteredOptions.length === 0 ? (
              <div className="ss__empty">Tidak ada data.</div>
            ) : (
              filteredOptions.map((opt) => {
                const active = multiple
                  ? (Array.isArray(value) ? value : []).includes(opt.value)
                  : opt.value === value
                return (
                  <button
                    type="button"
                    key={opt.value}
                    className={`ss__item ${active ? 'is-active' : ''}`}
                    onClick={() => pick(opt)}
                  >
                    <span className="ss__itemMain">{opt.label}</span>
                    {opt.subLabel && <span className="ss__itemSub">{opt.subLabel}</span>}
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        /* =========================================
           SearchableSelect — Compact Navy System
           - no bold in body
           - mobile safe (iPhone 13)
        ========================================= */

        .ss {
          width: 100%;
          min-width: 0;
          position: relative;
        }

        .ss--disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .ss__label {
          display: block;
          margin: 0 0 6px;
          font-size: 0.78rem;
          font-weight: 600;
          color: rgba(15, 23, 42, 0.8);
        }

        .ss__trigger {
          width: 100%;
          min-width: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;

          padding: 8px 10px;
          border-radius: 12px;
          border: 1px solid rgba(148, 163, 184, 0.35);
          background: rgba(255, 255, 255, 0.92);
          box-shadow: 0 1px 0 rgba(2, 6, 23, 0.02);

          cursor: pointer;
          transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
          text-align: left;
        }

        .ss__trigger:hover {
          border-color: rgba(58, 166, 255, 0.35);
        }

        .ss__trigger:focus-visible {
          outline: none;
          border-color: rgba(58, 166, 255, 0.6);
          box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
        }

        .ss__trigger:disabled {
          cursor: not-allowed;
          background: rgba(241, 245, 249, 0.9);
        }

        .ss__selected {
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          line-height: 1.2;
        }

        .ss__selectedMain {
          font-size: 0.82rem;
          font-weight: 500; /* ✅ tidak tebal */
          color: rgba(15, 23, 42, 0.92);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ss__selectedSub {
          font-size: 0.76rem;
          font-weight: 400; /* ✅ tidak tebal */
          color: rgba(59, 130, 246, 0.95);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
            monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ss__placeholder {
          font-size: 0.82rem;
          font-weight: 400;
          color: rgba(100, 116, 139, 0.75);
        }

        .ss__chev {
          color: rgba(100, 116, 139, 0.8);
          font-size: 0.9rem;
          flex: 0 0 auto;
          transition: transform 0.15s ease;
        }

        .ss__chev.rot {
          transform: rotate(180deg);
        }

        .ss__drop {
          position: absolute;
          z-index: 10000;
          width: 100%;
          margin-top: 8px;

          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 14px;
          box-shadow: 0 18px 46px rgba(2, 6, 23, 0.16), 0 0 0 1px rgba(255, 255, 255, 0.05);

          overflow: hidden;
          animation: fadeIn 0.12s ease-out;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
        }

        .ss__searchWrap {
          position: sticky;
          top: 0;
          z-index: 2;
          display: flex;
          align-items: center;
          gap: 8px;

          padding: 10px 10px;
          background: linear-gradient(180deg, rgba(248, 250, 252, 0.98), rgba(255, 255, 255, 0.98));
          border-bottom: 1px solid rgba(148, 163, 184, 0.16);
        }

        .ss__searchIcon {
          color: rgba(100, 116, 139, 0.9);
          font-size: 0.9rem;
        }

        .ss__searchInput {
          width: 100%;
          padding: 7px 9px;
          border-radius: 10px;
          border: 1px solid rgba(148, 163, 184, 0.28);
          background: rgba(255, 255, 255, 0.98);
          font-size: 0.82rem;
          font-weight: 400;
          color: rgba(15, 23, 42, 0.92);
          outline: none;
        }

        .ss__searchInput:focus {
          border-color: rgba(58, 166, 255, 0.55);
          box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.12);
        }

        .ss__list {
          max-height: 260px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .ss__empty {
          padding: 12px;
          font-size: 0.82rem;
          color: rgba(100, 116, 139, 0.85);
          text-align: center;
        }

        .ss__item {
          width: 100%;
          padding: 9px 10px;
          display: flex;
          flex-direction: column;
          gap: 2px;

          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(148, 163, 184, 0.10);
          text-align: left;
          cursor: pointer;

          transition: background 0.12s ease;
        }

        .ss__item:hover {
          background: rgba(58, 166, 255, 0.06);
        }

        .ss__item:last-child {
          border-bottom: none;
        }

        .ss__itemMain {
          font-size: 0.82rem;
          font-weight: 500; /* ✅ tidak tebal */
          color: rgba(15, 23, 42, 0.92);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ss__itemSub {
          font-size: 0.76rem;
          font-weight: 400; /* ✅ tidak tebal */
          color: rgba(100, 116, 139, 0.95);
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New',
            monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .ss__item.is-active {
          background: rgba(58, 166, 255, 0.08);
          box-shadow: inset 3px 0 0 rgba(58, 166, 255, 0.85);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ===== Mobile (iPhone 13) ===== */
        @media (max-width: 420px) {
          .ss__trigger {
            padding: 8px 10px;
          }
          .ss__selectedMain,
          .ss__placeholder {
            font-size: 0.81rem;
          }
          .ss__selectedSub {
            font-size: 0.75rem;
          }

          /* dropdown jangan kepotong layar kecil */
          .ss__list {
            max-height: 220px;
          }
        }
      `}</style>
    </div>
  )
}

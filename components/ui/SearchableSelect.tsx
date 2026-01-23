'use client'

import { useState, useEffect, useRef } from 'react'

interface Option {
    value: string | number;
    label: string;
    subLabel?: string;
}

interface SearchableSelectProps {
    options: Option[];
    value: string | number;
    onChange: (value: string) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    disabled?: boolean;
}

export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Pilih...',
    label,
    className = '',
    disabled = false
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [search, setSearch] = useState('')
    const wrapperRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        (opt.subLabel && opt.subLabel.toLowerCase().includes(search.toLowerCase()))
    )

    const selectedOption = options.find(opt => opt.value === value)

    return (
        <div className={`relative ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} ref={wrapperRef}>
            {label && <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>}

            <div
                className={`w-full border border-gray-300 rounded-lg bg-white px-3 py-2 flex justify-between items-center shadow-sm transition-colors ${disabled ? 'pointer-events-none bg-gray-100' : 'cursor-pointer hover:border-blue-400'}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                {selectedOption ? (
                    <div className="flex flex-col leading-tight">
                        <span className="font-semibold text-gray-900">{selectedOption.label}</span>
                        {selectedOption.subLabel && (
                            <span className="text-xs text-blue-600 font-mono">{selectedOption.subLabel}</span>
                        )}
                    </div>
                ) : (
                    <span className="text-gray-400">{placeholder}</span>
                )}
                <i className={`bi bi-chevron-down text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}></i>
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden flex flex-col animate-fadeIn">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                            <i className="bi bi-search absolute left-3 top-2.5 text-gray-400 text-sm"></i>
                            <input
                                type="text"
                                className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
                                placeholder="Cari..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1">
                        {filteredOptions.length === 0 ? (
                            <div className="p-3 text-center text-sm text-gray-400">Tidak ada data.</div>
                        ) : (
                            filteredOptions.map((opt) => (
                                <div
                                    key={opt.value}
                                    className={`px-3 py-2 cursor-pointer hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0 ${opt.value === value ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                                    onClick={() => {
                                        onChange(String(opt.value))
                                        setIsOpen(false)
                                        setSearch('')
                                    }}
                                >
                                    <div className="flex flex-col leading-tight">
                                        <span className={`text-sm ${opt.value === value ? 'font-bold text-blue-900' : 'font-semibold text-gray-800'}`}>
                                            {opt.label}
                                        </span>
                                        {opt.subLabel && (
                                            <span className={`text-xs font-mono ${opt.value === value ? 'text-blue-700' : 'text-gray-500'}`}>
                                                {opt.subLabel}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
            <style jsx>{`
                .animate-fadeIn { animation: fadeIn 0.15s ease-out; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-5px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    )
}

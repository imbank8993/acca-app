'use client';

import { useState, useRef, useEffect } from 'react';

interface MonthSelectProps {
    selectedMonths: number[]; // 1-12
    onChange: (months: number[]) => void;
}

const MONTHS = [
    { id: 1, label: 'Januari' },
    { id: 2, label: 'Februari' },
    { id: 3, label: 'Maret' },
    { id: 4, label: 'April' },
    { id: 5, label: 'Mei' },
    { id: 6, label: 'Juni' },
    { id: 7, label: 'Juli' },
    { id: 8, label: 'Agustus' },
    { id: 9, label: 'September' },
    { id: 10, label: 'Oktober' },
    { id: 11, label: 'November' },
    { id: 12, label: 'Desember' },
];

export default function MonthSelect({ selectedMonths, onChange }: MonthSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const toggleMonth = (id: number) => {
        if (selectedMonths.includes(id)) {
            onChange(selectedMonths.filter(m => m !== id).sort((a, b) => a - b));
        } else {
            onChange([...selectedMonths, id].sort((a, b) => a - b));
        }
    };

    const getLabel = () => {
        if (selectedMonths.length === 0) return 'Pilih Bulan';
        if (selectedMonths.length === 1) return MONTHS.find(m => m.id === selectedMonths[0])?.label;
        if (selectedMonths.length === 12) return 'Semua Bulan';
        return `${selectedMonths.length} Bulan Terpilih`;
    };

    return (
        <div className="month-select" ref={wrapperRef}>
            <div className="trigger" onClick={() => setIsOpen(!isOpen)}>
                <span className="label">{getLabel()}</span>
                <i className="bi bi-chevron-down icon"></i>
            </div>

            {isOpen && (
                <div className="dropdown">
                    {MONTHS.map(month => {
                        const isSelected = selectedMonths.includes(month.id);
                        return (
                            <div
                                key={month.id}
                                className={`option ${isSelected ? 'selected' : ''}`}
                                onClick={() => toggleMonth(month.id)}
                            >
                                <div className={`checkbox ${isSelected ? 'checked' : ''}`}>
                                    {isSelected && <i className="bi bi-check"></i>}
                                </div>
                                <span>{month.label}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            <style jsx>{`
                .month-select {
                    position: relative;
                    width: 100%;
                }
                
                .trigger {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    background: white;
                    border: 1px solid #d1d5db;
                    border-radius: 999px;
                    padding: 0.4rem 1rem;
                    cursor: pointer;
                    font-size: 0.84rem;
                    color: #1e293b;
                    font-weight: 500;
                }
                
                .trigger:hover {
                    border-color: #3aa6ff;
                }
                
                .icon {
                    font-size: 0.8rem;
                    color: #6b7280;
                }
                
                .dropdown {
                   position: absolute;
                   top: 100%;
                   left: 0;
                   right: 0;
                   background: white;
                   border: 1px solid #e5e7eb;
                   border-radius: 8px;
                   margin-top: 4px;
                   box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                   z-index: 50;
                   max-height: 300px;
                   overflow-y: auto;
                   padding: 6px;
                   display: grid;
                   grid-template-columns: 1fr;
                }
                
                .option {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 8px 12px;
                    cursor: pointer;
                    border-radius: 6px;
                    color: #475569; /* Slate-600 for better visibility */
                    transition: all 0.2s;
                }
                
                .option:hover {
                    background: #f3f4f6;
                }
                
                .option.selected {
                    background: #eff6ff;
                    color: #1e40af;
                    font-weight: 500;
                }
                
                .checkbox {
                    width: 16px;
                    height: 16px;
                    border: 1px solid #d1d5db;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    color: white;
                }
                
                .checkbox.checked {
                   background: #3aa6ff;
                   border-color: #3aa6ff;
                }
            `}</style>
        </div>
    );
}

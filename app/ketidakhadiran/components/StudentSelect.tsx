'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface Siswa {
    nisn: string;
    nama: string;
    kelas: string;
}

interface StudentSelectProps {
    onSelectionChange: (selectedNisns: string[]) => void;
    selectedNisns: string[];
}

export default function StudentSelect({ onSelectionChange, selectedNisns }: StudentSelectProps) {
    // Filter Class specific state
    const [selectedClass, setSelectedClass] = useState('');
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);

    // Search state
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<Siswa[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState<Siswa[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    // Init: Fetch classes and initial student details
    useEffect(() => {
        fetchClasses();
        if (selectedNisns.length > 0 && selectedStudents.length === 0) {
            fetchSelectedDetails();
        }
    }, []);

    const fetchClasses = async () => {
        try {
            const { data } = await supabase
                .from('siswa_kelas')
                .select('kelas')
                .eq('aktif', true);

            if (data) {
                // Extract unique classes and sort
                const classes = Array.from(new Set(data.map((d: any) => d.kelas))).sort() as string[];
                setAvailableClasses(classes);
            }
        } catch (e) {
            console.error('Error fetching classes', e);
        }
    };

    const fetchSelectedDetails = async () => {
        if (selectedNisns.length === 0) return;
        const { data } = await supabase
            .from('siswa_kelas')
            .select('nisn, nama, kelas')
            .in('nisn', selectedNisns);
        if (data) setSelectedStudents(data);
    };

    // Trigger search when Query OR Class changes
    useEffect(() => {
        const timeout = setTimeout(() => {
            searchSiswa();
        }, 300);
        return () => clearTimeout(timeout);
    }, [query, selectedClass]);

    const searchSiswa = async () => {
        setLoading(true);
        try {
            let dbQuery = supabase
                .from('siswa_kelas')
                .select('nisn, nama, kelas')
                .eq('aktif', true)
                .limit(20);

            // Apply Class Filter
            if (selectedClass) {
                dbQuery = dbQuery.eq('kelas', selectedClass);
            }

            // Apply Text Search
            if (query) {
                dbQuery = dbQuery.or(`nama.ilike.%${query}%,nisn.ilike.%${query}%`);
            }

            const { data, error } = await dbQuery;

            if (data) {
                setResults(data);
            }
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = (siswa: Siswa) => {
        if (selectedNisns.includes(siswa.nisn)) {
            // Uncheck
            const newNisns = selectedNisns.filter(n => n !== siswa.nisn);
            const newStudents = selectedStudents.filter(s => s.nisn !== siswa.nisn);
            onSelectionChange(newNisns);
            setSelectedStudents(newStudents);
        } else {
            // Check
            const newNisns = [...selectedNisns, siswa.nisn];
            const newStudents = [...selectedStudents, siswa];
            onSelectionChange(newNisns);
            setSelectedStudents(newStudents);
        }
    };

    const removeStudent = (nisn: string) => {
        const newNisns = selectedNisns.filter(n => n !== nisn);
        const newStudents = selectedStudents.filter(s => s.nisn !== nisn);
        onSelectionChange(newNisns);
        setSelectedStudents(newStudents);
    };

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
        if (!showDropdown) searchSiswa(); // Refresh list on open
    };

    return (
        <div className="student-select-wrapper" ref={wrapperRef}>

            {/* 1. Class Filter & Trigger */}
            <div className="control-row">
                <select
                    className="form-select class-select"
                    value={selectedClass}
                    onChange={(e) => {
                        setSelectedClass(e.target.value);
                        setShowDropdown(true); // Auto open results when class changes
                    }}
                >
                    <option value="">Semua Kelas</option>
                    {availableClasses.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                    ))}
                </select>

                <div className="search-trigger" onClick={toggleDropdown}>
                    <input
                        type="text"
                        placeholder={selectedClass ? `Cari siswa di ${selectedClass}...` : "Cari nama / NISN..."}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="trigger-input"
                    />
                    <div className="trigger-icon">
                        {loading ? <div className="spinner-xs"></div> : <i className="bi bi-chevron-down"></i>}
                    </div>
                </div>
            </div>

            {/* 2. Dropdown List */}
            {showDropdown && (
                <div className="student-dropdown">
                    {results.length === 0 ? (
                        <div className="empty-state">Tidak ada data ditemukan</div>
                    ) : (
                        results.map(siswa => {
                            const isSelected = selectedNisns.includes(siswa.nisn);
                            return (
                                <div
                                    key={siswa.nisn}
                                    className={`student-option ${isSelected ? 'selected' : ''}`}
                                    onClick={() => handleSelect(siswa)}
                                >
                                    <div className={`checkbox-custom ${isSelected ? 'checked' : ''}`}>
                                        {isSelected && <i className="bi bi-check"></i>}
                                    </div>
                                    <div className="student-info">
                                        <div className="student-name">{siswa.nama}</div>
                                        <div className="student-meta">{siswa.nisn} • {siswa.kelas}</div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            )}

            {/* 3. Selected Chips (Below) */}
            {selectedStudents.length > 0 && (
                <div className="selected-list">
                    <div className="selected-label">Terpilih: {selectedStudents.length} Siswa</div>
                    <div className="chips-grid">
                        {selectedStudents.map(s => (
                            <div key={s.nisn} className="student-chip">
                                <span>{s.nama}</span>
                                <button onClick={() => removeStudent(s.nisn)} className="remove-chip">×</button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <style jsx>{`
        .student-select-wrapper {
          position: relative;
          color: #1f2937;
        }

        .control-row {
          display: flex;
          gap: 10px;
        }

        .class-select {
          width: 140px;
          flex-shrink: 0;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 0.9rem;
          color: #1e293b;
          background-color: #f8fafc;
        }

        .search-trigger {
          flex: 1;
          display: flex;
          align-items: center;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          padding: 0 12px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }

        .search-trigger:hover, .search-trigger:focus-within {
          border-color: #3aa6ff;
          box-shadow: 0 0 0 2px rgba(58, 166, 255, 0.1);
        }

        .trigger-input {
          flex: 1;
          border: none;
          outline: none;
          padding: 10px 0;
          font-size: 0.9rem;
          color: #1e293b;
        }
        
        .trigger-input::placeholder {
           color: #94a3b8;
        }

        .trigger-icon {
          color: #64748b;
          font-size: 0.8rem;
          margin-left: 8px;
        }

        .student-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-top: 6px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          max-height: 250px;
          overflow-y: auto;
          z-index: 50;
        }

        .student-option {
          display: flex;
          align-items: center;
          padding: 10px 14px;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          transition: background 0.1s;
        }

        .student-option:hover {
          background: #f8fafc;
        }

        .student-option.selected {
          background: #eff6ff;
        }

        .checkbox-custom {
          width: 20px;
          height: 20px;
          border: 2px solid #cbd5e1;
          border-radius: 6px;
          margin-right: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          color: white;
          transition: all 0.2s;
          background: white;
        }

        .checkbox-custom.checked {
          background: #3aa6ff;
          border-color: #3aa6ff;
        }

        .student-info { 
           flex: 1;
        }

        .student-name {
          font-weight: 600;
          font-size: 0.9rem;
          color: #1e293b;
        }

        .student-meta {
          font-size: 0.75rem;
          color: #64748b;
        }

        .empty-state {
          padding: 20px;
          text-align: center;
          color: #64748b;
          font-size: 0.9rem;
        }

        .selected-list {
          margin-top: 12px;
        }

        .selected-label {
          font-size: 0.75rem;
          font-weight: 700;
          color: #64748b;
          margin-bottom: 6px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .chips-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .student-chip {
          display: inline-flex;
          align-items: center;
          background: #e0f2fe;
          color: #0369a1;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 0.85rem;
          font-weight: 500;
        }

        .remove-chip {
          background: none;
          border: none;
          color: #0369a1;
          margin-left: 6px;
          cursor: pointer;
          font-size: 1.1rem;
          line-height: 1;
          opacity: 0.6;
          padding: 0;
        }
        
        .remove-chip:hover {
            opacity: 1;
        }

        .spinner-xs {
          width: 14px;
          height: 14px;
          border: 2px solid #cbd5e1;
          border-top-color: #3aa6ff;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
        </div>
    );
}

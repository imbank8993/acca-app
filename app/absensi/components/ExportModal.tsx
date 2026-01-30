'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    userRole: string;
    nip?: string;
    permissions?: any[];
    isAdmin?: boolean;
}

const MONTHS = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' }
];

export default function ExportModal({ isOpen, onClose, userRole, nip, permissions = [], isAdmin = false }: ExportModalProps) {
    // Basic States
    const [academicYear, setAcademicYear] = useState('');
    const [academicYears, setAcademicYears] = useState<string[]>([]);
    const [exporting, setExporting] = useState(false);

    // Mode Selection: GURU, WALI, ADMIN
    const [exportMode, setExportMode] = useState<'GURU' | 'WALI' | 'ADMIN'>('GURU');

    // Guru Sub-options
    const [guruOption, setGuruOption] = useState<'BULAN' | 'KELAS' | 'SEMUA'>('BULAN');
    const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth() + 1]);
    const [selectedKelas, setSelectedKelas] = useState('');

    // Master Data
    const [kelasList, setKelasList] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            // Fetch All Academic Years & the Active one
            const fetchYears = async () => {
                try {
                    const { getActivePeriods, getActiveSettings } = await import('@/lib/settings-client');
                    const periods = await getActivePeriods();
                    const defaultSettings = await getActiveSettings();

                    if (periods.length > 0) {
                        const uniqueYears = Array.from(new Set(periods.map(p => p.tahun_ajaran)));
                        setAcademicYears(uniqueYears);

                        const currentYearIsValid = uniqueYears.includes(academicYear);

                        if (!currentYearIsValid && defaultSettings) {
                            setAcademicYear(defaultSettings.tahun_ajaran);
                        } else if (!currentYearIsValid && periods.length > 0) {
                            setAcademicYear(periods[0].tahun_ajaran);
                        }
                    } else {
                        setAcademicYears([]);
                    }
                } catch (e) {
                    console.error(e);
                }
            };
            fetchYears();

            // Determine initial mode based on permissions/roles
            if (isAdmin) setExportMode('ADMIN');
            else if (userRole === 'WALI KELAS') setExportMode('WALI');
            else setExportMode('GURU');

            fetchInitialData();
        }
    }, [isOpen]);

    const fetchInitialData = async () => {
        try {
            // For Guru/Admin classes
            const res = await fetch(`/api/master/kelas`);
            const json = await res.json();
            if (json.ok && json.data) {
                const names = Array.from(new Set(json.data.map((k: any) => k.nama_kelas))).sort() as string[];
                setKelasList(names);
                if (names.length > 0) setSelectedKelas(names[0]);
            }
        } catch (e) {
            console.error("Failed to fetch classes", e);
        }
    };

    if (!isOpen) return null;

    const toggleMonth = (val: number) => {
        if (selectedMonths.includes(val)) {
            setSelectedMonths(selectedMonths.filter(m => m !== val));
        } else {
            setSelectedMonths([...selectedMonths, val].sort((a, b) => a - b));
        }
    };

    const getDayInitial = (date: Date) => {
        const initials = ['M', 'S', 'S', 'R', 'K', 'J', 'S'];
        return initials[date.getDay()];
    };

    const handleExport = async () => {
        setExporting(true);
        try {
            const { supabase } = await import('@/lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();

            // Prepare Request Body
            const body: any = {
                year: academicYear,
                mode: exportMode,
                role: userRole,
                nip: nip
            };

            if (exportMode === 'GURU') {
                body.guruOption = guruOption;
                body.months = selectedMonths;
                if (guruOption === 'KELAS') body.kelas = selectedKelas;
            } else if (exportMode === 'WALI') {
                // Requirement: No choice, results for current month in current Academic Year
                const now = new Date();
                body.months = [now.getMonth() + 1];
                // For Wali, we need their assigned class ( Wali calculation in API )
            } else if (exportMode === 'ADMIN') {
                body.months = selectedMonths;
                if (selectedKelas !== 'ALL') body.kelas = selectedKelas;
            }

            const res = await fetch('/api/absensi/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
                },
                body: JSON.stringify(body)
            });

            const json = await res.json();
            if (!json.ok) throw new Error(json.error || 'Export failed');

            const sessions = json.data;
            const holidays = json.holidays || [];

            if (!sessions || sessions.length === 0) {
                Swal.fire({ icon: 'info', title: 'Tidak Ada Data', text: 'Tidak ada data absensi untuk kriteria ini.' });
                setExporting(false);
                return;
            }

            // --- EXCEL GENERATION ---
            const XLSX = await import('xlsx-js-style');
            const wb = XLSX.utils.book_new();

            // Grouping Logic Based on Choice
            const groupedData = new Map<string, any[]>();

            sessions.forEach((s: any) => {
                const dateParts = s.tanggal.split('-');
                const mIdx = parseInt(dateParts[1]) - 1;
                const mName = MONTHS[mIdx].label;
                const kName = s.kelas;

                let sheetName = "";
                if (exportMode === 'GURU') {
                    if (guruOption === 'BULAN') sheetName = kName; // One sheet per Class
                    else if (guruOption === 'KELAS') sheetName = mName; // One sheet per Month
                    else sheetName = `${kName}_${mName}`; // One sheet per Class_Month
                } else if (exportMode === 'ADMIN' && selectedKelas === 'ALL') {
                    sheetName = `${mName}_${kName}`;
                } else {
                    sheetName = `${kName}_${mName}`;
                }

                if (sheetName.length > 31) sheetName = sheetName.substring(0, 31);

                if (!groupedData.has(sheetName)) groupedData.set(sheetName, []);
                groupedData.get(sheetName)?.push(s);
            });

            // Process each sheet
            groupedData.forEach((sheetSessions, sheetName) => {
                // Generate data for this sheet
                // We'll reuse the complex styling logic from before but adapted
                const ws = generateWorksheet(sheetSessions, holidays, XLSX);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            XLSX.writeFile(wb, `Absensi_${exportMode}_${academicYear.replace('/', '-')}.xlsx`);
            onClose();
            Swal.fire({ icon: 'success', title: 'Berhasil', text: 'File berhasil diunduh', timer: 1500, showConfirmButton: false });

        } catch (error: any) {
            console.error('Export Failed', error);
            Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
        } finally {
            setExporting(false);
        }
    };

    // Helper to generate a single worksheet from a set of sessions
    const generateWorksheet = (sessions: any[], holidays: any[], XLSX: any) => {
        // Find distinct students
        const students = new Map<string, any>();
        sessions.forEach(s => {
            s.absensi_detail?.forEach((d: any) => {
                if (!students.has(d.nisn)) {
                    students.set(d.nisn, { nisn: d.nisn, nama: d.nama_snapshot, att: {} });
                }
                const day = parseInt(s.tanggal.split('-')[2]);
                students.get(d.nisn).att[day] = d.status;
            });
        });

        const sortedStudents = Array.from(students.values()).sort((a, b) => a.nama.localeCompare(b.nama));

        // Month info from first session
        const firstSesi = sessions[0];
        const dateParts = firstSesi.tanggal.split('-');
        const y = parseInt(dateParts[0]);
        const m = parseInt(dateParts[1]);
        const daysInMonth = new Date(y, m, 0).getDate();
        const monthName = MONTHS[m - 1].label;

        // Build AOAs
        const aoa = [
            ["DAFTAR HADIR SISWA"],
            [`Mapel: ${firstSesi.mapel || '-'}`, "", "", `Kelas: ${firstSesi.kelas}`],
            [`Guru: ${firstSesi.nama_guru || '-'}`, "", "", `Bulan: ${monthName} ${y}`],
            [""],
            ["No", "NISN", "Nama", "Tanggal"]
        ];

        // Header Top Row
        for (let i = 1; i < daysInMonth; i++) aoa[4].push(""); // Spacers
        aoa[4].push("Jumlah");
        aoa[4].push("", "", "");

        // Header Mid (Dates)
        const headerMid = ["", "", ""];
        for (let d = 1; d <= daysInMonth; d++) headerMid.push(d.toString());
        headerMid.push("H", "I", "S", "A");
        aoa.push(headerMid);

        // Header Bot (Day initials)
        const headerBot = ["", "", ""];
        for (let d = 1; d <= daysInMonth; d++) {
            const dt = new Date(y, m - 1, d);
            headerBot.push(getDayInitial(dt));
        }
        headerBot.push("", "", "", "");
        aoa.push(headerBot);

        // Data Rows
        sortedStudents.forEach((st, idx) => {
            const row = [idx + 1, st.nisn, st.nama];
            let h = 0, i = 0, sCount = 0, a = 0;
            for (let d = 1; d <= daysInMonth; d++) {
                const status = st.att[d] || "";
                let init = "";
                if (status === 'HADIR') { init = 'H'; h++; }
                else if (status === 'IZIN') { init = 'I'; i++; }
                else if (status === 'SAKIT') { init = 'S'; sCount++; }
                else if (status === 'ALPHA') { init = 'A'; a++; }
                row.push(init);
            }
            row.push(h, i, sCount, a);
            aoa.push(row);
        });

        const ws = XLSX.utils.aoa_to_sheet(aoa);

        // --- STYLING ---
        const navyHeader = {
            fill: { fgColor: { rgb: "1A237E" } },
            font: { color: { rgb: "FFFFFF" }, bold: true },
            alignment: { horizontal: "center", vertical: "center" },
            border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
        };
        const basicCell = { alignment: { horizontal: "center" }, border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } } };
        const leftCell = { ...basicCell, alignment: { horizontal: "left" } };

        // Merges
        ws['!merges'] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 3 + daysInMonth + 3 } }, // Title
            { s: { r: 4, c: 0 }, e: { r: 6, c: 0 } }, // No
            { s: { r: 4, c: 1 }, e: { r: 6, c: 1 } }, // NISN
            { s: { r: 4, c: 2 }, e: { r: 6, c: 2 } }, // Nama
            { s: { r: 4, c: 3 }, e: { r: 4, c: 3 + daysInMonth - 1 } }, // Tanggal
            { s: { r: 4, c: 3 + daysInMonth }, e: { r: 4, c: 3 + daysInMonth + 3 } }, // Jumlah
        ];

        // Apply styles to range
        const range = XLSX.utils.decode_range(ws['!ref']);
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const addr = XLSX.utils.encode_cell({ r: R, c: C });
                if (!ws[addr]) continue;
                if (R >= 4 && R <= 6) ws[addr].s = navyHeader;
                else if (R > 6) {
                    ws[addr].s = (C === 2) ? leftCell : basicCell;
                }
            }
        }

        // Col widths
        ws['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 30 }];
        for (let i = 0; i < daysInMonth; i++) ws['!cols'].push({ wch: 3 });
        ws['!cols'].push({ wch: 4 }, { wch: 4 }, { wch: 4 }, { wch: 4 });

        return ws;
    };

    return (
        <div className="em__overlay" role="presentation">
            <div className="em__modal" role="dialog" aria-modal="true">
                {/* Header */}
                <div className="em__head">
                    <div className="em__title">
                        <h2 className="text-[#1e3a8a] flex items-center gap-2 text-base font-bold m-0">
                            <i className="bi bi-file-earmark-excel-fill text-blue-600"></i>
                            Export Data Absensi
                        </h2>
                        <p className="text-slate-400 text-[10px] mt-0.5 m-0">
                            Unduh laporan absensi siswa dalam format Excel.
                        </p>
                    </div>
                    <button className="em__close" onClick={onClose} aria-label="Tutup">
                        <i className="bi bi-x-lg" />
                    </button>
                </div>

                {/* Body */}
                <div className="em__body">
                    <div className="em__form">

                        {/* Mode Selector */}
                        <div className="em__field">
                            <label>Mode Export</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    onClick={() => setExportMode('GURU')}
                                    className={`py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap border ${exportMode === 'GURU' ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <i className="bi bi-person mr-1"></i> Guru
                                </button>
                                {(isAdmin || userRole === 'WALI KELAS') && (
                                    <button
                                        onClick={() => setExportMode('WALI')}
                                        className={`py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap border ${exportMode === 'WALI' ? 'bg-amber-50 border-amber-200 text-amber-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <i className="bi bi-people mr-1"></i> Wali
                                    </button>
                                )}
                                {isAdmin && (
                                    <button
                                        onClick={() => setExportMode('ADMIN')}
                                        className={`py-2 px-3 text-xs font-bold rounded-lg transition-all whitespace-nowrap border ${exportMode === 'ADMIN' ? 'bg-slate-100 border-slate-300 text-slate-800' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                    >
                                        <i className="bi bi-shield-lock mr-1"></i> Admin
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Content based on Mode */}
                        {exportMode === 'GURU' && (
                            <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                                <div className="em__field">
                                    <label>Tujuan Pengelompokan Sheet</label>
                                    <div className="flex gap-2">
                                        {(['BULAN', 'KELAS', 'SEMUA'] as const).map(opt => (
                                            <button
                                                key={opt}
                                                onClick={() => setGuruOption(opt)}
                                                className={`flex-1 py-2 rounded-lg border text-xs font-bold transition-all ${guruOption === opt
                                                    ? 'border-blue-400 bg-blue-50 text-blue-800 shadow-sm'
                                                    : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                                                    }`}
                                            >
                                                {opt === 'BULAN' ? 'Per Kelas' : opt === 'KELAS' ? 'Per Bulan' : 'Semua'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {guruOption !== 'KELAS' && (
                                    <div className="em__field">
                                        <label>Pilih Bulan</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {MONTHS.map(m => (
                                                <button
                                                    key={m.value}
                                                    onClick={() => toggleMonth(m.value)}
                                                    className={`py-1.5 rounded text-[11px] font-bold border transition-colors ${selectedMonths.includes(m.value)
                                                        ? 'bg-blue-600 border-blue-600 text-white'
                                                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                        }`}
                                                >
                                                    {m.label.substring(0, 3)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {guruOption === 'KELAS' && (
                                    <div className="em__field">
                                        <label>Pilih Kelas</label>
                                        <select
                                            value={selectedKelas}
                                            onChange={e => setSelectedKelas(e.target.value)}
                                            className="w-full"
                                        >
                                            {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        {exportMode === 'WALI' && (
                            <div className="p-3 bg-amber-50 rounded-lg border border-amber-200/50 text-amber-800 text-xs flex gap-2 items-start animate-in zoom-in-95">
                                <i className="bi bi-info-circle-fill mt-0.5 text-amber-500"></i>
                                <span>Mode Wali Kelas akan merekap absensi kelas Anda untuk <b>bulan ini</b> secara otomatis.</span>
                            </div>
                        )}

                        {exportMode === 'ADMIN' && (
                            <div className="flex flex-col gap-3 animate-in fade-in duration-300">
                                <div className="em__field">
                                    <label>Pilih Kelas</label>
                                    <select
                                        value={selectedKelas}
                                        onChange={e => setSelectedKelas(e.target.value)}
                                        className="w-full"
                                    >
                                        <option value="ALL">-- Semua Kelas --</option>
                                        {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
                                    </select>
                                </div>

                                <div className="em__field">
                                    <label>Pilih Bulan</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {MONTHS.map(m => (
                                            <button
                                                key={m.value}
                                                onClick={() => toggleMonth(m.value)}
                                                className={`py-1.5 rounded text-[11px] font-bold border transition-colors ${selectedMonths.includes(m.value)
                                                    ? 'bg-blue-600 border-blue-600 text-white'
                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                                    }`}
                                            >
                                                {m.label.substring(0, 3)}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="em__field mt-2">
                            <label>Tahun Ajaran</label>
                            <select
                                value={academicYear}
                                onChange={(e) => setAcademicYear(e.target.value)}
                                className="w-full"
                            >
                                {academicYears.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                    </div>
                </div>

                {/* Footer */}
                <div className="em__foot">
                    <button onClick={onClose} className="em__btn em__btnGhost">
                        Batal
                    </button>
                    <button
                        onClick={handleExport}
                        disabled={exporting}
                        className="em__btn em__btnPrimary"
                    >
                        {exporting ? (
                            <>
                                <span className="em__spinner"></span>
                                Memproses...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-file-earmark-excel"></i>
                                Download Excel
                            </>
                        )}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .em__overlay {
                    position: fixed;
                    inset: 0;
                    background: rgba(2, 6, 23, 0.55);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 16px;
                    backdrop-filter: blur(4px);
                }

                .em__modal {
                    width: min(500px, 100%);
                    background: rgba(255, 255, 255, 0.96);
                    border: 1px solid rgba(148, 163, 184, 0.22);
                    border-radius: 16px;
                    box-shadow: 0 28px 80px rgba(2, 6, 23, 0.35);
                    display: flex;
                    flex-direction: column;
                    overflow: hidden;
                    animation: zoomIn 0.2s ease-out;
                }

                @keyframes zoomIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }

                .em__head {
                    display: flex;
                    align-items: flex-start;
                    justify-content: space-between;
                    gap: 6px;
                    padding: 12px 20px;
                    background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.96));
                    border-bottom: 1px solid rgba(148, 163, 184, 0.18);
                    flex: 0 0 auto;
                }

                .em__close {
                    width: 28px;
                    height: 28px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 8px;
                    border: none;
                    background: transparent;
                    color: #94a3b8;
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .em__close:hover {
                    background: #f1f5f9;
                    color: #ef4444;
                }

                .em__body {
                    padding: 20px;
                    overflow-y: auto;
                    max-height: 70vh;
                }

                .em__form {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }

                .em__field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .em__field label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.02em;
                }

                .em__field select, .em__field input {
                    width: 100%;
                    padding: 8px 12px;
                    border-radius: 10px;
                    border: 1px solid rgba(148, 163, 184, 0.35);
                    background: #fff;
                    color: #0f172a;
                    font-weight: 500;
                    font-size: 0.85rem;
                    outline: none;
                    transition: all 0.2s;
                }

                .em__field select:focus, .em__field input:focus {
                    border-color: rgba(58, 166, 255, 0.55);
                    box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
                }

                .em__foot {
                    display: flex;
                    justify-content: flex-end;
                    gap: 10px;
                    padding: 12px 20px;
                    border-top: 1px solid rgba(148, 163, 184, 0.18);
                    background: rgba(255, 255, 255, 0.92);
                }

                .em__btn {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    height: 38px;
                    padding: 0 16px;
                    border-radius: 10px;
                    font-weight: 600;
                    cursor: pointer;
                    font-size: 0.85rem;
                    transition: all 0.2s;
                }

                .em__btnGhost {
                    background: transparent;
                    color: #64748b;
                    border: 1px solid transparent;
                }
                .em__btnGhost:hover {
                    background: #f1f5f9;
                    color: #0f172a;
                }

                .em__btnPrimary {
                    background: linear-gradient(135deg, rgba(58, 166, 255, 0.92), rgba(15, 42, 86, 0.92));
                    color: white;
                    border: 1px solid rgba(58, 166, 255, 0.32);
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                }
                .em__btnPrimary:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 8px 12px -2px rgba(58, 166, 255, 0.25);
                }
                .em__btnPrimary:disabled {
                    opacity: 0.7;
                    cursor: not-allowed;
                }

                .em__spinner {
                    width: 16px; 
                    height: 16px;
                    border: 2px solid rgba(255,255,255,0.3);
                    border-radius: 50%;
                    border-top-color: #fff;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

'use client';

import { useState } from 'react';
import Swal from 'sweetalert2';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    userRole: string; // 'GURU' | 'ADMIN'
    nip?: string; // Required if role is GURU
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
    const [selectedMonths, setSelectedMonths] = useState<number[]>([new Date().getMonth() + 1]);
    const [year, setYear] = useState(new Date().getFullYear());
    const [exporting, setExporting] = useState(false);

    // Wali Kelas Mode State
    const [exportMode, setExportMode] = useState<'GURU' | 'WALI'>('GURU');
    const [selectedKelas, setSelectedKelas] = useState('');
    const [kelasList, setKelasList] = useState<string[]>([]);

    if (!isOpen) return null;

    // Fetch classes if Wali Mode is selected and list is empty
    const handleModeChange = async (mode: 'GURU' | 'WALI') => {
        setExportMode(mode);
        if (mode === 'WALI' && kelasList.length === 0) {
            try {
                // Determine source for class list. 
                // If ADMIN: fetch all. If GURU: fetch assigned scopes? 
                // User said "belum mengatur Guru dan Kelas", so let's fetch ALL classes for now or unique from students?
                // Safest is to fetch from scopes API or generic class list API if exists.
                // Let's reuse `/api/scopes` but maybe without guru_id to get all? Or just use what we have.
                // Or fetch distinct 'kelas' from 'siswa' table?
                // Let's use a new simple fetch to `/api/data/kelas` if it existed, but it doesn't.
                // Let's use `/api/scopes?nip=${nip}` if GURU, or just a hardcoded list if easy?
                // Better: fetch distinct kelas from 'siswa' if possible.
                // Let's try to fetch all classes via a direct query if possible or assume a list for now.
                // Wait, use `api/scopes` is probably best existing way.
                const res = await fetch(`/api/scopes?nip=${nip}`); // Even if Wali, they are a Guru usually.
                const json = await res.json();
                if (json.ok && json.data?.kelasList) {
                    setKelasList(json.data.kelasList);
                    if (json.data.kelasList.length > 0) setSelectedKelas(json.data.kelasList[0]);
                }
            } catch (e) {
                console.error("Failed to fetch classes", e);
            }
        }
    };

    const toggleMonth = (val: number) => {
        if (selectedMonths.includes(val)) {
            setSelectedMonths(selectedMonths.filter(m => m !== val));
        } else {
            setSelectedMonths([...selectedMonths, val].sort((a, b) => a - b));
        }
    };

    const handleSelectAll = () => {
        if (selectedMonths.length === 12) {
            setSelectedMonths([]);
        } else {
            setSelectedMonths(MONTHS.map(m => m.value));
        }
    };

    // --- DAY NAME HELPER (M, S, S, R, K, J, S) ---
    const getDayInitial = (date: Date) => {
        const day = date.getDay(); // 0 = Minggu
        const initials = ['M', 'S', 'S', 'R', 'K', 'J', 'S']; // Minggu, Senin, Selasa, Rabu, Kamis, Jumat, Sabtu
        return initials[day];
    };

    const handleExport = async () => {
        if (selectedMonths.length === 0) {
            Swal.fire({ icon: 'warning', title: 'Pilih Bulan', text: 'Minimal pilih satu bulan' });
            return;
        }

        if (exportMode === 'WALI' && !selectedKelas) {
            Swal.fire({ icon: 'warning', title: 'Pilih Kelas', text: 'Silakan pilih kelas untuk export Wali Kelas' });
            return;
        }

        setExporting(true);

        try {
            // 1. Fetch Data
            const { supabase } = await import('@/lib/supabase');
            const { data: { session } } = await supabase.auth.getSession();

            const res = await fetch('/api/absensi/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
                },
                body: JSON.stringify({
                    months: selectedMonths,
                    year,
                    role: userRole,
                    nip: nip,
                    mode: exportMode, // Pass mode
                    kelas: exportMode === 'WALI' ? selectedKelas : undefined // Pass selected class
                })
            });

            const json = await res.json();
            if (!json.ok) throw new Error(json.error || 'Export failed');

            const sessions = json.data;
            const holidays = json.holidays || []; // Receive holidays

            if (sessions.length === 0) {
                Swal.fire({ icon: 'info', title: 'Tidak Ada Data', text: 'Tidak ada data absensi pada periode yang dipilih' });
                setExporting(false);
                return;
            }

            // 2. Load Library
            const XLSX = await import('xlsx-js-style');

            // --- STYLES ---
            const navyHeader = {
                fill: { fgColor: { rgb: "1A237E" } }, // Navy
                font: { color: { rgb: "FFFFFF" }, bold: true, sz: 11 },
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "000000" } },
                    bottom: { style: "thin", color: { rgb: "000000" } },
                    left: { style: "thin", color: { rgb: "000000" } },
                    right: { style: "thin", color: { rgb: "000000" } }
                }
            };

            const titleStyle = {
                font: { bold: true, sz: 14 },
                alignment: { horizontal: "center", vertical: "center" }
            };

            const infoStyle = {
                font: { bold: true, sz: 11 },
                alignment: { horizontal: "left", vertical: "center" }
            };

            // Weekend Style -> Dark "Gelam"
            const holidayStyle = {
                fill: { fgColor: { rgb: "424242" } }, // Dark Grey
                font: { color: { rgb: "FFFFFF" } },   // White Text
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "CCCCCC" } },
                    bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                    left: { style: "thin", color: { rgb: "CCCCCC" } },
                    right: { style: "thin", color: { rgb: "CCCCCC" } }
                }
            };

            // Specific Holiday Style -> Smooth Red
            const specificHolidayStyle = {
                fill: { fgColor: { rgb: "FECACA" } }, // Smooth Red
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "CCCCCC" } },
                    bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                    left: { style: "thin", color: { rgb: "CCCCCC" } },
                    right: { style: "thin", color: { rgb: "CCCCCC" } }
                }
            };

            const basicCell = {
                alignment: { horizontal: "center", vertical: "center" },
                border: {
                    top: { style: "thin", color: { rgb: "CCCCCC" } },
                    bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                    left: { style: "thin", color: { rgb: "CCCCCC" } },
                    right: { style: "thin", color: { rgb: "CCCCCC" } }
                }
            };

            const leftAlignCell = {
                ...basicCell,
                alignment: { horizontal: "left", vertical: "center" }
            };

            const getStatusStyle = (status: string, isSpecificHoliday: boolean, isWeekend: boolean) => {
                if (isSpecificHoliday) {
                    return specificHolidayStyle;
                }
                if (isWeekend) {
                    return holidayStyle;
                }

                let color = "FFFFFF";
                // Smooth pastel colors matching App (Blue=Hadir, Yellow=Izin, Orange=Sakit, Red=Alpha)
                if (status === 'H') color = "BFDBFE"; // Smooth Blue (ref: tailwind blue-200)
                else if (status === 'I') color = "FDE68A"; // Smooth Yellow (ref: amber-200)
                else if (status === 'S') color = "FED7AA"; // Smooth Orange (ref: orange-200)
                else if (status === 'A') color = "FECACA"; // Smooth Red (ref: red-200)
                // 'L' status is now handled by isSpecificHoliday

                return {
                    fill: { fgColor: { rgb: color } },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: {
                        top: { style: "thin", color: { rgb: "CCCCCC" } },
                        bottom: { style: "thin", color: { rgb: "CCCCCC" } },
                        left: { style: "thin", color: { rgb: "CCCCCC" } },
                        right: { style: "thin", color: { rgb: "CCCCCC" } }
                    }
                };
            };

            // 3. Process Data Grouping
            const sheetsData = new Map<string, any>();

            sessions.forEach((sesi: any) => {
                // Ensure date parsing matches YYYY-MM-DD
                const dateParts = sesi.tanggal.split('-');
                const yearVal = parseInt(dateParts[0]);
                const monthVal = parseInt(dateParts[1]) - 1; // 0-based
                const dayVal = parseInt(dateParts[2]);

                const monthName = MONTHS[monthVal].label;

                let sheetName = `${sesi.mapel}_${sesi.kelas}_${monthName}`;
                if (sheetName.length > 31) sheetName = sheetName.substring(0, 31);

                if (!sheetsData.has(sheetName)) {
                    sheetsData.set(sheetName, {
                        month: monthVal + 1,
                        year: yearVal,
                        mapel: sesi.mapel,
                        kelas: sesi.kelas,
                        nama_guru: sesi.nama_guru,
                        students: new Map<string, any>(),
                        specificHolidays: []
                    });
                }

                const sheet = sheetsData.get(sheetName);

                // Collect specific holidays for this month
                if (sheet.specificHolidays.length === 0 && holidays.length > 0) {
                    sheet.specificHolidays = holidays.filter((h: any) => {
                        const parts = h.tanggal.split('-');
                        const hYear = parseInt(parts[0]);
                        const hMonth = parseInt(parts[1]);
                        return hMonth === (monthVal + 1) && hYear === yearVal;
                    });
                }

                if (sesi.absensi_detail) {
                    sesi.absensi_detail.forEach((det: any) => {
                        if (!sheet.students.has(det.nisn)) {
                            sheet.students.set(det.nisn, {
                                nisn: det.nisn,
                                nama: det.nama_snapshot,
                                attendance: {},
                                remarks: {},
                                subtypes: {}
                            });
                        }
                        const student = sheet.students.get(det.nisn);
                        student.attendance[dayVal] = det.status;
                        if (det.keterangan) student.remarks[dayVal] = det.keterangan;
                        if (det.subtype) student.subtypes[dayVal] = det.subtype;
                    });
                }
            });

            const wb = XLSX.utils.book_new();

            // 4. Generate Sheets
            sheetsData.forEach((data, sheetName) => {
                const daysInMonth = new Date(data.year, data.month, 0).getDate();
                const monthName = MONTHS[data.month - 1].label;

                // --- HEADERS (3 ROWS) & SPACERS ---
                // Row 1: Title
                const titleRow = ["DATA ABSENSI SISWA"];
                // Row 2: Guru & Mapel
                const infoRow1 = [`Guru: ${data.nama_guru || '-'}`, "", "", `Mapel: ${data.mapel || '-'}`];
                // Row 3: Kelas & Bulan
                const infoRow2 = [`Kelas: ${data.kelas}`, "", "", `Bulan: ${monthName} ${data.year}`];

                // Row 4: Spacer
                const spacerRow = [""];

                // Row 5 (Header Top): "No", "NISN", "Nama", "Tanggal" (spanning), "Jumlah" (spanning)
                const headerTop = ["No", "NISN", "Nama", "Tanggal"];
                for (let d = 1; d < daysInMonth; d++) headerTop.push(""); // Spacers for Date Span
                headerTop.push("Jumlah", "", "", "");

                // Row 6 (Header Mid): Date Numbers (1..31) & Count Labels (H,I,S,A)
                const headerMid = ["", "", ""];
                for (let d = 1; d <= daysInMonth; d++) headerMid.push(d.toString());
                headerMid.push("H", "I", "S", "A");

                // Row 7 (Header Bot): Day Initials
                const headerBot = ["", "", ""];
                for (let d = 1; d <= daysInMonth; d++) {
                    const date = new Date(data.year, data.month - 1, d);
                    headerBot.push(getDayInitial(date));
                }
                headerBot.push("", "", "", ""); // Merge up with H/I/S/A

                // --- DATA ROWS ---
                const rows: any[] = [];
                const sortedStudents = Array.from(data.students.values()).sort((a: any, b: any) => a.nama.localeCompare(b.nama));

                sortedStudents.forEach((student: any, idx: number) => {
                    const row = [idx + 1, student.nisn, student.nama];
                    let h = 0, i = 0, s = 0, a = 0;

                    for (let d = 1; d <= daysInMonth; d++) {
                        // 1. Check if Specific Holiday -> Force 'L'
                        // Use string matching again to be safe
                        const dayDateStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                        const isHoliday = data.specificHolidays.some((h: any) => h.tanggal === dayDateStr);

                        let statusInit = "";

                        if (isHoliday) {
                            statusInit = 'L';
                        } else {
                            const rawStatus = student.attendance[d] || "";
                            if (rawStatus === 'HADIR') statusInit = 'H';
                            else if (rawStatus === 'IZIN') statusInit = 'I';
                            else if (rawStatus === 'SAKIT') statusInit = 'S';
                            else if (rawStatus === 'ALPHA') statusInit = 'A';
                            else if (rawStatus && rawStatus.length === 1) statusInit = rawStatus;
                        }

                        row.push(statusInit);

                        if (statusInit === 'H') h++;
                        else if (statusInit === 'I') i++;
                        else if (statusInit === 'S') s++;
                        else if (statusInit === 'A') a++;
                    }

                    row.push(h, i, s, a);
                    rows.push(row);
                });

                // --- FOOTER: Keterangan Libur ---
                const footerRows = [];
                if (data.specificHolidays.length > 0) {
                    footerRows.push(["", "", ""]); // Spacer
                    footerRows.push(["Keterangan Libur:", "", ""]);
                    data.specificHolidays.forEach((h: any) => {
                        const dateStr = new Date(h.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                        footerRows.push([`${dateStr} : ${h.keterangan || 'Libur'}`, "", ""]);
                    });
                }

                // Add explicit "Sabtu & Minggu Libur" note?
                // footerRows.push(["Catatan: Sabtu dan Minggu Libur", "", ""]);

                // Combine for Sheet
                const wsData = [titleRow, infoRow1, infoRow2, spacerRow, headerTop, headerMid, headerBot, ...rows, ...footerRows];
                const ws = XLSX.utils.aoa_to_sheet(wsData);

                // --- APPLY STYLES & MERGES ---
                if (!ws['!merges']) ws['!merges'] = [];

                // Valid range
                const range = XLSX.utils.decode_range(ws['!ref'] as string);

                // Header Top starts at Row 5 (Index 4) -> headerTop
                const HEADER_START_ROW = 4;

                // Merge Title (Row 0)
                const totalCols = 3 + daysInMonth + 4;
                ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } });

                // Merge Info Rows
                ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }); // Guru label
                ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }); // Kelas label

                // Merge Table Headers (Identity Cols) - No/NISN/Nama (Span 3 rows)
                for (let c = 0; c < 3; c++) {
                    ws['!merges'].push({ s: { r: HEADER_START_ROW, c }, e: { r: HEADER_START_ROW + 2, c } });
                }

                // Merge "Tanggal" (Span columns)
                ws['!merges'].push({ s: { r: HEADER_START_ROW, c: 3 }, e: { r: HEADER_START_ROW, c: 3 + daysInMonth - 1 } });

                // Merge "Jumlah" (Span columns)
                const jumlahColStart = 3 + daysInMonth;
                ws['!merges'].push({ s: { r: HEADER_START_ROW, c: jumlahColStart }, e: { r: HEADER_START_ROW, c: jumlahColStart + 3 } });

                // Merge Count Labels (H/I/S/A) - Span vertical (Row 5 & 6)
                for (let i = 0; i < 4; i++) {
                    ws['!merges'].push({ s: { r: HEADER_START_ROW + 1, c: jumlahColStart + i }, e: { r: HEADER_START_ROW + 2, c: jumlahColStart + i } });
                }

                // Merge Footer Rows (Keterangan Libur)
                const FOOTER_START_ROW = HEADER_START_ROW + 3 + rows.length;
                for (let i = 0; i < footerRows.length; i++) {
                    // Merge from Col 0 to Col 10 (or sufficient width)
                    // Rows in wsData: 0..6 (7 rows) + rows.length + i
                    const rIndex = FOOTER_START_ROW + i;
                    ws['!merges'].push({ s: { r: rIndex, c: 0 }, e: { r: rIndex, c: 10 } });
                }

                // Apply Styles
                for (let R = range.s.r; R <= range.e.r; ++R) {
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        const addr = XLSX.utils.encode_cell({ r: R, c: C });
                        if (!ws[addr]) continue;

                        // Title
                        if (R === 0) {
                            ws[addr].s = titleStyle;
                            continue;
                        }
                        // Info Rows
                        if (R === 1 || R === 2) {
                            ws[addr].s = infoStyle;
                            continue;
                        }
                        // Spacer
                        if (R === 3) continue;

                        // Table Headers (Rows 4, 5, 6)
                        if (R >= HEADER_START_ROW && R <= HEADER_START_ROW + 2) {
                            ws[addr].s = navyHeader;
                            // Reset Sunday/Sat styling in header?
                            // Keep consistent navy for now.
                        } else if (R > HEADER_START_ROW + 2 && R < FOOTER_START_ROW) {
                            // DATA ROWS
                            const val = ws[addr].v;

                            let isWeekend = false;
                            let isSpecificHoliday = false;

                            if (C >= 3 && C < 3 + daysInMonth) {
                                const dayOfMonth = C - 3 + 1;
                                const date = new Date(data.year, data.month - 1, dayOfMonth);
                                const dayShort = date.getDay(); // 0=Sun, 6=Sat
                                if (dayShort === 0 || dayShort === 6) isWeekend = true;

                                // Check specific holiday (using string match same as data loop)
                                const dayDateStr = `${data.year}-${String(data.month).padStart(2, '0')}-${String(dayOfMonth).padStart(2, '0')}`;
                                if (data.specificHolidays.some((h: any) => h.tanggal === dayDateStr)) isSpecificHoliday = true;
                            }

                            if (C === 2) {
                                ws[addr].s = leftAlignCell;
                            } else if (C >= 3 && C < 3 + daysInMonth) {
                                // Decide style
                                if (isSpecificHoliday) {
                                    // Specific Holiday -> Smooth Red
                                    ws[addr].s = specificHolidayStyle;
                                } else if (isWeekend) {
                                    ws[addr].s = holidayStyle; // Dark
                                } else {
                                    ws[addr].s = getStatusStyle(val as string, false, false);
                                }
                            } else {
                                ws[addr].s = basicCell;
                            }
                        } else {
                            // Footer rows
                            // Simple style
                            ws[addr].s = { alignment: { horizontal: "left" } };
                        }
                    }
                }

                // Row Heights
                // Index 4 (Row 5 "Tanggal") -> Higher
                const wsrows = [];
                wsrows[4] = { hpt: 30 }; // Increase height for header top
                ws['!rows'] = wsrows;

                // Column Widths
                const wscols = [
                    { wch: 5 },  // No
                    { wch: 15 }, // NISN
                    { wch: 30 }  // Nama
                ];
                // Date columns width
                for (let d = 1; d <= daysInMonth; d++) wscols.push({ wch: 3 });
                // Count columns width
                for (let i = 0; i < 4; i++) wscols.push({ wch: 5 });

                ws['!cols'] = wscols;

                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });

            // --- GENERATE 'KETERANGAN' SHEET ---
            const allKetRows: any[] = [];

            sheetsData.forEach((data) => {
                const sorted = Array.from(data.students.values()).sort((a: any, b: any) => a.nama.localeCompare(b.nama));
                const daysInM = new Date(data.year, data.month, 0).getDate();

                sorted.forEach((student: any) => {
                    for (let d = 1; d <= daysInM; d++) {
                        const s = student.attendance[d];
                        const r = student.remarks[d];
                        const t = student.subtypes[d];

                        if ((s === 'IZIN' || s === 'SAKIT' || s === 'ALPHA') || (r && r.trim() !== '')) {
                            const dateObj = new Date(data.year, data.month - 1, d);
                            const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });

                            let p = 'Alpha';
                            if (s === 'IZIN') p = 'Izin';
                            if (s === 'SAKIT') p = 'Sakit';
                            // if (s === 'HADIR') p = 'Hadir';

                            allKetRows.push({
                                nisn: student.nisn,
                                nama: student.nama,
                                dateRaw: dateObj.getTime(),
                                row: [
                                    student.nisn, // No placeholder
                                    student.nisn,
                                    student.nama,
                                    dateStr,
                                    p,
                                    t || '',
                                    r || '-'
                                ]
                            });
                        }
                    }
                });
            });

            if (allKetRows.length > 0) {
                allKetRows.sort((a, b) => {
                    if (a.nama === b.nama) return a.dateRaw - b.dateRaw;
                    return a.nama.localeCompare(b.nama);
                });

                const kyHeaders = [["No", "NISN", "Nama", "Tanggal", "Kehadiran", "Status", "Keterangan"]];
                const kyData = [...kyHeaders];
                const kyMerges: any[] = [];

                let curNisn = '';
                let num = 1;

                allKetRows.forEach((item, i) => {
                    const dRow = [...item.row];
                    if (item.nisn !== curNisn) {
                        dRow[0] = num++;
                        curNisn = item.nisn;
                    } else {
                        dRow[0] = ''; dRow[1] = ''; dRow[2] = '';
                    }
                    kyData.push(dRow);
                });

                // Calc Merges
                let rStart = 1;
                for (let i = 2; i <= allKetRows.length; i++) {
                    const prev = allKetRows[i - 2];
                    const curr = i <= allKetRows.length ? allKetRows[i - 1] : null;
                    if (!curr || curr.nisn !== prev.nisn) {
                        if ((i - rStart) > 1) {
                            // Merge from rStart to i-1
                            for (let c = 0; c <= 2; c++) {
                                kyMerges.push({ s: { r: rStart, c }, e: { r: i - 1, c } });
                            }
                        }
                        rStart = i;
                    }
                }

                const wsKy = XLSX.utils.aoa_to_sheet(kyData);
                wsKy['!merges'] = kyMerges;

                const wscolsKy = [{ wch: 5 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 15 }, { wch: 40 }];
                wsKy['!cols'] = wscolsKy;

                // Styles
                const rng = XLSX.utils.decode_range(wsKy['!ref'] as string);
                for (let R = rng.s.r; R <= rng.e.r; ++R) {
                    for (let C = rng.s.c; C <= rng.e.c; ++C) {
                        const ad = XLSX.utils.encode_cell({ r: R, c: C });
                        if (!wsKy[ad]) continue;
                        if (R === 0) wsKy[ad].s = navyHeader;
                        else {
                            wsKy[ad].s = (C === 2 || C === 6) ? leftAlignCell : basicCell;
                        }
                    }
                }

                XLSX.utils.book_append_sheet(wb, wsKy, "Keterangan");
            }

            // If empty (shouldn't happen)
            if (wb.SheetNames.length === 0) {
                const ws = XLSX.utils.aoa_to_sheet([["Tidak ada data"]]);
                XLSX.utils.book_append_sheet(wb, ws, "Info");
            }

            // 5. Download
            XLSX.writeFile(wb, `Absensi_Bulanan_${year}.xlsx`);

            onClose();
            Swal.fire({ icon: 'success', title: 'Berhasil', text: 'File berhasil diunduh', timer: 1500, showConfirmButton: false });

        } catch (error: any) {
            console.error('Export Failed', error);
            Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 text-lg">Export Data Absensi</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="p-6">
                    {/* Mode Selection */}
                    {(isAdmin || permissions.some(p => p.resource === 'absensi' && (p.action === '*' || p.action === 'export_all'))) && (
                        <div className="mb-6 flex p-1 bg-slate-100 rounded-xl">
                            <button
                                onClick={() => handleModeChange('GURU')}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${exportMode === 'GURU' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Per Mapel
                            </button>
                            <button
                                onClick={() => handleModeChange('WALI')}
                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${exportMode === 'WALI' ? 'bg-white text-blue-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Wali Kelas (Rekap)
                            </button>
                        </div>
                    )}

                    {/* Class Selector for Wali Mode */}
                    {exportMode === 'WALI' && (
                        <div className="mb-6 animate-in slide-in-from-top-2 duration-200">
                            <label className="block text-sm font-bold text-slate-700 mb-2">Pilih Kelas</label>
                            <select
                                value={selectedKelas}
                                onChange={(e) => setSelectedKelas(e.target.value)}
                                className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none"
                            >
                                {kelasList.length === 0 && <option value="">Memuat kelas...</option>}
                                {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-slate-700 mb-2">Tahun</label>
                        <select
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                            className="w-full p-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        >
                            <option value={2024}>2024</option>
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                        </select>
                    </div>

                    <div className="mb-2 flex justify-between items-center">
                        <label className="block text-sm font-bold text-slate-700">Pilih Bulan</label>
                        <button onClick={handleSelectAll} className="text-xs text-blue-600 font-bold hover:underline">
                            Pilih Semua
                        </button>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-6">
                        {MONTHS.map((m) => {
                            const isSelected = selectedMonths.includes(m.value);
                            return (
                                <button
                                    key={m.value}
                                    onClick={() => toggleMonth(m.value)}
                                    className={`py-2 px-1 rounded-lg text-sm font-bold transition-all border ${isSelected
                                        ? 'bg-[#0b1b3a] text-white border-[#0b1b3a] shadow-md transform scale-105'
                                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    {m.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="p-5 border-t border-slate-100 bg-slate-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-white border border-slate-300 rounded-xl font-bold text-slate-600 hover:bg-slate-50"
                        disabled={exporting}
                    >
                        Batal
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex-1 py-3 bg-[#1D6F42] text-white rounded-xl font-bold hover:bg-[#155230] shadow-lg shadow-green-900/20 disabled:opacity-70 flex items-center justify-center gap-2"
                        disabled={exporting}
                    >
                        {exporting ? <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"></span> : <i className="bi bi-file-earmark-excel-fill"></i>}
                        Export Excel
                    </button>
                </div>
            </div>
        </div>
    );
}


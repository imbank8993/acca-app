'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { ApiResponse, Siswa } from '@/lib/types';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import './nilai.css';

// --- Types ---
interface NilaiRow {
    id?: string;
    nisn: string;
    jenis: string;
    tagihan: string;
    materi_tp: string;
    nilai: number | string;
    catatan?: string;
}

interface TagihanConfig {
    id?: string;
    materi_tp: string;
    jenis: string;
    nama_tagihan: string;
    topik?: string;
}

interface BobotConfig {
    ratioHarian: { kuis: number; tugas: number; uh: number; };
    ratioRapor: { sums: number; pas: number; };
    sumCount: number;
}

const DEFAULT_BOBOT: BobotConfig = {
    ratioHarian: { kuis: 1, tugas: 1, uh: 2 },
    ratioRapor: { sums: 3, pas: 2 },
    sumCount: 4
};

export default function NilaiPage() {
    const [user, setUser] = useState<any>(null);
    const [kelasList, setKelasList] = useState<string[]>([]);
    const [mapelByKelas, setMapelByKelas] = useState<Record<string, string[]>>({});

    // States
    const [kelas, setKelas] = useState('');
    const [mapel, setMapel] = useState('');
    const [semester, setSemester] = useState('2');
    const [materi, setMateri] = useState('SUM 1');
    const [activeMode, setActiveMode] = useState<'REKAP' | 'KUIS' | 'TUGAS' | 'UH' | 'PAS'>('REKAP');
    const [searchTerm, setSearchTerm] = useState('');

    const [siswa, setSiswa] = useState<Siswa[]>([]);
    const [nilaiData, setNilaiData] = useState<NilaiRow[]>([]);
    const [tagihanConfig, setTagihanConfig] = useState<TagihanConfig[]>([]);
    const [bobot, setBobot] = useState<BobotConfig>(DEFAULT_BOBOT);
    const [changes, setChanges] = useState<Record<string, string | number>>({});

    const [loading, setLoading] = useState(false);
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [showTagihanModal, setShowTagihanModal] = useState(false);
    const [editingTagihan, setEditingTagihan] = useState<TagihanConfig | null>(null);
    const [showImportModal, setShowImportModal] = useState(false);
    const tableRef = useRef<HTMLTableElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const getNextAutoLabel = () => {
        const typePrefix = activeMode.toUpperCase();
        // Only count columns that actually have data (visible in UI)
        const visibleTags = tagihanConfig.filter(t => {
            const isMatch = t.jenis === (activeMode.charAt(0) + activeMode.slice(1).toLowerCase()) && t.materi_tp === materi;
            if (!isMatch) return false;
            const hasData = nilaiData.some(d => d.jenis === t.jenis && d.tagihan === t.nama_tagihan && d.materi_tp === t.materi_tp && d.nilai !== null);
            const hasChange = Object.keys(changes).some(k => k.includes(`||${t.jenis}||${t.materi_tp}||${t.nama_tagihan}`));
            return hasData || hasChange;
        });
        return `${typePrefix}_${visibleTags.length + 1}`;
    };

    const filteredSiswa = useMemo(() => {
        if (!searchTerm) return siswa;
        const low = searchTerm.toLowerCase();
        return siswa.filter(s => s.nama_siswa.toLowerCase().includes(low) || s.nisn.includes(low));
    }, [siswa, searchTerm]);

    useEffect(() => {
        const fetchInitial = async () => {
            setLoading(true);
            try {
                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (!authUser) return;
                const { data: userData } = await supabase.from('users').select('*').eq('auth_id', authUser.id).maybeSingle();
                if (userData) {
                    setUser(userData);
                    const res = await fetch(`/api/scopes?nip=${userData.nip}`);
                    const json = await res.json();
                    if (json.ok && json.data) {
                        const kList = json.data.kelasList || [];
                        const mByK = json.data.mapelByKelas || {};
                        setKelasList(kList);
                        setMapelByKelas(mByK);

                        if (kList.length > 0) {
                            const firstK = kList[0];
                            setKelas(firstK);
                            if (mByK[firstK] && mByK[firstK].length > 0) {
                                setMapel(mByK[firstK][0]);
                            }
                        }
                    }
                }
            } finally { setLoading(false); }
        };
        fetchInitial();
    }, []);

    // Auto-load data when filters change
    useEffect(() => {
        if (user && kelas && mapel) {
            loadData();
        }
    }, [user, kelas, mapel, semester]);

    const loadData = async () => {
        if (!kelas || !mapel) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/nilai?nip=${user.nip}&kelas=${encodeURIComponent(kelas)}&mapel=${encodeURIComponent(mapel)}&semester=${semester}`);
            const json = await res.json();
            if (json.ok && json.data) {
                setNilaiData(json.data.nilai || []);
                setSiswa(json.data.siswa || []);
                setTagihanConfig(json.data.tagihan || []);
                setBobot(json.data.bobot || DEFAULT_BOBOT);
                setChanges({});
            }
        } finally { setLoading(false); }
    };

    const getScore = (nisn: string, jenis: string, curMateri: string, tag: string = '') => {
        const key = `${nisn}||${jenis}||${curMateri}||${tag}`;
        if (changes[key] !== undefined) return changes[key];
        const found = nilaiData.find(d => d.nisn === nisn && d.jenis === jenis && d.materi_tp === curMateri && (tag ? d.tagihan === tag : (d.tagihan === '' || !d.tagihan)));
        return (found && found.nilai !== null) ? found.nilai : "";
    };

    const getAvg = (nisn: string, jenis: string, curMateri: string) => {
        const tags = tagihanConfig.filter(t => t.jenis === jenis && t.materi_tp === curMateri);
        if (tags.length === 0) return null;
        let sum = 0, count = 0;
        tags.forEach(t => {
            const s = parseFloat(getScore(nisn, jenis, curMateri, t.nama_tagihan).toString());
            if (!isNaN(s)) { sum += s; count++; }
        });
        return count > 0 ? (sum / count) : null;
    };

    const calculateNABab = (nisn: string, curMateri: string) => {
        const ak = getAvg(nisn, 'Kuis', curMateri);
        const at = getAvg(nisn, 'Tugas', curMateri);
        const vu = parseFloat(getScore(nisn, 'UH', curMateri).toString());
        let { kuis: rK, tugas: rT, uh: rU } = bobot.ratioHarian;
        if (!tagihanConfig.some(t => t.jenis === 'Kuis' && t.materi_tp === curMateri)) rK = 0;
        if (!tagihanConfig.some(t => t.jenis === 'Tugas' && t.materi_tp === curMateri)) rT = 0;
        const totalR = rK + rT + rU;
        if (totalR === 0) return "-";
        return (((ak || 0) * rK) + ((at || 0) * rT) + ((isNaN(vu) ? 0 : vu) * rU)) / totalR;
    };

    const isDiffFromDB = (nisn: string, jenis: string, curMateri: string, tag: string = '') => {
        const key = `${nisn}||${jenis}||${curMateri}||${tag}`;
        const current = changes[key];
        if (current === undefined) return false;

        const found = nilaiData.find(d => d.nisn === nisn && d.jenis === jenis && d.materi_tp === curMateri && (tag ? d.tagihan === tag : (d.tagihan === '' || !d.tagihan)));
        const original = (found && found.nilai !== null) ? found.nilai.toString() : "";

        if (current.toString() === original.toString()) return false;
        if (parseFloat(current.toString()) === parseFloat(original.toString())) return false;
        return true;
    };

    const calculateRapor = (nisn: string) => {
        const sums = Array.from({ length: bobot.sumCount }, (_, i) => `SUM ${i + 1}`);
        let sSum = 0, sCount = 0;
        sums.forEach(s => {
            const na = calculateNABab(nisn, s);
            if (na !== "-") { sSum += (na as number); sCount++; }
        });
        const avgS = sCount > 0 ? (sSum / sCount) : 0;
        const vPas = parseFloat(getScore(nisn, 'PAS', '-', '').toString()) || 0;
        const { sums: rS, pas: rP } = bobot.ratioRapor;
        return rS + rP === 0 ? "0" : (((avgS * rS) + (vPas * rP)) / (rS + rP)).toFixed(0);
    };

    const handleDeleteTagihan = async (id: string, name: string) => {
        const result = await Swal.fire({
            title: `Hapus ${name}?`,
            text: "Seluruh nilai pada kolom ini akan dihapus permanen!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'YA, HAPUS'
        });
        if (result.isConfirmed) {
            await fetch(`/api/nilai/tagihan?id=${id}`, { method: 'DELETE' });
            loadData();
        }
    };

    const handleDeleteSum = async (num: number) => {
        const sumName = `SUM ${num}`;
        const result = await Swal.fire({
            title: `Hapus ${sumName}?`,
            text: `Seluruh data nilai dan topik pada ${sumName} akan dihapus permanen!`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            confirmButtonText: 'YA, HAPUS'
        });

        if (result.isConfirmed) {
            const tag = tagihanConfig.find(t => t.jenis === 'Sum' && t.materi_tp === sumName);
            if (tag?.id) {
                await fetch(`/api/nilai/tagihan?id=${tag.id}`, { method: 'DELETE' });
            }
            const newCount = Math.max(1, bobot.sumCount - 1);
            const newBobot = { ...bobot, sumCount: newCount };
            await fetch('/api/nilai/bobot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nip: user.nip, kelas, mapel, semester, config: newBobot }) });
            setBobot(newBobot);
            loadData();
        }
    };

    const handleAddSum = async () => {
        const newCount = bobot.sumCount + 1;
        const newBobot = { ...bobot, sumCount: newCount };
        await fetch('/api/nilai/bobot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nip: user.nip, kelas, mapel, semester, config: newBobot }) });
        setBobot(newBobot);
        loadData();
    };

    const handleScoreChange = (nisn: string, jenis: string, mtr: string, tag: string, val: string) => {
        let raw = val.replace(',', '.');

        // 1. Allow empty for deletion
        if (raw === "") {
            setChanges({ ...changes, [`${nisn}||${jenis}||${mtr}||${tag}`]: "" });
            return;
        }

        // 2. Strict Regex: At least one digit before optional dot, max 2 decimal places
        if (!/^\d+\.?\d{0,2}$/.test(raw)) return;

        // 3. Strict Blocking Check: If number > 100, do not update (stop at 100)
        // Special case: "100." is allowed temporarily to type "100.x" if we allowed more than 100, 
        // but since 100 is max, we only allow exactly "100" or values < 100.
        const num = parseFloat(raw);
        if (!isNaN(num) && num > 100) return;

        // 4. Formatting: Prevent multiple leading zeros like 007
        if (raw.length > 1 && raw.startsWith('0') && raw[1] !== '.') raw = raw.substring(1);

        setChanges({ ...changes, [`${nisn}||${jenis}||${mtr}||${tag}`]: raw });
    };

    const handleSave = async () => {
        const updates = Object.keys(changes).map(key => {
            const [nisn, jenis, mt, tag] = key.split('||');
            return { nisn, jenis, materi: mt, tagihan: tag || '', nilai: changes[key] };
        });
        setLoading(true);
        try {
            const res = await fetch('/api/nilai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nip: user.nip, kelas, mapel, semester, updates }) });
            if (res.ok) { Swal.fire({ icon: 'success', title: 'Secured', timer: 1000, showConfirmButton: false }); loadData(); }
        } finally { setLoading(false); }
    };

    const handleExport = async () => {
        // Use xlsx-js-style for professional styling
        const XLSXStyle = await import('xlsx-js-style');

        // Build data structure
        const data = filteredSiswa.map((s, idx) => {
            const row: any = {
                "NO": idx + 1,
                "NISN": s.nisn,
                "NAMA": s.nama_siswa,
                "KELAS": s.kelas || kelas // Use s.kelas or fallback to active filter
            };

            if (activeMode === 'REKAP') {
                Array.from({ length: bobot.sumCount }, (_, i) => {
                    const sumName = `SUM ${i + 1}`;
                    const customTag = tagihanConfig.find(t => t.jenis === 'Sum' && t.materi_tp === sumName);
                    const key = customTag ? `${sumName} (${customTag.topik || ''})`.toUpperCase() : sumName;
                    row[key] = "";
                });
                row["PAS"] = "";
                row["RAPOR"] = "";
            } else if (activeMode === 'UH') {
                row[`UH_${materi}`.toUpperCase()] = "";
            } else if (activeMode === 'PAS') {
                row["PAS"] = "";
            } else {
                const jenisStr = activeMode.toUpperCase();
                const tags = tagihanConfig.filter(t => t.jenis === activeMode.charAt(0) + activeMode.slice(1).toLowerCase() && t.materi_tp === materi);
                for (let i = 1; i <= 10; i++) {
                    const tag = tags[i - 1];
                    const key = tag ? `${tag.nama_tagihan} (${tag.topik || ''})`.toUpperCase() : `${jenisStr}_${i}`;
                    row[key] = "";
                }
            }
            return row;
        });

        const ws = XLSXStyle.utils.json_to_sheet(data);

        // --- STYLING LOGIC ---
        const range = XLSXStyle.utils.decode_range(ws['!ref']!);

        // Styles Configuration
        const headerStyle = {
            fill: { fgColor: { rgb: "0F172A" } }, // Navy Slate
            font: { color: { rgb: "FFFFFF" }, bold: true, sz: 11 },
            alignment: { horizontal: "center", vertical: "center" },
            border: {
                top: { style: "thin", color: { rgb: "000000" } },
                bottom: { style: "thin", color: { rgb: "000000" } },
                left: { style: "thin", color: { rgb: "000000" } },
                right: { style: "thin", color: { rgb: "000000" } }
            }
        };

        const identityStyle = {
            fill: { fgColor: { rgb: "F8FAFC" } }, // Very light Slate
            font: { color: { rgb: "1E293B" }, sz: 10 },
            alignment: { horizontal: "left", vertical: "center" },
            border: {
                bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                right: { style: "thin", color: { rgb: "E2E8F0" } }
            }
        };

        const scoreAreaStyle = {
            fill: { fgColor: { rgb: "FFFFFF" } },
            font: { color: { rgb: "0F172A" }, bold: true },
            alignment: { horizontal: "center" },
            border: {
                bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                right: { style: "thin", color: { rgb: "E2E8F0" } }
            }
        };

        // Apply Styles
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const addr = XLSXStyle.utils.encode_cell({ r: R, c: C });
                if (!ws[addr]) continue;

                if (R === 0) {
                    // Header Row
                    ws[addr].s = headerStyle;
                } else {
                    // Data Rows
                    if (C <= 3) { // NO, NISN, NAMA, KELAS
                        const style: any = { ...identityStyle };
                        if (C <= 1 || C === 3) { // Center Align for NO, NISN, and KELAS
                            style.alignment = { horizontal: "center", vertical: "center" };
                        }
                        ws[addr].s = style;
                    } else {
                        ws[addr].s = scoreAreaStyle;
                    }
                }
            }
        }

        // Define Column Widths
        ws['!cols'] = [
            { wch: 6 },  // NO
            { wch: 18 }, // NISN
            { wch: 40 }, // NAMA
            { wch: 12 }  // KELAS
        ];
        for (let i = 4; i <= range.e.c; i++) ws['!cols'].push({ wch: 15 });

        // Row Heights
        ws['!rows'] = [{ hpt: 30 }]; // Header taller

        const wb = XLSXStyle.utils.book_new();
        XLSXStyle.utils.book_append_sheet(wb, ws, activeMode.toUpperCase());

        const filename = `TEMPLATE_${activeMode}_${materi}_${kelas}_${mapel}.xlsx`.toUpperCase().replace(/\s+/g, '_');
        XLSXStyle.writeFile(wb, filename);
        Swal.fire({ icon: 'info', title: 'Premium Template Exported', text: `Stylized template created. Identity columns are now clearly marked.`, timer: 1500, showConfirmButton: false });
    };

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data: any[] = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) throw new Error("File Excel kosong atau format salah.");

                const newChanges = { ...changes };
                let matchCount = 0;
                let errorLogs: string[] = [];
                const columns = Object.keys(data[0]);

                // 1. STRICT HEADER VALIDATION (Must be UPPERCASE)
                const invalidHeaders = columns.filter(c => c !== "NO" && c !== c.toUpperCase());
                if (invalidHeaders.length > 0) {
                    throw new Error(`Import ditolak. Nama kolom harus KAPITAL semua: ${invalidHeaders.join(', ')}`);
                }

                // 2. STRUCTURAL VALIDATION (Cannot use Tugas template for Kuis, etc)
                if (activeMode === 'KUIS' || activeMode === 'TUGAS') {
                    const jenisStr = activeMode.charAt(0) + activeMode.slice(1).toLowerCase();
                    const scoreCols = columns.filter(c => !["NO", "NISN", "NAMA", "KELAS", "RAPOR"].includes(c));

                    for (const col of scoreCols) {
                        // Extract Name and Topic from "NAME (TOPIC)"
                        let finalName = col;
                        let finalTopic = "Auto-Imported";
                        const match = col.match(/^(.+?)\s*\((.*?)\)$/);
                        if (match) {
                            finalName = match[1].trim();
                            finalTopic = match[2].trim() || finalTopic;
                        }

                        const exists = tagihanConfig.find(t => t.nama_tagihan.toUpperCase() === finalName.toUpperCase() && t.materi_tp === materi && t.jenis === jenisStr);
                        if (!exists) {
                            await fetch('/api/nilai/tagihan', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ nip: user.nip, kelas, mapel, semester, materi, jenis: jenisStr, nama: finalName.toUpperCase(), topik: finalTopic })
                            });
                        }
                    }
                    const res = await fetch(`/api/nilai?nip=${user.nip}&kelas=${encodeURIComponent(kelas)}&mapel=${encodeURIComponent(mapel)}&semester=${semester}`);
                    const json = await res.json();
                    if (json.ok) setTagihanConfig(json.data.tagihan || []);
                }

                // 2. Process data with STRICT VALIDATION
                data.forEach((row, rowIdx) => {
                    const nisn = row["NISN"]?.toString().trim();
                    const nama = row["NAMA"]?.toString().trim();
                    const kls = row["KELAS"]?.toString().trim();

                    if (!nisn) return;

                    // Validation: NISN, Name, and Class must match current view
                    const validStudent = siswa.find(s => s.nisn === nisn);
                    if (!validStudent) {
                        errorLogs.push(`Row ${rowIdx + 2}: NISN ${nisn} tidak terdaftar di kelas ini.`);
                        return;
                    }
                    if (validStudent.nama_siswa.toLowerCase() !== (nama?.toLowerCase())) {
                        errorLogs.push(`Row ${rowIdx + 2}: Nama di Excel (${nama}) tidak cocok dengan Database (${validStudent.nama_siswa}).`);
                        return;
                    }
                    if (validStudent.kelas !== kls) {
                        errorLogs.push(`Row ${rowIdx + 2}: Kelas di Excel (${kls}) tidak cocok dengan Database (${validStudent.kelas}).`);
                        return;
                    }

                    matchCount++;
                    Object.keys(row).forEach(col => {
                        // Skip system columns
                        if (["NO", "NISN", "NAMA", "KELAS", "RAPOR"].includes(col)) return;

                        let rawValue = row[col]?.toString() || "";
                        if (rawValue === "") return; // Skip empty cells (do nothing)

                        // Convert comma to dot for decimal support
                        let valStr = rawValue.replace(',', '.');
                        let val = parseFloat(valStr);

                        // Range Validation: 0 - 100
                        if (isNaN(val) || val < 0 || val > 100) {
                            errorLogs.push(`Row ${rowIdx + 2}: Nilai "${rawValue}" di kolom ${col} tidak valid (harus 0-100).`);
                            return;
                        }

                        if (activeMode === 'UH' && col.startsWith('UH')) {
                            newChanges[`${nisn}||UH||${materi}||`] = val;
                        } else if (activeMode === 'PAS' && col === 'PAS') {
                            newChanges[`${nisn}||PAS||-||`] = val;
                        } else if (activeMode === 'KUIS' || activeMode === 'TUGAS') {
                            const jenisStr = activeMode.charAt(0) + activeMode.slice(1).toLowerCase();
                            // Ensure we find the correctly cased metadata name but use the Excel value
                            const tag = tagihanConfig.find(t => t.nama_tagihan.toUpperCase() === col.toUpperCase() && t.materi_tp === materi && t.jenis === jenisStr);
                            const finalTag = tag ? tag.nama_tagihan : col;
                            newChanges[`${nisn}||${jenisStr}||${materi}||${finalTag}`] = val;
                        }
                    });
                });

                if (errorLogs.length > 0) {
                    Swal.fire({
                        title: 'Import Warning',
                        html: `<div class="text-left text-xs space-y-1 max-h-40 overflow-auto border p-2 bg-red-50 text-red-700">${errorLogs.join('<br>')}</div>`,
                        icon: 'warning'
                    });
                }

                if (matchCount > 0) {
                    setChanges(newChanges);
                    setShowImportModal(false);
                    Swal.fire('Import Success', `${matchCount} students processed as draft. Review and SYNC.`, 'success');
                } else if (errorLogs.length === 0) {
                    throw new Error("Tidak ada data yang diproses.");
                }
            } catch (err: any) {
                Swal.fire('Import Error', err.message, 'error');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const handleKeyDown = (e: React.KeyboardEvent, rIdx: number, cIdx: number) => {
        const inputs = tableRef.current?.querySelectorAll('input.nilai-input') as NodeListOf<HTMLInputElement>;
        if (!inputs) return;
        const subTags = tagihanConfig.filter(t => t.jenis === (activeMode.charAt(0) + activeMode.slice(1).toLowerCase()) && t.materi_tp === materi);
        const cols = (activeMode === 'UH' || activeMode === 'PAS') ? 1 : subTags.length;
        let tIdx = -1;
        if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); tIdx = (rIdx + 1) * cols + cIdx; }
        else if (e.key === 'ArrowUp') { e.preventDefault(); tIdx = (rIdx - 1) * cols + cIdx; }
        else if (e.key === 'ArrowRight' && (e.currentTarget as any).selectionEnd === (e.currentTarget as any).value.length) tIdx = rIdx * cols + cIdx + 1;
        else if (e.key === 'ArrowLeft' && (e.currentTarget as any).selectionStart === 0) tIdx = rIdx * cols + cIdx - 1;
        if (tIdx >= 0 && tIdx < inputs.length) { inputs[tIdx].focus(); inputs[tIdx].select(); }
    };

    return (
        <div className="nilai-page">
            <header className="ng-header sticky top-0 z-[60] py-4 border-b">
                <div className="max-w-[1700px] mx-auto px-10 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="brand-badge"><i className="bi bi-intersect text-xl"></i></div>
                        <div>
                            <h1 className="text-lg font-extrabold tracking-tight text-slate-800">GradeCenter<span className="text-blue-600">.</span></h1>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                <span>{kelas || '---'}</span><i className="bi bi-dot"></i><span>{mapel || '---'}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="relative group">
                            <input type="text" placeholder="Search entries..." className="ng-input w-64 pr-10 border-slate-200" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            <i className="bi bi-search absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"></i>
                        </div>
                        <button className="text-slate-500 hover:text-slate-900 transition p-2" onClick={loadData}><i className={`bi bi-arrow-clockwise text-xl ${loading ? 'animate-spin' : ''}`}></i></button>
                    </div>
                </div>
            </header>

            <main className="max-w-[1700px] mx-auto p-10 space-y-8 animate-fade">
                <div className="flex items-center justify-between bg-white p-4 rounded-2xl border shadow-sm">
                    <div className="mode-switcher">
                        {['REKAP', 'KUIS', 'TUGAS', 'UH', 'PAS'].map(m => (
                            <button key={m} className={`mode-btn ${activeMode === m ? 'active' : ''}`} onClick={() => setActiveMode(m as any)}>{m}</button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <select className="ng-select" value={kelas} onChange={e => {
                            const newK = e.target.value;
                            setKelas(newK);
                            if (mapelByKelas[newK] && mapelByKelas[newK].length > 0) {
                                setMapel(mapelByKelas[newK][0]);
                            }
                        }}>
                            {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                        <select className="ng-select" value={mapel} onChange={e => setMapel(e.target.value)}>
                            {(mapelByKelas[kelas] || []).map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <div className="flex gap-2 ml-4">
                            <button className="btn-primary flex items-center gap-2 text-xs" onClick={handleExport}><i className="bi bi-download"></i> EXPORT</button>
                            <button className="bg-slate-50 text-slate-600 font-bold px-5 py-2.5 rounded-xl text-xs border hover:bg-white transition" onClick={() => setShowImportModal(true)}>
                                <i className="bi bi-file-earmark-arrow-up mr-2"></i> IMPORT
                            </button>
                            <input type="file" ref={fileInputRef} hidden accept=".xlsx,.xls" onChange={handleImport} />
                        </div>
                    </div>
                </div>

                {activeMode !== 'REKAP' && activeMode !== 'PAS' && (
                    <div className="flex items-center gap-4">
                        <div className="flex-1 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                            {Array.from({ length: bobot.sumCount }, (_, i) => `SUM ${i + 1}`).map(s => (
                                <button key={s} className={`whitespace-nowrap px-6 py-2 rounded-xl text-[11px] font-bold border transition ${materi === s ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`} onClick={() => setMateri(s)}>{s}</button>
                            ))}
                        </div>
                        <button className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition" onClick={() => setShowConfigModal(true)}><i className="bi bi-gear-fill mr-2"></i> CONFIGURE_SUM</button>
                    </div>
                )}

                <div className="premium-table-container">
                    <table className="premium-table" ref={tableRef}>
                        <thead>
                            <tr>
                                <th className="w-12">NO</th>
                                <th className="w-32 text-center px-4">NISN</th>
                                <th className="text-left px-6">STUDENT_NAME</th>
                                {activeMode === 'REKAP' ? (
                                    <>
                                        {Array.from({ length: bobot.sumCount }, (_, i) => {
                                            const sumName = `SUM ${i + 1}`;
                                            const cfg = tagihanConfig.find(t => t.jenis === 'Sum' && t.materi_tp === sumName);
                                            return (
                                                <th key={i} className="min-w-[110px] py-2">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">{sumName}</span>
                                                        <div className="flex items-center gap-1.5 bg-slate-100/80 px-1.5 py-0.5 rounded-md">
                                                            <button onClick={() => { setEditingTagihan(cfg || { jenis: 'Sum', materi_tp: sumName, nama_tagihan: sumName }); setShowTagihanModal(true); }} className="text-blue-500 hover:text-blue-700 transition" title="Edit Topic">
                                                                <i className="bi bi-pencil-square text-[10px]"></i>
                                                            </button>
                                                            <div className="w-px h-2.5 bg-slate-200"></div>
                                                            <button onClick={() => handleDeleteSum(i + 1)} className="text-red-400 hover:text-red-600 transition" title="Delete SUM">
                                                                <i className="bi bi-trash3-fill text-[10px]"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                        <th className="w-24 text-center">PAS</th>
                                        <th className="w-32 bg-blue-50 text-blue-600 border-l border-blue-100 text-center">RAPOR_FINAL</th>
                                    </>
                                ) : activeMode === 'UH' ? (
                                    <th className="w-48 bg-slate-50 text-slate-900 text-center uppercase">UH_{materi}</th>
                                ) : activeMode === 'PAS' ? (
                                    <th className="w-48 bg-slate-50 text-slate-900 text-center uppercase">FINAL_SCORE</th>
                                )
                                    : tagihanConfig.filter(t => {
                                        const isMatch = t.jenis === (activeMode.charAt(0) + activeMode.slice(1).toLowerCase()) && t.materi_tp === materi;
                                        if (!isMatch) return false;
                                        const hasData = nilaiData.some(d => d.jenis === t.jenis && d.tagihan === t.nama_tagihan && d.materi_tp === t.materi_tp && d.nilai !== null);
                                        const hasChange = Object.keys(changes).some(k => k.includes(`||${t.jenis}||${t.materi_tp}||${t.nama_tagihan}`));
                                        return hasData || hasChange;
                                    }).map(it => (
                                        <th key={it.id} className="min-w-[110px] py-2">
                                            <div className="flex flex-col items-center gap-1">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">{it.nama_tagihan}</span>
                                                <div className="flex items-center gap-1.5 bg-slate-100/80 px-1.5 py-0.5 rounded-md">
                                                    <button onClick={() => { setEditingTagihan(it); setShowTagihanModal(true); }} className="text-blue-500 hover:text-blue-700 transition" title="Edit Topic">
                                                        <i className="bi bi-pencil-square text-[10px]"></i>
                                                    </button>
                                                    <div className="w-px h-2.5 bg-slate-200"></div>
                                                    <button onClick={() => handleDeleteTagihan(it.id!, it.nama_tagihan)} className="text-red-400 hover:text-red-600 transition" title="Delete & Re-index">
                                                        <i className="bi bi-trash3-fill text-[10px]"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        </th>
                                    ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSiswa.map((s, rIdx) => {
                                const subTags = tagihanConfig.filter(t => {
                                    const isMatch = t.jenis === (activeMode.charAt(0) + activeMode.slice(1).toLowerCase()) && t.materi_tp === materi;
                                    if (!isMatch) return false;
                                    const hasData = nilaiData.some(d => d.jenis === t.jenis && d.tagihan === t.nama_tagihan && d.materi_tp === t.materi_tp && d.nilai !== null);
                                    const hasChange = Object.keys(changes).some(k => k.includes(`||${t.jenis}||${t.materi_tp}||${t.nama_tagihan}`));
                                    return hasData || hasChange;
                                });
                                return (
                                    <tr key={s.nisn} className="group/row">
                                        <td className="text-center font-mono text-[10px] text-slate-300 bg-slate-50/30">{rIdx + 1}</td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-[12px] font-mono font-bold text-slate-400 bg-slate-100/50 px-2 py-1 rounded-md tracking-tighter">
                                                {s.nisn}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-[12px] font-bold text-slate-700 uppercase tracking-tight font-outfit">
                                                {s.nama_siswa}
                                            </span>
                                        </td>
                                        {activeMode === 'REKAP' ? (
                                            <>
                                                {Array.from({ length: bobot.sumCount }, (_, i) => {
                                                    const na = calculateNABab(s.nisn, `SUM ${i + 1}`);
                                                    return <td key={i} className="text-center"><span className="score-badge">{na === "-" ? "-" : (na as number).toFixed(0)}</span></td>;
                                                })}
                                                <td className="text-center"><span className="score-badge">{getScore(s.nisn, 'PAS', '-')}</span></td>
                                                <td className="text-center bg-blue-50/30 border-l border-blue-50"><span className="score-final">{calculateRapor(s.nisn)}</span></td>
                                            </>
                                        ) : (
                                            (activeMode === 'UH' || activeMode === 'PAS' ? [activeMode] : subTags).map((it, cIdx) => (
                                                <td key={typeof it === 'string' ? it : it.nama_tagihan} className="border-l border-slate-50">
                                                    <input
                                                        type="text"
                                                        inputMode="decimal"
                                                        className={`nilai-input ${isDiffFromDB(
                                                            s.nisn,
                                                            activeMode === 'UH' ? 'UH' : activeMode === 'PAS' ? 'PAS' : (it as TagihanConfig).jenis,
                                                            activeMode === 'PAS' ? '-' : materi,
                                                            typeof it === 'string' ? '' : (it as TagihanConfig).nama_tagihan
                                                        ) ? 'is-changed' : ''}`}
                                                        value={getScore(s.nisn, activeMode === 'UH' ? 'UH' : activeMode === 'PAS' ? 'PAS' : (it as TagihanConfig).jenis, activeMode === 'PAS' ? '-' : materi, typeof it === 'string' ? '' : (it as TagihanConfig).nama_tagihan)}
                                                        onChange={e => handleScoreChange(
                                                            s.nisn,
                                                            activeMode === 'UH' ? 'UH' : activeMode === 'PAS' ? 'PAS' : (it as TagihanConfig).jenis,
                                                            activeMode === 'PAS' ? '-' : materi,
                                                            typeof it === 'string' ? '' : (it as TagihanConfig).nama_tagihan,
                                                            e.target.value
                                                        )}
                                                        onKeyDown={e => handleKeyDown(e, rIdx, cIdx)}
                                                    />
                                                </td>
                                            ))
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* LEGEND / DESCRIPTION SECTION BELOW TABLE - LIST FORMAT */}
                {(activeMode === 'KUIS' || activeMode === 'TUGAS' || activeMode === 'REKAP') && (
                    <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-5 mt-4 animate-fade max-w-2xl">
                        <div className="flex items-center gap-2 mb-3">
                            <i className="bi bi-info-circle-fill text-blue-500 text-xs"></i>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Materi Penilaian</h4>
                        </div>
                        <div className="space-y-1.5">
                            {activeMode === 'REKAP' ? (
                                Array.from({ length: bobot.sumCount }, (_, i) => {
                                    const sumName = `SUM ${i + 1}`;
                                    const cfg = tagihanConfig.find(t => t.jenis === 'Sum' && t.materi_tp === sumName);
                                    const hasData = nilaiData.some(d => d.materi_tp === sumName && d.nilai !== null);
                                    if (!hasData && !cfg?.topik) return null;

                                    return (
                                        <div key={i} className="flex items-center gap-3 py-1 border-b border-slate-100 last:border-0">
                                            <span className="text-[10px] font-black text-slate-400 min-w-[60px]">{sumName}</span>
                                            <span className="text-slate-300">|</span>
                                            <span className="text-[11px] font-bold text-slate-600">{cfg?.topik || '-'}</span>
                                        </div>
                                    );
                                })
                            ) : (
                                tagihanConfig.filter(t => {
                                    const isMatch = t.jenis === (activeMode.charAt(0) + activeMode.slice(1).toLowerCase()) && t.materi_tp === materi;
                                    if (!isMatch) return false;
                                    const hasData = nilaiData.some(d => d.jenis === t.jenis && d.tagihan === t.nama_tagihan && d.materi_tp === t.materi_tp && d.nilai !== null);
                                    const hasChange = Object.keys(changes).some(k => k.includes(`||${t.jenis}||${t.materi_tp}||${t.nama_tagihan}`));
                                    return hasData || hasChange;
                                }).map(it => (
                                    <div key={it.id} className="flex items-center gap-3 py-1 border-b border-slate-100 last:border-0">
                                        <span className="text-[10px] font-black text-slate-400 min-w-[60px]">{it.nama_tagihan}</span>
                                        <span className="text-slate-300">|</span>
                                        <span className="text-[11px] font-bold text-slate-600">{it.topik || '-'}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </main>

            {Object.keys(changes).length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 animate-fade z-[100]">
                    <button className="bg-slate-900 text-white px-10 py-4 rounded-full font-extrabold text-sm shadow-2xl flex items-center gap-4 hover:scale-105 active:scale-95 transition" onClick={handleSave}>
                        PUSH {Object.keys(changes).length} CHANGES TO SERVER <i className="bi bi-cloud-arrow-up text-lg"></i>
                    </button>
                </div>
            )}

            <button className="fixed bottom-10 right-10 w-16 h-16 bg-white border border-slate-200 text-slate-900 rounded-2xl shadow-xl flex items-center justify-center hover:bg-slate-50 hover:scale-105 transition-all z-[80]" onClick={() => setShowConfigModal(true)}><i className="bi bi-sliders text-2xl"></i></button>

            {showConfigModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-glass animate-fade">
                    <div className="modal-content w-full max-w-lg overflow-hidden">
                        <div className="p-8 border-b flex justify-between items-center">
                            <div><h2 className="text-xl font-extrabold tracking-tight">System Configuration</h2><p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-1">Ratio & Scope Management</p></div>
                            <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-slate-900 transition"><i className="bi bi-x-lg text-xl"></i></button>
                        </div>
                        <div className="p-8 space-y-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Bab Ratio (Kuis : Tugas : UH)</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {['kuis', 'tugas', 'uh'].map(k => (
                                        <div key={k} className="space-y-1"><span className="text-[9px] font-bold text-slate-400 uppercase block ml-1">{k}</span>
                                            <input type="number" className="ng-input w-full text-center font-bold" value={(bobot.ratioHarian as any)[k]} onChange={e => setBobot({ ...bobot, ratioHarian: { ...bobot.ratioHarian, [k]: parseInt(e.target.value) || 0 } })} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Rapor Ratio (SUMs : PAS)</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1"><span className="text-[9px] font-bold text-slate-400 uppercase block ml-1">Avg SUMs</span>
                                        <input type="number" className="ng-input w-full text-center font-bold" value={bobot.ratioRapor.sums} onChange={e => setBobot({ ...bobot, ratioRapor: { ...bobot.ratioRapor, sums: parseInt(e.target.value) || 0 } })} />
                                    </div>
                                    <div className="space-y-1"><span className="text-[9px] font-bold text-slate-400 uppercase block ml-1">PAS/PAT</span>
                                        <input type="number" className="ng-input w-full text-center font-bold" value={bobot.ratioRapor.pas} onChange={e => setBobot({ ...bobot, ratioRapor: { ...bobot.ratioRapor, pas: parseInt(e.target.value) || 0 } })} />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">SUM Topics / Descriptions</label>
                                    <button className="text-[10px] font-black text-blue-600 hover:text-blue-800 transition flex items-center gap-1" onClick={handleAddSum}>
                                        <i className="bi bi-plus-circle-fill"></i> ADD MODULE
                                    </button>
                                </div>
                                <div className="space-y-3 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                    {Array.from({ length: bobot.sumCount }).map((_, i) => {
                                        const sumId = `SUM ${i + 1}`;
                                        const num = i + 1;
                                        const existing = tagihanConfig.find(t => t.jenis === 'Sum' && t.materi_tp === sumId);
                                        return (
                                            <div key={sumId} className="flex items-center gap-3 group">
                                                <div className="w-12 text-[10px] font-black text-slate-300">{sumId}</div>
                                                <input
                                                    type="text"
                                                    className="ng-input flex-1 py-2 text-xs"
                                                    placeholder="Topic for this SUM..."
                                                    defaultValue={existing?.topik || ''}
                                                    onBlur={async (e) => {
                                                        const val = e.target.value;
                                                        await fetch('/api/nilai/tagihan', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                nip: user.nip, kelas, mapel, semester,
                                                                materi: sumId, jenis: 'Sum', nama: sumId, topik: val
                                                            })
                                                        });
                                                        // Soft refresh config only
                                                        const res = await fetch(`/api/nilai?nip=${user.nip}&kelas=${encodeURIComponent(kelas)}&mapel=${encodeURIComponent(mapel)}&semester=${semester}`);
                                                        const json = await res.json();
                                                        if (json.ok) setTagihanConfig(json.data.tagihan || []);
                                                    }}
                                                />
                                                <button onClick={() => handleDeleteSum(num)} className="text-slate-200 hover:text-red-500 transition px-1">
                                                    <i className="bi bi-trash3 text-xs"></i>
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            <button className="w-full btn-primary py-4 text-sm tracking-widest uppercase" onClick={async () => { await fetch('/api/nilai/bobot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nip: user.nip, kelas, mapel, semester, config: bobot }) }); setShowConfigModal(false); loadData(); }}>Apply Configuration</button>
                        </div>
                    </div>
                </div>
            )}

            {(activeMode === 'KUIS' || activeMode === 'TUGAS') && (
                <button className="fixed bottom-32 right-10 w-16 h-16 bg-blue-600 text-white rounded-2xl shadow-xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-[80]" onClick={() => setShowTagihanModal(true)}><i className="bi bi-plus-lg text-2xl"></i></button>
            )}

            {showTagihanModal && (
                <div key={editingTagihan?.id || 'new'} className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-glass animate-fade">
                    <div className="modal-content w-full max-w-sm overflow-hidden p-8">
                        <h3 className="text-lg font-extrabold tracking-tight mb-2">{editingTagihan ? 'Edit' : 'New'} {activeMode} Entry</h3>
                        <p className="text-xs text-slate-400 mb-6">{editingTagihan ? 'Modify' : 'Create a new'} assessment column for {materi}</p>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Column Label</label>
                                <input id="tag-name" type="text" className="ng-input w-full" placeholder="e.g. Kuis 1" defaultValue={editingTagihan ? editingTagihan.nama_tagihan : getNextAutoLabel()} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Topic/Materi</label>
                                <input id="tag-topik" type="text" className="ng-input w-full" placeholder="e.g. Aljabar" defaultValue={editingTagihan?.topik || ''} />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl text-xs" onClick={() => { setShowTagihanModal(false); setEditingTagihan(null); }}>CANCEL</button>
                                <button className="flex-1 btn-primary py-3 text-xs" onClick={async () => {
                                    const nama = (document.getElementById('tag-name') as HTMLInputElement).value;
                                    const topik = (document.getElementById('tag-topik') as HTMLInputElement).value;
                                    if (!nama) return;
                                    const jenisStr = activeMode.charAt(0) + activeMode.slice(1).toLowerCase();
                                    const payload = { nip: user.nip, kelas, mapel, semester, materi, jenis: jenisStr, nama, topik };

                                    await fetch('/api/nilai/tagihan', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify(payload)
                                    });

                                    setShowTagihanModal(false);
                                    setEditingTagihan(null);
                                    loadData();
                                }}>{editingTagihan ? 'SAVE CHANGES' : 'CREATE ENTRY'}</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {showImportModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-glass animate-fade">
                    <div className="modal-content w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
                            <div>
                                <h3 className="text-lg font-extrabold text-slate-800">Import Data Center</h3>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Module: {activeMode} Mode</p>
                            </div>
                            <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-900 transition"><i className="bi bi-x-lg text-xl"></i></button>
                        </div>

                        <div className="p-8 space-y-6">
                            {/* Step 1: Download Template */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">1</span>
                                    Get the latest template
                                </label>
                                <button
                                    className="w-full bg-white border-2 border-dashed border-slate-200 p-4 rounded-2xl flex items-center justify-center gap-3 hover:border-blue-400 hover:bg-blue-50/30 transition-all group"
                                    onClick={handleExport}
                                >
                                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition">
                                        <i className="bi bi-file-earmark-excel-fill text-xl"></i>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-slate-700">Download {activeMode} Template</div>
                                        <div className="text-[10px] text-slate-400 font-medium">Includes student names for {kelas} - {mapel}</div>
                                    </div>
                                </button>
                            </div>

                            <div className="h-px bg-slate-100 relative">
                                <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[10px] font-bold text-slate-300">THEN</span>
                            </div>

                            {/* Step 2: Upload File */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-5 h-5 bg-slate-100 rounded-full flex items-center justify-center text-slate-500">2</span>
                                    Upload completed file
                                </label>
                                <button
                                    className="w-full btn-primary py-4 flex items-center justify-center gap-2"
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <i className="bi bi-cloud-arrow-up text-lg"></i>
                                    SELECT EXCEL FILE
                                </button>
                                <p className="text-[10px] text-center text-slate-400 italic">Supported formats: .xlsx, .xls</p>
                            </div>
                        </div>

                        <div className="p-6 bg-slate-50 border-t flex items-start gap-3">
                            <i className="bi bi-info-circle text-blue-500 mt-0.5"></i>
                            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                <strong>Tip:</strong> Pastikan kolom <strong>NISN</strong> tidak diubah. Sistem akan menggunakan NISN sebagai kunci utama untuk memasukkan nilai ke baris yang tepat.
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

'use client';

import { useState, useEffect, useRef, useMemo, Fragment } from 'react';
import { supabase } from '@/lib/supabase';
import { ApiResponse, Siswa } from '@/lib/types';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import PermissionGuard from '@/components/PermissionGuard';
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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [mapel, setMapel] = useState('');
    const [semester, setSemester] = useState('Ganjil');
    const [tahunAjaran, setTahunAjaran] = useState('');
    const [tahunAjaranList, setTahunAjaranList] = useState<string[]>([]);
    const [materi, setMateri] = useState('SUM 1');
    const modes = ['KUIS', 'TUGAS', 'UH', 'PAS', 'REKAP'];
    const [modeIndex, setModeIndex] = useState(0);
    const activeMode = modes[modeIndex] as 'REKAP' | 'KUIS' | 'TUGAS' | 'UH' | 'PAS';

    useEffect(() => {
        setModeIndex(modes.indexOf(activeMode));
    }, []);
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
    const [applyToClasses, setApplyToClasses] = useState<string[]>([]);
    const tableRef = useRef<HTMLTableElement>(null);
    const [showSumDropdown, setShowSumDropdown] = useState(false);
    const [newSumTopic, setNewSumTopic] = useState('');
    const [forcedVisibleTags, setForcedVisibleTags] = useState<Set<string>>(new Set());

    const cleanTopic = (t?: string) => {
        if (!t || t === 'Auto-Imported') return '';
        return t;
    };

    // FIX: Updated getNextAutoLabel to see empty columns correctly
    const getNextAutoLabel = () => {
        const typePrefix = activeMode.toUpperCase();
        const typeProper = activeMode.charAt(0) + activeMode.slice(1).toLowerCase();

        // Only count tags that are actually visible (have topic or have scores)
        const relevantTags = tagihanConfig.filter(t =>
            t.jenis === typeProper &&
            t.materi_tp === materi &&
            (activeTags.has(`${typeProper}||${materi}||${t.nama_tagihan}`) || cleanTopic(t.topik))
        );

        let maxIndex = 0;
        relevantTags.forEach(t => {
            const parts = t.nama_tagihan.split('_');
            if (parts.length === 2 && parts[0] === typePrefix) {
                const idx = parseInt(parts[1]);
                if (!isNaN(idx) && idx > maxIndex) maxIndex = idx;
            }
        });

        return `${typePrefix}_${maxIndex + 1}`;
    };

    const filteredSiswa = useMemo(() => {
        if (!searchTerm) return siswa;
        const low = searchTerm.toLowerCase();
        return siswa.filter(s => {
            const name = (s.nama_siswa || (s as any).nama || "").toLowerCase();
            const nisn = (s.nisn || "").toLowerCase();
            return name.includes(low) || nisn.includes(low);
        });
    }, [siswa, searchTerm]);

    // Identifying Active Columns (Columns with at least one value across all students)
    const activeTags = useMemo(() => {
        const actives = new Set<string>();
        // Check local changes first
        Object.keys(changes).forEach(k => {
            if (changes[k] !== "") {
                const parts = k.split('||'); // [nisn, jenis, materi, tag]
                actives.add(`${parts[1]}||${parts[2]}||${parts[3]}`);
            }
        });
        // Check DB data
        nilaiData.forEach(d => {
            if (d.nilai !== null && d.nilai !== "") {
                const tag = d.tagihan || '';
                actives.add(`${d.jenis}||${d.materi_tp}||${tag}`);
            }
        });
        return actives;
    }, [nilaiData, changes]);

    useEffect(() => {
        const fetchInitial = async () => {
            setLoading(true);
            try {
                const { getAllAcademicYears, getActiveSettings } = await import('@/lib/settings-client');
                const [years, active] = await Promise.all([
                    getAllAcademicYears(),
                    getActiveSettings()
                ]);

                setTahunAjaranList(years);
                if (active) {
                    setTahunAjaran(active.tahun_ajaran);
                    // Standardize semester to Label
                    const semLabel = (active.semester === 1 || active.semester === '1') ? 'Ganjil' : (active.semester === 2 || active.semester === '2') ? 'Genap' : active.semester;
                    setSemester(semLabel);
                } else if (years.length > 0) {
                    setTahunAjaran(years[0]);
                }

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
        // Only load if essential filters are set
        if (user && kelas && mapel && tahunAjaran && semester) {
            loadData();
        }
    }, [user, kelas, mapel, semester, tahunAjaran]);

    const loadData = async () => {
        if (!user || !user.nip || !kelas || !mapel || !tahunAjaran || !semester) return;
        setLoading(true);
        try {
            // Updated API call structure
            const res = await fetch(`/api/nilai?nip=${user.nip}&kelas=${encodeURIComponent(kelas)}&mapel=${encodeURIComponent(mapel)}&semester=${semester}&tahun_ajaran=${encodeURIComponent(tahunAjaran)}`);
            const json = await res.json();
            if (json.ok && json.data) {
                setNilaiData(json.data.nilai || []);
                setSiswa(json.data.siswa || []);
                setTagihanConfig(json.data.tagihan || []);
                setBobot(json.data.bobot || DEFAULT_BOBOT);
                setChanges({});
            } else {
                console.error('Failed to load nilai:', json.error);
            }
        } catch (err: any) {
            console.error('Error loading data:', err);
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

        let sum = 0, count = 0;
        let hasActive = false;

        tags.forEach(t => {
            const tagKey = `${jenis}||${curMateri}||${t.nama_tagihan}`;
            const isActive = activeTags.has(tagKey);

            if (isActive) {
                hasActive = true;
                const valStr = getScore(nisn, jenis, curMateri, t.nama_tagihan).toString();
                const val = valStr === "" ? 0 : parseFloat(valStr);
                sum += val;
                count++;
            }
        });

        // If no active columns at all for this category, return null (ignored)
        if (!hasActive) return null;

        // If active columns exist, return average (empty treated as 0)
        return count > 0 ? (sum / count) : 0;
    };

    const calculateNABab = (nisn: string, curMateri: string) => {
        let totalWeighted = 0;
        let totalRatio = 0;

        // Weights (Check if ratioHarian exists, default to 1 if not to prevent errors)
        const { kuis: wK, tugas: wT, uh: wU } = bobot.ratioHarian || { kuis: 1, tugas: 1, uh: 1 };

        // 1. Rata-rata TUGAS
        if (tagihanConfig.some(t => t.jenis === 'Tugas' && t.materi_tp === curMateri)) {
            const val = getAvg(nisn, 'Tugas', curMateri);
            if (val !== null) {
                totalWeighted += (val * wT);
                totalRatio += wT;
            }
        }

        // 2. Rata-rata KUIS
        if (tagihanConfig.some(t => t.jenis === 'Kuis' && t.materi_tp === curMateri)) {
            const val = getAvg(nisn, 'Kuis', curMateri);
            if (val !== null) {
                totalWeighted += (val * wK);
                totalRatio += wK;
            }
        }

        // 3. Nilai UH
        // Check if UH is "Active" for this materi (anyone has a grade?)
        const uhKey = `UH||${curMateri}||`;
        const uhActive = activeTags.has(uhKey);

        if (uhActive) {
            const uhStr = getScore(nisn, 'UH', curMateri).toString();
            const uhVal = uhStr === "" ? 0 : parseFloat(uhStr);
            totalWeighted += (uhVal * wU);
            totalRatio += wU;
        }

        return totalRatio === 0 ? "-" : (totalWeighted / totalRatio);
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

        const avgS = sCount > 0 ? (sSum / sCount) : null;

        const pasStr = getScore(nisn, 'PAS', '-', '').toString();
        const vPas = pasStr !== "" ? parseFloat(pasStr) : null;

        const { sums: rS, pas: rP } = bobot.ratioRapor;

        let finalScore = 0;
        let finalDiv = 0;

        // Component 1: Average of Sums
        if (avgS !== null) {
            finalScore += (avgS * rS);
            finalDiv += rS;
        }

        // Component 2: PAS
        if (vPas !== null) {
            finalScore += (vPas * rP);
            finalDiv += rP;
        }

        if (finalDiv === 0) return "0";
        return ((finalScore / finalDiv)).toFixed(0);
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
            await fetch('/api/nilai/bobot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nip: user.nip, kelas, mapel, semester, config: newBobot, tahun_ajaran: tahunAjaran }) });
            setBobot(newBobot);
            loadData();
        }
    };

    const handleAddSum = async () => {
        const newCount = bobot.sumCount + 1;
        const newBobot = { ...bobot, sumCount: newCount };
        await fetch('/api/nilai/bobot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nip: user.nip, kelas, mapel, semester, config: newBobot, tahun_ajaran: tahunAjaran }) });
        setBobot(newBobot);
        loadData();
    };

    const handleAddNewSumWithTopic = async () => {
        if (!newSumTopic.trim()) {
            Swal.fire({ icon: 'warning', text: 'Mohon isi topik materi' });
            return;
        }
        setLoading(true);
        try {
            // 1. Update Bobot (Add SUM Count)
            const newCount = bobot.sumCount + 1;
            const newBobot = { ...bobot, sumCount: newCount };
            const newSumName = `SUM ${newCount}`;

            await fetch('/api/nilai/bobot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nip: user.nip, kelas, mapel, semester, config: newBobot, tahun_ajaran: tahunAjaran })
            });

            // 2. Create Tagihan for Topic
            await fetch('/api/nilai/tagihan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    nip: user.nip, kelas, mapel, semester, tahun_ajaran: tahunAjaran,
                    materi: newSumName,
                    jenis: 'Sum',
                    nama: newSumName,
                    topik: newSumTopic
                })
            });

            setNewSumTopic('');
            setShowSumDropdown(false);
            setMateri(newSumName); // Switch to new SUM

            // Reload to get everything synced
            await loadData();
            Swal.fire({ icon: 'success', title: 'Materi Berhasil Ditambahkan', timer: 1000, showConfirmButton: false });
        } catch (e: any) {
            Swal.fire({ icon: 'error', text: e.message });
        } finally {
            setLoading(false);
        }
    };

    const handleScoreChange = (nisn: string, jenis: string, mtr: string, tag: string, val: string) => {
        let raw = val.replace(',', '.');
        if (raw === "") {
            setChanges({ ...changes, [`${nisn}||${jenis}||${mtr}||${tag}`]: "" });
            return;
        }
        if (!/^\d+\.?\d{0,2}$/.test(raw)) return;
        const num = parseFloat(raw);
        if (!isNaN(num) && num > 100) return;
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
            const res = await fetch('/api/nilai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nip: user.nip, kelas, mapel, semester, updates, tahun_ajaran: tahunAjaran }) });
            if (res.ok) { Swal.fire({ icon: 'success', title: 'Perubahan Disimpan', timer: 1000, showConfirmButton: false }); loadData(); }
        } finally { setLoading(false); }
    };

    const sortTags = (tags: any[]) => {
        return tags.sort((a, b) => {
            const partA = a.nama_tagihan.split('_')[1] || '0';
            const partB = b.nama_tagihan.split('_')[1] || '0';
            return parseInt(partA) - parseInt(partB);
        });
    };

    const handleExport = async (isTemplate: boolean = false) => {
        const XLSXStyle = await import('xlsx-js-style');

        // Prepare Data Columns based on Mode
        const headers = ["NO", "NISN", "NAMA", "KELAS"];
        let dynamicCols: string[] = [];

        if (activeMode === 'REKAP') {
            const count = bobot.sumCount;
            for (let i = 1; i <= count; i++) dynamicCols.push(`SUM_${i}`);
            dynamicCols.push("PAS", "RAPOR");
        } else if (activeMode === 'UH') {
            dynamicCols.push(`UH_${materi.replace(/\s/g, '_').toUpperCase()}`);
        } else if (activeMode === 'PAS') {
            dynamicCols.push("PAS");
        } else {
            // KUIS / TUGAS
            const prefix = activeMode.toUpperCase();

            if (isTemplate) {
                // Ensure 10 slots for template
                for (let i = 1; i <= 10; i++) dynamicCols.push(`${prefix}_${i}`);
            } else {
                // Export existing tags sorted
                const relevantTags = tagihanConfig.filter(t =>
                    t.jenis === (activeMode.charAt(0) + activeMode.slice(1).toLowerCase()) &&
                    t.materi_tp === materi
                );

                if (relevantTags.length === 0) {
                    for (let i = 1; i <= 5; i++) dynamicCols.push(`${prefix}_${i}`);
                } else {
                    const sorted = sortTags(relevantTags);
                    sorted.forEach(t => dynamicCols.push(t.nama_tagihan.toUpperCase()));
                }
            }
        }

        const fullHeaders = [...headers, ...dynamicCols];

        // Build Data Rows
        const data = filteredSiswa.map((s, idx) => {
            const row: any = {
                "NO": idx + 1,
                "NISN": s.nisn,
                "NAMA": s.nama_siswa || (s as any).nama,
                "KELAS": s.kelas || kelas
            };

            dynamicCols.forEach(col => {
                let val: string | number = "";

                if (isTemplate) {
                    val = "";
                } else {
                    if (col.startsWith("SUM_")) {
                        const num = col.split('_')[1];
                        const nab = calculateNABab(s.nisn, `SUM ${num}`);
                        val = nab !== '-' ? Math.round(nab as number) : "";
                    } else if (col === "PAS") {
                        const v = getScore(s.nisn, 'PAS', '-');
                        val = (v !== null && v !== "") ? v : "";
                    } else if (col === "RAPOR") {
                        val = calculateRapor(s.nisn);
                    } else if (col.startsWith("UH_")) {
                        const v = getScore(s.nisn, 'UH', materi);
                        val = (v !== null && v !== "") ? v : "";
                    } else {
                        // KUIS_N / TUGAS_N
                        const parts = col.split('_');
                        const typeUpp = parts[0];
                        const typeProper = typeUpp.charAt(0) + typeUpp.slice(1).toLowerCase(); // Kuis

                        const v = getScore(s.nisn, typeProper, materi, col);
                        val = (v !== null && v !== "") ? v : "";
                    }
                }
                row[col] = val;
            });
            return row;
        });

        // Add Topics Row as the first data row if KUIS/TUGAS
        // Add Topics Rows if KUIS/TUGAS (Vertical Format at bottom - 2 Columns)
        const finalData = [...data];
        if (activeMode === 'KUIS' || activeMode === 'TUGAS') {
            // Add space and a clear section header aligned with NISN & NAMA
            finalData.push({ "NO": "", "NISN": "", "NAMA": "", "KELAS": "" });
            finalData.push({ "NO": "", "NISN": "", "NAMA": "", "KELAS": "" });
            finalData.push({
                "NO": "",
                "NISN": activeMode.toUpperCase(),
                "NAMA": "TOPIK/MATERI",
                "KELAS": ""
            });

            // Add one row per dynamic column
            dynamicCols.forEach(col => {
                const tag = tagihanConfig.find(t => t.nama_tagihan === col && t.materi_tp === materi);
                finalData.push({
                    "NO": "",
                    "NISN": col,
                    "NAMA": isTemplate ? "" : (cleanTopic(tag?.topik) || ""),
                    "KELAS": ""
                });
            });
        }

        // Create Sheet
        const ws = XLSXStyle.utils.json_to_sheet(finalData, { header: fullHeaders });
        const newRange = XLSXStyle.utils.decode_range(ws['!ref']!);

        // Headers Styling (Row 0)
        for (let C = newRange.s.c; C <= newRange.e.c; ++C) {
            const addr = XLSXStyle.utils.encode_cell({ r: 0, c: C });
            if (!ws[addr]) continue;
            ws[addr].s = {
                fill: { fgColor: { rgb: "1E293B" } },
                font: { color: { rgb: "FFFFFF" }, bold: true },
                alignment: { horizontal: "center", vertical: "center" },
                border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
            };
        }

        // Topics Styling (Vertical rows at bottom)
        if (activeMode === 'KUIS' || activeMode === 'TUGAS') {
            const topicCount = dynamicCols.length;
            const headerR = newRange.e.r - topicCount;
            const startR = headerR + 1;

            // Style Section Header (Only Column 1 & 2: NISN & NAMA)
            for (let C = 1; C <= 2; C++) {
                const addr = XLSXStyle.utils.encode_cell({ r: headerR, c: C });
                if (!ws[addr]) continue;
                ws[addr].s = {
                    fill: { fgColor: { rgb: "CBD5E1" } },
                    font: { bold: true, color: { rgb: "1E293B" }, size: 10 },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
                };
            }

            for (let R = startR; R <= newRange.e.r; R++) {
                for (let C = 1; C <= 2; C++) { // Only Column 1 & 2: NISN & NAMA
                    const addr = XLSXStyle.utils.encode_cell({ r: R, c: C });
                    if (!ws[addr]) continue;
                    ws[addr].s = {
                        fill: { fgColor: { rgb: "F8FAFC" } },
                        font: { italic: C === 2, bold: C === 1, color: { rgb: "475569" }, size: 9 },
                        alignment: { horizontal: C === 2 ? "left" : "center", vertical: "center", wrapText: true },
                        border: { top: { style: "thin" }, bottom: { style: "thin" }, left: { style: "thin" }, right: { style: "thin" } }
                    };
                }
            }
        }

        // Data Styling (All rows except header and topic rows)
        const topicRowsCount = (activeMode === 'KUIS' || activeMode === 'TUGAS') ? dynamicCols.length + 3 : 0;
        const dataEndRow = newRange.e.r - topicRowsCount;

        for (let R = 1; R <= dataEndRow; ++R) {
            for (let C = newRange.s.c; C <= newRange.e.c; ++C) {
                const addr = XLSXStyle.utils.encode_cell({ r: R, c: C });
                if (!ws[addr]) ws[addr] = { t: 's', v: '' };

                if (!ws[addr].s) ws[addr].s = {};
                ws[addr].s.border = {
                    top: { style: "thin", color: { rgb: "E2E8F0" } },
                    bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                    left: { style: "thin", color: { rgb: "E2E8F0" } },
                    right: { style: "thin", color: { rgb: "E2E8F0" } }
                };

                if (C <= 3) {
                    ws[addr].s.alignment = { horizontal: "left" };
                    if (C === 0 || C === 1 || C === 3) ws[addr].s.alignment = { horizontal: "center" };
                } else {
                    ws[addr].s.alignment = { horizontal: "center" };
                }
            }
        }

        // Col Widths
        ws['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 35 }, { wch: 10 }];
        for (let i = 4; i <= newRange.e.c; i++) ws['!cols'].push({ wch: 15 });

        const wb = XLSXStyle.utils.book_new();
        XLSXStyle.utils.book_append_sheet(wb, ws, "NILAI");

        const prefix = isTemplate ? "TEMPLATE" : "EXPORT";
        const fname = `${prefix}_${activeMode}_${materi}_${kelas}.xlsx`.replace(/\s+/g, '_');
        XLSXStyle.writeFile(wb, fname);
    };


    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                // 1. Read File
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

                if (data.length < 2) throw new Error("File Excel kosong atau format salah.");

                Swal.fire({ title: 'Validasi Data...', text: 'Memeriksa format dan data...', didOpen: () => Swal.showLoading() });

                // 2. Validate Headers (Strict Mode)
                const rawHeaders = (data[0] as any[]).map(h => String(h || '').trim());
                const required = ["NO", "NISN", "NAMA", "KELAS"];

                // Check first 4 columns strictly
                for (let i = 0; i < required.length; i++) {
                    if (rawHeaders[i] !== required[i]) {
                        throw new Error(`Struktur Header Tidak Sesuai! Kolom ke-${i + 1} harusnya '${required[i]}', terbaca '${rawHeaders[i] || 'KOSONG'}'.`);
                    }
                }
                const headers = rawHeaders; // Use raw headers for matching moving forward

                // 3. Identify Value Columns (Strict Pattern Check)
                const valueCols: { index: number, name: string }[] = [];
                headers.forEach((h, idx) => {
                    if (required.includes(h)) return;
                    if (!h) return; // Ignore completely empty trailing columns

                    let isValid = false;
                    if (activeMode === 'KUIS' || activeMode === 'TUGAS') {
                        const pattern = new RegExp(`^${activeMode}_\\d+$`);
                        if (pattern.test(h)) {
                            valueCols.push({ index: idx, name: h });
                            isValid = true;
                        } else {
                            throw new Error(`Penamaan Kolom Salah! Kolom '${h}' tidak sesuai format. Seharusnya '${activeMode}_[ANGKA]' (Contoh: ${activeMode}_1).`);
                        }
                    } else if (activeMode === 'REKAP') {
                        if (h === 'PAS' || h.match(new RegExp('^SUM_\\d+$'))) {
                            valueCols.push({ index: idx, name: h });
                            isValid = true;
                        }
                    } else if (activeMode === 'UH') {
                        if (h.startsWith('UH_')) {
                            valueCols.push({ index: idx, name: h });
                            isValid = true;
                        }
                    } else if (activeMode === 'PAS') {
                        if (h === 'PAS') {
                            valueCols.push({ index: idx, name: h });
                            isValid = true;
                        }
                    }
                });

                if (valueCols.length === 0) {
                    throw new Error(`Tidak ada kolom nilai yang valid untuk mode ${activeMode}. Pastikan gunakan format ${activeMode}_1, dst.`);
                }

                // 3b. Detect TOPIK rows (Search vertically at the end)
                const topics: Record<string, string> = {};
                const topicRowIndices: number[] = [];
                let isTopicSection = false;

                for (let i = 1; i < data.length; i++) {
                    const row = data[i] as any[] || [];
                    const colB = String(row[1] || '').trim().toUpperCase();
                    const colC = String(row[2] || '').trim();

                    // Detect Section Header: [ActiveMode] | TOPIK/MATERI
                    if (colB === activeMode.toUpperCase() && colC.toUpperCase() === 'TOPIK/MATERI') {
                        isTopicSection = true;
                        topicRowIndices.push(i);
                        continue;
                    }

                    if (isTopicSection && colB.startsWith(activeMode.toUpperCase() + '_')) {
                        topicRowIndices.push(i);
                        topics[colB] = colC;
                    }
                }

                // 3c. Filter valueCols: Only keep columns that have a topic OR at least one student score
                const validValueCols = valueCols.filter(col => {
                    const hasTopic = topics[col.name] !== undefined && topics[col.name] !== "";
                    if (hasTopic) return true;

                    // Check if at least one row has a score for this column
                    const hasAnyScore = data.some((row, idx) => {
                        if (idx === 0 || topicRowIndices.includes(idx)) return false;
                        const val = (row as any[])[col.index];
                        return val !== undefined && val !== null && val !== "";
                    });

                    return hasAnyScore;
                });

                if (validValueCols.length === 0) {
                    throw new Error(`Tidak ada kolom nilai yang valid untuk mode ${activeMode}. Pastikan minimal ada topik terisi atau ada nilai yang diinput.`);
                }

                // 4. Process Rows
                const errors: string[] = [];
                let successCount = 0;
                const updates: any[] = [];
                const newTagihans: any[] = [];
                const topicsToUpdate: any[] = [];
                const siswaMap = new Map(siswa.map(s => [s.nisn, s]));

                for (let i = 1; i < data.length; i++) {
                    if (topicRowIndices.includes(i)) continue; // Skip topic rows
                    const row = data[i] as any[];
                    if (!row || (!row[0] && !row[1])) continue; // Skip empty rows (separator)

                    const rowObj: any = {};
                    headers.forEach((h, idx) => { rowObj[h] = row[idx]; });

                    const nisn = String(rowObj["NISN"] || "").trim();
                    const cls = String(rowObj["KELAS"] || "").trim();
                    const nameRaw = String(rowObj["NAMA"] || "").trim();

                    if (!nisn) continue;

                    // Validation
                    const student = siswaMap.get(nisn);
                    if (!student) {
                        errors.push(`Baris ${i + 1}: NISN ${nisn} tidak terdaftar di kelas ini.`);
                        continue;
                    }

                    // Strict Name Match
                    const dbName = (student.nama_siswa || (student as any).nama || "").trim().toUpperCase();
                    if (nameRaw.toUpperCase() !== dbName) {
                        errors.push(`Baris ${i + 1}: Nama tidak sesuai untuk NISN ${nisn}. (Terbaca: ${nameRaw}, Seharusnya: ${dbName})`);
                        continue;
                    }

                    if (cls.toUpperCase() !== kelas.toUpperCase()) {
                        errors.push(`Baris ${i + 1}: Siswa ${nisn} salah kelas (Terbaca: ${cls}, Seharusnya: ${kelas}).`);
                        continue;
                    }

                    // Values
                    validValueCols.forEach(col => {
                        const valRaw = row[col.index];
                        const hasScore = valRaw !== undefined && valRaw !== null && valRaw !== "";
                        let topic = topics[col.name] || "";

                        // If there is a score but no topic, default topic to '-'
                        if (hasScore && !topic) {
                            topic = "-";
                            topics[col.name] = "-"; // Update local map so secondary checks find it
                        }

                        // Only process if there's either a score or a topic
                        if (!hasScore && !topic) return;

                        if (hasScore) {
                            let val = parseFloat(String(valRaw).replace(',', '.'));
                            if (isNaN(val) || val < 0 || val > 100) {
                                errors.push(`Baris ${i + 1}: Nilai kolom ${col.name} tidak valid (${valRaw}).`);
                                return;
                            }

                            // Determine Update Key
                            let updateKey = "";
                            if (col.name.startsWith("SUM_")) {
                                // Skip SUM import
                            } else if (col.name === "PAS") {
                                updateKey = `${nisn}||PAS||-||`;
                            } else if (col.name.startsWith("UH_")) {
                                updateKey = `${nisn}||UH||${materi}||`;
                            } else if (activeMode === 'KUIS' || activeMode === 'TUGAS') {
                                const typeStr = activeMode.charAt(0) + activeMode.slice(1).toLowerCase();
                                updateKey = `${nisn}||${typeStr}||${materi}||${col.name}`;
                            }
                            if (updateKey) updates.push({ key: updateKey, val });
                        }

                        // Handle Tagihan/Topic Updates (One-time check per column across rows)
                        if (activeMode === 'KUIS' || activeMode === 'TUGAS') {
                            const typeStr = activeMode.charAt(0) + activeMode.slice(1).toLowerCase();
                            const currentTag = tagihanConfig.find(t => t.nama_tagihan === col.name && t.materi_tp === materi);

                            if (currentTag) {
                                if (cleanTopic(currentTag.topik) !== topic && !topicsToUpdate.some(tu => tu.id === currentTag.id)) {
                                    topicsToUpdate.push({ ...currentTag, topik: topic });
                                }
                            } else if (!newTagihans.some(t => t.nama === col.name)) {
                                newTagihans.push({ nama: col.name, jenis: typeStr, materi: materi, topik: topic });
                            }
                        }
                    });

                    if (errors.length === 0) successCount++;
                }

                if (errors.length > 0) {
                    const listErr = errors.slice(0, 20).map(e => `<li>${e}</li>`).join('');
                    const more = errors.length > 20 ? `<li class="italic text-slate-500">... dan ${errors.length - 20} error lainnya.</li>` : '';

                    const errorHtml = `<div class="text-left text-xs text-red-600 max-h-[300px] overflow-y-auto bg-red-50 p-2 border rounded"><ul class="list-disc pl-4">${listErr}${more}</ul></div>`;

                    Swal.fire({
                        title: 'Validasi Gagal',
                        html: `<p class="mb-2">Ditemukan ${errors.length} error. Import dibatalkan.</p>${errorHtml}`,
                        icon: 'error',
                        width: '600px',
                        showConfirmButton: true,
                        confirmButtonText: 'Tutup',
                        confirmButtonColor: '#1E293B',
                        showCloseButton: true,
                        allowOutsideClick: true
                    });
                    return;
                }

                // Apply
                if (newTagihans.length > 0 || topicsToUpdate.length > 0) {
                    for (const t of newTagihans) {
                        await fetch('/api/nilai/tagihan', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ nip: user.nip, kelas, mapel, semester, materi: t.materi, jenis: t.jenis, nama: t.nama, topik: t.topik, tahun_ajaran: tahunAjaran })
                        });
                    }
                    for (const t of topicsToUpdate) {
                        await fetch('/api/nilai/tagihan', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ nip: user.nip, kelas, mapel, semester, ...t, nama: t.nama_tagihan, materi: t.materi_tp, tahun_ajaran: tahunAjaran })
                        });
                    }
                    const res = await fetch(`/api/nilai?nip=${user.nip}&kelas=${encodeURIComponent(kelas)}&mapel=${encodeURIComponent(mapel)}&semester=${semester}&tahun_ajaran=${encodeURIComponent(tahunAjaran)}`);
                    const json = await res.json();
                    if (json.ok) setTagihanConfig(json.data.tagihan);
                }

                const newChanges = { ...changes };
                updates.forEach(u => newChanges[u.key] = u.val);
                setChanges(newChanges);

                Swal.fire({ icon: 'success', title: 'Import Berhasil', text: `${successCount} data berhasil dimuat.`, timer: 2000 });
                setShowImportModal(false);

            } catch (err: any) {
                Swal.fire({
                    title: 'Error',
                    text: err.message,
                    icon: 'error',
                    confirmButtonText: 'Tutup',
                    confirmButtonColor: '#1E293B',
                    showConfirmButton: true,
                    showCloseButton: true,
                    allowOutsideClick: true
                });
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const handleKeyDown = (e: React.KeyboardEvent, rIdx: number, cIdx: number) => {
        const inputs = Array.from(tableRef.current?.querySelectorAll('input.nl__scoreInput') || []) as HTMLInputElement[];
        if (inputs.length === 0) return;
        const currentInput = e.currentTarget as HTMLInputElement;
        const flatIdx = inputs.indexOf(currentInput);
        if (flatIdx === -1) return;
        const row = currentInput.closest('tr');
        const cols = row ? row.querySelectorAll('input.nl__scoreInput').length : 1;
        let targetIdx = -1;
        if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); targetIdx = flatIdx + cols; }
        else if (e.key === 'ArrowUp') { e.preventDefault(); targetIdx = flatIdx - cols; }
        else if (e.key === 'ArrowRight') { if (currentInput.selectionEnd === currentInput.value.length) targetIdx = flatIdx + 1; }
        else if (e.key === 'ArrowLeft') { if (currentInput.selectionStart === 0) targetIdx = flatIdx - 1; }
        if (targetIdx >= 0 && targetIdx < inputs.length) { inputs[targetIdx].focus(); inputs[targetIdx].select(); }
    };

    return (
        <PermissionGuard requiredPermission={{ resource: 'nilai', action: 'view' }}>
            <div className="nl">
                {/* Page Header */}
                <header className="nl__pageHeader">
                    <div className="nl__titleArea relative z-10">
                        <h1 className="nl__pageTitle">Rekap & Pengolahan Nilai</h1>
                        <p>Mengatur proses rekapitulasi nilai dari berbagai komponen penilaian.</p>
                    </div>
                </header>


                {/* Toolbar */}
                <div className="nl__toolbar">
                    {/* Desktop Layout - 2 Rows */}
                    <div className="nl__toolbarRow">
                        <div className="nl__searchGroup">
                            <i className="bi bi-search"></i>
                            <input className="nl__searchInput" placeholder="Cari..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                        </div>
                        <div className="nl__filters flex gap-3">
                            <select className="nl__select" value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)}>
                                {tahunAjaranList.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                            <select className="nl__select" value={semester} onChange={e => setSemester(e.target.value)}>
                                <option value="Ganjil">Ganjil</option>
                                <option value="Genap">Genap</option>
                            </select>
                            <select className="nl__select" value={kelas} onChange={e => { const k = e.target.value; setKelas(k); if (mapelByKelas[k]?.length > 0) setMapel(mapelByKelas[k][0]); }}>
                                {kelasList.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                            <select className="nl__select" value={mapel} onChange={e => setMapel(e.target.value)}>
                                {(mapelByKelas[kelas] || []).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="nl__toolbarRow justify-between">
                        <div className="flex items-center gap-3">
                            {/* SUM Selection Dropdown */}
                            {activeMode !== 'REKAP' && activeMode !== 'PAS' && (
                                <div className="relative shrink-0">
                                    <button
                                        className="nl__select min-w-[200px] flex items-center justify-between gap-2 bg-white hover:bg-slate-50 border border-slate-200"
                                        onClick={() => setShowSumDropdown(!showSumDropdown)}
                                    >
                                        <span className="font-bold text-sm text-slate-700">{materi}</span>
                                        <i className={`bi bi-chevron-${showSumDropdown ? 'up' : 'down'} text-xs text-slate-400`}></i>
                                    </button>

                                    {/* Dropdown Content */}
                                    {showSumDropdown && (
                                        <>
                                            <div className="fixed inset-0 z-40" onClick={() => setShowSumDropdown(false)}></div>
                                            <div className="absolute top-full left-0 mt-2 w-[280px] bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animate-fade-in-up">
                                                <div className="max-h-[250px] overflow-y-auto py-2">
                                                    {Array.from({ length: bobot.sumCount }, (_, i) => {
                                                        const sumName = `SUM ${i + 1}`;
                                                        return (
                                                            <button
                                                                key={sumName}
                                                                className={`w-full px-4 py-3 text-left hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0 ${materi === sumName ? 'bg-blue-50/50' : ''}`}
                                                                onClick={() => { setMateri(sumName); setShowSumDropdown(false); }}
                                                            >
                                                                <span className={`font-bold text-sm ${materi === sumName ? 'text-blue-600' : 'text-slate-700'}`}>{sumName}</span>
                                                                {materi === sumName && <i className="bi bi-check-lg text-blue-600"></i>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                            <div className="nl__modeSwitcher flex bg-slate-100 p-1 rounded-lg">
                                {modes.map((m, idx) => (
                                    <button key={m} className={`nl__modeBtn ${activeMode === m ? 'active' : ''}`} onClick={() => setModeIndex(idx)}>{m}</button>
                                ))}
                            </div>
                        </div>

                        <div className="nl__actions shrink-0">
                            <button className="nl__btn nl__btnSecondary" onClick={() => handleExport(false)}><i className="bi bi-file-earmark-excel"></i> Export Data</button>
                            {activeMode !== 'REKAP' && (
                                <button className="nl__btn nl__btnPrimary" onClick={() => setShowImportModal(true)}><i className="bi bi-upload"></i> Import</button>
                            )}
                            <input ref={fileInputRef} type="file" hidden accept=".xlsx,.xls" onChange={handleImport} />
                        </div>
                    </div>


                </div>



                {/* Main Table */}
                <div className="nl__tableWrap">
                    <table className="nl__table" ref={tableRef}>
                        <thead>
                            <tr>
                                <th className="w-16">No</th>
                                <th className="w-32">NISN</th>
                                <th className="text-left">Nama Siswa</th>
                                {activeMode === 'REKAP' ? (
                                    <>
                                        {Array.from({ length: bobot.sumCount }, (_, i) => {
                                            const sumName = `SUM ${i + 1}`;
                                            const cfg = tagihanConfig.find(t => t.jenis === 'Sum' && t.materi_tp === sumName);
                                            return (
                                                <th key={i} className="min-w-[100px]">
                                                    <div className="flex flex-col gap-1">
                                                        <span>{sumName}</span>
                                                    </div>
                                                    <div className="nl__thActions">
                                                        <button onClick={() => { setEditingTagihan(cfg || { jenis: 'Sum', materi_tp: sumName, nama_tagihan: sumName }); setShowTagihanModal(true); }}><i className="bi bi-pencil"></i></button>
                                                        <button className="text-red-400" onClick={() => handleDeleteSum(i + 1)}><i className="bi bi-trash3"></i></button>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                        <th className="w-24">PAS</th>
                                        <th className="w-28 text-blue-600">Rapor</th>
                                    </>
                                ) : activeMode === 'UH' ? (<th className="w-32">UH {materi}</th>)
                                    : activeMode === 'PAS' ? (<th className="w-32">PAS</th>)
                                        : tagihanConfig
                                            .filter(t => (t.jenis === (activeMode.charAt(0) + activeMode.slice(1).toLowerCase()) && t.materi_tp === materi))
                                            .filter(t => activeTags.has(`${(activeMode.charAt(0) + activeMode.slice(1).toLowerCase())}||${materi}||${t.nama_tagihan}`) || forcedVisibleTags.has(`${(activeMode.charAt(0) + activeMode.slice(1).toLowerCase())}||${materi}||${t.nama_tagihan}`) || cleanTopic(t.topik))
                                            .sort((a, b) => (parseInt(a.nama_tagihan.split('_')[1] || '0') - parseInt(b.nama_tagihan.split('_')[1] || '0')))
                                            .map(t => (
                                                <th key={t.id} className="min-w-[120px]">
                                                    <div className="flex flex-col gap-1">
                                                        <span>{t.nama_tagihan}</span>
                                                    </div>
                                                    <div className="nl__thActions">
                                                        <button onClick={() => { setEditingTagihan(t); setShowTagihanModal(true); }}><i className="bi bi-pencil"></i></button>
                                                        <button className="text-red-400" onClick={() => handleDeleteTagihan(t.id!, t.nama_tagihan)}><i className="bi bi-trash3"></i></button>
                                                    </div>
                                                </th>
                                            ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSiswa.map((s, idx) => (
                                <tr key={s.nisn}>
                                    <td className="text-center nl__index">{idx + 1}</td>
                                    <td className="text-center"><span className="nl__idBadge">{s.nisn}</span></td>
                                    <td className="nl__studentName">{s.nama_siswa || (s as any).nama}</td>
                                    {activeMode === 'REKAP' ? (
                                        <>
                                            {Array.from({ length: bobot.sumCount }, (_, i) => <td key={i} className="text-center"><span className="nl__scoreBadge">{calculateNABab(s.nisn, `SUM ${i + 1}`) !== '-' ? Math.round(calculateNABab(s.nisn, `SUM ${i + 1}`) as number) : '-'}</span></td>)}
                                            <td className="text-center"><span className="nl__scoreBadge">{getScore(s.nisn, 'PAS', '-')}</span></td>
                                            <td className="text-center font-bold text-blue-600 bg-blue-50/10"><span className="nl__scoreFinal">{calculateRapor(s.nisn)}</span></td>
                                        </>
                                    ) : (
                                        (activeMode === 'UH' || activeMode === 'PAS' ? [activeMode] :
                                            tagihanConfig
                                                .filter(t => t.jenis === (activeMode.charAt(0) + activeMode.slice(1).toLowerCase()) && t.materi_tp === materi)
                                                .filter(t => activeTags.has(`${t.jenis}||${materi}||${t.nama_tagihan}`) || forcedVisibleTags.has(`${t.jenis}||${materi}||${t.nama_tagihan}`) || cleanTopic(t.topik)) // SYNC FILTER
                                                .sort((a, b) => (parseInt(a.nama_tagihan.split('_')[1] || '0') - parseInt(b.nama_tagihan.split('_')[1] || '0')))
                                        ).map((it, cIdx) => (
                                            <td key={typeof it === 'string' ? it : it.id}>
                                                <input
                                                    className={`nl__scoreInput ${isDiffFromDB(s.nisn, activeMode === 'UH' ? 'UH' : activeMode === 'PAS' ? 'PAS' : (it as any).jenis, activeMode === 'PAS' ? '-' : materi, typeof it === 'string' ? '' : (it as any).nama_tagihan) ? 'is-changed' : ''}`}
                                                    value={getScore(s.nisn, activeMode === 'UH' ? 'UH' : activeMode === 'PAS' ? 'PAS' : (it as any).jenis, activeMode === 'PAS' ? '-' : materi, typeof it === 'string' ? '' : (it as any).nama_tagihan)}
                                                    onChange={e => handleScoreChange(s.nisn, activeMode === 'UH' ? 'UH' : activeMode === 'PAS' ? 'PAS' : (it as any).jenis, activeMode === 'PAS' ? '-' : materi, typeof it === 'string' ? '' : (it as any).nama_tagihan, e.target.value)}
                                                    onKeyDown={e => handleKeyDown(e, idx, cIdx)}
                                                />
                                            </td>
                                        ))
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {activeMode === 'REKAP' && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded text-sm text-blue-700 flex items-center gap-3">
                            <i className="bi bi-info-circle-fill text-lg"></i>
                            <div>
                                <span className="font-bold block">Rumus Perhitungan Rapor:</span>
                                <span>Nilai Rapor = (Rata-rata Nilai SUM &times; {bobot.ratioRapor.sums}%) + (Nilai PAS &times; {bobot.ratioRapor.pas}%)</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Topic Description Section - Aligned with nl__tableWrap */}
                {/* Topic Description Section - Elegant Redesign */}
                {(activeMode === 'KUIS' || activeMode === 'TUGAS') && (
                    <div className="nl__topicsContainer animate-fade">
                        <div className="nl__topicsHeader">
                            <i className="bi bi-info-circle-fill text-blue-500"></i>
                            <span className="nl__topicsTitle">Keterangan Materi</span>
                        </div>

                        <div className="nl__topicsGrid">
                            {tagihanConfig
                                .filter(t => t.jenis === (activeMode.charAt(0) + activeMode.slice(1).toLowerCase()) && t.materi_tp === materi)
                                .filter(t => cleanTopic(t.topik))
                                .sort((a, b) => {
                                    const numA = parseInt(a.nama_tagihan.split('_')[1]) || 0;
                                    const numB = parseInt(b.nama_tagihan.split('_')[1]) || 0;
                                    return numA - numB;
                                })
                                .map(t => (
                                    <div key={t.id || t.nama_tagihan} className="nl__topicItem" title={cleanTopic(t.topik)}>
                                        <div className="nl__topicLabel">
                                            {t.nama_tagihan.replace(/_/g, ' ')}
                                        </div>
                                        <div className="nl__topicText">
                                            {cleanTopic(t.topik)}
                                        </div>
                                    </div>
                                ))
                            }
                            {/* Empty State */}
                            {tagihanConfig
                                .filter(t => t.jenis === (activeMode.charAt(0) + activeMode.slice(1).toLowerCase()) && t.materi_tp === materi)
                                .filter(t => cleanTopic(t.topik)).length === 0 && (
                                    <div className="text-slate-400 italic text-sm text-center py-6 w-full flex items-center justify-center gap-2">
                                        <i className="bi bi-inbox text-lg"></i>
                                        Belum ada keterangan materi yang terisi.
                                    </div>
                                )}
                        </div>
                    </div>
                )}

                {/* Mobile Cards */}
                <div className="nl__mobileCards">
                    {filteredSiswa.map((s, idx) => (
                        <div key={s.nisn} className="nl__card">
                            <div className="nl__cardHeader">
                                <div className="nl__cardName">{s.nama_siswa || (s as any).nama}</div>
                                <div className="nl__cardId">{s.nisn}</div>
                            </div>
                            <div className="nl__cardScores">
                                {activeMode === 'REKAP' ? (
                                    <>
                                        {Array.from({ length: bobot.sumCount }, (_, i) => {
                                            const sumName = `SUM ${i + 1}`;
                                            const val = calculateNABab(s.nisn, sumName);
                                            if (val !== '-' && val !== 0) {
                                                return (
                                                    <div key={i} className="nl__scoreRow">
                                                        <span className="nl__scoreLabel">{sumName}</span>
                                                        <span className="nl__scoreValue">{Math.round(val as number)}</span>
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })}
                                        {getScore(s.nisn, 'PAS', '-') && getScore(s.nisn, 'PAS', '-') !== "" && (
                                            <div className="nl__scoreRow">
                                                <span className="nl__scoreLabel">PAS</span>
                                                <input
                                                    className="nl__mobileScoreInput"
                                                    value={getScore(s.nisn, 'PAS', '-')}
                                                    onChange={e => handleScoreChange(s.nisn, 'PAS', '-', '', e.target.value)}
                                                />
                                            </div>
                                        )}
                                        <div className="nl__cardFinal">{calculateRapor(s.nisn)}</div>
                                    </>
                                ) : activeMode === 'UH' ? (
                                    getScore(s.nisn, 'UH', materi) && getScore(s.nisn, 'UH', materi) !== "" && (
                                        <div className="nl__scoreRow">
                                            <span className="nl__scoreLabel">UH {materi}</span>
                                            <input
                                                className="nl__mobileScoreInput"
                                                value={getScore(s.nisn, 'UH', materi)}
                                                onChange={e => handleScoreChange(s.nisn, 'UH', materi, '', e.target.value)}
                                            />
                                        </div>
                                    )
                                ) : activeMode === 'PAS' ? (
                                    getScore(s.nisn, 'PAS', '-') && getScore(s.nisn, 'PAS', '-') !== "" && (
                                        <div className="nl__scoreRow">
                                            <span className="nl__scoreLabel">PAS</span>
                                            <input
                                                className="nl__mobileScoreInput"
                                                value={getScore(s.nisn, 'PAS', '-')}
                                                onChange={e => handleScoreChange(s.nisn, 'PAS', '-', '', e.target.value)}
                                            />
                                        </div>
                                    )
                                ) : (
                                    tagihanConfig
                                        .filter(t => t.jenis === (activeMode.charAt(0) + activeMode.slice(1).toLowerCase()) && t.materi_tp === materi)
                                        .sort((a, b) => {
                                            const re = new RegExp('[ _](\\d+)$');
                                            const nA = parseInt(a.nama_tagihan.match(re)?.[1] || '0');
                                            const nB = parseInt(b.nama_tagihan.match(re)?.[1] || '0');
                                            return nA - nB;
                                        })
                                        .map(t => {
                                            const score = getScore(s.nisn, t.jenis, materi, t.nama_tagihan);
                                            if (score && score !== "") {
                                                return (
                                                    <div key={t.id} className="nl__scoreRow">
                                                        <span className="nl__scoreLabel">{t.nama_tagihan}</span>
                                                        <input
                                                            className="nl__mobileScoreInput"
                                                            value={score}
                                                            onChange={e => handleScoreChange(s.nisn, t.jenis, materi, t.nama_tagihan, e.target.value)}
                                                        />
                                                    </div>
                                                );
                                            }
                                            return null;
                                        })
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>



            {/* Floating Action Toolbox */}
            <div className="nl__toolbox">
                {Object.keys(changes).length > 0 && (<button className="nl__fab nl__fab--primary bg-slate-900" onClick={handleSave} title="Simpan Perubahan"><i className="bi bi-cloud-arrow-up"></i></button>)}
                {(activeMode === 'KUIS' || activeMode === 'TUGAS') && (
                    <button className="nl__fab nl__fab--primary" onClick={() => {
                        const jenisStr = activeMode.charAt(0) + activeMode.slice(1).toLowerCase();
                        setEditingTagihan({ jenis: jenisStr, materi_tp: materi, nama_tagihan: getNextAutoLabel(), topik: '' });
                        setShowTagihanModal(true);
                    }} title="Tambah Kolom Nilai"><i className="bi bi-plus-lg"></i></button>
                )}
                <button className="nl__fab nl__fab--secondary" onClick={() => setShowConfigModal(true)} title="Konfigurasi Bobot"><i className="bi bi-sliders2"></i></button>
            </div>


            {/* Import Modal */}
            {
                showImportModal && (
                    <div className="nl__modalOverlay animate-fade">
                        <div className="nl__modalContent" style={{ maxWidth: '450px' }}>
                            <div className="nl__modalHeader">
                                <h3 className="nl__modalTitle">Import Data Nilai</h3>
                                <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>
                            <div className="nl__modalBody text-center">
                                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto text-2xl mb-4">
                                    <i className="bi bi-file-earmark-spreadsheet"></i>
                                </div>
                                <p className="text-sm text-slate-500 mb-8">
                                    Unduh template terlebih dahulu, isi nilai secara offline, lalu upload kembali file Excel tersebut.
                                </p>
                                <div className="space-y-3">
                                    <button className="w-full py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2" onClick={() => handleExport(true)}>
                                        <i className="bi bi-download"></i> Download Template
                                    </button>
                                    <button className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20" onClick={() => fileInputRef.current?.click()}>
                                        <i className="bi bi-upload"></i> Upload Excel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Tagihan Modal */}
            {
                showTagihanModal && (
                    <div className="nl__modalOverlay animate-fade">
                        <div className="nl__modalContent">
                            <div className="nl__modalHeader">
                                <h3 className="nl__modalTitle">{editingTagihan?.id ? 'Edit' : 'Tambah'} {editingTagihan?.jenis}</h3>
                                <button onClick={() => setShowTagihanModal(false)} className="text-slate-400 hover:text-slate-600"><i className="bi bi-x-lg"></i></button>
                            </div>
                            <div className="nl__modalBody">
                                <div className="nl__formGroup">
                                    <label className="nl__formLabel">Label Kolom (Kode)</label>
                                    <input
                                        className="nl__formInput"
                                        value={editingTagihan?.nama_tagihan || ''}
                                        onChange={e => setEditingTagihan(editingTagihan ? { ...editingTagihan, nama_tagihan: e.target.value.toUpperCase().replace(/\s/g, '_') } : null)}
                                        placeholder="Contoh: KUIS_1"
                                    />
                                </div>
                                <div className="nl__formGroup">
                                    <label className="nl__formLabel">Topik / Materi</label>
                                    <textarea
                                        className="nl__formInput"
                                        rows={3}
                                        value={cleanTopic(editingTagihan?.topik)}
                                        onChange={e => setEditingTagihan(editingTagihan ? { ...editingTagihan, topik: e.target.value } : null)}
                                        placeholder="Contoh: Aljabar Linear..."
                                    />
                                </div>
                                <div className="nl__formActions">
                                    <button className="nl__btn nl__btnSecondary" onClick={() => setShowTagihanModal(false)}>Batal</button>
                                    <button className="nl__btn nl__btnPrimary" onClick={async () => {
                                        if (!editingTagihan) return;
                                        setLoading(true);
                                        try {
                                            const body = { nip: user.nip, kelas, mapel, semester, ...editingTagihan, nama: editingTagihan.nama_tagihan, materi: editingTagihan.materi_tp, tahun_ajaran: tahunAjaran };
                                            const res = await fetch('/api/nilai/tagihan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
                                            const json = await res.json();
                                            if (!res.ok || !json.ok) throw new Error(json.error || 'Gagal menyimpan');

                                            // Force visibility for the improved UX (so it doesn't disappear if empty)
                                            const newKey = `${body.jenis}||${body.materi}||${body.nama}`;
                                            setForcedVisibleTags(prev => new Set(prev).add(newKey));

                                            setShowTagihanModal(false); setEditingTagihan(null); loadData();
                                        } catch (err: any) { Swal.fire('Error', err.message, 'error'); } finally { setLoading(false); }
                                    }}>Simpan</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Config Modal */}
            {
                showConfigModal && (
                    <div className="nl__modalOverlay animate-fade">
                        <div className="nl__modalContent">
                            <div className="nl__modalHeader">
                                <h3 className="nl__modalTitle">Konfigurasi Bobot Penilaian</h3>
                                <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-slate-600"><i className="bi bi-x-lg"></i></button>
                            </div>
                            <div className="nl__modalBody">
                                <div className="grid grid-cols-3 gap-4 mb-6">
                                    {['kuis', 'tugas', 'uh'].map(k => {
                                        const totalHarian = (bobot.ratioHarian.kuis || 0) + (bobot.ratioHarian.tugas || 0) + (bobot.ratioHarian.uh || 0);
                                        const val = (bobot.ratioHarian as any)[k] || 0;
                                        const percent = totalHarian > 0 ? Math.round((val / totalHarian) * 100) : 0;

                                        return (
                                            <div key={k} className="nl__formGroup">
                                                <label className="nl__formLabel">{k.toUpperCase()}</label>
                                                <input
                                                    type="number"
                                                    className="nl__formInput text-center"
                                                    value={val}
                                                    onChange={e => setBobot({ ...bobot, ratioHarian: { ...bobot.ratioHarian, [k]: parseInt(e.target.value) || 0 } })}
                                                />
                                                <div className="text-[10px] text-center mt-1 text-slate-400 font-bold">{percent}%</div>
                                            </div>
                                        );
                                    })}
                                </div>
                                <div className="border-t border-slate-100 pt-6 mb-2">
                                    <label className="nl__formLabel mb-4">Bobot Rapor</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        {[
                                            { label: 'Rerata SUM (Sumatif)', key: 'sums' },
                                            { label: 'Nilai PAS', key: 'pas' }
                                        ].map(item => {
                                            const totalRapor = (bobot.ratioRapor.sums || 0) + (bobot.ratioRapor.pas || 0);
                                            const val = (bobot.ratioRapor as any)[item.key] || 0;
                                            const percent = totalRapor > 0 ? Math.round((val / totalRapor) * 100) : 0;

                                            return (
                                                <div key={item.key} className="nl__formGroup">
                                                    <label className="nl__formLabel">{item.label}</label>
                                                    <input
                                                        type="number"
                                                        className="nl__formInput text-center"
                                                        value={val}
                                                        onChange={e => setBobot({ ...bobot, ratioRapor: { ...bobot.ratioRapor, [item.key]: parseInt(e.target.value) || 0 } })}
                                                    />
                                                    <div className="text-[10px] text-center mt-1 text-slate-400 font-bold">{percent}%</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="border-t border-slate-100 pt-6 mb-2">
                                    <label className="nl__formLabel mb-4">Pengaturan SUM</label>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-slate-600">Jumlah SUM:</span>
                                            <span className="font-bold text-slate-800">{bobot.sumCount}</span>
                                        </div>
                                        <button className="nl__btn nl__btnPrimary" onClick={handleAddSum}>
                                            <i className="bi bi-plus-lg"></i> Tambah SUM
                                        </button>
                                    </div>
                                </div>
                                <div className="nl__formActions">
                                    <button className="nl__btn nl__btnSecondary" onClick={() => setShowConfigModal(false)}>Batal</button>
                                    <button className="nl__btn nl__btnPrimary" onClick={async () => {
                                        await fetch('/api/nilai/bobot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nip: user.nip, kelas, mapel, semester, config: bobot, tahun_ajaran: tahunAjaran }) });
                                        setShowConfigModal(false); loadData();
                                    }}>Simpan Konfigurasi</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </PermissionGuard>
    );
}

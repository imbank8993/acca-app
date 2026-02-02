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
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [showSumDropdown, setShowSumDropdown] = useState(false);
    const [newSumTopic, setNewSumTopic] = useState('');

    const cleanTopic = (t?: string) => {
        if (!t || t === 'Auto-Imported') return '';
        return t;
    };

    // FIX: Updated getNextAutoLabel to see empty columns correctly
    const getNextAutoLabel = () => {
        const typePrefix = activeMode.toUpperCase();
        // Find all tags for this type/materi, regardless of data
        const relevantTags = tagihanConfig.filter(t =>
            t.jenis === (activeMode.charAt(0) + activeMode.slice(1).toLowerCase()) &&
            t.materi_tp === materi
        );

        // Find max index based on name pattern "TYPE_X"
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

    const handleExport = async (isTemplate: boolean = false) => {
        // Use xlsx-js-style for professional styling
        const XLSXStyle = await import('xlsx-js-style');

        // Build data structure
        const data = filteredSiswa.map((s, idx) => {
            const row: any = {
                "NO": idx + 1,
                "NISN": s.nisn,
                "NAMA": s.nama_siswa || (s as any).nama,
                "KELAS": s.kelas || kelas
            };

            if (activeMode === 'REKAP') {
                const count = isTemplate ? 10 : bobot.sumCount; // Force 10 for template
                Array.from({ length: count }, (_, i) => {
                    const sumName = `SUM ${i + 1}`;
                    const customTag = tagihanConfig.find(t => t.jenis === 'Sum' && t.materi_tp === sumName);
                    // Use standard UNDERSCORE name for template and export (e.g. SUM_1)
                    const standardName = sumName.replace(/\s+/g, '_').toUpperCase();
                    const key = (!isTemplate && customTag) ? `${standardName} (${customTag.topik || ''})`.toUpperCase() : standardName;

                    if (isTemplate) {
                        row[key] = "";
                    } else {
                        const val = calculateNABab(s.nisn, sumName);
                        row[key] = val !== '-' ? Math.round(val as number) : "";
                    }
                });
                if (isTemplate) {
                    row["PAS"] = "";
                    row["RAPOR"] = "";
                } else {
                    const pasVal = getScore(s.nisn, 'PAS', '-');
                    row["PAS"] = pasVal !== null && pasVal !== "" ? pasVal : "";
                    row["RAPOR"] = calculateRapor(s.nisn);
                }
            } else if (activeMode === 'UH') {
                // UH usually just has 1 column per materi, but let's keep it simple
                const headKey = `UH_${materi}`.toUpperCase();
                if (isTemplate) {
                    row[headKey] = "";
                } else {
                    const val = getScore(s.nisn, 'UH', materi);
                    row[headKey] = val !== null && val !== "" ? val : "";
                }
            } else if (activeMode === 'PAS') {
                if (isTemplate) {
                    row["PAS"] = "";
                } else {
                    const val = getScore(s.nisn, 'PAS', '-');
                    row["PAS"] = val !== null && val !== "" ? val : "";
                }
            } else {
                const jenisStr = activeMode.toUpperCase();
                const tags = tagihanConfig.filter(t => t.jenis === activeMode.charAt(0) + activeMode.slice(1).toLowerCase() && t.materi_tp === materi);

                // Force 10 cols for Template, otherwise just whats needed or min 5
                const loopLimit = isTemplate ? 10 : Math.max(tags.length, 5);

                for (let i = 0; i < loopLimit; i++) {
                    const tag = tags[i];
                    if (tag) {
                        // Standardize: KUIS_1, TUGAS_1, etc.
                        const cleanTagName = tag.nama_tagihan.toUpperCase().replace(/\s+/g, '_');
                        const key = (!isTemplate) ? `${cleanTagName} (${tag.topik || ''})`.toUpperCase() : cleanTagName;

                        if (isTemplate) {
                            row[key] = "";
                        } else {
                            const val = getScore(s.nisn, (tag as any).jenis, materi, tag.nama_tagihan);
                            row[key] = val !== null && val !== "" ? val : "";
                        }
                    } else {
                        row[`${jenisStr}_${i + 1}`] = "";
                    }
                }
            }
            return row;
        });

        const ws = XLSXStyle.utils.json_to_sheet(data);

        // --- STYLING LOGIC ---
        const range = XLSXStyle.utils.decode_range(ws['!ref']!);

        // Styles Configuration
        const headerStyle = {
            fill: { fgColor: { rgb: "0F172A" } },
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
            fill: { fgColor: { rgb: "F8FAFC" } },
            font: { color: { rgb: "1E293B" }, sz: 10 },
            alignment: { horizontal: "left", vertical: "center" },
            border: {
                bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                right: { style: "thin", color: { rgb: "E2E8F0" } }
            }
        };

        // Apply Styles to Main Data
        for (let R = range.s.r; R <= range.e.r; ++R) {
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const addr = XLSXStyle.utils.encode_cell({ r: R, c: C });
                if (!ws[addr]) continue;

                if (R === 0) {
                    ws[addr].s = headerStyle;
                } else {
                    if (C <= 3) {
                        const style: any = { ...identityStyle };
                        if (C <= 1 || C === 3) style.alignment = { horizontal: "center", vertical: "center" };
                        ws[addr].s = style;
                    }
                }
            }
        }

        // --- FOOTER: TOPIC DESCRIPTIONS (Vertical Layout) ---
        if (activeMode !== 'PAS') {
            let footerRowIndex = range.e.r + 2; // Leave one empty row

            // Section Header
            const headerAddr = XLSXStyle.utils.encode_cell({ r: footerRowIndex, c: 0 });
            XLSXStyle.utils.sheet_add_aoa(ws, [["KETERANGAN"]], { origin: headerAddr });
            if (!ws[headerAddr]) ws[headerAddr] = {};
            ws[headerAddr].s = {
                fill: { fgColor: { rgb: "FEF9C3" } },
                font: { bold: true, color: { rgb: "854D0E" } },
                border: { bottom: { style: "thin" } }
            };
            footerRowIndex++;

            // Gather Columns that need descriptions
            const headerRow = data[0] ? Object.keys(data[0]) : [];
            const targetCols = headerRow.filter((k, i) => i >= 4 && k !== 'PAS' && k !== 'RAPOR');

            targetCols.forEach(colKey => {
                // Clean Name (Remove Topic from Header)
                let cleanName = colKey;
                const match = colKey.match(/^(.+?)\s*\((.*?)\)$/);
                if (match) cleanName = match[1].trim();

                // Ensure it uses UNDERSCORES for consistency in Footer (e.g. KUIS_1)
                cleanName = cleanName.replace(/\s+/g, '_').toUpperCase();

                // Find Topic
                let topic = "";
                if (!isTemplate) {
                    cleanName = cleanName.replace(/\s/g, '_');
                    if (activeMode === 'REKAP') {
                        const sumMatch = cleanName.match(/^SUM_(\d+)/);
                        if (sumMatch) {
                            const tagName = `SUM ${sumMatch[1]}`;
                            const tag = tagihanConfig.find(t => t.jenis === 'Sum' && t.materi_tp === tagName);
                            if (tag) topic = tag.topik || "";
                        }
                    } else {
                        const jenisStr = activeMode.charAt(0) + activeMode.slice(1).toLowerCase();
                        const tag = tagihanConfig.find(t =>
                            (t.nama_tagihan.toUpperCase() === cleanName || t.nama_tagihan === cleanName.replace('_', ' ')) &&
                            t.materi_tp === materi &&
                            t.jenis === jenisStr
                        );
                        if (tag) topic = cleanTopic(tag.topik);
                    }
                } else {
                    // In template, cleanName likely "SUM 1" or "TUGAS 1". Keep it pretty.
                    // cleanName is already good from the map loop
                }

                // Write Row: [NAME] [TOPIC]
                const nameAddr = XLSXStyle.utils.encode_cell({ r: footerRowIndex, c: 0 });
                const topicAddr = XLSXStyle.utils.encode_cell({ r: footerRowIndex, c: 1 });

                XLSXStyle.utils.sheet_add_aoa(ws, [[cleanName, topic]], { origin: nameAddr });

                // Styles
                if (!ws[nameAddr]) ws[nameAddr] = {};
                ws[nameAddr].s = { font: { bold: true }, alignment: { horizontal: "left" } };

                if (!ws[topicAddr]) ws[topicAddr] = {};
                ws[topicAddr].s = {
                    font: { italic: true },
                    border: { bottom: { style: "dotted", color: { rgb: "CBD5E1" } } }
                };

                footerRowIndex++;
            });
        }

        // Define Column Widths
        ws['!cols'] = [{ wch: 6 }, { wch: 18 }, { wch: 40 }, { wch: 12 }];
        for (let i = 4; i <= range.e.c; i++) ws['!cols'].push({ wch: 15 });

        const wb = XLSXStyle.utils.book_new();
        XLSXStyle.utils.book_append_sheet(wb, ws, activeMode.toUpperCase());
        const prefix = isTemplate ? 'TEMPLATE' : 'EXPORT_DATA';
        const filename = `${prefix}_${activeMode}_${materi}_${kelas}_${mapel}.xlsx`.toUpperCase().replace(/\s+/g, '_');
        XLSXStyle.writeFile(wb, filename);
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
                const data: any[] = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) throw new Error("File Excel kosong atau format salah.");

                Swal.fire({ title: 'Processing Import...', text: 'Validating data structure...', didOpen: () => Swal.showLoading() });

                // 2. Analyze Structure & Validate Data
                const columns = Object.keys(data[0]);
                const validNISNs = new Set(siswa.map(s => s.nisn)); // Source of Truth
                let validRows = 0;
                let skippedRows = 0;
                let newColumnsCreated = 0;
                let newSumCount = bobot.sumCount;

                const newChanges = { ...changes };
                const newTagihansToCreate: any[] = [];
                const topicUpdates: { id: string, topik: string }[] = [];

                // 3. Scan for New Columns (Metadata Analysis)
                if (activeMode === 'REKAP') {
                    // Check for higher SUMs
                    columns.forEach(col => {
                        const sumMatch = col.toUpperCase().match(/^SUM\s*(\d+)/);
                        if (sumMatch) {
                            const idx = parseInt(sumMatch[1]);
                            if (idx > newSumCount) newSumCount = idx;
                        }
                    });
                } else if (activeMode === 'KUIS' || activeMode === 'TUGAS') {
                    const jenisStr = activeMode.charAt(0) + activeMode.slice(1).toLowerCase();
                    const scoreCols = columns.filter(c => !["NO", "NISN", "NAMA", "KELAS", "RAPOR", "PAS"].includes(c.toUpperCase()));

                    scoreCols.forEach(col => {
                        let finalName = col;
                        let finalTopic = "";
                        const match = col.match(/^(.+?)\s*\((.*?)\)$/);
                        if (match) {
                            finalName = match[1].trim();
                            // If topic is present in parens, extract it. Otherwise default.
                            if (match[2]) finalTopic = match[2].trim();
                        }

                        // Clean name key for matching
                        const cleanName = finalName.toUpperCase().replace(/\s/g, '_');

                        // Check if exists in current config
                        const exists = tagihanConfig.find(t =>
                            t.nama_tagihan.toUpperCase() === cleanName &&
                            t.materi_tp === materi &&
                            t.jenis === jenisStr
                        );

                        if (!exists) {
                            // Add to creation queue if unique
                            if (!newTagihansToCreate.some(t => t.nama === cleanName)) {
                                newTagihansToCreate.push({
                                    nama: cleanName,
                                    materi: materi,
                                    jenis: jenisStr,
                                    topik: finalTopic,
                                    label_raw: col // Keep original label to map data later
                                });
                            }
                        }
                    });
                }

                // 4. Execute Structural Updates (Async)

                // A. Update Bobot if new SUMs found
                if (newSumCount > bobot.sumCount) {
                    const updatedBobot = { ...bobot, sumCount: newSumCount };
                    await fetch('/api/nilai/bobot', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ nip: user.nip, kelas, mapel, semester, config: updatedBobot, tahun_ajaran: tahunAjaran })
                    });
                    // Locally update for immediate processing
                    setBobot(updatedBobot);
                    newColumnsCreated += (newSumCount - bobot.sumCount);
                }

                // B. Create New Tagihans
                for (const t of newTagihansToCreate) {
                    await fetch('/api/nilai/tagihan', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            nip: user.nip, kelas, mapel, semester,
                            materi: t.materi, jenis: t.jenis, nama: t.nama, topik: t.topik, tahun_ajaran: tahunAjaran
                        })
                    });
                    newColumnsCreated++;
                }

                // REFRESH CONFIG if changes made
                let currentConfig = tagihanConfig;
                if (newColumnsCreated > 0) {
                    const res = await fetch(`/api/nilai?nip=${user.nip}&kelas=${encodeURIComponent(kelas)}&mapel=${encodeURIComponent(mapel)}&semester=${semester}&tahun_ajaran=${encodeURIComponent(tahunAjaran)}`);
                    const json = await res.json();
                    if (json.ok) {
                        currentConfig = json.data.tagihan || [];
                        setTagihanConfig(currentConfig); // Async state update
                    }
                }

                // 5. Process Data Rows (Strict Validation)
                const errors: string[] = [];
                data.forEach((row, rowIdx) => {
                    // Strict Validation Keys
                    const rowNISN = (row["NISN"] || "").toString().trim();
                    const rowKelas = (row["KELAS"] || "").toString().trim();

                    // SKIP if invalid
                    if (!rowNISN) {
                        // errors.push(`Baris ${rowIdx + 2}: NISN kosong`);
                        // Silent skip fine for empty rows
                        return;
                    }

                    // VALIDATION LOGIC
                    if (!validNISNs.has(rowNISN)) {
                        // CHECK FOR METADATA/TOPIC ROW
                        // Try to see if row["NO"] or first key corresponds to a Tag Name
                        // Typically sheet_to_json keys are headers.
                        // If user used template, Col 0 is "NO", Col 1 is "NISN".
                        // Template Export writes: NO="TAG_NAME", NISN="TOPIC_TEXT"

                        const potentialTagName = (row["NO"] || "").toString().trim().toUpperCase();

                        // Find if this row identifies a tag
                        let matchedTag: any = null;

                        if (potentialTagName) {
                            const normalizedPot = potentialTagName.replace(/\s+/g, '_');
                            matchedTag = currentConfig.find(t =>
                                (t.nama_tagihan.toUpperCase() === normalizedPot ||
                                    t.nama_tagihan.toUpperCase() === normalizedPot.replace('_', ' ')) && // Try both _ and space
                                t.materi_tp === materi
                            );
                        }

                        // If found a tag, update its topic
                        if (matchedTag) {
                            // The topic is strictly in the NISN column (Col 1) for metadata rows
                            // We allow overwriting even if empty to ensure file is source of truth
                            const newTopic = rowNISN; // rowNISN is already trimmed string of row["NISN"]

                            // Compare with existing topic (treat null/undefined as empty string)
                            if (newTopic !== (matchedTag.topik || "")) {
                                topicUpdates.push({ id: matchedTag.id, topik: newTopic });
                            }
                            return; // Is a metadata row, not error
                        }

                        // If "NO" column is "KETERANGAN", just skip (Header for footer)
                        if (potentialTagName === "KETERANGAN") return;

                        errors.push(`Baris ${rowIdx + 2}: NISN '${rowNISN}' tidak ditemukan di kelas ini.`);
                        skippedRows++;
                        return;
                    }

                    if (rowKelas && rowKelas.toUpperCase() !== kelas.toUpperCase()) {
                        errors.push(`Baris ${rowIdx + 2}: Kelas ${rowKelas} tidak sesuai (Harap: ${kelas}).`);
                        skippedRows++;
                        return;
                    }

                    validRows++;

                    // Map Values
                    Object.keys(row).forEach(col => {
                        if (["NO", "NISN", "NAMA", "KELAS", "RAPOR"].includes(col.toUpperCase())) return;

                        let rawValue = row[col]?.toString() || "";
                        if (rawValue === "") return;

                        let valStr = rawValue.replace(',', '.');
                        let val = parseFloat(valStr);
                        if (isNaN(val)) {
                            errors.push(`Baris ${rowIdx + 2}: Nilai '${rawValue}' pada kolom '${col}' tidak valid.`);
                            return;
                        }
                        if (val < 0 || val > 100) {
                            errors.push(`Baris ${rowIdx + 2}: Nilai ${val} pada kolom '${col}' diluar batas (0-100).`);
                            return;
                        }

                        // Identify Target key based on Mode & Column
                        if (activeMode === 'UH' && col.toUpperCase().startsWith('UH')) {
                            newChanges[`${rowNISN}||UH||${materi}||`] = val;
                        } else if (activeMode === 'PAS' && col.toUpperCase() === 'PAS') {
                            newChanges[`${rowNISN}||PAS||-||`] = val;
                        } else if (activeMode === 'KUIS' || activeMode === 'TUGAS') {
                            // Match column to Tagihan
                            const jenisStr = activeMode.charAt(0) + activeMode.slice(1).toLowerCase();

                            // Try exact match or match via created metadata
                            let targetTag = currentConfig.find(t => t.nama_tagihan.toUpperCase() === col.toUpperCase() && t.materi_tp === materi && t.jenis === jenisStr);

                            // Fallback: Check if it was one of the newly created ones by header matching
                            if (!targetTag) {
                                const createdMeta = newTagihansToCreate.find(t => t.label_raw === col);
                                if (createdMeta) {
                                    targetTag = currentConfig.find(t => t.nama_tagihan.toUpperCase() === createdMeta.nama && t.materi_tp === materi && t.jenis === jenisStr);
                                }
                            }

                            const finalTag = targetTag ? targetTag.nama_tagihan : col.toUpperCase().replace(/\s/g, '_'); // Fallback purely by name
                            newChanges[`${rowNISN}||${jenisStr}||${materi}||${finalTag}`] = val;

                        } else if (activeMode === 'REKAP') {
                            if (col.toUpperCase() === 'PAS') {
                                newChanges[`${rowNISN}||PAS||-||`] = val;
                            }
                        }
                    });
                });

                setChanges(newChanges);

                // 6. Apply Topic Updates
                if (topicUpdates.length > 0) {
                    // Update locally
                    const updatedConfig = currentConfig.map(t => {
                        const update = topicUpdates.find(u => u.id === t.id);
                        return update ? { ...t, topik: update.topik } : t;
                    });
                    setTagihanConfig(updatedConfig);

                    // Update Server
                    await Promise.all(topicUpdates.map(u =>
                        fetch('/api/nilai/tagihan', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                // unpack existing first to ensure we don't overwrite new values
                                ...(currentConfig.find(c => c.id === u.id)),
                                id: u.id,
                                topik: u.topik,
                                nip: user.nip,
                                kelas,
                                mapel,
                                semester,
                                tahun_ajaran: tahunAjaran
                            })
                        })
                    ));
                }

                setShowImportModal(false);

                // Summary Report
                let htmlContent = `<div class="text-left text-sm space-y-2">
                    <p><b>Berhasil Diproses:</b> ${validRows} siswa</p>
                    <p><b>Dilewati/Error:</b> ${errors.length} baris</p>
                    <p><b>Kolom Baru:</b> ${newColumnsCreated}</p>`;

                if (errors.length > 0) {
                    // Filter out "NISN not found" errors if they match known metadata patterns to be doubly sure
                    // But our previous logic already stopped push if it was metadata.
                    // Just purely show valid remaining errors
                    htmlContent += `<div class="mt-3 p-2 bg-red-50 text-red-600 rounded max-h-40 overflow-y-auto text-xs border border-red-100">
                        <ul class="list-disc pl-4 space-y-1">
                            ${errors.map(e => `<li>${e}</li>`).join('')}
                        </ul>
                    </div>`;
                }

                // Show Topic Updates in Summary
                if (topicUpdates.length > 0) {
                    htmlContent += `<div class="mt-2 p-2 bg-blue-50 text-blue-700 rounded text-xs border border-blue-100">
                        <p class="font-bold"><i class="bi bi-info-circle"></i> Info Update Materi:</p>
                        <ul class="list-disc pl-4 space-y-1 mt-1">
                            ${topicUpdates.map(u => {
                        const t = currentConfig.find(c => c.id === u.id);
                        return `<li>${t?.nama_tagihan || 'Tag'}: ${u.topik}</li>`;
                    }).join('')}
                        </ul>
                    </div>`;
                }

                htmlContent += `<p class="text-xs text-slate-500 mt-2 border-t pt-2">Data masuk ke mode <b>DRAFT</b>. Silakan review dan klik tombol <b>SIMPAN</b> (Awan Biru) untuk menyimpan permanen.</p></div>`;

                Swal.fire({
                    icon: errors.length > 0 && validRows === 0 ? 'error' : (errors.length > 0 ? 'warning' : 'success'),
                    title: 'Hasil Import',
                    html: htmlContent,
                    width: '600px'
                });

            } catch (err: any) {
                Swal.fire('Import Error', err.message, 'error');
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
                                            .filter(t => activeTags.has(`${(activeMode.charAt(0) + activeMode.slice(1).toLowerCase())}||${materi}||${t.nama_tagihan}`)) // ONLY SHOW ACTIVE
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
                                    <td className="text-center text-slate-400 text-xs">{idx + 1}</td>
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
                                                .filter(t => activeTags.has(`${t.jenis}||${materi}||${t.nama_tagihan}`)) // SYNC FILTER
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
                {(activeMode === 'KUIS' || activeMode === 'TUGAS') && (
                    <div className="nl__tableWrap mt-4 p-6">
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <i className="bi bi-info-circle-fill text-blue-500"></i>
                            Keterangan Materi
                        </div>
                        <div className="grid grid-cols-[120px_1fr_120px_1fr] gap-x-12 gap-y-3">
                            {tagihanConfig
                                .filter(t => t.jenis === (activeMode.charAt(0) + activeMode.slice(1).toLowerCase()) && t.materi_tp === materi)
                                .sort((a, b) => {
                                    const numA = parseInt(a.nama_tagihan.split('_')[1]) || 0;
                                    const numB = parseInt(b.nama_tagihan.split('_')[1]) || 0;
                                    return numA - numB;
                                })
                                .map(t => (
                                    <Fragment key={t.id || t.nama_tagihan}>
                                        <div className="font-bold text-sm text-slate-700 border-b border-slate-50 pb-1">{t.nama_tagihan}</div>
                                        <div className={`text-sm border-b border-slate-50 pb-1 truncate ${cleanTopic(t.topik) ? 'text-slate-600' : 'text-slate-300 italic'}`} title={cleanTopic(t.topik)}>
                                            {cleanTopic(t.topik) || '-'}
                                        </div>
                                    </Fragment>
                                ))
                            }
                            {tagihanConfig.filter(t => t.jenis === (activeMode.charAt(0) + activeMode.slice(1).toLowerCase()) && t.materi_tp === materi).length === 0 && (
                                <div className="text-slate-400 italic text-sm col-span-full">Belum ada kolom penilaian untuk materi ini.</div>
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
                                    tagihanConfig.filter(t => t.jenis === (activeMode.charAt(0) + activeMode.slice(1).toLowerCase()) && t.materi_tp === materi).map(t => {
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
                                    {['kuis', 'tugas', 'uh'].map(k => (
                                        <div key={k} className="nl__formGroup">
                                            <label className="nl__formLabel">{k.toUpperCase()}</label>
                                            <input
                                                type="number"
                                                className="nl__formInput text-center"
                                                value={(bobot.ratioHarian as any)[k]}
                                                onChange={e => setBobot({ ...bobot, ratioHarian: { ...bobot.ratioHarian, [k]: parseInt(e.target.value) || 0 } })}
                                            />
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-slate-100 pt-6 mb-2">
                                    <label className="nl__formLabel mb-4">Bobot Rapor</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="nl__formGroup">
                                            <label className="nl__formLabel">Rerata SUM (Sumatif)</label>
                                            <input
                                                type="number"
                                                className="nl__formInput text-center"
                                                value={bobot.ratioRapor.sums}
                                                onChange={e => setBobot({ ...bobot, ratioRapor: { ...bobot.ratioRapor, sums: parseInt(e.target.value) || 0 } })}
                                            />
                                        </div>
                                        <div className="nl__formGroup">
                                            <label className="nl__formLabel">Nilai PAS</label>
                                            <input
                                                type="number"
                                                className="nl__formInput text-center"
                                                value={bobot.ratioRapor.pas}
                                                onChange={e => setBobot({ ...bobot, ratioRapor: { ...bobot.ratioRapor, pas: parseInt(e.target.value) || 0 } })}
                                            />
                                        </div>
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

        </PermissionGuard >
    );
}

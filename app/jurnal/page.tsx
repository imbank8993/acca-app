'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Select from 'react-select';
import { hasPermission } from '@/lib/permissions-client';
import XLSX from 'xlsx-js-style';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import JournalModal from './components/JournalModal';

interface Journal {
    id: number;
    tanggal: string;
    hari: string;
    jam_ke: string;
    jam_ke_id?: number;
    nama_guru: string;
    kelas: string;
    mata_pelajaran: string;
    kategori_kehadiran: string;
    materi?: string;
    refleksi?: string;
    nip: string;
    guru_pengganti?: string;
    status_pengganti?: string;
    keterangan_terlambat?: string;
    keterangan_tambahan?: string;
    guru_piket?: string;
}

interface Filters {
    nip?: string;
    kelas?: string;
    startDate?: string;
    endDate?: string;
    kategori?: string;
    search?: string;
}

const customSelectStyles = {
    control: (base: any, state: any) => ({
        ...base,
        borderRadius: '12px',
        border: state.isFocused ? '1px solid #3b82f6' : '1px solid #cbd5e1',
        boxShadow: state.isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.1)' : 'none',
        '&:hover': {
            borderColor: '#94a3b8',
        },
        padding: '2px',
        fontSize: '0.9rem',
        fontWeight: '500',
        backgroundColor: '#ffffff',
        color: '#000000',
        minHeight: '42px',
    }),
    placeholder: (base: any) => ({
        ...base,
        color: '#64748b', // Keep placeholder slightly lighter so it's distinct
    }),
    singleValue: (base: any) => ({
        ...base,
        color: '#000000',
    }),
    input: (base: any) => ({
        ...base,
        color: '#000000',
    }),
    option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isSelected ? '#f1f5f9' : state.isFocused ? '#f8fafc' : '#ffffff',
        color: '#000000',
        fontSize: '0.85rem',
        fontWeight: state.isSelected ? '600' : '500',
        cursor: 'pointer',
    }),
    menu: (base: any) => ({
        ...base,
        zIndex: 9999,
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        borderRadius: '12px',
        marginTop: '4px',
    }),
    menuPortal: (base: any) => ({ ...base, zIndex: 9999 }),
};

function JurnalContent({ user }: { user?: any }) {
    const searchParams = useSearchParams();

    // UI States
    const [journals, setJournals] = useState<Journal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editJournal, setEditJournal] = useState<Journal | null>(null);

    const [masterDataState, setMasterDataState] = useState<any>(null);


    // Derived values from URL
    const urlFilters: Filters = {
        nip: searchParams.get('nip') || undefined,
        kelas: searchParams.get('kelas') || undefined,
        startDate: searchParams.get('startDate') || undefined,
        endDate: searchParams.get('endDate') || undefined,
        kategori: searchParams.get('kategori') || undefined,
        search: searchParams.get('search') || undefined,
    };

    const permissions = user?.permissions || [];
    const roles = user?.roles?.map((r: string) => r.toUpperCase()) || [];

    const isGuru = roles.includes('GURU');
    const isWali = roles.includes('WALI KELAS');
    const isKepala = roles.includes('KEPALA MADRASAH') || roles.includes('KAMAD');
    const isOPJurnal = roles.includes('OP_JURNAL');
    const isAdmin = roles.includes('ADMIN');

    const canDo = (action: string) => {
        return hasPermission(permissions, 'jurnal', action, isAdmin);
    };

    useEffect(() => {
        fetchJournals();
    }, [searchParams]);

    const fetchJournals = async () => {
        setLoading(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams();
            if (urlFilters.nip) queryParams.append('nip', urlFilters.nip);
            if (urlFilters.kelas) queryParams.append('kelas', urlFilters.kelas);
            if (urlFilters.startDate) queryParams.append('startDate', urlFilters.startDate);
            if (urlFilters.endDate) queryParams.append('endDate', urlFilters.endDate);
            if (urlFilters.kategori) queryParams.append('kategori', urlFilters.kategori);
            if (urlFilters.search) queryParams.append('search', urlFilters.search);

            const response = await fetch(`/api/jurnal?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch journals');

            const data = await response.json();
            setJournals(data.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (ids: number | number[]) => {
        const idsArray = Array.isArray(ids) ? ids : [ids];
        if (!confirm(`Yakin ingin menghapus ${idsArray.length > 1 ? idsArray.length + ' data jurnal ini sekaligus?' : 'jurnal ini?'}`)) return;

        try {
            // Loop for delete or we could update API to handle array
            for (const id of idsArray) {
                const response = await fetch(`/api/jurnal?id=${id}`, {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error('Gagal menghapus data dengan ID ' + id);
            }

            Swal.fire('Berhasil', 'Data jurnal berhasil dihapus', 'success');
            fetchJournals();
        } catch (err: any) {
            Swal.fire('Gagal', 'Terjadi kesalahan: ' + err.message, 'error');
        }
    };

    const filteredJournals = journals.filter(j => {
        if (selectedTeacher && j.nama_guru !== selectedTeacher) return false;
        if (selectedSubject && j.mata_pelajaran !== selectedSubject) return false;
        if (selectedClass && j.kelas !== selectedClass) return false;
        if (searchTerm && !j.nama_guru.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !j.mata_pelajaran.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !j.kelas.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    // AUTO-GROUPING LOGIC (Smart Range & Context)
    const displayGroups = (filteredData: Journal[]) => {
        if (filteredData.length === 0) return [];

        const groups: any[] = [];
        let currentGroup: any = null;

        // Ensure sorted by Date, Teacher, Class, and Hour
        const sorted = [...filteredData].sort((a, b) => {
            if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal);
            if (a.nama_guru !== b.nama_guru) return a.nama_guru.localeCompare(b.nama_guru);
            if (a.kelas !== b.kelas) return a.kelas.localeCompare(b.kelas);
            return (a.jam_ke_id || 0) - (b.jam_ke_id || 0);
        });

        sorted.forEach(j => {
            if (!currentGroup) {
                currentGroup = { ...j, allIds: [j.id], jamIds: [j.jam_ke_id] };
            } else {
                const lastJam = currentGroup.jamIds[currentGroup.jamIds.length - 1];
                const isConsecutive = j.jam_ke_id === (lastJam + 1);

                const isSameContext =
                    j.nip === currentGroup.nip &&
                    j.tanggal === currentGroup.tanggal &&
                    j.kelas === currentGroup.kelas &&
                    j.mata_pelajaran === currentGroup.mata_pelajaran &&
                    j.kategori_kehadiran === currentGroup.kategori_kehadiran &&
                    j.materi === currentGroup.materi &&
                    j.refleksi === currentGroup.refleksi &&
                    j.guru_pengganti === currentGroup.guru_pengganti &&
                    j.status_pengganti === currentGroup.status_pengganti;

                if (isSameContext) {
                    currentGroup.allIds.push(j.id);
                    currentGroup.jamIds.push(j.jam_ke_id);
                } else {
                    // Finalize previous group's jam_ke display
                    formatJamRange(currentGroup);
                    groups.push(currentGroup);
                    currentGroup = { ...j, allIds: [j.id], jamIds: [j.jam_ke_id] };
                }
            }
        });

        if (currentGroup) {
            formatJamRange(currentGroup);
            groups.push(currentGroup);
        }
        return groups;
    };

    // Helper: Format jamIds into "1-3" or "1, 3" string
    const formatJamRange = (group: any) => {
        const ids = group.jamIds.sort((a: number, b: number) => a - b);
        if (ids.length === 0) return;

        // Logic to find ranges
        const result = [];
        let start = ids[0];
        let prev = ids[0];

        for (let i = 1; i <= ids.length; i++) {
            const current = ids[i];
            if (current === prev + 1) {
                prev = current;
            } else {
                if (start === prev) {
                    result.push(start.toString());
                } else {
                    result.push(`${start}-${prev}`);
                }
                start = current;
                prev = current;
            }
        }
        group.jam_ke = result.join(', ');
    };

    const finalDisplayData = displayGroups(filteredJournals);

    const handleExport = async (mode: 'GURU' | 'WALI' | 'ADMIN' | 'KEPALA') => {
        let exportRaw = [...journals];
        let filename = 'Jurnal_Export';

        if (mode === 'GURU') {
            // Filter by NIP or Name, and INCLUDE entries where user is Guru Pengganti (Point 4)
            exportRaw = exportRaw.filter(j =>
                j.nip === user?.nip ||
                j.nama_guru === user?.nama ||
                (j.guru_pengganti && j.guru_pengganti === user?.nama)
            );
            filename = `Jurnal_Personal_${user?.nama || 'Guru'}`;
        } else if (mode === 'WALI') {
            // Wali filters could be added here if needed
        }

        // APPLY GROUPING TO EXPORT DATA
        const exportData = displayGroups(exportRaw);

        if (exportData.length === 0) {
            Swal.fire('Info', 'Tidak ada data untuk diekspor dalam mode ini.', 'info');
            return;
        }

        // PREPARE DATA FOR EXCEL (Common transformation for all sheets)
        const transformData = (data: any[]) => data.map((j, i) => {
            let timeDisplay = '';
            if (allWaktu.length > 0 && j.jamIds && j.jamIds.length > 0) {
                const sortedIds = [...j.jamIds].sort((a, b) => a - b);
                const firstId = sortedIds[0];
                const lastId = sortedIds[sortedIds.length - 1];
                const startSch = allWaktu.find((w: any) => w.jam_ke === firstId && w.hari === j.hari);
                const endSch = allWaktu.find((w: any) => w.jam_ke === lastId && w.hari === j.hari);
                if (startSch && endSch) {
                    timeDisplay = `${startSch.mulai?.slice(0, 5)} - ${endSch.selesai?.slice(0, 5)}`;
                } else {
                    timeDisplay = j.jam_ke;
                }
            } else {
                timeDisplay = j.jam_ke;
            }

            return {
                'No': i + 1,
                'Tanggal': j.tanggal,
                'Hari': j.hari,
                'Jam Ke': j.jam_ke,
                'Waktu': timeDisplay,
                'Guru': j.nama_guru,
                'Kelas': j.kelas,
                'Mata Pelajaran': j.mata_pelajaran,
                'Kategori': j.kategori_kehadiran,
                'Materi': j.materi || '-',
                'Refleksi': j.refleksi || '-',
                'Guru Pengganti': j.guru_pengganti || '-',
                'Status Pengganti': j.status_pengganti || '-',
                'Alasan Terlambat': j.keterangan_terlambat || '-',
                'Keterangan Tambahan': j.keterangan_tambahan || '-',
                'Guru Piket': j.guru_piket || '-'
            };
        });

        // STYLING HELPER
        const applySheetStyles = (ws: any, rowData: any[]) => {
            const textColWidth = 42;
            const keys = rowData.length > 0 ? Object.keys(rowData[0]) : [];

            // Smart Auto-Fit Logic
            ws['!cols'] = keys.map((key, i) => {
                if ([9, 10, 14].includes(i)) return { wch: textColWidth };

                let maxLen = key.length;
                rowData.forEach(row => {
                    const val = (row as any)[key] ? String((row as any)[key]) : '';
                    if (val.length > maxLen) maxLen = val.length;
                });
                // Pad with extra 3 units for breathing room, cap non-text columns at 35
                return { wch: Math.min(maxLen + 3, 35) };
            });

            ws['!rows'] = [{ hpt: 35 }];
            const range = XLSX.utils.decode_range(ws['!ref'] || "A1:P1");
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
                    if (!ws[cell_address]) continue;
                    const isHeader = R === 0;
                    const style: any = {
                        font: { name: "Arial", sz: 10.5 },
                        alignment: { vertical: "center", wrapText: false },
                        border: {
                            top: { style: "thin", color: { rgb: "E2E8F0" } },
                            bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                            left: { style: "thin", color: { rgb: "E2E8F0" } },
                            right: { style: "thin", color: { rgb: "E2E8F0" } }
                        }
                    };
                    if (isHeader) {
                        style.font = { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } };
                        style.fill = { fgColor: { rgb: "1E3A8A" } };
                        style.alignment = { horizontal: "center", vertical: "center", wrapText: true };
                    } else {
                        if (C === 9 || C === 10 || C === 14) {
                            style.alignment.wrapText = true;
                            style.alignment.vertical = "top";
                        } else if ([0, 2, 3, 6, 8].includes(C)) {
                            style.alignment.horizontal = "center";
                        }
                    }
                    ws[cell_address].s = style;
                }
            }
        };

        const wb = XLSX.utils.book_new();

        // 1. SHEET: SEMUA
        const allDataTransformed = transformData(exportData);
        const wsAll = XLSX.utils.json_to_sheet(allDataTransformed);
        applySheetStyles(wsAll, allDataTransformed);
        XLSX.utils.book_append_sheet(wb, wsAll, "Semua Data");

        // 2. SHEETS: PER BULAN
        const monthsInIndo = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

        // Group data by month using the 'tanggal' field
        const groupedByMonth = exportData.reduce((acc: any, item: any) => {
            const date = new Date(item.tanggal);
            const monthIdx = date.getMonth();
            const year = date.getFullYear();
            const key = `${monthsInIndo[monthIdx]} ${year}`;
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
            return acc;
        }, {});

        // Sort keys to have months in chronological order
        const monthKeys = Object.keys(groupedByMonth).sort((a, b) => {
            const [mA, yA] = a.split(' ');
            const [mB, yB] = b.split(' ');
            if (yA !== yB) return parseInt(yA) - parseInt(yB);
            return monthsInIndo.indexOf(mA) - monthsInIndo.indexOf(mB);
        });

        monthKeys.forEach(monthLabel => {
            const monthData = transformData(groupedByMonth[monthLabel]);
            const wsMonth = XLSX.utils.json_to_sheet(monthData);
            applySheetStyles(wsMonth, monthData);
            // Sheet name max 31 chars
            XLSX.utils.book_append_sheet(wb, wsMonth, monthLabel.slice(0, 31));
        });

        // 3. ADD EXTRA SHEET FOR PRIVILEGED ROLES AT THE END (REKAP KETIDAKHADIRAN)
        if (mode === 'ADMIN' || mode === 'KEPALA') {
            const rekapDataRaw = exportData.filter(j => (j.kategori_kehadiran || '').toLowerCase() !== 'sesuai');
            if (rekapDataRaw.length > 0) {
                const rekapTransformed = transformData(rekapDataRaw);
                const wsRekap = XLSX.utils.json_to_sheet(rekapTransformed);

                // Define Color Mapping for categories
                const getStatusColor = (kategori: string) => {
                    const k = (kategori || '').toLowerCase();
                    if (k.includes('terlambat')) return 'FFF7ED'; // Orange-50 (Amber)
                    if (k.includes('tugas')) return 'F0FDF4';    // Green-50
                    if (k.includes('diganti') || k.includes('tukar') || k.includes('pengganti')) return 'EFF6FF'; // Blue-50
                    if (k.includes('tidak hadir') || k.includes('mangkir') || k.includes('sakit') || k.includes('izin')) return 'FEF2F2'; // Red-50
                    return 'F8FAF8'; // Default greyish
                };

                // Apply styles specifically for Rekap (with colors)
                const textColWidth = 42;
                const keys = rekapTransformed.length > 0 ? Object.keys(rekapTransformed[0]) : [];
                wsRekap['!cols'] = keys.map((key, i) => {
                    if ([9, 10, 14].includes(i)) return { wch: textColWidth };
                    let maxLen = key.length;
                    rekapTransformed.forEach(row => {
                        const val = (row as any)[key] ? String((row as any)[key]) : '';
                        if (val.length > maxLen) maxLen = val.length;
                    });
                    return { wch: Math.min(maxLen + 3, 35) };
                });

                wsRekap['!rows'] = [{ hpt: 35 }];
                const range = XLSX.utils.decode_range(wsRekap['!ref'] || "A1:P1");
                for (let R = range.s.r; R <= range.e.r; ++R) {
                    for (let C = range.s.c; C <= range.e.c; ++C) {
                        const cell_address = XLSX.utils.encode_cell({ r: R, c: C });
                        if (!wsRekap[cell_address]) continue;
                        const isHeader = R === 0;
                        const itemData = R > 0 ? rekapDataRaw[R - 1] : null;
                        const rowColor = itemData ? getStatusColor(itemData.kategori_kehadiran) : 'FFFFFF';

                        const style: any = {
                            font: { name: "Arial", sz: 10.5 },
                            alignment: { vertical: "center", wrapText: false },
                            border: {
                                top: { style: "thin", color: { rgb: "E2E8F0" } },
                                bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                                left: { style: "thin", color: { rgb: "E2E8F0" } },
                                right: { style: "thin", color: { rgb: "E2E8F0" } }
                            },
                            fill: { fgColor: { rgb: rowColor } }
                        };

                        if (isHeader) {
                            style.font = { name: "Arial", sz: 11, bold: true, color: { rgb: "FFFFFF" } };
                            style.fill = { fgColor: { rgb: "991B1B" } }; // Deep Red for Rekap Header
                            style.alignment = { horizontal: "center", vertical: "center", wrapText: true };
                        } else {
                            if (C === 9 || C === 10 || C === 14) {
                                style.alignment.wrapText = true;
                                style.alignment.vertical = "top";
                            } else if ([0, 2, 3, 6, 8].includes(C)) {
                                style.alignment.horizontal = "center";
                            }
                        }
                        wsRekap[cell_address].s = style;
                    }
                }

                // Add to END of book
                XLSX.utils.book_append_sheet(wb, wsRekap, "Rekap Ketidakhadiran Guru");
            }
        }

        XLSX.writeFile(wb, `${filename}.xlsx`);
    };

    const showExportOptions = () => {
        const items: any[] = [];
        if (canDo('export_personal')) items.push({ id: 'GURU', label: 'Mode GURU', desc: 'Eksport jurnal personal & pengganti saya' });
        if (canDo('export_class')) items.push({ id: 'WALI', label: 'Mode WALI KELAS', desc: 'Eksport semua jurnal untuk kelas bimbingan' });
        if (canDo('export_admin')) items.push({ id: 'ADMIN', label: 'Mode ADMIN', desc: 'Eksport seluruh data jurnal sistem' });
        if (isKepala) items.push({ id: 'KEPALA', label: 'Mode KEPALA MADRASAH', desc: 'Eksport laporan jurnal untuk pimpinan' });

        if (items.length === 0) {
            Swal.fire('Perhatian', 'Anda tidak memiliki hak akses untuk melakukan eksport.', 'warning');
            return;
        }

        const getExportIcon = (id: string) => {
            switch (id) {
                case 'GURU': return 'bi-person-badge';
                case 'WALI': return 'bi-people';
                case 'ADMIN': return 'bi-shield-check';
                case 'KEPALA': return 'bi-award';
                default: return 'bi-file-earmark-spreadsheet';
            }
        };

        Swal.fire({
            title: 'Pilih Mode Eksport',
            html: `
            <div class="swal-export-grid">
                ${items.map(it => `
                    <div id="exp-${it.id}" class="swal-export-card">
                        <div class="swal-export-icon">
                            <i class="bi ${getExportIcon(it.id)}"></i>
                        </div>
                        <div class="swal-export-info">
                            <div class="swal-export-label">${it.label}</div>
                            <div class="swal-export-desc">${it.desc}</div>
                        </div>
                        <div class="swal-export-arrow">
                            <i class="bi bi-chevron-right"></i>
                        </div>
                    </div>
                `).join('')}
            </div>
        `,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Batal',
            didOpen: () => {
                items.forEach(it => {
                    const btn = document.getElementById(`exp-${it.id}`);
                    if (btn) btn.onclick = () => {
                        handleExport(it.id);
                        Swal.close();
                    };
                });
            }
        });
    };

    const getCategoryClass = (kategori: string) => {
        switch (kategori) {
            case 'Sesuai': return 'sk__status isOn';
            case 'Terlambat': return 'sk__status isWarning';
            case 'Diganti': return 'sk__status isInfo';
            default: return 'sk__status isOff';
        }
    };

    const [guruOptions, setGuruOptions] = useState<any[]>([]);
    const [mapelOptions, setMapelOptions] = useState<any[]>([]);
    const [kelasOptions, setKelasOptions] = useState<any[]>([]);
    const [terlambatOptions, setTerlambatOptions] = useState<any[]>([]);
    const [statusPenggantiOptions, setStatusPenggantiOptions] = useState<any[]>([]); // We can use master_dropdown or static
    const [jenisKetidakhadiranOptions, setJenisKetidakhadiranOptions] = useState<any[]>([]);
    const [kategoriKehadiranOptions, setKategoriKehadiranOptions] = useState<any[]>([]);
    const [allWaktu, setAllWaktu] = useState<any[]>([]);
    const [allJadwal, setAllJadwal] = useState<any[]>([]); // New state for all schedules
    const [allMapels, setAllMapels] = useState<any[]>([]); // New state for all master mapels
    const [allKelas, setAllKelas] = useState<any[]>([]);   // New state for all master kelas

    useEffect(() => {
        loadFilterOptions();
    }, []);

    const loadFilterOptions = async () => {
        try {
            const [guruRes, mapelRes, kelasRes, waktuRes, jadwalRes] = await Promise.all([
                fetch('/api/master/guru'),
                fetch('/api/master/mapel'),
                fetch('/api/master/kelas'),
                fetch('/api/master/waktu'),
                fetch('/api/settings/jadwal-guru?limit=5000') // Fetch with a high limit
            ]);
            const [guruData, mapelData, kelasData, waktuData, jadwalData] = await Promise.all([
                guruRes.json(),
                mapelRes.json(),
                kelasRes.json(),
                waktuRes.json(),
                jadwalRes.json()
            ]);

            if (guruData.ok) setGuruOptions(guruData.data.map((g: any) => ({ value: g.nama_lengkap, label: g.nama_lengkap, nip: g.nip })));
            if (mapelData.ok) {
                const mapels = mapelData.data.map((m: any) => ({ value: m.nama, label: m.nama }));
                setMapelOptions(mapels);
                setAllMapels(mapels); // Store all master mapels
            }
            if (kelasData.ok) {
                const kls = kelasData.data.map((k: any) => ({ value: k.nama, label: k.nama }));
                setKelasOptions(kls);
                setAllKelas(kls);     // Store all master kelas
            }
            if (waktuData.ok) {
                setAllWaktu(waktuData.data);
                // Initial generic jam options moved to JournalModal component
            }
            if (jadwalData.ok) {
                setAllJadwal(jadwalData.data); // Store all schedules
            }


            // Fetch Master Dropdown
            const { data: dropdownData } = await supabase.from('master_dropdown').select('*');
            if (dropdownData) {
                // Extract unique non-null values for relevant columns
                const extractOptions = (key: string) =>
                    Array.from(new Set(dropdownData.map((d: any) => d[key]).filter(Boolean)))
                        .map((v: any) => ({ value: v, label: v }));

                setTerlambatOptions(extractOptions('keterangan_terlambat'));

                // Prioritize 'status_ketidakhadiran' for replace status
                const statusOpts = extractOptions('status_ketidakhadiran');
                if (statusOpts.length > 0) {
                    setStatusPenggantiOptions(statusOpts);
                } else {
                    // Fallback if master is empty
                    setStatusPenggantiOptions([
                        { value: 'Hadir Penuh', label: 'Hadir Penuh' },
                        { value: 'Hanya Tugas', label: 'Hanya Tugas' },
                        { value: 'Zoom/Online', label: 'Zoom/Online' },
                        { value: 'Terlambat', label: 'Terlambat' }
                    ]);
                }

                setJenisKetidakhadiranOptions(extractOptions('jenis_ketidakhadiran'));

                // Kategori Kehadiran
                const katOpts = extractOptions('kategori_kehadiran');
                if (katOpts.length > 0) {
                    setKategoriKehadiranOptions(katOpts);
                }

                // Set Master Data State for Modal
                setMasterDataState({
                    guru: guruData.ok ? guruData.data : [],
                    mapel: mapelData.ok ? mapelData.data : [],
                    kelas: kelasData.ok ? kelasData.data : [],
                    waktu: waktuData.ok ? waktuData.data : [],
                    jadwal: jadwalData.ok ? jadwalData.data : [],
                    dropdown: {
                        terlambat: extractOptions('keterangan_terlambat'),
                        statusPengganti: statusOpts.length > 0 ? statusOpts : [
                            { value: 'Hadir Penuh', label: 'Hadir Penuh' },
                            { value: 'Hanya Tugas', label: 'Hanya Tugas' },
                            { value: 'Zoom/Online', label: 'Zoom/Online' },
                            { value: 'Terlambat', label: 'Terlambat' }
                        ],
                        jenisKetidakhadiran: extractOptions('jenis_ketidakhadiran'),
                        kategoriKehadiran: katOpts
                    }
                });
            }

        } catch (err) {
            console.error('Failed to load filters', err);
        }
    };

    return (
        <div className="jt">
            {/* Page Header */}
            <div className="jt__pageHeader">
                <div className="jt__titleArea">
                    <h1 className="text-3xl font-bold mb-1">Jurnal Pembelajaran</h1>
                    <p className="text-gray-500">Daftar kegiatan belajar mengajar harian</p>
                </div>
                <div className="jt__actions">
                    <button
                        className="jt__btn jt__btnPrimary"
                        onClick={() => setShowAddModal(true)}
                        disabled={!canDo('create')}
                    >
                        <i className="bi bi-plus-lg" /> <span>Tambah Jurnal</span>
                    </button>
                    <button className="jt__btn bg-green-50 text-green-700 border-green-200" onClick={showExportOptions} title="Export Data">
                        <i className="bi bi-file-earmark-spreadsheet" /> <span>Export</span>
                    </button>
                    <button className="jt__btn" onClick={fetchJournals} title="Refresh Data">
                        <i className="bi bi-arrow-clockwise" />
                    </button>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="jt__toolbar">
                <div className="jt__searchGroup">
                    <i className="bi bi-search" />
                    <input
                        type="text"
                        placeholder="Cari guru, mapel, atau materi..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="jt__searchInput"
                    />
                </div>

                <div className="jt__filterGroup">
                    <div className="jt__filterItem">
                        <Select
                            placeholder="Pilih Guru"
                            options={guruOptions}
                            isClearable
                            onChange={(opt: any) => setSelectedTeacher(opt ? opt.value : null)}
                            className="jt__select"
                            styles={customSelectStyles}
                        />
                    </div>
                    <div className="jt__filterItem">
                        <Select
                            placeholder="Mapel"
                            options={mapelOptions}
                            isClearable
                            onChange={(opt: any) => setSelectedSubject(opt ? opt.value : null)}
                            className="jt__select"
                            styles={customSelectStyles}
                        />
                    </div>
                    <div className="jt__filterItem">
                        <Select
                            placeholder="Kelas"
                            options={kelasOptions}
                            isClearable
                            onChange={(opt: any) => setSelectedClass(opt ? opt.value : null)}
                            className="jt__select"
                            styles={customSelectStyles}
                        />
                    </div>
                </div>
            </div>

            {/* ===== Table (Desktop/Tablet) ===== */}
            <div className="jt__tableWrap">
                <table className="jt__table">
                    <thead>
                        <tr>
                            <th className="cTanggalHari">Hari/Tanggal</th>
                            <th className="cJam">Jam Ke</th>
                            <th className="cGuruMapel">Guru & Mapel</th>
                            <th className="cKelas">Kelas</th>
                            <th className="cKategori">Kategori</th>
                            <th className="cMateriRefleksi hidden-lg">Materi & Refleksi</th>
                            <th className="cAksi">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="jt__empty">
                                    <div className="jt__loading">
                                        <div className="jt__spinner"></div>
                                        Memuat data...
                                    </div>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={7} className="jt__empty jt__error">
                                    <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
                                    Error: {error}
                                </td>
                            </tr>
                        ) : finalDisplayData.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="jt__empty jt__muted">
                                    <div className="jt__emptyContent">
                                        <i className="bi bi-journal-x" aria-hidden="true" />
                                        <div>Tidak ada data jurnal</div>
                                        <div className="jt__emptySub">Coba ubah filter atau tambahkan data baru</div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            finalDisplayData.map((journal: any, index: number) => (
                                <tr key={journal.id}>
                                    <td>
                                        <div className="jt__day">{journal.hari}</div>
                                        <div className="jt__date">{journal.tanggal}</div>
                                    </td>
                                    <td>
                                        {(() => {
                                            let jamStr = String(journal.jam_ke || '');
                                            let timeDisplay = jamStr; // default
                                            let jamLabel = `Jam ke: ${jamStr}`;

                                            // Parse range "3-5" or single "3"
                                            const parts = jamStr.split('-').map(s => s.trim());
                                            const startJam = parts[0];
                                            const endJam = parts.length > 1 ? parts[1] : startJam;

                                            // Check if it's a numeric-like jam (old legacy data might be '11:20 - 12:00')
                                            const isNumeric = !isNaN(Number(startJam));

                                            if (isNumeric && allWaktu.length > 0) {
                                                const startSch = allWaktu.find((w: any) => String(w.jam_ke) === startJam && w.hari === journal.hari);
                                                const endSch = allWaktu.find((w: any) => String(w.jam_ke) === endJam && w.hari === journal.hari);

                                                if (startSch && endSch && startSch.mulai && endSch.selesai) {
                                                    timeDisplay = `${startSch.mulai.slice(0, 5)} - ${endSch.selesai.slice(0, 5)}`;
                                                }
                                                // If we successfully found time, main display is Time, sub is Jam

                                            } else {
                                                // Legacy or unknown format.
                                                // Try to use journal.jam_ke_id if available for sub label?
                                                if (journal.jam_ke_id) jamLabel = `Jam ke: ${journal.jam_ke_id}`;
                                            }

                                            return (
                                                <>
                                                    <div className="jt__jamMain whitespace-nowrap font-bold text-navy-700">{timeDisplay}</div>
                                                    <div className="jt__jamSub whitespace-nowrap text-slate-500 text-xs">{jamLabel}</div>
                                                </>
                                            )
                                        })()}
                                    </td>
                                    <td>
                                        <div className="jt__guru">{journal.nama_guru}</div>
                                        {['diganti', 'tukaran', 'tim teaching', 'guru pengganti'].includes((journal.kategori_kehadiran || '').toLowerCase()) && journal.guru_pengganti && (
                                            <div className="text-xs font-semibold text-amber-600 mt-0.5 mb-1 flex items-center gap-1">
                                                <i className="bi bi-arrow-right" title="Digantikan oleh"></i> <span>{journal.guru_pengganti}</span>
                                            </div>
                                        )}
                                        <div className="jt__mapel">{journal.mata_pelajaran}</div>
                                    </td>
                                    <td className="jt__kelas">{journal.kelas}</td>
                                    <td>
                                        <span className={getCategoryClass(journal.kategori_kehadiran)}>
                                            {journal.kategori_kehadiran}
                                        </span>
                                    </td>
                                    <td className="jt__materiRefleksi hidden-lg">
                                        <div className="text-xs font-medium text-slate-800 mb-1 line-clamp-1" title={journal.materi || ''}>
                                            {journal.materi || '-'}
                                        </div>
                                        {journal.refleksi && (
                                            <div className="text-[0.7rem] text-slate-500 italic border-l-2 border-slate-200 pl-2 line-clamp-1" title={journal.refleksi}>
                                                "{journal.refleksi}"
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div className="jt__rowActions">
                                            <button
                                                className="jt__iconBtn"
                                                onClick={() => { setSelectedJournal(journal); setShowDetailModal(true); }}
                                                title="Lihat Detail"
                                            >
                                                <i className="bi bi-eye" aria-hidden="true" />
                                            </button>

                                            {(() => {
                                                const isOwner = journal.nip === user?.nip || journal.nama_guru === user?.nama;
                                                const isSubstitute = journal.guru_pengganti && journal.guru_pengganti === user?.nama;
                                                const hasFullAccess = canDo('update_any') || isAdmin;
                                                const canEditLimited = canDo('edit_materi_refleksi') && (isSubstitute || (!journal.guru_pengganti && isOwner));

                                                if (hasFullAccess || canEditLimited) {
                                                    return (
                                                        <button
                                                            className={`jt__iconBtn ${canEditLimited && !hasFullAccess ? 'isLimited' : ''}`}
                                                            onClick={() => { setEditJournal(journal); setShowEditModal(true); }}
                                                            title={hasFullAccess ? "Edit Full" : "Edit Materi & Refleksi"}
                                                        >
                                                            <i className="bi bi-pencil" aria-hidden="true" />
                                                        </button>
                                                    );
                                                }
                                                return null;
                                            })()}

                                            {(canDo('delete_any') || isAdmin) && (
                                                <button
                                                    className="jt__iconBtn danger"
                                                    onClick={() => handleDelete(journal.allIds || journal.id)}
                                                    title="Hapus Jurnal"
                                                >
                                                    <i className="bi bi-trash" aria-hidden="true" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ===== Mobile Cards ===== */}
            <div className="jt__cards">
                {loading ? (
                    <div className="jt__card">
                        <div className="jt__cardHead">
                            <div className="jt__cardTitle">
                                <div className="jt__cardName">Memuat data...</div>
                                <div className="jt__cardSub">Mohon tunggu</div>
                            </div>
                        </div>
                    </div>
                ) : journals.length === 0 ? (
                    <div className="jt__card">
                        <div className="jt__cardHead">
                            <div className="jt__cardTitle">
                                <div className="jt__cardName">Tidak ada data</div>
                                <div className="jt__cardSub">Belum ada jurnal</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    finalDisplayData.map((journal: any) => (
                        <div className="jt__card" key={`m-${journal.id}`}>
                            <div className="jt__cardHead">
                                <div className="jt__cardTitle">
                                    <div className="jt__cardName">
                                        {journal.nama_guru}
                                        {['diganti', 'tukaran', 'tim teaching', 'guru pengganti'].includes((journal.kategori_kehadiran || '').toLowerCase()) && journal.guru_pengganti && (
                                            <div className="text-xs text-amber-600 font-normal mt-0.5 flex items-center gap-1">
                                                <i className="bi bi-arrow-right"></i> {journal.guru_pengganti}
                                            </div>
                                        )}
                                    </div>
                                    <div className="jt__cardSub">{journal.tanggal} • {journal.hari}</div>
                                </div>
                                <div className="jt__cardStatus">
                                    <span className={getCategoryClass(journal.kategori_kehadiran)}>
                                        {journal.kategori_kehadiran}
                                    </span>
                                </div>
                            </div>

                            <div className="jt__cardBody">
                                <div className="jt__kv">
                                    <div className="jt__k">Kelas</div>
                                    <div className="jt__v">{journal.kelas}</div>
                                </div>
                                <div className="jt__kv">
                                    <div className="jt__k">Waktu</div>
                                    <div className="jt__v">
                                        {(() => {
                                            let jamStr = String(journal.jam_ke || '');
                                            const parts = jamStr.split('-').map(s => s.trim());
                                            const startJam = parts[0];
                                            const endJam = parts.length > 1 ? parts[1] : startJam;
                                            const isNumeric = !isNaN(Number(startJam));

                                            if (isNumeric && allWaktu.length > 0) {
                                                const startSch = allWaktu.find((w: any) => String(w.jam_ke) === startJam && w.hari === journal.hari);
                                                const endSch = allWaktu.find((w: any) => String(w.jam_ke) === endJam && w.hari === journal.hari);
                                                if (startSch && endSch) {
                                                    return `${startSch.mulai?.slice(0, 5)} - ${endSch.selesai?.slice(0, 5)} (Jam ${jamStr})`;
                                                }
                                            }
                                            return jamStr;
                                        })()}
                                    </div>
                                </div>
                                <div className="jt__kv">
                                    <div className="jt__k">Mata Pelajaran</div>
                                    <div className="jt__v">{journal.mata_pelajaran}</div>
                                </div>
                            </div>

                            <div className="jt__cardActions">
                                <button
                                    className="jt__iconBtn"
                                    onClick={() => { setSelectedJournal(journal); setShowDetailModal(true); }}
                                    title="Detail"
                                >
                                    <i className="bi bi-eye" aria-hidden="true" />
                                </button>

                                {(() => {
                                    const isOwner = journal.nip === user?.nip || journal.nama_guru === user?.nama;
                                    const isSubstitute = journal.guru_pengganti && journal.guru_pengganti === user?.nama;
                                    const hasFullAccess = canDo('update_any') || isAdmin;
                                    const canEditLimited = canDo('edit_materi_refleksi') && (isSubstitute || (!journal.guru_pengganti && isOwner));

                                    if (hasFullAccess || canEditLimited) {
                                        return (
                                            <button
                                                className={`jt__iconBtn ${canEditLimited && !hasFullAccess ? 'isLimited' : ''}`}
                                                onClick={() => { setEditJournal(journal); setShowEditModal(true); }}
                                                title={hasFullAccess ? "Edit Full" : "Edit Materi & Refleksi"}
                                            >
                                                <i className="bi bi-pencil" aria-hidden="true" />
                                            </button>
                                        );
                                    }
                                    return null;
                                })()}

                                {(canDo('delete_any') || isAdmin) && (
                                    <button
                                        className="jt__iconBtn danger"
                                        onClick={() => handleDelete(journal.allIds || journal.id)}
                                        title="Hapus"
                                    >
                                        <i className="bi bi-trash" aria-hidden="true" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ===== Footer ===== */}
            {journals.length > 0 && (
                <div className="jt__footer">
                    <div className="jt__summary">
                        <i className="bi bi-bar-chart-line-fill" aria-hidden="true" />
                        <span>Total: {journals.length} jurnal</span>
                    </div>
                    <div className="jt__timestamp">
                        Data terakhir diperbarui
                    </div>
                </div>
            )}

            {/* ===== Modal Detail ===== */}
            {showDetailModal && selectedJournal && (
                <div className="jt__modal" onClick={() => setShowDetailModal(false)}>
                    <div className="jt__modalContent" onClick={(e) => e.stopPropagation()}>
                        <div className="jt__modalHeader">
                            <h3>Detail Jurnal</h3>
                            <button className="jt__modalClose" onClick={() => setShowDetailModal(false)}>
                                <i className="bi bi-x-lg" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="jt__modalBody">
                            <div className="jt__detailGrid">
                                <div className="jt__detailItem">
                                    <div className="jt__detailLabel">Tanggal</div>
                                    <div className="jt__detailValue">{selectedJournal.tanggal}</div>
                                </div>
                                <div className="jt__detailItem">
                                    <div className="jt__detailLabel">Hari</div>
                                    <div className="jt__detailValue">{selectedJournal.hari}</div>
                                </div>
                                <div className="jt__detailItem">
                                    <div className="jt__detailLabel">Jam Ke</div>
                                    <div className="jt__detailValue">{selectedJournal.jam_ke}</div>
                                </div>
                                <div className="jt__detailItem">
                                    <div className="jt__detailLabel">Guru</div>
                                    <div className="jt__detailValue">{selectedJournal.nama_guru}</div>
                                </div>
                                <div className="jt__detailItem">
                                    <div className="jt__detailLabel">Kelas</div>
                                    <div className="jt__detailValue">{selectedJournal.kelas}</div>
                                </div>
                                <div className="jt__detailItem">
                                    <div className="jt__detailLabel">Mata Pelajaran</div>
                                    <div className="jt__detailValue">{selectedJournal.mata_pelajaran}</div>
                                </div>
                                <div className="jt__detailItem">
                                    <div className="jt__detailLabel">Kategori</div>
                                    <div className="jt__detailValue">
                                        <span className={getCategoryClass(selectedJournal.kategori_kehadiran)}>
                                            {selectedJournal.kategori_kehadiran}
                                        </span>
                                    </div>
                                </div>
                                <div className="jt__detailItem">
                                    <div className="jt__detailLabel">NIP</div>
                                    <div className="jt__detailValue">{selectedJournal.nip}</div>
                                </div>

                                {selectedJournal.keterangan_terlambat && (
                                    <div className="jt__detailItem col-span-2">
                                        <div className="jt__detailLabel text-amber-600">Alasan Terlambat</div>
                                        <div className="jt__detailValue">{selectedJournal.keterangan_terlambat}</div>
                                    </div>
                                )}

                                {selectedJournal.guru_pengganti && (
                                    <>
                                        <div className="jt__detailItem">
                                            <div className="jt__detailLabel text-blue-600">Guru Pengganti / Mitra</div>
                                            <div className="jt__detailValue">{selectedJournal.guru_pengganti}</div>
                                        </div>
                                        <div className="jt__detailItem">
                                            <div className="jt__detailLabel text-blue-600">Status Kehadiran Pengganti</div>
                                            <div className="jt__detailValue">{selectedJournal.status_pengganti || '-'}</div>
                                        </div>
                                    </>
                                )}

                                {selectedJournal.guru_piket && (
                                    <div className="jt__detailItem">
                                        <div className="jt__detailLabel">Guru Piket</div>
                                        <div className="jt__detailValue">{selectedJournal.guru_piket}</div>
                                    </div>
                                )}

                                {selectedJournal.keterangan_tambahan && (
                                    <div className="jt__detailItem col-span-2">
                                        <div className="jt__detailLabel">Keterangan Tambahan</div>
                                        <div className="jt__detailValue">{selectedJournal.keterangan_tambahan}</div>
                                    </div>
                                )}
                                <div className="jt__detailItem col-span-2">
                                    <div className="jt__detailLabel">Materi</div>
                                    <div className="jt__detailValue text-sm font-sans leading-relaxed text-slate-700">
                                        {selectedJournal.materi || '-'}
                                    </div>
                                </div>
                                <div className="jt__detailItem col-span-2">
                                    <div className="jt__detailLabel">Refleksi</div>
                                    <div className="jt__detailValue text-xs italic text-slate-600 leading-relaxed border-l-2 border-slate-200 pl-3">
                                        "{selectedJournal.refleksi || '-'}"
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Modal Add/Edit Comprehensive ===== */}
            {/* ===== Modal Add/Edit Comprehensive (NEW) ===== */}
            {(showAddModal || showEditModal) && (
                masterDataState ? (
                    <JournalModal
                        isOpen={showAddModal || showEditModal}
                        onClose={() => { setShowAddModal(false); setShowEditModal(false); setEditJournal(null); }}
                        mode={showEditModal ? 'edit' : 'add'}
                        initialData={showEditModal ? editJournal : null}
                        user={user}
                        masterData={masterDataState}
                        onSuccess={fetchJournals}
                        limited={
                            showEditModal &&
                            canDo('edit_materi_refleksi') &&
                            !canDo('update_any') &&
                            !isAdmin &&
                            (
                                (editJournal?.guru_pengganti === user?.nama) ||
                                (!editJournal?.guru_pengganti && (editJournal?.nip === user?.nip || editJournal?.nama_guru === user?.nama))
                            )
                        }
                    />
                ) : (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                        <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center gap-4 animate-bounce-in">
                            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <span className="font-medium text-slate-700">Menyiapkan data form...</span>
                        </div>
                    </div>
                )
            )}

            <style jsx>{`
:global(:root) {
  --jt-line: rgba(30, 58, 138, 0.35);
  --jt-card: rgba(248, 250, 252, 0.98);
  --jt-shadow: 0 25px 60px rgba(30, 58, 138, 0.18);
  --jt-shadow2: 0 20px 45px rgba(30, 58, 138, 0.22);
  --jt-shadow3: 0 10px 25px rgba(30, 58, 138, 0.15);
  --jt-shadow4: 0 4px 12px rgba(30, 58, 138, 0.1);
  --jt-radius: 28px;
  --jt-radius-sm: 16px;
  --jt-radius-lg: 32px;
  --jt-fs: 0.9rem;
  --jt-fs-sm: 0.84rem;
  --jt-fs-xs: 0.8rem;
  --jt-safe-b: env(safe-area-inset-bottom, 0px);
  --jt-navy: #1e40af;
  --jt-navy-light: rgba(30, 64, 175, 0.12);
  --jt-navy-medium: rgba(30, 64, 175, 0.65);
  --jt-navy-dark: #1e3a8a;
  --jt-navy-accent: #3b82f6;
  --jt-navy-accent-light: rgba(59, 130, 246, 0.1);
  --jt-navy-bg: linear-gradient(135deg, #1e3a8a, #1e40af);
  --jt-navy-bg-light: linear-gradient(135deg, rgba(30, 58, 138, 0.18), rgba(30, 64, 175, 0.18));
  --jt-navy-bg-darker: linear-gradient(135deg, #1e3a8a, #1e40af);
  --jt-transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --jt-transition-fast: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  --jt-transition-slow: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.jt {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20px;
  background: transparent;
}

.jt__pageHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fff;
    padding: 28px 32px;
    border-radius: var(--jt-radius);
    border: 1px solid rgba(15, 42, 86, 0.08);
    box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
    margin-bottom: 20px;
}

.jt__toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    background: #fff;
    padding: 16px 20px;
    border-radius: var(--jt-radius);
    border: 1px solid var(--jt-line);
    box-shadow: var(--jt-shadow2);
    align-items: center;
}

.jt__searchGroup {
    position: relative;
    flex: 1;
    min-width: 250px;
}

.jt__searchGroup i {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--jt-navy-medium);
}

.jt__searchInput {
    width: 100%;
    padding: 10px 14px 10px 40px;
    border-radius: 12px;
    border: 1px solid rgba(30, 58, 138, 0.2);
    outline: none;
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s;
}

.jt__searchInput:focus {
    border-color: var(--jt-navy-accent);
    box-shadow: 0 0 0 3px rgba(30, 58, 138, 0.1);
}

.jt__filterGroup {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    flex: 2;
}

.jt__filterItem {
    flex: 1;
    min-width: 160px;
}

.jt__select {
    width: 100%;
}

.jt__actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.jt__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 40px;
  padding: 8px 16px;
  border-radius: 12px;
  border: 1px solid var(--jt-line);
  background: rgba(255, 255, 255, 0.78);
  color: var(--jt-navy-dark);
  font-weight: 600;
  font-size: var(--jt-fs-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.jt__btnPrimary {
  background: var(--jt-navy-bg);
  color: #fff;
  border: none;
}

.jt__btnPrimary:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(30, 58, 138, 0.3);
}

/* ========= TABLE ========= */
.jt__tableWrap {
  width: 100%;
  overflow-x: auto;
  border-radius: var(--jt-radius);
  border: 1px solid rgba(15, 42, 86, 0.08);
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.04);
}

.jt__table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 900px;
}

/* Explicit Column Widths to prioritize Content */
.cTanggalHari { width: 140px; }
.cJam { width: 110px; }
.cGuruMapel { width: 280px; } /* Increased from 200px */
.cKelas { width: 110px; }
.cKategori { width: 230px; } /* Increased to fit full text */
.cAksi { width: 90px; }
.cMateriRefleksi {
    min-width: 200px;
}

.jt__table thead th {
  background: #f8fafc;
  padding: 16px 18px;
  text-align: left;
  border-bottom: 1px solid rgba(15, 42, 86, 0.08);
  font-weight: 700;
  color: #475569;
  font-size: 0.75rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.jt__table td {
  padding: 16px 18px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
  font-size: 0.88rem;
  transition: background 0.2s;
}

.jt__table tbody tr:hover td {
    background: #fcfdfe;
}

.jt__day { font-weight: 500; color: var(--jt-navy-dark); font-size: 0.82rem; } /* Reduced from 0.9rem */
.jt__date { font-size: 0.7rem; color: #64748b; } /* Reduced from 0.75rem */
.jt__jamMain { font-weight: 500; color: var(--jt-navy-accent); font-size: 0.82rem; } /* Reduced from 0.9rem */
.jt__jamSub { font-size: 0.7rem; color: #94a3b8; } /* Reduced from 0.75rem */
.jt__guru { font-weight: 500; font-size: 0.82rem; } /* Reduced from 0.9rem */
.jt__mapel { font-size: 0.7rem; color: #64748b; } /* Reduced from 0.75rem/0.8rem */

/* Duplicate/extra rule cleanup if present, consolidating styles */

.sk__status {
    padding: 4px 10px; /* Slightly reduced padding */
    border-radius: 20px;
    font-size: 0.7rem; /* Reduced from 0.75rem */
    font-weight: 500;
    white-space: nowrap;
    text-align: center;
    line-height: 1.2;
    display: inline-block;
}
.sk__status.isOn { background: rgba(34, 197, 94, 0.1); color: #16a34a; }
.sk__status.isWarning { background: rgba(245, 158, 11, 0.1); color: #d97706; }
.sk__status.isInfo { background: rgba(59, 130, 246, 0.1); color: #2563eb; }
.sk__status.isOff { background: rgba(100, 116, 139, 0.1); color: #64748b; }

.jt__rowActions { display: flex; gap: 8px; justify-content: flex-end; }
.jt__iconBtn {
    width: 32px; height: 32px; border-radius: 8px;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--jt-line);
    background: #fff; color: var(--jt-navy-medium);
    cursor: pointer;
}
.jt__iconBtn:hover { transform: scale(1.1); background: var(--jt-navy-light); }
.jt__iconBtn.danger { color: #ef4444; }

/* ========= MOBILE CARDS ========= */
.jt__cards { display: flex; flex-direction: column; gap: 16px; }
.jt__card {
    background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
    padding: 24px;
    border-radius: var(--jt-radius);
    border: 1px solid var(--jt-line);
    box-shadow: var(--jt-shadow2);
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}
.jt__card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: var(--jt-navy-bg);
    border-radius: var(--jt-radius) var(--jt-radius) 0 0;
}
.jt__card:hover {
    transform: translateY(-4px);
    box-shadow: 0 30px 60px rgba(30, 41, 59, 0.25);
}
.jt__cardHead { display: flex; justify-content: space-between; margin-bottom: 20px; align-items: flex-start; }
.jt__cardTitle { flex: 1; }
.jt__cardName { font-weight: 700; font-size: 1.1rem; color: var(--jt-navy-dark); margin-bottom: 4px; }
.jt__cardSub { font-size: 0.85rem; color: #64748b; }
.jt__cardStatus { margin-left: 12px; }
.jt__cardBody { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; font-size: 0.9rem; }
.jt__kv {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid rgba(30, 41, 59, 0.1);
}
.jt__k { color: var(--jt-navy-medium); font-weight: 600; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; }
.jt__v { color: var(--jt-navy-dark); font-weight: 500; }
.jt__cardActions { display: flex; gap: 12px; justify-content: flex-end; }

/* ========= MODAL ========= */
.jt__modal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 900; padding: 20px; backdrop-filter: blur(4px); }
.jt__modalContent { background: #fff; border-radius: var(--jt-radius); width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
.jt__modalHeader { padding: 20px; border-bottom: 1px solid var(--jt-line); display: flex; justify-content: space-between; align-items: center; }
.jt__modalBody { padding: 24px; }
.jt__detailGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.jt__detailItem { display: flex; flex-direction: column; gap: 4px; }
.jt__detailLabel { font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600; }
.jt__detailValue { font-weight: 400; }
.col-span-2 { grid-column: span 2; }

/* Detail Modal Enhancements */
.jt__modal--detail { background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); }
.jt__modalContent--detail { max-width: 700px; border-radius: 32px; box-shadow: 0 40px 80px rgba(0,0,0,0.3); }
.jt__modalHeader--detail { background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%); color: white; padding: 32px; border-bottom: none; border-radius: 32px 32px 0 0; }
.jt__modalTitle { display: flex; align-items: center; gap: 16px; }
.jt__modalIcon { width: 48px; height: 48px; background: rgba(255,255,255,0.15); border-radius: 16px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); }
.jt__modalHeading { margin: 0; font-size: 1.5rem; font-weight: 700; }
.jt__modalSubheading { margin: 0; font-size: 0.9rem; opacity: 0.9; }
.jt__modalClose--detail { width: 40px; height: 40px; background: rgba(255,255,255,0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; transition: all 0.2s; }
.jt__modalClose--detail:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
.jt__modalBody--detail { padding: 32px; background: #fafbfc; }

.jt__detailOverview { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 32px; }
.jt__overviewCard { background: white; padding: 24px; border-radius: 20px; border: 1px solid rgba(30,58,138,0.1); box-shadow: 0 8px 24px rgba(30,58,138,0.08); transition: all 0.3s ease; }
.jt__overviewCard:hover { transform: translateY(-4px); box-shadow: 0 12px 32px rgba(30,58,138,0.12); }
.jt__overviewIcon { width: 48px; height: 48px; background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%); border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white; margin-bottom: 16px; }
.jt__overviewContent { }
.jt__overviewLabel { font-size: 0.8rem; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.jt__overviewValue { font-size: 1.1rem; font-weight: 700; color: #1e3a8a; margin-bottom: 2px; }
.jt__overviewSub { font-size: 0.85rem; color: #94a3b8; }

.jt__replacementNotice { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 16px; padding: 20px; margin-bottom: 24px; }
.jt__replacementIcon { width: 32px; height: 32px; background: #f59e0b; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; margin-bottom: 12px; }
.jt__replacementContent { }
.jt__replacementLabel { font-size: 0.9rem; font-weight: 600; color: #92400e; margin-bottom: 4px; }
.jt__replacementValue { font-size: 1rem; font-weight: 700; color: #78350f; margin-bottom: 2px; }
.jt__replacementSub { font-size: 0.8rem; color: #a16207; }

.jt__detailSections { display: flex; flex-direction: column; gap: 20px; }
.jt__detailSection { background: white; border-radius: 16px; border: 1px solid rgba(30,58,138,0.1); overflow: hidden; }
.jt__sectionHeader { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); padding: 16px 20px; border-bottom: 1px solid rgba(30,58,138,0.08); display: flex; align-items: center; gap: 12px; }
.jt__sectionHeader i { color: #3b82f6; font-size: 1.1rem; }
.jt__sectionHeader span { font-weight: 600; color: #374151; }
.jt__sectionContent { padding: 20px; color: #4b5563; line-height: 1.6; }

.animate-modal-in { animation: modalSlideIn 0.3s ease-out; }
@keyframes modalSlideIn {
    from { opacity: 0; transform: scale(0.9) translateY(-20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}

/* ========= FORM ELEMENTS ========= */
.jt__formLabel {
    display: block;
    font-size: 0.75rem;
    font-weight: 800;
    color: var(--jt-navy-medium);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
    margin-left: 4px;
}

.jt__formInput {
    width: 100%;
    padding: 12px 16px;
    border-radius: 12px;
    border: 1px solid rgba(30, 58, 138, 0.2);
    font-size: 0.9rem;
    font-weight: 500;
    transition: all 0.2s;
    background: #fff;
    outline: none;
}

.jt__formInput:focus {
    border-color: var(--jt-navy-accent);
    box-shadow: 0 0 0 4px rgba(30, 58, 138, 0.1);
}

.jt__formInput[readonly] {
    background: #f8fafc;
    color: #64748b;
    cursor: default;
}

.jt__modalActions {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 12px;
}

.custom-scrollbar::-webkit-scrollbar {
    width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
    background: var(--jt-navy-light);
    border-radius: 10px;
}

@media (max-width: 1024px) {
    .hidden-lg { display: none; }
}

@media (max-width: 768px) {
  .jt__tableWrap { display: none; }
  .jt__modalContent { max-width: 95%; padding: 10px; }
  .jt__detailGrid { grid-template-columns: 1fr; }
}
@media (min-width: 769px) {
  .jt__cards { display: none; }
}

            `}</style>

            {/* Mobile Floating Action Button (FAB) */}
            <button
                className="fixed bottom-6 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center md:hidden z-50 hover:bg-blue-700 active:scale-95 transition-all"
                onClick={() => setShowAddModal(true)}
                disabled={!canDo('create')}
            >
                <i className="bi bi-plus-lg text-2xl"></i>
            </button>
        </div>
    );
}

export default function JurnalPage({ user }: { user?: any }) {
    return (
        <div className="jurnal-page-wrapper">
            <Suspense fallback={<div className="p-12 text-center text-gray-500">Memuat jurnal pembelajaran...</div>}>
                <JurnalContent user={user} />
            </Suspense>
            <style jsx>{`
                .jurnal-page-wrapper {
                    padding-bottom: 2rem;
                }
            `}</style>
        </div>
    );
}

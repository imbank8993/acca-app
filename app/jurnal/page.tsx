'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Select from 'react-select';
import { hasPermission } from '@/lib/permissions-client';
import XLSX from 'xlsx-js-style';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import JournalModal from './components/JournalModal';
import JurnalDetailModal from './components/JurnalDetailModal';
import Pagination from '@/components/ui/Pagination';

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
        borderRadius: '16px',
        border: state.isFocused ? '1.5px solid var(--n-primary)' : '1px solid var(--n-border)',
        boxShadow: state.isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
        '&:hover': {
            borderColor: 'var(--n-primary-light)',
        },
        padding: '2px 6px',
        fontSize: '0.88rem',
        fontWeight: '520',
        backgroundColor: 'var(--n-card)',
        color: 'var(--n-ink)',
        minHeight: '42px',
    }),
    placeholder: (base: any) => ({
        ...base,
        color: 'var(--n-muted)',
    }),
    singleValue: (base: any) => ({
        ...base,
        color: 'var(--n-ink)',
    }),
    input: (base: any) => ({
        ...base,
        color: 'var(--n-ink)',
    }),
    option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isSelected
            ? 'var(--n-primary)'
            : state.isFocused
                ? 'var(--n-soft)'
                : 'var(--n-card)',
        color: state.isSelected ? '#ffffff' : 'var(--n-ink)',
        fontSize: '0.88rem',
        fontWeight: state.isSelected ? '600' : '500',
        cursor: 'pointer',
    }),
    menu: (base: any) => ({
        ...base,
        zIndex: 9999,
        backgroundColor: 'var(--n-card)',
        border: '1px solid var(--n-border)',
        boxShadow: 'var(--n-shadow)',
        borderRadius: '16px',
        marginTop: '6px',
        overflow: 'hidden'
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

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10); // Default items per page

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

    const normalize = (s: any) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');

    useEffect(() => {
        if (user?.nip) {
            fetchJournals();
        }
    }, [searchParams, user?.nip, user?.nama]);

    const fetchJournals = async () => {
        setLoading(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams();

            // Logic for Role-Based Data Visibility
            const isGuruOnly = isGuru && !isAdmin && !isOPJurnal && !isKepala;

            if (isGuruOnly && user) {
                // Restricted teachers see their own entries OR where they are substitute
                if (user.nip) queryParams.append('nip', user.nip);
                if (user.nama) queryParams.append('nama', user.nama);
                queryParams.append('restricted', 'true');
            } else {
                // Privileged users see everything by default, unless they selected someone in URL
                if (urlFilters.nip) queryParams.append('nip', urlFilters.nip);
            }

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

        const result = await Swal.fire({
            title: 'Hapus Jurnal?',
            text: `Yakin ingin menghapus ${idsArray.length > 1 ? idsArray.length + ' data jurnal ini sekaligus?' : 'data jurnal ini?'}`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Hapus!',
            cancelButtonText: 'Batal',
            reverseButtons: true
        });

        if (!result.isConfirmed) return;

        try {
            // Loop for delete or we could update API to handle array
            for (const id of idsArray) {
                const response = await fetch(`/api/jurnal?id=${id}`, {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error('Gagal menghapus data dengan ID ' + id);
            }

            Swal.fire({
                title: 'Berhasil',
                text: 'Data jurnal berhasil dihapus',
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            fetchJournals();
        } catch (err: any) {
            Swal.fire('Gagal', 'Terjadi kesalahan: ' + err.message, 'error');
        }
    };


    const checkNameMatch = (name1: string, name2: string) => {
        if (!name1 || !name2) return false;
        const n1 = normalize(name1);
        const n2 = normalize(name2);
        return n1 === n2 || (n1.length > 3 && n2.includes(n1)) || (n2.length > 3 && n1.includes(n2));
    };

    const isJournalRelated = (j: Journal, nip: string, name: string) => {
        if (!nip && !name) return false;
        const uNip = String(nip || '').trim();
        const uName = normalize(name);

        const matchNip = uNip && String(j.nip || '').trim() === uNip;
        const matchOrigName = checkNameMatch(j.nama_guru, name);
        const matchSubName = checkNameMatch(j.guru_pengganti || '', name);

        return !!(matchNip || matchOrigName || matchSubName);
    };

    const filteredJournals = journals.filter(j => {
        // 1. Mandatory data restriction for non-privileged teachers
        const isGuruOnly = isGuru && !isAdmin && !isOPJurnal && !isKepala;
        if (isGuruOnly && user) {
            if (!isJournalRelated(j, user.nip, user.nama)) return false;
        }

        // 2. Filter by selected criteria
        if (selectedTeacher) {
            const matchOrig = checkNameMatch(j.nama_guru, selectedTeacher);
            const matchSub = checkNameMatch(j.guru_pengganti || '', selectedTeacher);
            if (!matchOrig && !matchSub) return false;
        }
        if (selectedSubject && j.mata_pelajaran !== selectedSubject) return false;
        if (selectedClass && j.kelas !== selectedClass) return false;

        // 3. Search term logic
        if (searchTerm) {
            const ls = searchTerm.toLowerCase();
            const fieldsToSearch = [
                j.nama_guru,
                j.guru_pengganti,
                j.mata_pelajaran,
                j.kelas,
                j.materi,
                j.refleksi,
                j.hari,
                j.tanggal,
                j.jam_ke,
                j.kategori_kehadiran,
                j.keterangan_terlambat,
                j.keterangan_tambahan,
                j.guru_piket,
                j.nip
            ];

            const isMatch = fieldsToSearch.some(field =>
                String(field || '').toLowerCase().includes(ls)
            );

            if (!isMatch) return false;
        }

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

    // Pagination Logic
    useEffect(() => {
        setCurrentPage(1);
    }, [filteredJournals.length, searchTerm, selectedTeacher, selectedSubject, selectedClass]);

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const paginatedData = finalDisplayData.slice(indexOfFirstItem, indexOfLastItem);

    const handleExport = async (mode: 'GURU' | 'WALI' | 'ADMIN' | 'KEPALA') => {
        let exportRaw = [...journals];
        let filename = 'Jurnal_Export';

        if (mode === 'GURU' && user) {
            // Force filter to ONLY current user's data (original or substitute)
            exportRaw = exportRaw.filter(j => isJournalRelated(j, user.nip, user.nama));
            filename = `Jurnal_Personal_${user.nama || 'Guru'}`;
        } else if (mode === 'WALI') {
            // Wali filters...
        }

        // Apply UI Filters to export data
        if (selectedTeacher) {
            exportRaw = exportRaw.filter(j => {
                const matchOrig = checkNameMatch(j.nama_guru, selectedTeacher);
                const matchSub = checkNameMatch(j.guru_pengganti || '', selectedTeacher);
                return matchOrig || matchSub;
            });
        }
        if (selectedSubject) exportRaw = exportRaw.filter(j => j.mata_pelajaran === selectedSubject);
        if (selectedClass) exportRaw = exportRaw.filter(j => j.kelas === selectedClass);
        if (searchTerm) {
            const ls = searchTerm.toLowerCase();
            exportRaw = exportRaw.filter(j =>
                (j.nama_guru || '').toLowerCase().includes(ls) ||
                (j.guru_pengganti || '').toLowerCase().includes(ls) ||
                (j.mata_pelajaran || '').toLowerCase().includes(ls) ||
                (j.kelas || '').toLowerCase().includes(ls) ||
                (j.materi || '').toLowerCase().includes(ls)
            );
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
                const startSch = allWaktu.find((w: any) => String(w.jam_ke) === String(firstId) && w.hari === j.hari);
                const endSch = allWaktu.find((w: any) => String(w.jam_ke) === String(lastId) && w.hari === j.hari);
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
                    <h1>Jurnal Pembelajaran</h1>
                    <p>Daftar kegiatan belajar mengajar harian</p>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="jt__toolbar">
                {/* Baris 1: Search & Actions */}
                <div className="jt__toolbarRow jt__toolbarRow--top">
                    <div className="jt__searchGroup">
                        <i className="bi bi-search" />
                        <input
                            type="text"
                            placeholder="Cari guru, mapel, materi, dll..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="jt__searchInput"
                        />
                    </div>
                    <div className="jt__actions">
                        <button
                            className="jt__btn jt__btnExport"
                            onClick={() => showExportOptions()}
                            disabled={!canDo('export')}
                            title="Export Data"
                        >
                            <i className="bi bi-file-earmark-excel" />
                            <span>Export</span>
                        </button>
                        <button
                            className="jt__btn jt__btnPrimary"
                            onClick={() => setShowAddModal(true)}
                            disabled={!canDo('create')}
                        >
                            <i className="bi bi-plus-lg" />
                            <span>Tambah</span>
                        </button>
                    </div>
                </div>

                {/* Baris 2: All Filters (Guru, Mapel, Kelas) */}
                <div className="jt__toolbarRow jt__toolbarRow--bottom">
                    <div className="jt__filterGroup">
                        <div className="jt__filterItem jt__filterItem--guru">
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
                                placeholder="Pilih Mapel"
                                options={mapelOptions}
                                isClearable
                                onChange={(opt: any) => setSelectedSubject(opt ? opt.value : null)}
                                className="jt__select"
                                styles={customSelectStyles}
                            />
                        </div>
                        <div className="jt__filterItem">
                            <Select
                                placeholder="Pilih Kelas"
                                options={kelasOptions}
                                isClearable
                                onChange={(opt: any) => setSelectedClass(opt ? opt.value : null)}
                                className="jt__select"
                                styles={customSelectStyles}
                            />
                        </div>
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
                            paginatedData.map((journal: any, index: number) => (
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
                                                    <div className="jt__jamMain whitespace-nowrap font-bold text-[var(--n-primary)]">{timeDisplay}</div>
                                                    <div className="jt__jamSub whitespace-nowrap text-[var(--n-muted)] text-xs">{jamLabel}</div>
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
                                            {(journal.kategori_kehadiran || '').toLowerCase() === 'penugasan dengan pendampingan' ? 'Penugasan DP' :
                                                (journal.kategori_kehadiran || '').toLowerCase() === 'penugasan tanpa pendampingan' ? 'Penugasan TP' :
                                                    journal.kategori_kehadiran}
                                        </span>
                                    </td>
                                    <td className="jt__materiRefleksi hidden-lg">
                                        <div className="text-xs font-medium text-[var(--n-ink)] mb-1 line-clamp-1" title={journal.materi || ''}>
                                            {journal.materi || '-'}
                                        </div>
                                        {journal.refleksi && (
                                            <div className="text-[0.7rem] text-[var(--n-muted)] italic border-l-2 border-[var(--n-border)] pl-2 line-clamp-1" title={journal.refleksi}>
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
                                                const hasSubstitute = journal.guru_pengganti && journal.guru_pengganti !== '-' && journal.guru_pengganti.trim() !== '';
                                                const isSubstitute = hasSubstitute && journal.guru_pengganti === user?.nama;

                                                const hasFullAccess = canDo('update_any') || isAdmin;
                                                // If substitute exists, only they can edit Materi/Refleksi. If not, owner can.
                                                const canEditLimited = canDo('edit_materi_refleksi') && (isSubstitute || (!hasSubstitute && isOwner));

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
                    paginatedData.map((journal: any) => (
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
                                    const hasSubstitute = journal.guru_pengganti && journal.guru_pengganti !== '-' && journal.guru_pengganti.trim() !== '';
                                    const isSubstitute = hasSubstitute && journal.guru_pengganti === user?.nama;

                                    const hasFullAccess = canDo('update_any') || isAdmin;
                                    const canEditLimited = canDo('edit_materi_refleksi') && (isSubstitute || (!hasSubstitute && isOwner));

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

            {/* ===== Footer & Pagination ===== */}
            {finalDisplayData.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(finalDisplayData.length / itemsPerPage)}
                    limit={itemsPerPage}
                    totalItems={finalDisplayData.length}
                    onPageChange={(page) => setCurrentPage(page)}
                    onLimitChange={(limit) => {
                        setItemsPerPage(limit);
                        setCurrentPage(1); // Reset to first page when limit changes
                    }}
                />
            )}

            {/* ===== Modal Detail (Premium) ===== */}
            <JurnalDetailModal
                isOpen={showDetailModal}
                onClose={() => setShowDetailModal(false)}
                journal={selectedJournal}
            />

            {/* ===== Modal Add/Edit Comprehensive ===== */}
            {/* ===== Modal Add/Edit Comprehensive (NEW) ===== */}
            {
                (showAddModal || showEditModal) && (
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
                                (() => {
                                    if (!showEditModal || isAdmin || canDo('update_any')) return false;
                                    if (!canDo('edit_materi_refleksi')) return false;

                                    const isOwner = editJournal?.nip === user?.nip || editJournal?.nama_guru === user?.nama;
                                    const hasSub = editJournal?.guru_pengganti && editJournal?.guru_pengganti !== '-' && editJournal?.guru_pengganti.trim() !== '';
                                    const isSub = hasSub && editJournal?.guru_pengganti === user?.nama;

                                    return isSub || (!hasSub && isOwner);
                                })()
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
                )
            }

            <style jsx>{`
:global(:root) {
  --jt-line: var(--n-border);
  --jt-card: var(--n-card);
  --jt-shadow: var(--n-shadow);
  --jt-radius: 20px;
  --jt-radius-sm: 14px;
  --jt-fs: 0.9rem;
  --jt-fs-sm: 0.84rem;
  --jt-navy: var(--n-primary);
  --jt-navy-light: var(--n-soft);
  --jt-navy-dark: var(--n-ink);
  --jt-navy-accent: var(--n-primary);
  --jt-navy-bg: #1e3a8a;
  --jt-transition: var(--sidebar-transition);
}

.jt {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 24px;
  background: transparent;
}

.jt__pageHeader {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #0038A8;
    padding: 1.5rem 2.75rem;
    border-radius: 28px;
    box-shadow: 0 10px 40px -10px rgba(0, 56, 168, 0.25);
    position: relative;
    overflow: hidden;
    color: white;
    animation: slideInHeader 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

:global(.dark) .jt__pageHeader {
    background: #0f172a;
    box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
}

@keyframes slideInHeader {
    from { 
        opacity: 0; 
        transform: translateX(-40px); 
    }
    to { 
        opacity: 1; 
        transform: translateX(0); 
    }
}

.jt__pageHeader::before {
    content: '';
    position: absolute;
    top: -50%; right: -10%;
    width: 400px; height: 400px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.08) 0%, transparent 70%);
    pointer-events: none;
}

.jt__pageHeader::after {
    content: '';
    position: absolute;
    bottom: -20%; left: -5%;
    width: 250px; height: 250px;
    background: radial-gradient(circle, rgba(255, 255, 255, 0.04) 0%, transparent 70%);
    pointer-events: none;
}

.jt__titleArea h1 { 
    font-family: 'Poppins', sans-serif;
    font-size: 2rem; 
    font-weight: 750; 
    color: white !important; 
    margin: 0; 
    letter-spacing: -0.01em; 
    line-height: 1.2;
}

.jt__titleArea p { 
    color: rgba(255, 255, 255, 0.85) !important; 
    margin: 6px 0 0; 
    font-size: 0.95rem; 
    font-weight: 400; 
    letter-spacing: 0.01em;
}

.jt__toolbar {
    display: flex;
    flex-direction: column;
    gap: 16px;
    background: var(--n-card);
    padding: 20px;
    border-radius: 24px;
    border: 1px solid var(--n-border);
    box-shadow: 0 4px 15px rgba(0, 56, 168, 0.03);
    opacity: 0;
    animation: slideDownToolbar 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    animation-delay: 0.15s;
    transition: background 0.3s ease, border-color 0.3s ease;
}

:global(.dark) .jt__toolbar {
    background: #0f172a;
    border-color: rgba(255, 255, 255, 0.1);
}

@keyframes slideDownToolbar {
    from { 
        opacity: 0; 
        transform: translateY(-20px); 
    }
    to { 
        opacity: 1; 
        transform: translateY(0); 
    }
}

.jt__toolbarRow {
    display: flex;
    gap: 12px;
    width: 100%;
}

.jt__toolbarRow--top {
    flex-direction: column;
}

.jt__toolbarRow--bottom {
    flex-direction: column;
}

@media (min-width: 1024px) {
    .jt__toolbarRow--top {
        flex-direction: row;
        align-items: center;
    }
    .jt__toolbarRow--bottom {
        flex-direction: row;
    }
}

.justify-end { justify-content: flex-end; }
.w-full { width: 100%; }

.jt__searchGroup {
    position: relative;
    flex: 1;
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
    padding: 12px 16px 12px 42px;
    border-radius: 14px;
    border: 1px solid var(--n-border);
    outline: none;
    font-size: 0.9rem;
    font-weight: 520;
    transition: all 0.2s;
    background: var(--n-card);
    color: var(--n-ink);
}

:global(.dark) .jt__searchInput {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
}

.jt__searchInput:focus {
    border-color: var(--n-primary);
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

:global(.dark) .jt__searchInput:focus {
    background: rgba(255, 255, 255, 0.08);
}

.jt__filterGroup {
    display: flex;
    gap: 12px;
    flex-direction: column;
    width: 100%;
}

@media (min-width: 768px) {
    .jt__filterGroup {
        flex-direction: row;
        flex-wrap: nowrap;
    }
}

.jt__filterItem {
    flex: 1;
    min-width: 0;
}

.jt__filterItem--guru {
    flex: 1.5;
}

.jt__select {
    width: 100%;
}

.jt__actions {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}

@media (min-width: 1024px) {
    .jt__actions {
        width: auto;
    }
}

.jt__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 42px;
  padding: 8px 16px;
  border-radius: 12px;
  flex: 1;
  border: 1px solid var(--n-border);
  background: var(--n-card);
  color: var(--n-ink);
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

@media (min-width: 1024px) {
    .jt__btn {
        flex: none;
        padding: 8px 20px;
    }
}

.jt__btn i {
  font-size: 1rem;
}

.jt__btn:hover {
  border-color: rgba(58, 166, 255, 0.25);
  box-shadow: 0 4px 12px rgba(58, 166, 255, 0.2);
  transform: translateY(-2px);
  filter: brightness(1.1);
}

.jt__btn:active {
  transform: translateY(0);
}

.jt__btnPrimary {
  background: var(--n-primary);
  border-color: var(--n-primary-light);
  color: #fff;
  font-weight: 650;
  box-shadow: none; 
}

.jt__btnExport {
  background: #10b981;
  border-color: rgba(16, 185, 129, 0.28);
  color: #fff;
}

/* ========= TABLE ========= */
.jt__tableWrap {
  width: 100%;
  overflow-x: auto;
  border-radius: 24px;
  border: 1px solid var(--n-border);
  background: var(--n-card);
  box-shadow: var(--n-shadow);
  /* Ensure scrolling if content still overflows on small screens */
  overflow-x: auto;
  overflow-y: hidden; 
  transition: background 0.3s ease, border-color 0.3s ease;
}

:global(.dark) .jt__tableWrap {
    background: #0f172a;
    border-color: rgba(255, 255, 255, 0.12);
}

.jt__table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 900px;
}

/* Explicit Column Widths to prioritize Content */
.cTanggalHari { width: 110px; }
.cJam { width: 95px; }
.cGuruMapel { width: 230px; min-width: 230px; white-space: normal; } /* Compact width, relies on 2-line wrap */
.cKelas { width: 90px; }
.cKategori { width: 140px; }
.cAksi { width: 110px; }
.cMateriRefleksi {
    width: 200px; 
    max-width: 200px;
}

.jt__table thead th {
  background: var(--n-soft);
  padding: 18px 13px;
  text-align: left;
  border-bottom: 1px solid var(--n-border);
  font-weight: 700;
  color: var(--n-muted);
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  opacity: 0.85;
}

:global(.dark) .jt__table thead th {
    background: rgba(255, 255, 255, 0.03);
    border-bottom-color: rgba(255, 255, 255, 0.1);
}

:global(.dark) .jt__table td {
    border-bottom-color: rgba(255, 255, 255, 0.08);
}

.jt__table td {
  padding: 16px 13px;
  border-bottom: 1px solid var(--n-border);
  vertical-align: middle;
  font-size: 0.9rem;
  color: var(--n-ink);
  transition: background 0.2s;
}

.jt__table tbody tr:hover td {
    background: var(--n-soft);
}

.jt__day { font-weight: 600; color: var(--n-ink); font-size: 0.92rem; }
.jt__date { font-size: 0.8rem; color: var(--n-muted); }
.jt__jamMain { font-weight: 600; color: var(--n-primary); font-size: 0.92rem; }
.jt__jamSub { font-size: 0.8rem; color: var(--n-muted); }
.jt__guru { 
    font-weight: 600; 
    font-size: 0.92rem; 
    color: var(--n-ink); 
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
}
.jt__mapel { 
    font-size: 0.8rem; 
    color: var(--n-muted);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Status Badges */
.sk__status {
    padding: 6px 12px;
    border-radius: 12px;
    font-size: 0.8rem;
    font-weight: 700;
    white-space: nowrap;
    text-align: center;
    line-height: 1.1;
    display: inline-block;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
}
.sk__status.isOn { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.sk__status.isWarning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
.sk__status.isInfo { background: var(--n-soft); color: var(--n-primary); }
.sk__status.isOff { background: var(--n-soft); color: var(--n-muted); }

.jt__rowActions { display: flex; gap: 8px; justify-content: center; width: 100%; padding-right: 4px; }
.jt__iconBtn {
    width: 32px; height: 32px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    border: 1px solid var(--n-border);
    background: var(--n-card); color: var(--n-ink);
    cursor: pointer;
    transition: all 0.2s;
}
.jt__iconBtn:hover { transform: translateY(-2px); background: var(--n-soft); color: var(--n-primary); }
.jt__iconBtn.danger { color: #ef4444; }
.jt__iconBtn.danger:hover { background: #fee2e2; border-color: #fecaca; }

/* ========= MOBILE CARDS ========= */
.jt__cards { display: flex; flex-direction: column; gap: 16px; }
.jt__card {
    background: var(--n-card);
    padding: 24px;
    border-radius: 24px;
    border: 1px solid var(--n-border);
    box-shadow: var(--n-shadow);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
}

:global(.dark) .jt__card {
    background: #0f172a;
    border-color: rgba(255, 255, 255, 0.1);
}
.jt__card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; height: 4px;
    background: #0038A8;
}

.jt__card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.1); }
.jt__cardHead { display: flex; justify-content: space-between; margin-bottom: 20px; align-items: flex-start; }
.jt__cardTitle { flex: 1; }
.jt__cardName { font-weight: 700; font-size: 1.1rem; color: var(--n-ink); margin-bottom: 4px; }
.jt__cardSub { font-size: 0.85rem; color: var(--n-muted); }
.jt__cardStatus { margin-left: 12px; }
.jt__cardBody { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; font-size: 0.9rem; }
.jt__kv {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid var(--n-border);
}
.jt__k { color: var(--n-muted); font-weight: 700; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; }
.jt__v { color: var(--n-ink); font-weight: 600; }
.jt__cardActions { display: flex; gap: 12px; justify-content: flex-end; }

/* ========= MODAL ========= */
.jt__modal { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; z-index: 1005; padding: 20px; backdrop-filter: blur(8px); }
.jt__modalContent { background: var(--n-card); border-radius: 28px; width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; border: 1px solid var(--n-border); box-shadow: 0 30px 60px rgba(0,0,0,0.3); }
.jt__modalHeader { padding: 24px 30px; border-bottom: 1px solid var(--n-border); display: flex; justify-content: space-between; align-items: center; }
.jt__modalBody { padding: 24px; }
.jt__detailGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.jt__detailItem { display: flex; flex-direction: column; gap: 4px; }
.jt__detailLabel { font-size: 0.75rem; color: var(--n-muted); text-transform: uppercase; font-weight: 600; }
.jt__detailValue { font-weight: 400; color: var(--n-ink); }
.col-span-2 { grid-column: span 2; }

/* Detail Modal Enhancements */
.jt__modal--detail { background: rgba(0,0,0,0.7); backdrop-filter: blur(8px); }
.jt__modalContent--detail { max-width: 700px; border-radius: 32px; box-shadow: 0 40px 80px rgba(0,0,0,0.3); }
.jt__modalHeader--detail { background: #0038A8; color: white; padding: 32px 36px; border-bottom: none; border-radius: 32px 32px 0 0; }
.jt__modalTitle { display: flex; align-items: center; gap: 16px; }
.jt__modalIcon { width: 48px; height: 48px; background: rgba(255,255,255,0.15); border-radius: 16px; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px); }
.jt__modalHeading { margin: 0; font-size: 1.5rem; font-weight: 700; transform: translateY(-1px); }
.jt__modalSubheading { margin: 0; font-size: 0.9rem; opacity: 0.9; font-weight: 500; }
.jt__modalClose--detail { width: 40px; height: 40px; background: rgba(255,255,255,0.1); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; transition: all 0.2s; border: none; cursor: pointer; }
.jt__modalClose--detail:hover { background: rgba(255,255,255,0.2); transform: scale(1.05); }
.jt__modalBody--detail { padding: 32px; background: var(--n-bg); }

.jt__detailOverview { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 32px; }
.jt__overviewCard { background: var(--n-card); padding: 24px; border-radius: 20px; border: 1px solid var(--n-border); box-shadow: var(--n-shadow); transition: all 0.3s ease; }
.jt__overviewCard:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
.jt__overviewIcon { width: 48px; height: 48px; background: #0038A8; border-radius: 16px; display: flex; align-items: center; justify-content: center; color: white; margin-bottom: 16px; font-size: 1.2rem; }
.jt__overviewContent { }
.jt__overviewLabel { font-size: 0.75rem; color: var(--n-muted); font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.jt__overviewValue { font-size: 1.1rem; font-weight: 700; color: var(--n-ink); margin-bottom: 2px; }
.jt__overviewSub { font-size: 0.85rem; color: var(--n-muted); }

.jt__replacementNotice { background: rgba(245, 158, 11, 0.1); border: 1px solid var(--n-primary); border-radius: 16px; padding: 20px; margin-bottom: 24px; }
.jt__replacementIcon { width: 32px; height: 32px; background: var(--n-primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; margin-bottom: 12px; }
.jt__replacementContent { }
.jt__replacementLabel { font-size: 0.9rem; font-weight: 600; color: var(--n-primary); margin-bottom: 4px; }
.jt__replacementValue { font-size: 1rem; font-weight: 700; color: var(--n-ink); margin-bottom: 2px; }
.jt__replacementSub { font-size: 0.8rem; color: var(--n-muted); }

.jt__detailSections { display: flex; flex-direction: column; gap: 20px; }
.jt__detailSection { background: var(--n-card); border-radius: 20px; border: 1px solid var(--n-border); overflow: hidden; box-shadow: var(--n-shadow); }
.jt__sectionHeader { background: var(--n-soft); padding: 18px 24px; border-bottom: 1px solid var(--n-border); display: flex; align-items: center; gap: 12px; }
.jt__sectionHeader i { color: var(--n-primary); font-size: 1.1rem; }
.jt__sectionHeader span { font-weight: 700; color: var(--n-ink); font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.5px; }
.jt__sectionContent { padding: 24px; color: var(--n-ink); line-height: 1.7; font-size: 0.95rem; }

.animate-modal-in { animation: modalSlideIn 0.3s ease-out; }
@keyframes modalSlideIn {
    from { opacity: 0; transform: scale(0.9) translateY(-20px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
}

/* ========= FORM ELEMENTS ========= */
.jt__formLabel {
    display: block;
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--n-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
    margin-left: 4px;
}

.jt__formInput {
    width: 100%;
    padding: 12px 18px;
    border-radius: 14px;
    border: 1px solid var(--n-border);
    font-size: 0.9rem;
    font-weight: 520;
    transition: all 0.2s;
    background: var(--n-card);
    color: var(--n-ink);
    outline: none;
}

.jt__formInput:focus {
    border-color: var(--n-primary);
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
}

.jt__formInput[readonly] {
    background: var(--n-soft);
    color: var(--n-muted);
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
    background: var(--n-soft);
    border-radius: 10px;
}

.jt__loading { 
    display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; gap: 12px; color: var(--n-muted); font-weight: 500;
}
.jt__spinner {
    width: 32px; height: 32px; border: 3px solid var(--n-soft); border-top-color: var(--n-primary); border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ========= FAB ========= */
.jt__fabContainer {
    position: fixed; right: 40px; bottom: 40px; z-index: 1010;
    display: flex; flex-direction: column; align-items: flex-end; gap: 14px; user-select: none;
}
.jt__fabMain {
    width: 56px; height: 56px; border-radius: 20px; background: #0038A8; color: white;
    border: none; display: flex; align-items: center; justify-content: center; font-size: 1.4rem;
    cursor: grab; box-shadow: 0 10px 30px rgba(0, 56, 168, 0.4);
    transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275), box-shadow 0.3s; z-index: 2;
}
.jt__fabMain:active { cursor: grabbing; }
.jt__fabContainer.is-dragging .jt__fabMain { transform: scale(1.1); box-shadow: 0 20px 40px rgba(0, 56, 168, 0.4); }
.jt__fabMain:hover { transform: scale(1.08) translateY(-2px); }

.jt__fabMenu {
    display: flex; flex-direction: column; gap: 12px; align-items: flex-end;
    pointer-events: none; opacity: 0; transform: translateY(20px) scale(0.8);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.jt__fabContainer.active .jt__fabMenu { pointer-events: all; opacity: 1; transform: translateY(0) scale(1); }

.jt__fabSub {
    display: flex; align-items: center; gap: 14px; padding: 6px; background: transparent;
    border: none; cursor: pointer; opacity: 0; transform: translateX(20px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); transition-delay: calc(var(--idx) * 0.05s);
}
.jt__fabContainer.active .jt__fabSub { opacity: 1; transform: translateX(0); }

.jt__fabLabel {
    background: var(--n-card); color: var(--n-ink); padding: 8px 16px; border-radius: 12px;
    font-size: 0.88rem; font-weight: 750; box-shadow: var(--n-shadow); border: 1px solid var(--n-border); white-space: nowrap;
}
.jt__fabIcon {
    width: 48px; height: 48px; border-radius: 16px; display: flex; align-items: center; justify-content: center;
    font-size: 1.2rem; color: white; box-shadow: var(--n-shadow);
}
.jt__fabIcon.isAdd { background: #0038A8; }
.jt__fabIcon.isExport { background: #10b981; }
.jt__fabSub:hover .jt__fabLabel { background: var(--n-soft); color: var(--n-primary); }

.rotate-in { animation: rotateIn 0.3s ease-out; }
@keyframes rotateIn {
    from { transform: rotate(-90deg) scale(0.5); opacity: 0; }
    to { transform: rotate(0) scale(1); opacity: 1; }
}

@media (max-width: 1024px) {
    .hidden-lg { display: none; }
}

@media (max-width: 768px) {
  .jt__pageHeader { padding: 16px 20px; border-radius: 20px; flex-direction: column; align-items: flex-start; gap: 10px; }
  .jt__titleArea h1 { font-size: 1.25rem; font-weight: 800; }
  .jt__titleArea p { font-size: 0.8rem; margin-top: 2px; opacity: 0.8; }
  .jt__tableWrap { display: none; }
  .jt__cards { gap: 12px; }
  .jt__card { padding: 18px; border-radius: 20px; }
  .jt__cardName { font-size: 0.95rem; font-weight: 750; }
  .jt__cardSub { font-size: 0.78rem; opacity: 0.85; }
  .jt__kv { padding: 6px 0; }
  .jt__k { font-size: 0.65rem; }
  .jt__v { font-size: 0.82rem; }
  .jt__modalContent { max-width: 95%; padding: 10px; }
  .jt__detailGrid { grid-template-columns: 1fr; }
  .jt__fabContainer { right: 20px; bottom: 20px; }
  .jt__fabMain { width: 48px; height: 48px; border-radius: 16px; font-size: 1.2rem; }
}
@media (min-width: 769px) {
  .jt__cards { display: none; }
            `}</style>
        </div >
    );
}

import PermissionGuard from '@/components/PermissionGuard';

export default function JurnalPage({ user }: { user?: any }) {
    return (
        <div className="jurnal-page-wrapper">
            <PermissionGuard requiredPermission={{ resource: 'jurnal', action: 'view' }} user={user}>
                <Suspense fallback={<div className="p-12 text-center text-gray-500">Memuat jurnal pembelajaran...</div>}>
                    <JurnalContent user={user} />
                </Suspense>
            </PermissionGuard>
            <style jsx>{`
                .jurnal-page-wrapper {
                    padding-bottom: 2rem;
                }
            `}</style>
        </div>
    );
}

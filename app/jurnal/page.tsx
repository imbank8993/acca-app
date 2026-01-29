'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Select from 'react-select';
import { hasPermission } from '@/lib/permissions-client';
import * as XLSX from 'xlsx';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';

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
    const [newJournal, setNewJournal] = useState<Partial<Journal>>({
        tanggal: new Date().toISOString().split('T')[0],
        kategori_kehadiran: 'Sesuai'
    });
    const [jamOptions, setJamOptions] = useState<any[]>([]);

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
    const isKepala = roles.includes('KEPALA MADRASAH');
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

    const handleDelete = async (id: number) => {
        if (!confirm('Yakin ingin menghapus jurnal ini?')) return;

        try {
            const response = await fetch(`/api/jurnal?id=${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete journal');

            alert('Jurnal berhasil dihapus');
            fetchJournals();
        } catch (err: any) {
            alert('Gagal menghapus jurnal: ' + err.message);
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

    const handleExport = async (mode: 'GURU' | 'WALI' | 'ADMIN') => {
        let exportData = [...journals];
        let filename = 'Jurnal_Export';

        if (mode === 'GURU') {
            exportData = exportData.filter(j => j.nip === user?.nip);
            filename = `Jurnal_Personal_${user?.nama || 'Guru'}`;
        } else if (mode === 'WALI') {
            // Filter by selected class if any, or default to all if no specific class assigned to wali
            if (selectedClass) {
                exportData = exportData.filter(j => j.kelas === selectedClass);
            }
            filename = `Jurnal_Kelas_${selectedClass || 'Semua'}`;
        } else if (mode === 'ADMIN') {
            filename = `Jurnal_Global_${new Date().toISOString().split('T')[0]}`;
        }

        if (exportData.length === 0) {
            Swal.fire('Info', 'Tidak ada data untuk diekspor dalam mode ini.', 'info');
            return;
        }

        const dataToExcel = exportData.map((j, i) => ({
            'No': i + 1,
            'Tanggal': j.tanggal,
            'Hari': j.hari,
            'Jam': j.jam_ke,
            'Guru': j.nama_guru,
            'Kelas': j.kelas,
            'Mata Pelajaran': j.mata_pelajaran,
            'Kategori': j.kategori_kehadiran,
            'Materi': j.materi || '-',
            'Refleksi': j.refleksi || '-'
        }));

        const ws = XLSX.utils.json_to_sheet(dataToExcel);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Journal Data");
        XLSX.writeFile(wb, `${filename}.xlsx`);
    };

    const showExportOptions = () => {
        const items: any[] = [];
        if (isGuru) items.push({ id: 'GURU', label: 'Eksport Jurnal Saya (Format Guru)' });
        if (isWali) items.push({ id: 'WALI', label: 'Eksport Jurnal Kelas (Wali Kelas)' });
        if (isAdmin || isKepala) items.push({ id: 'ADMIN', label: 'Eksport Semua Jurnal (Admin/Pimpinan)' });

        if (items.length === 0) {
            Swal.fire('Perhatian', 'Anda tidak memiliki hak akses untuk melakukan eksport.', 'warning');
            return;
        }

        Swal.fire({
            title: 'Pilih Mode Eksport',
            html: `<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 15px;">
                ${items.map(it => `<button id="exp-${it.id}" class="swal2-confirm" style="width: 100%; justify-content: center; margin: 0;">${it.label}</button>`).join('')}
            </div>`,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Tutup',
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

    // Effect to filter Jam/Mapel/Kelas based on Guru + Tanggal
    useEffect(() => {
        const target = showEditModal ? editJournal : newJournal;
        const setTarget = showEditModal ? setEditJournal : setNewJournal;

        // If no guru selected, or no date, revert to generic options
        if (!target?.tanggal || !target?.nama_guru) {
            // Revert jamOptions to generic for the day
            if (target?.tanggal && allWaktu.length > 0) {
                const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                const dateObj = new Date(target.tanggal);
                const dayName = days[dateObj.getDay()];
                const dailySchedule = allWaktu.filter((w: any) => w.hari === dayName && w.aktif);

                if (dailySchedule.length > 0) {
                    const uniqueSchedule = Array.from(new Map(dailySchedule.map((item: any) => [item.jam_ke, item])).values());
                    const options = uniqueSchedule.sort((a: any, b: any) => a.jam_ke - b.jam_ke).map((w: any) => ({
                        value: String(w.jam_ke),
                        label: `Jam Ke-${w.jam_ke}`,
                        jamStr: `Jam Ke-${w.jam_ke}`,
                        timeStr: `${w.mulai?.slice(0, 5)} - ${w.selesai?.slice(0, 5)}`
                    }));
                    setJamOptions(options);
                } else {
                    setJamOptions([]); // No schedule for this day
                }
            } else {
                // If no date or allWaktu, revert to initial state (empty or all jams)
                const uniqueJam = Array.from(new Set(allWaktu.map((w: any) => w.jam_ke))).sort((a: any, b: any) => a - b);
                setJamOptions(uniqueJam.map((jam: any) => ({ value: String(jam), label: `Jam Ke-${jam}` })));
            }
            setMapelOptions(allMapels); // Revert to all master mapels
            setKelasOptions(allKelas);   // Revert to all master kelas
            return;
        }

        const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
        const dateObj = new Date(target.tanggal);
        const dayName = days[dateObj.getDay()];

        // 1. Find Schedule for this Guru on this Day
        const mySchedule = allJadwal.filter(j =>
            j.nama_guru === target.nama_guru &&
            j.hari === dayName &&
            j.aktif
        );

        if (mySchedule.length > 0) {
            // Group Consecutive Periods
            const sorted = mySchedule.sort((a: any, b: any) => parseInt(a.jam_ke) - parseInt(b.jam_ke));
            const groups: any[] = [];

            if (sorted.length > 0) {
                let currentGroup = [sorted[0]];

                for (let i = 1; i < sorted.length; i++) {
                    const prev = currentGroup[currentGroup.length - 1];
                    const curr = sorted[i];

                    const isConsecutive = (parseInt(curr.jam_ke) === parseInt(prev.jam_ke) + 1);
                    const isSameMapel = (curr.mata_pelajaran || curr.mapel) === (prev.mata_pelajaran || prev.mapel);
                    const isSameKelas = curr.kelas === prev.kelas;

                    if (isConsecutive && isSameMapel && isSameKelas) {
                        currentGroup.push(curr);
                    } else {
                        groups.push(currentGroup);
                        currentGroup = [curr];
                    }
                }
                groups.push(currentGroup);
            }

            const newJamOptions = groups.map(group => {
                const first = group[0];
                const last = group[group.length - 1];
                const jamValue = (group.length > 1) ? `${first.jam_ke}-${last.jam_ke}` : String(first.jam_ke);

                const timeStart = allWaktu.find(w => String(w.jam_ke) === String(first.jam_ke) && w.hari === dayName);
                const timeEnd = allWaktu.find(w => String(w.jam_ke) === String(last.jam_ke) && w.hari === dayName);

                // If filtering by program is needed, it would be here. For now assume day/jam uniqueness or first match.

                const timeStr = (timeStart && timeEnd) ? `${timeStart.mulai?.slice(0, 5)} - ${timeEnd.selesai?.slice(0, 5)}` : '--:--';

                return {
                    value: jamValue,
                    label: `Jam Ke-${jamValue} ${first.mata_pelajaran || first.mapel ? `(${first.mata_pelajaran || first.mapel} - ${first.kelas})` : ''}`,
                    jamStr: `Jam Ke-${jamValue}`,
                    timeStr: timeStr,
                    info: `${first.mata_pelajaran || first.mapel} (${first.kelas})`,
                    autoMapel: first.mata_pelajaran || first.mapel,
                    autoKelas: first.kelas
                };
            });
            setJamOptions(newJamOptions);

            // Auto-fill Logic
            if (target.jam_ke) {
                const selectedOpt = newJamOptions.find(o => o.value === target.jam_ke);

                if (selectedOpt) {
                    // Logic 1: Autofill mapel/kelas if not set or different
                    if (target.kelas !== selectedOpt.autoKelas || target.mata_pelajaran !== selectedOpt.autoMapel) {
                        setTarget((prev: any) => ({
                            ...prev,
                            kelas: selectedOpt.autoKelas,
                            mata_pelajaran: selectedOpt.autoMapel
                        }));
                    }
                    // Logic 2: Restrict dropdowns to this specific grouped option
                    setKelasOptions([{ value: selectedOpt.autoKelas, label: selectedOpt.autoKelas }]);
                    setMapelOptions([{ value: selectedOpt.autoMapel, label: selectedOpt.autoMapel }]);
                } else {
                    // If selected jam is not in options (e.g. legacy '3' vs new '3-5'), what to do?
                    // Currently will just show empty label in Select.
                    // The user needs to re-select to fix it.
                    // We can try to finding partial match? E.g. '3' is inside '3-5'.
                    // For now, let's leave it.
                    // But still populate options for the day so they can re-select.
                    const dailyKelas = Array.from(new Set(mySchedule.map(s => s.kelas))).map(c => ({ value: c, label: c }));
                    setKelasOptions(dailyKelas);
                    const dailyMapel = Array.from(new Set(mySchedule.map(s => s.mata_pelajaran || s.mapel))).map(m => ({ value: m, label: m }));
                    setMapelOptions(dailyMapel);
                }
            } else {
                // If Jam not selected, restrict generic options
                const dailyKelas = Array.from(new Set(mySchedule.map(s => s.kelas))).map(c => ({ value: c, label: c }));
                setKelasOptions(dailyKelas);

                const dailyMapel = Array.from(new Set(mySchedule.map(s => s.mata_pelajaran || s.mapel))).map(m => ({ value: m, label: m }));
                setMapelOptions(dailyMapel);
            }

        } else {
            // No schedule found for this guru on this day. Revert to all master options.
            setJamOptions([]);
            setMapelOptions(allMapels);
            setKelasOptions(allKelas);

            // Notify user
            if (target.nama_guru && target.tanggal) {
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 4000,
                    timerProgressBar: true,
                    didOpen: (toast) => {
                        toast.addEventListener('mouseenter', Swal.stopTimer)
                        toast.addEventListener('mouseleave', Swal.resumeTimer)
                        toast.style.zIndex = '99999' // Force above modal
                    }
                });

                Toast.fire({
                    icon: 'info',
                    title: 'Jadwal Tidak Ditemukan',
                    text: `Tidak ada jadwal aktif pada tanggal tersebut.`
                });
            }
        }

    }, [newJournal.nama_guru, newJournal.tanggal, newJournal.jam_ke, editJournal?.nama_guru, editJournal?.tanggal, editJournal?.jam_ke, allJadwal, allWaktu, showEditModal, allMapels, allKelas]);


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
                // Initial generic jam options (before guru/date selection)
                const uniqueJam = Array.from(new Set(waktuData.data.map((w: any) => w.jam_ke))).sort((a: any, b: any) => a - b);
                setJamOptions(uniqueJam.map((jam: any) => ({ value: String(jam), label: `Jam Ke-${jam}` })));
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
                            <th className="cTanggalHari">Tanggal & Hari</th>
                            <th className="cJam">Jam Ke</th>
                            <th className="cGuruMapel">Guru & Mapel</th>
                            <th className="cKelas">Kelas</th>
                            <th className="cKategori">Kategori</th>
                            <th className="cMateri hidden-lg">Materi</th>
                            <th className="cRefleksi hidden-lg">Refleksi</th>
                            <th className="cAksi">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="jt__empty">
                                    <div className="jt__loading">
                                        <div className="jt__spinner"></div>
                                        Memuat data...
                                    </div>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={8} className="jt__empty jt__error">
                                    <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
                                    Error: {error}
                                </td>
                            </tr>
                        ) : filteredJournals.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="jt__empty jt__muted">
                                    <div className="jt__emptyContent">
                                        <i className="bi bi-journal-x" aria-hidden="true" />
                                        <div>Tidak ada data jurnal</div>
                                        <div className="jt__emptySub">Coba ubah filter atau tambahkan data baru</div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredJournals.map((journal: Journal, index: number) => (
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
                                    <td className="jt__materi hidden-lg">
                                        <div className="jt__materiText">{journal.materi || '-'}</div>
                                    </td>
                                    <td className="jt__refleksi hidden-lg">
                                        <div className="jt__refleksiText">{journal.refleksi || '-'}</div>
                                    </td>
                                    <td>
                                        <div className="jt__rowActions">
                                            <button
                                                className="jt__iconBtn"
                                                onClick={() => { setSelectedJournal(journal); setShowDetailModal(true); }}
                                                disabled={!canDo('read')}
                                                title="Lihat Detail"
                                            >
                                                <i className="bi bi-eye" aria-hidden="true" />
                                            </button>
                                            <button
                                                className="jt__iconBtn"
                                                onClick={() => { setEditJournal(journal); setShowEditModal(true); }}
                                                disabled={!canDo('update')}
                                                title="Edit Jurnal"
                                            >
                                                <i className="bi bi-pencil" aria-hidden="true" />
                                            </button>
                                            <button
                                                className="jt__iconBtn danger"
                                                onClick={() => handleDelete(journal.id)}
                                                disabled={!canDo('delete')}
                                                title="Hapus Jurnal"
                                            >
                                                <i className="bi bi-trash" aria-hidden="true" />
                                            </button>
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
                    journals.map((journal: Journal) => (
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
                                    onClick={() => {
                                        setEditJournal(journal);
                                        setShowEditModal(true);
                                    }}
                                    disabled={!canDo('update')}
                                    title="Edit"
                                >
                                    <i className="bi bi-pencil" aria-hidden="true" />
                                </button>
                                <button
                                    className="jt__iconBtn danger"
                                    onClick={() => handleDelete(journal.id)}
                                    disabled={!canDo('delete')}
                                    title="Hapus"
                                >
                                    <i className="bi bi-trash" aria-hidden="true" />
                                </button>
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
                                <div className="jt__detailItem col-span-2">
                                    <div className="jt__detailLabel">Materi</div>
                                    <div className="jt__detailValue">{selectedJournal.materi || '-'}</div>
                                </div>
                                <div className="jt__detailItem col-span-2">
                                    <div className="jt__detailLabel">Refleksi</div>
                                    <div className="jt__detailValue">{selectedJournal.refleksi || '-'}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Modal Add/Edit Comprehensive ===== */}
            {(showAddModal || showEditModal) && (
                <div className="jt__modal" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault();
                            const target = showEditModal ? editJournal : newJournal;
                            if (!target?.nip || !target?.tanggal || !target?.jam_ke || !target?.kelas || !target?.mata_pelajaran) {
                                Swal.fire('Perhatian', 'Mohon lengkapi semua data wajib!', 'warning');
                                return;
                            }

                            const currentKategori = (target?.kategori_kehadiran || 'Sesuai').toLowerCase();
                            if (['diganti', 'tukaran', 'tim teaching', 'penugasan dengan pendampingan', 'guru pengganti'].includes(currentKategori)) {
                                if (!target?.guru_pengganti || !target?.status_pengganti) {
                                    Swal.fire('Perhatian', 'Guru Pengganti dan Status Kehadiran wajib diisi!', 'warning');
                                    return;
                                }
                            }

                            const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
                            const hari = days[new Date(target.tanggal!).getDay()];

                            try {
                                const res = await fetch('/api/jurnal/submit', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        ...target,
                                        hari,
                                        auth_id: user?.id
                                    })
                                });
                                const result = await res.json();
                                if (result.success) {
                                    Swal.fire('Berhasil', 'Jurnal berhasil disimpan', 'success');
                                    setShowAddModal(false);
                                    setShowEditModal(false);
                                    fetchJournals();
                                } else {
                                    throw new Error(result.error);
                                }
                            } catch (err: any) {
                                Swal.fire('Error', 'Gagal menyimpan: ' + err.message + (err.response?.data?.message ? ` (${err.response.data.message})` : ''), 'error');
                            }
                        }}
                        className="jt__modalContent max-w-2xl !p-0 border-0 flex flex-col max-h-[90vh] overflow-visible min-h-[600px]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="p-6 bg-gradient-to-r from-navy-900 to-navy-800 text-white flex justify-between items-center rounded-t-2xl flex-none">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                                    <i className={`bi ${showEditModal ? 'bi-pencil-square' : 'bi-plus-circle'} text-xl`}></i>
                                </div>
                                <div>
                                    <h3 className="m-0 text-lg font-bold tracking-tight">
                                        {showEditModal ? 'Update Jurnal' : 'Tambah Jurnal Baru'}
                                    </h3>
                                    <p className="m-0 text-xs text-navy-200">Lengkapi detail kegiatan belajar mengajar</p>
                                </div>
                            </div>
                            <button type="button" className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
                                <i className="bi bi-x-lg text-sm"></i>
                            </button>
                        </div>

                        {/* Scrollable Body */}
<div className="p-8 overflow-y-auto custom-scrollbar flex-1">
                            <div className="space-y-6">
                                <div className="jt__formGrid">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                                <i className="bi bi-calendar-event text-navy-600"></i> Tanggal
                                            </label>
                                            <input
                                                type="date"
                                                className="jt__formInput !bg-slate-50 border-slate-200 focus:!bg-white"
                                                value={(showEditModal ? editJournal?.tanggal : newJournal.tanggal) || ''}
                                                onChange={(e) => showEditModal ? setEditJournal({ ...editJournal!, tanggal: e.target.value }) : setNewJournal({ ...newJournal, tanggal: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                                <i className="bi bi-clock text-navy-600"></i> Jam Ke
                                            </label>
                                            <Select
                                                options={jamOptions}
                                                value={jamOptions.find(o => o.value === (showEditModal ? editJournal?.jam_ke : newJournal.jam_ke))}
                                                onChange={(opt: any) => showEditModal ? setEditJournal({ ...editJournal!, jam_ke: opt.value }) : setNewJournal({ ...newJournal, jam_ke: opt.value })}
                                                styles={customSelectStyles}
                                                formatOptionLabel={(option: any) => (
                                                    <div className="flex flex-col leading-tight">
                                                        <span className="text-[11px] font-bold text-slate-700">{option.timeStr || '--:--'}</span>
                                                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{option.jamStr || option.label}</span>
                                                    </div>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                                <i className="bi bi-person text-navy-600"></i> GURU PENGAMPU
                                            </label>
                                            <Select
                                                options={guruOptions}
                                                value={guruOptions.find(o => o.value === (showEditModal ? editJournal?.nama_guru : newJournal.nama_guru))}
                                                onChange={(opt: any) => {
                                                    const payload = { nama_guru: opt.value, nip: opt.nip };
                                                    showEditModal ? setEditJournal({ ...editJournal!, ...payload }) : setNewJournal({ ...newJournal, ...payload });
                                                }}
                                                styles={customSelectStyles}
                                                placeholder="Pilih Guru..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                                <i className="bi bi-card-heading text-navy-600"></i> NIP
                                            </label>
                                            <input
                                                type="text"
                                                className="jt__formInput !bg-slate-50 border-slate-200 cursor-not-allowed"
                                                readOnly
                                                value={(showEditModal ? editJournal?.nip : newJournal.nip) || ''}
                                                placeholder="Otomatis terisi..."
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                                <i className="bi bi-book text-navy-600"></i> Mata Pelajaran
                                            </label>
                                            <Select
                                                options={mapelOptions}
                                                value={mapelOptions.find(o => o.value === (showEditModal ? editJournal?.mata_pelajaran : newJournal.mata_pelajaran))}
                                                onChange={(opt: any) => showEditModal ? setEditJournal({ ...editJournal!, mata_pelajaran: opt.value }) : setNewJournal({ ...newJournal, mata_pelajaran: opt.value })}
                                                styles={customSelectStyles}
                                                placeholder="Pilih Mapel..."
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                                <i className="bi bi-people text-navy-600"></i> Kelas
                                            </label>
                                            <Select
                                                options={kelasOptions}
                                                value={kelasOptions.find(o => o.value === (showEditModal ? editJournal?.kelas : newJournal.kelas))}
                                                onChange={(opt: any) => showEditModal ? setEditJournal({ ...editJournal!, kelas: opt.value }) : setNewJournal({ ...newJournal, kelas: opt.value })}
                                                styles={customSelectStyles}
                                                placeholder="Pilih Kelas..."
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                                <i className="bi bi-check2-circle text-navy-600"></i> Kategori Kehadiran
                                            </label>
                                            <select
                                                className="jt__formInput !bg-slate-50 border-slate-200 focus:!bg-white"
                                                value={(showEditModal ? editJournal?.kategori_kehadiran : newJournal.kategori_kehadiran) || 'Sesuai'}
                                                onChange={(e) => showEditModal ? setEditJournal({ ...editJournal!, kategori_kehadiran: e.target.value }) : setNewJournal({ ...newJournal, kategori_kehadiran: e.target.value })}
                                            >
                                                {kategoriKehadiranOptions.length > 0 ? (
                                                    kategoriKehadiranOptions.map((opt) => (
                                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                    ))
                                                ) : (
                                                    <>
                                                        <option value="Sesuai">Sesuai</option>
                                                        <option value="Terlambat">Terlambat</option>
                                                        <option value="Diganti">Diganti</option>
                                                        <option value="Tidak Hadir">Tidak Hadir</option>
                                                        <option value="Tukaran">Tukaran</option>
                                                        <option value="Tim Teaching">Tim Teaching</option>
                                                        <option value="Penugasan dengan Pendampingan">Penugasan dengan Pendampingan</option>
                                                        <option value="Guru Pengganti">Guru Pengganti</option>
                                                    </>
                                                )}
                                            </select>
                                        </div>

                                        {/* Conditional Fields */}
                                        {((showEditModal ? editJournal?.kategori_kehadiran : newJournal.kategori_kehadiran) === 'Terlambat') && (
                                            <div className="space-y-2 animate-fadeIn">
                                                <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                                    <i className="bi bi-clock-history text-navy-600"></i> Keterangan Terlambat
                                                </label>
                                                <Select
                                                    options={terlambatOptions}
                                                    value={terlambatOptions.find(o => o.value === (showEditModal ? editJournal?.keterangan_terlambat : newJournal.keterangan_terlambat))}
                                                    onChange={(opt: any) => showEditModal ? setEditJournal({ ...editJournal!, keterangan_terlambat: opt.value }) : setNewJournal({ ...newJournal, keterangan_terlambat: opt.value })}
                                                    styles={customSelectStyles}
                                                    placeholder="Pilih Alasan..."
                                                />
                                            </div>
                                        )}

                                        {['diganti', 'tukaran', 'tim teaching', 'penugasan dengan pendampingan', 'guru pengganti'].includes(((showEditModal ? editJournal?.kategori_kehadiran : newJournal.kategori_kehadiran) || '').toLowerCase()) && (
                                            <div className="grid grid-cols-2 gap-6 animate-fadeIn">
                                                <div className="space-y-2">
                                                    <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                                        <i className="bi bi-person-badge text-navy-600"></i>
                                                        {(() => {
                                                            const kat = (showEditModal ? editJournal?.kategori_kehadiran : newJournal.kategori_kehadiran);
                                                            if (kat === 'Tim Teaching') return 'Guru Mitra / Partner';
                                                            if (kat === 'Penugasan dengan Pendampingan') return 'Guru Pendamping';
                                                            if (kat === 'Tukaran') return 'Bertukar dengan Guru';
                                                            return 'Guru Pengganti';
                                                        })()}
                                                    </label>
                                                    <Select
                                                        options={guruOptions}
                                                        value={guruOptions.find(o => o.value === (showEditModal ? editJournal?.guru_pengganti : newJournal.guru_pengganti))}
                                                        onChange={(opt: any) => showEditModal ? setEditJournal({ ...editJournal!, guru_pengganti: opt.value }) : setNewJournal({ ...newJournal, guru_pengganti: opt.value })}
                                                        styles={customSelectStyles}
                                                        placeholder="Pilih Guru..."
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                                        <i className="bi bi-activity text-navy-600"></i> Status Kehadiran
                                                    </label>
                                                    <Select
                                                        options={statusPenggantiOptions}
                                                        value={statusPenggantiOptions.find(o => o.value === (showEditModal ? editJournal?.status_pengganti : newJournal.status_pengganti))}
                                                        onChange={(opt: any) => showEditModal ? setEditJournal({ ...editJournal!, status_pengganti: opt.value }) : setNewJournal({ ...newJournal, status_pengganti: opt.value })}
                                                        styles={customSelectStyles}
                                                        placeholder="Pilih Status..."
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                            <i className="bi bi-person-check text-navy-600"></i> GURU PIKET
                                        </label>
                                        <Select
                                            options={guruOptions}
                                            value={guruOptions.find(o => o.value === (showEditModal ? editJournal?.guru_piket : newJournal.guru_piket))}
                                            onChange={(opt: any) => showEditModal ? setEditJournal({ ...editJournal!, guru_piket: opt.value }) : setNewJournal({ ...newJournal, guru_piket: opt.value })}
                                            styles={customSelectStyles}
                                            placeholder="Pilih Guru Piket..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                            <i className="bi bi-card-text text-navy-600"></i> Materi Pembelajaran
                                        </label>
                                        <textarea
                                            className="jt__formInput !bg-slate-50 border-slate-200 focus:!bg-white min-h-[80px]"
                                            rows={2}
                                            value={(showEditModal ? editJournal?.materi : newJournal.materi) || ''}
                                            onChange={(e) => showEditModal ? setEditJournal({ ...editJournal!, materi: e.target.value }) : setNewJournal({ ...newJournal, materi: e.target.value })}
                                            placeholder="Tuliskan materi pembelajaran hari ini..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                            <i className="bi bi-chat-left-dots text-navy-600"></i> Refleksi Pembelajaran
                                        </label>
                                        <textarea
                                            className="jt__formInput !bg-slate-50 border-slate-200 focus:!bg-white min-h-[80px]"
                                            rows={2}
                                            value={(showEditModal ? editJournal?.refleksi : newJournal.refleksi) || ''}
                                            onChange={(e) => showEditModal ? setEditJournal({ ...editJournal!, refleksi: e.target.value }) : setNewJournal({ ...newJournal, refleksi: e.target.value })}
                                            placeholder="Tuliskan refleksi hasil pembelajaran..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                            <i className="bi bi-journal-plus text-navy-600"></i> Keterangan Tambahan
                                        </label>
                                        <textarea
                                            className="jt__formInput !bg-slate-50 border-slate-200 focus:!bg-white min-h-[60px]"
                                            rows={2}
                                            value={(showEditModal ? editJournal?.keterangan_tambahan : newJournal.keterangan_tambahan) || ''}
                                            onChange={(e) => showEditModal ? setEditJournal({ ...editJournal!, keterangan_tambahan: e.target.value }) : setNewJournal({ ...newJournal, keterangan_tambahan: e.target.value })}
                                            placeholder="Catatan tambahan (opsional)..."
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
<div className="flex-none p-6 border-t border-slate-100 bg-white rounded-b-2xl flex justify-end gap-3">
                            <button type="button" className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
                                Batal
                            </button>
                            <button type="submit" className="px-8 py-2.5 rounded-xl bg-navy-600 text-white text-sm font-bold shadow-lg shadow-navy-200 hover:bg-navy-700 active:scale-95 transition-all">
                                <i className="bi bi-cloud-check mr-2" /> {showEditModal ? 'Simpan Perubahan' : 'Simpan Jurnal'}
                            </button>
                        </div>
                    </form>
                </div>
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
    padding: 24px;
    border-radius: var(--jt-radius);
    border: 1px solid var(--jt-line);
    box-shadow: var(--jt-shadow2);
    margin-bottom: 8px;
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
  border: 1px solid var(--jt-line);
  background: #fff;
  box-shadow: var(--jt-shadow);
}

.jt__table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 900px;
}

.jt__table thead th {
  background: var(--jt-navy-bg-light);
  padding: 16px;
  text-align: left;
  border-bottom: 1px solid var(--jt-line);
  font-weight: 700;
  color: var(--jt-navy-dark);
}

.jt__table tbody tr {
  transition: background 0.2s;
}

.jt__table tbody tr:hover {
  background: var(--jt-navy-light);
}

.jt__table td {
  padding: 16px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  vertical-align: top;
}

.jt__day { font-weight: 700; color: var(--jt-navy-dark); }
.jt__date { font-size: 0.8rem; color: #64748b; }
.jt__jamMain { font-weight: 700; color: var(--jt-navy-accent); }
.jt__jamSub { font-size: 0.75rem; color: #94a3b8; }
.jt__guru { font-weight: 600; }
.jt__mapel { font-size: 0.8rem; color: #64748b; }

.sk__status {
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 700;
    white-space: nowrap;
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
.jt__detailValue { font-weight: 600; }
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

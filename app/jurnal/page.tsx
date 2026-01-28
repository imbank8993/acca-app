'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Select from 'react-select';
import { hasPermission } from '@/lib/permissions-client';
import * as XLSX from 'xlsx';
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
    control: (base: any) => ({
        ...base,
        borderRadius: '12px',
        border: '1px solid rgba(30, 58, 138, 0.3)',
        boxShadow: 'none',
        '&:hover': {
            borderColor: 'rgba(30, 58, 138, 0.5)',
        },
        padding: '2px',
        fontSize: '0.9rem',
        fontWeight: '500',
        background: 'rgba(255, 255, 255, 0.95)',
    }),
    option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isSelected ? '#1e3a8a' : state.isFocused ? 'rgba(30, 58, 138, 0.1)' : 'transparent',
        color: state.isSelected ? '#fff' : '#0f1b2a',
        fontSize: '0.85rem',
        fontWeight: '500',
    }),
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
                ${items.map(it => `<button id="exp-${it.id}" class="swal2-confirm swal2-styled" style="margin: 0; padding: 12px; border-radius: 10px; font-weight: 600;">${it.label}</button>`).join('')}
            </div>`,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Tutup',
            customClass: {
                popup: 'rounded-2xl shadow-2xl border border-slate-200'
            },
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

    useEffect(() => {
        loadFilterOptions();
    }, []);

    const loadFilterOptions = async () => {
        try {
            const [guruRes, mapelRes, kelasRes] = await Promise.all([
                fetch('/api/master/guru'),
                fetch('/api/master/mapel'),
                fetch('/api/master/kelas')
            ]);
            const [guruData, mapelData, kelasData] = await Promise.all([
                guruRes.json(),
                mapelRes.json(),
                kelasRes.json()
            ]);

            if (guruData.ok) setGuruOptions(guruData.data.map((g: any) => ({ value: g.nama, label: g.nama, nip: g.nip })));
            if (mapelData.ok) setMapelOptions(mapelData.data.map((m: any) => ({ value: m.nama, label: m.nama })));
            if (kelasData.ok) setKelasOptions(kelasData.data.map((k: any) => ({ value: k.nama, label: k.nama })));

            const waktuRes = await fetch('/api/master/waktu');
            const waktuData = await waktuRes.json();
            if (waktuData.ok) setJamOptions(waktuData.data.map((w: any) => ({ value: w.nama, label: w.nama })));
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
                                        <div className="jt__jamMain">{journal.jam_ke}</div>
                                        <div className="jt__jamSub">Jam ke: {journal.jam_ke_id || '-'}</div>
                                    </td>
                                    <td>
                                        <div className="jt__guru">{journal.nama_guru}</div>
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
                                    <div className="jt__cardName">{journal.nama_guru}</div>
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
                                    <div className="jt__k">Jam Ke</div>
                                    <div className="jt__v">{journal.jam_ke}</div>
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
                    <div className="jt__modalContent max-w-2xl !p-0 border-0" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 bg-gradient-to-r from-navy-900 to-navy-800 text-white flex justify-between items-center rounded-t-2xl">
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
                            <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
                                <i className="bi bi-x-lg text-sm"></i>
                            </button>
                        </div>
                        <div className="p-8">
                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                const target = showEditModal ? editJournal : newJournal;
                                if (!target?.nip || !target?.tanggal || !target?.jam_ke || !target?.kelas || !target?.mata_pelajaran) {
                                    Swal.fire('Perhatian', 'Mohon lengkapi semua data wajib!', 'warning');
                                    return;
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
                                    Swal.fire('Error', 'Gagal menyimpan: ' + err.message, 'error');
                                }
                            }} className="space-y-6">
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
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                                <i className="bi bi-person text-navy-600"></i> Guru Pengampu
                                            </label>
                                            <Select
                                                options={guruOptions}
                                                value={guruOptions.find(o => o.value === (showEditModal ? editJournal?.nama_guru : newJournal.nama_guru))}
                                                onChange={(opt: any) => showEditModal ? setEditJournal({ ...editJournal!, nama_guru: opt.value, nip: opt.nip }) : setNewJournal({ ...newJournal, nama_guru: opt.value, nip: opt.nip })}
                                                styles={customSelectStyles}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                                <i className="bi bi-card-text text-navy-600"></i> NIP
                                            </label>
                                            <input
                                                type="text"
                                                className="jt__formInput !bg-slate-50 border-slate-200 cursor-not-allowed"
                                                readOnly
                                                value={(showEditModal ? editJournal?.nip : newJournal.nip) || ''}
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
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                                <i className="bi bi-door-open text-navy-600"></i> Kelas
                                            </label>
                                            <Select
                                                options={kelasOptions}
                                                value={kelasOptions.find(o => o.value === (showEditModal ? editJournal?.kelas : newJournal.kelas))}
                                                onChange={(opt: any) => showEditModal ? setEditJournal({ ...editJournal!, kelas: opt.value }) : setNewJournal({ ...newJournal, kelas: opt.value })}
                                                styles={customSelectStyles}
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                            <i className="bi bi-check2-circle text-navy-600"></i> Kategori Kehadiran
                                        </label>
                                        <select
                                            className="jt__formInput !bg-slate-50 border-slate-200 focus:!bg-white"
                                            value={(showEditModal ? editJournal?.kategori_kehadiran : newJournal.kategori_kehadiran) || 'Sesuai'}
                                            onChange={(e) => showEditModal ? setEditJournal({ ...editJournal!, kategori_kehadiran: e.target.value }) : setNewJournal({ ...newJournal, kategori_kehadiran: e.target.value })}
                                        >
                                            <option value="Sesuai">Sesuai</option>
                                            <option value="Terlambat">Terlambat</option>
                                            <option value="Diganti">Diganti</option>
                                            <option value="Tidak Hadir">Tidak Hadir</option>
                                        </select>
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
                                </div>

                                <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
                                    <button type="button" className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors" onClick={() => { setShowAddModal(false); setShowEditModal(false); }}>
                                        Batal
                                    </button>
                                    <button type="submit" className="px-8 py-2.5 rounded-xl bg-navy-600 text-white text-sm font-bold shadow-lg shadow-navy-200 hover:bg-navy-700 active:scale-95 transition-all">
                                        <i className="bi bi-cloud-check mr-2" /> {showEditModal ? 'Simpan Perubahan' : 'Simpan Jurnal'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
:global(:root) {
  --jt-line: rgba(30, 58, 138, 0.5);
  --jt-card: rgba(248, 250, 252, 0.98);
  --jt-shadow: 0 20px 50px rgba(30, 58, 138, 0.25);
  --jt-shadow2: 0 16px 35px rgba(30, 58, 138, 0.3);
  --jt-radius: 20px;
  --jt-fs: 0.9rem;
  --jt-fs-sm: 0.84rem;
  --jt-fs-xs: 0.8rem;
  --jt-safe-b: env(safe-area-inset-bottom, 0px);
  --jt-navy: #1e3a8a;
  --jt-navy-light: rgba(30, 58, 138, 0.15);
  --jt-navy-medium: rgba(30, 58, 138, 0.75);
  --jt-navy-dark: #0f1b2a;
  --jt-navy-accent: #1e40af;
  --jt-navy-bg: linear-gradient(135deg, #1e3a8a, #1e40af);
  --jt-navy-bg-light: linear-gradient(135deg, rgba(30, 58, 138, 0.2), rgba(30, 64, 175, 0.2));
  --jt-navy-bg-darker: linear-gradient(135deg, #0f1b2a, #1e3a8a);
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
.jt__cards { display: flex; flex-direction: column; gap: 12px; }
.jt__card { background: #fff; padding: 20px; border-radius: var(--jt-radius); border: 1px solid var(--jt-line); box-shadow: var(--jt-shadow2); }
.jt__cardHead { display: flex; justify-content: space-between; margin-bottom: 16px; }
.jt__cardName { font-weight: 700; }
.jt__cardBody { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; font-size: 0.85rem; }
.jt__kv { display: flex; justify-content: space-between; border-bottom: 1px dashed rgba(0,0,0,0.05); padding-bottom: 4px; }
.jt__k { color: #64748b; }
.jt__cardActions { display: flex; gap: 10px; justify-content: flex-end; }

/* ========= MODAL ========= */
.jt__modal { position: fixed; inset: 0; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; z-index: 2000; padding: 20px; backdrop-filter: blur(4px); }
.jt__modalContent { background: #fff; border-radius: var(--jt-radius); width: 100%; max-width: 600px; max-height: 90vh; overflow-y: auto; }
.jt__modalHeader { padding: 20px; border-bottom: 1px solid var(--jt-line); display: flex; justify-content: space-between; align-items: center; }
.jt__modalBody { padding: 24px; }
.jt__detailGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
.jt__detailItem { display: flex; flex-direction: column; gap: 4px; }
.jt__detailLabel { font-size: 0.75rem; color: #64748b; text-transform: uppercase; font-weight: 600; }
.jt__detailValue { font-weight: 600; }
.col-span-2 { grid-column: span 2; }

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

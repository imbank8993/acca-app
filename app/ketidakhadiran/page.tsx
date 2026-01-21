'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import './ketidakhadiran.css';
import AddModal from './components/AddModal';
import EditModal from './components/EditModal';
import DeleteModal from './components/DeleteModal';
import PrintModal from './components/PrintModal';
import MonthSelect from './components/MonthSelect';
import { generateFromTemplate, formatDataForPrint } from './utils/PrintHelper';

// Template Paths
const TOR_SURAT_SAKIT = '/templates/template_surat_sakit.docx';
const TOR_IZIN_PRIBADI_SINGLE = '/templates/template_surat_izin_pribadi.docx';
const TOR_IZIN_PRIBADI_GROUP = '/templates/template_surat_izin_pribadi_lampiran.docx';
const TOR_SURAT_TUGAS_SINGLE = '/templates/template_surat_tugas.docx';
const TOR_SURAT_TUGAS_GROUP = '/templates/template_surat_tugas_lampiran.docx';

interface KetidakhadiranRow {
    id: string;
    jenis: 'IZIN' | 'SAKIT';
    nisn: string;
    nama: string;
    kelas: string;
    tgl_mulai: string; // ISO Date
    tgl_selesai: string;
    status: string; // MADRASAH, PERSONAL, Ringan, Sedang, dll
    keterangan: string;
    aktif: boolean;
    created_at: string;
}

interface KPIStats {
    total: number;
    izin: number;
    sakit: number;
    madrasah: number;
    personal: number;
    ringan: number;
    sedang: number;
    berat: number;
    kontrol: number;
}

interface Siswa {
    nisn: string;
    nama: string;
    kelas: string;
}

export default function KetidakhadiranPage() {
    const [rows, setRows] = useState<KetidakhadiranRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [kpi, setKpi] = useState<KPIStats>({
        total: 0,
        izin: 0,
        sakit: 0,
        madrasah: 0,
        personal: 0,
        ringan: 0,
        sedang: 0,
        berat: 0,
        kontrol: 0
    });

    // UI State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

    const [editRow, setEditRow] = useState<KetidakhadiranRow | null>(null);
    const [deleteRow, setDeleteRow] = useState<KetidakhadiranRow | null>(null);
    const [printRow, setPrintRow] = useState<KetidakhadiranRow | null>(null);

    // User role for access control
    const [userRole, setUserRole] = useState<string | null>(null);

    // Filters
    const [filterKelas, setFilterKelas] = useState('');
    const [filterJenis, setFilterJenis] = useState('');
    const [filterMonths, setFilterMonths] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Dynamic Classes
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);

    useEffect(() => {
        fetchClasses();
        fetchUserRole();
    }, []);

    const fetchUserRole = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) {
            const { data } = await supabase
                .from('users')
                .select('role')
                .eq('auth_id', user.id)
                .single();
            setUserRole(data?.role || null);
        }
    };

    const fetchClasses = async () => {
        const { data } = await supabase
            .from('siswa_kelas')
            .select('kelas')
            .eq('aktif', true);
        if (data) {
            const classes = Array.from(new Set(data.map((d: any) => d.kelas))).sort() as string[];
            setAvailableClasses(classes);
        }
    };

    useEffect(() => {
        loadData();
    }, [filterKelas, filterJenis, filterMonths, searchQuery]);

    const loadData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (filterKelas) params.append('kelas', filterKelas);
            if (filterJenis) params.append('jenis', filterJenis);
            if (filterMonths.length > 0) params.append('months', filterMonths.join(','));
            if (searchQuery) params.append('q', searchQuery);

            // Get auth token
            const { data: { session } } = await supabase.auth.getSession();
            const headers: HeadersInit = {};
            if (session?.access_token) {
                headers['Authorization'] = `Bearer ${session.access_token}`;
            }

            const res = await fetch(`/api/ketidakhadiran?${params.toString()}`, { headers });
            const data = await res.json();

            if (data.ok) {
                console.log('Sample row:', data.data ? data.data[0] : 'No data'); // Debug: check if 'id' exists
                setRows(data.data || []);
                calculateKPI(data.data || []);
            }
        } catch (error) {
            console.error('Load error:', error);
        } finally {
            setLoading(false);
        }
    };

    const calculateKPI = (data: KetidakhadiranRow[]) => {
        const stats: KPIStats = {
            total: data.length,
            izin: 0,
            sakit: 0,
            madrasah: 0,
            personal: 0,
            ringan: 0,
            sedang: 0,
            berat: 0,
            kontrol: 0
        };

        data.forEach(row => {
            if (row.jenis === 'IZIN') {
                stats.izin++;
                if (row.status === 'MADRASAH') stats.madrasah++;
                if (row.status === 'PERSONAL') stats.personal++;
            } else if (row.jenis === 'SAKIT') {
                stats.sakit++;
                if (row.status === 'Ringan') stats.ringan++;
                if (row.status === 'Sedang') stats.sedang++;
                if (row.status === 'Berat') stats.berat++;
                if (row.status === 'Kontrol') stats.kontrol++;
            }
        });

        setKpi(stats);
    };

    const formatDate = (isoDate: string) => {
        if (!isoDate) return '-';
        const [y, m, d] = isoDate.split('-');
        return `${d}-${m}-${y}`;
    };

    // ========== BULK ADD MODAL ==========
    const openBulkAddModal = () => {
        setIsAddModalOpen(true);
    };

    // ========== PRINT LOGIC ==========
    // ========== PRINT LOGIC ==========
    // ========== PRINT LOGIC ==========
    const handlePrintSingle = (row: KetidakhadiranRow) => {
        setPrintRow(row);
        setIsPrintModalOpen(true);
    };

    // Helper functions for actual printing (passed to modal)
    const printSingle = (row: KetidakhadiranRow, type: 'SAKIT' | 'TUGAS' | 'IZIN') => {
        let template = '';
        let prefix = '';

        if (type === 'SAKIT') {
            template = TOR_SURAT_SAKIT;
            prefix = 'Surat_Sakit';
        } else if (type === 'TUGAS') {
            template = TOR_SURAT_TUGAS_SINGLE;
            prefix = 'Surat_Tugas';
        } else {
            template = TOR_IZIN_PRIBADI_SINGLE;
            prefix = 'Surat_Izin';
        }

        if (template) {
            const data = formatDataForPrint(row);
            const filename = `${prefix}_${row.nama.replace(/\s+/g, '_')}.docx`;
            generateFromTemplate(template, data, filename);
        }
    };

    const printGroupLetter = (groupRows: KetidakhadiranRow[], representative: KetidakhadiranRow, type: 'TUGAS' | 'IZIN') => {
        let template = '';
        let prefix = '';

        if (type === 'TUGAS') {
            template = TOR_SURAT_TUGAS_GROUP;
            prefix = 'Surat_Tugas_Grup';
        } else {
            template = TOR_IZIN_PRIBADI_GROUP;
            prefix = 'Surat_Izin_Grup';
        }

        // Data payload must include { list: [...] } for the table loop in Word
        const data = {
            ...formatDataForPrint(representative),
            list: groupRows.map((r, i) => ({ ...formatDataForPrint(r), no: i + 1 }))
        };

        const filename = `${prefix}_${representative.kelas.replace(/\s+/g, '_')}.docx`;
        generateFromTemplate(template, data, filename);
    };

    // ========== EDIT MODAL ==========
    const openEditModal = (row: KetidakhadiranRow) => {
        setEditRow(row);
        setIsEditModalOpen(true);
    };

    // ========== DELETE MODAL ==========
    const openDeleteModal = (row: KetidakhadiranRow) => {
        setDeleteRow(row);
        setIsDeleteModalOpen(true);
    };

    return (
        <div className="kh-wrap">
            <AddModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={loadData}
            />
            <EditModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSuccess={loadData}
                data={editRow}
            />
            <DeleteModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onSuccess={loadData}
                data={deleteRow}
            />
            <PrintModal
                isOpen={isPrintModalOpen}
                onClose={() => setIsPrintModalOpen(false)}
                data={printRow}
                allRows={rows}
                onPrintSingle={printSingle}
                onPrintGroup={printGroupLetter}
            />
            <div className="kh-container">
                {/* Header */}
                <div className="kh-header">
                    <div>
                        <h1 className="kh-title">Ketidakhadiran</h1>
                        <div className="kh-sub">Kelola data izin dan sakit siswa</div>
                    </div>
                    <div className="kh-toolbar">
                        <button className="btn-kh-soft" onClick={loadData}>
                            Refresh
                        </button>
                        <button className="btn-kh-navy" onClick={() => setIsAddModalOpen(true)}>
                            + Tambah
                        </button>
                    </div>
                </div>

                {/* KPI Cards */}
                <div className="kh-kpis" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
                    <div className="kh-kpi">
                        <div className="kh-kpi-icon">Σ</div>
                        <div>
                            <div className="kh-kpi-label">Total</div>
                            <div className="kh-kpi-value">{kpi.total}</div>
                        </div>
                    </div>

                    <div className="kh-kpi">
                        <div className="kh-kpi-icon">I</div>
                        <div>
                            <div className="kh-kpi-label">Izin (M / P)</div>
                            <div className="kh-kpi-value">
                                {kpi.izin}
                                <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '6px', fontWeight: 500 }}>
                                    ({kpi.madrasah} / {kpi.personal})
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="kh-kpi">
                        <div className="kh-kpi-icon">S</div>
                        <div>
                            <div className="kh-kpi-label">Sakit (R / S / B / K)</div>
                            <div className="kh-kpi-value">
                                {kpi.sakit}
                                <span style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '6px', fontWeight: 500 }}>
                                    ({kpi.ringan}/{kpi.sedang}/{kpi.berat}/{kpi.kontrol})
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filter Card */}
                <div className="kh-card" style={{ padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '0.75rem' }}>
                        <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem', color: '#1e293b' }}>
                                Cari (NISN/Nama/Kelas)
                            </label>
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Ketik untuk mencari..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.4rem 0.7rem',
                                    borderRadius: '999px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '0.84rem',
                                    color: '#1e293b',
                                    fontWeight: 500
                                }}
                            />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem', color: '#1e293b' }}>
                                Kelas
                            </label>
                            <select
                                className="form-select"
                                value={filterKelas}
                                onChange={(e) => setFilterKelas(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.4rem 0.7rem',
                                    borderRadius: '999px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '0.84rem'
                                }}
                            >
                                <option value="">Semua</option>
                                {availableClasses.map(cls => (
                                    <option key={cls} value={cls}>{cls}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem', color: '#1e293b' }}>
                                Jenis
                            </label>
                            <select
                                className="form-select"
                                value={filterJenis}
                                onChange={(e) => setFilterJenis(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: '0.4rem 0.7rem',
                                    borderRadius: '999px',
                                    border: '1px solid #d1d5db',
                                    fontSize: '0.84rem'
                                }}
                            >
                                <option value="">Semua</option>
                                <option value="IZIN">IZIN</option>
                                <option value="SAKIT">SAKIT</option>
                            </select>
                        </div>

                        <div>
                            <label style={{ fontSize: '0.82rem', fontWeight: 700, display: 'block', marginBottom: '0.3rem', color: '#1e293b' }}>
                                Bulan
                            </label>
                            <MonthSelect
                                selectedMonths={filterMonths}
                                onChange={setFilterMonths}
                            />
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="kh-card kh-table-wrap">
                    <div style={{ maxHeight: '560px', overflow: 'auto' }}>
                        <table className="kh-table">
                            <thead>
                                <tr>
                                    <th style={{ width: '8%', whiteSpace: 'nowrap' }}>Jenis</th>
                                    <th style={{ width: '10%' }}>NISN</th>
                                    <th style={{ width: '18%' }}>Nama</th>
                                    <th style={{ width: '8%', textAlign: 'center' }}>Kelas</th>
                                    <th style={{ width: '14%' }}>Periode</th>
                                    <th style={{ width: '12%' }}>Status</th>
                                    <th style={{ width: '20%' }}>Keterangan</th>
                                    <th style={{ width: '10%', textAlign: 'right' }}>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                            Memuat data...
                                        </td>
                                    </tr>
                                ) : rows.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                                            Tidak ada data
                                        </td>
                                    </tr>
                                ) : (
                                    rows.map((row) => (
                                        <tr key={row.id}>
                                            <td data-label="Jenis">
                                                <span className={`pill pill-${row.jenis.toLowerCase()}`}>
                                                    {row.jenis}
                                                </span>
                                            </td>
                                            <td data-label="NISN">
                                                <span style={{ fontFamily: 'monospace' }}>{row.nisn}</span>
                                            </td>
                                            <td data-label="Nama">{row.nama}</td>
                                            <td data-label="Kelas" style={{ textAlign: 'center', fontWeight: 'bold' }}>{row.kelas}</td>
                                            <td data-label="Periode">
                                                {formatDate(row.tgl_mulai)} s/d {formatDate(row.tgl_selesai)}
                                            </td>
                                            <td data-label="Status">
                                                {row.jenis === 'IZIN' ? (
                                                    <span className={`pill pill-${row.status.toLowerCase()}`}>
                                                        {row.status === 'MADRASAH' ? 'Madrasah' : row.status === 'PERSONAL' ? 'Personal' : row.status}
                                                    </span>
                                                ) : (
                                                    <span className={`pill pill-${row.status.toLowerCase()}`}>
                                                        {row.status}
                                                    </span>
                                                )}
                                            </td>
                                            <td data-label="Keterangan" style={{ maxWidth: '200px' }}>
                                                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={row.keterangan}>
                                                    {row.keterangan}
                                                </div>
                                            </td>
                                            <td data-label="Aksi" style={{ textAlign: 'right' }}>
                                                <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                    <button
                                                        className="btn-icon-soft"
                                                        title="Cetak Surat (Doc)"
                                                        onClick={() => handlePrintSingle(row)}
                                                    >
                                                        <i className="bi bi-printer"></i>
                                                    </button>
                                                    <button
                                                        className="btn-icon-soft"
                                                        title="Edit"
                                                        onClick={() => openEditModal(row)}
                                                    >
                                                        <i className="bi bi-pencil"></i>
                                                    </button>
                                                    <button
                                                        className="btn-icon-delete"
                                                        title="Hapus"
                                                        onClick={() => openDeleteModal(row)}
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer */}
                    <div className="kh-footer">
                        <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
                            Menampilkan {rows.length} data
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

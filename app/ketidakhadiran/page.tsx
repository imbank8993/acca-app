'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import './ketidakhadiran.css';
import AddModal from './components/AddModal';
import MonthSelect from './components/MonthSelect';

interface KetidakhadiranRow {
    id: string;
    jenis: 'IZIN' | 'SAKIT';
    nisn: string;
    nama: string;
    kelas: string;
    tgl_mulai: string;
    tgl_selesai: string;
    status: string;
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

    // Filters
    const [filterKelas, setFilterKelas] = useState('');
    const [filterJenis, setFilterJenis] = useState('');
    const [filterMonths, setFilterMonths] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Dynamic Classes
    const [availableClasses, setAvailableClasses] = useState<string[]>([]);

    useEffect(() => {
        fetchClasses();
    }, []);

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

            const res = await fetch(`/api/ketidakhadiran?${params.toString()}`);
            const data = await res.json();

            if (data.ok) {
                setRows(data.rows);
                calculateKPI(data.rows);
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

    // ========== EDIT MODAL ==========
    const openEditModal = async (row: KetidakhadiranRow) => {
        const { value: formValues } = await Swal.fire({
            title: 'Edit Ketidakhadiran',
            html: `
        <div style="text-align: left;">
          <div style="margin-bottom: 1rem; padding: 0.75rem; background: #f3f4f6; border-radius: 8px;">
            <div style="font-size: 0.8rem; color: #6b7280;">Jenis: <strong>${row.jenis}</strong></div>
            <div style="font-size: 0.8rem; color: #6b7280; margin-top: 0.25rem;">NISN: <strong>${row.nisn}</strong> - ${row.nama}</div>
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; font-size: 0.85rem;">Status</label>
            <select id="edit-status" class="swal2-input" style="width: 100%;">
              ${row.jenis === 'IZIN'
                    ? `<option value="MADRASAH" ${row.status === 'MADRASAH' ? 'selected' : ''}>MADRASAH</option>
                   <option value="PERSONAL" ${row.status === 'PERSONAL' ? 'selected' : ''}>PERSONAL</option>`
                    : `<option value="Ringan" ${row.status === 'Ringan' ? 'selected' : ''}>Ringan</option>
                   <option value="Sedang" ${row.status === 'Sedang' ? 'selected' : ''}>Sedang</option>
                   <option value="Berat" ${row.status === 'Berat' ? 'selected' : ''}>Berat</option>
                   <option value="Kontrol" ${row.status === 'Kontrol' ? 'selected' : ''}>Kontrol</option>`
                }
            </select>
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; font-size: 0.85rem;">Tanggal Mulai</label>
            <input type="date" id="edit-mulai" class="swal2-input" style="width: 100%;" value="${row.tgl_mulai}">
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; font-size: 0.85rem;">Tanggal Selesai</label>
            <input type="date" id="edit-selesai" class="swal2-input" style="width: 100%;" value="${row.tgl_selesai}">
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; font-size: 0.85rem;">Keterangan</label>
            <textarea id="edit-ket" class="swal2-textarea" style="width: 100%;">${row.keterangan}</textarea>
          </div>

          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-weight: 600; margin-bottom: 0.3rem; font-size: 0.85rem;">Terapkan untuk</label>
            <div style="display: flex; gap: 1rem; margin-top: 0.5rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="radio" name="edit-scope" value="ONE" checked>
                <span style="font-size: 0.85rem;">Hanya siswa ini</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="radio" name="edit-scope" value="ALL">
                <span style="font-size: 0.85rem;">Semua dalam grup</span>
              </label>
            </div>
            <div style="font-size: 0.75rem; color: #6b7280; margin-top: 0.25rem;">
              Grup: siswa dengan jenis, tanggal, dan keterangan yang sama
            </div>
          </div>
        </div>
      `,
            width: 600,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Simpan',
            cancelButtonText: 'Batal',
            preConfirm: () => {
                const status = (document.getElementById('edit-status') as HTMLSelectElement).value;
                const mulai = (document.getElementById('edit-mulai') as HTMLInputElement).value;
                const selesai = (document.getElementById('edit-selesai') as HTMLInputElement).value;
                const keterangan = (document.getElementById('edit-ket') as HTMLTextAreaElement).value.trim();
                const scopeEl = document.querySelector('input[name="edit-scope"]:checked') as HTMLInputElement;
                const scope = scopeEl ? scopeEl.value : 'ONE';

                if (!status || !mulai || !selesai || !keterangan) {
                    Swal.showValidationMessage('Semua field wajib diisi');
                    return;
                }

                return {
                    scope,
                    status,
                    tgl_mulai: mulai,
                    tgl_selesai: selesai,
                    keterangan
                };
            }
        });

        if (formValues) {
            await submitEdit(row.id, formValues);
        }
    };

    const submitEdit = async (id: string, payload: any) => {
        try {
            Swal.fire({
                title: 'Menyimpan...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const res = await fetch(`/api/ketidakhadiran/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();

            if (data.ok) {
                await Swal.fire({ title: 'Berhasil!', text: data.message || 'Data berhasil diupdate', icon: 'success', confirmButtonColor: '#0b1b3a' });
                loadData();
            } else {
                await Swal.fire({ title: 'Gagal', text: data.error || 'Terjadi kesalahan', icon: 'error', confirmButtonColor: '#0b1b3a' });
            }
        } catch (error) {
            console.error('Edit error:', error);
            await Swal.fire('Gagal', 'Terjadi kesalahan saat mengupdate data', 'error');
        }
    };

    // ========== DELETE ==========
    const confirmDelete = async (row: KetidakhadiranRow) => {
        const { value: scope } = await Swal.fire({
            title: 'Hapus Data?',
            html: `
        <div style="text-align: left;">
          <p style="margin-bottom: 1rem;">Data: <strong>${row.nisn}</strong> - ${row.nama}</p>
          <div style="margin-bottom: 1rem;">
            <label style="display: block; font-weight: 600; margin-bottom: 0.5rem; font-size: 0.85rem;">Pilih cara menghapus:</label>
            <div style="display: flex; gap: 1rem;">
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="radio" name="delete-scope" value="ONE" checked>
                <span style="font-size: 0.85rem;">Hanya siswa ini</span>
              </label>
              <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
                <input type="radio" name="delete-scope" value="ALL">
                <span style="font-size: 0.85rem;">Semua dalam grup</span>
              </label>
            </div>
          </div>
        </div>
      `,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Hapus',
            cancelButtonText: 'Batal',
            confirmButtonColor: '#b91c1c',
            preConfirm: () => {
                const scopeEl = document.querySelector('input[name="delete-scope"]:checked') as HTMLInputElement;
                return scopeEl ? scopeEl.value : 'ONE';
            }
        });

        if (scope) {
            await submitDelete(row.id, scope);
        }
    };

    const submitDelete = async (id: string, scope: string) => {
        try {
            Swal.fire({
                title: 'Menghapus...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            const res = await fetch(`/api/ketidakhadiran/${id}?scope=${scope}`, {
                method: 'DELETE'
            });

            const data = await res.json();

            if (data.ok) {
                await Swal.fire('Berhasil!', data.message || 'Data berhasil dihapus', 'success');
                loadData();
            } else {
                await Swal.fire('Gagal', data.error || 'Terjadi kesalahan', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            await Swal.fire('Gagal', 'Terjadi kesalahan saat menghapus data', 'error');
        }
    };

    return (
        <div className="kh-wrap">
            <AddModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={loadData}
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
                        <button className="btn-kh-navy" onClick={openBulkAddModal}>
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
                                    <th>Jenis</th>
                                    <th>NISN</th>
                                    <th>Nama</th>
                                    <th>Kelas</th>
                                    <th>Periode</th>
                                    <th>Status</th>
                                    <th>Keterangan</th>
                                    <th style={{ textAlign: 'right' }}>Aksi</th>
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
                                            <td data-label="Kelas">{row.kelas}</td>
                                            <td data-label="Periode">
                                                {formatDate(row.tgl_mulai)} s/d {formatDate(row.tgl_selesai)}
                                            </td>
                                            <td data-label="Status">
                                                {row.jenis === 'IZIN' ? (
                                                    <span className={`pill pill-${row.status.toLowerCase()}`}>
                                                        {row.status}
                                                    </span>
                                                ) : (
                                                    <span>{row.status}</span>
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
                                                        onClick={() => Swal.fire('Info', 'Fitur cetak sedang dikembangkan', 'info')}
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
                                                        onClick={() => confirmDelete(row)}
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

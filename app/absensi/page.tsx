'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import './absensi.css';

// Types
interface Scope {
    kelasList: string[];
    mapelByKelas: Record<string, string[]>;
    jamKeByKelasMapel: Record<string, string[]>;
    guru?: { nama: string; guruId: string };
}

interface Sesi {
    sesi_id: string;
    kelas: string;
    mapel: string;
    tanggal: string;
    jam_ke: string;
    nama_guru: string;
    status_sesi: 'DRAFT' | 'FINAL';
    draft_type: string;
}

interface AbsensiRow {
    nisn: string;
    nama_snapshot: string;
    status: 'HADIR' | 'IZIN' | 'SAKIT' | 'ALPHA';
    otomatis: boolean;
    ref_ketidakhadiran_id?: string;
    catatan?: string;
    keterangan?: string;
}

export default function AbsensiPage() {
    const guruId = 'G-IC-001';

    const [namaGuru, setNamaGuru] = useState('');
    const [guruIdDisplay, setGuruIdDisplay] = useState('');
    const [scope, setScope] = useState<Scope | null>(null);
    const [kelas, setKelas] = useState('');
    const [mapel, setMapel] = useState('');
    const [tanggal, setTanggal] = useState('');
    const [jamKe, setJamKe] = useState('');

    const [currentSesi, setCurrentSesi] = useState<Sesi | null>(null);
    const [rows, setRows] = useState<AbsensiRow[]>([]);
    const [initialSnapshot, setInitialSnapshot] = useState<Map<string, string>>(new Map());

    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const today = new Date().toISOString().split('T')[0];
        setTanggal(today);
    }, []);

    useEffect(() => {
        if (guruId) loadScopes();
    }, [guruId]);

    useEffect(() => {
        if (scope && kelas) {
            const mapelList = scope.mapelByKelas[kelas] || [];
            if (mapelList.length > 0 && !mapel) setMapel(mapelList[0]);
        }
    }, [kelas, scope]);

    useEffect(() => {
        if (scope && kelas && mapel) {
            const key = `${kelas}||${mapel}`;
            const jamList = scope.jamKeByKelasMapel[key] || ['1'];
            if (jamList.length > 0 && !jamKe) setJamKe(jamList[0]);
        }
    }, [kelas, mapel, scope]);

    async function loadScopes() {
        try {
            const res = await fetch(`/api/scopes?guru_id=${guruId}`);
            const json = await res.json();
            if (json.ok && json.data) {
                setScope(json.data);
                if (json.data.guru?.nama) {
                    setNamaGuru(json.data.guru.nama);
                    setGuruIdDisplay(json.data.guru.guruId);
                }
                if (json.data.kelasList?.length > 0) setKelas(json.data.kelasList[0]);
            }
        } catch (error) {
            console.error(error);
        }
    }

    async function bukaSesi() {
        if (!kelas || !mapel || !tanggal || !jamKe) {
            Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Lengkapi data sesi terlebih dahulu' });
            return;
        }

        setLoading(true);
        Swal.fire({ title: 'Memuat Data...', text: 'Mengambil data siswa & status', didOpen: () => Swal.showLoading() });

        try {
            const sesiRes = await fetch('/api/absensi/sesi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guru_id: guruId, kelas, mapel, tanggal, jam_ke: jamKe, nama_guru: namaGuru })
            });
            const sesiJson = await sesiRes.json();
            if (!sesiJson.ok) throw new Error(sesiJson.error || 'Gagal memuat absensi');
            const sesi = sesiJson.data;

            const detailRes = await fetch(`/api/absensi/detail?sesi_id=${sesi.sesi_id}`);
            const detailJson = await detailRes.json();
            if (!detailJson.ok) throw new Error(detailJson.error);

            let detailRows: AbsensiRow[] = detailJson.data || [];

            if (detailRows.length === 0) {
                const siswaRes = await fetch(`/api/siswa/${encodeURIComponent(kelas)}`);
                const siswaJson = await siswaRes.json();
                if (siswaJson.ok && siswaJson.data) {
                    detailRows = siswaJson.data.map((s: any) => ({
                        nisn: s.nisn,
                        nama_snapshot: s.nama_siswa,
                        status: 'HADIR',
                        otomatis: true,
                        catatan: ''
                    }));
                    await saveAbsensiInternal(sesi.sesi_id, detailRows, false);
                }
            } else {
                detailRows = detailRows.map(r => ({
                    ...r,
                    status: r.status ? (r.status.toUpperCase() as any) : 'HADIR'
                }));
            }

            setCurrentSesi(sesi);
            setRows(detailRows);

            const snap = new Map<string, string>();
            detailRows.forEach(r => snap.set(r.nisn, r.status));
            setInitialSnapshot(snap);

            Swal.close();
        } catch (error: any) {
            Swal.close();
            Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
        } finally {
            setLoading(false);
        }
    }

    async function saveAbsensiInternal(sesiId: string, data: AbsensiRow[], makeFinal: boolean) {
        await fetch('/api/absensi/sesi', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sesi_id: sesiId, status_sesi: makeFinal ? 'FINAL' : 'DRAFT' })
        });
        await fetch('/api/absensi/detail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sesi_id: sesiId, rows: data })
        });
    }

    async function refreshKetidakhadiran() {
        if (!currentSesi || !kelas || !tanggal) {
            Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Buka sesi terlebih dahulu' });
            return;
        }

        Swal.fire({ title: 'Memuat Data Ketidakhadiran...', didOpen: () => Swal.showLoading() });

        try {
            // Fetch ketidakhadiran data for this kelas and tanggal
            const ketidakhadiranRes = await fetch(`/api/ketidakhadiran?kelas=${encodeURIComponent(kelas)}&tanggal=${tanggal}`);
            const ketidakhadiranJson = await ketidakhadiranRes.json();

            if (ketidakhadiranJson.ok && ketidakhadiranJson.data) {
                const ketidakhadiranMap = new Map<string, { status: string; keterangan: string }>();

                ketidakhadiranJson.data.forEach((k: any) => {
                    ketidakhadiranMap.set(k.nisn, {
                        status: k.status.toUpperCase(),
                        keterangan: k.keterangan || ''
                    });
                });

                // Update rows with ketidakhadiran data
                setRows(prev => prev.map(row => {
                    const ketidakhadiran = ketidakhadiranMap.get(row.nisn);
                    if (ketidakhadiran) {
                        return {
                            ...row,
                            status: ketidakhadiran.status as any,
                            catatan: ketidakhadiran.keterangan,
                            otomatis: true,
                            ref_ketidakhadiran_id: 'from_refresh'
                        };
                    }
                    return { ...row, status: 'HADIR', catatan: '', otomatis: true };
                }));

                // Update snapshot
                const snap = new Map<string, string>();
                rows.forEach(r => {
                    const ketidakhadiran = ketidakhadiranMap.get(r.nisn);
                    snap.set(r.nisn, ketidakhadiran ? ketidakhadiran.status : 'HADIR');
                });
                setInitialSnapshot(snap);

                Swal.close();
                Swal.fire({ icon: 'success', title: 'Berhasil', text: 'Data ketidakhadiran berhasil dimuat', timer: 1500, showConfirmButton: false });
            } else {
                Swal.close();
                Swal.fire({ icon: 'info', title: 'Info', text: 'Tidak ada data ketidakhadiran untuk tanggal ini' });
            }
        } catch (error: any) {
            Swal.close();
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Gagal memuat data ketidakhadiran' });
        }
    }

    async function handleSimpan(makeFinal: boolean) {
        if (!currentSesi) return;

        if (makeFinal) {
            const confirm = await Swal.fire({
                title: 'Finalkan Absensi?',
                html: 'Setelah <b>FINAL</b>, data sesi akan <b>dikunci</b> dan tidak dapat diubah.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Ya, Finalkan',
                cancelButtonText: 'Batal'
            });
            if (!confirm.isConfirmed) return;
        }

        Swal.fire({ title: makeFinal ? 'Memfinalkan...' : 'Menyimpan draft...', didOpen: () => Swal.showLoading() });

        try {
            await saveAbsensiInternal(currentSesi.sesi_id, rows, makeFinal);
            if (makeFinal) setCurrentSesi({ ...currentSesi, status_sesi: 'FINAL' });

            const snap = new Map<string, string>();
            rows.forEach(r => snap.set(r.nisn, r.status));
            setInitialSnapshot(snap);

            Swal.close();
            Swal.fire({ icon: 'success', title: 'Berhasil', text: makeFinal ? 'Sesi berhasil FINAL' : 'Draft berhasil disimpan', timer: 1500, showConfirmButton: false });
        } catch (error: any) {
            Swal.close();
            Swal.fire({ icon: 'error', title: 'Gagal', text: 'Simpan gagal' });
        }
    }

    function handleStatusChange(nisn: string, status: string) {
        setRows(prev => prev.map(row => {
            if (row.nisn === nisn) {
                // Update keterangan based on status
                let newKeterangan = row.catatan || '';
                if (row.ref_ketidakhadiran_id && row.catatan) {
                    // Keep original keterangan from ketidakhadiran
                    newKeterangan = row.catatan;
                }
                return { ...row, status: status as any, otomatis: false, catatan: newKeterangan };
            }
            return row;
        }));
    }

    const isChanged = (r: AbsensiRow) => {
        const init = initialSnapshot.get(r.nisn);
        return init && init !== r.status;
    };

    const isFinal = currentSesi?.status_sesi === 'FINAL';

    const getRowClass = (r: AbsensiRow) => {
        const statusClass = `row-${(r.status || 'hadir').toLowerCase()}`;
        const changeClass = isChanged(r) ? 'row-changed' : '';
        return `${statusClass} ${changeClass}`.trim();
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-6">

            {/* PREMIUM HEADER */}
            <div className="absensi-header">
                <h1 className="absensi-title">Absensi Guru</h1>
                <p className="absensi-subtitle">
                    Login: {namaGuru || '...'} · GuruID: {guruIdDisplay || guruId}
                </p>
            </div>

            {/* FILTER CARD */}
            <div className="filter-card">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-4">
                    <div className="md:col-span-3">
                        <div className="form-group">
                            <label className="form-label">Kelas</label>
                            <select
                                className="form-select"
                                value={kelas}
                                onChange={e => setKelas(e.target.value)}
                            >
                                {scope?.kelasList.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="md:col-span-3">
                        <div className="form-group">
                            <label className="form-label">Mata Pelajaran</label>
                            <select
                                className="form-select"
                                value={mapel}
                                onChange={e => setMapel(e.target.value)}
                            >
                                {(scope?.mapelByKelas[kelas] || []).map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="md:col-span-3">
                        <div className="form-group">
                            <label className="form-label">Tanggal Mengajar</label>
                            <input
                                type="date"
                                className="form-input"
                                value={tanggal}
                                onChange={e => setTanggal(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="md:col-span-1">
                        <div className="form-group">
                            <label className="form-label">Jam Ke</label>
                            <select
                                className="form-select"
                                value={jamKe}
                                onChange={e => setJamKe(e.target.value)}
                            >
                                {((scope && scope.jamKeByKelasMapel[`${kelas}||${mapel}`]) || ['1']).map(j => <option key={j} value={j}>{j}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="md:col-span-1">
                        <div className="form-group">
                            <label className="form-label" style={{ opacity: 0 }}>-</label>
                            <button
                                className="btn btn-primary w-full"
                                onClick={bukaSesi}
                                disabled={loading}
                            >
                                <i className="bi bi-box-arrow-in-right"></i>
                                Buka
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ height: '1rem' }}></div>

                <div className="flex flex-wrap gap-3">
                    <button
                        className="btn btn-outline"
                        disabled
                        title="Fitur akan diaktifkan setelah tabel ketidakhadiran dibuat"
                    >
                        <i className="bi bi-arrow-clockwise"></i>
                        Refresh Izin/Sakit
                    </button>
                    <button
                        className="btn btn-success"
                        disabled={!currentSesi || isFinal}
                        onClick={() => handleSimpan(false)}
                    >
                        <i className="bi bi-check-circle-fill"></i>
                        Simpan Draft
                    </button>
                    <button
                        className="btn btn-dark"
                        disabled={!currentSesi || isFinal}
                        onClick={() => handleSimpan(true)}
                    >
                        <i className="bi bi-lock-fill"></i>
                        Finalkan Sesi
                    </button>
                </div>

                {currentSesi && (
                    <div className="session-info">
                        <strong>{currentSesi.kelas}</strong> · {currentSesi.mapel} ·
                        {currentSesi.tanggal} · Jam {currentSesi.jam_ke} ·
                        <span className={`badge ${currentSesi.status_sesi === 'FINAL' ? 'badge-success' : 'badge-warning'}`}>
                            {currentSesi.status_sesi}
                        </span> ·
                        Guru: {currentSesi.nama_guru}
                    </div>
                )}
            </div>

            {/* DATA TABLE */}
            <div className="data-table">
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '60px', textAlign: 'center' }}>No</th>
                            <th style={{ width: '140px' }}>NISN</th>
                            <th>Nama Siswa</th>
                            <th style={{ minWidth: '360px' }}>Status Kehadiran</th>
                            <th style={{ minWidth: '200px' }}>Keterangan</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.length === 0 ? (
                            <tr>
                                <td colSpan={5} style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
                                    <i className="bi bi-inbox" style={{ fontSize: '2.5rem', display: 'block', marginBottom: '0.5rem' }}></i>
                                    Silakan pilih kelas dan klik <strong>Buka</strong> untuk memuat data siswa
                                </td>
                            </tr>
                        ) : (
                            rows.map((r, idx) => (
                                <tr key={r.nisn} className={getRowClass(r)}>
                                    <td style={{ textAlign: 'center', fontWeight: 600, color: '#64748b' }}>
                                        {idx + 1}
                                    </td>
                                    <td style={{ fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>
                                        {r.nisn}
                                    </td>
                                    <td style={{ fontWeight: 600, color: '#0f172a' }}>
                                        {r.nama_snapshot}
                                        {isChanged(r) && (
                                            <span className="badge badge-warning" style={{ marginLeft: '0.5rem' }}>
                                                <i className="bi bi-pencil-fill"></i>
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <StatusRadios
                                            nisn={r.nisn}
                                            index={idx}
                                            currentStatus={r.status}
                                            disabled={isFinal}
                                            onChange={handleStatusChange}
                                        />
                                    </td>
                                    <td style={{ color: '#64748b', fontSize: '0.875rem' }}>
                                        {r.catatan || '-'}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
}

// PREMIUM STATUS RADIOS COMPONENT
function StatusRadios({ nisn, index, currentStatus, disabled, onChange }: any) {
    const statuses = ['HADIR', 'IZIN', 'SAKIT', 'ALPHA'];
    const normalizedCurrent = (currentStatus || '').toUpperCase();

    return (
        <div className="status-radio-group">
            {statuses.map(status => {
                const uniqueId = `r_${nisn}_${index}_${status}`;
                const checked = normalizedCurrent === status;
                return (
                    <div key={status} className="status-radio-item">
                        <input
                            type="radio"
                            id={uniqueId}
                            name={`st_${nisn}_${index}`}
                            value={status}
                            checked={checked}
                            disabled={disabled}
                            onChange={() => onChange(nisn, status)}
                        />
                        <label
                            className="status-radio-label"
                            htmlFor={uniqueId}
                            data-status={status}
                        >
                            {status}
                        </label>
                    </div>
                );
            })}
        </div>
    );
}

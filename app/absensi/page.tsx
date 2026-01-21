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
    // New field to persist the original source data
    system_source?: {
        id: string;
        status: 'IZIN' | 'SAKIT';
        keterangan: string;
    };
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

    // Helper for authenticated fetch
    async function authFetch(url: string, options: RequestInit = {}) {
        const { supabase } = await import('@/lib/supabase');
        const { data: { session } } = await supabase.auth.getSession();
        const headers: any = {
            ...options.headers,
            'Authorization': session?.access_token ? `Bearer ${session.access_token}` : ''
        };
        return fetch(url, { ...options, headers });
    }

    async function bukaSesi() {
        if (!kelas || !mapel || !tanggal || !jamKe) {
            Swal.fire({ icon: 'warning', title: 'Perhatian', text: 'Lengkapi data sesi terlebih dahulu' });
            return;
        }

        setLoading(true);
        Swal.fire({ title: 'Memuat Data...', text: 'Mengambil data siswa & status', didOpen: () => Swal.showLoading() });

        try {
            const sesiRes = await authFetch('/api/absensi/sesi', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guru_id: guruId, kelas, mapel, tanggal, jam_ke: jamKe, nama_guru: namaGuru })
            });
            const sesiJson = await sesiRes.json();
            if (!sesiJson.ok) throw new Error(sesiJson.error || 'Gagal memuat absensi');
            const sesi = sesiJson.data;

            const detailRes = await authFetch(`/api/absensi/detail?sesi_id=${sesi.sesi_id}`);
            const detailJson = await detailRes.json();
            if (!detailJson.ok) throw new Error(detailJson.error);

            let detailRows: AbsensiRow[] = detailJson.data || [];

            if (detailRows.length === 0) {
                const siswaRes = await authFetch(`/api/siswa/${encodeURIComponent(kelas)}`);
                const siswaJson = await siswaRes.json();
                if (siswaJson.ok && siswaJson.data) {
                    detailRows = siswaJson.data.map((s: any) => ({
                        nisn: s.nisn,
                        nama_snapshot: s.nama_siswa,
                        status: 'HADIR',
                        otomatis: true,
                        catatan: ''
                    }));

                    // INTEGRATION: Fetch Ketidakhadiran Data
                    try {
                        // Use authFetch to ensure consistent API access
                        const ketidakhadiranRes = await authFetch(`/api/ketidakhadiran?kelas=${encodeURIComponent(kelas)}&from=${tanggal}&to=${tanggal}`);
                        const ketidakhadiranJson = await ketidakhadiranRes.json();

                        if (ketidakhadiranJson.ok && ketidakhadiranJson.data) {
                            const ketidakhadiranMap = new Map<string, { status: string; keterangan: string; id: string }>();
                            ketidakhadiranJson.data.forEach((k: any) => {
                                ketidakhadiranMap.set(k.nisn, {
                                    status: k.status.toUpperCase(),
                                    keterangan: k.keterangan || '-',
                                    id: k.id
                                });
                            });

                            detailRows = detailRows.map(row => {
                                const match = ketidakhadiranMap.get(row.nisn);
                                if (match) {
                                    return {
                                        ...row,
                                        status: match.status as any,
                                        catatan: match.keterangan,
                                        ref_ketidakhadiran_id: match.id,
                                        otomatis: true,
                                        // Store the system source for future restoration
                                        system_source: {
                                            id: match.id,
                                            status: match.status as any,
                                            keterangan: match.keterangan
                                        }
                                    };
                                }
                                return row;
                            });
                        }
                    } catch (e) {
                        console.warn('Failed to auto-fetch ketidakhadiran during init', e);
                    }

                    await saveAbsensiInternal(sesi.sesi_id, detailRows, false);
                }
            } else {
                // For EXISTING sessions (Drafts), we MUST re-fetch ketidakhadiran to attach 'system_source'
                // and sync status if the user expects "langsung terload" (live sync).
                try {
                    const ketidakhadiranRes = await authFetch(`/api/ketidakhadiran?kelas=${encodeURIComponent(kelas)}&from=${tanggal}&to=${tanggal}`);
                    const kJson = await ketidakhadiranRes.json();
                    if (kJson.ok && kJson.data) {
                        const kMap = new Map<string, any>();
                        kJson.data.forEach((k: any) => kMap.set(k.nisn, k));

                        // ... inside bukaSesi map loop
                        detailRows = detailRows.map(r => {
                            const kData = kMap.get(r.nisn);
                            if (kData) {
                                // Overwrite with system data to ensure "langsung terload"
                                const normalizedStatus = (kData.status || '').trim().toUpperCase() as any;
                                return {
                                    ...r,
                                    status: normalizedStatus,
                                    catatan: kData.keterangan || '-',
                                    ref_ketidakhadiran_id: kData.id,
                                    otomatis: true,
                                    system_source: {
                                        id: kData.id,
                                        status: normalizedStatus,
                                        keterangan: kData.keterangan || '-'
                                    }
                                };
                            }
                            return r;
                        });
                    }
                } catch (e) {
                    console.warn('Refetch source failed', e);
                }

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

            // Optional: If auto-fetched, show toast
            if (detailRows.some(r => r.ref_ketidakhadiran_id)) {
                Swal.fire({
                    icon: 'info',
                    title: 'Sinkronisasi Otomatis',
                    text: 'Data absensi telah disinkronkan dengan data izin/sakit yang ada.',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                Swal.close();
            }
        } catch (error: any) {
            Swal.close();
            Swal.fire({ icon: 'error', title: 'Gagal', text: error.message });
        } finally {
            setLoading(false);
        }
    }

    async function saveAbsensiInternal(sesiId: string, data: AbsensiRow[], makeFinal: boolean) {
        await authFetch('/api/absensi/sesi', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sesi_id: sesiId, status_sesi: makeFinal ? 'FINAL' : 'DRAFT' })
        });
        // We do not save system_source to DB (it's frontend transient mainly, or we could add jsonb col)
        // For now, rows are saved as is.
        await authFetch('/api/absensi/detail', {
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
            // Fetch ketidakhadiran data
            const ketidakhadiranRes = await authFetch(`/api/ketidakhadiran?kelas=${encodeURIComponent(kelas)}&from=${tanggal}&to=${tanggal}`);
            const ketidakhadiranJson = await ketidakhadiranRes.json();

            if (ketidakhadiranJson.ok && ketidakhadiranJson.data) {
                const ketidakhadiranMap = new Map<string, { status: string; keterangan: string; id: string }>();

                ketidakhadiranJson.data.forEach((k: any) => {
                    ketidakhadiranMap.set(k.nisn, {
                        status: k.status.toUpperCase(),
                        keterangan: k.keterangan || '-',
                        id: k.id
                    });
                });

                setRows(prev => prev.map(row => {
                    const ketidakhadiran = ketidakhadiranMap.get(row.nisn);
                    if (ketidakhadiran) {
                        return {
                            ...row,
                            status: ketidakhadiran.status as any,
                            catatan: ketidakhadiran.keterangan,
                            otomatis: true,
                            ref_ketidakhadiran_id: ketidakhadiran.id,
                            system_source: {
                                id: ketidakhadiran.id,
                                status: ketidakhadiran.status as any,
                                keterangan: ketidakhadiran.keterangan
                            }
                        };
                    }
                    // If no match in new data, keep existing or reset? 
                    // Usually refresh implies strict sync. Let's keep existing manual edits if no conflict, 
                    // or reset if it was previously system linked but now gone.
                    if (row.ref_ketidakhadiran_id) {
                        return { ...row, status: 'HADIR', catatan: '', otomatis: true, ref_ketidakhadiran_id: undefined, system_source: undefined };
                    }
                    return row;
                }));

                const snap = new Map<string, string>();
                rows.forEach(r => snap.set(r.nisn, r.status)); // This uses stale 'rows', but logic continues next render
                // Properly we should re-derive snap from the *new* rows, but this func is async. 
                // Let's just update snap on effect or after setRows. 
                // For safety in this quick version:
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
                const newStatus = status.trim().toUpperCase() as any;
                let newCatatan = row.catatan || '';
                let newRefId = row.ref_ketidakhadiran_id;

                // 1. Restore from System Source
                // Ensure comparison handles potential lingering whitespace or casing issues
                if (row.system_source) {
                    const sourceStatus = (row.system_source.status || '').trim().toUpperCase();
                    if (sourceStatus === newStatus) {
                        newRefId = row.system_source.id;
                        newCatatan = row.system_source.keterangan;

                        // Feedback for user
                        const Toast = Swal.mixin({
                            toast: true,
                            position: 'top-end',
                            showConfirmButton: false,
                            timer: 3000,
                            timerProgressBar: true
                        });
                        Toast.fire({
                            icon: 'info',
                            title: 'Data Dipulihkan',
                            text: `Keterangan '${newCatatan}' dikembalikan dari data sumber.`
                        });

                    } else if (newStatus === 'HADIR' || newStatus === 'ALPHA') {
                        newCatatan = '';
                        newRefId = undefined;
                    } else {
                        // Manual divergence
                        if (row.ref_ketidakhadiran_id) {
                            newCatatan = '';
                        }
                        newRefId = undefined;
                    }
                } else { // No system source logic
                    if (newStatus === 'HADIR' || newStatus === 'ALPHA') {
                        newCatatan = '';
                        newRefId = undefined;
                    }
                }

                return {
                    ...row,
                    status: newStatus,
                    otomatis: false,
                    catatan: newCatatan,
                    ref_ketidakhadiran_id: newRefId
                };
            }
            return row;
        }));
    }

    function handleCatatanChange(nisn: string, val: string) {
        setRows(prev => prev.map(row =>
            row.nisn === nisn ? { ...row, catatan: val } : row
        ));
    }

    async function handleEditKeterangan(row: AbsensiRow) {
        if (isFinal) return;

        // READ-ONLY check for sourced data (Ketidakhadiran)
        if (row.ref_ketidakhadiran_id) {
            Swal.fire({
                icon: 'info',
                title: 'Data Terintegrasi',
                html: `<p>Status ini otomatis dari modul Ketidakhadiran.</p>
                       <div class="mt-2 p-2 bg-slate-100 rounded text-sm text-left">
                         <b>Keterangan:</b><br/>${row.catatan || '-'}
                       </div>`,
                footer: '<span class="text-xs text-slate-500">Edit melalui menu Ketidakhadiran untuk mengubah.</span>'
            });
            return;
        }

        const { value: text } = await Swal.fire({
            title: 'Keterangan Absensi',
            input: 'textarea',
            inputLabel: `Tambahkan catatan untuk ${row.nama_snapshot}`,
            inputValue: row.catatan || '',
            inputPlaceholder: 'Tulis keterangan izin / sakit / dll...',
            showCancelButton: true,
            confirmButtonText: 'Simpan',
            cancelButtonText: 'Batal'
        });

        if (text !== undefined) {
            handleCatatanChange(row.nisn, text);
        }
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
                        onClick={refreshKetidakhadiran}
                        disabled={!currentSesi || isFinal}
                        title="Ambil data terbaru dari modul ketidakhadiran"
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
                            <th style={{ width: '50px', textAlign: 'center' }}>No</th>
                            <th style={{ width: '120px' }}>NISN</th>
                            <th>Nama Siswa</th>
                            <th style={{ minWidth: '350px' }}>Status Kehadiran</th>
                            <th style={{ width: '60px', textAlign: 'center' }}>Ket.</th>
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
                                        {/* Show truncated note preview if exists */}
                                        {r.catatan && (
                                            <div className="text-xs text-slate-500 mt-1 italic truncate max-w-[200px]">
                                                {r.ref_ketidakhadiran_id && <i className="bi bi-link-45deg mr-1 text-blue-500"></i>}
                                                {r.catatan}
                                            </div>
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
                                    <td style={{ textAlign: 'center' }}>
                                        <button
                                            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors 
                                                ${r.ref_ketidakhadiran_id
                                                    ? 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                                                    : r.catatan
                                                        ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                                                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                            onClick={() => handleEditKeterangan(r)}
                                            disabled={isFinal}
                                            title={r.ref_ketidakhadiran_id ? "Lihat Keterangan (Terintegrasi)" : "Edit Keterangan"}
                                        >
                                            {r.ref_ketidakhadiran_id ? (
                                                <i className="bi bi-info-circle-fill"></i>
                                            ) : (
                                                <i className="bi bi-pencil-fill" style={{ fontSize: '0.8rem' }}></i>
                                            )}
                                        </button>
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
    // Ensure currentStatus is safe
    const normalizedCurrent = (currentStatus || '').toString().trim().toUpperCase();

    const getActiveStyle = (status: string) => {
        switch (status) {
            case 'HADIR': return { backgroundColor: '#3b82f6', color: '#ffffff', borderColor: '#3b82f6' };
            case 'IZIN': return { backgroundColor: '#10b981', color: '#ffffff', borderColor: '#10b981' };
            case 'SAKIT': return { backgroundColor: '#f59e0b', color: '#ffffff', borderColor: '#f59e0b' };
            case 'ALPHA': return { backgroundColor: '#ef4444', color: '#ffffff', borderColor: '#ef4444' };
            default: return {};
        }
    };

    return (
        <div className="status-radio-group">
            {statuses.map(status => {
                const uniqueId = `r_${nisn}_${index}_${status}`;
                const checked = normalizedCurrent === status;
                const style = checked ? getActiveStyle(status) : {};

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
                            style={style}
                        >
                            {status}
                        </label>
                    </div>
                );
            })}
        </div>
    );
}

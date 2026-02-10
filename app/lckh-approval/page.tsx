'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserByAuthId } from '@/lib/auth';
import Swal from 'sweetalert2';
import PermissionGuard from '@/components/PermissionGuard';
import { hasPermission } from '@/lib/permissions-client';
import './lckh-approval.css';

export default function LckhApprovalPage() {
    const [loading, setLoading] = useState(false);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);

    // Filters
    const [periods, setPeriods] = useState<any[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState('ALL');

    // Detail View
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [reviewerNote, setReviewerNote] = useState('');
    const [saving, setSaving] = useState(false);

    // Modals
    const [showNilaiModal, setShowNilaiModal] = useState(false);
    const [nilaiDetailQuery, setNilaiDetailQuery] = useState<any>(null);
    const [nilaiStudents, setNilaiStudents] = useState<any[]>([]);
    const [loadingNilai, setLoadingNilai] = useState(false);

    const [showJurnalModal, setShowJurnalModal] = useState(false);
    const [activeJurnal, setActiveJurnal] = useState<any>(null);

    const isAdmin = user?.roles?.some((r: string) => r.toUpperCase() === 'ADMIN') || false;
    const canDo = (action: string) => {
        return hasPermission(user?.permissions || [], 'lckh_approval', action, isAdmin);
    };

    useEffect(() => {
        const init = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                const userData = await getUserByAuthId(session.user.id);
                setUser(userData);

                // Fetch Periods
                const { data: pData } = await supabase
                    .from('lckh_periods')
                    .select('*')
                    .or('status_periode.eq.OPEN,status_periode.eq.CLOSED')
                    .order('periode_kode', { ascending: false });

                if (pData && pData.length > 0) {
                    setPeriods(pData);
                    setSelectedPeriod(pData[0].periode_kode);
                }
            }
        };
        init();
    }, []);

    // Fetch Submissions
    const fetchSubmissions = async (pCode: string) => {
        setLoading(true);
        let query = supabase
            .from('lckh_submissions')
            .select('*')
            .eq('periode_kode', pCode)
            .neq('status', 'Draft');

        if (filterStatus !== 'ALL') {
            query = query.eq('status', filterStatus);
        }

        const { data, error } = await query.order('submitted_at', { ascending: false });
        if (data) setSubmissions(data);
        setLoading(false);
    }

    // Refresh when filter changes
    useEffect(() => {
        if (user && selectedPeriod) {
            fetchSubmissions(selectedPeriod);
            setSelectedItem(null);
        }
    }, [filterStatus, selectedPeriod, user]);

    const handleApprove = async () => {
        if (!selectedItem || !user) return;

        const userRoles = Array.isArray(user.roles) ? user.roles : [user.role || ''];
        const isWaka = userRoles.some((r: string) => r.toUpperCase().includes('WAKA') || r.toUpperCase().includes('ADMIN'));
        const isKamad = userRoles.some((r: string) => r.toUpperCase().includes('KAMAD') || r.toUpperCase().includes('ADMIN'));

        let nextStatus = '';
        const current = selectedItem.status;

        if (current === 'Submitted') {
            if (isWaka) nextStatus = 'Approved_Waka';
            else {
                Swal.fire('Akses Ditolak', 'Hanya Waka Kurikulum yang dapat melakukan persetujuan tahap pertama.', 'error');
                return;
            }
        } else if (current === 'Approved_Waka') {
            if (isKamad) nextStatus = 'Approved_Kamad';
            else {
                Swal.fire('Akses Ditolak', 'Hanya Kepala Madrasah yang dapat melakukan persetujuan tahap akhir.', 'error');
                return;
            }
        } else {
            Swal.fire('Status Invalid', `Status dokumen ${current} tidak dapat disetujui.`, 'warning');
            return;
        }

        const confirm = await Swal.fire({
            title: 'Setujui Laporan?',
            text: `Anda akan memberikan persetujuan untuk laporan ${selectedItem.nama_guru_snap}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Ya, Setujui',
            confirmButtonColor: '#0038A8',
            cancelButtonText: 'Batal'
        });

        if (!confirm.isConfirmed) return;

        setSaving(true);
        try {
            // Generate Approval Code
            let approvalCode = null;
            if (nextStatus === 'Approved_Kamad') {
                const randomSuffix = Math.floor(1000 + Math.random() * 9000);
                const nipSafe = selectedItem.nip ? selectedItem.nip.replace(/[^0-9]/g, '').substring(0, 6) : 'NONIP';
                approvalCode = `LCKH-${selectedItem.periode_kode}-${nipSafe}-${randomSuffix}`;
            }

            const updatePayload: any = {
                status: nextStatus,
                catatan_reviewer: reviewerNote,
                updated_at: new Date().toISOString()
            };

            if (nextStatus === 'Approved_Kamad' && approvalCode) {
                updatePayload.approval_code = approvalCode;
                updatePayload.full_approved_at = new Date().toISOString();
                updatePayload.approved_by_kamad = user.id;
            } else if (nextStatus === 'Approved_Waka') {
                updatePayload.approved_by_waka = user.id;
            }

            const { error } = await supabase.from('lckh_submissions').update(updatePayload).eq('id', selectedItem.id);
            if (error) throw error;

            // Insert Log
            await supabase.from('lckh_approvals').insert({
                lckh_submission_id: selectedItem.id,
                level: nextStatus === 'Approved_Kamad' ? 'KAMAD' : 'WAKA',
                status_approval: 'APPROVED',
                approver_id: user.id,
                approver_name: user?.nama || user?.username || 'Unknown',
                approved_at: new Date().toISOString(),
                catatan: reviewerNote
            });

            Swal.fire('Berhasil', 'Laporan berhasil disetujui.', 'success');
            setSelectedItem(null);
            fetchSubmissions(selectedPeriod);
            // Trigger notification refresh in header
            window.dispatchEvent(new Event('refresh-lckh-notification'));
        } catch (e: any) {
            Swal.fire('Error', e.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleReject = async () => {
        if (!selectedItem) return;
        if (!reviewerNote.trim()) {
            Swal.fire('Catatan Wajib', 'Harap isi alasan pengembalian/revisi.', 'warning');
            return;
        }

        const confirm = await Swal.fire({
            title: 'Kembalikan Laporan?',
            text: 'Laporan akan dikembalikan ke Guru untuk diperbaiki.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Ya, Kembalikan',
            confirmButtonColor: '#dc2626'
        });

        if (!confirm.isConfirmed) return;

        setSaving(true);
        try {
            const { error } = await supabase.from('lckh_submissions').update({
                status: 'Revisi',
                catatan_reviewer: reviewerNote,
                updated_at: new Date().toISOString()
            }).eq('id', selectedItem.id);

            if (error) throw error;

            await supabase.from('lckh_approvals').insert({
                lckh_submission_id: selectedItem.id,
                level: 'VERIFICATOR',
                status_approval: 'REJECTED',
                approver_id: user.id,
                approver_name: user?.nama || user?.username || 'Unknown',
                approved_at: new Date().toISOString(),
                catatan: reviewerNote
            });

            Swal.fire('Berhasil', 'Laporan telah dikembalikan.', 'info');
            setSelectedItem(null);
            fetchSubmissions(selectedPeriod);
            // Trigger notification refresh in header
            window.dispatchEvent(new Event('refresh-lckh-notification'));
        } catch (e: any) {
            Swal.fire('Error', e.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const getStatusStyle = (s: string) => {
        switch (s) {
            case 'Submitted': return { bg: '#eff6ff', color: '#1d4ed8', label: 'MENUNGGU WAKA' };
            case 'Approved_Waka': return { bg: '#ecfdf5', color: '#059669', label: 'MENUNGGU KAMAD' };
            case 'Approved_Kamad': return { bg: '#f0fdf4', color: '#16a34a', label: 'DISAHKAN' };
            case 'Revisi': return { bg: '#fef2f2', color: '#dc2626', label: 'REVISI' };
            default: return { bg: '#f1f5f9', color: '#64748b', label: s };
        }
    };

    const parsedRingkasan = useMemo(() => {
        if (!selectedItem?.catatan_guru) return [];
        try {
            const clean = selectedItem.catatan_guru.trim();
            if (clean.startsWith('[{')) return JSON.parse(clean);
            return [];
        } catch (e) {
            return [];
        }
    }, [selectedItem]);

    const openNilaiDetail = async (item: any) => {
        setNilaiDetailQuery(item);
        setShowNilaiModal(true);
        setLoadingNilai(true);
        setNilaiStudents([]);

        try {
            const params = new URLSearchParams({
                kelas: item.kelas,
                mapel: item.mapel,
                jenis: item.jenis,
                tagihan: item.tagihan || '',
                materi: item.materi_tp || item.materi || ''
            });

            const res = await fetch(`/api/lckh/nilai-detail?${params.toString()}`);
            const data = await res.json();
            if (data.ok) {
                setNilaiStudents(data.students);
            }
        } catch (e) {
            console.error('Error fetching nilai detail:', e);
        } finally {
            setLoadingNilai(false);
        }
    };

    const openJurnalDetail = (j: any) => {
        setActiveJurnal(j);
        setShowJurnalModal(true);
    };

    return (
        <PermissionGuard requiredPermission={{ resource: 'lckh_approval', action: 'view' }}>
            <div className="la-container">
                {/* Dual-Pane View: Sidebar List */}
                <aside className="la-sidebar">
                    <div className="la-sidebar-header">
                        <h2>APPROVAL LCKH</h2>
                        <div className="la-filters">
                            <select
                                className="la-select"
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                            >
                                {periods.map(p => (
                                    <option key={p.periode_kode} value={p.periode_kode}>{p.periode_nama}</option>
                                ))}
                            </select>
                            <select
                                className="la-select text-[10px]"
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                            >
                                <option value="ALL">SEMUA STATUS</option>
                                <option value="Submitted">MENUNGGU WAKA</option>
                                <option value="Approved_Waka">MENUNGGU KAMAD</option>
                                <option value="Approved_Kamad">SUDAH SAH</option>
                                <option value="Revisi">REVISI</option>
                            </select>
                        </div>
                    </div>

                    <div className="la-item-list">
                        {loading && (
                            <div className="flex flex-col gap-3 p-4">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="h-24 bg-slate-50 animate-pulse rounded-2xl border border-slate-100"></div>
                                ))}
                            </div>
                        )}
                        {!loading && submissions.length === 0 && (
                            <div className="text-center py-20 text-gray-400">
                                <i className="bi bi-inbox text-4xl block mb-2 opacity-20"></i>
                                <span className="text-sm font-medium">Tidak ada laporan masuk</span>
                            </div>
                        )}
                        {submissions.map(sub => {
                            const style = getStatusStyle(sub.status);
                            return (
                                <div
                                    key={sub.id}
                                    className={`la-item ${selectedItem?.id === sub.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setSelectedItem(sub);
                                        setReviewerNote(sub.catatan_reviewer || '');
                                    }}
                                >
                                    <div className="la-item-name">{sub.nama_guru_snap}</div>
                                    <div className="la-item-meta">
                                        <i className="bi bi-person-badge"></i>
                                        {sub.nip || '-'}
                                    </div>
                                    <div className="la-item-meta mt-1">
                                        <i className="bi bi-clock"></i>
                                        {new Date(sub.submitted_at).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                                    </div>
                                    <div
                                        className="la-status-pill"
                                        style={{ backgroundColor: style.bg, color: style.color }}
                                    >
                                        {style.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="la-content">
                    {selectedItem ? (
                        <>
                            <header className="la-content-header">
                                <div>
                                    <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">
                                        {selectedItem.nama_guru_snap}
                                    </h1>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        NIP. {selectedItem.nip || '-'} • PERIODE {periods.find(p => p.periode_kode === selectedPeriod)?.periode_nama}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase">Status Saat Ini</div>
                                        <div className="text-xs font-black text-blue-600 uppercase">
                                            {getStatusStyle(selectedItem.status).label}
                                        </div>
                                    </div>
                                </div>
                            </header>

                            <div className="la-scroll-body">
                                {/* Summary Stats */}
                                <div className="la-stats-grid">
                                    <div className="la-stat-card bg-[#0038A8] text-white">
                                        <span className="la-stat-label">Total Jam Mengajar</span>
                                        <span className="la-stat-value">{selectedItem.snap_total_jam_mengajar || 0}</span>
                                    </div>
                                    <div className="la-stat-card bg-emerald-500 text-white">
                                        <span className="la-stat-label">Jurnal Terisi</span>
                                        <span className="la-stat-value">{selectedItem.snap_ringkasan_umum?.total_jurnal_isi || 0}</span>
                                    </div>
                                    <div className="la-stat-card bg-amber-500 text-white">
                                        <span className="la-stat-label">Input Nilai</span>
                                        <span className="la-stat-value">{selectedItem.snap_ringkasan_umum?.total_nilai_input || 0}</span>
                                    </div>
                                </div>

                                {/* Ringkasan Capaian */}
                                <div className="la-card">
                                    <h3 className="la-card-title">
                                        <i className="bi bi-card-list text-[#0038A8]"></i>
                                        RINGKASAN CAPAIAN KINERJA
                                    </h3>
                                    <div className="la-table-wrap">
                                        <table className="la-table">
                                            <thead>
                                                <tr>
                                                    <th>No</th>
                                                    <th>Tanggal</th>
                                                    <th>Nama Kegiatan</th>
                                                    <th>Hasil Capaian</th>
                                                    <th>Keterangan</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {parsedRingkasan.length > 0 ? parsedRingkasan.map((it: any, i: number) => (
                                                    <tr key={i}>
                                                        <td className="font-bold text-slate-400">{i + 1}</td>
                                                        <td className="whitespace-nowrap font-semibold">{it.dateStr}</td>
                                                        <td>{it.activity}</td>
                                                        <td>{it.result}</td>
                                                        <td className="text-slate-500 italic">{it.note}</td>
                                                    </tr>
                                                )) : (
                                                    <tr>
                                                        <td colSpan={5} className="text-center py-8 text-slate-400 italic">Tidak ada rincian data ringkasan</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Lampiran Absensi */}
                                <div className="la-card">
                                    <h3 className="la-card-title">
                                        <i className="bi bi-clipboard-check text-blue-500"></i>
                                        LAMPIRAN ABSENSI SISWA
                                    </h3>
                                    <div className="la-table-wrap">
                                        <table className="la-table">
                                            <thead>
                                                <tr>
                                                    <th>Kelas / Mapel</th>
                                                    <th className="text-center">Sakit</th>
                                                    <th className="text-center">Izin</th>
                                                    <th className="text-center">Alfa</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedItem.lampiran_absensi?.length > 0 ? selectedItem.lampiran_absensi.map((a: any, i: number) => (
                                                    <tr key={i}>
                                                        <td>
                                                            <div className="font-bold">{a.kelas}</div>
                                                            <div className="text-[10px] uppercase text-slate-400 font-bold">{a.mapel}</div>
                                                        </td>
                                                        <td className="text-center font-bold text-blue-600">{a.S || 0}</td>
                                                        <td className="text-center font-bold text-amber-600">{a.I || 0}</td>
                                                        <td className="text-center font-bold text-red-600">{a.A || 0}</td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan={4} className="text-center py-8 text-slate-400 italic">Tidak ada lampiran absensi</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Lampiran Jurnal */}
                                <div className="la-card">
                                    <h3 className="la-card-title">
                                        <i className="bi bi-journal-text text-emerald-500"></i>
                                        LAMPIRAN JURNAL MENGAJAR
                                    </h3>
                                    <div className="la-table-wrap">
                                        <table className="la-table la-interactive">
                                            <thead>
                                                <tr>
                                                    <th>No</th>
                                                    <th>Tgl/Jam</th>
                                                    <th>Kelas/Mapel</th>
                                                    <th>Materi Pokok</th>
                                                    <th className="text-center">H</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedItem.lampiran_jurnal?.length > 0 ? selectedItem.lampiran_jurnal.map((j: any, i: number) => (
                                                    <tr key={i} onClick={() => openJurnalDetail(j)}>
                                                        <td className="text-slate-300">{i + 1}</td>
                                                        <td>
                                                            <div className="font-bold uppercase text-[10px]">{j.hari}</div>
                                                            <div>{new Date(j.tanggal).toLocaleDateString('id-ID')}</div>
                                                            <div className="text-[9px] text-slate-400 font-bold uppercase">Jam Ke-{j.jam_ke}</div>
                                                        </td>
                                                        <td>
                                                            <div className="font-black text-blue-600">{j.kelas}</div>
                                                            <div className="text-[10px] font-bold uppercase text-slate-500">{j.mapel}</div>
                                                        </td>
                                                        <td className="max-w-[200px] truncate" title={j.materi}>{j.materi}</td>
                                                        <td className="text-center font-black bg-emerald-50 text-emerald-700">{j.H || j.hadir || j.jml_hadir || 0}</td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan={5} className="text-center py-8 text-slate-400 italic">Tidak ada lampiran jurnal</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Lampiran Nilai */}
                                <div className="la-card">
                                    <h3 className="la-card-title">
                                        <i className="bi bi-check2-square text-amber-500"></i>
                                        LAMPIRAN INPUT NILAI
                                    </h3>
                                    <div className="la-table-wrap">
                                        <table className="la-table">
                                            <thead>
                                                <tr>
                                                    <th>Kelas / Mapel</th>
                                                    <th>Jenis Tagihan</th>
                                                    <th>Materi / TP</th>
                                                    <th className="text-center">Input At</th>
                                                    <th className="text-center" style={{ width: '100px' }}>Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedItem.lampiran_nilai?.length > 0 ? selectedItem.lampiran_nilai.map((n: any, i: number) => (
                                                    <tr key={i}>
                                                        <td>
                                                            <div className="font-bold">{n.kelas}</div>
                                                            <div className="text-[10px] uppercase text-slate-400 font-bold">{n.mapel}</div>
                                                        </td>
                                                        <td><span className="px-2 py-0.5 rounded bg-amber-50 text-amber-600 font-bold text-[9px] uppercase">{n.jenis}</span></td>
                                                        <td className="max-w-[200px] truncate" title={n.tagihan || n.materi_tp}>{n.tagihan || n.materi_tp}</td>
                                                        <td className="text-center text-[10px] font-mono whitespace-nowrap">
                                                            {n.updated_at ? new Date(n.updated_at).toLocaleString() : '-'}
                                                        </td>
                                                        <td className="text-center">
                                                            <button
                                                                onClick={() => openNilaiDetail(n)}
                                                                className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors text-[10px] font-bold uppercase"
                                                            >
                                                                <i className="bi bi-eye-fill"></i>
                                                                View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )) : (
                                                    <tr><td colSpan={5} className="text-center py-8 text-slate-400 italic">Tidak ada lampiran nilai</td></tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Reviewer Section */}
                                <div className="la-card bg-slate-50 border-slate-200">
                                    <h4 className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest">Verifikasi & Catatan</h4>
                                    <textarea
                                        className="w-full bg-white border border-slate-200 rounded-2xl p-4 text-sm font-medium outline-none focus:border-blue-500 transition-all min-h-[120px]"
                                        placeholder="Berikan catatan perbaikan atau apresiasi di sini..."
                                        value={reviewerNote}
                                        onChange={(e) => setReviewerNote(e.target.value)}
                                    ></textarea>
                                </div>
                            </div>

                            <footer className="la-actions">
                                <button
                                    className="la-reject-btn hover:bg-red-100 disabled:opacity-50"
                                    onClick={handleReject}
                                    disabled={saving || !['Submitted', 'Approved_Waka'].includes(selectedItem.status) || !canDo('approve')}
                                >
                                    {saving ? (
                                        <div className="la-spinner">
                                            <span className="la-spinner-inner" style={{ background: '#dc2626' }}></span>
                                        </div>
                                    ) : 'KEMBALIKAN / REVISI'}
                                </button>
                                <button
                                    className="la-approve-btn disabled:opacity-50"
                                    onClick={handleApprove}
                                    disabled={saving || !['Submitted', 'Approved_Waka'].includes(selectedItem.status) || !canDo('approve')}
                                >
                                    {saving ? (
                                        <div className="la-spinner">
                                            <span className="la-spinner-inner" style={{ background: '#fff' }}></span>
                                        </div>
                                    ) : 'SETUJUI LAPORAN'}
                                </button>
                            </footer>
                        </>
                    ) : (
                        <div className="la-empty">
                            <i className="bi bi-file-earmark-check"></i>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Belum Ada Terpilih</h3>
                            <p className="text-sm font-medium text-slate-400">Silakan pilih salah satu laporan di daftar sebelah kiri untuk direview.</p>
                        </div>
                    )}
                </main>
            </div>

            {/* Modal Nilai Detail */}
            {showNilaiModal && (
                <div className="la-modal-overlay">
                    <div className="la-modal-card">
                        <header className="la-modal-header">
                            <div>
                                <h3 className="font-black text-slate-800 uppercase">{nilaiDetailQuery?.jenis} - {nilaiDetailQuery?.kelas}</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{nilaiDetailQuery?.mapel} • {nilaiDetailQuery?.tagihan || nilaiDetailQuery?.materi_tp}</p>
                            </div>
                            <button className="la-modal-close" onClick={() => setShowNilaiModal(false)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </header>
                        <div className="la-modal-body">
                            {loadingNilai ? (
                                <div className="py-20 text-center">
                                    <div className="la-spinner mx-auto mb-4">
                                        <span className="la-spinner-inner"></span>
                                    </div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mengambil Data Siswa...</p>
                                </div>
                            ) : (
                                <table className="la-table">
                                    <thead className="sticky top-0 z-10">
                                        <tr>
                                            <th>NISN</th>
                                            <th>Nama Siswa</th>
                                            <th className="text-center">Nilai</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nilaiStudents.map((s, idx) => (
                                            <tr key={idx}>
                                                <td className="font-mono text-[10px] text-slate-400">{s.nisn}</td>
                                                <td className="font-bold text-slate-700">{s.nama}</td>
                                                <td className="text-center">
                                                    <span className={`inline-block w-10 py-1 rounded-lg font-black text-sm ${s.nilai < 75 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                        {s.nilai ?? '-'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Jurnal Detail */}
            {showJurnalModal && activeJurnal && (
                <div className="la-modal-overlay">
                    <div className="la-modal-card max-w-[500px]">
                        <header className="la-modal-header">
                            <div>
                                <h3 className="font-black text-slate-800 uppercase">Detail Jurnal Mengajar</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeJurnal.kelas} • {activeJurnal.mapel}</p>
                            </div>
                            <button className="la-modal-close" onClick={() => setShowJurnalModal(false)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </header>
                        <div className="la-modal-body p-6">
                            <div className="grid gap-6">
                                <div className="flex gap-4">
                                    <div className="flex-1 bg-slate-50 p-4 rounded-2xl">
                                        <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Hari & Tanggal</div>
                                        <div className="font-bold text-slate-800">{activeJurnal.hari}, {new Date(activeJurnal.tanggal).toLocaleDateString('id-ID', { dateStyle: 'long' })}</div>
                                    </div>
                                    <div className="w-24 bg-blue-50 p-4 rounded-2xl text-center">
                                        <div className="text-[10px] font-black text-blue-400 uppercase mb-1">Jam Ke</div>
                                        <div className="font-black text-blue-700">{activeJurnal.jam_ke}</div>
                                    </div>
                                </div>

                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <div className="text-[10px] font-black text-slate-400 uppercase mb-1">Materi Pokok / TP</div>
                                    <div className="font-semibold text-slate-800 text-sm leading-relaxed">{activeJurnal.materi}</div>
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1 bg-emerald-50 p-4 rounded-2xl">
                                        <div className="text-[10px] font-black text-emerald-400 uppercase mb-1">Jumlah Hadir</div>
                                        <div className="font-black text-emerald-700 text-lg">{activeJurnal.H || activeJurnal.hadir || 0} Siswa</div>
                                    </div>
                                    <div className="flex-1 bg-red-50 p-4 rounded-2xl">
                                        <div className="text-[10px] font-black text-red-400 uppercase mb-1">Ketidakhadiran</div>
                                        <div className="font-black text-red-700 text-lg">{(activeJurnal.S || 0) + (activeJurnal.I || 0) + (activeJurnal.A || 0)} Siswa</div>
                                    </div>
                                </div>

                                {activeJurnal.catatan && (
                                    <div className="bg-amber-50 p-4 rounded-2xl">
                                        <div className="text-[10px] font-black text-amber-400 uppercase mb-1">Catatan KBM</div>
                                        <div className="italic text-amber-800 text-sm">{activeJurnal.catatan}</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </ PermissionGuard>
    );
}

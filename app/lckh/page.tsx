'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserByAuthId } from '@/lib/auth';
import Swal from 'sweetalert2';
import PermissionGuard from '@/components/PermissionGuard';
import { hasPermission } from '@/lib/permissions-client';
import './lckh.css';

export default function LckhPage() {
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<any>(null);
    const [submission, setSubmission] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);

    const isAdmin = userData?.roles?.some((r: string) => r.toUpperCase() === 'ADMIN') || false;
    const canDo = (action: string) => {
        return hasPermission(userData?.permissions || [], 'lckh', action, isAdmin);
    };

    // Data List
    const [periods, setPeriods] = useState<any[]>([]);
    const [submissionsList, setSubmissionsList] = useState<any[]>([]);

    // Selection
    const [selectedPeriod, setSelectedPeriod] = useState<string>('');
    const [catatan, setCatatan] = useState('');

    // UI State for "Modules" (Checkboxes)
    const [modules, setModules] = useState([
        { id: 'JURNAL', label: 'Ringkasan Jurnal Mengajar', checked: true, count: 0, icon: 'bi-journal-check' },
        { id: 'ABSENSI', label: 'Rekap Absensi Siswa', checked: true, count: 0, icon: 'bi-person-check' },
        { id: 'NILAI', label: 'Daftar Nilai', checked: false, count: 0, icon: 'bi-patch-check' }, // Optional
        { id: 'TUGAS', label: 'Tugas Tambahan', checked: false, count: 0, icon: 'bi-briefcase' },
    ]);
    const [previewModule, setPreviewModule] = useState<string | null>(null);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                const uData = await getUserByAuthId(user.id);
                setUserData(uData);

                // Fetch Periods
                const { data: pData } = await supabase
                    .from('lckh_periods')
                    .select('*')
                    .or('status_periode.eq.OPEN,status_periode.eq.CLOSED')
                    .order('tgl_awal', { ascending: false });

                if (pData) setPeriods(pData);

                // Fetch All Submissions for Side Menu
                if (uData?.nip) {
                    fetchSubmissionsList(uData.nip);
                }
            }
        };
        init();
    }, []);

    const fetchSubmissionsList = async (nip: string) => {
        const { data } = await supabase
            .from('lckh_submissions')
            .select('*, lckh_periods(periode_nama, tgl_awal)')
            .eq('nip', nip)
            .order('created_at', { ascending: false });

        if (data) setSubmissionsList(data);
    };

    // When Period changes, fetch details
    useEffect(() => {
        if (userData && selectedPeriod) {
            fetchSubmissionDetail(userData.nip, selectedPeriod);
        } else {
            setSubmission(null);
            setSummary(null);
            setCatatan('');
        }
    }, [userData, selectedPeriod]);

    const fetchSubmissionDetail = async (nip: string, pCode: string) => {
        setLoading(true);
        const { data } = await supabase
            .from('lckh_submissions')
            .select('*')
            .eq('nip', nip)
            .eq('periode_kode', pCode)
            .single();

        if (data) {
            setSubmission(data);
            setSummary({
                total_jam_mengajar: data.snap_total_jam_mengajar,
                total_jurnal_isi: data.snap_ringkasan_umum?.total_jurnal_isi || 0,
                total_nilai_input: data.snap_ringkasan_umum?.total_nilai_input || 0,
                total_tugas: data.snap_ringkasan_umum?.total_tugas || (data.lampiran_tugas?.length || 0),
                // Attachments
                rekap_absensi_siswa: data.lampiran_absensi || [],
                detail_jurnal: data.lampiran_jurnal || [],
                detail_tugas: data.lampiran_tugas || [],
                detail_nilai: data.lampiran_nilai || []
            });
            setCatatan(data.catatan_guru || '');

            // Update Module Counts
            setModules(prev => prev.map(m => {
                if (m.id === 'JURNAL') return { ...m, count: data.snap_ringkasan_umum?.total_jurnal_isi || 0 };
                if (m.id === 'ABSENSI') return { ...m, count: data.lampiran_absensi?.length || 0 }; // FIX: use lampiran_absensi
                if (m.id === 'NILAI') return { ...m, count: data.snap_ringkasan_umum?.total_nilai_input || 0 };
                if (m.id === 'TUGAS') return { ...m, count: data.lampiran_tugas?.length || 0 };
                return m;
            }));

        } else {
            // No submission exists yet for this period
            setSubmission(null);
            setSummary(null);
            setCatatan('');
            // Reset modules
            setModules(prev => prev.map(m => ({ ...m, count: 0 })));
        }
        setLoading(false);
    }

    const generateSummary = async () => {
        if (!userData?.nip) {
            Swal.fire('Error', 'Data NIP Anda tidak ditemukan.', 'error');
            return;
        }
        const p = periods.find(p => p.periode_kode === selectedPeriod);
        if (!p) return;

        setLoading(true);
        try {
            // Assume API updated to accept dates
            const startDate = p.tgl_awal;
            const endDate = p.tgl_akhir;
            const res = await fetch(`/api/lckh/summary?startDate=${startDate}&endDate=${endDate}&nip=${userData.nip}&month=0&year=0`);
            const json = await res.json();

            if (json.ok) {
                setSummary(json.data);

                // Update Module Counts from generated data
                setModules(prev => prev.map(m => {
                    if (m.id === 'JURNAL') return { ...m, count: json.data.total_jurnal_isi || 0 };
                    if (m.id === 'ABSENSI') return { ...m, count: json.data.rekap_absensi_siswa?.length || 0 };
                    if (m.id === 'NILAI') return { ...m, count: json.data.total_nilai_input || 0 };
                    if (m.id === 'TUGAS') return { ...m, count: json.data.total_tugas || 0 };
                    return m;
                }));

                // Debug Info for teacher
                const { debug } = json;
                if (debug) {
                    console.log('[LCKH-DEBUG] summary api:', debug);
                }

                Swal.fire({
                    title: 'Generate Berhasil',
                    html: `
                        <div class="text-left text-xs space-y-1">
                            <p><b>Filter Identity:</b> ${json.data.debug?.targetNip || 'N/A'}</p>
                            <p><b>Periode:</b> ${json.data.debug?.startDate} s/d ${json.data.debug?.endDate}</p>
                            <hr class="my-2" />
                            <p>Jurnal: <b>${json.data.total_jurnal_isi}</b></p>
                            <p>Nilai: <b>${json.data.total_nilai_input}</b></p>
                            <p>Tugas: <b>${json.data.total_tugas}</b></p>
                        </div>
                    `,
                    icon: 'success'
                });
                syncSummary(json.data);
            } else {
                throw new Error(json.error);
            }
        } catch (e: any) {
            Swal.fire('Gagal', e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const [summaryItems, setSummaryItems] = useState<any[]>([]);

    useEffect(() => {
        if (catatan) {
            try {
                if (catatan.startsWith('[{')) {
                    setSummaryItems(JSON.parse(catatan));
                } else if (catatan.includes('|')) {
                    const lines = catatan.split('\n').filter(l => l.includes('|') && !l.includes('---|'));
                    const items = lines.slice(1).map(l => {
                        const parts = l.split('|').map(p => p.trim()).filter(p => p !== '');
                        return {
                            no: parts[0],
                            dateStr: parts[1],
                            activity: parts[2],
                            result: parts[3],
                            note: parts[4]
                        };
                    });
                    setSummaryItems(items);
                }
            } catch (e) {
                console.log('Error parsing catatan:', e);
            }
        } else {
            setSummaryItems([]);
        }
    }, [catatan]);

    const syncSummary = (targetData: any = summary) => {
        if (!targetData) return;

        const journals = targetData.detail_jurnal || [];
        const tasks = targetData.detail_tugas || [];
        const currentName = userData?.nama_lengkap || '';

        let items: any[] = [];

        journals.forEach((j: any) => {
            const isSub = j.guru_pengganti && (j.guru_pengganti.includes(currentName) || j.guru_pengganti.includes(userData?.nip));
            items.push({
                date: new Date(j.tanggal),
                activity: isSub ? `Mengajar di Kelas ${j.kelas} (Guru Pengganti)` : `Mengajar di Kelas ${j.kelas}`,
                result: `KBM ${j.mapel || j.mata_pelajaran || '-'} terlaksana. Materi: ${j.materi || '-'}`,
                note: `Siswa hadir: ${j.jml_hadir || j.H || 0}, Jam ${j.jam_ke}`
            });
        });

        tasks.forEach((t: any) => {
            items.push({
                date: new Date(t.tanggal),
                activity: t.kegiatan || (t.tugas?.jabatan || t.title || 'Tugas Tambahan'),
                result: t.hasil || 'Tugas selesai dilaksanakan',
                note: t.tugas?.jabatan || 'Tugas Tambahan'
            });
        });

        items.sort((a, b) => a.date.getTime() - b.date.getTime());

        const formatted = items.map((it, i) => ({
            no: i + 1,
            dateStr: it.date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }),
            activity: it.activity,
            result: it.result,
            note: it.note
        }));

        setSummaryItems(formatted);
        setCatatan(JSON.stringify(formatted));
    };


    const handleSave = async (isSubmit = false) => {
        if (!summary) return;

        try {
            setLoading(true);
            const p = periods.find(p => p.periode_kode === selectedPeriod);
            const pMeta = p ? { month: new Date(p.tgl_awal).getMonth() + 1, year: new Date(p.tgl_awal).getFullYear() } : { month: 0, year: 0 };

            const payload = {
                user_id: user.id,
                nip: userData.nip,
                nama_guru_snap: userData.nama_lengkap,
                periode_kode: selectedPeriod,
                bulan: pMeta.month,
                tahun: pMeta.year,
                snap_total_jam_mengajar: summary.total_jam_mengajar,
                snap_ringkasan_umum: {
                    total_jurnal_isi: summary.total_jurnal_isi,
                    total_nilai_input: summary.total_nilai_input,
                    total_tugas: summary.total_tugas
                },
                lampiran_absensi: summary.rekap_absensi_siswa,
                lampiran_jurnal: summary.detail_jurnal,
                lampiran_tugas: summary.detail_tugas,
                lampiran_nilai: summary.detail_nilai || [],
                catatan_guru: catatan,
                status: isSubmit ? 'Submitted' : 'Draft',
                submitted_at: isSubmit ? new Date().toISOString() : (submission?.submitted_at || null)
            };

            let res;
            if (submission?.id) {
                res = await supabase.from('lckh_submissions').update(payload).eq('id', submission.id);
            } else {
                res = await supabase.from('lckh_submissions').insert(payload);
            }

            if (res.error) throw res.error;

            Swal.fire('Sukses', isSubmit ? 'Laporan berhasil diajukan.' : 'Draft tersimpan.', 'success');
            if (userData?.nip) {
                fetchSubmissionsList(userData.nip);
                fetchSubmissionDetail(userData.nip, selectedPeriod);
            }

        } catch (e: any) {
            Swal.fire('Gagal', e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!submission) return;

        if (!canDo('create')) {
            Swal.fire('Akses Ditolak', 'Anda tidak memiliki izin untuk menghapus laporan.', 'error');
            return;
        }

        const conf = await Swal.fire({
            title: 'Hapus Laporan?', text: 'Data draft akan dihapus permanen.', icon: 'warning',
            showCancelButton: true, confirmButtonText: 'Hapus', confirmButtonColor: '#d33'
        });
        if (!conf.isConfirmed) return;

        setLoading(true);
        const { error } = await supabase.from('lckh_submissions').delete().eq('id', submission.id);
        setLoading(false);

        if (!error) {
            Swal.fire('Terhapus', 'Laporan dihapus.', 'success');
            setSubmission(null);
            setSummary(null);
            if (userData?.nip) fetchSubmissionsList(userData.nip);
        }
    };

    // New Creation Handler
    const handleCreateNew = async () => {
        // Find periods that don't have a submission yet
        const existingCodes = submissionsList.map(s => s.periode_kode);
        const available = periods.filter(p => !existingCodes.includes(p.periode_kode));

        if (available.length === 0) {
            Swal.fire('Info', 'Semua periode sudah ada laporannya.', 'info');
            return;
        }

        // Build options mapped by code -> name
        const options: Record<string, string> = {};
        available.forEach(p => {
            options[p.periode_kode] = p.periode_nama;
        });

        const { value: selectedCode } = await Swal.fire({
            title: 'Buat LCKH Baru',
            text: 'Pilih periode laporan yang ingin dibuat:',
            input: 'select',
            inputOptions: options,
            inputPlaceholder: 'Pilih Periode...',
            showCancelButton: true,
            confirmButtonText: 'Lanjut',
            cancelButtonText: 'Batal',
            customClass: {
                popup: 'rounded-2xl',
                confirmButton: 'bg-[#0038A8] rounded-xl px-6 py-2',
                cancelButton: 'bg-gray-100 text-gray-600 rounded-xl px-6 py-2'
            }
        });

        if (selectedCode) {
            const p = periods.find(per => per.periode_kode === selectedCode);
            if (p && p.status_periode === 'PLANNED') {
                Swal.fire('Belum Dibuka', `Belum bisa mengajukan LCKH bulan ${p.periode_nama}. Periode belum dibuka.`, 'error');
                return;
            }
            setSelectedPeriod(selectedCode);
        }
    };

    const currentPeriodObj = periods.find(p => p.periode_kode === selectedPeriod);

    return (
        <PermissionGuard requiredPermission={{ resource: 'lckh', action: 'view' }}>
            <div className="relative min-h-[calc(100vh-80px)] overflow-hidden">
                <div className={`lckh-container transition-all duration-500 ${previewModule ? 'blur-[8px] scale-[0.98] pointer-events-none' : ''}`}>

                    {/* Left Sidebar: List */}
                    <aside className="lckh-sidebar">
                        <div className="sidebar-header">
                            <h2>Daftar Laporan LCKH</h2>
                            {canDo('create') && (
                                <button onClick={handleCreateNew} className="btn-create">
                                    <i className="bi bi-plus-circle-fill"></i>
                                    <span>Buat Baru</span>
                                </button>
                            )}
                        </div>
                        <div className="flex-1 overflow-y-auto px-4 py-6 custom-scrollbar">
                            {submissionsList.map(sub => {
                                const pName = periods.find(p => p.periode_kode === sub.periode_kode)?.periode_nama || sub.periode_kode;
                                const isActive = sub.periode_kode === selectedPeriod;

                                return (
                                    <div
                                        key={sub.id}
                                        onClick={() => setSelectedPeriod(sub.periode_kode)}
                                        className={`submission-item ${isActive ? 'active' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span className="font-extrabold text-sm text-slate-800 tracking-tight">{pName}</span>
                                            <span className={`badge ${sub.status === 'Revisi' ? 'badge-danger' :
                                                sub.status === 'Submitted' ? 'badge-info' :
                                                    sub.status === 'Draft' ? 'badge-warning' : 'badge-success'}`}>
                                                {sub.status === 'Approved_Waka' || sub.status === 'Approved_Kamad' ? 'DISETUJUI' : sub.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                            <i className="bi bi-calendar-event"></i>
                                            {new Date(sub.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Placeholder for new draft */}
                            {selectedPeriod && !submissionsList.find(s => s.periode_kode === selectedPeriod) && (
                                <div className="submission-item active animate-pulse">
                                    <div className="font-extrabold text-sm text-[#0038A8] mb-2">
                                        {periods.find(p => p.periode_kode === selectedPeriod)?.periode_nama}
                                    </div>
                                    <div className="text-[10px] text-blue-600 font-black uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                        Draft Baru Terdeteksi
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Right Content: Detail */}
                    <main className="lckh-content">
                        {selectedPeriod ? (
                            <>
                                <header className="content-header shadow-sm sticky top-0 z-40">
                                    <div className="flex justify-between items-center">
                                        <div className="flex flex-col gap-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#0038A8]">
                                                    <i className="bi bi-calendar-check-fill text-xl"></i>
                                                </div>
                                                <h2 className="!text-[#0f172a] !font-black !text-2xl tracking-tight">
                                                    Periode: {currentPeriodObj?.periode_nama || selectedPeriod}
                                                </h2>
                                            </div>
                                            <p className="text-[11px] text-slate-400 font-extrabold uppercase tracking-widest flex items-center gap-2 ml-[52px]">
                                                <i className="bi bi-clock-history"></i>
                                                Rentang: {currentPeriodObj ? `${currentPeriodObj.tgl_awal} s/d ${currentPeriodObj.tgl_akhir}` : '-'}
                                            </p>
                                        </div>
                                        {submission?.status && (
                                            <div className="no-print">
                                                <span className={`px-5 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${submission.status === 'Draft' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    submission.status === 'Submitted' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                    }`}>
                                                    {submission.status} Account
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </header>

                                {/* Catatan Reviewer Alert - Show when there's feedback from reviewer */}
                                {submission?.catatan_reviewer && (
                                    <div className={`no-print mx-6 mt-4 p-4 rounded-2xl border-2 ${submission.status === 'Revisi'
                                        ? 'bg-red-50 border-red-200'
                                        : 'bg-blue-50 border-blue-200'
                                        }`}>
                                        <div className="flex items-start gap-3">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${submission.status === 'Revisi'
                                                ? 'bg-red-100 text-red-600'
                                                : 'bg-blue-100 text-blue-600'
                                                }`}>
                                                <i className={`bi ${submission.status === 'Revisi' ? 'bi-exclamation-triangle-fill' : 'bi-chat-left-text-fill'} text-lg`}></i>
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className={`font-black text-sm uppercase tracking-wider ${submission.status === 'Revisi'
                                                        ? 'text-red-700'
                                                        : 'text-blue-700'
                                                        }`}>
                                                        {submission.status === 'Revisi' ? '⚠️ PERLU PERBAIKAN' : '📝 CATATAN REVIEWER'}
                                                    </h4>
                                                    {submission.status === 'Revisi' && (
                                                        <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[8px] font-bold uppercase">
                                                            Revisi Diperlukan
                                                        </span>
                                                    )}
                                                </div>
                                                <div className={`text-sm font-medium leading-relaxed ${submission.status === 'Revisi'
                                                    ? 'text-red-800'
                                                    : 'text-blue-800'
                                                    }`}>
                                                    {submission.catatan_reviewer}
                                                </div>
                                                <div className="mt-3 flex items-center gap-2 text-[10px] text-gray-500 font-semibold">
                                                    <i className="bi bi-person-badge"></i>
                                                    <span>
                                                        {submission.approved_by_waka && `Waka: ${submission.approved_by_waka}`}
                                                        {submission.approved_by_kamad && ` • Kamad: ${submission.approved_by_kamad}`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Float Action Toolbar */}
                                <div className="no-print sticky top-0 z-[30] bg-white/80 backdrop-blur-md border-b border-gray-100/50 px-6 py-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={handleDelete}
                                            disabled={!submission || !['Draft', 'Revisi', 'Submitted'].includes(submission.status)}
                                            className="h-9 px-4 rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 hover:border-red-300 transition-all text-xs font-semibold flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm"
                                        >
                                            <i className="bi bi-trash3 text-sm"></i> <span>Hapus</span>
                                        </button>

                                        <button
                                            onClick={generateSummary}
                                            disabled={loading || (submission && !['Draft', 'Revisi', 'Submitted'].includes(submission.status)) || !canDo('create')}
                                            className="h-9 px-4 rounded-md border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all text-xs font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                                        >
                                            <i className={`bi bi-arrow-repeat text-sm ${loading ? 'animate-spin' : ''}`}></i>
                                            <span>Refresh</span>
                                        </button>

                                        <button
                                            onClick={() => handleSave(false)}
                                            disabled={loading || (submission && !['Draft', 'Revisi', 'Submitted'].includes(submission.status)) || !canDo('create')}
                                            className="h-9 px-4 rounded-md border border-blue-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition-all text-xs font-semibold flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                                        >
                                            <i className="bi bi-cloud-arrow-up text-sm"></i>
                                            <span>Simpan</span>
                                        </button>

                                        <button
                                            onClick={() => {
                                                Swal.fire({
                                                    title: submission?.status === 'Submitted' ? 'Update Ajuan?' : 'Ajukan LCKH?',
                                                    text: 'Laporan akan dikirim ke verifikator.',
                                                    icon: 'question',
                                                    showCancelButton: true,
                                                    confirmButtonText: submission?.status === 'Submitted' ? 'Update Sekarang' : 'Ajukan Sekarang',
                                                    confirmButtonColor: '#0038A8',
                                                    customClass: { popup: 'rounded-2xl', confirmButton: 'rounded-xl px-6', cancelButton: 'rounded-xl px-6' }
                                                }).then(r => { if (r.isConfirmed) handleSave(true); });
                                            }}
                                            disabled={loading || (submission && !['Draft', 'Revisi', 'Submitted'].includes(submission.status)) || !canDo('create')}
                                            className="h-9 px-4 rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-all text-xs font-semibold flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            <i className="bi bi-send-check text-sm"></i>
                                            <span>{submission?.status === 'Submitted' ? 'Update' : 'Ajukan'}</span>
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => window.print()}
                                        disabled={!summary}
                                        className="h-9 px-5 rounded-md bg-gray-900 text-white hover:bg-black transition-all text-xs font-semibold flex items-center gap-2 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <i className="bi bi-printer text-sm"></i> <span>Cetak PDF</span>
                                    </button>
                                </div>

                                {/* Scrollable Body */}
                                <div className="scroll-body custom-scrollbar">
                                    {/* Crystal Stats Dashboard */}
                                    <section className="stats-container animate-slide-up">
                                        <div className="stats-grid">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Total Jam Efektif</span>
                                                <div className="stat-value">{summary?.total_jam_mengajar || 0}</div>
                                                <div className="text-[11px] font-bold text-white/50">Jam mengajar terverifikasi</div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Jurnal & Agenda</span>
                                                <div className="stat-value">{summary?.total_jurnal_isi || 0}</div>
                                                <div className="text-[11px] font-bold text-white/50">Potensi LCKH terdeteksi</div>
                                            </div>
                                            <div className="flex flex-col gap-2">
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Tugas Tambahan</span>
                                                <div className="stat-value">{summary?.total_tugas || 0}</div>
                                                <div className="text-[11px] font-bold text-white/50">Capaian kinerja luar KBM</div>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Modules Selection */}
                                    <section className="mb-12">
                                        <div className="module-card-list">
                                            {modules.map(m => (
                                                <div key={m.id} className="module-item group relative overflow-hidden">
                                                    <div className="flex justify-between items-start mb-6">
                                                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${m.checked ? 'bg-blue-50 text-[#0038A8]' : 'bg-slate-50 text-slate-300'} transition-all duration-500 group-hover:scale-110 shadow-sm`}>
                                                            <i className={`bi ${m.icon} text-2xl`}></i>
                                                        </div>
                                                        <div className="flex flex-col items-end">
                                                            <div className="text-[20px] font-black text-slate-900 leading-none mb-1">{m.count}</div>
                                                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Entries</div>
                                                        </div>
                                                    </div>

                                                    <div className="mb-6">
                                                        <div className="text-base font-extrabold text-slate-800 mb-1">{m.label}</div>
                                                        <div className="text-[10px] text-slate-400 font-medium">Sertakan modul ini dalam kompilasi laporan akhir Anda.</div>
                                                    </div>

                                                    <div className="flex items-center justify-between pt-5 border-t border-slate-50">
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={m.checked}
                                                                onChange={(e) => setModules(prev => prev.map(mm => mm.id === m.id ? { ...mm, checked: e.target.checked } : mm))}
                                                            />
                                                            <div className="w-12 h-6.5 bg-slate-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-slate-200 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0038A8] shadow-inner"></div>
                                                        </label>
                                                        <button
                                                            onClick={() => setPreviewModule(m.id)}
                                                            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-slate-50 text-[#0038A8] text-[10px] font-black uppercase tracking-widest hover:bg-[#0038A8] hover:text-white transition-all shadow-sm"
                                                        >
                                                            <i className="bi bi-eye-fill"></i> Detail Data
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    {/* Notes Section */}
                                    <section className="notes-area">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="section-title !mb-0">
                                                <i className="bi bi-blockquote-left text-[#0038A8]"></i>
                                                RINGKASAN CAPAIAN KINERJA
                                            </h3>
                                            <button
                                                onClick={() => syncSummary()}
                                                disabled={!summary}
                                                className="px-4 py-1.5 rounded-xl bg-blue-50 text-[#0038A8] text-[10px] font-bold hover:bg-[#0038A8] hover:text-white transition-all flex items-center gap-2 border border-blue-100 shadow-sm"
                                            >
                                                <i className="bi bi-arrow-repeat"></i> Auto-Generate dari Jurnal & Tugas
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/40 bg-white min-h-[200px]">
                                            <table className="w-full text-[11px] text-left border-collapse">
                                                <thead className="bg-[#0038A8] text-white">
                                                    <tr>
                                                        <th className="px-4 py-4 text-[10px] uppercase font-bold tracking-widest text-center w-12">No</th>
                                                        <th className="px-4 py-4 text-[10px] uppercase font-bold tracking-widest w-28">Tanggal</th>
                                                        <th className="px-5 py-4 text-[10px] uppercase font-bold tracking-widest">Nama Kegiatan</th>
                                                        <th className="px-5 py-4 text-[10px] uppercase font-bold tracking-widest">Hasil Capaian</th>
                                                        <th className="px-5 py-4 text-[10px] uppercase font-bold tracking-widest">Keterangan</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {summaryItems.length > 0 ? (
                                                        summaryItems.map((item, idx) => (
                                                            <tr key={idx} className="hover:bg-blue-50/20 transition-all font-medium text-gray-700">
                                                                <td className="px-4 py-4 text-center font-bold text-gray-400">{item.no}</td>
                                                                <td className="px-4 py-4 whitespace-nowrap">{item.dateStr}</td>
                                                                <td className="px-5 py-4">{item.activity}</td>
                                                                <td className="px-5 py-4">{item.result}</td>
                                                                <td className="px-5 py-4">{item.note}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={5} className="py-20 text-center">
                                                                <div className="flex flex-col items-center gap-3 opacity-20">
                                                                    <i className="bi bi-table text-5xl"></i>
                                                                    <p className="font-bold uppercase tracking-[0.2em] text-xs">Belum ada data ringkasan</p>
                                                                    <p className="text-[10px]">Klik tombol "Auto-Generate" di atas</p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </section>
                                </div>

                                {/* Bottom Action Bar */}

                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                                    <i className="bi bi-file-earmark-text text-4xl"></i>
                                </div>
                                <p className="font-semibold text-lg text-gray-400">Belum ada periode dipilih</p>
                                <p className="text-sm">Silakan pilih dari daftar di samping atau buat baru.</p>
                            </div>
                        )}
                    </main>

                    {/* Professional Print Styles & Content */}
                    <div className="print-only hidden">
                        <div className="text-center mb-6 border-b-2 border-black pb-4">
                            <div className="font-bold text-lg">KEMENTERIAN AGAMA REPUBLIK INDONESIA</div>
                            <div className="font-bold text-xl">MAN INSAN CENDEKIA GOWA</div>
                            <div className="text-sm">Jalan Insan Cendekia No. 1, Desa Belapunranga, Kec. Parangloe, Kab. Gowa</div>
                            <div className="mt-4 font-bold text-lg underline">LAPORAN CAPAIAN KINERJA HARIAN (LCKH)</div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                            <div>
                                <table className="w-full">
                                    <tbody>
                                        <tr><td className="w-24 py-1">Nama</td><td>: {userData?.nama_lengkap}</td></tr>
                                        <tr><td className="py-1">NIP</td><td>: {userData?.nip || '-'}</td></tr>
                                        <tr><td className="py-1">Jabatan</td><td>: Guru</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div>
                                <table className="w-full">
                                    <tbody>
                                        <tr><td className="w-24 py-1">Periode</td><td>: {periods.find(p => p.periode_kode === selectedPeriod)?.periode_nama}</td></tr>
                                        <tr><td className="py-1">Status</td><td>: {submission?.status?.replace('_', ' ')}</td></tr>
                                        {submission?.approval_code && <tr><td className="py-1">Kode Dokumen</td><td className="font-mono">: {submission.approval_code}</td></tr>}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Content Replica for Print */}
                        <div className="mb-6 p-2">

                            {/* I. Uraian Kegiatan (Detailed List) - Check Module */}
                            {modules.find(m => m.id === 'JURNAL')?.checked && (
                                <>
                                    <div className="font-bold mb-2 border-b border-gray-400 pb-1">I. Uraian Kegiatan Pembelajaran</div>
                                    {(summary?.detail_jurnal && summary.detail_jurnal.length > 0) ? (
                                        <table className="w-full text-xs border-collapse border border-black mb-6">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="border border-black p-1 w-8">No</th>
                                                    <th className="border border-black p-1 w-24">Hari/Tgl</th>
                                                    <th className="border border-black p-1 w-12">Jam</th>
                                                    <th className="border border-black p-1 w-16">Kelas</th>
                                                    <th className="border border-black p-1 w-24">Mapel</th>
                                                    <th className="border border-black p-1">Materi Pokok / Bahasan</th>
                                                    <th className="border border-black p-1 w-8">H</th>
                                                    <th className="border border-black p-1 w-8">S</th>
                                                    <th className="border border-black p-1 w-8">I</th>
                                                    <th className="border border-black p-1 w-8">A</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {summary.detail_jurnal.map((j: any, idx: number) => (
                                                    <tr key={idx}>
                                                        <td className="border border-black p-1 text-center">{idx + 1}</td>
                                                        <td className="border border-black p-1">
                                                            <div className="font-semibold">{j.hari}</div>
                                                            <div className="text-[10px]">{new Date(j.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                                                        </td>
                                                        <td className="border border-black p-1 text-center">{j.jam_ke}</td>
                                                        <td className="border border-black p-1 text-center">{j.kelas}</td>
                                                        <td className="border border-black p-1">{j.mapel || j.mata_pelajaran}</td>
                                                        <td className="border border-black p-1">{j.materi}</td>
                                                        <td className="border border-black p-1 text-center">{j.H ?? j.jml_hadir ?? 0}</td>
                                                        <td className="border border-black p-1 text-center text-yellow-700 font-bold">{j.S ?? j.jml_sakit ?? 0}</td>
                                                        <td className="border border-black p-1 text-center text-blue-700 font-bold">{j.I ?? j.jml_izin ?? 0}</td>
                                                        <td className="border border-black p-1 text-center text-red-700 font-bold">{j.A ?? j.jml_alpa ?? 0}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : <p className="text-xs italic mb-4">Tidak ada data kegiatan.</p>}
                                </>
                            )}

                            <div className="font-bold mb-2 border-b border-gray-400 pb-1">II. Ringkasan Kinerja</div>
                            <div className="grid grid-cols-3 gap-4 text-center mb-4">
                                <div className="border border-black p-2">
                                    <div className="text-xs text-gray-500">Total Jam Mengajar</div>
                                    <div className="font-bold">{summary?.total_jam_mengajar || 0} Jam</div>
                                </div>
                                <div className="border border-black p-2">
                                    <div className="text-xs text-gray-500">Jurnal Terisi</div>
                                    <div className="font-bold">{summary?.total_jurnal_isi || 0} Pertemuan</div>
                                </div>
                                <div className="border border-black p-2">
                                    <div className="text-xs text-gray-500">Input Nilai</div>
                                    <div className="font-bold">{summary?.total_nilai_input || 0} Data</div>
                                </div>
                            </div>

                            {/* III. Rekap Absensi Siswa - Check Module */}
                            {modules.find(m => m.id === 'ABSENSI')?.checked && (
                                <>
                                    <div className="font-bold mb-2 border-b border-gray-400 pb-1">III. Rekap Absensi Siswa</div>
                                    {(summary?.rekap_absensi_siswa && summary.rekap_absensi_siswa.length > 0) ? (
                                        <table className="w-full text-xs border-collapse border border-black mb-4">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="border border-black p-1">Kelas</th>
                                                    <th className="border border-black p-1">Mapel</th>
                                                    <th className="border border-black p-1">Sesi</th>
                                                    <th className="border border-black p-1">H</th>
                                                    <th className="border border-black p-1">S</th>
                                                    <th className="border border-black p-1">I</th>
                                                    <th className="border border-black p-1">A</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {summary.rekap_absensi_siswa.map((bg: any, idx: number) => (
                                                    <tr key={idx}>
                                                        <td className="border border-black p-1">{bg.kelas}</td>
                                                        <td className="border border-black p-1">{bg.mapel}</td>
                                                        <td className="border border-black p-1 text-center">{bg.meetings}</td>
                                                        <td className="border border-black p-1 text-center">{bg.H}</td>
                                                        <td className="border border-black p-1 text-center">{bg.S}</td>
                                                        <td className="border border-black p-1 text-center">{bg.I}</td>
                                                        <td className="border border-black p-1 text-center">{bg.A}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : <p className="text-xs italic mb-4">Tidak ada data absensi siswa.</p>}
                                </>
                            )}

                            {/* IV. Catatan Tambahan */}
                            <div className="font-bold mb-2 border-b border-gray-400 pb-1 uppercase tracking-wider text-xs">IV. Ringkasan Capaian Kinerja</div>
                            {summaryItems.length > 0 ? (
                                <table className="w-full text-[10px] border-collapse border border-black mb-6">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="border border-black p-1.5 w-8">No</th>
                                            <th className="border border-black p-1.5 w-20">Tanggal</th>
                                            <th className="border border-black p-1.5">Nama Kegiatan</th>
                                            <th className="border border-black p-1.5">Hasil Capaian</th>
                                            <th className="border border-black p-1.5">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summaryItems.map((item: any, idx) => (
                                            <tr key={idx}>
                                                <td className="border border-black p-1.5 text-center">{item.no}</td>
                                                <td className="border border-black p-1.5 text-center">{item.dateStr}</td>
                                                <td className="border border-black p-1.5">{item.activity}</td>
                                                <td className="border border-black p-1.5">{item.result}</td>
                                                <td className="border border-black p-1.5">{item.note}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <p className="text-sm italic border border-black p-2 min-h-[50px] mb-6">{catatan || '-'}</p>
                            )}

                            {/* V. Tugas Tambahan - Check Module */}
                            {modules.find(m => m.id === 'TUGAS')?.checked && (
                                <>
                                    <div className="font-bold mb-2 border-b border-gray-400 pb-1">V. Laporan Tugas Tambahan</div>
                                    {(summary?.detail_tugas && summary.detail_tugas.length > 0) ? (
                                        <table className="w-full text-xs border-collapse border border-black mb-6">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    <th className="border border-black p-1 w-8">No</th>
                                                    <th className="border border-black p-1 w-24">Tanggal</th>
                                                    <th className="border border-black p-1">Jabatan / Tugas</th>
                                                    <th className="border border-black p-1">Kegiatan</th>
                                                    <th className="border border-black p-1">Hasil / Output</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {summary.detail_tugas.map((t: any, idx: number) => (
                                                    <tr key={idx}>
                                                        <td className="border border-black p-1 text-center">{idx + 1}</td>
                                                        <td className="border border-black p-1">
                                                            {new Date(t.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </td>
                                                        <td className="border border-black p-1 font-semibold">{t.tugas?.jabatan || '-'}</td>
                                                        <td className="border border-black p-1">{t.kegiatan}</td>
                                                        <td className="border border-black p-1">{t.hasil || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    ) : <p className="text-xs italic mb-4">Tidak ada laporan tugas tambahan.</p>}
                                </>
                            )}
                        </div>

                        {/* Signatures */}
                        <div className="grid grid-cols-3 gap-8 mt-8 page-break-inside-avoid text-sm">
                            <div className="text-center">
                                <div className="mb-16">Mengetahui,<br />Kepala Madrasah</div>
                                <div className="font-bold underline mb-1">( ....................................... )</div>
                                <div className="text-xs">NIP. .......................................</div>
                                {submission?.approved_by_kamad && <div className="text-[10px] text-green-700 font-bold border border-green-600 inline-block px-1 rounded mt-1">DISETUJUI ELEKTRONIK</div>}
                            </div>
                            <div className="text-center">
                                <div className="mb-16">Diperiksa Oleh,<br />Waka Kurikulum</div>
                                <div className="font-bold underline mb-1">( ....................................... )</div>
                                <div className="text-xs">NIP. .......................................</div>
                                {submission?.approved_by_waka && <div className="text-[10px] text-green-700 font-bold border border-green-600 inline-block px-1 rounded mt-1">DIVERIFIKASI ELEKTRONIK</div>}
                            </div>
                            <div className="text-center">
                                <div className="mb-16">Gowa, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br />Guru Mata Pelajaran</div>
                                <div className="font-bold underline mb-1">{userData?.nama_lengkap}</div>
                                <div className="text-xs">NIP. {userData?.nip}</div>
                            </div>
                        </div>

                        <div className="mt-8 text-[10px] text-gray-400 text-center border-t py-2">
                            Dokumen ini dicetak dari ACCA System pada {new Date().toLocaleString()}.
                            {submission?.approval_code ? `Kode Validasi: ${submission.approval_code}` : 'Status: Draft (Belum Final)'}
                        </div>
                    </div>

                </div>

                {
                    previewModule && (
                        <ModulePreviewModal
                            moduleCode={previewModule}
                            data={summary}
                            onClose={() => setPreviewModule(null)}
                        />
                    )
                }
            </div>
        </PermissionGuard>
    );
}

function ModulePreviewModal({ moduleCode, data, onClose }: any) {
    const [tabLocal, setTabLocal] = useState<'RECAP' | 'GRID'>('RECAP');
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [nilaiDetailModal, setNilaiDetailModal] = useState<{
        open: boolean;
        loading: boolean;
        data: any;
        error: string | null;
    }>({
        open: false,
        loading: false,
        data: null,
        error: null
    });

    useEffect(() => {
        if (moduleCode === 'ABSENSI' && data?.rekap_absensi_siswa?.length > 0) {
            setSelectedClass(data.rekap_absensi_siswa[0].kelas);
        }
    }, [data, moduleCode]);

    if (!data || !moduleCode) return null;

    let title = '';
    let content = null;
    let iconHeader = 'bi-layers-fill';

    if (moduleCode === 'JURNAL') {
        title = 'Detail Jurnal & Agenda';
        iconHeader = 'bi-journal-richtext';
        const allEntries = data.detail_jurnal || [];
        content = (
            <div className="p-8 md:p-12 animate-fade-in custom-scrollbar">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Data Terintegrasi</h4>
                        <div className="flex items-center gap-3">
                            <div className="w-1.5 h-10 bg-[#0038A8] rounded-full"></div>
                            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Log Aktivitas Pengajaran</h2>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/40">
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Tanggal & Kelas</th>
                                <th>Mata Pelajaran</th>
                                <th>Materi & Agenda</th>
                                <th className="text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allEntries.length > 0 ? (
                                allEntries.map((j: any, idx: number) => (
                                    <tr key={idx}>
                                        <td className="!py-6">
                                            <div className="font-extrabold text-slate-900 text-sm">{new Date(j.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Kelas {j.kelas || '-'}</div>
                                        </td>
                                        <td>
                                            <div className="font-bold text-slate-700">{j.mata_pelajaran || j.mapel}</div>
                                            <div className="text-[10px] text-blue-500 font-black uppercase tracking-widest mt-1">Jam Ke-{j.jam_ke || '-'}</div>
                                        </td>
                                        <td>
                                            <div className="text-slate-600 font-medium leading-relaxed max-w-sm line-clamp-3">
                                                {j.materi || <span className="opacity-30 italic">Belum diisi</span>}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <span className={`badge ${j.materi ? 'badge-success' : 'badge-warning'}`}>
                                                {j.materi ? 'Verified' : 'Pending'}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-24 text-slate-300 italic font-medium">Data entry tidak ditemukan.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    } else if (moduleCode === 'ABSENSI') {
        title = 'Rekap Absensi Siswa';
        iconHeader = 'bi-people-fill';

        const rekapClasses = (data.rekap_absensi_siswa?.map((i: any) => i.kelas) || []);
        const currentClass = selectedClass || (rekapClasses.length > 0 ? rekapClasses[0] : '');
        const filteredRecap = data.rekap_absensi_siswa?.filter((item: any) => item.kelas === currentClass) || [];

        content = (
            <div className="flex flex-col h-full">
                <div className="px-10 py-6 border-b border-slate-100/50 flex justify-between items-center bg-white/30 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-4 bg-white/50 p-1.5 rounded-2xl border border-white shadow-sm">
                        <div className="pl-4 pr-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter Kelas</div>
                        <select
                            value={currentClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="bg-white border-none px-6 py-2 rounded-xl text-xs font-black text-[#0038A8] focus:ring-2 focus:ring-blue-100 cursor-pointer outline-none min-w-[200px] shadow-sm">
                            {rekapClasses.map((cls: string) => (
                                <option key={cls} value={cls}>KELAS {cls}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="p-10">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
                        {[
                            { l: 'Hadir', v: filteredRecap.reduce((a: any, b: any) => a + b.H, 0) || 0, c: 'bg-emerald-50 text-emerald-600', icon: 'bi-check-all' },
                            { l: 'Sakit', v: filteredRecap.reduce((a: any, b: any) => a + b.S, 0) || 0, c: 'bg-amber-50 text-amber-600', icon: 'bi-bandaid' },
                            { l: 'Izin', v: filteredRecap.reduce((a: any, b: any) => a + b.I, 0) || 0, c: 'bg-blue-50 text-blue-600', icon: 'bi-envelope-paper' },
                            { l: 'Alpa', v: filteredRecap.reduce((a: any, b: any) => a + b.A, 0) || 0, c: 'bg-rose-50 text-rose-600', icon: 'bi-x-circle' }
                        ].map((stat, i) => (
                            <div key={i} className="bg-white/80 p-6 rounded-3xl border border-white shadow-xl shadow-slate-200/40 flex items-center gap-5">
                                <div className={`w-12 h-12 rounded-2xl ${stat.c} flex items-center justify-center text-xl shadow-inner`}>
                                    <i className={`bi ${stat.icon}`}></i>
                                </div>
                                <div>
                                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.l}</div>
                                    <div className="text-2xl font-black text-slate-900">{stat.v}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="overflow-hidden rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/40 bg-white">
                        <table className="table-premium">
                            <thead>
                                <tr>
                                    <th>Identitas Siswa</th>
                                    <th className="text-center">Sesi</th>
                                    <th className="text-center">H</th>
                                    <th className="text-center">S</th>
                                    <th className="text-center">I</th>
                                    <th className="text-center">A</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredRecap.map((item: any, idx: number) => (
                                    <tr key={idx}>
                                        <td className="!py-5">
                                            <div className="font-extrabold text-slate-800">{item.nama_lengkap || item.nama}</div>
                                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{item.nisn || 'NISN N/A'}</div>
                                        </td>
                                        <td className="text-center font-bold text-slate-500">{item.meetings || 0}</td>
                                        <td className="text-center font-black text-emerald-600">{item.H}</td>
                                        <td className="text-center font-black text-amber-600">{item.S}</td>
                                        <td className="text-center font-black text-blue-600">{item.I}</td>
                                        <td className="text-center font-black text-rose-600">{item.A}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    } else if (moduleCode === 'TUGAS') {
        title = 'Analisis Tugas Tambahan';
        iconHeader = 'bi-rocket-takeoff-fill';
        const tugasEntries = data.detail_tugas || [];
        content = (
            <div className="p-8 md:p-12 animate-fade-in custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {tugasEntries.length > 0 ? (
                        tugasEntries.map((t: any, idx: number) => (
                            <div key={idx} className="attachment-card group animate-slide-up shadow-2xl shadow-slate-200/30">
                                <div className="flex justify-between items-start mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-[#0038A8] shadow-sm transform group-hover:rotate-12 transition-transform">
                                            <i className="bi bi-briefcase-fill text-xl"></i>
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-900 text-xl tracking-tight leading-none mb-1.5">{t.tugas?.jabatan || 'Penugasan'}</div>
                                            <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">{new Date(t.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                        </div>
                                    </div>
                                    <span className="badge badge-info">Verified</span>
                                </div>
                                <div className="space-y-6">
                                    <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100">
                                        <div className="text-[9px] text-[#0038A8] font-black uppercase tracking-widest mb-2">Kegiatan Utama</div>
                                        <p className="text-slate-600 font-bold text-sm leading-relaxed">{t.kegiatan}</p>
                                    </div>
                                    {t.hasil && (
                                        <div className="p-5 bg-emerald-50/30 rounded-2xl border border-emerald-100/50">
                                            <div className="text-[9px] text-emerald-600 font-black uppercase tracking-widest mb-2">Output / Hasil</div>
                                            <p className="text-emerald-700 font-medium italic text-sm">"{t.hasil}"</p>
                                        </div>
                                    )}
                                    {t.foto_url ? (
                                        <div className="preview-container shadow-2xl shadow-blue-500/10 border-4 border-white">
                                            <img src={t.foto_url} alt={t.kegiatan} className="preview-image" />
                                            <div className="preview-overlay backdrop-blur-sm">
                                                <a href={t.foto_url} target="_blank" rel="noreferrer" className="px-8 py-3 bg-white rounded-full text-[11px] font-black text-[#0038A8] uppercase tracking-widest shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 flex items-center gap-3">
                                                    <i className="bi bi-fullscreen"></i> Perbesar Lampiran
                                                </a>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="aspect-[16/9] bg-slate-50 border-2 border-dashed border-slate-200 rounded-[32px] flex flex-col items-center justify-center text-slate-300">
                                            <i className="bi bi-camera-video-off text-4xl mb-3 opacity-20"></i>
                                            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Dokumentasi Tidak Tersedia</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="col-span-2 text-center py-32 text-slate-300 italic font-medium">Laporan tugas tambahan belum dientri.</div>
                    )}
                </div>
            </div>
        );
    } else if (moduleCode === 'NILAI') {
        title = 'Dashboard Capaian Akademik';
        iconHeader = 'bi-award-fill';
        content = (
            <div className="p-8 md:p-12 animate-fade-in custom-scrollbar">
                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                            <i className="bi bi-bar-chart-fill text-xl"></i>
                        </div>
                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Entry Summary</h4>
                            <div className="text-2xl font-black text-slate-900 tracking-tight">{data.total_nilai_input || 0} Kolom Terinput</div>
                        </div>
                    </div>
                </div>

                <div className="overflow-hidden rounded-[28px] border border-slate-100 shadow-xl shadow-slate-200/40 bg-white">
                    <table className="table-premium">
                        <thead>
                            <tr>
                                <th>Kelas & Mapel</th>
                                <th className="text-center">Jenis Tes</th>
                                <th>Keterangan Materi</th>
                                <th className="text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.detail_nilai?.map((n: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="!py-6">
                                        <div className="font-extrabold text-slate-900">{n.kelas}</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{n.mapel}</div>
                                    </td>
                                    <td className="text-center">
                                        <span className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${n.jenis === 'Sum' ? 'bg-purple-50 text-purple-600' :
                                            n.jenis === 'Pas' ? 'bg-orange-50 text-orange-600' :
                                                'bg-blue-50 text-blue-600'
                                            }`}>
                                            {n.jenis === 'Sum' ? 'Sumatif' : n.jenis === 'Pas' ? 'SAS / PAS' : 'Formatif'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="text-slate-600 font-medium text-sm line-clamp-2 max-w-xs">{n.materi}</div>
                                        <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{n.tagihan || 'Utama'}</div>
                                    </td>
                                    <td className="text-right">
                                        <button
                                            onClick={async () => {
                                                setNilaiDetailModal({ open: true, loading: true, data: null, error: null });
                                                try {
                                                    const params = new URLSearchParams();
                                                    if (n.kolom_id) params.append('kolom_id', n.kolom_id);
                                                    params.append('kelas', n.kelas || '');
                                                    params.append('mapel', n.mapel || '');
                                                    const res = await fetch(`/api/lckh/nilai-detail?${params.toString()}`);
                                                    const result = await res.json();
                                                    if (!res.ok) throw new Error(result.error || 'Server error');
                                                    setNilaiDetailModal({ open: true, loading: false, data: result, error: null });
                                                } catch (err: any) {
                                                    setNilaiDetailModal({ open: true, loading: false, data: null, error: err.message });
                                                }
                                            }}
                                            className="px-5 py-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-[#0038A8] rounded-xl font-black text-[10px] uppercase tracking-widest transition-all"
                                        >
                                            View List
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay animate-fade-in custom-scrollbar no-print">
            <div className="modal-container-glass animate-slide-up">
                <header className="px-10 py-8 border-b border-slate-100/50 flex justify-between items-center relative overflow-hidden bg-white/40 shadow-sm">
                    <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-[#0038A8] to-transparent"></div>
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-[#0038A8] flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 transform -rotate-3 group-hover:rotate-0 transition-all">
                            <i className={`bi ${iconHeader} text-2xl`}></i>
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-2">{title}</h3>
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>
                                    Operational Insights
                                </span>
                                <div className="h-3 w-[1px] bg-slate-200"></div>
                                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">Periode Aktif Terdeteksi</span>
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-2xl border border-slate-100 hover:bg-white hover:text-red-500 transition-all flex items-center justify-center text-slate-300 group shadow-sm bg-white/20"
                    >
                        <i className="bi bi-x-lg text-lg group-hover:scale-110 transition-transform"></i>
                    </button>
                </header>

                <div className="flex-1 overflow-y-auto custom-scrollbar bg-white/60 backdrop-blur-3xl">
                    {content}
                </div>

                <footer className="px-10 py-6 border-t border-slate-100/50 bg-slate-50/50 backdrop-blur-xl flex justify-between items-center">
                    <div className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest flex items-center gap-2">
                        <i className="bi bi-shield-lock-fill text-blue-400"></i> Secured Verification Mode
                    </div>
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-[#0038A8] text-white rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-[#00287a] transition-all shadow-2xl shadow-blue-500/20"
                    >
                        Selesai Meninjau
                    </button>
                </footer>
            </div>

            {/* Nested Detail Nilai Modal */}
            {nilaiDetailModal.open && (
                <div className="fixed inset-0 z-[99999] flex items-center justify-center p-8 animate-fade-in">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setNilaiDetailModal({ open: false, loading: false, data: null, error: null })}></div>
                    <div className="bg-white rounded-[32px] w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl relative z-10 overflow-hidden border border-white">
                        <header className="px-8 py-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Detail Daftar Nilai</h3>
                            <button onClick={() => setNilaiDetailModal({ open: false, loading: false, data: null, error: null })} className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </header>
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                            {nilaiDetailModal.loading && <div className="text-center py-20"><i className="bi bi-arrow-repeat animate-spin text-4xl text-[#0038A8]"></i></div>}
                            {nilaiDetailModal.error && <div className="text-center py-20 text-red-500 font-bold">{nilaiDetailModal.error}</div>}
                            {nilaiDetailModal.data && (
                                <table className="table-premium">
                                    <thead>
                                        <tr>
                                            <th>Siswa</th>
                                            <th className="text-center">Nilai</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {nilaiDetailModal.data.students?.map((s: any, i: number) => (
                                            <tr key={i}>
                                                <td className="font-bold text-slate-700">{s.nama}</td>
                                                <td className="text-center">
                                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg font-black">{s.nilai !== null ? s.nilai : '-'}</span>
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

            <style jsx>{`
                @keyframes modals-in {
                    from { opacity: 0; transform: translateY(100px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .custom-scrollbar-premium::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar-premium::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar-premium::-webkit-scrollbar-thumb { background: #e5e7eb; border-radius: 10px; }
                .custom-scrollbar-premium::-webkit-scrollbar-thumb:hover { background: #0038A8; }
            `}</style>
        </div>
    );
}

function StepItem(_props: any) {
    return null;
}

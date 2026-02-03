'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import PermissionGuard from '@/components/PermissionGuard';
import './lckh.css';

export default function LckhPage() {
    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<any>(null);
    const [submission, setSubmission] = useState<any>(null);
    const [user, setUser] = useState<any>(null);
    const [userData, setUserData] = useState<any>(null);

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
                const { data: uData } = await supabase.from('users').select('*').eq('auth_id', user.id).single();
                setUserData(uData);

                // Fetch Periods
                const { data: pData } = await supabase
                    .from('lckh_periods')
                    .select('*')
                    .or('status_periode.eq.OPEN,status_periode.eq.CLOSED')
                    .order('tgl_awal', { ascending: false });

                if (pData) setPeriods(pData);

                // Fetch All Submissions for Side Menu
                fetchSubmissionsList(user.id);
            }
        };
        init();
    }, []);

    const fetchSubmissionsList = async (uid: string) => {
        const { data } = await supabase
            .from('lckh_submissions')
            .select('*, lckh_periods(periode_nama, tgl_awal)')
            .eq('user_id', uid)
            .order('created_at', { ascending: false });

        if (data) setSubmissionsList(data);
    };

    // When Period changes, fetch details
    useEffect(() => {
        if (user && selectedPeriod) {
            fetchSubmissionDetail(user.id, selectedPeriod);
        } else {
            setSubmission(null);
            setSummary(null);
            setCatatan('');
        }
    }, [user, selectedPeriod]);

    const fetchSubmissionDetail = async (uid: string, pCode: string) => {
        setLoading(true);
        const { data } = await supabase
            .from('lckh_submissions')
            .select('*')
            .eq('user_id', uid)
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
                if (m.id === 'ABSENSI') return { ...m, count: data.rekap_absensi_siswa?.length || 0 }; // Count rekap entries
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
                nama_guru_snap: userData.nama_lengkap,
                nip: userData.nip,
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
            fetchSubmissionsList(user.id);
            fetchSubmissionDetail(user.id, selectedPeriod);

        } catch (e: any) {
            Swal.fire('Gagal', e.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!submission) return;
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
            fetchSubmissionsList(user.id);
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
                            <h2>DAFTAR LCKH</h2>
                            <button onClick={handleCreateNew} className="btn-create">
                                <i className="bi bi-plus-lg"></i> <span>Buat</span>
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {submissionsList.map(sub => {
                                const pName = periods.find(p => p.periode_kode === sub.periode_kode)?.periode_nama || sub.periode_kode;
                                const isActive = sub.periode_kode === selectedPeriod;

                                return (
                                    <div
                                        key={sub.id}
                                        onClick={() => setSelectedPeriod(sub.periode_kode)}
                                        className={`submission-item ${isActive ? 'active' : ''}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-sm text-gray-800">{pName}</span>
                                            <span className={`status-badge ${sub.status === 'Revisi' ? 'status-revisi' :
                                                sub.status === 'Submitted' ? 'status-diajukan' :
                                                    sub.status === 'Draft' ? 'status-draft' : 'status-disetujui'}`}>
                                                {sub.status === 'Approved_Waka' || sub.status === 'Approved_Kamad' ? 'DISETUJUI' : sub.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400 font-medium">
                                            <i className="bi bi-clock"></i>
                                            {new Date(sub.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Placeholder for new draft */}
                            {selectedPeriod && !submissionsList.find(s => s.periode_kode === selectedPeriod) && (
                                <div className="submission-item active">
                                    <div className="font-bold text-sm text-gray-800">{periods.find(p => p.periode_kode === selectedPeriod)?.periode_nama}</div>
                                    <div className="text-[10px] text-blue-500 font-bold mt-2 uppercase flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse"></span>
                                        Draft Baru (Belum Simpan)
                                    </div>
                                </div>
                            )}
                        </div>
                    </aside>

                    {/* Right Content: Detail */}
                    <main className="lckh-content">
                        {selectedPeriod ? (
                            <>
                                {/* Header */}
                                {/* Header: Period & Status */}
                                <header className="content-header bg-white border-b border-gray-100">
                                    <div className="flex justify-between items-center px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <h2 className="!text-[#0038A8] !font-black !text-sm uppercase tracking-[0.2em] flex items-center gap-2">
                                                <i className="bi bi-calendar3 text-base"></i>
                                                PERIODE: {currentPeriodObj?.periode_nama || selectedPeriod}
                                            </h2>
                                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider flex items-center gap-1.5 ml-6">
                                                <span className="w-1 h-1 bg-blue-500 rounded-full animate-pulse shadow-sm shadow-blue-500/50"></span>
                                                {currentPeriodObj ? `${currentPeriodObj.tgl_awal} — ${currentPeriodObj.tgl_akhir}` : '-'}
                                            </p>
                                        </div>
                                        {submission?.status && (
                                            <div className="no-print">
                                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-wider border shadow-sm ${submission.status === 'Draft' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    submission.status === 'Submitted' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                        'bg-green-50 text-green-600 border-green-100'
                                                    }`}>
                                                    Status: {submission.status}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </header>

                                {/* Float Action Toolbar */}
                                <div className="no-print sticky top-0 z-[30] bg-white/80 backdrop-blur-md border-b border-gray-100/50 px-6 py-2 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-lg border border-gray-200/50">
                                        <button
                                            onClick={handleDelete}
                                            disabled={!submission || !['Draft', 'Revisi', 'Submitted'].includes(submission.status)}
                                            className="h-7 px-2.5 rounded-md border border-red-50 bg-white text-red-500 hover:bg-red-50 transition-all text-[9px] font-black uppercase tracking-wider flex items-center gap-1 disabled:opacity-30 disabled:grayscale"
                                        >
                                            <i className="bi bi-trash3 text-xs"></i> <span>Hapus</span>
                                        </button>

                                        <div className="w-px h-4 bg-gray-200/60 mx-0.5"></div>

                                        <button
                                            onClick={generateSummary}
                                            disabled={loading || (submission && !['Draft', 'Revisi', 'Submitted'].includes(submission.status))}
                                            className="h-7 px-3 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all text-[9px] font-black uppercase tracking-wider flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <i className={`bi bi-arrow-repeat text-xs ${loading ? 'animate-spin' : ''}`}></i>
                                            <span>Refresh</span>
                                        </button>

                                        <button
                                            onClick={() => handleSave(false)}
                                            disabled={loading || (submission && !['Draft', 'Revisi', 'Submitted'].includes(submission.status))}
                                            className="h-7 px-3 rounded-md border border-blue-100 bg-white text-[#0038A8] hover:bg-blue-50 transition-all text-[9px] font-black uppercase tracking-wider flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <i className="bi bi-cloud-arrow-up text-xs"></i>
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
                                            disabled={loading || (submission && !['Draft', 'Revisi', 'Submitted'].includes(submission.status))}
                                            className="h-7 px-4 rounded-md bg-[#0038A8] text-white hover:bg-blue-800 transition-all text-[9px] font-black uppercase tracking-wider flex items-center gap-1 shadow-md shadow-blue-900/10 disabled:opacity-50"
                                        >
                                            <i className="bi bi-send-check text-xs"></i>
                                            <span>{submission?.status === 'Submitted' ? 'Update' : 'Ajukan'}</span>
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => window.print()}
                                        disabled={!summary}
                                        className="h-7 px-4 rounded-md bg-gray-900 text-white hover:bg-black transition-all text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-gray-900/10 disabled:opacity-50"
                                    >
                                        <i className="bi bi-printer text-xs"></i>
                                        <span>Cetak PDF</span>
                                    </button>
                                </div>

                                {/* Scrollable Body */}
                                <div className="scroll-body">
                                    {/* Modules Selection */}
                                    <section className="mb-6">
                                        <div className="module-card-list">
                                            {modules.map(m => (
                                                <div key={m.id} className="module-item flex flex-col justify-between h-full group">
                                                    <div className="module-info">
                                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${m.checked ? 'bg-blue-50 text-[#0038A8]' : 'bg-gray-50 text-gray-300'} transition-all duration-300 group-hover:scale-105`}>
                                                            <i className={`bi ${m.icon} text-xl`}></i>
                                                        </div>
                                                        <div>
                                                            <div className="module-name text-sm mb-0.5">{m.label}</div>
                                                            <div className="text-[9px] text-gray-400 font-bold uppercase tracking-[0.1em]">
                                                                {m.count} Entry Terdeteksi
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                                        <label className="relative inline-flex items-center cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                className="sr-only peer"
                                                                checked={m.checked}
                                                                onChange={(e) => setModules(prev => prev.map(mm => mm.id === m.id ? { ...mm, checked: e.target.checked } : mm))}
                                                            />
                                                            <div className="w-10 h-5.5 bg-gray-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-200 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#0038A8] shadow-inner"></div>
                                                        </label>
                                                        <button
                                                            onClick={() => setPreviewModule(m.id)}
                                                            className="px-4 py-1.5 rounded-lg bg-gray-50 text-[#0038A8] text-[9px] font-black uppercase tracking-widest hover:bg-[#0038A8] hover:text-white transition-all duration-300 flex items-center gap-1.5"
                                                        >
                                                            <i className="bi bi-eye-fill"></i> Detail
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3 px-1 flex items-center gap-2 text-[10px] text-gray-400 font-medium">
                                            <i className="bi bi-info-circle-fill text-blue-400"></i>
                                            Pilih modul yang akan dikompilasi ke dalam dokumen LCKH resmi Anda.
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

    useEffect(() => {
        if (moduleCode === 'ABSENSI' && data?.rekap_absensi_siswa?.length > 0) {
            setSelectedClass(data.rekap_absensi_siswa[0].kelas);
        }
    }, [data, moduleCode]);

    if (!data) return null;

    let title = '';
    let content = null;

    if (moduleCode === 'JURNAL') {
        title = 'Ringkasan Jurnal Mengajar';

        // Filter entries with and without content
        const allEntries = data.detail_jurnal || [];
        const entriesWithContent = allEntries.filter((j: any) => j.materi && j.materi.trim() !== '');
        const entriesEmpty = allEntries.length - entriesWithContent.length;

        content = (
            <div className="p-6 md:p-8 max-w-5xl mx-auto w-full">
                {/* Professional Stats Row */}
                <div className="flex items-center gap-8 mb-6 pb-5 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                            <i className="bi bi-journal-text text-blue-600 text-lg"></i>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-0.5">Total Agenda</div>
                            <div className="text-xl font-bold text-gray-900">{data.total_jurnal_isi || 0}</div>
                        </div>
                    </div>
                    <div className="w-px h-10 bg-gray-200"></div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
                            <i className="bi bi-clock text-emerald-600 text-lg"></i>
                        </div>
                        <div>
                            <div className="text-xs text-gray-500 mb-0.5">Jam Efektif</div>
                            <div className="text-xl font-bold text-gray-900">{data.total_jam_mengajar}</div>
                        </div>
                    </div>
                </div>

                {/* Enhanced Professional Table */}
                <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                    <table className="w-full text-sm border-separate" style={{ borderSpacing: '0 1px' }}>
                        <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                            <tr>
                                <th className="px-5 py-5 text-left text-xs font-bold uppercase tracking-wider w-24 first:rounded-tl-xl">Tanggal</th>
                                <th className="px-5 py-5 text-left text-xs font-bold uppercase tracking-wider w-28">Kelas</th>
                                <th className="px-5 py-5 text-left text-xs font-bold uppercase tracking-wider w-40">Mapel</th>
                                <th className="px-5 py-5 text-center text-xs font-bold uppercase tracking-wider w-24">Jam</th>
                                <th className="px-5 py-5 text-left text-xs font-bold uppercase tracking-wider">Materi</th>
                                <th className="px-5 py-5 text-center text-xs font-bold uppercase tracking-wider w-32 last:rounded-tr-xl">Kehadiran</th>
                            </tr>
                        </thead>
                        <tbody className="bg-gray-50">
                            {allEntries.length > 0 ? (
                                allEntries.map((j: any, idx: number) => {
                                    const kategori = j.kategori_kehadiran || j.kehadiran || '-';
                                    let badgeClass = 'bg-gray-100 text-gray-600';
                                    if (kategori.toLowerCase().includes('hadir') || kategori === 'H') {
                                        badgeClass = 'bg-emerald-100 text-emerald-700';
                                    } else if (kategori.toLowerCase().includes('izin') || kategori === 'I') {
                                        badgeClass = 'bg-blue-100 text-blue-700';
                                    } else if (kategori.toLowerCase().includes('sakit') || kategori === 'S') {
                                        badgeClass = 'bg-amber-100 text-amber-700';
                                    } else if (kategori.toLowerCase().includes('alpa') || kategori === 'A') {
                                        badgeClass = 'bg-rose-100 text-rose-700';
                                    }
                                    return (
                                        <tr key={idx} className="bg-white hover:bg-blue-50/40 transition-colors">
                                            <td className="px-5 py-4 whitespace-nowrap rounded-l-lg">
                                                <div className="text-sm font-semibold text-gray-900">
                                                    {new Date(j.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                </div>
                                                <div className="text-xs text-gray-500">{j.hari}</div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="text-sm font-semibold text-gray-900">{j.kelas}</div>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="text-sm font-medium text-gray-700">{j.mata_pelajaran || j.mapel}</div>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-semibold bg-blue-500 text-white rounded-md shadow-sm">{j.jam_ke || '-'}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="text-sm text-gray-700 leading-relaxed line-clamp-2">
                                                    {j.materi || <span className="text-gray-400 italic text-xs">Belum diisi</span>}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-center rounded-r-lg">
                                                <span className={`inline-block px-3 py-1.5 text-xs font-bold rounded-lg ${badgeClass} shadow-sm`}>
                                                    {kategori}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan={6} className="px-5 py-16 text-center bg-white rounded-b-xl">
                                        <div className="flex flex-col items-center">
                                            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-100 flex items-center justify-center">
                                                <i className="bi bi-journal-x text-3xl text-gray-400"></i>
                                            </div>
                                            <p className="text-sm font-semibold text-gray-600 mb-1">
                                                {allEntries.length > 0 ? 'Semua agenda belum terisi' : 'Belum ada agenda'}
                                            </p>
                                            {allEntries.length > 0 && (
                                                <p className="text-xs text-gray-400">Isi materi di menu Jurnal</p>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    } else if (moduleCode === 'ABSENSI') {
        title = 'Rekap Absensi Siswa';

        // Get all unique classes from both rekap and journals
        const rekapClasses = (data.rekap_absensi_siswa?.map((i: any) => i.kelas) || []);
        const journalClasses = (data.detail_jurnal?.filter((s: any) => s.kelas).map((s: any) => s.kelas) || []);
        const classes: string[] = Array.from(new Set([...rekapClasses, ...journalClasses])).sort();

        // Matrix processing
        const matrixData: any = {};
        if (data.detail_jurnal) {
            data.detail_jurnal.forEach((s: any) => {
                const cls = s.kelas || 'N/A';
                if (!matrixData[cls]) matrixData[cls] = {};

                if (s.student_details && Array.isArray(s.student_details)) {
                    s.student_details.forEach((d: any) => {
                        const nisn = d.nisn || d.id || 'N/A';
                        if (!matrixData[cls][nisn]) {
                            matrixData[cls][nisn] = { name: d.nama || d.nama_snapshot || 'Unknown', data: {} };
                        }
                        const date = new Date(s.tanggal);
                        if (!isNaN(date.getTime())) {
                            const day = date.getDate();
                            matrixData[cls][nisn].data[day] = d.status?.[0] || 'H'; // Default to H if joined session exists
                        }
                    });
                }
            });
        }

        // Auto-select class: Prefer classes that have rekap data first
        const currentClass = selectedClass || (rekapClasses.length > 0 ? rekapClasses[0] : (classes.length > 0 ? classes[0] : ''));

        const renderMatrix = (cls: string) => {
            const students = Object.values(matrixData[cls] || {}).sort((a: any, b: any) => a.name.localeCompare(b.name));
            return (
                <div key={cls} className="animate-fade-in group/matrix">
                    <div className="overflow-x-auto rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/30 bg-white">
                        <table className="w-full text-[9px] border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 text-gray-400 font-bold uppercase tracking-widest text-[8px]">
                                    <th className="p-4 text-left min-w-[200px] sticky left-0 bg-gray-50 z-10 border-r border-gray-100">Nama Lengkap Peserta Didik</th>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                        <th key={d} className="p-1 min-w-[28px] text-center border-l border-gray-100/50">{d}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {students.map((stu: any, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/20 group/row">
                                        <td className="p-3 font-bold text-gray-700 sticky left-0 bg-white z-10 border-r border-gray-100 transition-colors group-hover/row:bg-blue-50/20 whitespace-nowrap">{stu.name}</td>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
                                            const st = stu.data[d];
                                            let badgeClass = 'text-gray-100';
                                            let displaySign = '•';

                                            if (st === 'H') { badgeClass = 'text-emerald-500 font-black'; displaySign = 'H'; }
                                            else if (st === 'S') { badgeClass = 'text-amber-500 font-black'; displaySign = 'S'; }
                                            else if (st === 'I') { badgeClass = 'text-blue-500 font-black'; displaySign = 'I'; }
                                            else if (st === 'A') { badgeClass = 'text-rose-500 font-black'; displaySign = 'A'; }

                                            return (
                                                <td key={d} className={`p-1 text-center transition-all ${badgeClass} border-l border-gray-50/50 ${st ? 'bg-blue-50/30' : ''}`}>
                                                    {displaySign}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {students.length === 0 && (
                            <div className="p-24 text-center">
                                <i className="bi bi-people text-6xl text-gray-100 mb-4 block"></i>
                                <div className="text-gray-300 font-bold tracking-[0.2em] uppercase text-xs">Data Matriks Kosong</div>
                                <p className="text-[10px] text-gray-400 mt-2">Pastikan input absensi sudah dilakukan pada menu Jurnal/Absensi.</p>
                            </div>
                        )}
                    </div>
                </div>
            );
        };

        const filteredRecap = data.rekap_absensi_siswa?.filter((item: any) => item.kelas === currentClass) || [];

        content = (
            <div className="flex flex-col h-full bg-white">
                <div className="px-6 py-5 md:px-12 md:py-8 flex flex-col md:flex-row justify-between items-center gap-6 border-b border-gray-50 bg-gray-50/30 sticky top-0 z-40 backdrop-blur-sm">
                    <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200/50 shadow-inner">
                        <button
                            onClick={() => setTabLocal('RECAP')}
                            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase ${tabLocal === 'RECAP' ? 'bg-[#0038A8] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>
                            <i className="bi bi-pie-chart-fill text-sm"></i> Ringkasan Kolom
                        </button>
                        <button
                            onClick={() => setTabLocal('GRID')}
                            className={`flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-[10px] font-black tracking-widest transition-all uppercase ${tabLocal === 'GRID' ? 'bg-[#0038A8] text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}>
                            <i className="bi bi-table text-sm"></i> Matriks Harian
                        </button>
                    </div>

                    <div className="flex items-center gap-4 bg-white p-1 rounded-2xl shadow-sm border border-gray-100 w-full md:w-auto overflow-hidden">
                        <div className="pl-4 pr-1 text-[10px] font-black text-gray-300 uppercase tracking-widest border-r border-gray-50">Filter Kelas</div>
                        <select
                            value={currentClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="bg-transparent border-none px-6 py-1.5 text-xs font-black text-[#0038A8] focus:ring-0 cursor-pointer outline-none min-w-[180px]">
                            {classes.length > 0 ? classes.map((cls: string) => (
                                <option key={cls} value={cls}>KELAS {cls}</option>
                            )) : <option value="">TIDAK ADA KELAS</option>}
                        </select>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 md:p-12">
                    {tabLocal === 'RECAP' && (
                        <div className="space-y-8 max-w-6xl mx-auto w-full">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                {[
                                    { l: 'Hadir', v: filteredRecap.reduce((a: any, b: any) => a + b.H, 0) || 0, c: 'emerald', icon: 'check-circle' },
                                    { l: 'Sakit', v: filteredRecap.reduce((a: any, b: any) => a + b.S, 0) || 0, c: 'amber', icon: 'bandaid' },
                                    { l: 'Izin', v: filteredRecap.reduce((a: any, b: any) => a + b.I, 0) || 0, c: 'blue', icon: 'file-text' },
                                    { l: 'Alpa', v: filteredRecap.reduce((a: any, b: any) => a + b.A, 0) || 0, c: 'rose', icon: 'x-circle' }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white border border-gray-200 rounded-lg p-5 flex items-center gap-3 shadow-sm">
                                        <div className={`w-10 h-10 rounded-lg bg-${stat.c}-50 flex items-center justify-center`}>
                                            <i className={`bi bi-${stat.icon} text-${stat.c}-600`}></i>
                                        </div>
                                        <div>
                                            <div className="text-xs text-gray-500 mb-0.5">{stat.l}</div>
                                            <div className="text-xl font-bold text-gray-900">{stat.v}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-white">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                                        <tr>
                                            <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide">Kelas & Mata Pelajaran</th>
                                            <th className="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide text-center w-20">Sesi</th>
                                            <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wide text-center w-16">H</th>
                                            <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wide text-center w-16">S</th>
                                            <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wide text-center w-16">I</th>
                                            <th className="px-3 py-3.5 text-xs font-semibold uppercase tracking-wide text-center w-16">A</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredRecap.map((item: any, idx: number) => (
                                            <tr key={idx} className="hover:bg-blue-50/30 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-semibold text-gray-900">{item.kelas}</div>
                                                    <div className="text-xs text-gray-500">{item.mapel}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center font-semibold text-gray-700">{item.meetings}</td>
                                                <td className="px-3 py-3 text-center font-semibold text-emerald-600">{item.H}</td>
                                                <td className="px-3 py-3 text-center font-semibold text-amber-600">{item.S}</td>
                                                <td className="px-3 py-3 text-center font-semibold text-blue-600">{item.I}</td>
                                                <td className="px-3 py-3 text-center font-semibold text-rose-600">{item.A}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredRecap.length === 0 && <p className="text-center py-20 text-gray-300 font-bold italic uppercase tracking-widest opacity-40">Pilih kelas di dropdown</p>}
                            </div>
                        </div>
                    )}

                    {tabLocal === 'GRID' && (
                        <div className="max-w-6xl mx-auto w-full">
                            {currentClass ? renderMatrix(currentClass) : <p className="text-center py-20 text-gray-300 font-bold uppercase tracking-widest opacity-40">Pilih kelas untuk melihat matriks</p>}
                        </div>
                    )}
                </div>
            </div>
        );
    } else if (moduleCode === 'TUGAS') {
        title = 'Analisis Tugas Tambahan';
        content = (
            <div className="p-6 md:p-10 max-w-5xl mx-auto w-full">
                <div className="bg-gradient-to-tr from-[#0038A8] to-blue-600 rounded-3xl p-8 md:p-10 mb-10 text-white relative overflow-hidden shadow-xl shadow-blue-200/50">
                    <div className="relative z-10">
                        <div className="text-[10px] font-bold uppercase tracking-[0.3em] mb-2 opacity-80">DAILY EXECUTIVE SUMMARY</div>
                        <div className="text-3xl md:text-4xl font-black mb-2 tracking-tight">Kinerja Harian</div>
                        <div className="text-sm opacity-70 font-medium max-w-lg leading-relaxed">Rekapitulasi komprehensif seluruh aktivitas manajerial, koordinasi, dan tugas tambahan harian.</div>
                    </div>
                    <div className="absolute -bottom-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-[60px]"></div>
                </div>

                <div className="space-y-10 pl-4 md:pl-6">
                    {data.detail_tugas?.map((t: any, idx: number) => (
                        <div key={idx} className="relative group pl-12 md:pl-16 pb-2">
                            <div className="absolute left-[23px] md:left-[31px] top-4 bottom-[-40px] w-1 bg-gray-100 group-last:bg-transparent rounded-full"></div>
                            <div className="absolute left-0 top-6 w-12 h-12 md:w-16 md:h-16 rounded-2xl md:rounded-3xl bg-white border-4 md:border-8 border-gray-50 shadow-lg z-20 flex flex-col items-center justify-center group-hover:scale-105 transition-transform group-hover:border-blue-50">
                                <div className="text-base md:text-lg font-black text-[#0038A8]">{new Date(t.tanggal).getDate()}</div>
                                <div className="text-[8px] md:text-[9px] font-bold text-gray-400 -mt-0.5 md:-mt-1 uppercase">{new Date(t.tanggal).toLocaleDateString('id-ID', { month: 'short' })}</div>
                            </div>

                            <div className="bg-white rounded-3xl border border-gray-100 shadow-lg shadow-gray-200/50 p-6 md:p-10 hover:shadow-blue-50 transition-all border-l-8 md:border-l-[12px] border-l-[#0038A8]">
                                <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-6 md:mb-8">
                                    <div>
                                        <div className="text-[9px] md:text-[10px] text-[#0038A8] font-bold uppercase tracking-wider mb-2 px-3 py-1 bg-blue-50 inline-block rounded-lg border border-blue-100 shadow-sm">{t.tugas?.jabatan || 'TUGAS'}</div>
                                        <div className="text-xl md:text-2xl font-black text-gray-800 tracking-tight">{new Date(t.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                                    </div>
                                    {t.foto_url && (
                                        <a href={t.foto_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0038A8] text-[10px] font-bold text-white hover:bg-blue-700 hover:-translate-y-0.5 transition-all shadow-lg shadow-blue-200">
                                            <i className="bi bi-eye-fill text-lg"></i> LAMPIRAN
                                        </a>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 pt-6 md:pt-10 border-t border-gray-100">
                                    <div>
                                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <span className="w-1 h-3 bg-gray-200 rounded-full"></span> Kegiatan
                                        </div>
                                        <p className="text-gray-700 font-bold leading-relaxed text-base">{t.kegiatan}</p>
                                    </div>
                                    {t.hasil && (
                                        <div className="bg-blue-50/40 p-6 md:p-8 rounded-2xl md:rounded-[2rem] border border-blue-100/50 relative">
                                            <div className="text-[9px] text-[#0038A8] font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                                <span className="w-1 h-3 bg-blue-300 rounded-full"></span> Hasil
                                            </div>
                                            <p className="text-[#0038A8] font-bold leading-relaxed italic text-base opacity-80">"{t.hasil}"</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                    {!data.detail_tugas?.length && (
                        <div className="text-center py-20 opacity-10">
                            <i className="bi bi-journal-x text-[8rem]"></i>
                        </div>
                    )}
                </div>
            </div>
        );
    } else if (moduleCode === 'NILAI') {
        title = 'Dashboard Capaian Akademik';
        content = (
            <div className="p-6 md:p-10 max-w-6xl mx-auto w-full">
                <div className="bg-gradient-to-br from-[#0038A8] to-indigo-900 rounded-3xl p-8 md:p-10 mb-10 text-white shadow-xl shadow-blue-200/50 flex flex-col md:flex-row justify-between items-center gap-6 relative overflow-hidden">
                    <div className="relative z-10 text-center md:text-left">
                        <div className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-80 mb-2">ACADEMIC PERFORMANCE TRACKER</div>
                        <div className="text-3xl md:text-4xl font-black mb-2 tracking-tight">Evaluasi Pembelajaran</div>
                        <div className="text-sm opacity-70 font-medium">Monitoring input nilai formatif dan sumatif secara real-time.</div>
                    </div>
                    <div className="relative z-10 text-center bg-white/10 backdrop-blur-3xl px-8 py-6 rounded-2xl border border-white/20 shadow-xl">
                        <div className="text-4xl font-black mb-0.5">{data.total_nilai_input}</div>
                        <div className="text-[9px] font-bold uppercase tracking-widest opacity-60">Kolom Terinput</div>
                    </div>
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 bg-white">
                    <table className="w-full text-xs text-left border-collapse">
                        <thead className="bg-gray-50/80 text-gray-400">
                            <tr>
                                <th className="px-6 py-3 text-[10px] uppercase font-bold tracking-widest w-48">Kelas & Mapel</th>
                                <th className="px-4 py-3 text-[10px] uppercase font-bold tracking-widest text-center w-32">Jenis Tes</th>
                                <th className="px-6 py-3 text-[10px] uppercase font-bold tracking-widest">Materi</th>
                                <th className="px-6 py-3 text-[10px] uppercase font-bold tracking-widest text-right w-40">Update</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {data.detail_nilai?.map((n: any, idx: number) => (
                                <tr key={idx} className="hover:bg-blue-50/20 transition-all group">
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800 text-sm mb-0.5">{n.kelas}</div>
                                        <div className="text-[#0038A8] font-bold text-[9px] uppercase tracking-wider">{n.mapel}</div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <span className={`inline-block px-3 py-1 rounded-lg text-[8px] font-bold tracking-widest uppercase border border-opacity-50 shadow-sm ${n.jenis === 'Sum' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                                            n.jenis === 'Pas' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                                'bg-blue-50 text-blue-600 border-blue-100'
                                            }`}>
                                            {n.jenis === 'Sum' ? 'SUMATIF' : n.jenis === 'Pas' ? 'SAS / PAS' : 'FORMATIF'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-gray-800 font-bold leading-snug text-sm mb-1">{n.materi}</div>
                                        <div className="text-[9px] text-gray-400 font-bold uppercase tracking-widest flex items-center gap-1.5">
                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span> {n.tagihan || 'KOLOM UTAMA'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="text-xs font-bold text-gray-800 mb-0.5">{n.last_update ? new Date(n.last_update).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}</div>
                                        <div className="text-[8px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-end gap-1.5">
                                            <i className="bi bi-clock text-[9px]"></i> {n.last_update ? new Date(n.last_update).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : ''}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {(!data.detail_nilai || data.detail_nilai.length === 0) && (
                        <div className="text-center py-20 opacity-20">
                            <i className="bi bi-patch-minus text-[6rem]"></i>
                            <p className="text-sm font-bold mt-4 uppercase tracking-widest">No Data Recorded</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-8 animate-fade-in outline-none overflow-hidden font-sans">
            {/* Ultra-Immersive Backdrop */}
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-[80px]" onClick={onClose}></div>

            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_32px_128px_-16px_rgba(0,0,0,0.6)] overflow-hidden border border-white/20 relative z-10">

                {/* Professional Header */}
                <div className="flex justify-between items-center px-6 py-5 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                            <i className="bi bi-eye text-white text-sm"></i>
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                {/* Immersive Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar-premium bg-white">
                    {content}
                </div>

            </div>

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

function StepItem({ label, done, current, date, icon }: any) {
    return null;
}

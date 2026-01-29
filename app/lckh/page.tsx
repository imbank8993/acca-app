'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';

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
        { id: 'JURNAL', label: 'Ringkasan Jurnal Mengajar', checked: true, count: 0 },
        { id: 'ABSENSI', label: 'Rekap Kehadiran Mengajar', checked: true, count: 0 },
        { id: 'NILAI', label: 'Daftar Nilai', checked: false, count: 0 }, // Optional
        { id: 'TUGAS', label: 'Tugas Tambahan', checked: false, count: 0 },
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
                detail_tugas: data.lampiran_tugas || []
            });
            setCatatan(data.catatan_guru || '');

            // Update Module Counts
            setModules(prev => prev.map(m => {
                if (m.id === 'JURNAL') return { ...m, count: data.snap_ringkasan_umum?.total_jurnal_isi || 0 };
                if (m.id === 'ABSENSI') return { ...m, count: data.snap_total_jam_mengajar || 0 }; // Using hours/sessions
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
                    if (m.id === 'ABSENSI') return { ...m, count: json.data.total_jam_mengajar || 0 }; // Using hours/sessions
                    if (m.id === 'NILAI') return { ...m, count: json.data.total_nilai_input || 0 };
                    if (m.id === 'TUGAS') return { ...m, count: json.data.total_tugas || 0 };
                    return m;
                }));

                Swal.fire('Berhasil', 'Data berhasil digenerate.', 'success');
            } else {
                throw new Error(json.error);
            }
        } catch (e: any) {
            Swal.fire('Gagal', e.message, 'error');
        } finally {
            setLoading(false);
        }
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
            // Optional: Add indicator if closed/upcoming in the label?
            // But requirement says user selects, then error if not open.
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
            cancelButtonText: 'Batal'
        });

        if (selectedCode) {
            const p = periods.find(per => per.periode_kode === selectedCode);

            // Validation: Check if period is OPEN
            // "Closed" might be allowed for late submission? 
            // The prompt says "jika bulan belum dibuka" (if month is not yet open).
            // Usually 'OPEN' means active. Future months might be 'PLANNED'.
            // If status_periode has values like OPEN, CLOSED, PLANNED.
            // We assume anything NOT OPEN or CLOSED is "Belum dibuka".
            // Or usually solely check status_periode !== 'OPEN'.

            if (p && p.status_periode === 'PLANNED') {
                Swal.fire('Belum Dibuka', `Belum bisa mengajukan LCKH bulan ${p.periode_nama}. Periode belum dibuka.`, 'error');
                return;
            }

            // Just in case, if status logic is strict:
            // if (p?.status_periode !== 'OPEN' && p?.status_periode !== 'CLOSED') { ... }

            setSelectedPeriod(selectedCode);
        }
    };

    const currentPeriodObj = periods.find(p => p.periode_kode === selectedPeriod);

    return (
        <div className="flex h-[calc(100vh-80px)] bg-gray-50 overflow-hidden relative">

            {/* Left Sidebar: List */}
            <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="font-bold text-gray-800 text-sm">DAFTAR LCKH BULANAN</h2>
                    <button
                        onClick={handleCreateNew}
                        className="text-xs border border-blue-500 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-50 font-semibold transition-colors flex items-center gap-1">
                        <i className="bi bi-plus-lg"></i> Buat
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                    {submissionsList.map(sub => {
                        const pName = periods.find(p => p.periode_kode === sub.periode_kode)?.periode_nama || sub.periode_kode;
                        const isActive = sub.periode_kode === selectedPeriod;

                        return (
                            <div
                                key={sub.id}
                                onClick={() => setSelectedPeriod(sub.periode_kode)}
                                className={`p-3 rounded-xl border cursor-pointer transition-all ${isActive ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-gray-100 hover:border-blue-200'}`}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-bold text-sm text-gray-800">{pName}</span>
                                    {sub.status === 'Revisi' && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-bold">REVISI</span>}
                                    {sub.status === 'Submitted' && <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded font-bold">DIAJUKAN</span>}
                                    {sub.status === 'Draft' && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-bold">DRAFT</span>}
                                    {(sub.status === 'Approved_Waka' || sub.status === 'Approved_Kamad') && <span className="text-[10px] bg-green-100 text-green-600 px-1.5 py-0.5 rounded font-bold">DISETUJUI</span>}
                                </div>
                                <div className="text-xs text-gray-400">
                                    {new Date(sub.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                </div>
                            </div>
                        );
                    })}

                    {/* If selected period has no submission yet (creation mode), show placeholder item */}
                    {selectedPeriod && !submissionsList.find(s => s.periode_kode === selectedPeriod) && (
                        <div className="p-3 rounded-xl border bg-blue-50 border-blue-200 shadow-sm">
                            <div className="font-bold text-sm text-gray-800">{periods.find(p => p.periode_kode === selectedPeriod)?.periode_nama}</div>
                            <div className="text-xs text-blue-500 italic mt-1">Draft Baru (Belum Disimpan)</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Content: Detail */}
            <div className="flex-1 flex flex-col h-full overflow-hidden relative">
                {selectedPeriod ? (
                    <>
                        {/* Header */}
                        <div className="p-6 bg-white border-b border-gray-200">
                            <h2 className="text-sm font-bold text-gray-500 mb-1 flex items-center gap-2">
                                <i className="bi bi-calendar-event"></i> PERIODE: {currentPeriodObj?.periode_nama || selectedPeriod}
                            </h2>
                            <div className="text-xs text-gray-400">
                                {currentPeriodObj ? `${currentPeriodObj.tgl_awal} s/d ${currentPeriodObj.tgl_akhir}` : '-'}
                            </div>
                        </div>

                        {/* Scrollable Body */}
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">

                            {/* Stats Box (Green) */}
                            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 mb-6">
                                <div className="text-xs font-bold text-emerald-800 uppercase mb-3 text-center tracking-wide">Rekap Kegiatan Mengajar</div>
                                <div className="grid grid-cols-3 gap-4 text-center divide-x divide-emerald-200">
                                    <div>
                                        <div className="text-2xl font-black text-emerald-700">{summary?.total_jam_mengajar || 0}</div>
                                        <div className="text-[10px] uppercase font-bold text-emerald-600 mt-1">SESI<br />Absensi</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-black text-emerald-700">{summary?.total_jurnal_isi || 0}</div>
                                        <div className="text-[10px] uppercase font-bold text-emerald-600 mt-1">SESI<br />Jurnal</div>
                                    </div>
                                    <div className="flex items-center justify-center">
                                        <div className="text-left text-xs text-emerald-800 font-medium leading-tight">
                                            {summary ? (
                                                <>
                                                    <span className="font-bold">{summary.total_jurnal_isi} jurnal</span>, <span className="font-bold">{summary.rekap_absensi_siswa?.length || 0} mapel</span>
                                                    <div className="text-[10px] opacity-70 mt-1">TOTAL REKAP</div>
                                                </>
                                            ) : 'Belum ada data'}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modules Selection */}
                            <div className="mb-6">
                                <h3 className="text-xs font-bold text-gray-500 mb-3 flex items-center gap-2">
                                    <i className="bi bi-list-check"></i> PILIH MODUL LAPORAN
                                </h3>
                                <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden">
                                    {modules.map(m => (
                                        <div key={m.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="checkbox"
                                                    checked={m.checked}
                                                    onChange={(e) => setModules(prev => prev.map(mm => mm.id === m.id ? { ...mm, checked: e.target.checked } : mm))}
                                                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                                                />
                                                <label className="text-sm font-semibold text-gray-700">{m.label}</label>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">{m.count} data</span>
                                                <button
                                                    onClick={() => setPreviewModule(m.id)}
                                                    className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-600 transition-colors">
                                                    <i className="bi bi-eye-fill"></i> View
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <p className="text-[10px] text-gray-400 mt-2 px-1">
                                    <i className="bi bi-info-circle"></i> Centang modul yang ingin ditampilkan dalam dokumen LCKH resmi.
                                </p>
                            </div>

                            {/* Capaian Utama / Notes */}
                            <div className="mb-20">
                                <h3 className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-2">
                                    <i className="bi bi-pencil-square"></i> RINGKASAN CAPAIAN UTAMA
                                </h3>
                                <textarea
                                    className="w-full border border-gray-300 rounded-xl p-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-shadow h-32"
                                    placeholder="Contoh: Mengajar kelas X dan XI, fokus pada materi persamaan kuadrat... Melaksanakan remedial..."
                                    value={catatan}
                                    onChange={(e) => setCatatan(e.target.value)}
                                    disabled={submission && !['Draft', 'Revisi', 'Submitted'].includes(submission.status)}
                                ></textarea>
                            </div>

                        </div>

                        {/* Bottom Action Bar */}
                        <div className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 flex justify-between items-center z-10">
                            <button
                                onClick={handleDelete}
                                disabled={!submission || !['Draft', 'Revisi', 'Submitted'].includes(submission.status)}
                                className="px-4 py-2 rounded-lg border border-red-200 text-red-600 font-semibold hover:bg-red-50 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <i className="bi bi-trash"></i> Hapus
                            </button>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={generateSummary}
                                    disabled={loading || (submission && !['Draft', 'Revisi', 'Submitted'].includes(submission.status))}
                                    className="px-4 py-2 rounded-lg text-gray-600 font-semibold hover:bg-gray-100 text-sm disabled:opacity-50"
                                >
                                    <i className="bi bi-arrow-clockwise"></i> Generate Data
                                </button>

                                <button
                                    onClick={() => handleSave(false)}
                                    disabled={loading || (submission && !['Draft', 'Revisi', 'Submitted'].includes(submission.status))}
                                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 text-sm disabled:opacity-50"
                                >
                                    <i className="bi bi-save"></i> Simpan Draf
                                </button>

                                <button
                                    onClick={() => {
                                        Swal.fire({
                                            title: submission?.status === 'Submitted' ? 'Update Ajuan?' : 'Ajukan LCKH?',
                                            text: 'Laporan akan dikirim ke verifikator.',
                                            icon: 'question',
                                            showCancelButton: true,
                                            confirmButtonText: submission?.status === 'Submitted' ? 'Update' : 'Ajukan Sekarang'
                                        }).then(r => { if (r.isConfirmed) handleSave(true); });
                                    }}
                                    disabled={loading || (submission && !['Draft', 'Revisi', 'Submitted'].includes(submission.status))}
                                    className="px-5 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 shadow-md shadow-blue-200 text-sm disabled:opacity-50 flex items-center gap-2"
                                >
                                    <i className="bi bi-send-fill"></i> {submission?.status === 'Submitted' ? 'Update Ajuan' : 'Ajukan LCKH'}
                                </button>

                                <button
                                    onClick={() => window.print()}
                                    disabled={!summary}
                                    className="px-4 py-2 rounded-lg bg-gray-800 text-white font-semibold hover:bg-gray-900 text-sm disabled:opacity-50"
                                >
                                    <i className="bi bi-printer"></i> Cetak PDF
                                </button>
                            </div>
                        </div>

                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                        <i className="bi bi-arrow-left-circle text-4xl mb-2"></i>
                        <p>Pilih periode atau buat laporan baru.</p>
                    </div>
                )}
            </div>

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
                    <div className="font-bold mb-2 border-b border-gray-400 pb-1">IV. Catatan Tambahan</div>
                    <p className="text-sm italic border border-black p-2 min-h-[50px] mb-6">{catatan || '-'}</p>

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

            {/* Preview Modal */}
            {previewModule && (
                <ModulePreviewModal
                    moduleCode={previewModule}
                    data={summary}
                    onClose={() => setPreviewModule(null)}
                />
            )}

            <style jsx global>{`
                /* Hide scrollbar for cleaner look if needed */
                ::-webkit-scrollbar { width: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body { background: white; -webkit-print-color-adjust: exact; font-family: 'Times New Roman', serif; }
                    nav, aside, header, .no-print, button, select, .hidden-print { display: none !important; }
                    .main-content { margin: 0 !important; width: 100% !important; padding: 0 !important; }
                    
                    /* Hide Sidebar and Action Bar */
                    .w-80 { display: none !important; }
                    .absolute.bottom-0 { display: none !important; }
                    
                    /* Hide non-print areas in main view if visible */
                    .p-6 { padding: 0 !important; }
                    .bg-gray-50 { background: white !important; }
                    
                    .print-only { display: block !important; width: 100%; }
                }
            `}</style>
        </div>
    );
}

function ModulePreviewModal({ moduleCode, data, onClose }: any) {
    const [tab, setTab] = useState<'RECAP' | 'DETAIL' | 'GRID'>('RECAP');
    const [activeClass, setActiveClass] = useState<string>('');

    if (!data) return null;

    let title = '';
    let content = null;

    if (moduleCode === 'JURNAL') {
        title = 'Preview Jurnal Mengajar';
        content = (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Tanggal</th>
                            <th className="px-4 py-3">Jam</th>
                            <th className="px-4 py-3">Kelas</th>
                            <th className="px-4 py-3">Mapel</th>
                            <th className="px-4 py-3 rounded-tr-lg">Materi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.detail_jurnal?.map((j: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="font-medium text-gray-900">{new Date(j.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                                    <div className="text-xs text-gray-400">{j.hari}</div>
                                </td>
                                <td className="px-4 py-3">{j.jam_ke}</td>
                                <td className="px-4 py-3 font-semibold">{j.kelas}</td>
                                <td className="px-4 py-3">{j.mapel || j.mata_pelajaran}</td>
                                <td className="px-4 py-3 text-gray-600 line-clamp-2 max-w-[200px]" title={j.materi}>{j.materi}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!data.detail_jurnal?.length && <p className="text-center py-8 text-gray-400">Tidak ada data jurnal.</p>}
            </div>
        );
    } else if (moduleCode === 'ABSENSI') {
        title = 'Preview Absensi Siswa';

        // Prepare Detail Data and Matrix Data
        const allLogs: any[] = [];
        const classes: string[] = [];
        const matrixData: any = {}; // { [kelas]: { [nisn]: { name, logs: { [date]: status } } } }

        // 1. Initialize Matrix from Roster (if available)
        if (data.class_roster) {
            Object.keys(data.class_roster).forEach(cls => {
                if (!classes.includes(cls)) classes.push(cls);
                matrixData[cls] = {};

                data.class_roster[cls].forEach((stu: any) => {
                    matrixData[cls][stu.nisn] = {
                        name: stu.nama,
                        data: {}
                    };
                });
            });
        }

        // 2. Process Logs & Fill Matrix
        if (data.detail_jurnal) {
            data.detail_jurnal.forEach((s: any) => {
                // Ensure class exists in list (fallback if no roster)
                if (s.kelas && !classes.includes(s.kelas)) classes.push(s.kelas);
                if (!matrixData[s.kelas]) matrixData[s.kelas] = {};

                if (s.student_details) {
                    s.student_details.forEach((d: any) => {
                        // Linear Log
                        allLogs.push({
                            id: s.sesi_id + d.nisn,
                            date: s.tanggal,
                            kelas: s.kelas,
                            mapel: s.mapel || s.mata_pelajaran,
                            nama: d.nama,
                            status: d.status,
                            catatan: d.catatan
                        });

                        // Matrix Data Fill
                        if (!matrixData[s.kelas][d.nisn]) {
                            // Student not in roster? Add them dynamically
                            matrixData[s.kelas][d.nisn] = {
                                name: d.nama || 'Unknown',
                                data: {}
                            };
                        }

                        const day = new Date(s.tanggal).getDate();
                        matrixData[s.kelas][d.nisn].data[day] = d.status?.[0] || '-';
                    });
                }
            });
        }

        // Internal state for Matrix View Class Selection
        // Since we can't easily add state here without refactoring the component higher up or using a wrapper,
        // we'll default to showing all classes stacked or just the first one.
        // Let's stack them if multiple.

        // Helper to render Matrix
        const renderMatrix = (cls: string) => {
            const students = Object.values(matrixData[cls] || {}).sort((a: any, b: any) => a.name.localeCompare(b.name));
            return (
                <div key={cls} className="mb-8">
                    <h4 className="font-bold text-gray-700 mb-2 px-1 border-l-4 border-blue-500 pl-2">{cls}</h4>
                    <div className="overflow-x-auto pb-2">
                        <table className="w-full text-xs border-collapse text-center">
                            <thead>
                                <tr className="bg-gray-100 text-gray-600">
                                    <th className="p-1 border text-left min-w-[150px] sticky left-0 bg-gray-100 z-10">Nama Siswa</th>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                        <th key={d} className="p-1 border min-w-[24px] font-normal text-[10px]">{d}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {students.map((stu: any, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="p-1 border text-left truncate sticky left-0 bg-white z-10 font-medium">{stu.name}</td>
                                        {Array.from({ length: 31 }, (_, i) => i + 1).map(d => {
                                            const st = stu.data[d];
                                            let colorClass = '';
                                            if (st === 'H') colorClass = 'bg-green-100 text-green-700';
                                            else if (st === 'S') colorClass = 'bg-yellow-100 text-yellow-700 font-bold';
                                            else if (st === 'I') colorClass = 'bg-blue-100 text-blue-700 font-bold';
                                            else if (st === 'A') colorClass = 'bg-red-100 text-red-700 font-bold';

                                            return (
                                                <td key={d} className={`p-1 border ${colorClass}`}>
                                                    {st}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        };

        content = (
            <div className="flex flex-col h-full">
                <div className="flex gap-2 mb-4 px-1 sticky top-0 bg-white z-20 py-2 border-b border-gray-100">
                    <button
                        onClick={() => setTab('RECAP')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'RECAP' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        <i className="bi bi-pie-chart-fill mr-1"></i> Rekapitulasi
                    </button>
                    <button
                        onClick={() => setTab('GRID')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'GRID' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        <i className="bi bi-grid-3x3 mr-1"></i> Matriks Absensi
                    </button>
                    <button
                        onClick={() => setTab('DETAIL')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${tab === 'DETAIL' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                        <i className="bi bi-list-ul mr-1"></i> Riwayat Log
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {tab === 'RECAP' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-center border-collapse">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3 text-left rounded-tl-lg">Kelas</th>
                                        <th className="px-4 py-3 text-left">Mapel</th>
                                        <th className="px-4 py-3">Pertemuan</th>
                                        <th className="px-4 py-3 text-green-600">Hadir</th>
                                        <th className="px-4 py-3 text-yellow-600">Sakit</th>
                                        <th className="px-4 py-3 text-blue-600">Izin</th>
                                        <th className="px-4 py-3 text-red-600 rounded-tr-lg">Alpa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {data.rekap_absensi_siswa?.map((item: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-bold text-left">{item.kelas}</td>
                                            <td className="px-4 py-3 text-left">{item.mapel}</td>
                                            <td className="px-4 py-3 font-mono">{item.meetings}</td>
                                            <td className="px-4 py-3">{item.H}</td>
                                            <td className="px-4 py-3">{item.S}</td>
                                            <td className="px-4 py-3">{item.I}</td>
                                            <td className="px-4 py-3">{item.A}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {!data.rekap_absensi_siswa?.length && <p className="text-center py-8 text-gray-400">Tidak ada data absensi.</p>}
                        </div>
                    )}

                    {tab === 'GRID' && (
                        <div className="p-1">
                            {classes.length > 0 ? classes.sort().map(cls => renderMatrix(cls)) : <p className="text-center py-8 text-gray-400">Tidak ada data kelas.</p>}
                        </div>
                    )}

                    {tab === 'DETAIL' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left border-collapse">
                                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                                    <tr>
                                        <th className="px-4 py-3 whitespace-nowrap">Tanggal</th>
                                        <th className="px-4 py-3">Kelas / Mapel</th>
                                        <th className="px-4 py-3">Nama Siswa</th>
                                        <th className="px-4 py-3">Status</th>
                                        <th className="px-4 py-3">Ket</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {allLogs.map((log: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                                                {new Date(log.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                            </td>
                                            <td className="px-4 py-3 text-xs">
                                                <div className="font-bold">{log.kelas}</div>
                                                <div className="text-gray-400">{log.mapel}</div>
                                            </td>
                                            <td className="px-4 py-3 font-medium">{log.nama}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${log.status === 'HADIR' ? 'bg-green-50 text-green-600 border-green-100' :
                                                    log.status === 'SAKIT' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                                                        log.status === 'IZIN' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                            'bg-red-50 text-red-600 border-red-100'
                                                    }`}>
                                                    {log.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-xs text-gray-500 italic">
                                                {log.catatan || '-'}
                                            </td>
                                        </tr>
                                    ))}
                                    {allLogs.length === 0 && (
                                        <tr><td colSpan={5} className="text-center py-8 text-gray-400">Tidak ada detail data.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    } else if (moduleCode === 'TUGAS') {
        title = 'Preview Tugas Tambahan';
        content = (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                        <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Tanggal</th>
                            <th className="px-4 py-3">Jabatan</th>
                            <th className="px-4 py-3">Kegiatan</th>
                            <th className="px-4 py-3 rounded-tr-lg">Hasil</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {data.detail_tugas?.map((t: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-4 py-3 whitespace-nowrap align-top">
                                    <div className="font-medium text-gray-900">{new Date(t.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                                </td>
                                <td className="px-4 py-3 font-semibold text-blue-600 align-top">{t.tugas?.jabatan}</td>
                                <td className="px-4 py-3 align-top">
                                    <div className="line-clamp-2" title={t.kegiatan}>{t.kegiatan}</div>
                                </td>
                                <td className="px-4 py-3 text-gray-500 align-top">
                                    <div className="line-clamp-2" title={t.hasil}>{t.hasil || '-'}</div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!data.detail_tugas?.length && <p className="text-center py-8 text-gray-400">Tidak ada laporan tugas tambahan.</p>}
            </div>
        );
    } else if (moduleCode === 'NILAI') {
        title = 'Preview Nilai Input';
        content = (
            <div className="text-center py-12 text-gray-400">
                <i className="bi bi-cone-striped text-4xl mb-2 block"></i>
                <p>Modul Nilai belum tersedia preview detailnya.</p>
                <p className="text-xs">Hanya jumlah data yang ditampilkan ({data.total_nilai_input || 0}).</p>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center p-5 border-b border-gray-100">
                    <h3 className="font-bold text-lg text-gray-800">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>
                <div className="p-0 overflow-y-auto flex-1 custom-scrollbar">
                    {content}
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 text-right">
                    <button onClick={onClose} className="px-5 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all">
                        Tutup
                    </button>
                </div>
            </div>
        </div>
    );
}

function StepItem({ label, done, current, date, icon }: any) {
    return null;
}

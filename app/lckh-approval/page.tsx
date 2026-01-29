'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { getUserByAuthId } from '@/lib/auth';
import Swal from 'sweetalert2';

export default function LckhApprovalPage() {
    const [loading, setLoading] = useState(false);
    const [submissions, setSubmissions] = useState<any[]>([]);
    const [user, setUser] = useState<any>(null);

    // Filters
    const [periods, setPeriods] = useState<any[]>([]);
    const [selectedPeriod, setSelectedPeriod] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState('ALL');

    // Review Modal
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [reviewerNote, setReviewerNote] = useState('');
    const [showModal, setShowModal] = useState(false);

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
        if (user && selectedPeriod) fetchSubmissions(selectedPeriod);
    }, [filterStatus, selectedPeriod, user]);

    const handleApprove = async () => {
        if (!selectedItem || !user) return;

        // Role Check logic
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
        } else if (current === 'Approved_Kamad') {
            Swal.fire('Info', 'Dokumen sudah disetujui sepenuhnya.', 'info');
            return;
        } else {
            Swal.fire('Status Invalid', `Status dokumen ${current} tidak dapat disetujui.`, 'warning');
            return;
        }

        // Generate Approval Code
        let approvalCode = null;
        if (nextStatus === 'Approved_Kamad') {
            const randomSuffix = Math.floor(1000 + Math.random() * 9000);
            // Format: LCKH-{Periode}-{NIP}-{Random}
            const nipSafe = selectedItem.nip ? selectedItem.nip.replace(/[^0-9]/g, '').substring(0, 6) : 'NONIP';
            approvalCode = `LCKH-${selectedItem.periode_kode}-${nipSafe}-${randomSuffix}`;
        }

        try {
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
                level: isKamad && nextStatus === 'Approved_Kamad' ? 'KAMAD' : 'WAKA',
                status_approval: 'APPROVED',
                approver_id: user.id,
                approver_name: user?.nama_lengkap || 'Unknown',
                approved_at: new Date().toISOString(),
                catatan: reviewerNote
            });

            Swal.fire('Berhasil', 'Laporan berhasil disetujui.', 'success');
            setSelectedItem(null);
            setReviewerNote('');
            setShowModal(false);
            fetchSubmissions(selectedPeriod);

        } catch (e: any) {
            Swal.fire('Error', e.message, 'error');
        }
    };

    const handleReject = async () => {
        if (!selectedItem) return;
        if (!reviewerNote.trim()) {
            Swal.fire('Wajib Diisi', 'Harap isi catatan revisi untuk guru ybs.', 'warning');
            return;
        }

        try {
            const { error } = await supabase.from('lckh_submissions').update({
                status: 'Revisi',
                catatan_reviewer: reviewerNote,
                updated_at: new Date().toISOString()
            }).eq('id', selectedItem.id);

            if (error) throw error;

            // Insert Log
            await supabase.from('lckh_approvals').insert({
                lckh_submission_id: selectedItem.id,
                level: 'WAKA',
                status_approval: 'REJECTED',
                approver_id: user.id,
                approver_name: user?.nama_lengkap || 'Unknown',
                approved_at: new Date().toISOString(),
                catatan: reviewerNote
            });

            Swal.fire('Dikembalikan', 'Laporan dikembalikan ke guru untuk revisi.', 'info');
            setShowModal(false);
            fetchSubmissions(selectedPeriod);
        } catch (e: any) {
            Swal.fire('Error', e.message, 'error');
        }
    };

    const getStatusBadge = (s: string) => {
        const cls: any = {
            'Submitted': 'bg-blue-100 text-blue-700',
            'Approved_Waka': 'bg-emerald-100 text-emerald-700',
            'Approved_Kamad': 'bg-green-100 text-green-700',
            'Revisi': 'bg-red-100 text-red-700',
            'Rejected': 'bg-red-100 text-red-700',
        };
        return <span className={`px-2 py-1 rounded text-xs font-bold ${cls[s] || 'bg-gray-100'}`}>{s.replace('_', ' ')}</span>
    }

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-navy-900">Approval LCKH</h1>
                    <p className="text-gray-500">Verifikasi Laporan Kinerja Harian Guru</p>
                </div>

                <div className="flex gap-2">
                    <select
                        value={selectedPeriod}
                        onChange={(e) => setSelectedPeriod(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold outline-none min-w-[200px]"
                    >
                        {periods.length === 0 && <option value="">Tidak ada periode</option>}
                        {periods.map(p => (
                            <option key={p.id} value={p.periode_kode}>{p.periode_nama}</option>
                        ))}
                    </select>

                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-semibold outline-none"
                    >
                        <option value="ALL">Semua Status</option>
                        <option value="Submitted">Menunggu Verifikasi (Waka)</option>
                        <option value="Approved_Waka">Menunggu Sah (Kamad)</option>
                        <option value="Approved_Kamad">Selesai</option>
                        <option value="Revisi">Revisi</option>
                    </select>
                </div>
            </div>

            {/* Submissions Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Info Guru</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Jam Mengajar</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Jurnal & Nilai</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm">Status</th>
                            <th className="px-6 py-4 font-semibold text-gray-600 text-sm text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Memuat data...</td></tr>
                        )}
                        {!loading && submissions.length === 0 && (
                            <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">Tidak ada pengajuan laporan pada periode ini.</td></tr>
                        )}
                        {submissions.map((sub: any) => (
                            <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-navy-900">{sub.nama_guru_snap}</div>
                                    <div className="text-xs text-gray-500">NIP. {sub.nip}</div>
                                    <div className="text-xs text-gray-400 mt-1">
                                        <i className="bi bi-clock"></i> {new Date(sub.submitted_at).toLocaleDateString()}
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-sm font-semibold">{sub.snap_total_jam_mengajar || 0} JP</div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="text-xs text-gray-600">
                                        <div><span className="font-bold">{sub.snap_ringkasan_umum?.total_jurnal_isi || 0}</span> Jurnal</div>
                                        <div><span className="font-bold">{sub.snap_ringkasan_umum?.total_nilai_input || 0}</span> Nilai Input</div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {getStatusBadge(sub.status)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button
                                        onClick={() => {
                                            setSelectedItem(sub);
                                            setReviewerNote(sub.catatan_reviewer || '');
                                            setShowModal(true);
                                        }}
                                        className="bg-navy-50 text-navy-600 hover:bg-navy-100 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
                                    >
                                        Review
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Approval Modal */}
            {showModal && selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white z-10">
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Review LCKH</h3>
                                <div className="text-sm text-gray-500">{selectedItem.nama_guru_snap} - {periods.find(p => p.periode_kode === selectedPeriod)?.periode_nama}</div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <i className="bi bi-x-lg text-xl"></i>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-blue-50 p-4 rounded-xl">
                                    <div className="text-xs text-blue-600 font-bold uppercase">Total Jam</div>
                                    <div className="text-2xl font-bold text-blue-900">{selectedItem.snap_total_jam_mengajar || 0}</div>
                                </div>
                                <div className="bg-emerald-50 p-4 rounded-xl">
                                    <div className="text-xs text-emerald-600 font-bold uppercase">Jurnal</div>
                                    <div className="text-2xl font-bold text-emerald-900">{selectedItem.snap_ringkasan_umum?.total_jurnal_isi || 0}</div>
                                </div>
                                <div className="bg-purple-50 p-4 rounded-xl">
                                    <div className="text-xs text-purple-600 font-bold uppercase">Nilai</div>
                                    <div className="text-2xl font-bold text-purple-900">{selectedItem.snap_ringkasan_umum?.total_nilai_input || 0}</div>
                                </div>
                            </div>

                            {/* Uraian Kegiatan (Attached Journal) */}
                            <div>
                                <h4 className="font-bold text-gray-800 mb-2 border-b pb-2">Uraian Kegiatan Pembelajaran</h4>
                                {selectedItem.lampiran_jurnal && selectedItem.lampiran_jurnal.length > 0 ? (
                                    <div className="overflow-x-auto border rounded-xl">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50 text-gray-700">
                                                <tr>
                                                    <th className="px-3 py-2 border-r">No</th>
                                                    <th className="px-3 py-2 border-r">Hari/Tgl</th>
                                                    <th className="px-3 py-2 border-r">Jam Ke</th>
                                                    <th className="px-3 py-2 border-r">Kelas</th>
                                                    <th className="px-3 py-2 border-r">Mapel</th>
                                                    <th className="px-3 py-2 border-r">Materi</th>
                                                    <th className="px-3 py-2 text-center">H</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {selectedItem.lampiran_jurnal.map((item: any, idx: number) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        <td className="px-3 py-2 text-center border-r">{idx + 1}</td>
                                                        <td className="px-3 py-2 border-r text-nowrap">{item.hari}, {item.tanggal}</td>
                                                        <td className="px-3 py-2 text-center border-r">{item.jam_ke}</td>
                                                        <td className="px-3 py-2 text-center border-r">{item.kelas}</td>
                                                        <td className="px-3 py-2 border-r">{item.mapel}</td>
                                                        <td className="px-3 py-2 border-r font-medium">{item.materi}</td>
                                                        <td className="px-3 py-2 text-center font-bold bg-green-50 text-green-700">{item.hadir}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-gray-400 italic text-sm">Tidak ada lampiran jurnal.</p>
                                )}
                            </div>

                            {/* Rekap Absensi Siswa */}
                            <div>
                                <h4 className="font-bold text-gray-800 mb-2 border-b pb-2">Rekap Absensi Siswa</h4>
                                {selectedItem.lampiran_absensi && selectedItem.lampiran_absensi.length > 0 ? (
                                    <div className="overflow-x-auto border rounded-xl">
                                        <table className="w-full text-xs">
                                            <thead className="bg-gray-50 text-gray-700">
                                                <tr>
                                                    <th className="px-3 py-2 border-r">Kelas</th>
                                                    <th className="px-3 py-2 border-r">Mapel</th>
                                                    <th className="px-3 py-2 border-r">S</th>
                                                    <th className="px-3 py-2 border-r">I</th>
                                                    <th className="px-3 py-2 border-r">A</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {selectedItem.lampiran_absensi.map((item: any, idx: number) => (
                                                    <tr key={idx}>
                                                        <td className="px-3 py-2 border-r font-bold">{item.kelas}</td>
                                                        <td className="px-3 py-2 border-r">{item.mapel}</td>
                                                        <td className="px-3 py-2 border-r text-center">{item.S}</td>
                                                        <td className="px-3 py-2 border-r text-center">{item.I}</td>
                                                        <td className="px-3 py-2 border-r text-center">{item.A}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-gray-400 italic text-sm">Tidak ada lampiran absensi.</p>
                                )}
                            </div>


                            {/* Teacher's Note */}
                            {selectedItem.catatan_guru && (
                                <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                                    <h5 className="font-bold text-yellow-800 text-sm mb-1">Catatan Guru:</h5>
                                    <p className="text-sm text-yellow-900 italic">"{selectedItem.catatan_guru}"</p>
                                </div>
                            )}

                            {/* Reviewer Note Input */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Catatan Reviewer / Revisi</label>
                                <textarea
                                    className="w-full border border-gray-300 rounded-xl p-3 focus:ring-2 focus:ring-navy-500 outline-none"
                                    rows={3}
                                    placeholder="Tuliskan catatan jika ada revisi..."
                                    value={reviewerNote}
                                    onChange={(e) => setReviewerNote(e.target.value)}
                                ></textarea>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 rounded-b-2xl">
                            <button
                                onClick={handleReject}
                                className="px-4 py-2 rounded-xl border border-red-200 text-red-700 font-semibold hover:bg-red-50 transition-all flex items-center gap-2"
                            >
                                <i className="bi bi-x-circle"></i> Minta Revisi
                            </button>
                            <button
                                onClick={handleApprove}
                                className="px-6 py-2 rounded-xl bg-navy-600 text-white font-semibold hover:bg-navy-700 shadow-lg shadow-navy-100 transition-all flex items-center gap-2"
                            >
                                <i className="bi bi-check-circle"></i> Setujui Laporan
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

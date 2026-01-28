'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import Select from 'react-select';
import './tugas-tambahan.css';

interface TugasTambahan {
    id: string;
    nip: string;
    nama_guru: string;
    jabatan: string;
    keterangan: string;
    tahun_ajaran: string;
    semester: number;
}

interface JurnalTugas {
    id: string;
    tugas_id: string;
    nip: string;
    tanggal: string;
    kegiatan: string;
    hasil: string;
    foto_url?: string;
    tugas?: TugasTambahan;
}

const JABATAN_LIST = [
    'Wali Kelas',
    'Pembina Ekstrakurikuler',
    'Kepala Laboratorium',
    'Kepala Perpustakaan',
    'Wakil Kepala Madrasah'
];

export default function TugasTambahanPage() {
    const [user, setUser] = useState<any>(null);
    const [myTugas, setMyTugas] = useState<TugasTambahan[]>([]);
    const [jurnalList, setJurnalList] = useState<JurnalTugas[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingJurnal, setEditingJurnal] = useState<JurnalTugas | null>(null);

    // Global filters (Admin)
    const [allTugas, setAllTugas] = useState<TugasTambahan[]>([]);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const loadUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const { data: profile } = await supabase.from('users').select('*').eq('auth_id', authUser.id).single();
                if (profile) {
                    setUser(profile);
                    setIsAdmin(profile.role?.includes('ADMIN') || profile.roles?.includes('ADMIN'));
                    loadInitialData(profile.nip, profile.role?.includes('ADMIN'));
                }
            }
        };
        loadUser();
    }, []);

    const loadInitialData = async (nip: string, adminMode: boolean) => {
        setLoading(true);
        try {
            // Load my assignments
            const tugasRes = await fetch(`/api/tugas-tambahan?nip=${nip}`);
            const tugasData = await tugasRes.json();
            if (tugasData.ok) setMyTugas(tugasData.data);

            // Load my journals
            const jurnalRes = await fetch(`/api/tugas-tambahan/jurnal?nip=${nip}`);
            const jurnalData = await jurnalRes.json();
            if (jurnalData.ok) setJurnalList(jurnalData.data);

            if (adminMode) {
                const allRes = await fetch('/api/tugas-tambahan');
                const allData = await allRes.json();
                if (allData.ok) setAllTugas(allData.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveJurnal = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const data = {
            id: editingJurnal?.id,
            tugas_id: formData.get('tugas_id'),
            nip: user.nip,
            tanggal: formData.get('tanggal'),
            kegiatan: formData.get('kegiatan'),
            hasil: formData.get('hasil'),
        };

        try {
            const res = await fetch('/api/tugas-tambahan/jurnal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.ok) {
                Swal.fire('Berhasil', 'Laporan berhasil disimpan', 'success');
                setShowForm(false);
                setEditingJurnal(null);
                loadInitialData(user.nip, isAdmin);
            }
        } catch (err) {
            Swal.fire('Error', 'Gagal menyimpan laporan', 'error');
        }
    };

    const handleDeleteJurnal = async (id: string) => {
        const confirm = await Swal.fire({
            title: 'Hapus Laporan?',
            text: 'Data yang dihapus tidak bisa dikembalikan',
            icon: 'warning',
            showCancelButton: true
        });

        if (confirm.isConfirmed) {
            await fetch(`/api/tugas-tambahan/jurnal?id=${id}`, { method: 'DELETE' });
            loadInitialData(user.nip, isAdmin);
        }
    };

    return (
        <div className="tt-page">
            <div className="tt-header">
                <div>
                    <h1>Laporan Tugas Tambahan</h1>
                    <p>Dokumentasi kegiatan di luar jam mengajar</p>
                </div>
                <div className="tt-actions">
                    <button className="jt__btn jt__btnPrimary" onClick={() => { setEditingJurnal(null); setShowForm(true); }}>
                        <i className="bi bi-plus-lg"></i> Buat Laporan
                    </button>
                </div>
            </div>

            <div className="tt-grid">
                {/* Information Card */}
                <div className="tt-sidebar">
                    <div className="tt-card tt-profile-card">
                        <h3>Tugas Saya</h3>
                        {myTugas.length > 0 ? (
                            <div className="tt-list">
                                {myTugas.map(t => (
                                    <div key={t.id} className="tt-list-item">
                                        <div className="tt-item-icon"><i className="bi bi-briefcase"></i></div>
                                        <div className="tt-item-info">
                                            <div className="tt-item-title">{t.jabatan}</div>
                                            <div className="tt-item-sub">{t.keterangan || '-'}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-slate-400 text-sm italic">Belum ada tugas tambahan terdaftar.</p>
                        )}
                    </div>
                </div>

                {/* Main Content: Journal List */}
                <div className="tt-content">
                    <div className="tt-card">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="m-0">Riwayat Kegiatan</h3>
                        </div>

                        {loading ? (
                            <div className="py-20 text-center text-slate-400">Memuat data...</div>
                        ) : jurnalList.length > 0 ? (
                            <div className="tt-table-wrap">
                                <table className="tt-table">
                                    <thead>
                                        <tr>
                                            <th>Tanggal</th>
                                            <th>Tugas / Jabatan</th>
                                            <th>Kegiatan</th>
                                            <th>Hasil / Output</th>
                                            <th className="text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {jurnalList.map(j => (
                                            <tr key={j.id}>
                                                <td className="whitespace-nowrap font-bold">{j.tanggal}</td>
                                                <td><span className="badge-tt">{j.tugas?.jabatan}</span></td>
                                                <td>{j.kegiatan}</td>
                                                <td>{j.hasil || '-'}</td>
                                                <td>
                                                    <div className="flex justify-end gap-2">
                                                        <button className="jt__iconBtn" onClick={() => { setEditingJurnal(j); setShowForm(true); }}>
                                                            <i className="bi bi-pencil"></i>
                                                        </button>
                                                        <button className="jt__iconBtn danger" onClick={() => handleDeleteJurnal(j.id)}>
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="py-20 text-center">
                                <i className="bi bi-journal-x text-4xl text-slate-200"></i>
                                <p className="text-slate-400 mt-2">Belum ada riwayat kegiatan.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {showForm && (
                <div className="jt__modal" onClick={() => setShowForm(false)}>
                    <div className="jt__modalContent !p-0 border-0" onClick={e => e.stopPropagation()}>
                        <div className="p-6 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex justify-between items-center rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                                    <i className={`bi ${editingJurnal ? 'bi-pencil-square' : 'bi-plus-circle'} text-xl`}></i>
                                </div>
                                <div>
                                    <h3 className="m-0 text-lg font-bold tracking-tight text-white">
                                        {editingJurnal ? 'Edit Laporan' : 'Laporan Baru'}
                                    </h3>
                                    <p className="m-0 text-xs text-blue-100 opacity-80">Dokumentasi kegiatan tugas tambahan</p>
                                </div>
                            </div>
                            <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white border-none cursor-pointer" onClick={() => setShowForm(false)}>
                                <i className="bi bi-x-lg text-sm"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSaveJurnal}>
                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="jt__formLabel">
                                            <i className="bi bi-briefcase text-blue-600 mr-1"></i> Tugas Tambahan
                                        </label>
                                        <select name="tugas_id" className="jt__formInput" defaultValue={editingJurnal?.tugas_id} required>
                                            <option value="">-- Pilih Tugas --</option>
                                            {myTugas.map(t => (
                                                <option key={t.id} value={t.id}>{t.jabatan}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="jt__formLabel">
                                            <i className="bi bi-calendar-event text-blue-600 mr-1"></i> Tanggal
                                        </label>
                                        <input type="date" name="tanggal" className="jt__formInput" defaultValue={editingJurnal?.tanggal || new Date().toISOString().split('T')[0]} required />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="jt__formLabel">
                                        <i className="bi bi-activity text-blue-600 mr-1"></i> Kegiatan / Aktivitas
                                    </label>
                                    <textarea name="kegiatan" className="jt__formInput min-h-[100px]" rows={3} defaultValue={editingJurnal?.kegiatan} placeholder="Jelaskan detail kegiatan yang dilakukan..." required />
                                </div>

                                <div className="space-y-2">
                                    <label className="jt__formLabel">
                                        <i className="bi bi-check-circle text-blue-600 mr-1"></i> Hasil / Output
                                    </label>
                                    <textarea name="hasil" className="jt__formInput min-h-[80px]" rows={2} defaultValue={editingJurnal?.hasil} placeholder="Hasil kegiatan atau tindak lanjut..." />
                                </div>
                            </div>

                            <div className="jt__modalActions p-6 bg-slate-50 rounded-b-2xl border-t border-slate-100">
                                <button type="button" className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors border-none cursor-pointer" onClick={() => setShowForm(false)}>Batal</button>
                                <button type="submit" className="px-8 py-2.5 rounded-xl bg-blue-900 text-white text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-800 active:scale-95 transition-all border-none cursor-pointer">
                                    <i className="bi bi-save mr-2"></i> Simpan Laporan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

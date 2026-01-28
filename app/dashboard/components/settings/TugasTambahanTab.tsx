'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import Select from 'react-select';

interface Guru {
    nip: string;
    nama_lengkap: string;
}

interface TugasTambahan {
    id: string;
    nip: string;
    nama_guru: string;
    jabatan: string;
    keterangan: string;
    tahun_ajaran: string;
    semester: number;
}

const JABATAN_LIST = [
    { value: 'Wali Kelas', label: 'Wali Kelas' },
    { value: 'Pembina Ekstrakurikuler', label: 'Pembina Ekstrakurikuler' },
    { value: 'Kepala Laboratorium', label: 'Kepala Laboratorium' },
    { value: 'Kepala Perpustakaan', label: 'Kepala Perpustakaan' },
    { value: 'Wakil Kepala Madrasah', label: 'Wakil Kepala Madrasah' },
    { value: 'Kepala Madrasah', label: 'Kepala Madrasah' },
    { value: 'Bendahara Madrasah', label: 'Bendahara Madrasah' }
];

const customSelectStyles = {
    control: (base: any) => ({
        ...base,
        borderRadius: '12px',
        border: '1px solid rgba(30, 58, 138, 0.2)',
        padding: '2px',
        fontSize: '0.9rem'
    })
};

export default function TugasTambahanTab() {
    const [tugasList, setTugasList] = useState<TugasTambahan[]>([]);
    const [guruOptions, setGuruOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTugas, setEditingTugas] = useState<TugasTambahan | null>(null);

    // Form states
    const [selectedGuru, setSelectedGuru] = useState<any>(null);
    const [selectedJabatan, setSelectedJabatan] = useState<any>(null);
    const [tahunAjaran, setTahunAjaran] = useState('2025/2026');
    const [semester, setSemester] = useState(2);
    const [keterangan, setKeterangan] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [tugasRes, guruRes] = await Promise.all([
                fetch('/api/tugas-tambahan'),
                fetch('/api/master/guru?limit=500')
            ]);

            const tugasData = await tugasRes.json();
            const guruData = await guruRes.json();

            if (tugasData.ok) setTugasList(tugasData.data);
            if (guruData.ok) {
                setGuruOptions(guruData.data.map((g: any) => ({
                    value: g.nip,
                    label: `${g.nama_lengkap} (${g.nip})`,
                    nama: g.nama_lengkap
                })));
            }
        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedGuru || !selectedJabatan) {
            Swal.fire('Error', 'Guru dan Jabatan wajib dipilih', 'error');
            return;
        }

        const payload = {
            nip: selectedGuru.value,
            nama_guru: selectedGuru.nama,
            jabatan: selectedJabatan.value,
            keterangan,
            tahun_ajaran: tahunAjaran,
            semester,
            id: editingTugas?.id
        };

        try {
            const res = await fetch('/api/tugas-tambahan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if (result.ok) {
                Swal.fire('Berhasil', 'Penugasan berhasil disimpan', 'success');
                setShowModal(false);
                resetForm();
                loadData();
            } else {
                throw new Error(result.error);
            }
        } catch (error: any) {
            Swal.fire('Error', 'Gagal menyimpan penugasan: ' + error.message, 'error');
        }
    };

    const handleDelete = async (id: string) => {
        const result = await Swal.fire({
            title: 'Hapus Penugasan?',
            text: 'Data penugasan akan dihapus permanen',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444'
        });

        if (result.isConfirmed) {
            await fetch(`/api/tugas-tambahan?id=${id}`, { method: 'DELETE' });
            loadData();
        }
    };

    const resetForm = () => {
        setEditingTugas(null);
        setSelectedGuru(null);
        setSelectedJabatan(null);
        setKeterangan('');
    };

    const openEdit = (tugas: TugasTambahan) => {
        setEditingTugas(tugas);
        setSelectedGuru(guruOptions.find(o => o.value === tugas.nip));
        setSelectedJabatan(JABATAN_LIST.find(o => o.value === tugas.jabatan));
        setTahunAjaran(tugas.tahun_ajaran);
        setSemester(tugas.semester);
        setKeterangan(tugas.keterangan);
        setShowModal(true);
    };

    return (
        <div className="ds__tabContent">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                        <i className="bi bi-person-badge"></i>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 m-0">Tugas Tambahan</h2>
                        <p className="text-xs text-slate-500 m-0">Set penugasan Wali Kelas, Wakil Kepala, dsb.</p>
                    </div>
                </div>
                <button className="jt__btn jt__btnPrimary" onClick={() => { resetForm(); setShowModal(true); }}>
                    <i className="bi bi-plus-lg"></i> Tambah Penugasan
                </button>
            </div>

            <div className="tt-table-wrap">
                <table className="tt-table">
                    <thead>
                        <tr>
                            <th>NIP</th>
                            <th>Nama Guru</th>
                            <th>Jabatan</th>
                            <th>Tahun/Sem</th>
                            <th>Keterangan</th>
                            <th className="text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-10 text-slate-400">Memuat data...</td></tr>
                        ) : tugasList.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-10 text-slate-400 italic font-medium">Belum ada data penugasan.</td></tr>
                        ) : (
                            tugasList.map(t => (
                                <tr key={t.id}>
                                    <td className="font-mono text-[10px] text-slate-500">{t.nip}</td>
                                    <td className="font-bold text-sm">{t.nama_guru}</td>
                                    <td><span className="badge-tt">{t.jabatan}</span></td>
                                    <td className="text-[11px]">{t.tahun_ajaran} • S{t.semester}</td>
                                    <td className="text-xs text-slate-500">{t.keterangan || '-'}</td>
                                    <td>
                                        <div className="flex justify-end gap-2">
                                            <button className="jt__iconBtn" onClick={() => openEdit(t)}>
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                            <button className="jt__iconBtn danger" onClick={() => handleDelete(t.id)}>
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

            {/* Modal Form */}
            {showModal && (
                <div className="jt__modal" onClick={() => setShowModal(false)}>
                    <div className="jt__modalContent max-w-xl !p-0 border-0" onClick={e => e.stopPropagation()}>
                        {/* Header dengan Gradient */}
                        <div className="p-6 bg-gradient-to-r from-navy-900 to-navy-800 text-white flex justify-between items-center rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                                    <i className={`bi ${editingTugas ? 'bi-pencil-square' : 'bi-plus-circle'} text-xl`}></i>
                                </div>
                                <div>
                                    <h3 className="m-0 text-lg font-bold tracking-tight">
                                        {editingTugas ? 'Perbarui Penugasan' : 'Tambah Penugasan Baru'}
                                    </h3>
                                    <p className="m-0 text-xs text-navy-200">Lengkapi detail instruksi di bawah ini</p>
                                </div>
                            </div>
                            <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors" onClick={() => setShowModal(false)}>
                                <i className="bi bi-x-lg text-sm"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            {/* Guru Selection */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                    <i className="bi bi-person text-navy-600"></i> Pilih Guru Pengampu
                                </label>
                                <Select
                                    options={guruOptions}
                                    value={selectedGuru}
                                    onChange={setSelectedGuru}
                                    styles={customSelectStyles}
                                    placeholder="Cari NAMA atau NIP guru..."
                                />
                            </div>

                            {/* Jabatan Selection */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                    <i className="bi bi-award text-navy-600"></i> Jenis Jabatan / Tugas
                                </label>
                                <Select
                                    options={JABATAN_LIST}
                                    value={selectedJabatan}
                                    onChange={setSelectedJabatan}
                                    styles={customSelectStyles}
                                    placeholder="Pilih kategori jabatan..."
                                />
                            </div>

                            {/* Periode Grid */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                        <i className="bi bi-calendar4-week text-navy-600"></i> Tahun Ajaran
                                    </label>
                                    <input
                                        type="text"
                                        className="jt__formInput !bg-slate-50 border-slate-200 focus:!bg-white"
                                        value={tahunAjaran}
                                        onChange={e => setTahunAjaran(e.target.value)}
                                        placeholder="2025/2026"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                        <i className="bi bi-hash text-navy-600"></i> Semester
                                    </label>
                                    <select
                                        className="jt__formInput !bg-slate-50 border-slate-200 focus:!bg-white"
                                        value={semester}
                                        onChange={e => setSemester(Number(e.target.value))}
                                    >
                                        <option value={1}>Ganjil (1)</option>
                                        <option value={2}>Genap (2)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Keterangan */}
                            <div className="space-y-2">
                                <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider ml-1">
                                    <i className="bi bi-info-circle text-navy-600"></i> Keterangan Tambahan
                                </label>
                                <textarea
                                    className="jt__formInput !bg-slate-50 border-slate-200 focus:!bg-white min-h-[80px]"
                                    value={keterangan}
                                    onChange={e => setKeterangan(e.target.value)}
                                    rows={2}
                                    placeholder="Gunakan untuk detil seperti nama kelas atau divisi khusus..."
                                />
                            </div>

                            {/* Footer Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors" onClick={() => setShowModal(false)}>
                                    Batal
                                </button>
                                <button type="submit" className="px-8 py-2.5 rounded-xl bg-navy-600 text-white text-sm font-bold shadow-lg shadow-navy-200 hover:bg-navy-700 active:scale-95 transition-all">
                                    {editingTugas ? 'Simpan Perubahan' : 'Ploting Tugas'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

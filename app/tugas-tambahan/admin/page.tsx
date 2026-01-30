'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import Select from 'react-select';
import '../tugas-tambahan.css';

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

export default function AdminTugasTambahan() {
    const [tugasList, setTugasList] = useState<TugasTambahan[]>([]);
    const [guruOptions, setGuruOptions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTugas, setEditingTugas] = useState<TugasTambahan | null>(null);

    // Form states
    const [selectedGuru, setSelectedGuru] = useState<any>(null);
    const [selectedJabatan, setSelectedJabatan] = useState<any>(null);
    const [tahunAjaran, setTahunAjaran] = useState('');
    const [semester, setSemester] = useState<string | number>('Ganjil');
    const [keterangan, setKeterangan] = useState('');
    const [academicYears, setAcademicYears] = useState<string[]>([]);

    useEffect(() => {
        loadData();
        fetchAcademicYears();
    }, []);

    const fetchAcademicYears = async () => {
        try {
            const { getActivePeriods, getActiveSettings } = await import('@/lib/settings-client');
            const periods = await getActivePeriods();
            const defaultSettings = await getActiveSettings();

            if (periods.length > 0) {
                const uniqueYears = Array.from(new Set(periods.map(p => p.tahun_ajaran)));
                setAcademicYears(uniqueYears);

                const currentYearIsValid = uniqueYears.includes(tahunAjaran);

                if (!currentYearIsValid && defaultSettings) {
                    setTahunAjaran(defaultSettings.tahun_ajaran);
                    setSemester(defaultSettings.semester);
                } else if (!currentYearIsValid && periods.length > 0) {
                    setTahunAjaran(periods[0].tahun_ajaran);
                    setSemester(periods[0].semester);
                }
            } else {
                setAcademicYears([]);
            }
        } catch (err) {
            console.error(err);
        }
    };

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
        <div className="tt-page">
            <div className="jt__pageHeader">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Ploting Tugas Tambahan</h1>
                    <p className="text-slate-500 text-sm">Atur penugasan struktural dan fungsional guru</p>
                </div>
                <div>
                    <button className="jt__btn jt__btnPrimary" onClick={() => { resetForm(); setShowModal(true); }}>
                        <i className="bi bi-person-plus"></i> Tambah Penugasan
                    </button>
                </div>
            </div>

            <div className="jt__tableWrap mt-6">
                <table className="jt__table">
                    <thead>
                        <tr>
                            <th>NIP</th>
                            <th>Nama Guru</th>
                            <th>Jabatan Tambahan</th>
                            <th>Tahun/Sem</th>
                            <th>Keterangan</th>
                            <th className="text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="text-center py-10">Memuat data...</td></tr>
                        ) : tugasList.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-10 text-slate-400 italic">Belum ada data penugasan.</td></tr>
                        ) : (
                            tugasList.map(t => (
                                <tr key={t.id}>
                                    <td className="font-mono text-[11px] text-slate-500">{t.nip}</td>
                                    <td className="font-bold">{t.nama_guru}</td>
                                    <td><span className="badge-tt">{t.jabatan}</span></td>
                                    <td className="text-xs">{t.tahun_ajaran} - S{t.semester}</td>
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
                        <div className="p-6 bg-gradient-to-r from-blue-900 to-slate-900 text-white flex justify-between items-center rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-sm">
                                    <i className={`bi ${editingTugas ? 'bi-pencil-square' : 'bi-plus-circle'} text-xl`}></i>
                                </div>
                                <div>
                                    <h3 className="m-0 text-lg font-bold tracking-tight text-white">
                                        {editingTugas ? 'Edit Penugasan' : 'Tambah Penugasan Guru'}
                                    </h3>
                                    <p className="m-0 text-xs text-blue-100 opacity-80"> Manajemen tugas tambahan guru</p>
                                </div>
                            </div>
                            <button className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors text-white border-none cursor-pointer" onClick={() => setShowModal(false)}>
                                <i className="bi bi-x-lg text-sm"></i>
                            </button>
                        </div>
                        <form onSubmit={handleSave}>
                            <div className="p-8 space-y-5">
                                <div className="jt__formGroup">
                                    <label className="jt__formLabel">Pilih Guru</label>
                                    <Select
                                        options={guruOptions}
                                        value={selectedGuru}
                                        onChange={setSelectedGuru}
                                        styles={customSelectStyles}
                                        placeholder="Cari nama guru..."
                                    />
                                </div>
                                <div className="jt__formGroup">
                                    <label className="jt__formLabel">Jabatan Tambahan</label>
                                    <Select
                                        options={JABATAN_LIST}
                                        value={selectedJabatan}
                                        onChange={setSelectedJabatan}
                                        styles={customSelectStyles}
                                        placeholder="Pilih jabatan..."
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="jt__formGroup">
                                        <label className="jt__formLabel">Tahun Ajaran</label>
                                        <select
                                            className="jt__formInput"
                                            value={tahunAjaran}
                                            onChange={e => setTahunAjaran(e.target.value)}
                                        >
                                            {academicYears.length > 1 && <option value="Semua">Semua</option>}
                                            {academicYears.map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="jt__formGroup">
                                        <label className="jt__formLabel">Semester</label>
                                        <select
                                            className="jt__formInput"
                                            value={semester}
                                            onChange={e => setSemester(e.target.value)}
                                        >
                                            <option value="Ganjil">Ganjil</option>
                                            <option value="Genap">Genap</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="jt__formGroup">
                                    <label className="jt__formLabel">Keterangan / Detil</label>
                                    <textarea
                                        className="jt__formInput min-h-[80px]"
                                        value={keterangan}
                                        onChange={e => setKeterangan(e.target.value)}
                                        rows={2}
                                        placeholder="Misal: Wali Kelas IX-A atau Wakil Bidang Kurikulum"
                                    />
                                </div>
                            </div>
                            <div className="jt__modalActions p-6 bg-slate-50 rounded-b-2xl border-t border-slate-100">
                                <button type="button" className="px-6 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors border-none cursor-pointer" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="px-8 py-2.5 rounded-xl bg-blue-900 text-white text-sm font-bold shadow-lg shadow-blue-900/20 hover:bg-blue-800 active:scale-95 transition-all border-none cursor-pointer">
                                    <i className="bi bi-save mr-2"></i> Simpan Penugasan
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

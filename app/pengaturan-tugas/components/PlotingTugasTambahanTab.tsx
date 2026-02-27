'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Swal from 'sweetalert2';
import Select from 'react-select';
import { hasPermission } from '@/lib/permissions-client';

interface PlotingTugasTambahanTabProps {
    user?: any
}

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



const customSelectStyles = {
    control: (base: any) => ({
        ...base,
        borderRadius: '12px',
        border: '1px solid rgba(30, 58, 138, 0.2)',
        padding: '2px',
        fontSize: '0.9rem'
    })
};

export default function PlotingTugasTambahanTab({ user }: PlotingTugasTambahanTabProps) {
    // Permissions
    const permissions = user?.permissions || []
    const isAdmin = (user?.role === 'ADMIN') || (user?.roles?.some((r: string) => r.toUpperCase() === 'ADMIN')) || false

    const canCreate = hasPermission(permissions, 'pengaturan_tugas.tugas_tambahan', 'create', isAdmin)
    const canUpdate = hasPermission(permissions, 'pengaturan_tugas.tugas_tambahan', 'update', isAdmin)
    const canDelete = hasPermission(permissions, 'pengaturan_tugas.tugas_tambahan', 'delete', isAdmin)

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

    const [jabatanOptions, setJabatanOptions] = useState<any[]>([]);
    const [allMasterData, setAllMasterData] = useState<any[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        // Filter options when dependencies change
        if (allMasterData.length > 0) {
            const filtered = allMasterData.filter((t: any) =>
                t.aktif &&
                t.tahun_ajaran === tahunAjaran &&
                (
                    String(t.semester).toLowerCase() === 'semua' ||
                    String(t.semester) === String(semester) ||
                    // Handle numeric vs string mismatch if simple equality fails, 
                    // though usually one is consistently used.
                    // '1' vs 1 vs 'Ganjil' vs 'Genap'
                    (semester === 1 && String(t.semester).toLowerCase() === 'ganjil') ||
                    (semester === 2 && String(t.semester).toLowerCase() === 'genap')
                )
            );

            const uniqueNames = Array.from(new Set(filtered.map((t: any) => t.nama_tugas)));
            setJabatanOptions(uniqueNames.map(name => ({ value: name, label: name })));
        } else {
            setJabatanOptions([]);
        }
    }, [allMasterData, tahunAjaran, semester]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [tugasRes, guruRes, masterTugasRes] = await Promise.all([
                fetch('/api/tugas-tambahan'),
                fetch('/api/master/guru?limit=500'),
                fetch('/api/master/tugas-tambahan')
            ]);

            const tugasData = await tugasRes.json();
            const guruData = await guruRes.json();
            const masterTugasData = await masterTugasRes.json();

            if (tugasData.ok) setTugasList(tugasData.data);

            if (guruData.ok) {
                setGuruOptions(guruData.data.map((g: any) => ({
                    value: g.nip,
                    label: `${g.nama_lengkap} (${g.nip})`,
                    nama: g.nama_lengkap
                })));
            }

            if (masterTugasData.ok) {
                setAllMasterData(masterTugasData.data);
            }

        } catch (error) {
            console.error('Failed to load data', error);
        } finally {
            setLoading(false);
        }
    };

    // Helper to get active academic year/sem if needed, but for now using state.

    // ...

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (editingTugas ? !canUpdate : !canCreate) return;
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
        if (!canDelete) return;
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
        if (!canUpdate) return;
        setEditingTugas(tugas);
        setSelectedGuru(guruOptions.find(o => o.value === tugas.nip));
        // Use jabatanOptions or try to find in current list. 
        // If not in current filtered list, we might want to temporarily add it or just look it up.
        // For now, let's assume it should match by value if React-Select parses the string.
        // But better to find object if options are objects.
        // If options are reset when modal opens, we rely on effect.

        // Wait, if we open edit, title uses state `tahunAjaran` / `semester` which triggers the effect.
        // So options *should* be populated correctly.
        setTahunAjaran(tugas.tahun_ajaran);

        // Handle semester type mismatch. API returns number usually?
        let sem: number | string = tugas.semester;
        if (typeof sem === 'string') {
            if (sem === 'Ganjil') sem = 1;
            else if (sem === 'Genap') sem = 2;
            else sem = Number(sem);
        }
        setSemester(sem as number);

        // We set the value directly. React select often can handle { value: '...', label: '...' }
        // BUT if the option list hasn't updated yet, it might show just IDs.
        // Since effect runs after render/state change, there might be a glitch.
        // However, we just need to set the value. 
        setSelectedJabatan({ value: tugas.jabatan, label: tugas.jabatan });

        setKeterangan(tugas.keterangan);
        setShowModal(true);
    };

    return (
        <div className="ds__tabContent">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                        <i className="bi bi-person-vcard"></i>
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 m-0">Ploting Tugas Tambahan</h2>
                        <p className="text-xs text-slate-500 m-0">Set penugasan Wali Kelas, Wakil Kepala, dsb.</p>
                    </div>
                </div>
                {canCreate && (
                    <button className="jt__btn jt__btnPrimary" onClick={() => { resetForm(); setShowModal(true); }}>
                        <i className="bi bi-plus-lg"></i> Tambah Penugasan
                    </button>
                )}
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
                                            {canUpdate && (
                                                <button className="jt__iconBtn" onClick={() => openEdit(t)}>
                                                    <i className="bi bi-pencil"></i>
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button className="jt__iconBtn danger" onClick={() => handleDelete(t.id)}>
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            )}
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
                                    options={jabatanOptions}
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
                                {(editingTugas ? canUpdate : canCreate) && (
                                    <button type="submit" className="px-8 py-2.5 rounded-xl bg-navy-600 text-white text-sm font-bold shadow-lg shadow-navy-200 hover:bg-navy-700 active:scale-95 transition-all">
                                        {editingTugas ? 'Simpan Perubahan' : 'Ploting Tugas'}
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

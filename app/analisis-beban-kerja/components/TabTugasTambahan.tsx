'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

interface TabTugasTambahanProps {
    user?: any;
}

interface MasterTugasTambahan {
    id: number;
    nama_tugas: string;
    tahun_ajaran: string;
    semester: string;
    jumlah_jp: number;
    aktif?: boolean;
}

export default function TabTugasTambahan({ user }: TabTugasTambahanProps) {
    const [list, setList] = useState<MasterTugasTambahan[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form fields
    const [editId, setEditId] = useState<number | null>(null);
    const [namaTugas, setNamaTugas] = useState('');
    const [tahunAjaran, setTahunAjaran] = useState('2025/2026');
    const [semester, setSemester] = useState('Ganjil');
    const [jumlahJp, setJumlahJp] = useState<number | ''>('');

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (searchTerm) params.append('q', searchTerm);

            const res = await fetch(`/api/master/tugas-tambahan?${params.toString()}`);
            const result = await res.json();
            if (result.ok) {
                setList(result.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!namaTugas || !tahunAjaran || !semester || jumlahJp === '') {
            Swal.fire('Error', 'Semua field wajib diisi!', 'error');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/master/tugas-tambahan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editId,
                    nama_tugas: namaTugas,
                    tahun_ajaran: tahunAjaran,
                    semester,
                    jumlah_jp: Number(jumlahJp)
                })
            });
            const result = await res.json();

            if (result.ok) {
                Swal.fire('Berhasil', 'Data Tugas Tambahan berhasil disimpan', 'success');
                closeModal();
                fetchData();
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            Swal.fire('Error', err.message || 'Gagal menyimpan data', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: 'Hapus Data?',
            text: 'Master tugas tambahan ini akan dihapus permanen!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/master/tugas-tambahan?id=${id}`, { method: 'DELETE' });
                const json = await res.json();
                if (json.ok) {
                    fetchData();
                } else {
                    throw new Error(json.error);
                }
            } catch (error: any) {
                Swal.fire('Error', error.message, 'error');
            }
        }
    };

    const handleDownloadTemplate = () => {
        const worksheet = XLSX.utils.json_to_sheet([
            {
                nama_tugas: 'Wali Kelas',
                tahun_ajaran: '2025/2026',
                semester: 'Semua',
                jumlah_jp: 12
            },
            {
                nama_tugas: 'Kepala Laboratorium',
                tahun_ajaran: '2025/2026',
                semester: 'Semua',
                jumlah_jp: 12
            }
        ]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Tugas Tambahan');
        XLSX.writeFile(workbook, 'Template_Import_Tugas_Tambahan.xlsx');
    };

    const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (evt) => {
            try {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    Swal.fire('Error', 'File Excel kosong', 'error');
                    return;
                }

                Swal.fire({
                    title: 'Memproses...',
                    text: 'Sedang mengimpor data Tugas Tambahan.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                const res = await fetch('/api/master/tugas-tambahan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await res.json();

                if (result.ok) {
                    Swal.fire('Berhasil', `Berhasil mengimpor ${result.count} data.`, 'success');
                    fetchData();
                } else {
                    throw new Error(result.error);
                }
            } catch (err: any) {
                Swal.fire('Error', err.message || 'Gagal mengimpor data', 'error');
            }
        };
        reader.readAsBinaryString(file);
        e.target.value = '';
    };

    const openEdit = (item: MasterTugasTambahan) => {
        setEditId(item.id);
        setNamaTugas(item.nama_tugas);
        setTahunAjaran(item.tahun_ajaran);
        setSemester(item.semester);
        setJumlahJp(item.jumlah_jp || 0);
        setShowModal(true);
    };

    const openAdd = () => {
        setEditId(null);
        setNamaTugas('');
        setTahunAjaran('2025/2026');
        setSemester('Semua');
        setJumlahJp(12); // Default contoh wali kelas
        setShowModal(true);
    };

    const closeModal = () => setShowModal(false);

    return (
        <div className="tabContent">
            {/* Toolbar */}
            <div className="toolbar">
                <div className="searchBox">
                    <i className="bi bi-search"></i>
                    <input
                        type="text"
                        placeholder="Cari tugas / jabatan..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btnGhost" onClick={handleDownloadTemplate} title="Download Template Excel">
                        <i className="bi bi-file-earmark-arrow-down"></i> Template
                    </button>
                    <label className="btnSecondary" style={{ cursor: 'pointer', margin: 0 }}>
                        <i className="bi bi-file-earmark-arrow-up"></i> Import
                        <input type="file" accept=".xlsx, .xls" style={{ display: 'none' }} onChange={handleImportExcel} />
                    </label>
                    <button className="btnPrimary" onClick={openAdd}>
                        <i className="bi bi-plus-lg"></i> Tambah Tugas
                    </button>
                </div>
            </div>

            <div className="dataContainer">
                <table className="dataTable">
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Nama Tugas / Jabatan</th>
                            <th>Tahun Ajaran</th>
                            <th>Semester</th>
                            <th>Ekuivalensi JP</th>
                            <th className="text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={6} className="emptyState">Memuat data...</td></tr>
                        ) : list.length === 0 ? (
                            <tr><td colSpan={6} className="emptyState">Tidak ada data Master Tugas Tambahan.</td></tr>
                        ) : (
                            list.map((item, idx) => (
                                <tr key={item.id}>
                                    <td className="w-16">{idx + 1}</td>
                                    <td className="font-semibold text-slate-700">{item.nama_tugas}</td>
                                    <td>{item.tahun_ajaran}</td>
                                    <td>{item.semester}</td>
                                    <td>
                                        <span className={`jpBadge ${!item.jumlah_jp ? 'zero' : ''}`}>
                                            {item.jumlah_jp || 0} JP
                                        </span>
                                    </td>
                                    <td>
                                        <div className="actions right">
                                            <button onClick={() => openEdit(item)} className="iconBtn" title="Edit"><i className="bi bi-pencil"></i></button>
                                            <button onClick={() => handleDelete(item.id)} className="iconBtn danger" title="Hapus"><i className="bi bi-trash"></i></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modalOverlay" onClick={closeModal}>
                    <div className="modalContent" onClick={e => e.stopPropagation()}>
                        <div className="modalHeader">
                            <h2>{editId ? 'Edit Tugas Tambahan' : 'Tambah Tugas Tambahan'}</h2>
                            <button onClick={closeModal}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleSave} className="modalBody">
                            <div className="formGroup">
                                <label>Nama Tugas / Jabatan</label>
                                <input
                                    type="text"
                                    value={namaTugas}
                                    onChange={e => setNamaTugas(e.target.value)}
                                    placeholder="Misal: Wali Kelas, Kepala Perpustakaan"
                                    required
                                />
                            </div>

                            <div className="grid2">
                                <div className="formGroup">
                                    <label>Tahun Ajaran</label>
                                    <select value={tahunAjaran} onChange={e => setTahunAjaran(e.target.value)} required>
                                        <option value="2024/2025">2024/2025</option>
                                        <option value="2025/2026">2025/2026</option>
                                        <option value="2026/2027">2026/2027</option>
                                    </select>
                                </div>
                                <div className="formGroup">
                                    <label>Semester</label>
                                    <select value={semester} onChange={e => setSemester(e.target.value)} required>
                                        <option value="Semua">Semua Semester</option>
                                        <option value="Ganjil">Ganjil</option>
                                        <option value="Genap">Genap</option>
                                    </select>
                                </div>
                            </div>

                            <div className="formGroup">
                                <label>Ekuivalensi Jam Pelajaran (JP)</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="50"
                                    value={jumlahJp}
                                    onChange={e => setJumlahJp(e.target.value !== '' ? Number(e.target.value) : '')}
                                    placeholder="0 - 24"
                                    required
                                />
                                <small className="hint">Nilai jam pelajaran untuk tugas ini (misal: Wali Kelas = 12 JP)</small>
                            </div>

                            <div className="modalFooter">
                                <button type="button" className="btnGhost" onClick={closeModal}>Batal</button>
                                <button type="submit" className="btnPrimary" disabled={saving}>
                                    {saving ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style jsx>{`
                /* Reusing styles from TabJTM where similar but table-focused */
                .tabContent { animation: fadeIn 0.3s ease; }
                .toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; gap: 16px; }
                .searchBox { display: flex; align-items: center; gap: 8px; background: white; border: 1px solid #e2e8f0; padding: 8px 16px; border-radius: 12px; min-width: 300px; }
                .searchBox input { border: none; outline: none; width: 100%; font-size: 0.9rem; }
                .searchBox i { color: #94a3b8; }
                .btnPrimary { background: #0ea5e9; color: white; border: none; padding: 10px 20px; border-radius: 12px; font-weight: 600; display: flex; align-items: center; gap: 8px; cursor: pointer; transition: 0.2s; }
                .btnPrimary:hover { background: #0284c7; }
                .btnSecondary {
                    background: #f8fafc;
                    color: #0f172a;
                    border: 1px solid #e2e8f0;
                    padding: 10px 20px;
                    border-radius: 12px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .btnSecondary:hover { background: #f1f5f9; }
                
                .dataContainer { background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
                .dataTable { width: 100%; border-collapse: collapse; }
                .dataTable th { padding: 14px 20px; text-align: left; font-size: 0.85rem; font-weight: 700; color: #475569; background: #f8fafc; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; letter-spacing: 0.05em; }
                .dataTable th.text-right { text-align: right; }
                .dataTable td { padding: 16px 20px; font-size: 0.95rem; border-bottom: 1px solid #f1f5f9; color: #334155; }
                .dataTable tbody tr:hover { background: #f8fafc; }
                
                .w-16 { width: 4rem; }
                .text-right { text-align: right; }
                .emptyState { padding: 40px !important; text-align: center; color: #94a3b8; font-style: italic; }

                .jpBadge { display: inline-block; background: #e0e7ff; color: #4338ca; font-weight: 700; font-size: 0.85rem; padding: 6px 14px; border-radius: 20px; }
                .jpBadge.zero { background: #f1f5f9; color: #94a3b8; }

                .actions { display: flex; gap: 6px; }
                .actions.right { justify-content: flex-end; }
                .iconBtn { width: 34px; height: 34px; border-radius: 10px; border: none; background: white; color: #64748b; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 4px rgba(0,0,0,0.05); border: 1px solid #e2e8f0; }
                .iconBtn:hover { background: #f1f5f9; color: #0ea5e9; border-color: #bae6fd; }
                .iconBtn.danger:hover { background: #fee2e2; color: #ef4444; border-color: #fecaca; }

                /* Modal styles */
                .modalOverlay { position: fixed; inset: 0; background: rgba(15,23,42,0.6); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 50; padding: 20px; }
                .modalContent { background: white; border-radius: 24px; width: 100%; max-width: 500px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
                @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
                .modalHeader { padding: 20px 24px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
                .modalHeader h2 { margin: 0; font-size: 1.2rem; font-weight: 700; color: #0f172a; }
                .modalHeader button { background: none; border: none; color: #94a3b8; cursor: pointer; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
                .modalHeader button:hover { background: #e2e8f0; color: #0f172a; }
                .modalBody { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
                .formGroup { display: flex; flex-direction: column; gap: 6px; }
                .formGroup label { font-size: 0.85rem; font-weight: 600; color: #475569; }
                .formGroup input, .formGroup select { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 10px; font-size: 0.95rem; outline: none; transition: 0.2s; }
                .formGroup input:focus, .formGroup select:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1); }
                .hint { font-size: 0.75rem; color: #94a3b8; }
                .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .modalFooter { padding-top: 20px; margin-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; }
                .btnGhost { background: transparent; color: #64748b; font-weight: 600; border: none; padding: 10px 20px; border-radius: 12px; cursor: pointer; transition: 0.2s; }
                .btnGhost:hover { background: #f1f5f9; color: #334155; }
            `}</style>
        </div>
    );
}

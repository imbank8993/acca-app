'use client';

import { useState, useEffect, useMemo } from 'react';
import { getCurrentAcademicYear } from '@/lib/date-utils';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

interface TabJTMProps {
    user?: any;
}

interface JPMapel {
    id?: number;
    nama_mapel: string;
    tingkat_kelas: string;
    tahun_ajaran: string;
    semester: string;
    jumlah_jp: number;
    jp_intra: number;
    jp_ko: number;
    aktif?: boolean;
}

export default function TabJTM({ user }: TabJTMProps) {
    const [list, setList] = useState<JPMapel[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Filters
    const [filterTahunAjaran, setFilterTahunAjaran] = useState(getCurrentAcademicYear());
    const [filterSemester, setFilterSemester] = useState('Semua');

    // UI state
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [editId, setEditId] = useState<number | null>(null);

    // Form states
    const [namaMapel, setNamaMapel] = useState('');
    const [tingkatKelas, setTingkatKelas] = useState('X');
    const [tahunAjaran, setTahunAjaran] = useState(getCurrentAcademicYear());
    const [semester, setSemester] = useState('Ganjil');
    const [jpIntra, setJpIntra] = useState<number | ''>('');
    const [jpKo, setJpKo] = useState<number | ''>(0);

    // Master data
    const [masterMapel, setMasterMapel] = useState<any[]>([]);

    useEffect(() => {
        fetchMasterMapel();
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [searchTerm, filterTahunAjaran, filterSemester]);

    const fetchMasterMapel = async () => {
        try {
            const res = await fetch('/api/master/mapel?limit=500');
            const result = await res.json();
            if (result.ok) setMasterMapel(result.data);
        } catch (error) {
            console.error('Failed to load mapel', error);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                q: searchTerm,
                tahun_ajaran: filterTahunAjaran,
                semester: filterSemester
            });
            const res = await fetch(`/api/master/jp-mapel?${params}`);
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
        if (!namaMapel || !tingkatKelas || !tahunAjaran || !semester || jpIntra === '') {
            Swal.fire('Error', 'Semua field wajib diisi!', 'error');
            return;
        }

        setSaving(true);
        try {
            const res = await fetch('/api/master/jp-mapel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editId,
                    nama_mapel: namaMapel,
                    tingkat_kelas: tingkatKelas,
                    tahun_ajaran: tahunAjaran,
                    semester,
                    jp_intra: Number(jpIntra),
                    jp_ko: Number(jpKo)
                })
            });
            const result = await res.json();

            if (result.ok) {
                Swal.fire('Berhasil', 'Data JP berhasil disimpan', 'success');
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
            text: 'Data ekuivalensi JP ini akan dihapus permanen!',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/master/jp-mapel?id=${id}`, { method: 'DELETE' });
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
                nama_mapel: 'Matematika',
                tingkat_kelas: 'X',
                tahun_ajaran: filterTahunAjaran === 'Semua' ? getCurrentAcademicYear() : filterTahunAjaran,
                semester: 'Semua', // Menggunakan 'Semua' agar otomatis Ganjil & Genap
                jp_intra: 3,
                jp_ko: 1
            },
            {
                nama_mapel: 'Bahasa Indonesia',
                tingkat_kelas: 'XI',
                tahun_ajaran: filterTahunAjaran === 'Semua' ? getCurrentAcademicYear() : filterTahunAjaran,
                semester: 'Semua',
                jp_intra: 4,
                jp_ko: 0
            }
        ]);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Template JP Mapel');
        XLSX.writeFile(workbook, 'Template_Import_JP_Mapel.xlsx');
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

                // Tampilkan loading swal
                Swal.fire({
                    title: 'Memproses...',
                    text: 'Sedang mengimpor data JP Mapel.',
                    allowOutsideClick: false,
                    didOpen: () => {
                        Swal.showLoading();
                    }
                });

                const res = await fetch('/api/master/jp-mapel', {
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
        // Reset file input
        e.target.value = '';
    };

    const openEdit = (item: JPMapel) => {
        setEditId(item.id!);
        setNamaMapel(item.nama_mapel);
        setTingkatKelas(item.tingkat_kelas);
        setTahunAjaran(item.tahun_ajaran);
        setSemester(item.semester);
        setJpIntra(item.jp_intra || 0);
        setJpKo(item.jp_ko || 0);
        setShowModal(true);
    };

    const openAdd = () => {
        setEditId(null);
        setNamaMapel('');
        setTingkatKelas('X');
        setTahunAjaran(filterTahunAjaran === 'Semua' ? getCurrentAcademicYear() : filterTahunAjaran);
        setSemester('Semua');
        setJpIntra('');
        setJpKo(0);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
    };

    // Calculate totals or summaries if needed
    const mapelGrouped = useMemo(() => {
        const map = new Map<string, JPMapel[]>();
        list.forEach(item => {
            const key = item.tingkat_kelas;
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(item);
        });
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    }, [list]);

    return (
        <div className="tabContent">
            {/* Toolbar */}
            <div className="toolbar">
                <div className="filters">
                    <div className="searchBox">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Cari mata pelajaran..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select value={filterTahunAjaran} onChange={e => setFilterTahunAjaran(e.target.value)} className="filterSelect">
                        <option value="Semua">Semua Tahun</option>
                        <option value="2024/2025">2024/2025</option>
                        <option value="2025/2026">2025/2026</option>
                        <option value="2026/2027">2026/2027</option>
                    </select>
                    <select value={filterSemester} onChange={e => setFilterSemester(e.target.value)} className="filterSelect">
                        <option value="Semua">Semua Smt</option>
                        <option value="Ganjil">Ganjil</option>
                        <option value="Genap">Genap</option>
                    </select>
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
                        <i className="bi bi-plus-lg"></i> Tambah JP Mapel
                    </button>
                </div>
            </div>

            {/* Content Display */}
            <div className="dataContainer">
                {loading ? (
                    <div className="emptyState">Memuat data...</div>
                ) : list.length === 0 ? (
                    <div className="emptyState">Belum ada data setingan JP untuk pencarian ini.</div>
                ) : (
                    <div className="grid">
                        {mapelGrouped.map(([kelas, items]) => (
                            <div key={kelas} className="kelasCard">
                                <div className="kelasCardHead">
                                    <h3 className="kelasTitle">Kelas {kelas}</h3>
                                    <span className="kelasCount">{items.length} mapel</span>
                                </div>
                                <div className="kelasBody">
                                    {items.map(item => (
                                        <div key={item.id} className="mapelItem">
                                            <div className="mapelInfo">
                                                <div className="mapelName">{item.nama_mapel}</div>
                                                <div className="mapelMeta">
                                                    {item.tahun_ajaran} • S-{item.semester}
                                                </div>
                                            </div>
                                            <div className="mapelRight">
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                                    <div className="jpBadge">{item.jumlah_jp} JP (Total)</div>
                                                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Intra: {item.jp_intra} | Ko: {item.jp_ko}</span>
                                                </div>
                                                <div className="actions">
                                                    <button onClick={() => openEdit(item)} className="iconBtn" title="Edit"><i className="bi bi-pencil"></i></button>
                                                    <button onClick={() => handleDelete(item.id!)} className="iconBtn danger" title="Hapus"><i className="bi bi-trash"></i></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modalOverlay" onClick={closeModal}>
                    <div className="modalContent" onClick={e => e.stopPropagation()}>
                        <div className="modalHeader">
                            <h2>{editId ? 'Edit JP Mapel' : 'Tambah JP Mapel'}</h2>
                            <button onClick={closeModal}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <form onSubmit={handleSave} className="modalBody">
                            <div className="formGroup">
                                <label>Mata Pelajaran</label>
                                <select value={namaMapel} onChange={e => setNamaMapel(e.target.value)} required>
                                    <option value="">-- Pilih Mapel --</option>
                                    {masterMapel.map(m => (
                                        <option key={m.id} value={m.nama}>{m.nama}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid2">
                                <div className="formGroup">
                                    <label>Tingkat Kelas</label>
                                    <select value={tingkatKelas} onChange={e => setTingkatKelas(e.target.value)} required>
                                        <option value="X">Kelas X / Fase E</option>
                                        <option value="XI">Kelas XI / Fase F</option>
                                        <option value="XII">Kelas XII / Fase F</option>
                                        <option value="VII">Kelas VII</option>
                                        <option value="VIII">Kelas VIII</option>
                                        <option value="IX">Kelas IX</option>
                                    </select>
                                </div>
                                <div className="grid2">
                                    <div className="formGroup">
                                        <label>Intrakurikuler</label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={jpIntra}
                                            onChange={e => setJpIntra(e.target.value !== '' ? Number(e.target.value) : '')}
                                            placeholder="Misal: 4"
                                            required
                                        />
                                    </div>
                                    <div className="formGroup">
                                        <label>Kokurikuler</label>
                                        <input
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={jpKo}
                                            onChange={e => setJpKo(e.target.value !== '' ? Number(e.target.value) : '')}
                                            placeholder="Misal: 1"
                                        />
                                    </div>
                                </div>
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
                                        {!editId && <option value="Semua">Semua (Ganjil & Genap)</option>}
                                        <option value="Ganjil">Ganjil</option>
                                        <option value="Genap">Genap</option>
                                    </select>
                                </div>
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
                /* Shared Minimal UI Styles for Tabs */
                .tabContent {
                    animation: fadeIn 0.3s ease;
                }
                .toolbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    gap: 16px;
                    flex-wrap: wrap;
                }
                .filters {
                    display: flex;
                    gap: 12px;
                    flex-wrap: wrap;
                }
                .searchBox {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    background: white;
                    border: 1px solid #e2e8f0;
                    padding: 8px 16px;
                    border-radius: 12px;
                    min-width: 250px;
                }
                .searchBox input {
                    border: none;
                    outline: none;
                    width: 100%;
                    font-size: 0.9rem;
                }
                .searchBox i { color: #94a3b8; }
                .filterSelect {
                    background: white;
                    border: 1px solid #e2e8f0;
                    padding: 8px 16px;
                    border-radius: 12px;
                    font-size: 0.9rem;
                    outline: none;
                }
                .btnPrimary {
                    background: #0ea5e9;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 12px;
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    cursor: pointer;
                    transition: 0.2s;
                }
                .btnPrimary:hover { background: #0284c7; }
                .btnPrimary:disabled { opacity: 0.5; cursor: not-allowed; }
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
                
                .grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
                    gap: 20px;
                }
                .kelasCard {
                    background: white;
                    border-radius: 16px;
                    border: 1px solid #e2e8f0;
                    overflow: hidden;
                    box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
                }
                .kelasCardHead {
                    padding: 16px 20px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .kelasTitle { margin: 0; font-size: 1.1rem; font-weight: 700; color: #0f172a; }
                .kelasCount { font-size: 0.8rem; color: #64748b; font-weight: 600; background: #e2e8f0; padding: 4px 10px; border-radius: 20px; }
                .kelasBody {
                    padding: 12px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .mapelItem {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px;
                    background: #fafafa;
                    border-radius: 12px;
                    border: 1px solid #f1f5f9;
                    transition: 0.2s;
                }
                .mapelItem:hover {
                    background: #f1f5f9;
                    border-color: #e2e8f0;
                }
                .mapelName { font-weight: 600; font-size: 0.95rem; color: #334155; }
                .mapelMeta { font-size: 0.75rem; color: #94a3b8; margin-top: 4px; }
                .mapelRight { display: flex; align-items: center; gap: 12px; }
                .jpBadge {
                    background: #dcfce7;
                    color: #166534;
                    font-weight: 700;
                    font-size: 0.85rem;
                    padding: 6px 12px;
                    border-radius: 8px;
                }
                .actions { display: flex; gap: 4px; }
                .iconBtn {
                    width: 32px; height: 32px;
                    border-radius: 8px; border: none;
                    background: white; color: #64748b;
                    cursor: pointer; transition: 0.2s;
                    display: flex; align-items: center; justify-content: center;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                }
                .iconBtn:hover { background: #f1f5f9; color: #0ea5e9; }
                .iconBtn.danger:hover { background: #fee2e2; color: #ef4444; }

                .emptyState { padding: 40px; text-align: center; color: #94a3b8; font-style: italic; background: white; border-radius: 16px; border: 1px dashed #cbd5e1; }

                /* Modal Specific */
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
                .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
                .modalFooter { padding-top: 20px; margin-top: 8px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; }
                .btnGhost { background: transparent; color: #64748b; font-weight: 600; border: none; padding: 10px 20px; border-radius: 12px; cursor: pointer; transition: 0.2s; }
                .btnGhost:hover { background: #f1f5f9; color: #334155; }
            `}</style>
        </div>
    );
}

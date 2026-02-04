'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';

interface TahunAjaran {
    id: number;
    tahun_ajaran: string;
    semester: string;
    is_active: boolean;
    created_at: string;
}

import { hasPermission } from '@/lib/permissions-client'

export default function TahunAjaranTab({ user }: { user?: any }) {
    const [list, setList] = useState<TahunAjaran[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newTahun, setNewTahun] = useState('');
    const [newSemester, setNewSemester] = useState('Ganjil');
    const [saving, setSaving] = useState(false);

    // Permissions Check
    const permissions = user?.permissions || []
    const isAdmin = user?.roles?.some((r: string) => r.toUpperCase() === 'ADMIN') || false

    const canView = hasPermission(permissions, 'master.tahun_ajaran', 'view', isAdmin)
    const canManage = hasPermission(permissions, 'master.tahun_ajaran', 'manage', isAdmin)

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/tahun-ajaran');
            const json = await res.json();
            if (json.ok) setList(json.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = async (item: TahunAjaran) => {
        const newValue = !item.is_active;
        if (!newValue) {
            const activeCount = list.filter(l => l.is_active).length;
            if (activeCount <= 1) {
                Swal.fire('Info', 'Minimal harus ada satu Tahun Ajaran yang aktif.', 'info');
                return;
            }
        }

        try {
            const res = await fetch('/api/admin/tahun-ajaran', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: item.id, is_active: newValue })
            });
            const json = await res.json();
            if (json.ok) {
                fetchData();
            } else {
                Swal.fire('Gagal', json.error, 'error');
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTahun) return;

        setSaving(true);
        try {
            const res = await fetch('/api/admin/tahun-ajaran', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tahun_ajaran: newTahun, semester: newSemester })
            });
            const json = await res.json();
            if (json.ok) {
                setNewTahun('');
                setNewSemester('Ganjil');
                setShowModal(false);
                fetchData();
                Swal.fire({ icon: 'success', title: 'Berhasil', timer: 1500, showConfirmButton: false });
            } else {
                Swal.fire('Gagal', json.error, 'error');
            }
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        const result = await Swal.fire({
            title: 'Hapus Tahun Ajaran?',
            text: "Data yang sudah dihapus tidak dapat dikembalikan!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Ya, Hapus!'
        });

        if (result.isConfirmed) {
            try {
                const res = await fetch(`/api/admin/tahun-ajaran?id=${id}`, { method: 'DELETE' });
                const json = await res.json();
                if (json.ok) {
                    fetchData();
                    Swal.fire('Terhapus!', 'Data berhasil dihapus.', 'success');
                } else {
                    Swal.fire('Gagal', json.error, 'error');
                }
            } catch (err) {
                console.error(err);
            }
        }
    };

    return (
        <div className="ta">
            <div className="ta__header">
                <div className="ta__info">
                    <h3>Pengaturan Tahun Ajaran</h3>
                    <p>Kelola daftar tahun ajaran dan pilih yang aktif untuk sistem.</p>
                </div>
                {canManage && (
                    <button className="ta__addBtn" onClick={() => setShowModal(true)}>
                        <i className="bi bi-plus-lg"></i> Tambah Tahun
                    </button>
                )}
            </div>

            <div className="ta__tableWrap">
                <table className="ta__table">
                    <thead>
                        <tr>
                            <th style={{ width: '60px' }}>No</th>
                            <th>Tahun Ajaran</th>
                            <th>Semester</th>
                            <th style={{ width: '200px' }}>Status</th>
                            {canManage && <th style={{ width: '100px' }}>Aksi</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {!canView ? (
                            <tr><td colSpan={5} className="ta__empty">Anda tidak memiliki akses untuk melihat data ini.</td></tr>
                        ) : loading ? (
                            <tr><td colSpan={5} className="ta__empty">Memuat data...</td></tr>
                        ) : list.length === 0 ? (
                            <tr><td colSpan={5} className="ta__empty">Belum ada data tahun ajaran.</td></tr>
                        ) : (
                            list.map((item, idx) => (
                                <tr key={item.id}>
                                    <td data-label="No" className="tCenter">{idx + 1}</td>
                                    <td data-label="Tahun Ajaran" className="ta__name">{item.tahun_ajaran}</td>
                                    <td data-label="Semester"><span className={`badge-semester ${item.semester.toLowerCase()}`}>{item.semester}</span></td>
                                    <td data-label="Status">
                                        <div className="ta__status">
                                            <div
                                                className={`ta__toggle ${item.is_active ? 'isActive' : ''} ${!canManage ? 'isReadOnly' : ''}`}
                                                onClick={() => canManage && handleToggle(item)}
                                            >
                                                <div className="ta__toggleDot"></div>
                                            </div>
                                            <span className={item.is_active ? 'text-blue-600 font-bold' : 'text-slate-400'}>
                                                {item.is_active ? 'AKTIF' : 'NONAKTIF'}
                                            </span>
                                        </div>
                                    </td>
                                    {canManage && (
                                        <td data-label="Aksi">
                                            <button className="ta__delBtn" onClick={() => handleDelete(item.id)}>
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal Tambah */}
            {
                showModal && (
                    <div className="ta__modalOverlay">
                        <div className="ta__modal">
                            <div className="ta__modalHead">
                                <h4>Tambah Tahun Ajaran</h4>
                                <button onClick={() => setShowModal(false)}><i className="bi bi-x-lg"></i></button>
                            </div>
                            <form onSubmit={handleAdd}>
                                <div className="ta__modalBody">
                                    <div className="ta__field">
                                        <label>Tahun Ajaran</label>
                                        <input
                                            type="text"
                                            placeholder="Contoh: 2025/2026"
                                            value={newTahun}
                                            onChange={e => setNewTahun(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                        <p className="ta__hint">Gunakan format YYYY/YYYY (contoh: 2025/2026)</p>
                                    </div>
                                    <div className="ta__field mt-4">
                                        <label>Semester</label>
                                        <select
                                            value={newSemester}
                                            onChange={e => setNewSemester(e.target.value)}
                                            required
                                        >
                                            <option value="Ganjil">Ganjil</option>
                                            <option value="Genap">Genap</option>
                                            <option value="Semua">Semua</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="ta__modalFoot">
                                    <button type="button" className="ta__btnCancel" onClick={() => setShowModal(false)}>Batal</button>
                                    <button type="submit" className="ta__btnSave" disabled={saving || !newTahun}>
                                        {saving ? 'Menyimpan...' : 'Simpan Tahun'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div >
                )
            }

            <style jsx>{`
                .ta { display: flex; flex-direction: column; gap: 20px; animation: fadeIn 0.3s ease-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }

                .ta__header { display: flex; justify-content: space-between; align-items: center; background: transparent; padding: 0 0 10px 0; border: none; }
                .ta__info h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #1e3a8a; }
                .ta__info p { margin: 4px 0 0; font-size: 0.85rem; color: #64748b; }

                .ta__addBtn { 
                    padding: 8px 16px; background: #1e40af; color: white; border: none; 
                    border-radius: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; gap: 8px;
                    transition: all 0.2s; box-shadow: 0 4px 12px rgba(30, 64, 175, 0.2); font-size: 0.85rem;
                }
                .ta__addBtn:hover { transform: translateY(-2px); background: #1e3a8a; }

                .ta__tableWrap { background: white; border-radius: 20px; border: 1px solid #e2e8f0; overflow: hidden; }
                .ta__table { width: 100%; border-collapse: collapse; }
                .ta__table th { padding: 12px 16px; text-align: left; background: #f8fafc; color: #475569; font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
                .ta__table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155; font-size: 0.82rem; }
                .ta__table tr:last-child td { border-bottom: none; }
                
                .tCenter { text-align: center; }
                .ta__name { font-weight: 700; color: #1e293b; font-size: 0.88rem; }
                
                .badge-semester { padding: 3px 8px; border-radius: 6px; font-size: 0.7rem; font-weight: 700; }
                .badge-semester.ganjil { background: #eff6ff; color: #1e40af; }
                .badge-semester.genap { background: #f0fdf4; color: #166534; }
                .badge-semester.semua { background: #f5f3ff; color: #5b21b6; }
 
                .ta__status { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; }
                .ta__toggle { 
                    width: 36px; height: 18px; background: #e2e8f0; border-radius: 20px; position: relative; cursor: pointer; 
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .ta__toggle.isActive { background: #3b82f6; }
                .ta__toggle.isReadOnly { cursor: default; opacity: 0.8; }
                .ta__toggleDot { 
                    width: 14px; height: 14px; background: white; border-radius: 50%; position: absolute; 
                    top: 2px; left: 2px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .ta__toggle.isActive .ta__toggleDot { transform: translateX(18px); }
                
                .ta__delBtn { 
                    width: 32px; height: 32px; border-radius: 8px; border: 1px solid #fee2e2; background: #fef2f2; 
                    color: #ef4444; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s;
                }
                .ta__delBtn:hover { background: #fee2e2; transform: scale(1.05); }

                @media (max-width: 768px) {
                    .ta__table thead { display: none; }
                    .ta__table, .ta__table tbody, .ta__table tr, .ta__table td { display: block; width: 100%; }
                    .ta__table tr { border-bottom: 8px solid #f8fafc; padding: 12px 0; }
                    .ta__table td { border: none; padding: 6px 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
                    .ta__table td::before { content: attr(data-label); font-weight: 700; font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; min-width: 90px; }
                    .ta__status { justify-content: flex-end; }
                }

                .ta__empty { padding: 40px; text-align: center; color: #94a3b8; font-style: italic; }

                /* Modal Styles */
                .ta__modalOverlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(4px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
                .ta__modal { background: white; width: 100%; max-width: 400px; border-radius: 20px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25); overflow: hidden; animation: zoomIn 0.2s ease-out; }
                @keyframes zoomIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }

                .ta__modalHead { padding: 20px 24px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
                .ta__modalHead h4 { margin: 0; font-weight: 800; color: #0f172a; }
                .ta__modalHead button { background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.1rem; }

                .ta__modalBody { padding: 24px; }
                .ta__field { display: flex; flex-direction: column; gap: 8px; }
                .ta__field label { font-size: 0.75rem; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
                .ta__field input, .ta__field select { padding: 12px 16px; border: 2px solid #e2e8f0; border-radius: 12px; font-size: 1rem; font-weight: 600; outline: none; transition: border-color 0.2s; background: white; }
                .ta__field input:focus, .ta__field select:focus { border-color: #3b82f6; }
                .ta__hint { font-size: 0.75rem; color: #94a3b8; margin: 0; }

                .ta__modalFoot { padding: 16px 24px; background: #f8fafc; display: flex; gap: 12px; }
                .ta__btnCancel { flex: 1; padding: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; font-weight: 700; color: #64748b; cursor: pointer; }
                .ta__btnSave { flex: 2; padding: 12px; background: #1e40af; border: none; border-radius: 12px; font-weight: 700; color: white; cursor: pointer; }
                .ta__btnSave:disabled { opacity: 0.6; cursor: not-allowed; }

                @media (max-width: 640px) {
                    .ta__header { flex-direction: column; align-items: flex-start; gap: 16px; }
                    .ta__addBtn { width: 100%; justify-content: center; }
                    .ta__status span { display: none; }
                }
            `}</style>
        </div >
    );
}

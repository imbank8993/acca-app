'use client';

import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { exportToExcel } from '@/lib/excel-utils';
import ImportModal from '@/components/ui/ImportModal';

interface MasterTugas {
    id: number;
    nama_tugas: string;
    tahun_ajaran: string;
    semester: string | number;
    aktif: boolean;
}

export default function TugasTambahanTab({ user }: { user?: any }) {
    const [dataList, setDataList] = useState<MasterTugas[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingItem, setEditingItem] = useState<MasterTugas | null>(null);

    // Form inputs
    const [namaTugas, setNamaTugas] = useState('');
    const [tahunAjaran, setTahunAjaran] = useState('');
    const [semester, setSemester] = useState<string | number>('Ganjil');
    const [isActive, setIsActive] = useState(true);
    const [academicYears, setAcademicYears] = useState<string[]>([]);

    // Filter
    const [searchTerm, setSearchTerm] = useState('');

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
                const uniqueYears = Array.from(new Set(periods.map((p: any) => p.tahun_ajaran)));
                setAcademicYears(uniqueYears as string[]);

                if (!tahunAjaran) {
                    if (defaultSettings) {
                        setTahunAjaran(defaultSettings.tahun_ajaran);
                    } else {
                        setTahunAjaran(periods[0].tahun_ajaran);
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching AY', err);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/master/tugas-tambahan');
            const json = await res.json();
            if (json.ok) {
                setDataList(json.data);
            }
        } catch (error) {
            console.error('Failed load master tugas', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!namaTugas || !tahunAjaran || !semester) {
            Swal.fire('Error', 'Mohon lengkapi semua field wajib', 'error');
            return;
        }

        const payload = {
            id: editingItem?.id,
            nama_tugas: namaTugas,
            tahun_ajaran: tahunAjaran,
            semester,
            aktif: isActive
        };

        try {
            const res = await fetch('/api/master/tugas-tambahan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();

            if (result.ok) {
                Swal.fire('Sukses', 'Data berhasil disimpan', 'success');
                setShowModal(false);
                resetForm();
                loadData();
            } else {
                throw new Error(result.error);
            }
        } catch (err: any) {
            Swal.fire('Error', err.message, 'error');
        }
    };

    const handleDelete = async (id: number) => {
        const confirm = await Swal.fire({
            title: 'Hapus Data?',
            text: 'Data tugas ini akan dihapus permanen.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Ya, Hapus'
        });

        if (confirm.isConfirmed) {
            try {
                await fetch(`/api/master/tugas-tambahan?id=${id}`, { method: 'DELETE' });
                loadData();
                Swal.fire('Terhapus', 'Data telah dihapus', 'success');
            } catch (err) {
                Swal.fire('Error', 'Gagal menghapus data', 'error');
            }
        }
    };

    const resetForm = () => {
        setEditingItem(null);
        setNamaTugas('');
        setIsActive(true);
    };

    const openEdit = (item: MasterTugas) => {
        setEditingItem(item);
        setNamaTugas(item.nama_tugas);
        setTahunAjaran(item.tahun_ajaran);
        setSemester(item.semester);
        setIsActive(item.aktif);
        setShowModal(true);
    };

    const filtered = dataList.filter(x =>
        x.nama_tugas.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        const dataToExport = filtered.map((item, index) => ({
            'No': index + 1,
            'Nama Tugas': item.nama_tugas,
            'Tahun Ajaran': item.tahun_ajaran,
            'Semester': item.semester,
            'Status': item.aktif ? 'Aktif' : 'Non-Aktif'
        }));
        exportToExcel(dataToExport, 'Master_Tugas_Tambahan', 'MasterTugas');
    };

    const mapImportRow = (row: any) => {
        const getVal = (targetKeys: string[]) => {
            const normalizedTargets = targetKeys.map(k => k.toLowerCase().trim());
            const foundKey = Object.keys(row).find(k =>
                normalizedTargets.includes(k.toLowerCase().trim())
            );
            if (foundKey) return row[foundKey];
            return undefined;
        };

        const nama = getVal(['Nama Tugas', 'nama', 'Nama']);
        const ta = getVal(['Tahun Ajaran', 'tahun ajaran', 'ta']);
        const sem = getVal(['Semester', 'sem']);
        const status = getVal(['Status', 'aktif']);

        if (!nama || !ta || !sem) return null;

        return {
            nama_tugas: String(nama).trim(),
            tahun_ajaran: String(ta).trim(),
            semester: String(sem).trim(),
            aktif: String(status).toLowerCase() === 'aktif' || String(status).toLowerCase() === 'true'
        };
    };

    return (
        <div className="sk">
            {/* Toolbar */}
            <div className="sk__bar">
                <div className="sk__filters">
                    <div className="sk__search">
                        <i className="bi bi-search" aria-hidden="true" />
                        <input
                            type="text"
                            placeholder="Cari master tugas..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="sk__actions">
                    <button className="sk__btn sk__btnImport" onClick={() => setShowImportModal(true)}>
                        <i className="bi bi-upload"></i> <span>Import</span>
                    </button>

                    <button className="sk__btn sk__btnExport" onClick={handleExport}>
                        <i className="bi bi-download"></i> <span>Export</span>
                    </button>

                    <button className="sk__btn sk__btnPrimary" onClick={() => { resetForm(); setShowModal(true); }}>
                        <i className="bi bi-plus-lg"></i> <span>Tambah</span>
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="sk__tableWrap">
                <table className="sk__table">
                    <thead>
                        <tr>
                            <th className="cNo">No</th>
                            <th>Nama Tugas Tambahan</th>
                            <th>Periode Berlaku</th>
                            <th className="cStatus">Status</th>
                            <th className="cAksi">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} className="sk__empty">Memuat data...</td></tr>
                        ) : filtered.length === 0 ? (
                            <tr><td colSpan={5} className="sk__empty sk__muted">Belum ada data master tugas.</td></tr>
                        ) : (
                            filtered.map((item, idx) => (
                                <tr key={item.id}>
                                    <td className="tCenter">{idx + 1}</td>
                                    <td className="tPlain font-medium">{item.nama_tugas}</td>
                                    <td className="text-slate-600">
                                        <span className="sk__kelompokBadge">
                                            {item.tahun_ajaran}
                                        </span>
                                        <span className={`ml-2 text-xs font-semibold ${String(item.semester).toLowerCase().includes('1') || String(item.semester).toLowerCase() === 'ganjil' ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                            {String(item.semester)}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`sk__status ${item.aktif ? 'isOn' : 'isOff'}`}>
                                            {item.aktif ? 'Aktif' : 'Non-Aktif'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="sk__rowActions" style={{ justifyContent: 'flex-end', display: 'flex', gap: '6px' }}>
                                            <button
                                                onClick={() => openEdit(item)}
                                                className="sk__iconBtn"
                                                title="Edit"
                                            >
                                                <i className="bi bi-pencil"></i>
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="sk__iconBtn danger"
                                                title="Hapus"
                                            >
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

            {/* Mobile Cards (Optional structure for better mobile view) */}
            <div className="sk__cards">
                {filtered.map((item, idx) => (
                    <div className="sk__card" key={item.id}>
                        <div className="sk__cardHead">
                            <div className="sk__cardTitle">
                                <div className="sk__cardName">{item.nama_tugas}</div>
                                <div className="sk__cardSub">{item.tahun_ajaran} - {item.semester}</div>
                            </div>
                        </div>
                        <div className="sk__cardBody">
                            <div className="sk__statusRow" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span className={`sk__status ${item.aktif ? 'isOn' : 'isOff'}`}>
                                    {item.aktif ? 'Aktif' : 'Non-Aktif'}
                                </span>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button onClick={() => openEdit(item)} className="sk__iconBtn"><i className="bi bi-pencil"></i></button>
                                    <button onClick={() => handleDelete(item.id)} className="sk__iconBtn danger"><i className="bi bi-trash"></i></button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="sk__modalOverlay">
                    <div className="sk__modal">
                        <div className="sk__modalHead">
                            <div className="sk__modalTitle">
                                <h2>{editingItem ? 'Edit Master Tugas' : 'Tambah Master Tugas'}</h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="sk__close">
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <form onSubmit={handleSave}>
                            <div className="sk__modalBody">
                                <div className="sk__field">
                                    <label>Nama Tugas Tambahan <span className="required">*</span></label>
                                    <input
                                        type="text"
                                        placeholder="Contoh: Wali Kelas"
                                        value={namaTugas}
                                        onChange={e => setNamaTugas(e.target.value)}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <div className="sk__field">
                                        <label>Tahun Ajaran</label>
                                        <select
                                            value={tahunAjaran}
                                            onChange={e => setTahunAjaran(e.target.value)}
                                        >
                                            {academicYears.map(y => (
                                                <option key={y} value={y}>{y}</option>
                                            ))}
                                            {!academicYears.includes(tahunAjaran) && <option value={tahunAjaran}>{tahunAjaran}</option>}
                                        </select>
                                    </div>
                                    <div className="sk__field">
                                        <label>Semester</label>
                                        <select
                                            value={semester}
                                            onChange={e => setSemester(e.target.value)}
                                        >
                                            <option value="Semua">Semua</option>
                                            <option value="Ganjil">Ganjil</option>
                                            <option value="Genap">Genap</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="sk__field" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
                                    <label style={{ margin: 0 }}>Status Aktif</label>
                                    <input
                                        type="checkbox"
                                        checked={isActive}
                                        onChange={e => setIsActive(e.target.checked)}
                                        style={{ width: 'auto', margin: 0 }}
                                    />
                                </div>
                            </div>

                            <div className="sk__modalFoot">
                                <button type="button" className="sk__btn sk__btnGhost" onClick={() => setShowModal(false)}>Batal</button>
                                <button type="submit" className="sk__btn sk__btnPrimary">Simpan</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportSuccess={() => {
                    loadData();
                    setShowImportModal(false);
                }}
                templateColumns={['Nama Tugas', 'Tahun Ajaran', 'Semester', 'Status']}
                templateName="Template_Master_Tugas"
                apiEndpoint="/api/master/tugas-tambahan"
                mapRowData={mapImportRow}
            />

            <style jsx>{`
            :global(:root) {
              --sk-line: rgba(148, 163, 184, 0.22);
              --sk-card: rgba(255, 255, 255, 0.92);
            
              --sk-shadow: 0 14px 34px rgba(2, 6, 23, 0.08);
              --sk-shadow2: 0 10px 22px rgba(2, 6, 23, 0.08);
            
              --sk-radius: 16px;
            
              --sk-fs: 0.88rem;
              --sk-fs-sm: 0.82rem;
              --sk-fs-xs: 0.78rem;
            
              --sk-safe-b: env(safe-area-inset-bottom, 0px);
              --sk-safe-t: env(safe-area-inset-top, 0px);
            }
            
            .sk {
              width: 100%;
              min-width: 0;
              display: flex;
              flex-direction: column;
              gap: 10px;
              font-size: var(--sk-fs);
              padding: 0;
              background: transparent;
              border-radius: 0;
              padding-bottom: calc(16px + var(--sk-safe-b));
            }
            
            /* ========= TOOLBAR ========= */
            .sk__bar {
              display: flex;
              align-items: center;
              justify-content: space-between;
              gap: 10px;
              flex-wrap: wrap;
              width: 100%;
              min-width: 0;
            }
            
            .sk__filters {
              flex: 1 1 auto;
              min-width: 0;
              display: flex;
              align-items: center;
              gap: 8px;
              flex-wrap: wrap;
              padding: 8px;
              border-radius: var(--sk-radius);
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid var(--sk-line);
              box-shadow: var(--sk-shadow2);
            }
            
            .sk__search {
              position: relative;
              flex: 1 1 280px;
              min-width: 180px;
            }
            
            .sk__search i {
              position: absolute;
              left: 10px;
              top: 50%;
              transform: translateY(-50%);
              color: rgba(100, 116, 139, 0.9);
              pointer-events: none;
              font-size: 0.9rem;
            }
            
            .sk__search input {
              width: 100%;
              padding: 8px 10px 8px 30px;
              border: 1px solid rgba(148, 163, 184, 0.35);
              border-radius: 12px;
              background: rgba(255, 255, 255, 0.05);
              font-weight: 500;
              color: rgba(15, 23, 42, 0.92);
              outline: none;
              font-size: var(--sk-fs-sm);
              transition: box-shadow 0.15s ease, border-color 0.15s ease;
            }
            
            .sk__search input:focus {
              border-color: rgba(58, 166, 255, 0.55);
              box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
            }
            
            .sk__actions {
              display: flex;
              align-items: center;
              gap: 8px;
              flex: 0 0 auto;
            }
            
            .sk__btn {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              height: 38px;
              padding: 8px 10px;
              border-radius: 12px;
              border: 1px solid var(--sk-line);
              background: rgba(255, 255, 255, 0.78);
              color: rgba(7, 22, 46, 0.9);
              font-weight: 600;
              font-size: var(--sk-fs-sm);
              cursor: pointer;
              transition: transform 0.15s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
              user-select: none;
              -webkit-tap-highlight-color: transparent;
              touch-action: manipulation;
              white-space: nowrap;
            }
            
            .sk__btn i {
              font-size: 1rem;
            }
            
            .sk__btn:hover {
              background: rgba(255, 255, 255, 0.92);
              border-color: rgba(58, 166, 255, 0.24);
              box-shadow: var(--sk-shadow2);
              transform: translateY(-1px);
            }
            
            .sk__btn:active {
              transform: translateY(0);
            }
            
            .sk__btnPrimary {
              background: linear-gradient(135deg, rgba(58, 166, 255, 0.92), rgba(15, 42, 86, 0.92));
              border-color: rgba(58, 166, 255, 0.32);
              color: #fff;
              font-weight: 650;
            }
            
            .sk__btnPrimary:hover {
              background: linear-gradient(135deg, rgba(58, 166, 255, 0.92), rgba(15, 42, 86, 0.92));
              color: #fff;
            }
            
            .sk__btnPrimary:active {
              background: linear-gradient(135deg, rgba(58, 166, 255, 1), rgba(15, 42, 86, 1));
              color: #fff;
            }
            
            .sk__btnExport {
              background: linear-gradient(135deg, rgba(16, 185, 129, 0.92), rgba(15, 42, 86, 0.86));
              border-color: rgba(16, 185, 129, 0.28);
              color: #fff;
            }
            
            .sk__btnExport:hover {
              background: linear-gradient(135deg, rgba(16, 185, 129, 0.92), rgba(15, 42, 86, 0.86));
              color: #fff;
            }
            
            .sk__btnExport:active {
              background: linear-gradient(135deg, rgba(16, 185, 129, 1), rgba(15, 42, 86, 1));
              color: #fff;
            }
            
            .sk__btnImport {
              background: linear-gradient(135deg, rgba(245, 158, 11, 0.92), rgba(15, 42, 86, 0.86));
              border-color: rgba(245, 158, 11, 0.28);
              color: #fff;
            }
            
            .sk__btnImport:hover {
              background: linear-gradient(135deg, rgba(245, 158, 11, 0.92), rgba(15, 42, 86, 0.86));
              color: #fff;
            }
            
            .sk__btnImport:active {
              background: linear-gradient(135deg, rgba(245, 158, 11, 1), rgba(15, 42, 86, 1));
              color: #fff;
            }
            
            .sk__btnGhost {
              background: #fff;
              color: rgba(7, 22, 46, 0.9);
              border: 1px solid var(--sk-line);
            }
            
            /* ========= TABLE ========= */
            .sk__tableWrap {
              width: 100%;
              min-width: 0;
              overflow: auto;
              border-radius: var(--sk-radius);
              border: 1px solid var(--sk-line);
              background: var(--sk-card);
              box-shadow: var(--sk-shadow);
            }
            
            .sk__table {
              width: 100%;
              border-collapse: separate;
              border-spacing: 0;
              min-width: 720px;
            }
            
            .sk__table thead th {
              position: sticky;
              top: 0;
              z-index: 1;
              background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(249, 250, 251, 0.98));
              color: rgba(7, 22, 46, 0.86);
              font-size: var(--sk-fs-xs);
              font-weight: 750;
              letter-spacing: 0.01em;
              text-align: left;
              padding: 10px 10px;
              border-bottom: 1px solid var(--sk-line);
              white-space: nowrap;
            }
            
            .sk__table tbody td {
              padding: 10px 10px;
              border-bottom: 1px solid rgba(148, 163, 184, 0.14);
              color: rgba(15, 23, 42, 0.92);
              font-size: var(--sk-fs-sm);
              font-weight: 400;
              vertical-align: middle;
              background: rgba(255, 255, 255, 0.82);
            }
            
            .sk__table tbody tr:nth-child(even) td {
              background: rgba(248, 250, 252, 0.85);
            }
            
            .sk__table tbody tr:hover td {
              background: rgba(58, 166, 255, 0.055);
            }
            
            .sk__empty {
              text-align: center;
              padding: 18px 10px !important;
              font-weight: 500;
              font-size: var(--sk-fs-sm);
            }
            
            .sk__muted {
              color: rgba(100, 116, 139, 0.9) !important;
              font-weight: 400 !important;
            }
            
            .cNo { width: 56px; }
            .cStatus { width: 110px; }
            .cAksi { width: 110px; text-align: right; }
            
            .tCenter { text-align: center; }
            .tPlain { font-weight: 400; }
            
            .sk__kelompokBadge {
              display: inline-flex;
              align-items: center;
              padding: 5px 8px;
              border-radius: 999px;
              background: rgba(15, 42, 86, 0.08);
              border: 1px solid rgba(15, 42, 86, 0.12);
              color: rgba(7, 22, 46, 0.92);
              font-weight: 500;
              font-size: var(--sk-fs-xs);
              white-space: nowrap;
            }
            
            .sk__status {
              display: inline-flex;
              align-items: center;
              padding: 5px 8px;
              border-radius: 999px;
              font-weight: 500;
              font-size: var(--sk-fs-xs);
            }
            
            .isOn {
              background: rgba(16, 185, 129, 0.1);
              color: rgba(6, 95, 70, 1);
              border: 1px solid rgba(16, 185, 129, 0.2);
            }
            
            .isOff {
              background: rgba(100, 116, 139, 0.1);
              color: rgba(100, 116, 139, 1);
              border: 1px solid rgba(100, 116, 139, 0.2);
            }
            
            /* ========= ACTIONS ========= */
            .sk__iconBtn {
              width: 32px;
              height: 32px;
              display: inline-flex;
              align-items: center;
              justify-content: center;
              border-radius: 8px;
              border: 1px solid transparent;
              background: transparent;
              color: rgba(100, 116, 139, 0.8);
              cursor: pointer;
              transition: all 0.2s ease;
            }
            
            .sk__iconBtn:hover {
              background: rgba(58, 166, 255, 0.1);
              color: rgba(15, 42, 86, 1);
            }
            
            .sk__iconBtn.danger:hover {
              background: rgba(239, 68, 68, 0.1);
              color: rgba(185, 28, 28, 1);
            }
            
            /* ========= CARD (Mobile) ========= */
            .sk__card {
              background: var(--sk-card);
              border: 1px solid var(--sk-line);
              border-radius: var(--sk-radius);
              padding: 12px;
              box-shadow: var(--sk-shadow2);
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            .sk__cardHead {
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .sk__cardTitle {
              display: flex;
              flex-direction: column;
            }
            .sk__cardName {
              font-size: 0.92rem;
              font-weight: 700;
              color: rgba(15, 23, 42, 0.96);
            }
            .sk__cardSub {
              font-size: var(--sk-fs-xs);
              color: rgba(100, 116, 139, 0.85);
            }
            
            /* ========= MODAL ========= */
            .sk__modalOverlay {
              position: fixed;
              top: 0;
              left: 0;
              width: 100vw;
              height: 100vh;
              background: rgba(15, 23, 42, 0.45);
              backdrop-filter: blur(4px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 9999;
              padding: 16px;
            }
            
            .sk__modal {
              width: min(520px, 100%);
              max-height: 90vh;
              overflow-y: auto;
              background: rgba(255, 255, 255, 0.96);
              border: 1px solid rgba(148, 163, 184, 0.22);
              border-radius: 16px;
              box-shadow: 0 28px 80px rgba(2, 6, 23, 0.35);
            }
            
            .sk__modalHead {
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 10px;
              padding: 14px 14px;
              background: linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.96));
              border-bottom: 1px solid rgba(148, 163, 184, 0.18);
            }
            
            .sk__modalTitle h2 {
              margin: 0;
              font-size: 0.98rem;
              font-weight: 750;
              color: rgba(7, 22, 46, 0.96);
            }
            
            .sk__close {
              width: 38px;
              height: 38px;
              border-radius: 12px;
              border: 1px solid rgba(148, 163, 184, 0.22);
              background: rgba(255, 255, 255, 0.9);
              color: rgba(7, 22, 46, 0.92);
              cursor: pointer;
              display: inline-flex;
              align-items: center;
              justify-content: center;
            }
            
            .sk__modalBody {
              padding: 14px;
              display: flex;
              flex-direction: column;
              gap: 10px;
            }
            
            .sk__field {
              display: flex;
              flex-direction: column;
              gap: 6px;
            }
            
            .sk__field label {
              font-size: var(--sk-fs-xs);
              font-weight: 650;
              color: rgba(7, 22, 46, 0.88);
            }
            
            .required {
              color: rgba(220, 38, 38, 1);
              margin-left: 2px;
            }
            
            .sk__field input,
            .sk__field select {
              width: 100%;
              padding: 8px 10px;
              border-radius: 12px;
              border: 1px solid rgba(148, 163, 184, 0.35);
              background: rgba(248, 250, 252, 0.9);
              color: rgba(15, 23, 42, 0.92);
              font-weight: 500;
              outline: none;
              font-size: var(--sk-fs-sm);
            }
            
            .sk__field input:focus,
            .sk__field select:focus {
              border-color: rgba(58, 166, 255, 0.55);
              box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
            }
            
            .sk__modalFoot {
              display: flex;
              justify-content: flex-end;
              gap: 8px;
              padding: 12px 14px;
              border-top: 1px solid rgba(148, 163, 184, 0.18);
              background: rgba(255, 255, 255, 0.92);
            }
            
            /* ========= RESPONSIVE ========= */
            .sk__tableWrap { display: block; }
            .sk__cards { display: none; }
            
            @media (max-width: 768px) {
              .sk__tableWrap { display: none; }
              .sk__cards {
                display: flex;
                flex-direction: column;
                gap: 12px;
              }
            
              .sk {
                padding-bottom: calc(0px + var(--sk-safe-b));
              }
            
              .sk__actions {
                width: 100%;
                display: flex;
                gap: 6px;
                margin-bottom: 12px;
              }
            
              .sk__actions .sk__btn {
                flex: 1;
                height: 40px;
                padding: 9px 8px;
                justify-content: center;
                min-width: 0;
              }
            
              .sk__actions .sk__btn span {
                font-size: 0.75rem;
              }
            
              .sk__modal {
                width: 100%;
                height: 100%;
                max-height: 100%;
                margin: 0;
                border-radius: 0;
                max-width: none;
              }
            
              .sk__modalHead {
                border-radius: 0;
                padding: 16px;
              }
            
              .sk__modalFoot {
                border-radius: 0;
                padding: 16px;
                flex-direction: column-reverse;
                gap: 10px;
              }
            
              .sk__modalFoot button {
                width: 100%;
                justify-content: center;
              }
            }
            
            @media (max-width: 420px) {
              .sk__filters {
                width: 100%;
              }
            }
            `}</style>
        </div>
    );
}

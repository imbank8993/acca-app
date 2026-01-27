'use client';

import { useState, useEffect } from 'react';
import Select from 'react-select';

interface Journal {
    id: number;
    tanggal: string;
    hari: string;
    jam_ke: string;
    jam_ke_id?: number;
    nama_guru: string;
    kelas: string;
    mata_pelajaran: string;
    kategori_kehadiran: string;
    materi?: string;
    refleksi?: string;
    nip: string;
}

interface Filters {
    nip?: string;
    kelas?: string;
    startDate?: string;
    endDate?: string;
    kategori?: string;
    search?: string;
}

interface JurnalTableProps {
    filters?: Filters;
    onRefresh?: () => void;
    permissions?: any[];
    isAdmin?: boolean;
}

export default function JurnalTable({ filters, onRefresh, permissions = [], isAdmin = false }: JurnalTableProps) {
    const { hasPermission } = require('@/lib/permissions-client');

    const canDo = (action: string) => {
        return hasPermission(permissions, 'jurnal', action, isAdmin);
    };
    const [journals, setJournals] = useState<Journal[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
    const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
    const [selectedClass, setSelectedClass] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedJournal, setSelectedJournal] = useState<Journal | null>(null);
    const [showModal, setShowModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editJournal, setEditJournal] = useState<Journal | null>(null);

    useEffect(() => {
        fetchJournals();
    }, [filters]);

    const fetchJournals = async () => {
        setLoading(true);
        setError(null);

        try {
            const queryParams = new URLSearchParams();
            if (filters?.nip) queryParams.append('nip', filters.nip);
            if (filters?.kelas) queryParams.append('kelas', filters.kelas);
            if (filters?.startDate) queryParams.append('startDate', filters.startDate);
            if (filters?.endDate) queryParams.append('endDate', filters.endDate);
            if (filters?.kategori) queryParams.append('kategori', filters.kategori);
            if (filters?.search) queryParams.append('search', filters.search);

            const response = await fetch(`/api/jurnal?${queryParams}`);
            if (!response.ok) throw new Error('Failed to fetch journals');

            const data = await response.json();
            setJournals(data.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Yakin ingin menghapus jurnal ini?')) return;

        try {
            const response = await fetch(`/api/jurnal?id=${id}`, {
                method: 'DELETE'
            });

            if (!response.ok) throw new Error('Failed to delete journal');

            alert('Jurnal berhasil dihapus');
            fetchJournals();
            onRefresh?.();
        } catch (err: any) {
            alert('Gagal menghapus jurnal: ' + err.message);
        }
    };



    const uniqueTeachers = [...new Set(journals.map(j => j.nama_guru))];
    const teacherOptions = uniqueTeachers.map(t => ({ value: t, label: t }));

    const uniqueSubjects = [...new Set(journals.map(j => j.mata_pelajaran))];
    const subjectOptions = uniqueSubjects.map(s => ({ value: s, label: s }));

    const uniqueClasses = [...new Set(journals.map(j => j.kelas))];
    const classOptions = uniqueClasses.map(c => ({ value: c, label: c }));

    const filteredJournals = journals.filter(j => {
        if (selectedTeacher && j.nama_guru !== selectedTeacher) return false;
        if (selectedSubject && j.mata_pelajaran !== selectedSubject) return false;
        if (selectedClass && j.kelas !== selectedClass) return false;
        if (searchTerm && !j.nama_guru.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !j.mata_pelajaran.toLowerCase().includes(searchTerm.toLowerCase()) &&
            !j.kelas.toLowerCase().includes(searchTerm.toLowerCase())) return false;
        return true;
    });

    const getCategoryClass = (kategori: string) => {
        switch (kategori) {
            case 'Sesuai': return 'sk__status isOn';
            case 'Terlambat': return 'sk__status isWarning';
            case 'Diganti': return 'sk__status isInfo';
            default: return 'sk__status isOff';
        }
    };

    return (
        <div className="jt">
            {/* ===== Toolbar ===== */}
            <div className="jt__bar">
                <div className="jt__actions">
                    <button
                        className="jt__btn jt__btnPrimary"
                        onClick={() => window.location.assign('/jurnal/form')}
                        disabled={!canDo('create')}
                    >
                        <i className="bi bi-plus-lg" /> <span>Tambah Jurnal</span>
                    </button>
                </div>
            </div>

            {/* ===== Table (Desktop/Tablet) ===== */}
            <div className="jt__tableWrap">
                <table className="jt__table">
                    <thead>
                        <tr>
                            <th className="cTanggalHari">Tanggal & Hari</th>
                            <th className="cJam">Jam Ke</th>
                            <th className="cGuruMapel">Guru & Mapel</th>
                            <th className="cKelas">Kelas</th>
                            <th className="cKategori">Kategori</th>
                            <th className="cMateri hidden-lg">Materi</th>
                            <th className="cRefleksi hidden-lg">Refleksi</th>
                            <th className="cAksi">Aksi</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={7} className="jt__empty">
                                    <div className="jt__loading">
                                        <div className="jt__spinner"></div>
                                        Memuat data...
                                    </div>
                                </td>
                            </tr>
                        ) : error ? (
                            <tr>
                                <td colSpan={7} className="jt__empty jt__error">
                                    <i className="bi bi-exclamation-triangle-fill" aria-hidden="true" />
                                    Error: {error}
                                </td>
                            </tr>
                        ) : filteredJournals.length === 0 ? (
                            <tr>
                                <td colSpan={7} className="jt__empty jt__muted">
                                    <div className="jt__emptyContent">
                                        <i className="bi bi-journal-x" aria-hidden="true" />
                                        <div>Tidak ada data jurnal</div>
                                        <div className="jt__emptySub">Coba ubah filter atau tambahkan data baru</div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredJournals.map((journal: Journal, index: number) => (
                                <tr key={journal.id}>
                                    <td>
                                        <div className="jt__day">{journal.hari}</div>
                                        <div className="jt__date">{journal.tanggal}</div>
                                    </td>
                                    <td>
                                        <div className="jt__jamMain">{journal.jam_ke}</div>
                                        <div className="jt__jamSub">Jam ke: {journal.jam_ke_id || '-'}</div>
                                    </td>
                                    <td>
                                        <div className="jt__guru">{journal.nama_guru}</div>
                                        <div className="jt__mapel">{journal.mata_pelajaran}</div>
                                    </td>
                                    <td className="jt__kelas">{journal.kelas}</td>
                                    <td>
                                        <span className={getCategoryClass(journal.kategori_kehadiran)}>
                                            {journal.kategori_kehadiran}
                                        </span>
                                    </td>
                                    <td className="jt__materi hidden-lg">
                                        <div className="jt__materiText">{journal.materi || '-'}</div>
                                    </td>
                                    <td className="jt__refleksi hidden-lg">
                                        <div className="jt__refleksiText">{journal.refleksi || '-'}</div>
                                    </td>
                                    <td>
                                        <div className="jt__rowActions">
                                            <button
                                                className="jt__iconBtn"
                                                onClick={() => { setSelectedJournal(journal); setShowModal(true); }}
                                                disabled={!canDo('read')}
                                                title="Lihat Detail"
                                                aria-label={`Lihat detail jurnal for ${journal.nama_guru}`}
                                            >
                                                <i className="bi bi-eye" aria-hidden="true" />
                                            </button>
                                            <button
                                                className="jt__iconBtn"
                                                onClick={() => { setEditJournal(journal); setShowEditModal(true); }}
                                                disabled={!canDo('update')}
                                                title="Edit Jurnal"
                                                aria-label={`Edit jurnal for ${journal.nama_guru} on ${journal.tanggal}`}
                                            >
                                                <i className="bi bi-pencil" aria-hidden="true" />
                                            </button>
                                            <button
                                                className="jt__iconBtn danger"
                                                onClick={() => handleDelete(journal.id)}
                                                disabled={!canDo('delete')}
                                                title="Hapus Jurnal"
                                                aria-label={`Hapus jurnal for ${journal.nama_guru} on ${journal.tanggal}`}
                                            >
                                                <i className="bi bi-trash" aria-hidden="true" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ===== Mobile Cards ===== */}
            <div className="jt__cards" aria-label="Daftar Jurnal versi mobile">
                {loading ? (
                    <div className="jt__card">
                        <div className="jt__cardHead">
                            <div className="jt__cardTitle">
                                <div className="jt__cardName">Memuat data...</div>
                                <div className="jt__cardSub">Mohon tunggu</div>
                            </div>
                        </div>
                    </div>
                ) : error ? (
                    <div className="jt__card jt__cardError">
                        <div className="jt__cardHead">
                            <div className="jt__cardTitle">
                                <div className="jt__cardName">Error</div>
                                <div className="jt__cardSub">{error}</div>
                            </div>
                        </div>
                    </div>
                ) : journals.length === 0 ? (
                    <div className="jt__card">
                        <div className="jt__cardHead">
                            <div className="jt__cardTitle">
                                <div className="jt__cardName">Tidak ada data</div>
                                <div className="jt__cardSub">Belum ada jurnal</div>
                            </div>
                        </div>
                    </div>
                ) : (
                    journals.map((journal: Journal) => (
                        <div className="jt__card" key={`m-${journal.id}`}>
                            <div className="jt__cardHead">
                                <div className="jt__cardTitle">
                                    <div className="jt__cardName">{journal.nama_guru}</div>
                                    <div className="jt__cardSub">{journal.tanggal} • {journal.hari}</div>
                                </div>
                                <div className="jt__cardStatus">
                                    <span className={getCategoryClass(journal.kategori_kehadiran)}>
                                        {journal.kategori_kehadiran}
                                    </span>
                                </div>
                            </div>

                            <div className="jt__cardBody">
                                <div className="jt__kv">
                                    <div className="jt__k">Kelas</div>
                                    <div className="jt__v">{journal.kelas}</div>
                                </div>
                                <div className="jt__kv">
                                    <div className="jt__k">Jam Ke</div>
                                    <div className="jt__v">{journal.jam_ke}</div>
                                </div>
                                <div className="jt__kv">
                                    <div className="jt__k">Mata Pelajaran</div>
                                    <div className="jt__v">{journal.mata_pelajaran}</div>
                                </div>
                                {journal.materi && (
                                    <div className="jt__kv">
                                        <div className="jt__k">Materi</div>
                                        <div className="jt__v">{journal.materi}</div>
                                    </div>
                                )}
                            </div>

                            <div className="jt__cardActions">
                                <button
                                    className="jt__iconBtn"
                                    onClick={() => {
                                        const jamVal = journal.jam_ke_id;
                                        if (!jamVal) {
                                            alert('ID Jam tidak valid.');
                                            return;
                                        }
                                        const params = new URLSearchParams({
                                            nip: journal.nip,
                                            tanggal: journal.tanggal,
                                            jam_ke: jamVal.toString(),
                                            kelas: journal.kelas
                                        });
                                        window.location.assign(`/jurnal/form?${params.toString()}`);
                                    }}
                                    disabled={!canDo('update')}
                                    title="Edit"
                                    aria-label={`Edit jurnal for ${journal.nama_guru}`}
                                >
                                    <i className="bi bi-pencil" aria-hidden="true" />
                                </button>
                                <button
                                    className="jt__iconBtn danger"
                                    onClick={() => handleDelete(journal.id)}
                                    disabled={!canDo('delete')}
                                    title="Hapus"
                                    aria-label={`Hapus jurnal for ${journal.nama_guru}`}
                                >
                                    <i className="bi bi-trash" aria-hidden="true" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* ===== Footer ===== */}
            {journals.length > 0 && (
                <div className="jt__footer">
                    <div className="jt__summary">
                        <i className="bi bi-bar-chart-line-fill" aria-hidden="true" />
                        <span>Total: {journals.length} jurnal</span>
                    </div>
                    <div className="jt__timestamp">
                        Data terakhir diperbarui
                    </div>
                </div>
            )}

            {/* ===== Modal ===== */}
            {showModal && selectedJournal && (
                <div className="jt__modal" onClick={() => setShowModal(false)}>
                    <div className="jt__modalContent" onClick={(e) => e.stopPropagation()}>
                        <div className="jt__modalHeader">
                            <h3>Detail Jurnal</h3>
                            <button className="jt__modalClose" onClick={() => setShowModal(false)}>
                                <i className="bi bi-x-lg" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="jt__modalBody">
                            <div className="jt__detailGrid">
                                <div className="jt__detailItem">
                                    <div className="jt__detailLabel">Tanggal</div>
                                    <div className="jt__detailValue">{selectedJournal.tanggal}</div>
                                </div>
                                <div className="jt__detailItem">
                                    <div className="jt__detailLabel">Hari</div>
                                    <div className="jt__detailValue">{selectedJournal.hari}</div>
                                </div>
                                <div className="jt__detailItem">
                                    <div className="jt__detailLabel">Jam Ke</div>
                                    <div className="jt__detailValue">{selectedJournal.jam_ke} (ID: {selectedJournal.jam_ke_id || '-'})</div>
                                </div>
                                <div className="jt__detailItem">
                                    <div className="jt__detailLabel">Guru</div>
                                    <div className="jt__detailValue">{selectedJournal.nama_guru}</div>
                                </div>
                                <div className="jt__detailItem">
                                    <div className="jt__detailLabel">Kelas</div>
                                    <div className="jt__detailValue">{selectedJournal.kelas}</div>
                                </div>
                                <div className="jt__detailItem">
                                    <div className="jt__detailLabel">Mata Pelajaran</div>
                                    <div className="jt__detailValue">{selectedJournal.mata_pelajaran}</div>
                                </div>
                                <div className="jt__detailItem">
                                    <div className="jt__detailLabel">Kategori Kehadiran</div>
                                    <div className="jt__detailValue">
                                        <span className={getCategoryClass(selectedJournal.kategori_kehadiran)}>
                                            {selectedJournal.kategori_kehadiran}
                                        </span>
                                    </div>
                                </div>
                                <div className="jt__detailItem">
                                    <div className="jt__detailLabel">Materi</div>
                                    <div className="jt__detailValue">{selectedJournal.materi || '-'}</div>
                                </div>
                                {selectedJournal.refleksi && (
                                    <div className="jt__detailItem">
                                        <div className="jt__detailLabel">Refleksi</div>
                                        <div className="jt__detailValue">{selectedJournal.refleksi}</div>
                                    </div>
                                )}
                                <div className="jt__detailItem">
                                    <div className="jt__detailLabel">NIP</div>
                                    <div className="jt__detailValue">{selectedJournal.nip}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== Edit Modal ===== */}
            {showEditModal && editJournal && (
                <div className="jt__modal" onClick={() => setShowEditModal(false)}>
                    <div className="jt__modalContent" onClick={(e) => e.stopPropagation()}>
                        <div className="jt__modalHeader">
                            <h3>Edit Jurnal</h3>
                            <button className="jt__modalClose" onClick={() => setShowEditModal(false)}>
                                <i className="bi bi-x-lg" aria-hidden="true" />
                            </button>
                        </div>
                        <div className="jt__modalBody">
                            <form onSubmit={(e) => {
                                e.preventDefault();
                                // Handle update logic here
                                alert('Update functionality to be implemented');
                                setShowEditModal(false);
                            }}>
                                <div className="jt__formGrid">
                                    <div className="jt__formGroup">
                                        <label className="jt__formLabel">Materi</label>
                                        <textarea
                                            className="jt__formInput"
                                            defaultValue={editJournal.materi || ''}
                                            rows={3}
                                        />
                                    </div>
                                    <div className="jt__formGroup">
                                        <label className="jt__formLabel">Refleksi</label>
                                        <textarea
                                            className="jt__formInput"
                                            defaultValue={editJournal.refleksi || ''}
                                            rows={3}
                                        />
                                    </div>
                                </div>
                                <div className="jt__modalActions">
                                    <button type="button" className="jt__btn" onClick={() => setShowEditModal(false)}>
                                        Batal
                                    </button>
                                    <button type="submit" className="jt__btn jt__btnPrimary">
                                        Simpan
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
:global(:root) {
  --jt-line: rgba(30, 58, 138, 0.5);
  --jt-card: rgba(248, 250, 252, 0.98);
  --jt-shadow: 0 20px 50px rgba(30, 58, 138, 0.25);
  --jt-shadow2: 0 16px 35px rgba(30, 58, 138, 0.3);
  --jt-radius: 20px;
  --jt-fs: 0.9rem;
  --jt-fs-sm: 0.84rem;
  --jt-fs-xs: 0.8rem;
  --jt-safe-b: env(safe-area-inset-bottom, 0px);
  --jt-safe-t: env(safe-area-inset-top, 0px);
  --jt-navy: #1e3a8a;
  --jt-navy-light: rgba(30, 58, 138, 0.15);
  --jt-navy-medium: rgba(30, 58, 138, 0.75);
  --jt-navy-dark: #0f1b2a;
  --jt-navy-accent: #1e40af;
  --jt-navy-bg: linear-gradient(135deg, #1e3a8a, #1e40af);
  --jt-navy-bg-light: linear-gradient(135deg, rgba(30, 58, 138, 0.2), rgba(30, 64, 175, 0.2));
  --jt-navy-bg-darker: linear-gradient(135deg, #0f1b2a, #1e3a8a);
  --jt-navy-gradient: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #3b82f6 100%);
  --jt-navy-hover: linear-gradient(135deg, #1e40af 0%, #3b82f6 50%, #60a5fa 100%);
}

.jt {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  font-size: var(--jt-fs);
  padding: 0;
  background: transparent;
  border-radius: 0;
  padding-bottom: calc(16px + var(--jt-safe-b));
}

/* ========= TOOLBAR ========= */
.jt__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  width: 100%;
  min-width: 0;
}

.jt__filters {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.jt__search {
  position: relative;
  flex: 1 1 280px;
  min-width: 180px;
}

.jt__search i {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(100, 116, 139, 0.9);
  pointer-events: none;
  font-size: 0.9rem;
}

.jt__search input {
  width: 100%;
  padding: 8px 10px 8px 30px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  font-weight: 500;
  color: rgba(15, 23, 42, 0.92);
  outline: none;
  font-size: var(--jt-fs-sm);
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.jt__search input:focus {
  border-color: rgba(58, 166, 255, 0.55);
  box-shadow: 0 0 0 4px rgba(58, 166, 255, 0.14);
}

.jt__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.jt__btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 8px 10px;
  border-radius: 12px;
  border: 1px solid var(--jt-line);
  background: rgba(255, 255, 255, 0.78);
  color: rgba(7, 22, 46, 0.9);
  font-weight: 600;
  font-size: var(--jt-fs-sm);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  white-space: nowrap;
}

.jt__btn i {
  font-size: 1rem;
}

.jt__btn:hover {
  background: rgba(255, 255, 255, 0.92);
  border-color: rgba(58, 166, 255, 0.24);
  box-shadow: var(--jt-shadow2);
  transform: translateY(-1px);
}

.jt__btn:active {
  transform: translateY(0);
}

.jt__btnPrimary {
  background: linear-gradient(135deg, rgba(58, 166, 255, 0.92), rgba(15, 42, 86, 0.92));
  border-color: rgba(58, 166, 255, 0.32);
  color: #fff;
  font-weight: 650;
}

.jt__btnPrimary:hover {
  background: linear-gradient(135deg, rgba(58, 166, 255, 0.92), rgba(15, 42, 86, 0.92));
  color: #fff;
}

.jt__btnPrimary:active {
  background: linear-gradient(135deg, rgba(58, 166, 255, 1), rgba(15, 42, 86, 1));
  color: #fff;
}

/* ========= FILTER SECTION ========= */
.jt__filterSection {
  background: var(--jt-navy-bg-light);
  border: 1px solid var(--jt-line);
  border-radius: var(--jt-radius);
  padding: 16px;
  box-shadow: var(--jt-shadow2);
}

.jt__filterGrid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.jt__filterGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.jt__filterLabel {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--jt-fs-sm);
  font-weight: 650;
  color: rgba(7, 22, 46, 0.88);
}

.jt__filterLabel i {
  color: rgba(58, 166, 255, 0.9);
}

.jt__select {
  font-size: var(--jt-fs-sm);
}

/* ========= TABLE ========= */
.jt__tableWrap {
  width: 100%;
  min-width: 0;
  overflow: auto;
  border-radius: var(--jt-radius);
  border: 1px solid var(--jt-line);
  background: var(--jt-card);
  box-shadow: var(--jt-shadow);
}

.jt__table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  min-width: 800px;
}

.jt__table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--jt-navy-bg-light);
  color: var(--jt-navy-dark);
  font-weight: 600;
  padding: 12px 8px;
  text-align: left;
  border-bottom: 1px solid var(--jt-line);
}

.jt__table tbody tr {
  border-bottom: 1px solid rgba(30, 58, 138, 0.1);
  transition: background-color 0.15s ease;
}

.jt__table tbody tr:hover {
  background-color: var(--jt-navy-light);
}

.jt__table tbody td {
  padding: 12px 8px;
  color: var(--jt-navy-dark);
  vertical-align: top;
}

.jt__day, .jt__guru, .jt__kelas, .jt__materi {
  font-weight: 500;
}

.jt__date, .jt__mapel {
  font-size: var(--jt-fs-xs);
  color: rgba(100, 116, 139, 0.8);
  margin-top: 2px;
  font-weight: 400;
}

.jt__jamMain {
  font-weight: 600;
  color: var(--jt-navy-accent);
}

.jt__jamSub {
  font-size: var(--jt-fs-xs);
  color: rgba(100, 116, 139, 0.8);
  margin-top: 2px;
}

.jt__rowActions {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
}

.jt__iconBtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: 1px solid var(--jt-line);
  background: rgba(255, 255, 255, 0.9);
  color: var(--jt-navy-medium);
  cursor: pointer;
  transition: all 0.15s ease;
  font-size: 0.9rem;
}

.jt__iconBtn:hover {
  background: var(--jt-navy-light);
  border-color: var(--jt-navy-accent);
  color: var(--jt-navy-accent);
  transform: translateY(-1px);
  box-shadow: var(--jt-shadow2);
}

.jt__iconBtn.danger {
  color: #dc2626;
}

.jt__iconBtn.danger:hover {
  background: rgba(220, 38, 38, 0.1);
  border-color: #dc2626;
  color: #dc2626;
}

/* ========= MOBILE CARDS ========= */
.jt__cards {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.jt__card {
  background: var(--jt-card);
  border: 1px solid var(--jt-line);
  border-radius: var(--jt-radius);
  padding: 16px;
  box-shadow: var(--jt-shadow2);
}

.jt__cardHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.jt__cardTitle {
  flex: 1;
}

.jt__cardName {
  font-weight: 650;
  color: var(--jt-navy-dark);
  font-size: var(--jt-fs);
}

.jt__cardSub {
  font-size: var(--jt-fs-xs);
  color: rgba(100, 116, 139, 0.9);
}

.jt__cardStatus {
  flex-shrink: 0;
}

.jt__cardBody {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.jt__kv {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.jt__k {
  font-weight: 600;
  color: var(--jt-navy-medium);
  font-size: var(--jt-fs-sm);
}

.jt__v {
  color: var(--jt-navy-dark);
  font-size: var(--jt-fs-sm);
}

.jt__cardActions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* ========= FOOTER ========= */
.jt__footer {
  background: var(--jt-navy-bg-light);
  border: 1px solid var(--jt-line);
  border-radius: var(--jt-radius);
  padding: 16px;
  box-shadow: var(--jt-shadow2);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.jt__summary {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: var(--jt-navy-dark);
}

.jt__summary i {
  color: var(--jt-navy-accent);
}

.jt__timestamp {
  font-size: var(--jt-fs-xs);
  color: rgba(100, 116, 139, 0.9);
}

/* ========= MODAL ========= */
.jt__modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.jt__modalContent {
  background: var(--jt-card);
  border-radius: var(--jt-radius);
  border: 1px solid var(--jt-line);
  box-shadow: var(--jt-shadow);
  max-width: 500px;
  width: 100%;
  max-height: 80vh;
  overflow: auto;
}

.jt__modalHeader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--jt-line);
}

.jt__modalHeader h3 {
  margin: 0;
  color: var(--jt-navy-dark);
  font-size: var(--jt-fs);
  font-weight: 650;
}

.jt__modalClose {
  background: none;
  border: none;
  color: var(--jt-navy-medium);
  cursor: pointer;
  font-size: 1.2rem;
  padding: 4px;
  border-radius: 8px;
  transition: all 0.15s ease;
}

.jt__modalClose:hover {
  background: var(--jt-navy-light);
  color: var(--jt-navy-accent);
}

.jt__modalBody {
  padding: 20px;
}

.jt__detailGrid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.jt__detailItem {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.jt__detailLabel {
  font-weight: 600;
  color: var(--jt-navy-medium);
  font-size: var(--jt-fs-sm);
}

.jt__detailValue {
  color: var(--jt-navy-dark);
  font-size: var(--jt-fs-sm);
  font-weight: 500;
}

/* ========= FORM ========= */
.jt__formGrid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

.jt__formGroup {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.jt__formLabel {
  font-weight: 600;
  color: var(--jt-navy-medium);
  font-size: var(--jt-fs-sm);
}

.jt__formInput {
  padding: 12px;
  border: 1px solid var(--jt-line);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  color: var(--jt-navy-dark);
  font-size: var(--jt-fs-sm);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  resize: vertical;
}

.jt__formInput:focus {
  border-color: var(--jt-navy-accent);
  box-shadow: 0 0 0 4px rgba(30, 64, 175, 0.14);
}

.jt__modalActions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}

/* ========= RESPONSIVE DESIGN ========= */
@media (max-width: 767px) {
  .jt__tableWrap {
    display: none;
  }
}

@media (min-width: 768px) {
  .jt__cards {
    display: none;
  }
}
`}</style>
        </div>
    );
}

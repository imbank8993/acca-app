'use client';

import { Journal } from '../types';

interface JurnalTableProps {
    loading: boolean;
    error: any;
    paginatedData: Journal[];
    allWaktu: any[];
    user: any;
    canDo: (action: string) => boolean;
    isAdmin: boolean;
    setSelectedJournal: (journal: Journal) => void;
    setShowDetailModal: (val: boolean) => void;
    setEditJournal: (journal: Journal) => void;
    setShowEditModal: (val: boolean) => void;
    handleDelete: (ids: number | number[]) => void;
    getCategoryClass: (kategori: string) => string;
}

export default function JurnalTable({
    loading,
    error,
    paginatedData,
    allWaktu,
    user,
    canDo,
    isAdmin,
    setSelectedJournal,
    setShowDetailModal,
    setEditJournal,
    setShowEditModal,
    handleDelete,
    getCategoryClass
}: JurnalTableProps) {
    return (
        <div className="jt__tableWrap">
            <table className="jt__table">
                <thead>
                    <tr>
                        <th className="cTanggalHari">Hari/Tanggal</th>
                        <th className="cJam">Jam Ke</th>
                        <th className="cGuruMapel">Guru & Mapel</th>
                        <th className="cKelas">Kelas</th>
                        <th className="cKategori">Kategori</th>
                        <th className="cMateriRefleksi hidden-lg">Materi & Refleksi</th>
                        <th className="cAksi">Aksi</th>
                    </tr>
                </thead>
                <tbody>
                    {loading ? (
                        <tr>
                            <td colSpan={7} className="jt__empty">
                                <div className="jt__loading">
                                    <div className="loading-bars-inline">
                                        <div className="bar"></div>
                                        <div className="bar"></div>
                                        <div className="bar"></div>
                                    </div>
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
                    ) : paginatedData.length === 0 ? (
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
                        paginatedData.map((journal: any) => (
                            <tr key={journal.id}>
                                <td>
                                    <div className="jt__day">{journal.hari}</div>
                                    <div className="jt__date">{journal.tanggal}</div>
                                </td>
                                <td>
                                    {(() => {
                                        let jamStr = String(journal.jam_ke || '');
                                        let timeDisplay = jamStr;
                                        let jamLabel = `Jam ke: ${jamStr}`;

                                        const parts = jamStr.split('-').map(s => s.trim());
                                        const startJam = parts[0];
                                        const endJam = parts.length > 1 ? parts[1] : startJam;
                                        const isNumeric = !isNaN(Number(startJam));

                                        if (isNumeric && allWaktu.length > 0) {
                                            const startSch = allWaktu.find((w: any) => String(w.jam_ke) === startJam && w.hari === journal.hari);
                                            const endSch = allWaktu.find((w: any) => String(w.jam_ke) === endJam && w.hari === journal.hari);

                                            if (startSch && endSch && startSch.mulai && endSch.selesai) {
                                                timeDisplay = `${startSch.mulai.slice(0, 5)} - ${endSch.selesai.slice(0, 5)}`;
                                            }
                                        } else if (journal.jam_ke_id) {
                                            jamLabel = `Jam ke: ${journal.jam_ke_id}`;
                                        }

                                        return (
                                            <>
                                                <div className="jt__jamMain whitespace-nowrap font-bold text-[var(--n-primary)]">{timeDisplay}</div>
                                                <div className="jt__jamSub whitespace-nowrap text-[var(--n-muted)] text-xs">{jamLabel}</div>
                                            </>
                                        )
                                    })()}
                                </td>
                                <td>
                                    <div className="jt__guru">{journal.nama_guru}</div>
                                    {journal.guru_pengganti && journal.guru_pengganti !== '-' && (
                                        <div className="text-xs font-semibold text-amber-600 mt-0.5 mb-1 flex items-center gap-1">
                                            <i className="bi bi-arrow-return-right" title="Digantikan oleh"></i>
                                            <span>{journal.guru_pengganti}</span>
                                        </div>
                                    )}
                                    <div className="jt__mapel">{journal.mata_pelajaran}</div>
                                </td>
                                <td className="jt__kelas">{journal.kelas}</td>
                                <td>
                                    <span className={getCategoryClass(journal.kategori_kehadiran)}>
                                        {(journal.kategori_kehadiran || '').toLowerCase() === 'penugasan dengan pendampingan' ? 'Penugasan DP' :
                                            (journal.kategori_kehadiran || '').toLowerCase() === 'penugasan tanpa pendampingan' ? 'Penugasan TP' :
                                                journal.kategori_kehadiran}
                                    </span>
                                </td>
                                <td className="jt__materiRefleksi hidden-lg">
                                    <div className="text-xs font-medium text-[var(--n-ink)] mb-1 line-clamp-1" title={journal.materi || ''}>
                                        {journal.materi || '-'}
                                    </div>
                                    {journal.refleksi && (
                                        <div className="text-[0.7rem] text-[var(--n-muted)] italic border-l-2 border-[var(--n-border)] pl-2 line-clamp-1" title={journal.refleksi}>
                                            "{journal.refleksi}"
                                        </div>
                                    )}
                                    <div className="mt-2 flex gap-1">
                                        {journal.filled_by === 'SISWA' && <span className="text-[0.65rem] px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded-full font-bold uppercase"><i className="bi bi-person-fill"></i> Siswa</span>}
                                        {journal.filled_by === 'GURU' && <span className="text-[0.65rem] px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded-full font-bold uppercase"><i className="bi bi-mortarboard-fill"></i> Guru</span>}
                                        {(!journal.filled_by || journal.filled_by === 'ADMIN') && <span className="text-[0.65rem] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded-full font-bold uppercase">System</span>}
                                    </div>
                                </td>
                                <td>
                                    <div className="jt__rowActions">
                                        <button
                                            className="jt__iconBtn"
                                            onClick={() => { setSelectedJournal(journal); setShowDetailModal(true); }}
                                            title="Lihat Detail"
                                        >
                                            <i className="bi bi-eye" aria-hidden="true" />
                                        </button>

                                        {(() => {
                                            const isOwner = journal.nip === user?.nip || journal.nama_guru === user?.nama;
                                            const hasSubstitute = journal.guru_pengganti && journal.guru_pengganti !== '-' && journal.guru_pengganti.trim() !== '';
                                            const isSubstitute = hasSubstitute && journal.guru_pengganti === user?.nama;
                                            const hasFullAccess = canDo('update_any') || isAdmin;
                                            const canEditLimited = canDo('edit_materi_refleksi') && (isSubstitute || (!hasSubstitute && isOwner));

                                            if (hasFullAccess || canEditLimited) {
                                                return (
                                                    <button
                                                        className={`jt__iconBtn ${canEditLimited && !hasFullAccess ? 'isLimited' : ''}`}
                                                        onClick={() => { setEditJournal(journal); setShowEditModal(true); }}
                                                        title={hasFullAccess ? "Edit Full" : "Edit Materi & Refleksi"}
                                                    >
                                                        <i className="bi bi-pencil" aria-hidden="true" />
                                                    </button>
                                                );
                                            }
                                            return null;
                                        })()}

                                        {(canDo('delete_any') || isAdmin) && (
                                            <button
                                                className="jt__iconBtn danger"
                                                onClick={() => handleDelete(journal.allIds || journal.id)}
                                                title="Hapus Jurnal"
                                            >
                                                <i className="bi bi-trash" aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
            <style jsx>{`
                .jt__tableWrap {
                  width: 100%;
                  overflow-x: auto;
                  border-radius: 24px;
                  border: 1px solid var(--n-border);
                  background: var(--n-card);
                  box-shadow: var(--n-shadow);
                  overflow-y: hidden; 
                  transition: background 0.3s ease, border-color 0.3s ease;
                }

                /* Hide table on mobile, show on desktop */
                @media (max-width: 768px) {
                    .jt__tableWrap {
                        display: none;
                    }
                }

                :global(.dark) .jt__tableWrap {
                    background: #0f172a;
                    border-color: rgba(255, 255, 255, 0.12);
                }

                .jt__table {
                  width: 100%;
                  border-collapse: separate;
                  border-spacing: 0;
                  min-width: 900px;
                }

                .cTanggalHari { width: 110px; }
                .cJam { width: 95px; }
                .cGuruMapel { width: 230px; min-width: 230px; white-space: normal; }
                .cKelas { width: 90px; }
                .cKategori { width: 140px; }
                .cAksi { width: 110px; }
                .cMateriRefleksi { width: 200px; max-width: 200px; }

                .jt__table thead th {
                  background: var(--n-soft);
                  padding: 18px 13px;
                  text-align: left;
                  border-bottom: 1px solid var(--n-border);
                  font-weight: 700;
                  color: var(--n-muted);
                  font-size: 0.8rem;
                  letter-spacing: 0.05em;
                  text-transform: uppercase;
                  opacity: 0.85;
                }

                .jt__table td {
                  padding: 16px 13px;
                  border-bottom: 1px solid var(--n-border);
                  vertical-align: middle;
                  font-size: 0.9rem;
                  color: var(--n-ink);
                  transition: background 0.2s;
                }

                .jt__table tbody tr:hover td {
                    background: var(--n-soft);
                }

                .jt__day { font-weight: 600; color: var(--n-ink); font-size: 0.92rem; }
                .jt__date { font-size: 0.8rem; color: var(--n-muted); }
                .jt__jamMain { font-weight: 600; color: var(--n-primary); font-size: 0.92rem; }
                .jt__jamSub { font-size: 0.8rem; color: var(--n-muted); }
                .jt__guru { 
                    font-weight: 600; font-size: 0.92rem; color: var(--n-ink); line-height: 1.3;
                    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;
                }
                .jt__mapel { 
                    font-size: 0.8rem; color: var(--n-muted);
                    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-overflow: ellipsis;
                }

                .sk__status {
                    padding: 6px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 700;
                    white-space: nowrap; text-align: center; line-height: 1.1; display: inline-block;
                    max-width: 100%; overflow: hidden; text-overflow: ellipsis;
                }
                .sk__status.isOn { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
                .sk__status.isWarning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
                .sk__status.isInfo { background: var(--n-soft); color: var(--n-primary); }
                .sk__status.isOff { background: var(--n-soft); color: var(--n-muted); }

                .jt__rowActions { display: flex; gap: 8px; justify-content: center; width: 100%; padding-right: 4px; }
                .jt__iconBtn {
                    width: 32px; height: 32px; border-radius: 10px;
                    display: flex; align-items: center; justify-content: center;
                    border: 1px solid var(--n-border);
                    background: var(--n-card); color: var(--n-ink);
                    cursor: pointer; transition: all 0.2s;
                }
                .jt__iconBtn:hover { transform: translateY(-2px); background: var(--n-soft); color: var(--n-primary); }
                .jt__iconBtn.danger { color: #ef4444; }
                .jt__iconBtn.danger:hover { background: #fee2e2; border-color: #fecaca; }

                .jt__loading { 
                    display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px; gap: 12px; color: var(--n-muted); font-weight: 500;
                }
                .loading-bars-inline {
                    display: flex;
                    gap: 4px;
                    align-items: center;
                    justify-content: center;
                }

                .loading-bars-inline .bar {
                    width: 4px;
                    height: 16px;
                    background: var(--n-primary);
                    border-radius: 99px;
                    animation: waveInline 1s infinite ease-in-out;
                }

                .loading-bars-inline .bar:nth-child(2) { animation-delay: 0.1s; opacity: 0.8; }
                .loading-bars-inline .bar:nth-child(3) { animation-delay: 0.2s; opacity: 0.6; }

                @keyframes waveInline {
                    0%, 40%, 100% { transform: scaleY(0.5); }
                    20% { transform: scaleY(1.3); }
                }

                .jt__spinner { display: none; }

                @media (max-width: 1024px) {
                    .hidden-lg { display: none; }
                }
            `}</style>
        </div>
    );
}

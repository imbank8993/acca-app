'use client';

import { Journal } from '../types';

interface JurnalCardsProps {
    loading: boolean;
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

export default function JurnalCards({
    loading,
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
}: JurnalCardsProps) {
    return (
        <div className="jt__cards">
            {loading ? (
                <div className="jt__card">
                    <div className="jt__cardHead">
                        <div className="jt__cardTitle">
                            <div className="jt__cardName">Memuat data...</div>
                            <div className="jt__cardSub">Mohon tunggu</div>
                        </div>
                    </div>
                </div>
            ) : paginatedData.length === 0 ? (
                <div className="jt__card">
                    <div className="jt__cardHead">
                        <div className="jt__cardTitle">
                            <div className="jt__cardName">Tidak ada data</div>
                            <div className="jt__cardSub">Belum ada jurnal</div>
                        </div>
                    </div>
                </div>
            ) : (
                paginatedData.map((journal: any) => (
                    <div className="jt__card" key={`m-${journal.id}`}>
                        <div className="jt__cardHead">
                            <div className="jt__cardTitle">
                                <div className="jt__cardName">
                                    {journal.nama_guru}
                                    {['diganti', 'tukaran', 'tim teaching', 'guru pengganti'].includes((journal.kategori_kehadiran || '').toLowerCase()) && journal.guru_pengganti && (
                                        <div className="text-xs text-amber-600 font-normal mt-0.5 flex items-center gap-1">
                                            <i className="bi bi-arrow-right"></i> {journal.guru_pengganti}
                                        </div>
                                    )}
                                </div>
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
                                <div className="jt__k">Waktu</div>
                                <div className="jt__v">
                                    {(() => {
                                        let jamStr = String(journal.jam_ke || '');
                                        const parts = jamStr.split('-').map(s => s.trim());
                                        const startJam = parts[0];
                                        const endJam = parts.length > 1 ? parts[1] : startJam;
                                        const isNumeric = !isNaN(Number(startJam));

                                        if (isNumeric && allWaktu.length > 0) {
                                            const startSch = allWaktu.find((w: any) => String(w.jam_ke) === startJam && w.hari === journal.hari);
                                            const endSch = allWaktu.find((w: any) => String(w.jam_ke) === endJam && w.hari === journal.hari);
                                            if (startSch && endSch) {
                                                return `${startSch.mulai?.slice(0, 5)} - ${endSch.selesai?.slice(0, 5)} (Jam ${jamStr})`;
                                            }
                                        }
                                        return jamStr;
                                    })()}
                                </div>
                            </div>
                            <div className="jt__kv">
                                <div className="jt__k">Mata Pelajaran</div>
                                <div className="jt__v">{journal.mata_pelajaran}</div>
                            </div>
                        </div>

                        <div className="jt__cardActions">
                            <button
                                className="jt__iconBtn"
                                onClick={() => { setSelectedJournal(journal); setShowDetailModal(true); }}
                                title="Detail"
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
                                    title="Hapus"
                                >
                                    <i className="bi bi-trash" aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    </div>
                ))
            )}
            <style jsx>{`
                .jt__cards { display: flex; flex-direction: column; gap: 16px; }
                
                /* Hide cards on desktop, show on mobile */
                @media (min-width: 769px) {
                    .jt__cards {
                        display: none;
                    }
                }
                .jt__card {
                    background: var(--n-card);
                    padding: 24px;
                    border-radius: 24px;
                    border: 1px solid var(--n-border);
                    box-shadow: var(--n-shadow);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    position: relative;
                    overflow: hidden;
                }

                :global(.dark) .jt__card {
                    background: #0f172a;
                    border-color: rgba(255, 255, 255, 0.1);
                }
                .jt__card::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; height: 4px;
                    background: #0038A8;
                }

                .jt__card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.1); }
                .jt__cardHead { display: flex; justify-content: space-between; margin-bottom: 20px; align-items: flex-start; }
                .jt__cardTitle { flex: 1; }
                .jt__cardName { font-weight: 700; font-size: 1.1rem; color: var(--n-ink); margin-bottom: 4px; }
                .jt__cardSub { font-size: 0.85rem; color: var(--n-muted); }
                .jt__cardStatus { margin-left: 12px; }
                .jt__cardBody { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; font-size: 0.9rem; }
                .jt__kv {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 0;
                    border-bottom: 1px solid var(--n-border);
                }
                .jt__k { color: var(--n-muted); font-weight: 700; font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; }
                .jt__v { color: var(--n-ink); font-weight: 600; }
                .jt__cardActions { display: flex; gap: 12px; justify-content: flex-end; }

                .sk__status {
                    padding: 6px 12px; border-radius: 12px; font-size: 0.8rem; font-weight: 700;
                    white-space: nowrap; text-align: center; line-height: 1.1; display: inline-block;
                    max-width: 100%; overflow: hidden; text-overflow: ellipsis;
                }
                .sk__status.isOn { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
                .sk__status.isWarning { background: rgba(245, 158, 11, 0.15); color: #f59e0b; }
                .sk__status.isInfo { background: var(--n-soft); color: var(--n-primary); }
                .sk__status.isOff { background: var(--n-soft); color: var(--n-muted); }

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

                @media (max-width: 768px) {
                  .jt__card { padding: 18px; border-radius: 20px; }
                  .jt__cardName { font-size: 0.95rem; font-weight: 750; }
                  .jt__cardSub { font-size: 0.78rem; opacity: 0.85; }
                  .jt__kv { padding: 6px 0; }
                  .jt__k { font-size: 0.65rem; }
                  .jt__v { font-size: 0.82rem; }
                }
            `}</style>
        </div>
    );
}

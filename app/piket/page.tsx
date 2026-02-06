'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Pagination from '@/components/ui/Pagination';
import PermissionGuard from '@/components/PermissionGuard';
import type { User } from '@/lib/types';

interface PiketDetail {
    id: number;
    piket_id: number;
    nama_kelas: string;
    nama_guru: string;
    status_kehadiran: string;
    dokumentasi_url: string | null;
}

interface PiketReport {
    id: number;
    tanggal: string;
    nama_guru_piket: string;
    jam_ke: string;
    keterangan: string;
    created_at: string;
    details: PiketDetail[];
}

export default function PiketPage({ user }: { user?: User }) {
    const [reports, setReports] = useState<PiketReport[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [teacherName, setTeacherName] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [selectedReport, setSelectedReport] = useState<PiketReport | null>(null);

    const fetchReports = async () => {
        try {
            setLoading(true);
            const res = await fetch('/api/laporan/piket?limit=500');
            const result = await res.json();
            if (result.ok) {
                setReports(result.data);
            }
        } catch (err) {
            console.error('Error fetching reports:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReports();
    }, []);

    const filteredReports = reports.filter(r => {
        const matchesSearch = r.nama_guru_piket.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (r.keterangan && r.keterangan.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesTeacher = teacherName === '' || r.nama_guru_piket.toLowerCase().includes(teacherName.toLowerCase());

        const reportDate = r.tanggal.split('T')[0];
        const matchesStartDate = startDate === '' || reportDate >= startDate;
        const matchesEndDate = endDate === '' || reportDate <= endDate;

        return matchesSearch && matchesTeacher && matchesStartDate && matchesEndDate;
    });

    const resetFilters = () => {
        setSearchTerm('');
        setStartDate('');
        setEndDate('');
        setTeacherName('');
        setCurrentPage(1);
    };

    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentReports = filteredReports.slice(indexOfFirstItem, indexOfLastItem);

    return (
        <PermissionGuard requiredPermission={{ resource: 'jurnal', action: 'view' }} user={user}>
            <div className="piket-container">
                <div className="piket-header">
                    <div className="header-info">
                        <h1>Laporan Guru Piket</h1>
                        <p>Monitoring kehadiran guru dan situasi kelas harian</p>
                    </div>
                </div>

                <div className="piket-toolbar">
                    <div className="filter-group">
                        <div className="filter-item">
                            <label>Tgl Awal</label>
                            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
                        </div>
                        <div className="filter-item">
                            <label>Tgl Akhir</label>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
                        </div>
                        <div className="filter-item">
                            <label>Guru Piket</label>
                            <input
                                type="text"
                                placeholder="Cari Guru..."
                                value={teacherName}
                                onChange={e => setTeacherName(e.target.value)}
                            />
                        </div>
                        <div className="filter-item search">
                            <label>Keyword</label>
                            <div className="search-input-wrapper">
                                <i className="bi bi-search"></i>
                                <input
                                    type="text"
                                    placeholder="Cari keterangan..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <button className="reset-btn" onClick={resetFilters} title="Reset Filter">
                            <i className="bi bi-arrow-counterclockwise"></i>
                        </button>
                    </div>
                </div>

                <div className="piket-content">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Memuat laporan...</p>
                        </div>
                    ) : currentReports.length > 0 ? (
                        <div className="report-grid">
                            {currentReports.map((report) => (
                                <div key={report.id} className="report-card" onClick={() => setSelectedReport(report)}>
                                    <div className="card-header">
                                        <div className="date-badge">
                                            <i className="bi bi-calendar3"></i>
                                            {new Date(report.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                                        </div>
                                        <div className="jam-badge">Jam Ke: {report.jam_ke}</div>
                                    </div>
                                    <div className="card-body">
                                        <div className="guru-info">
                                            <div className="avatar">
                                                <i className="bi bi-person-fill"></i>
                                            </div>
                                            <div>
                                                <h3>{report.nama_guru_piket}</h3>
                                                <span>Petugas Piket</span>
                                            </div>
                                        </div>
                                        <p className="keterangan">{report.keterangan || 'Tidak ada keterangan tambahan.'}</p>
                                    </div>
                                    <div className="card-footer">
                                        <div className="stats">
                                            <span><i className="bi bi-building"></i> {report.details.length} Kelas</span>
                                            <span><i className="bi bi-camera"></i> {report.details.filter(d => d.dokumentasi_url).length} Foto</span>
                                        </div>
                                        <button className="view-btn">Detail <i className="bi bi-chevron-right"></i></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="empty-state">
                            <i className="bi bi-journal-x"></i>
                            <p>Tidak ada laporan ditemukan.</p>
                        </div>
                    )}
                </div>

                {filteredReports.length > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalPages={Math.ceil(filteredReports.length / itemsPerPage)}
                        limit={itemsPerPage}
                        totalItems={filteredReports.length}
                        onPageChange={setCurrentPage}
                        onLimitChange={(l) => { setItemsPerPage(l); setCurrentPage(1); }}
                    />
                )}

                {/* DETAIL MODAL */}
                {selectedReport && (
                    <div className="modal-overlay" onClick={() => setSelectedReport(null)}>
                        <div className="modal-content animate-pop-in" onClick={e => e.stopPropagation()}>
                            <div className="modal-header">
                                <div>
                                    <h2>Detail Laporan Piket</h2>
                                    <p>{new Date(selectedReport.tanggal).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                </div>
                                <button className="close-btn" onClick={() => setSelectedReport(null)}>
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>
                            <div className="modal-body">
                                <section className="summary-section">
                                    <div className="summary-item">
                                        <label>Guru Piket</label>
                                        <p>{selectedReport.nama_guru_piket}</p>
                                    </div>
                                    <div className="summary-item">
                                        <label>Jam Pelajaran</label>
                                        <p>Jam Ke-{selectedReport.jam_ke}</p>
                                    </div>
                                    <div className="summary-item full">
                                        <label>Keterangan Umum</label>
                                        <p>{selectedReport.keterangan || '-'}</p>
                                    </div>
                                </section>

                                <section className="details-section">
                                    <h3>Data Per Kelas</h3>
                                    <div className="table-responsive">
                                        <table className="details-table">
                                            <thead>
                                                <tr>
                                                    <th>Kelas</th>
                                                    <th>Guru Pengajar</th>
                                                    <th>Status</th>
                                                    <th>Dokumentasi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {selectedReport.details.map((detail) => (
                                                    <tr key={detail.id}>
                                                        <td className="font-bold">{detail.nama_kelas}</td>
                                                        <td>{detail.nama_guru || '-'}</td>
                                                        <td>
                                                            <span className={`status-badge ${detail.status_kehadiran?.toLowerCase()}`}>
                                                                {detail.status_kehadiran}
                                                            </span>
                                                        </td>
                                                        <td>
                                                            {detail.dokumentasi_url ? (
                                                                <a href={detail.dokumentasi_url} target="_blank" rel="noreferrer" className="img-link">
                                                                    <i className="bi bi-image"></i> Lihat Foto
                                                                </a>
                                                            ) : (
                                                                <span className="text-muted">-</span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </section>
                            </div>
                        </div>
                    </div>
                )}

                <style jsx>{`
                    .piket-container {
                        display: flex;
                        flex-direction: column;
                        gap: 24px;
                        padding-bottom: 2rem;
                    }

                    .piket-header {
                        background: linear-gradient(135deg, #1e3a8a 0%, #312e81 100%);
                        padding: 48px 40px;
                        border-radius: 24px;
                        border: 1px solid rgba(255, 255, 255, 0.12);
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                        position: relative;
                        overflow: hidden;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    .piket-header::before {
                        content: '';
                        position: absolute;
                        top: -20%;
                        right: -5%;
                        width: 250px;
                        height: 250px;
                        background: radial-gradient(circle, rgba(56, 189, 248, 0.4) 0%, rgba(56, 189, 248, 0) 70%);
                        filter: blur(60px);
                        pointer-events: none;
                        z-index: 1;
                    }
                    .piket-header::after {
                        content: '';
                        position: absolute;
                        bottom: -30%;
                        left: 10%;
                        width: 200px;
                        height: 200px;
                        background: radial-gradient(circle, rgba(168, 85, 247, 0.3) 0%, rgba(168, 85, 247, 0) 70%);
                        filter: blur(50px);
                        pointer-events: none;
                        z-index: 1;
                    }
                    .header-info {
                        position: relative;
                        z-index: 2;
                    }
                    .header-info h1 {
                        font-family: 'Poppins', sans-serif;
                        font-size: 2.4rem;
                        font-weight: 800;
                        color: white;
                        margin: 0 0 8px 0;
                        letter-spacing: -0.03em;
                        text-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    }
                    .header-info p {
                        color: rgba(255, 255, 255, 0.85);
                        font-size: 1.05rem;
                        margin: 0;
                        font-weight: 500;
                    }

                    .piket-toolbar {
                        display: flex;
                        gap: 16px;
                        align-items: center;
                        background: white;
                        padding: 20px;
                        border-radius: 20px;
                        border: 1px solid var(--n-border);
                        box-shadow: 0 4px 15px rgba(0,0,0,0.01);
                    }

                    .filter-group {
                        display: flex;
                        flex-wrap: wrap;
                        gap: 20px;
                        width: 100%;
                        align-items: flex-end;
                    }

                    .filter-item {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        min-width: 150px;
                    }

                    .filter-item.search {
                        flex: 1;
                        min-width: 250px;
                    }

                    .filter-item label {
                        font-size: 0.75rem;
                        font-weight: 700;
                        color: #94a3b8;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }

                    .search-input-wrapper {
                        position: relative;
                        display: flex;
                        align-items: center;
                    }

                    .search-input-wrapper i {
                        position: absolute;
                        left: 14px;
                        color: #94a3b8;
                    }

                    .search-input-wrapper input {
                        padding-left: 40px !important;
                    }

                    .filter-item input {
                        width: 100%;
                        padding: 10px 14px;
                        border-radius: 12px;
                        border: 1px solid var(--n-border);
                        font-size: 0.9rem;
                        color: #1e293b;
                        outline: none;
                        transition: all 0.2s;
                    }

                    .filter-item input:focus {
                        border-color: var(--n-primary);
                        box-shadow: 0 0 0 4px rgba(0, 56, 168, 0.05);
                    }

                    .reset-btn {
                        width: 42px;
                        height: 42px;
                        border-radius: 12px;
                        background: #f1f5f9;
                        border: none;
                        color: #64748b;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.2s;
                        font-size: 1.2rem;
                    }

                    .reset-btn:hover {
                        background: #e2e8f0;
                        color: #0f172a;
                    }

                    .report-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
                        gap: 24px;
                    }

                    .report-card {
                        background: white;
                        border-radius: 24px;
                        border: 1px solid var(--n-border);
                        padding: 20px;
                        cursor: pointer;
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        display: flex;
                        flex-direction: column;
                        gap: 16px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.02);
                    }

                    .report-card:hover {
                        transform: translateY(-4px);
                        border-color: var(--n-primary);
                        box-shadow: 0 12px 24px rgba(0, 56, 168, 0.08);
                    }

                    .card-header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .date-badge {
                        background: #f1f5f9;
                        padding: 6px 12px;
                        border-radius: 10px;
                        font-size: 0.8rem;
                        font-weight: 700;
                        color: #475569;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }

                    .jam-badge {
                        font-size: 0.75rem;
                        font-weight: 800;
                        color: var(--n-primary);
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }

                    .guru-info {
                        display: flex;
                        align-items: center;
                        gap: 12px;
                        margin-bottom: 8px;
                    }

                    .avatar {
                        width: 44px;
                        height: 44px;
                        background: #eff6ff;
                        color: #2563eb;
                        border-radius: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1.4rem;
                    }

                    .guru-info h3 {
                        font-size: 1.05rem;
                        font-weight: 750;
                        color: #0f172a;
                        margin: 0;
                    }

                    .guru-info span {
                        font-size: 0.75rem;
                        color: #64748b;
                        font-weight: 500;
                    }

                    .keterangan {
                        font-size: 0.88rem;
                        color: #475569;
                        line-height: 1.5;
                        display: -webkit-box;
                        -webkit-line-clamp: 2;
                        -webkit-box-orient: vertical;
                        overflow: hidden;
                        margin: 0;
                        min-height: 2.7rem;
                    }

                    .card-footer {
                        margin-top: auto;
                        padding-top: 16px;
                        border-top: 1px solid #f1f5f9;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .stats {
                        display: flex;
                        gap: 12px;
                    }

                    .stats span {
                        font-size: 0.8rem;
                        color: #94a3b8;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                    }

                    .view-btn {
                        background: transparent;
                        border: none;
                        color: var(--n-primary);
                        font-size: 0.85rem;
                        font-weight: 700;
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        cursor: pointer;
                        padding: 4px 8px;
                        border-radius: 8px;
                        transition: background 0.2s;
                    }

                    .view-btn:hover {
                        background: #eff6ff;
                    }

                    /* MODAL */
                    .modal-overlay {
                        position: fixed;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background: rgba(15, 23, 42, 0.6);
                        backdrop-filter: blur(8px);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 1000;
                        padding: 24px;
                    }

                    .modal-content {
                        background: white;
                        width: 100%;
                        max-width: 900px;
                        max-height: 90vh;
                        border-radius: 32px;
                        overflow: hidden;
                        display: flex;
                        flex-direction: column;
                        box-shadow: 0 40px 100px -20px rgba(0,0,0,0.3);
                    }

                    .modal-header {
                        padding: 28px 32px;
                        border-bottom: 1px solid #f1f5f9;
                        display: flex;
                        justify-content: space-between;
                        align-items: flex-start;
                    }

                    .modal-header h2 {
                        font-size: 1.5rem;
                        font-weight: 800;
                        color: #0f172a;
                        margin: 0 0 4px 0;
                    }

                    .modal-header p {
                        color: #64748b;
                        font-size: 0.9rem;
                        margin: 0;
                    }

                    .close-btn {
                        width: 40px;
                        height: 40px;
                        border-radius: 12px;
                        background: #f8fafc;
                        border: 1px solid #f1f5f9;
                        color: #64748b;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.2s;
                    }

                    .close-btn:hover {
                        background: #fee2e2;
                        color: #ef4444;
                        border-color: #fecaca;
                    }

                    .modal-body {
                        padding: 32px;
                        overflow-y: auto;
                        display: flex;
                        flex-direction: column;
                        gap: 32px;
                    }

                    .summary-section {
                        display: grid;
                        grid-template-columns: repeat(2, 1fr);
                        gap: 20px;
                        background: #f8fafc;
                        padding: 24px;
                        border-radius: 20px;
                        border: 1px solid #f1f5f9;
                    }

                    .summary-item label {
                        display: block;
                        font-size: 0.75rem;
                        font-weight: 700;
                        color: #94a3b8;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                        margin-bottom: 6px;
                    }

                    .summary-item p {
                        font-size: 1.05rem;
                        font-weight: 600;
                        color: #1e293b;
                        margin: 0;
                    }

                    .summary-item.full {
                        grid-column: span 2;
                    }

                    .details-section h3 {
                        font-size: 1.2rem;
                        font-weight: 800;
                        color: #0f172a;
                        margin-bottom: 16px;
                    }

                    .table-responsive {
                        width: 100%;
                        overflow-x: auto;
                    }

                    .details-table {
                        width: 100%;
                        border-collapse: collapse;
                        text-align: left;
                    }

                    .details-table th {
                        padding: 12px 16px;
                        font-size: 0.8rem;
                        font-weight: 700;
                        color: #64748b;
                        border-bottom: 2px solid #f1f5f9;
                    }

                    .details-table td {
                        padding: 16px;
                        font-size: 0.9rem;
                        color: #334155;
                        border-bottom: 1px solid #f1f5f9;
                    }

                    .status-badge {
                        padding: 4px 12px;
                        border-radius: 99px;
                        font-size: 0.75rem;
                        font-weight: 700;
                    }

                    .status-badge.hadir { background: #dcfce7; color: #166534; }
                    .status-badge.izin { background: #fef9c3; color: #854d0e; }
                    .status-badge.sakit { background: #eff6ff; color: #1e40af; }
                    .status-badge.tugas { background: #f3e8ff; color: #6b21a8; }
                    .status-badge.tanpa.keterangan { background: #fee2e2; color: #991b1b; }

                    .img-link {
                        color: var(--n-primary);
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                        text-decoration: none;
                    }

                    .img-link:hover {
                        text-decoration: underline;
                    }

                    .loading-state, .empty-state {
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        padding: 60px;
                        background: white;
                        border-radius: 24px;
                        border: 1px solid var(--n-border);
                        color: #64748b;
                        gap: 16px;
                    }

                    .spinner {
                        width: 40px;
                        height: 40px;
                        border: 4px solid #f1f5f9;
                        border-top-color: var(--n-primary);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                    }

                    .empty-state i { font-size: 4rem; opacity: 0.2; }

                    @keyframes spin { to { transform: rotate(360deg); } }
                    
                    @keyframes pop-in {
                        from { opacity: 0; transform: scale(0.95) translateY(20px); }
                        to { opacity: 1; transform: scale(1) translateY(0); }
                    }

                    .animate-pop-in {
                        animation: pop-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    }

                    @media (max-width: 640px) {
                        .report-grid { grid-template-columns: 1fr; }
                        .summary-section { grid-template-columns: 1fr; }
                        .summary-item.full { grid-column: span 1; }
                    }
                `}</style>
            </div>
        </PermissionGuard>
    );
}

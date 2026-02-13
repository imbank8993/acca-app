'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function RekapJurnalPage() {
    const [filterMonth, setFilterMonth] = useState<string>(String(new Date().getMonth() + 1));
    const [filterYear, setFilterYear] = useState<string>(String(new Date().getFullYear()));
    const [showAll, setShowAll] = useState<boolean>(false);
    const [loading, setLoading] = useState<boolean>(true);
    const [data, setData] = useState<any>(null);
    const [selectedTeacher, setSelectedTeacher] = useState<any>(null);
    const [categoriesList, setCategoriesList] = useState<string[]>([]);

    // Default colors for known categories, random for others
    const categoryColors: Record<string, string> = {
        'Sesuai': '#10b981', // green-500
        'Kosong': '#ef4444', // red-500
        'Terlambat': '#f97316', // orange-500
        'Tukaran/Diganti': '#3b82f6', // blue-500
        'Digabung': '#14b8a6', // teal-500
        'Tim teaching': '#6366f1', // indigo-500
        'Penugasan dengan pendampingan': '#8b5cf6', // violet-500
        'Penugasan tanpa pendampingan': '#d946ef', // fuchsia-500
        'Lainnya': '#6b7280' // gray-500
    };

    const getCategoryColor = (cat: string) => categoryColors[cat] || '#6b7280';

    const router = useRouter();

    // Fetch Master Categories
    useEffect(() => {
        const fetchCategories = async () => {
            try {
                const { data, error } = await supabase
                    .from('master_dropdown')
                    .select('kategori_kehadiran')
                    .not('kategori_kehadiran', 'is', null)
                    .neq('kategori_kehadiran', '')
                    .order('kategori_kehadiran', { ascending: true });

                if (data) {
                    // Extract unique category names
                    const cats = data.map(d => d.kategori_kehadiran).filter(Boolean);
                    // Ensure 'Hadir', 'Izin', 'Sakit' are always present/first if they exist in DB, or just use DB order
                    // We might want to prioritize common ones if they exist
                    const priority = ['Sesuai', 'Terlambat', 'Kosong', 'Tukaran/Diganti'];
                    const sortedCats = cats.sort((a, b) => {
                        const idxA = priority.indexOf(a);
                        const idxB = priority.indexOf(b);
                        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                        if (idxA !== -1) return -1;
                        if (idxB !== -1) return 1;
                        return a.localeCompare(b);
                    });
                    setCategoriesList(sortedCats);
                }
            } catch (err) {
                console.error('Error fetching categories:', err);
            }
        };
        fetchCategories();
    }, []);

    const fetchRekap = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (showAll) {
                params.append('all', 'true');
            } else {
                params.append('month', filterMonth);
                params.append('year', filterYear);
            }

            const response = await fetch(`/api/rekap-jurnal?${params.toString()}`);
            const result = await response.json();

            if (result.success) {
                setData(result.data);
            } else {
                console.error('Failed to fetch data:', result.error);
            }
        } catch (error) {
            console.error('Error fetching rekap:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRekap();
    }, [filterMonth, filterYear, showAll]);

    const months = [
        { value: '1', label: 'Januari' },
        { value: '2', label: 'Februari' },
        { value: '3', label: 'Maret' },
        { value: '4', label: 'April' },
        { value: '5', label: 'Mei' },
        { value: '6', label: 'Juni' },
        { value: '7', label: 'Juli' },
        { value: '8', label: 'Agustus' },
        { value: '9', label: 'September' },
        { value: '10', label: 'Oktober' },
        { value: '11', label: 'November' },
        { value: '12', label: 'Desember' }
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

    const categoryInitials: Record<string, string> = {
        'Sesuai': 'SS',
        'Kosong': 'KS',
        'Terlambat': 'TL',
        'Tukaran/Diganti': 'TD',
        'Digabung': 'DG',
        'Tim teaching': 'TT',
        'Penugasan dengan pendampingan': 'PDP',
        'Penugasan tanpa pendampingan': 'PTP',
        'Lainnya': 'LN'
    };

    const BarChart = ({ stats }: { stats: any }) => {
        if (!stats) return null;

        // Use categoriesList if available, otherwise fallback to stats keys
        const chartCategories = categoriesList.length > 0 ? categoriesList : Object.keys(stats);
        const maxValue = Math.max(...Object.values(stats) as number[], 1);

        const chartHeight = 250;
        const barWidth = 40;
        const gap = 30;
        const leftPadding = 40; // Space for Y-axis
        const bottomPadding = 40; // Space for X-axis labels
        const chartWidth = Math.max(chartCategories.length * (barWidth + gap) + gap + leftPadding, 600);

        return (
            <div className="chart-container">
                <svg width="100%" height={chartHeight + bottomPadding} viewBox={`0 0 ${chartWidth} ${chartHeight + bottomPadding}`} className="bar-chart">
                    {/* Y-axis Line */}
                    <line
                        x1={leftPadding}
                        y1={0}
                        x2={leftPadding}
                        y2={chartHeight}
                        stroke="#e5e7eb"
                        strokeWidth="2"
                    />

                    {/* X-axis Line */}
                    <line
                        x1={leftPadding}
                        y1={chartHeight}
                        x2={chartWidth}
                        y2={chartHeight}
                        stroke="#e5e7eb"
                        strokeWidth="2"
                    />

                    {chartCategories.map((cat, i) => {
                        const val = stats[cat] || 0;
                        const barH = (val / maxValue) * (chartHeight - 20); // Scale relative to height minus top buffer
                        const x = leftPadding + gap + i * (barWidth + gap);
                        const y = chartHeight - barH;

                        return (
                            <g key={cat} className="bar-group">
                                <rect
                                    x={x}
                                    y={y}
                                    width={barWidth}
                                    height={barH}
                                    fill={getCategoryColor(cat)}
                                    rx="4"
                                    className="bar-rect"
                                >
                                    <title>{cat}: {val}</title>
                                </rect>
                                <text
                                    x={x + barWidth / 2}
                                    y={y - 5}
                                    textAnchor="middle"
                                    fontSize="12"
                                    fontWeight="bold"
                                    fill="#374151"
                                >
                                    {val > 0 ? val : ''}
                                </text>
                                {/* Initial Label */}
                                <text
                                    x={x + barWidth / 2}
                                    y={chartHeight + 20}
                                    textAnchor="middle"
                                    fontSize="12"
                                    fontWeight="600"
                                    fill="#4b5563"
                                    className="bar-label cursor-help"
                                >
                                    {categoryInitials[cat] || cat.substring(0, 2).toUpperCase()}
                                    <title>{cat}</title>
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        );
    };

    return (
        <div className="rekap-container">
            <div className="header-actions">
                <h1>Rekap Jurnal Guru</h1>
                <div className="filters">
                    {!showAll && (
                        <>
                            <select
                                value={filterMonth}
                                onChange={(e) => setFilterMonth(e.target.value)}
                                className="filter-select"
                            >
                                {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                            </select>
                            <select
                                value={filterYear}
                                onChange={(e) => setFilterYear(e.target.value)}
                                className="filter-select"
                            >
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </>
                    )}
                    <button
                        className={`btn-toggle ${showAll ? 'active' : ''}`}
                        onClick={() => setShowAll(!showAll)}
                    >
                        {showAll ? 'Tampilkan Per Bulan' : 'Tampilkan Semua'}
                    </button>
                    <button className="btn-refresh" onClick={fetchRekap}>
                        <i className="bi bi-arrow-clockwise"></i> Refresh
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="loading-state">Memuat data...</div>
            ) : (
                <>
                    {/* Summary Chart Section */}
                    <div className="card overview-section">
                        <h2>Statistik Kehadiran Global</h2>
                        <div className="chart-wrapper-scroll">
                            <BarChart stats={data?.globalStats} />
                        </div>
                    </div>

                    {/* Teacher List Section */}
                    <div className="card list-section">
                        <h2>Detail Per Guru</h2>
                        <div className="table-responsive">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '250px' }}>Nama Guru</th>
                                        {/* Dynamic Columns */}
                                        {categoriesList.map(cat => (
                                            <th key={cat} className="text-center" title={cat} style={{ cursor: 'help' }}>
                                                {categoryInitials[cat] || cat.substring(0, 2).toUpperCase()}
                                            </th>
                                        ))}
                                        <th className="text-center">Total</th>
                                        <th className="text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.teacherStats?.map((teacher: any, idx: number) => (
                                        <tr key={idx}>
                                            <td style={{ fontWeight: 600 }}>
                                                {teacher.nama}
                                                <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: 400 }}>{teacher.nip}</div>
                                            </td>

                                            {/* Dynamic Data Cells */}
                                            {categoriesList.map(cat => {
                                                const count = teacher.categories?.[cat] || 0;
                                                return (
                                                    <td key={cat} className="text-center">
                                                        {count > 0 ? (
                                                            <span className="count-badge" style={{
                                                                color: getCategoryColor(cat),
                                                                background: `${getCategoryColor(cat)}20`
                                                            }}>
                                                                {count}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-300">-</span>
                                                        )}
                                                    </td>
                                                );
                                            })}

                                            <td className="text-center" style={{ fontWeight: 'bold' }}>{teacher.total}</td>
                                            <td className="text-center">
                                                <button
                                                    className="btn-detail"
                                                    onClick={() => setSelectedTeacher(teacher)}
                                                >
                                                    Detail
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {(!data?.teacherStats || data.teacherStats.length === 0) && (
                                        <tr>
                                            <td colSpan={categoriesList.length + 3} className="text-center">Tidak ada data jurnal untuk periode ini.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Detail Modal */}
            {selectedTeacher && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">
                            <h3>Detail Jurnal: {selectedTeacher.nama}</h3>
                            <button className="btn-close" onClick={() => setSelectedTeacher(null)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="table-responsive">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Tanggal</th>
                                            <th>Jam</th>
                                            <th>Kelas</th>
                                            <th>Mapel</th>
                                            <th>Materi</th>
                                            <th>Status</th>
                                            <th>Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTeacher.details.map((detail: any, idx: number) => (
                                            <tr key={idx}>
                                                <td>{new Date(detail.tanggal).toLocaleDateString('id-ID')}</td>
                                                <td>{detail.jam_ke}</td>
                                                <td>{detail.kelas}</td>
                                                <td>{detail.mata_pelajaran}</td>
                                                <td>{detail.materi || '-'}</td>
                                                <td>
                                                    <span className={`badge`} style={{
                                                        background: getCategoryColor(detail.kategori)
                                                    }}>
                                                        {detail.kategori}
                                                    </span>
                                                </td>
                                                <td style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                                    {detail.keterangan || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx>{`
                .rekap-container {
                    padding: 24px;
                    max-width: 1400px; /* Wider for table */
                    margin: 0 auto;
                }
                .header-actions {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                    flex-wrap: wrap;
                    gap: 16px;
                }
                .filters {
                    display: flex;
                    gap: 12px;
                    align-items: center;
                }
                .filter-select {
                    padding: 8px 12px;
                    border-radius: 8px;
                    border: 1px solid #ddd;
                    font-size: 14px;
                }
                .btn-toggle {
                    padding: 8px 16px;
                    border-radius: 8px;
                    border: 1px solid #0038A8;
                    background: transparent;
                    color: #0038A8;
                    cursor: pointer;
                    font-weight: 500;
                }
                .btn-toggle.active {
                    background: #0038A8;
                    color: white;
                }
                .btn-refresh {
                    padding: 8px 16px;
                    background: #f3f4f6;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    cursor: pointer;
                }
                .card {
                    background: white;
                    border-radius: 12px;
                    padding: 24px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    margin-bottom: 24px;
                }
                .overview-section h2, .list-section h2 {
                    margin-bottom: 20px;
                    font-size: 1.25rem;
                    color: #1f2937;
                }
                
                /* Chart Styles */
                .chart-wrapper-scroll {
                    overflow-x: auto;
                    padding-bottom: 10px;
                }
                .chart-container {
                    display: flex;
                    justify-content: center;
                    min-width: 600px; /* Ensure chart doesn't get too squished */
                }
                .bar-rect {
                    transition: height 0.3s ease;
                }
                .bar-rect:hover {
                    opacity: 0.8;
                }

                /* Table Styles */
                .table-responsive {
                    overflow-x: auto;
                }
                .table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .table th, .table td {
                    padding: 12px 16px;
                    text-align: left;
                    border-bottom: 1px solid #e5e7eb;
                }
                .table th {
                    background: #f9fafb;
                    font-weight: 600;
                    color: #374151;
                    font-size: 0.875rem;
                    white-space: nowrap;
                }
                .table td {
                    font-size: 0.875rem;
                    color: #1f2937;
                    vertical-align: middle;
                }
                .text-center { text-align: center !important; }
                
                .count-badge {
                    padding: 4px 10px;
                    border-radius: 6px;
                    font-weight: 600;
                    font-size: 0.8rem;
                }
                
                .btn-detail {
                    padding: 6px 12px;
                    background: #eff6ff;
                    color: #0038A8;
                    border: none;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.875rem;
                    font-weight: 500;
                }
                .btn-detail:hover {
                    background: #dbeafe;
                }

                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0,0,0,0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    padding: 20px;
                }
                .modal-content {
                    background: white;
                    border-radius: 12px;
                    width: 100%;
                    max-width: 900px;
                    max-height: 90vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                }
                .modal-header {
                    padding: 20px 24px;
                    border-bottom: 1px solid #e5e7eb;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .modal-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                    color: #111827;
                }
                .btn-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #6b7280;
                }
                .modal-body {
                    padding: 24px;
                    overflow-y: auto;
                }
                
                .badge {
                    padding: 4px 12px;
                    border-radius: 99px;
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: capitalize;
                    color: white;
                }

                @media (max-width: 768px) {
                    .header-actions {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    .filters {
                        width: 100%;
                        flex-wrap: wrap;
                    }
                    .filter-select {
                        flex: 1;
                    }
                }
            `}</style>
        </div>
    );
}

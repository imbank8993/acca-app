'use client';

import { useState, useEffect, useMemo } from 'react';
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

    const categoryColors: Record<string, string> = {
        'Sesuai': '#10b981',
        'Kosong': '#ef4444',
        'Terlambat': '#f97316',
        'Tukaran/Diganti': '#3b82f6',
        'Digabung': '#14b8a6',
        'Tim teaching': '#6366f1',
        'Penugasan dengan pendampingan': '#8b5cf6',
        'Penugasan tanpa pendampingan': '#d946ef',
        'Lainnya': '#6b7280'
    };

    const getCategoryColor = (cat: string) => categoryColors[cat] || '#6b7280';
    const router = useRouter();

    const summaryStats = useMemo(() => {
        if (!data?.globalStats) return { total: 0, topCategory: '-', topPercentage: 0 };
        const counts = Object.values(data.globalStats) as number[];
        const total = counts.reduce((a, b) => a + b, 0);

        // Find top category
        let max = 0;
        let top = '-';
        Object.entries(data.globalStats).forEach(([cat, val]: [string, any]) => {
            if (val > max) {
                max = val;
                top = cat;
            }
        });

        return {
            total,
            topCategory: top,
            topPercentage: total > 0 ? Math.round((max / total) * 100) : 0
        };
    }, [data]);

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
                    const cats = [...new Set(data.map(d => d.kategori_kehadiran).filter(Boolean))];
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
        { value: '1', label: 'Januari' }, { value: '2', label: 'Februari' },
        { value: '3', label: 'Maret' }, { value: '4', label: 'April' },
        { value: '5', label: 'Mei' }, { value: '6', label: 'Juni' },
        { value: '7', label: 'Juli' }, { value: '8', label: 'Agustus' },
        { value: '9', label: 'September' }, { value: '10', label: 'Oktober' },
        { value: '11', label: 'November' }, { value: '12', label: 'Desember' }
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => String(currentYear - i));

    const categoryInitials: Record<string, string> = {
        'Sesuai': 'SS', 'Kosong': 'KS', 'Terlambat': 'TL', 'Tukaran/Diganti': 'TD',
        'Digabung': 'DG', 'Tim teaching': 'TT', 'Penugasan dengan pendampingan': 'PDP',
        'Penugasan tanpa pendampingan': 'PTP', 'Lainnya': 'LN'
    };

    const PremiumChart = ({ stats }: { stats: any }) => {
        if (!stats) return null;
        const chartCategories = categoriesList.length > 0 ? categoriesList : Object.keys(stats);
        const maxValue = Math.max(...Object.values(stats) as number[], 1);
        const chartHeight = 300;
        const barWidth = 44;
        const gap = 36;
        const leftPadding = 50;
        const bottomPadding = 60;
        const chartWidth = Math.max(chartCategories.length * (barWidth + gap) + gap + leftPadding, 800);

        return (
            <div className="premium-chart">
                <svg width="100%" height={chartHeight + bottomPadding} viewBox={`0 0 ${chartWidth} ${chartHeight + bottomPadding}`}>
                    <defs>
                        {chartCategories.map((cat, i) => (
                            <linearGradient key={`grad-${i}`} id={`grad-${i}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor={getCategoryColor(cat)} />
                                <stop offset="100%" stopColor={getCategoryColor(cat)} stopOpacity="0.6" />
                            </linearGradient>
                        ))}
                    </defs>

                    {/* Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((p, i) => (
                        <g key={i}>
                            <line
                                x1={leftPadding}
                                y1={chartHeight * (1 - p)}
                                x2={chartWidth}
                                y2={chartHeight * (1 - p)}
                                stroke="var(--n-border)"
                                strokeDasharray="4 4"
                            />
                            <text x={leftPadding - 10} y={chartHeight * (1 - p) + 4} textAnchor="end" fontSize="11" fill="var(--n-muted)" fontWeight="600">
                                {Math.round(maxValue * p)}
                            </text>
                        </g>
                    ))}

                    {chartCategories.map((cat, i) => {
                        const val = stats[cat] || 0;
                        const barH = (val / maxValue) * (chartHeight - 40);
                        const x = leftPadding + gap + i * (barWidth + gap);
                        const y = chartHeight - barH;

                        return (
                            <g key={cat} className="bar-group">
                                <rect
                                    x={x} y={y} width={barWidth} height={barH}
                                    fill={`url(#grad-${i})`} rx="12"
                                    className="p-bar"
                                >
                                    <title>{cat}: {val}</title>
                                </rect>
                                <text
                                    x={x + barWidth / 2} y={y - 12}
                                    textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--n-ink)"
                                >
                                    {val > 0 ? val : ''}
                                </text>
                                <text
                                    x={x + barWidth / 2} y={chartHeight + 25}
                                    textAnchor="middle" fontSize="12" fontWeight="750" fill="var(--n-ink)"
                                >
                                    {categoryInitials[cat] || cat.substring(0, 2).toUpperCase()}
                                </text>
                                <text
                                    x={x + barWidth / 2} y={chartHeight + 42}
                                    textAnchor="middle" fontSize="10" fontWeight="500" fill="var(--n-muted)"
                                >
                                    {cat.length > 10 ? cat.substring(0, 8) + '...' : cat}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        );
    };

    return (
        <div className="rekap-wrapper">
            {/* NEW PREMIUM HERO SECTION */}
            <div className="rekap-hero">
                <div className="hero-main">
                    <div className="hero-badge">REKAPITULASI JURNAL</div>
                    <h1>Analisis Kinerja Pengajaran</h1>
                    <p>Ringkasan statistik kehadiran dan kepatuhan pengisian jurnal guru secara mendalam.</p>

                    <div className="hero-controls">
                        {!showAll && (
                            <div className="filter-group">
                                <select value={filterMonth} onChange={(e) => setFilterMonth(e.target.value)} className="hero-select">
                                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                                <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="hero-select">
                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        )}
                        <button className={`mode-btn ${showAll ? 'active' : ''}`} onClick={() => setShowAll(!showAll)}>
                            {showAll ? 'View Monthly' : 'View All Time'}
                        </button>
                    </div>
                </div>

                <div className="rekap-stats-grid">
                    <div className="r-stat-card">
                        <div className="r-stat-icon gold"><i className="bi bi-journal-check"></i></div>
                        <div className="r-stat-info">
                            <span className="r-val">{summaryStats.total}</span>
                            <span className="r-label">Total Entri</span>
                        </div>
                    </div>
                    <div className="r-stat-card">
                        <div className="r-stat-icon green"><i className="bi bi-star-fill"></i></div>
                        <div className="r-stat-info">
                            <span className="r-val">{summaryStats.topPercentage}%</span>
                            <span className="r-label">{summaryStats.topCategory}</span>
                        </div>
                    </div>
                    <div className="r-refresh-box">
                        <button className="p-refresh-btn" onClick={fetchRekap} disabled={loading}>
                            <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
                        </button>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="p-loading">
                    <div className="loader"></div>
                    <span>Menganalisis data...</span>
                </div>
            ) : (
                <div className="rekap-content fade-up">
                    {/* GLOBAL CHART */}
                    <div className="p-card chart-section">
                        <div className="p-card-header">
                            <div className="header-info">
                                <h3>Distribusi Kehadiran Global</h3>
                                <p>Persentase kategori jurnal dari seluruh pengajar</p>
                            </div>
                        </div>
                        <div className="chart-scroll">
                            <PremiumChart stats={data?.globalStats} />
                        </div>
                    </div>

                    {/* TEACHER LIST */}
                    <div className="p-card list-section">
                        <div className="p-card-header">
                            <div className="header-info">
                                <h3>Data Perpanjangan Guru</h3>
                                <p>Rincian jumlah sesi berdasarkan kategori</p>
                            </div>
                        </div>

                        {/* DESKTOP TABLE */}
                        <div className="p-table-container desktop-only">
                            <table className="p-table">
                                <thead>
                                    <tr>
                                        <th className="col-name">GURU</th>
                                        {categoriesList.map(cat => (
                                            <th key={cat} className="col-status">
                                                <span className="th-abbr" title={cat}>{categoryInitials[cat] || cat.substring(0, 2)}</span>
                                            </th>
                                        ))}
                                        <th className="col-status">HASIL</th>
                                        <th className="col-status">AKSI</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data?.teacherStats?.map((teacher: any, idx: number) => (
                                        <tr key={idx} className="p-row">
                                            <td className="col-name">
                                                <div className="t-profile">
                                                    <div className="t-info">
                                                        <span className="t-name">{teacher.nama}</span>
                                                        <span className="t-nip">{teacher.nip || '-'}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            {categoriesList.map(cat => {
                                                const count = teacher.categories?.[cat] || 0;
                                                return (
                                                    <td key={cat} className="col-status">
                                                        {count > 0 ? (
                                                            <span className="p-count" style={{ borderColor: getCategoryColor(cat), color: getCategoryColor(cat) }}>{count}</span>
                                                        ) : <span className="p-zero">-</span>}
                                                    </td>
                                                );
                                            })}
                                            <td className="col-status">
                                                <div className="t-total">{teacher.total}</div>
                                            </td>
                                            <td className="col-status">
                                                <button
                                                    className="p-action-btn"
                                                    onClick={() => setSelectedTeacher(teacher)}
                                                    title="Detail"
                                                >
                                                    <i className="bi bi-eye"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* MOBILE CARDS */}
                        <div className="mobile-only">
                            <div className="m-rekap-list">
                                {data?.teacherStats?.map((teacher: any, idx: number) => (
                                    <div key={idx} className="m-rekap-card">
                                        <div className="m-card-top" onClick={() => setSelectedTeacher(teacher)}>
                                            <div className="t-profile">
                                                <div className="t-info">
                                                    <span className="t-name">{teacher.nama}</span>
                                                    <span className="t-nip">{teacher.nip}</span>
                                                </div>
                                            </div>
                                            <div className="t-total-box" onClick={() => setSelectedTeacher(teacher)} style={{ cursor: 'pointer' }}>
                                                <span className="total-val"><i className="bi bi-eye"></i></span>
                                                <span className="total-lbl">Lihat</span>
                                            </div>
                                        </div>
                                        <div className="m-card-stats">
                                            {categoriesList.map(cat => {
                                                const count = teacher.categories?.[cat] || 0;
                                                if (count === 0) return null;
                                                return (
                                                    <div key={cat} className="m-stat-tag" style={{ background: `${getCategoryColor(cat)}15`, color: getCategoryColor(cat) }}>
                                                        {categoryInitials[cat] || cat.substring(0, 2)}: {count}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PREMIUM MODAL */}
            {selectedTeacher && (
                <div className="p-modal-overlay" onClick={() => setSelectedTeacher(null)}>
                    <div className="p-modal-content" onClick={e => e.stopPropagation()}>
                        <div className="p-modal-header">
                            <div className="header-left">
                                <div className="t-info">
                                    <h3>{selectedTeacher.nama}</h3>
                                    <p>{selectedTeacher.nip || 'NIP Tidak Tersedia'}</p>
                                </div>
                            </div>
                            <button className="modal-close" onClick={() => setSelectedTeacher(null)}><i className="bi bi-x-lg"></i></button>
                        </div>
                        <div className="p-modal-body">
                            <div className="m-scroll-area">
                                <table className="modal-table">
                                    <thead>
                                        <tr>
                                            <th>TANGGAL & JAM</th>
                                            <th>KELAS & MAPEL</th>
                                            <th>MATERI</th>
                                            <th>STATUS</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTeacher.details.map((detail: any, idx: number) => (
                                            <tr key={idx}>
                                                <td>
                                                    <span className="d-date">{new Date(detail.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                                                    <span className="d-time">Jam Ke-{detail.jam_ke}</span>
                                                </td>
                                                <td>
                                                    <span className="d-kelas">{detail.kelas}</span>
                                                    <span className="d-mapel">{detail.mata_pelajaran}</span>
                                                </td>
                                                <td><p className="d-materi">{detail.materi || '-'}</p></td>
                                                <td>
                                                    <span className="p-status-chip" style={{ background: getCategoryColor(detail.kategori) }}>
                                                        {detail.kategori}
                                                    </span>
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
                .rekap-wrapper {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 24px;
                    font-family: 'Inter', system-ui, sans-serif;
                    overflow-x: hidden; /* Prevent body scroll from chart/table */
                }

                /* HERO SECTION */
                .rekap-hero {
                    background: linear-gradient(135deg, #001F5C 0%, #0038A8 100%);
                    border-radius: 36px;
                    padding: 48px;
                    color: white;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 40px;
                    box-shadow: 0 25px 50px -12px rgba(0, 56, 168, 0.4);
                    position: relative;
                    overflow: hidden;
                }

                .rekap-hero::before {
                    content: ''; position: absolute; top: -50px; right: -50px; width: 300px; height: 300px;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                }

                .hero-badge {
                    display: inline-block; padding: 6px 16px; background: rgba(255,255,255,0.15);
                    border-radius: 99px; font-size: 0.75rem; font-weight: 700; border: 1px solid rgba(255,255,255,0.2);
                    backdrop-filter: blur(10px); letter-spacing: 1px; margin-bottom: 20px;
                }

                .hero-main h1 { font-size: 2.22rem; font-weight: 800; margin-bottom: 12px; letter-spacing: -1px; }
                .hero-main p { font-size: 0.95rem; opacity: 0.85; max-width: 500px; line-height: 1.6; margin-bottom: 32px; }

                .hero-controls { display: flex; gap: 16px; align-items: center; }
                .filter-group { display: flex; gap: 8px; background: rgba(0,0,0,0.2); padding: 5px; border-radius: 16px; }
                .hero-select {
                    background: transparent; border: none; color: white; padding: 8px 12px; font-weight: 600;
                    cursor: pointer; border-radius: 12px; outline: none;
                }
                .hero-select option { background: #001F5C; }
                .hero-select:hover { background: rgba(255,255,255,0.1); }

                .mode-btn {
                    padding: 12px 24px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.3);
                    background: rgba(255,255,255,0.1); color: white; font-weight: 700; cursor: pointer;
                    transition: all 0.2s;
                }
                .mode-btn:hover { background: white; color: #0038A8; }
                .mode-btn.active { background: white; color: #0038A8; }

                .rekap-stats-grid { display: flex; gap: 20px; align-items: stretch; }
                .r-stat-card {
                    background: rgba(255,255,255,0.1); backdrop-filter: blur(20px);
                    padding: 24px; border-radius: 28px; border: 1px solid rgba(255,255,255,0.15);
                    display: flex; align-items: center; gap: 20px; min-width: 200px;
                }
                .r-stat-icon {
                    width: 54px; height: 54px; border-radius: 18px; display: flex;
                    align-items: center; justify-content: center; font-size: 1.4rem;
                }
                .r-stat-icon.gold { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }
                .r-stat-icon.green { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
                .r-stat-info { display: flex; flex-direction: column; }
                .r-val { font-size: 1.5rem; font-weight: 850; line-height: 1; }
                .r-label { font-size: 0.75rem; opacity: 0.7; font-weight: 600; margin-top: 4px; }
                
                .r-refresh-box { display: flex; align-items: center; }
                .p-refresh-btn {
                    width: 54px; height: 54px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.2);
                    background: rgba(255,255,255,0.1); color: white; cursor: pointer; transition: all 0.3s;
                    display: flex; align-items: center; justify-content: center; font-size: 1.4rem;
                }
                .p-refresh-btn:hover { background: white; color: #0038A8; transform: rotate(180deg); }

                /* PREMIUM CARD SYSTEM */
                .p-card {
                    background: white; border-radius: 32px; padding: 32px; border: 1px solid var(--n-border);
                    box-shadow: var(--n-shadow-2); margin-bottom: 32px;
                }
                .p-card-header { margin-bottom: 32px; }
                .header-info h3 { font-size: 1.2rem; font-weight: 800; color: #0F172A; }
                .header-info p { color: #64748B; font-size: 0.85rem; margin-top: 4px; }

                /* CHART */
                .chart-section { background: #F8FAFC; }
                .chart-scroll { overflow-x: auto; padding-bottom: 20px; }
                .p-bar { transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
                .p-bar:hover { filter: brightness(1.1); transform-box: fill-box; transform: translateY(-5px); cursor: pointer; }

                /* PREMIUM TABLE */
                .p-table-container { 
                    background: white; 
                    border-radius: 24px; 
                    overflow-x: auto; 
                    border: 1px solid var(--n-soft);
                    width: 100%;
                }
                .p-table { 
                    width: 100%; 
                    min-width: 900px; /* Ensure columns have enough space before squishing */
                    border-collapse: separate; 
                    border-spacing: 0; 
                }
                .p-table th {
                    background: #F1F5F9; padding: 16px 12px; text-align: left; font-size: 0.7rem;
                    text-transform: uppercase; letter-spacing: 1.5px; color: #64748B; font-weight: 800;
                }
                .p-row td { padding: 12px 12px; border-bottom: 1px solid #F1F5F9; vertical-align: middle; }
                
                .col-name { min-width: 250px; padding-left: 24px !important; }
                .col-status { width: 60px; text-align: center !important; }
                .p-table th.col-status { text-align: center !important; }
                .p-row:hover { background: #F8FAFC; }
                
                .t-profile { display: flex; align-items: center; gap: 16px; }
                .t-avatar {
                    width: 44px; height: 44px; border-radius: 14px; background: #E2E8F0;
                    display: flex; align-items: center; justify-content: center;
                    font-weight: 800; color: #0038A8; font-size: 1.1rem;
                }
                .t-avatar.large { width: 56px; height: 56px; font-size: 1.4rem; border-radius: 18px; }
                .t-name { 
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                    font-weight: 750; 
                    color: #1E293B; 
                    font-size: 0.875rem; 
                    line-height: 1.2; 
                }
                .t-nip { font-size: 0.75rem; color: #94A3B8; }

                .th-abbr { cursor: help; text-decoration: underline dotted; }
                .p-count {
                    display: inline-block; padding: 4px 8px; border-radius: 8px; border: 1.5px solid;
                    font-weight: 800; font-size: 0.8rem; min-width: 32px;
                }
                .p-zero { color: #CBD5E1; font-weight: 400; }
                .t-total { font-weight: 900; font-size: 1.1rem; color: #0038A8; }
                
                .p-action-btn {
                    padding: 10px 18px; border-radius: 12px; border: none; background: #EFF6FF;
                    color: #0038A8; font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: all 0.2s;
                }
                .p-action-btn:hover { background: #0038A8; color: white; transform: scale(1.05); }

                /* MOBILE REKAP */
                .m-rekap-card { background: white; border-radius: 24px; border: 1px solid var(--n-border); padding: 20px; margin-bottom: 16px; }
                .m-card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; cursor: pointer; }
                .t-total-box { text-align: center; background: #F8FAFC; padding: 8px 16px; border-radius: 16px; border: 1px solid #E2E8F0; }
                .total-val { display: block; font-size: 1.1rem; font-weight: 950; color: #0038A8; }
                .total-lbl { font-size: 0.6rem; color: #64748B; text-transform: uppercase; font-weight: 700; }
                .m-card-stats { display: flex; flex-wrap: wrap; gap: 8px; }
                .m-stat-tag { padding: 6px 12px; border-radius: 8px; font-size: 0.75rem; font-weight: 750; }

                /* PREMIUM MODAL */
                .p-modal-overlay {
                    position: fixed; inset: 0; background: rgba(0, 31, 92, 0.4);
                    backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 24px;
                }
                .p-modal-content {
                    background: white; border-radius: 36px; width: 100%; max-width: 1000px;
                    max-height: 85vh; display: flex; flex-direction: column; overflow: hidden;
                    box-shadow: 0 40px 100px -20px rgba(0,0,0,0.3);
                }
                .p-modal-header {
                    padding: 32px; border-bottom: 1px solid #F1F5F9; display: flex; justify-content: space-between; align-items: center;
                }
                .header-left { display: flex; align-items: center; gap: 20px; }
                .header-left h3 { font-size: 1.3rem; font-weight: 850; color: #0F172A; }
                .header-left p { color: #64748B; font-weight: 500; font-size: 0.85rem; }
                .modal-close {
                    width: 44px; height: 44px; border-radius: 14px; border: none; background: #F1F5F9;
                    color: #64748B; cursor: pointer; display: flex; align-items: center; justify-content: center;
                }
                .p-modal-body { padding: 32px; overflow: hidden; display: flex; flex-direction: column; }
                .m-scroll-area { overflow-y: auto; flex: 1; }
                
                .modal-table { width: 100%; border-collapse: separate; border-spacing: 0 12px; }
                .modal-table th { text-align: left; padding: 0 12px 12px 12px; font-size: 0.7rem; font-weight: 800; color: #94A3B8; text-transform: uppercase; }
                .modal-table tr { margin-bottom: 8px; transition: all 0.2s; }
                .modal-table td { background: white; padding: 16px; border-top: 1px solid #F8FAFC; border-bottom: 1px solid #F8FAFC; vertical-align: middle; }
                .modal-table td:first-child { border-left: 1px solid #F8FAFC; border-radius: 16px 0 0 16px; }
                .modal-table td:last-child { border-right: 1px solid #F8FAFC; border-radius: 0 16px 16px 0; }
                .modal-table tr:hover td { background: #F8FAFC; border-color: #E2E8F0; }

                .d-date { display: block; font-weight: 800; color: #1E293B; }
                .d-time { font-size: 0.8rem; color: #64748B; }
                .d-kelas { display: block; font-weight: 750; color: #0038A8; font-size: 0.95rem; }
                .d-mapel { font-size: 0.8rem; color: #64748B; font-weight: 500; }
                .d-materi { font-size: 0.85rem; color: #64748B; max-width: 300px; white-space: normal; line-height: 1.4; }
                .p-status-chip { 
                    padding: 6px 14px; border-radius: 99px; font-size: 0.75rem; 
                    font-weight: 750; color: white; display: inline-block; white-space: nowrap;
                }

                /* ANIMATIONS */
                .fade-up { animation: fadeUp 0.6s ease-out; }
                @keyframes fadeUp {
                    from { opacity: 0; transform: translateY(20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                .p-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px; gap: 20px; color: #0038A8; }
                .loader { width: 48px; height: 48px; border: 5px solid #E2E8F0; border-top-color: #0038A8; border-radius: 50%; animation: spin 1s linear infinite; }

                .desktop-only { display: block; }
                .mobile-only { display: none; }

                @media (max-width: 1024px) {
                    .rekap-hero { flex-direction: column; text-align: center; gap: 40px; padding: 40px 24px; }
                    .rekap-stats-grid { width: 100%; justify-content: center; }
                    .hero-controls { justify-content: center; flex-wrap: wrap; }
                }

                @media (max-width: 768px) {
                    .hero-main h1 { font-size: 2rem; }
                    .rekap-stats-grid { display: grid; grid-template-columns: 1fr; }
                    .desktop-only { display: none; }
                    .mobile-only { display: block; }
                    .p-modal-content { border-radius: 0; max-height: 100vh; }
                    .p-modal-header { padding: 24px; }
                    .p-modal-body { padding: 16px; }
                    .modal-table tr { display: flex; flex-direction: column; border: 1px solid #F1F5F9; border-radius: 16px; padding: 12px; margin-bottom: 12px; background: white; }
                    .modal-table td { padding: 8px 4px; border: none !important; }
                    .modal-table thead { display: none; }
                }
            `}</style>
        </div>
    );
}

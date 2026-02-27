'use client';

import { useState, useEffect, useMemo } from 'react';

export default function MonitoringPage() {
    const [activeTab, setActiveTab] = useState<'users' | 'activity'>('users');
    const [users, setUsers] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const stats = useMemo(() => {
        const onlineCount = users.filter(u => u.is_online).length;
        const totalUsers = users.length;
        const totalActivity = activities.length;
        return { onlineCount, totalUsers, totalActivity };
    }, [users, activities]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [usersRes, activityRes] = await Promise.all([
                fetch('/api/monitoring/users'),
                fetch('/api/monitoring/activity')
            ]);

            const usersData = await usersRes.json();
            const activityData = await activityRes.json();

            if (usersData.success) setUsers(usersData.data);
            if (activityData.success) setActivities(activityData.data);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="monitoring-wrapper">
            {/* Header Hero Section */}
            <div className="monitoring-hero">
                <div className="hero-content">
                    <div className="hero-badge">
                        <span className="pulse-dot"></span>
                        LIVE MONITORING SYSTEM
                    </div>
                    <h1>Pusat Kontrol Aktivitas</h1>
                    <p>Pantau status pengguna dan log aktivitas sistem secara real-time dengan presisi tinggi.</p>
                </div>

                <div className="stats-grid">
                    <div className="stat-card">
                        <div className="stat-icon users-icon"><i className="bi bi-people-fill"></i></div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.totalUsers}</span>
                            <span className="stat-label">Total User</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon online-icon"><i className="bi bi-broadcast"></i></div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.onlineCount}</span>
                            <span className="stat-label">Sedang Online</span>
                        </div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon activity-icon"><i className="bi bi-lightning-charge-fill"></i></div>
                        <div className="stat-info">
                            <span className="stat-value">{stats.totalActivity}</span>
                            <span className="stat-label">Log Aktivitas</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation & Controls */}
            <div className="tabs-container">
                <div className="tabs-pill">
                    <button
                        className={`tab-item ${activeTab === 'users' ? 'active' : ''}`}
                        onClick={() => setActiveTab('users')}
                    >
                        <i className="bi bi-person-badge"></i>
                        Status Pengguna
                    </button>
                    <button
                        className={`tab-item ${activeTab === 'activity' ? 'active' : ''}`}
                        onClick={() => setActiveTab('activity')}
                    >
                        <i className="bi bi-journal-text"></i>
                        Log Aktivitas
                    </button>
                </div>

                <button className="premium-refresh-btn" onClick={fetchData} disabled={loading}>
                    <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
                    {loading ? 'Memperbarui...' : 'Segarkan Data'}
                </button>
            </div>

            {/* Content Area */}
            <div className="monitoring-content">
                {activeTab === 'users' ? (
                    <div className="fade-in">
                        {/* Desktop Table View */}
                        <div className="premium-table-container desktop-only">
                            <table className="premium-table">
                                <thead>
                                    <tr>
                                        <th>PENGGUNA</th>
                                        <th>STATUS & AKSES</th>
                                        <th>LOKASI TERAKHIR</th>
                                        <th>WAKTU</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {users.length > 0 ? users.map((user) => (
                                        <tr key={user.id} className="table-row">
                                            <td>
                                                <div className="user-profile">
                                                    {user.foto_profil ? (
                                                        <img src={user.foto_profil} alt="" className="user-avatar" />
                                                    ) : (
                                                        <div className="user-avatar-placeholder">{user.nama?.charAt(0)}</div>
                                                    )}
                                                    <div className="user-details">
                                                        <span className="user-full-name">{user.nama}</span>
                                                        <span className="user-sub">{user.username || user.email}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="status-access">
                                                    {user.is_online ? (
                                                        <span className="status-pill online">
                                                            <span className="dot pulse"></span> Aktif
                                                        </span>
                                                    ) : (
                                                        <span className="status-pill offline">Idle</span>
                                                    )}
                                                    <span className="role-chip">{user.role}</span>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="location-info">
                                                    <i className="bi bi-geo-alt"></i> {
                                                        user.last_location ? (
                                                            user.last_location === '/' ? 'Beranda' :
                                                                user.last_location === '/monitoring' ? 'Halaman Monitoring' :
                                                                    user.last_location === '/absensi' ? 'Halaman Absensi' :
                                                                        user.last_location === '/pengaturan-users' ? 'Pengaturan User' :
                                                                            user.last_location === '/master-data' ? 'Master Data' :
                                                                                user.last_location.startsWith('/api') ? 'System API' :
                                                                                    user.last_location.split('/')[1]?.replace(/-/g, ' ') || 'Dashboard'
                                                        ) : 'Dashboard'
                                                    }
                                                </span>
                                            </td>
                                            <td>
                                                <span className="time-info">{user.last_seen_text}</span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="empty-state">Tidak ada data pengguna terdeteksi</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile Optimized Cards */}
                        <div className="mobile-only">
                            <div className="mobile-cards-grid">
                                {users.map((user) => (
                                    <div key={user.id} className="premium-mobile-card">
                                        <div className="m-card-header">
                                            <div className="user-profile">
                                                {user.foto_profil ? (
                                                    <img src={user.foto_profil} alt="" className="user-avatar" />
                                                ) : (
                                                    <div className="user-avatar-placeholder">{user.nama?.charAt(0)}</div>
                                                )}
                                                <div className="user-details">
                                                    <span className="user-full-name">{user.nama}</span>
                                                    <span className="user-sub">{user.role}</span>
                                                </div>
                                            </div>
                                            {user.is_online && <span className="m-pulse"></span>}
                                        </div>
                                        <div className="m-card-footer">
                                            <span className="m-time"><i className="bi bi-clock"></i> {user.last_seen_text}</span>
                                            <span className={`m-status-text ${user.is_online ? 'online' : ''}`}>
                                                {user.is_online ? 'Sedang Aktif' : 'Offline'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="activity-timeline fade-in">
                        {activities.length > 0 ? activities.map((log) => (
                            <div key={log.id} className="timeline-item">
                                <div className="timeline-marker">
                                    <div className={`marker-dot ${log.action?.includes('delete') ? 'danger' : log.action?.includes('create') ? 'success' : ''}`}></div>
                                    <div className="marker-line"></div>
                                </div>
                                <div className="timeline-content">
                                    <div className="timeline-header">
                                        <span className="tl-user">{log.users?.nama || 'System'}</span>
                                        <span className="tl-action">{log.action}</span>
                                        <span className="tl-time">{new Date(log.created_at).toLocaleString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                                    </div>
                                    {log.details && (
                                        <pre className="tl-details">
                                            {typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details}
                                        </pre>
                                    )}
                                </div>
                            </div>
                        )) : (
                            <div className="empty-state">Belum ada aktivitas tercatat hari ini.</div>
                        )}
                    </div>
                )}
            </div>

            <style jsx>{`
                .monitoring-wrapper {
                    max-width: 1400px;
                    margin: 0 auto;
                    padding: 20px;
                    font-family: 'Inter', sans-serif;
                }

                /* HERO SECTION */
                .monitoring-hero {
                    background: linear-gradient(135deg, var(--n-primary) 0%, var(--n-primary-dark) 100%);
                    border-radius: 32px;
                    padding: 48px;
                    color: white;
                    margin-bottom: 40px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    box-shadow: 0 20px 50px -15px rgba(0, 56, 168, 0.4);
                    position: relative;
                    overflow: hidden;
                }

                .monitoring-hero::after {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -10%;
                    width: 500px;
                    height: 500px;
                    background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                    pointer-events: none;
                }

                .hero-content h1 {
                    font-size: 2.8rem;
                    font-weight: 800;
                    margin: 12px 0;
                    letter-spacing: -1px;
                }

                .hero-content p {
                    font-size: 1.1rem;
                    opacity: 0.9;
                    max-width: 500px;
                    line-height: 1.6;
                }

                .hero-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    background: rgba(255, 255, 255, 0.15);
                    padding: 8px 16px;
                    border-radius: 99px;
                    font-size: 0.8rem;
                    font-weight: 700;
                    backdrop-filter: blur(10px);
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .pulse-dot {
                    width: 8px;
                    height: 8px;
                    background: #22c55e;
                    border-radius: 50%;
                    box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.4);
                    animation: pulse-ring 2s infinite;
                }

                /* STATS CARDS */
                .stats-grid {
                    display: flex;
                    gap: 20px;
                }

                .stat-card {
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(15px);
                    padding: 24px 32px;
                    border-radius: 24px;
                    border: 1px solid rgba(255, 255, 255, 0.15);
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    min-width: 200px;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }

                .stat-card:hover {
                    transform: translateY(-8px);
                    background: rgba(255, 255, 255, 0.15);
                }

                .stat-icon {
                    width: 56px;
                    height: 56px;
                    border-radius: 18px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                }

                .users-icon { background: rgba(59, 130, 246, 0.3); color: #93c5fd; }
                .online-icon { background: rgba(34, 197, 94, 0.3); color: #86efac; }
                .activity-icon { background: rgba(245, 158, 11, 0.3); color: #fcd34d; }

                .stat-value {
                    display: block;
                    font-size: 1.8rem;
                    font-weight: 800;
                }

                .stat-label {
                    font-size: 0.8rem;
                    opacity: 0.7;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                }

                /* TABS */
                .tabs-container {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 32px;
                }

                .tabs-pill {
                    background: var(--n-soft);
                    padding: 6px;
                    border-radius: 18px;
                    display: flex;
                    gap: 4px;
                    border: 1px solid var(--n-border);
                }

                .tab-item {
                    padding: 12px 24px;
                    border-radius: 14px;
                    border: none;
                    background: transparent;
                    color: var(--n-muted);
                    font-weight: 600;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    transition: all 0.2s;
                }

                .tab-item.active {
                    background: white;
                    color: var(--n-primary);
                    box-shadow: var(--n-shadow-soft);
                }

                .premium-refresh-btn {
                    padding: 12px 24px;
                    border-radius: 16px;
                    background: var(--n-card);
                    border: 1px solid var(--n-border);
                    color: var(--n-ink);
                    font-weight: 600;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .premium-refresh-btn:hover:not(:disabled) {
                    background: var(--n-soft);
                    border-color: var(--n-primary);
                    color: var(--n-primary);
                }

                /* PREMIUM TABLE */
                .premium-table-container {
                    background: var(--n-card);
                    border-radius: 24px;
                    padding: 12px;
                    box-shadow: var(--n-shadow);
                    border: 1px solid var(--n-border);
                }

                .premium-table {
                    width: 100%;
                    border-collapse: separate;
                    border-spacing: 0 8px;
                }

                .premium-table th {
                    padding: 20px 24px;
                    text-align: left;
                    font-size: 0.75rem;
                    text-transform: uppercase;
                    letter-spacing: 1.5px;
                    color: var(--n-muted);
                    font-weight: 700;
                }

                .table-row {
                    transition: all 0.2s;
                }

                .table-row:hover td {
                    background: var(--tb-hover);
                }

                .table-row td {
                    padding: 20px 24px;
                    background: transparent;
                    border-bottom: 1px solid var(--n-soft);
                }

                .user-profile {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .user-avatar {
                    width: 48px;
                    height: 48px;
                    border-radius: 16px;
                    object-fit: cover;
                    border: 2px solid white;
                    box-shadow: var(--n-shadow-soft);
                }

                .user-avatar-placeholder {
                    width: 48px;
                    height: 48px;
                    border-radius: 16px;
                    background: linear-gradient(135deg, var(--n-primary) 0%, var(--n-primary-light) 100%);
                    color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 800;
                    font-size: 1.2rem;
                }

                .user-full-name {
                    display: block;
                    font-weight: 700;
                    color: var(--n-ink);
                    font-size: 1rem;
                }

                .user-sub {
                    font-size: 0.85rem;
                    color: var(--n-muted);
                }

                .status-access {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }

                .status-pill {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    padding: 6px 14px;
                    border-radius: 99px;
                    font-size: 0.8rem;
                    font-weight: 700;
                }

                .status-pill.online { background: #dcfce7; color: #166534; }
                .status-pill.offline { background: var(--n-soft); color: var(--n-muted); }

                .role-chip {
                    font-size: 0.8rem;
                    color: var(--n-primary);
                    background: rgba(0, 56, 168, 0.08);
                    padding: 4px 10px;
                    border-radius: 8px;
                    font-weight: 600;
                }

                /* TIMELINE activity */
                .activity-timeline {
                    padding: 20px 40px;
                    border-left: 2px solid var(--n-border);
                    margin-left: 20px;
                }

                .timeline-item {
                    position: relative;
                    padding-bottom: 32px;
                }

                .timeline-marker {
                    position: absolute;
                    left: -49px;
                    top: 0;
                    height: 100%;
                }

                .marker-dot {
                    width: 16px;
                    height: 16px;
                    border-radius: 50%;
                    background: var(--n-primary);
                    border: 3px solid white;
                    box-shadow: 0 0 0 3px var(--n-border);
                }

                .marker-dot.success { background: #22c55e; }
                .marker-dot.danger { background: #ef4444; }

                .timeline-content {
                    background: var(--n-card);
                    padding: 24px;
                    border-radius: 20px;
                    border: 1px solid var(--n-border);
                    box-shadow: var(--n-shadow-soft);
                }

                .timeline-header {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    margin-bottom: 12px;
                }

                .tl-user { font-weight: 750; color: var(--n-ink); }
                .tl-action { color: var(--n-muted); font-size: 0.9rem; }
                .tl-time { margin-left: auto; font-size: 0.8rem; color: var(--n-muted); font-weight: 600; }

                .tl-details {
                    background: var(--n-bg);
                    padding: 12px;
                    border-radius: 12px;
                    font-size: 0.85rem;
                    color: var(--n-ink);
                    border: 1px solid var(--n-border);
                    white-space: pre-wrap;
                    font-family: 'JetBrains Mono', monospace;
                }

                /* MOBILE UI */
                .mobile-cards-grid {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 16px;
                }

                .premium-mobile-card {
                    background: var(--n-card);
                    border-radius: 24px;
                    padding: 20px;
                    border: 1px solid var(--n-border);
                    box-shadow: var(--n-shadow-soft);
                    position: relative;
                }

                .m-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 16px;
                }

                .m-pulse {
                    width: 12px;
                    height: 12px;
                    background: #22c55e;
                    border-radius: 50%;
                    box-shadow: 0 0 0 6px rgba(34, 197, 94, 0.2);
                }

                .m-card-footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding-top: 16px;
                    border-top: 1px solid var(--n-soft);
                }

                .m-time { font-size: 0.75rem; color: var(--n-muted); }
                .m-status-text { font-size: 0.75rem; font-weight: 700; color: var(--n-muted); text-transform: uppercase; }
                .m-status-text.online { color: #166534; }

                /* ANIMATIONS */
                .fade-in { animation: fadeIn 0.4s ease-out; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .spin { animation: spin 1s linear infinite; }
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

                .pulse { animation: pulse 2s infinite; }
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.4; transform: scale(0.9); }
                    100% { opacity: 1; transform: scale(1); }
                }

                @keyframes pulse-ring {
                    0% { transform: scale(0.3); opacity: 0.8; }
                    80%, 100% { transform: scale(1.5); opacity: 0; }
                }

                .desktop-only { display: block; }
                .mobile-only { display: none; }

                @media (max-width: 1024px) {
                    .monitoring-hero { flex-direction: column; text-align: center; gap: 40px; padding: 40px 24px; }
                    .stats-grid { width: 100%; justify-content: center; flex-wrap: wrap; }
                }

                @media (max-width: 768px) {
                    .monitoring-hero h1 { font-size: 2rem; }
                    .stats-grid { display: grid; grid-template-columns: 1fr; }
                    .tabs-container { flex-direction: column; gap: 16px; align-items: stretch; }
                    .premium-refresh-btn { justify-content: center; }
                    .desktop-only { display: none; }
                    .mobile-only { display: block; }
                    .timeline-item { padding-left: 0; }
                    .timeline-header { flex-direction: column; align-items: flex-start; gap: 4px; }
                    .tl-time { margin-left: 0; margin-top: 4px; }
                }
            `}</style>
        </div>
    );
}

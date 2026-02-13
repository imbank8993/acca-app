'use client';

import { useState, useEffect } from 'react';

export default function MonitoringPage() {
    const [activeTab, setActiveTab] = useState<'users' | 'activity'>('users');
    const [users, setUsers] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'users') {
                const res = await fetch('/api/monitoring/users');
                const data = await res.json();
                if (data.success) setUsers(data.data);
            } else {
                const res = await fetch('/api/monitoring/activity');
                const data = await res.json();
                if (data.success) setActivities(data.data);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // Auto-refresh every 30 seconds for monitoring
        const interval = setInterval(fetchData, 30000);
        return () => clearInterval(interval);
    }, [activeTab]);

    return (
        <div className="monitoring-container">
            <h1 className="page-title">Monitoring Aktivitas User</h1>

            <div className="tabs">
                <button
                    className={`tab-btn ${activeTab === 'users' ? 'active' : ''}`}
                    onClick={() => setActiveTab('users')}
                >
                    Status User
                </button>
                <button
                    className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
                    onClick={() => setActiveTab('activity')}
                >
                    Log Aktivitas
                </button>
                <button className="refresh-btn" onClick={fetchData}>
                    <i className="bi bi-arrow-clockwise"></i> Refresh
                </button>
            </div>

            <div className="content-area">
                {loading && <div className="loading">Memuat data...</div>}

                {!loading && activeTab === 'users' && (
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>User</th>
                                    <th>Role</th>
                                    <th>Status</th>
                                    <th>Terakhir Online</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user) => (
                                    <tr key={user.id}>
                                        <td className="user-cell">
                                            {user.foto_profil ? (
                                                <img src={user.foto_profil} alt="" className="avatar" />
                                            ) : (
                                                <div className="avatar-placeholder">{user.nama?.charAt(0)}</div>
                                            )}
                                            <div>
                                                <div className="user-name">{user.nama}</div>
                                                <div className="user-email">{user.email}</div>
                                            </div>
                                        </td>
                                        <td><span className="badge role-badge">{user.role}</span></td>
                                        <td>
                                            {user.is_online ? (
                                                <span className="status-badge online">
                                                    <span className="dot"></span> Online
                                                </span>
                                            ) : (
                                                <span className="status-badge offline">Offline</span>
                                            )}
                                        </td>
                                        <td className="text-gray-500">{user.last_seen_text}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && activeTab === 'activity' && (
                    <div className="activity-list">
                        {activities.map((log) => (
                            <div key={log.id} className="activity-item">
                                <div className="activity-icon">
                                    <i className="bi bi-person-circle"></i>
                                </div>
                                <div className="activity-content">
                                    <div className="activity-header">
                                        <span className="user-name">{log.users?.nama || 'Unknown User'}</span>
                                        <span className="activity-action">{log.action}</span>
                                        <span className="activity-time">{new Date(log.created_at).toLocaleString('id-ID')}</span>
                                    </div>
                                    {log.details && (
                                        <div className="activity-details">
                                            {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <style jsx>{`
                .monitoring-container {
                    padding: 24px;
                    max-width: 1200px;
                    margin: 0 auto;
                }
                .page-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 24px;
                    color: #1f2937;
                }
                .tabs {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 24px;
                    border-bottom: 1px solid #e5e7eb;
                    padding-bottom: 1px;
                }
                .tab-btn {
                    padding: 10px 20px;
                    background: none;
                    border: none;
                    border-bottom: 2px solid transparent;
                    cursor: pointer;
                    font-weight: 500;
                    color: #6b7280;
                    font-size: 1rem;
                }
                .tab-btn.active {
                    color: #0038A8;
                    border-bottom-color: #0038A8;
                }
                .refresh-btn {
                    margin-left: auto;
                    padding: 8px 16px;
                    background: #f3f4f6;
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }
                
                .content-area {
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
                    padding: 24px;
                    min-height: 400px;
                }

                /* Table Styles */
                .table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .table th, .table td {
                    padding: 16px;
                    text-align: left;
                    border-bottom: 1px solid #f3f4f6;
                }
                .table th {
                    font-weight: 600;
                    color: #4b5563;
                    background: #f9fafb;
                }
                .user-cell {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                .avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    object-fit: cover;
                }
                .avatar-placeholder {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background: #e5e7eb;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    color: #6b7280;
                }
                .user-name {
                    font-weight: 600;
                    color: #111827;
                }
                .badge {
                    padding: 4px 10px;
                    border-radius: 99px;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                .role-badge {
                    background: #eef2ff;
                    color: #4f46e5;
                }
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 4px 10px;
                    border-radius: 99px;
                    font-size: 0.875rem;
                    font-weight: 500;
                }
                .status-badge.online {
                    background: #dcfce7;
                    color: #166534;
                }
                .status-badge.offline {
                    background: #f3f4f6;
                    color: #6b7280;
                }
                .dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #16a34a;
                }

                /* Activity List Styles */
                .activity-list {
                    display: flex;
                    flex-direction: column;
                    gap: 16px;
                }
                .activity-item {
                    display: flex;
                    gap: 16px;
                    padding-bottom: 16px;
                    border-bottom: 1px solid #f3f4f6;
                }
                .activity-icon {
                    width: 40px;
                    height: 40px;
                    background: #f3f4f6;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #6b7280;
                    font-size: 1.25rem;
                }
                .activity-header {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-bottom: 4px;
                }
                .activity-action {
                    color: #4b5563;
                }
                .activity-time {
                    font-size: 0.875rem;
                    color: #9ca3af;
                    margin-left: auto;
                }
                .activity-details {
                    font-size: 0.875rem;
                    color: #6b7280;
                    background: #f9fafb;
                    padding: 8px;
                    border-radius: 6px;
                    margin-top: 4px;
                }
            `}</style>
        </div>
    );
}

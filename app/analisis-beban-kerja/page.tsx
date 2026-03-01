'use client';

import { useState, useMemo, useEffect } from 'react';
import TabJTM from './components/TabJTM';
import TabTugasTambahan from './components/TabTugasTambahan';
import TabPembagianTugas from './components/TabPembagianTugas';
import { hasPermission } from '@/lib/permissions-client';

type TabType = 'jtm' | 'tugas_tambahan' | 'pembagian_tugas';

export default function AnalisisBebanKerjaPage() {
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Fetch User Data on Mount
    useEffect(() => {
        async function loadUser() {
            try {
                const { supabase } = await import('@/lib/supabase');
                const { getUserByAuthId } = await import('@/lib/auth');

                const { data: { user: authUser } } = await supabase.auth.getUser();
                if (authUser) {
                    const dbUser = await getUserByAuthId(authUser.id);
                    setUser(dbUser);
                }
            } catch (error) {
                console.error('Failed to load user', error);
            } finally {
                setLoading(false);
            }
        }
        loadUser();
    }, []);

    const permissions = user?.permissions || [];
    const isAdmin = (user?.role === 'ADMIN') || (user?.roles?.some((r: string) => r.toUpperCase() === 'ADMIN')) || false;

    const tabs = useMemo(
        () => [
            { key: 'jtm', label: 'Struktur JP Mapel (JTM)', icon: 'bi-journal-bookmark' },
            { key: 'tugas_tambahan', label: 'JP Tugas Tambahan', icon: 'bi-person-badge' },
            { key: 'pembagian_tugas', label: 'Ploting & Analisis JP', icon: 'bi-bar-chart-steps' }
        ],
        []
    );

    const allowedTabs = useMemo(() => {
        if (!user) return [];
        return tabs.filter(tab => {
            // For analytical tasks, we usually reuse an existing permission or use a generic one if Admin.
            // Replace with actual permission check if defined (e.g. 'analisis_beban_kerja')
            return isAdmin || hasPermission(permissions, 'analisis_beban_kerja', `tab:${tab.key}`, isAdmin);
        });
    }, [user, permissions, isAdmin, tabs]);

    const [activeTab, setActiveTab] = useState<TabType>('jtm');

    // Update active tab once allowedTabs are determined
    useEffect(() => {
        if (allowedTabs.length > 0 && !allowedTabs.find(t => t.key === activeTab)) {
            setActiveTab(allowedTabs[0].key as TabType);
        }
    }, [allowedTabs, activeTab]);

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Memuat data...</div>;
    }

    if (!user) {
        return <div className="p-8 text-center text-red-500">Akses ditolak. Silakan login kembali.</div>;
    }

    return (
        <div className="abk-container">
            {/* Header */}
            <div className="abk-header">
                <div className="abk-titleArea">
                    <div className="abk-iconWrapper">
                        <i className="bi bi-briefcase-fill"></i>
                    </div>
                    <div>
                        <h1>Analisis Beban Kerja</h1>
                        <p>Mengelola ekuivalensi JP Mapel, JP Tugas Tambahan, dan Ploting Beban Guru minimal 24 JP.</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="abk-tabs" role="tablist" aria-label="Analisis Beban Kerja Tabs">
                {allowedTabs.map((tab) => (
                    <button
                        key={tab.key}
                        role="tab"
                        aria-selected={activeTab === tab.key}
                        className={`abk-tab ${activeTab === tab.key ? 'isActive' : ''}`}
                        onClick={() => setActiveTab(tab.key as TabType)}
                        type="button"
                    >
                        <i className={`bi ${tab.icon} abk-tabIcon`}></i>
                        <span className="abk-tabText">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="abk-content" role="tabpanel">
                {activeTab === 'jtm' && <TabJTM user={user} />}
                {activeTab === 'tugas_tambahan' && <TabTugasTambahan user={user} />}
                {activeTab === 'pembagian_tugas' && <TabPembagianTugas user={user} />}
            </div>

            <style jsx>{`
                /* =====================================================
                   ANALISIS BEBAN KERJA PAGE - PREMIUM DESIGN
                ====================================================== */
                .abk-container {
                    padding: 0;
                    margin: 0;
                    width: 100%;
                    animation: fadeIn 0.4s ease-out forwards;
                }

                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                /* HEADER */
                .abk-header {
                    background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                    padding: 32px 40px;
                    border-radius: 24px;
                    box-shadow: 0 10px 30px rgba(15, 23, 42, 0.2);
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    margin-bottom: 24px;
                    position: relative;
                    overflow: hidden;
                }

                .abk-header::after {
                    content: '';
                    position: absolute;
                    top: -50%;
                    right: -10%;
                    width: 300px;
                    height: 300px;
                    background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 70%);
                    border-radius: 50%;
                    pointer-events: none;
                }

                .abk-titleArea {
                    display: flex;
                    align-items: center;
                    gap: 20px;
                    z-index: 1;
                }

                .abk-iconWrapper {
                    width: 60px;
                    height: 60px;
                    border-radius: 16px;
                    background: rgba(255, 255, 255, 0.1);
                    backdrop-filter: blur(10px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #38bdf8;
                    font-size: 28px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
                }

                .abk-titleArea h1 {
                    font-size: 1.8rem;
                    font-weight: 800;
                    color: white;
                    margin: 0 0 6px 0;
                    letter-spacing: -0.02em;
                }

                .abk-titleArea p {
                    color: rgba(255, 255, 255, 0.7);
                    font-size: 0.95rem;
                    margin: 0;
                    font-weight: 500;
                }

                /* TABS */
                .abk-tabs {
                    display: flex;
                    justify-content: center;
                    gap: 12px;
                    flex-wrap: wrap;
                    padding: 6px;
                    background: #f8fafc;
                    border-radius: 20px;
                    border: 1px solid #e2e8f0;
                    margin-bottom: 24px;
                }

                .abk-tab {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 12px 24px;
                    background: transparent;
                    border: none;
                    border-radius: 14px;
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: #64748b;
                    cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    white-space: nowrap;
                    position: relative;
                }

                .abk-tab:hover {
                    color: #0f172a;
                    background: rgba(15, 23, 42, 0.05);
                }

                .abk-tab.isActive {
                    background: white;
                    color: #0ea5e9;
                    box-shadow: 0 4px 12px rgba(14, 165, 233, 0.15);
                    transform: translateY(-2px);
                }

                .abk-tabIcon {
                    font-size: 1.2rem;
                }
                
                /* CONTENT AREA */
                .abk-content {
                    padding: 0;
                    min-height: 500px;
                    background: transparent;
                }

                /* MOBILE RESPONSIVE */
                @media (max-width: 768px) {
                    .abk-header {
                        padding: 24px;
                    }
                    .abk-titleArea {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 16px;
                    }
                    .abk-iconWrapper {
                        width: 48px;
                        height: 48px;
                        font-size: 22px;
                    }
                    .abk-titleArea h1 {
                        font-size: 1.5rem;
                    }
                    .abk-tabs {
                        justify-content: flex-start;
                        overflow-x: auto;
                        scrollbar-width: none;
                        padding: 10px;
                    }
                    .abk-tabs::-webkit-scrollbar {
                        display: none;
                    }
                    .abk-tab {
                        padding: 10px 16px;
                        font-size: 0.9rem;
                    }
                }
            `}</style>
        </div>
    );
}

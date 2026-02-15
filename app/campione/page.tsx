
'use client';

import { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import MedalPodium from './components/MedalPodium';
import CampioneDetailModal from './components/CampioneDetailModal';
import LeaderboardList from './components/LeaderboardList';

interface Winner {
    nip: string;
    nama: string;
    count: number;
    details: any[];
}

interface CampioneData {
    jamKosong: Winner[];
    penugasan: Winner[];
    terlambat: Winner[];
}

export default function CampionePage() {
    const [activeTab, setActiveTab] = useState<'jamKosong' | 'penugasan' | 'terlambat'>('jamKosong');
    const [data, setData] = useState<CampioneData>({ jamKosong: [], penugasan: [], terlambat: [] });
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/campione');
            const result = await res.json();
            if (result.success) {
                setData(result.data);
            }
        } catch (err) {
            console.error('Failed to fetch campione data', err);
        } finally {
            setLoading(false);
        }
    };

    // Trigger confetti when data is loaded and not empty
    useEffect(() => {
        if (!loading && (data.jamKosong.length > 0 || data.penugasan.length > 0 || data.terlambat.length > 0)) {
            const duration = 3 * 1000;
            const animationEnd = Date.now() + duration;
            const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

            const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

            const interval: any = setInterval(function () {
                const timeLeft = animationEnd - Date.now();

                if (timeLeft <= 0) {
                    return clearInterval(interval);
                }

                const particleCount = 50 * (timeLeft / duration);

                // since particles fall down, start a bit higher than random
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
                confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
            }, 250);

            return () => clearInterval(interval);
        }
    }, [loading, data]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Auto refresh every minute
        return () => clearInterval(interval);
    }, []);

    const getCurrentList = () => {
        return data[activeTab] || [];
    };

    const getTabLabel = () => {
        switch (activeTab) {
            case 'jamKosong': return 'Jam Kosong';
            case 'penugasan': return 'Penugasan';
            case 'terlambat': return 'Terlambat';
            default: return '';
        }
    };

    // Styling helpers
    const getGradient = () => {
        switch (activeTab) {
            case 'jamKosong': return 'linear-gradient(135deg, #FF6B6B 0%, #EE5253 100%)';
            case 'penugasan': return 'linear-gradient(135deg, #48DBFB 0%, #0ABDE3 100%)';
            case 'terlambat': return 'linear-gradient(135deg, #FF9F43 0%, #EE5A24 100%)';
            default: return 'none';
        }
    };

    const currentList = getCurrentList();
    const top5 = currentList.slice(0, 5);
    const top3 = top5.slice(0, 3);
    const rest = top5.slice(3);

    const [selectedTeacher, setSelectedTeacher] = useState<Winner | null>(null);

    return (
        <div className="campione-page">
            <CampioneDetailModal
                isOpen={!!selectedTeacher}
                onClose={() => setSelectedTeacher(null)}
                teacherName={selectedTeacher?.nama || ''}
                details={selectedTeacher?.details || []}
                category={activeTab}
            />

            <div className="hero-section">
                <h1 className="title">CAMPIONE LEADERBOARD</h1>
                <p className="subtitle">Pantau Statistik Kedisiplinan & Kinerja Guru</p>
            </div>

            <div className="content-wrapper">
                <div className="tabs-container">
                    <button
                        className={`tab-btn ${activeTab === 'jamKosong' ? 'active' : ''}`}
                        onClick={() => setActiveTab('jamKosong')}
                    >
                        <i className="bi bi-calendar-x"></i> Jam Kosong
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'penugasan' ? 'active' : ''}`}
                        onClick={() => setActiveTab('penugasan')}
                    >
                        <i className="bi bi-journal-text"></i> Penugasan
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'terlambat' ? 'active' : ''}`}
                        onClick={() => setActiveTab('terlambat')}
                    >
                        <i className="bi bi-alarm"></i> Terlambat
                    </button>
                    <div className="tab-indicator" style={{
                        transform: `translateX(${activeTab === 'jamKosong' ? '0%' : activeTab === 'penugasan' ? '100%' : '200%'})`
                    }}></div>
                </div>

                <div className="stats-card">
                    {loading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Loading Champions...</p>
                        </div>
                    ) : (
                        <div className="animate-fade-in">
                            <div className="header-badge" style={{ background: getGradient() }}>
                                TOP {getTabLabel().toUpperCase()}
                            </div>

                            <MedalPodium top3={top3} label={getTabLabel()} onSelect={setSelectedTeacher} />

                            {rest.length > 0 && (
                                <>
                                    <div className="divider">
                                        <span>Runner Ups</span>
                                    </div>
                                    <LeaderboardList list={rest} startIndex={4} label={getTabLabel()} onSelect={setSelectedTeacher} />
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style jsx>{`
                .campione-page {
                    min-height: 100vh;
                    background: #f8fafc;
                    padding-bottom: 60px;
                    font-family: 'Poppins', sans-serif; /* Assuming font is available, or fallback */
                }
                .hero-section {
                    background: #1e293b;
                    padding: 60px 20px 100px;
                    text-align: center;
                    color: white;
                    border-bottom-left-radius: 50% 20px;
                    border-bottom-right-radius: 50% 20px;
                    background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
                    box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
                }
                .title {
                    font-size: 2.5rem;
                    font-weight: 800;
                    letter-spacing: 2px;
                    margin-bottom: 10px;
                    background: linear-gradient(to right, #ffffff, #94a3b8);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                .subtitle {
                    font-size: 1.1rem;
                    color: #94a3b8;
                    max-width: 600px;
                    margin: 0 auto;
                }

                .content-wrapper {
                    max-width: 1000px;
                    margin: -60px auto 0;
                    padding: 0 20px;
                    position: relative;
                    z-index: 10;
                }

                .tabs-container {
                    background: white;
                    padding: 8px;
                    border-radius: 16px;
                    display: grid;
                    grid-template-columns: 1fr 1fr 1fr;
                    position: relative;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                    margin-bottom: 30px;
                }
                .tab-btn {
                    padding: 16px;
                    border: none;
                    background: transparent;
                    font-size: 1rem;
                    font-weight: 600;
                    color: #64748b;
                    cursor: pointer;
                    z-index: 5;
                    position: relative;
                    transition: color 0.3s;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                .tab-btn.active {
                    color: #0f172a;
                }
                .tab-indicator {
                    position: absolute;
                    top: 8px;
                    left: 8px;
                    width: calc(33.333% - 5px);
                    height: calc(100% - 16px);
                    background: white;
                    border-radius: 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    transition: transform 0.3s cubic-bezier(0.4, 0.0, 0.2, 1);
                    border: 1px solid #e2e8f0;
                    background: #f1f5f9;
                }

                .stats-card {
                    background: white;
                    border-radius: 24px;
                    padding: 40px;
                    box-shadow: 0 20px 40px -10px rgba(0,0,0,0.1);
                    min-height: 500px;
                }

                .header-badge {
                    display: inline-block;
                    padding: 8px 20px;
                    border-radius: 99px;
                    color: white;
                    font-weight: 700;
                    font-size: 0.9rem;
                    margin-bottom: 20px;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.15);
                    display: block;
                    width: fit-content;
                    margin: 0 auto 10px; /* Reduced bottom margin */
                }

                .divider {
                    display: flex;
                    align-items: center;
                    text-align: center;
                    color: #94a3b8;
                    margin: 40px 0 20px;
                }
                .divider::before, .divider::after {
                    content: '';
                    flex: 1;
                    border-bottom: 1px solid #e2e8f0;
                }
                .divider span {
                    padding: 0 16px;
                    font-size: 0.9rem;
                    font-weight: 600;
                    letter-spacing: 1px;
                    text-transform: uppercase;
                }

                .loading-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    height: 300px;
                    color: #64748b;
                }
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #e2e8f0;
                    border-top-color: #3b82f6;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin-bottom: 16px;
                }
                @keyframes spin { to { transform: rotate(360deg); } }

                .animate-fade-in {
                    animation: fadeIn 0.5s ease-out;
                }
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                @media (max-width: 768px) {
                    .title { font-size: 1.8rem; }
                    .tab-btn { font-size: 0.8rem; padding: 12px 8px; }
                    .stats-card { padding: 20px; }
                }
            `}</style>
        </div>
    );
}

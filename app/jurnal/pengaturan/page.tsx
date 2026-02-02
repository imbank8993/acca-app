'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import JurnalHeader from '../components/JurnalHeader';
import JurnalJadwalTab from '@/app/pengaturan-tugas/components/JadwalGuruTab';
import PermissionGuard from '@/components/PermissionGuard';

type TabType = 'jadwal';

function PengaturanContent({ user }: { user?: any }) {
    const [activeTab, setActiveTab] = useState<TabType>('jadwal');

    return (
        <div className="jp">
            <div className="jp__header">
                <Link href="/jurnal" className="jp__back">
                    <i className="bi bi-arrow-left"></i> Kembali ke Jurnal
                </Link>
                <h1>Pengaturan Jurnal</h1>
                <p>Konfigurasi jadwal guru untuk jurnal</p>
            </div>

            <div className="jp__tabs">
                <button
                    className={`jp__tab ${activeTab === 'jadwal' ? 'active' : ''}`}
                    onClick={() => setActiveTab('jadwal')}
                >
                    <i className="bi bi-calendar-week"></i>
                    Jadwal Guru
                </button>
            </div>

            <div className="jp__content">
                {activeTab === 'jadwal' && <JurnalJadwalTab />}
            </div>

            <style jsx>{`
                .jp {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    flex-direction: column;
                    gap: 24px;
                }

                .jp__header {
                    background: #0038A8;
                    padding: 2rem;
                    border-radius: 24px;
                    color: white;
                    position: relative;
                }

                .jp__back {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    color: rgba(255, 255, 255, 0.8);
                    text-decoration: none;
                    font-size: 0.9rem;
                    font-weight: 600;
                    margin-bottom: 1rem;
                    transition: color 0.2s;
                }

                .jp__back:hover {
                    color: white;
                }

                .jp__header h1 {
                    margin: 0;
                    font-size: 1.8rem;
                    font-weight: 800;
                }

                .jp__header p {
                    margin: 4px 0 0;
                    opacity: 0.8;
                }

                .jp__tabs {
                    display: flex;
                    gap: 12px;
                    background: var(--n-card);
                    padding: 6px;
                    border-radius: 16px;
                    border: 1px solid var(--n-border);
                    width: fit-content;
                }

                .jp__tab {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 20px;
                    border-radius: 12px;
                    border: none;
                    background: transparent;
                    color: var(--n-muted);
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s;
                }

                .jp__tab.active {
                    background: #0038A8;
                    color: white;
                    box-shadow: 0 4px 12px rgba(0, 56, 168, 0.2);
                }

                .jp__tab:not(.active):hover {
                    background: var(--n-soft);
                    color: var(--n-ink);
                }

                .jp__content {
                    min-height: 400px;
                }

                @media (max-width: 768px) {
                    .jp__header { padding: 1.5rem; }
                    .jp__header h1 { font-size: 1.5rem; }
                    .jp__tabs { width: 100%; }
                    .jp__tab { flex: 1; justify-content: center; padding: 10px; font-size: 0.85rem; }
                }
            `}</style>
        </div>
    );
}

export default function PengaturanJurnalPage({ user }: { user?: any }) {
    return (
        <PermissionGuard requiredPermission={{ resource: 'jurnal', action: 'manage' }} user={user}>
            <Suspense fallback={<div>Loading...</div>}>
                <PengaturanContent user={user} />
            </Suspense>
        </PermissionGuard>
    );
}

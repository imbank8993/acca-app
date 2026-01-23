'use client'

import { useState } from 'react'
import SiswaKelasTab from './SiswaKelasTab'
import WaliKelasTab from './WaliKelasTab'
import GuruAsuhTab from './GuruAsuhTab'
import GuruMapelTab from './GuruMapelTab'
import LiburTab from './LiburTab'

type TabType = 'siswa_kelas' | 'wali_kelas' | 'guru_asuh' | 'guru_mapel' | 'libur'

export default function DataSettingsPage() {
    const [activeTab, setActiveTab] = useState<TabType>('siswa_kelas')

    const tabs = [
        { key: 'siswa_kelas', label: 'Siswa - Kelas', icon: 'bi-people' },
        { key: 'wali_kelas', label: 'Wali Kelas', icon: 'bi-person-workspace' },
        { key: 'guru_asuh', label: 'Guru Asuh', icon: 'bi-heart' },
        { key: 'guru_mapel', label: 'Guru Mapel', icon: 'bi-book-half' },
        { key: 'libur', label: 'Data Libur', icon: 'bi-calendar-event' },
    ]

    return (
        <div className="data-settings-page">
            <div className="page-header flex justify-between items-start">
                <div>
                    <h1>Pengaturan Data (Relasi & Konfigurasi)</h1>
                    <p>Atur hubungan antar data master dan konfigurasi hari libur.</p>
                </div>
            </div>

            <div className="tabs-container">
                <div className="tabs-header">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.key as TabType)}
                        >
                            <i className={`bi ${tab.icon}`}></i>
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="tab-body">
                    {activeTab === 'siswa_kelas' && <SiswaKelasTab />}
                    {activeTab === 'wali_kelas' && <WaliKelasTab />}
                    {activeTab === 'guru_asuh' && <GuruAsuhTab />}
                    {activeTab === 'guru_mapel' && <GuruMapelTab />}
                    {activeTab === 'libur' && <LiburTab />}
                </div>
            </div>

            <style jsx>{`
        .data-settings-page { min-height: 100%; }
        .page-header { margin-bottom: 24px; }
        .page-header h1 { font-size: 1.8rem; color: #111827; margin-bottom: 8px; font-weight: 700; }
        .page-header p { color: #6b7280; }
        .tabs-header { display: flex; gap: 4px; margin-bottom: 0; overflow-x: auto; padding-bottom: 2px; }
        .tab-btn { padding: 12px 24px; background: #e5e7eb; border: none; border-radius: 12px 12px 0 0; color: #6b7280; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s; white-space: nowrap; }
        .tab-btn:hover { background: #d1d5db; color: #374151; }
        .tab-btn.active { background: #fff; color: #3aa6ff; box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05); position: relative; z-index: 1; }
        .tab-body { background: #fff; border-radius: 0 12px 12px 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); min-height: 400px; }
      `}</style>
        </div>
    )
}

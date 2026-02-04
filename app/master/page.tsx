'use client'

import { useState, useRef, useEffect } from 'react'
import SiswaTab from './components/SiswaTab'
import GuruTab from './components/GuruTab'
import KelasTab from './components/KelasTab'
import MapelTab from './components/MapelTab'
import WaktuTab from './components/WaktuTab'
import KodeGuruTab from './components/KodeGuruTab'
import TugasTambahanTab from './components/TugasTambahanTab'
import TahunAjaranTab from './components/TahunAjaranTab'
import InformasiTab from './components/InformasiTab'

type TabType = 'siswa' | 'guru' | 'kode_guru' | 'mapel' | 'kelas' | 'waktu' | 'tahun_ajaran' | 'tugas_tambahan' | 'informasi'

const tabs = [
  { key: 'tahun_ajaran', label: 'Tahun Ajaran', icon: 'bi-calendar-range' },
  { key: 'siswa', label: 'Siswa', icon: 'bi-people' },
  { key: 'guru', label: 'Guru', icon: 'bi-person-badge' },
  { key: 'kode_guru', label: 'Kode Guru', icon: 'bi-hash' },
  { key: 'mapel', label: 'Mapel', icon: 'bi-book' },
  { key: 'kelas', label: 'Kelas', icon: 'bi-door-open' },
  { key: 'waktu', label: 'Waktu', icon: 'bi-clock' },
  { key: 'tugas_tambahan', label: 'Tugas Tambahan', icon: 'bi-briefcase' },
  { key: 'informasi', label: 'Informasi', icon: 'bi-info-circle' },
]

export default function MasterDataPage({ user }: { user?: any }) {
  const { hasPermission } = require('@/lib/permissions-client')
  const permissions = user?.permissions || []
  const isAdmin = user?.role === 'ADMIN' || user?.roles?.some((r: string) => r.toUpperCase() === 'ADMIN') || false

  const allowedTabs = tabs.filter(tab =>
    hasPermission(permissions, `master.${tab.key}`, 'view', isAdmin)
  )

  const [activeTab, setActiveTab] = useState<TabType>(allowedTabs[0]?.key as TabType || 'tahun_ajaran')

  return (
    <>
      {/* Header */}
      <div className="md-header">
        <div className="md-titleArea">
          <h1>Master Data</h1>
          <p>Kelola data referensi dasar aplikasi (Tahun Ajaran, Siswa, Guru, Kode Guru, Mapel, Kelas, Waktu).</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="md-tabs" role="tablist" aria-label="Master Data Tabs">
        {allowedTabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`md-tab ${activeTab === tab.key ? 'isActive' : ''}`}
            onClick={() => setActiveTab(tab.key as TabType)}
            type="button"
          >
            <i className={`bi ${tab.icon} md-tabIcon`}></i>
            <span className="md-tabText">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="md-content" role="tabpanel">
        {activeTab === 'siswa' && <SiswaTab user={user} />}
        {activeTab === 'guru' && <GuruTab user={user} />}
        {activeTab === 'kode_guru' && <KodeGuruTab user={user} />}
        {activeTab === 'mapel' && <MapelTab user={user} />}
        {activeTab === 'kelas' && <KelasTab user={user} />}
        {activeTab === 'waktu' && <WaktuTab user={user} />}
        {activeTab === 'tugas_tambahan' && <TugasTambahanTab user={user} />}
        {activeTab === 'tahun_ajaran' && <TahunAjaranTab user={user} />}
        {activeTab === 'informasi' && <InformasiTab user={user} />}
      </div>

      <style jsx>{`
        .md-header {
          background: #0038A8;
          padding: 32px 40px;
          border-radius: 24px;
          box-shadow: 0 10px 30px rgba(0, 56, 168, 0.15);
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 24px;
        }

        .md-titleArea h1 {
          font-size: 1.8rem;
          font-weight: 800;
          color: white;
          margin: 0 0 6px 0;
          letter-spacing: -0.02em;
        }

        .md-titleArea p {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.95rem;
          margin: 0;
          font-weight: 500;
        }

        /* TABS */
        .md-tabs {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          padding: 4px;
          scrollbar-width: none;
          margin-bottom: 24px;
        }
        .md-tabs::-webkit-scrollbar { display: none; }

        .md-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(0, 56, 168, 0.05);
          border: 1px solid rgba(0, 56, 168, 0.1);
          border-radius: 16px;
          font-size: 0.9rem;
          font-weight: 600;
          color: #0038A8;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
        }

        .md-tab:hover {
          background: rgba(0, 56, 168, 0.1);
          border-color: rgba(0, 56, 168, 0.2);
          transform: translateY(-2px);
        }

        .md-tab.isActive {
          background: #0038A8;
          border-color: #0038A8;
          color: white;
          box-shadow: 0 8px 16px rgba(0, 56, 168, 0.25);
        }

        .md-tabIcon { font-size: 1.1rem; }
        
        .md-content {
          padding: 0;
          min-height: 500px;
          background: transparent;
        }

        @media (max-width: 768px) {
          .md-header { padding: 24px; }
          .md-titleArea h1 { font-size: 1.5rem; }
          .md-tab { padding: 10px 16px; font-size: 0.9rem; }
        }
      `}</style>
    </>
  )
}

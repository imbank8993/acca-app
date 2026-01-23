'use client'

import { useState } from 'react'
import SiswaTab from './SiswaTab'
import GuruTab from './GuruTab'
import KelasTab from './KelasTab'
import MapelTab from './MapelTab'
import WaktuTab from './WaktuTab'

type TabType = 'siswa' | 'guru' | 'mapel' | 'kelas' | 'waktu'

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<TabType>('siswa')

  return (
    <div className="master-data-page">
      <div className="page-header">
        <h1>Master Data (Data Mentah)</h1>
        <p>Kelola data referensi dasar aplikasi (Siswa, Guru, Mapel, Kelas, Waktu).</p>
      </div>

      <div className="tabs-container">
        <div className="tabs-header">
          <button
            className={`tab-btn ${activeTab === 'siswa' ? 'active' : ''}`}
            onClick={() => setActiveTab('siswa')}
          >
            <i className="bi bi-people"></i>
            Data Siswa
          </button>
          <button
            className={`tab-btn ${activeTab === 'guru' ? 'active' : ''}`}
            onClick={() => setActiveTab('guru')}
          >
            <i className="bi bi-person-badge"></i>
            Data Guru
          </button>
          <button
            className={`tab-btn ${activeTab === 'mapel' ? 'active' : ''}`}
            onClick={() => setActiveTab('mapel')}
          >
            <i className="bi bi-book"></i>
            Data Mapel
          </button>
          <button
            className={`tab-btn ${activeTab === 'kelas' ? 'active' : ''}`}
            onClick={() => setActiveTab('kelas')}
          >
            <i className="bi bi-door-open"></i>
            Data Kelas
          </button>
          <button
            className={`tab-btn ${activeTab === 'waktu' ? 'active' : ''}`}
            onClick={() => setActiveTab('waktu')}
          >
            <i className="bi bi-clock"></i>
            Data Waktu
          </button>
        </div>

        <div className="tab-body">
          {activeTab === 'siswa' && <SiswaTab />}
          {activeTab === 'guru' && <GuruTab />}
          {activeTab === 'mapel' && <MapelTab />}
          {activeTab === 'kelas' && <KelasTab />}
          {activeTab === 'waktu' && <WaktuTab />}
        </div>
      </div>

      <style jsx>{`
        .master-data-page {
          min-height: 100%;
        }

        .page-header {
          margin-bottom: 24px;
        }

        .page-header h1 {
          font-size: 1.8rem;
          color: #111827;
          margin-bottom: 8px;
        }

        .page-header p {
          color: #6b7280;
        }

        .tabs-container {
          background: transparent;
        }

        .tabs-header {
          display: flex;
          gap: 4px;
          margin-bottom: 0;
          overflow-x: auto;
          white-space: nowrap;
          padding-bottom: 2px;
        }

        .tab-btn {
          padding: 12px 24px;
          background: #e5e7eb;
          border: none;
          border-radius: 12px 12px 0 0;
          color: #6b7280;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
        }

        .tab-btn i {
          font-size: 1.1rem;
        }

        .tab-btn:hover {
          background: #d1d5db;
          color: #374151;
        }

        .tab-btn.active {
          background: #fff;
          color: #3aa6ff;
          box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
          position: relative;
          z-index: 1;
        }
      `}</style>
    </div>
  )
}

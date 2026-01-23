'use client'

import { useState } from 'react'
import RombelTab from './RombelTab'
import PengampuanTab from './PengampuanTab'
import PerwalianTab from './PerwalianTab'

type TabType = 'rombel' | 'pengampuan' | 'perwalian'

export default function AcademicDataPage() {
  const [activeTab, setActiveTab] = useState<TabType>('rombel')

  return (
    <div className="academic-data-page">
      <div className="page-header">
        <h1>Data Akademik (Relasi)</h1>
        <p>Atur hubungan antara data master (Siswa-Kelas, Guru-Mapel, Guru-Siswa).</p>
      </div>

      <div className="tabs-container">
        <div className="tabs-header">
          <button
            className={`tab-btn ${activeTab === 'rombel' ? 'active' : ''}`}
            onClick={() => setActiveTab('rombel')}
          >
            <i className="bi bi-people-fill"></i>
            Rombongan Belajar (Rombel)
          </button>
          <button
            className={`tab-btn ${activeTab === 'pengampuan' ? 'active' : ''}`}
            onClick={() => setActiveTab('pengampuan')}
          >
            <i className="bi bi-book-half"></i>
            Pengampuan (Guru Mapel)
          </button>
          <button
            className={`tab-btn ${activeTab === 'perwalian' ? 'active' : ''}`}
            onClick={() => setActiveTab('perwalian')}
          >
            <i className="bi bi-person-check-fill"></i>
            Perwalian & Guru Asuh
          </button>
        </div>

        <div className="tab-body">
          {activeTab === 'rombel' && <RombelTab />}
          {activeTab === 'pengampuan' && <PengampuanTab />}
          {activeTab === 'perwalian' && <PerwalianTab />}
        </div>
      </div>

      <style jsx>{`
        .academic-data-page {
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

'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import SiswaKelasTab from './components/SiswaKelasTab'
import WaliKelasTab from './components/WaliKelasTab'
import GuruAsuhTab from './components/GuruAsuhTab'
import DropdownTab from './components/DropdownTab'
import LiburTab from './components/LiburTab'
import GenerateJurnalTab from './components/GenerateJurnalTab'

type TabType = 'siswa_kelas' | 'wali_kelas' | 'guru_asuh' | 'dropdown' | 'libur' | 'generate_jurnal'

export default function DataSettingsPage({ user }: { user?: any }) {
  const { hasPermission } = require('@/lib/permissions-client')
  const permissions = user?.permissions || []
  const isAdmin = (user?.role === 'ADMIN') || (user?.roles?.some((r: string) => r.toUpperCase() === 'ADMIN')) || false

  const tabs = useMemo(
    () => [
      { key: 'siswa_kelas', label: 'Siswa - Kelas', icon: 'bi-people' },
      { key: 'wali_kelas', label: 'Wali Kelas', icon: 'bi-person-workspace' },
      { key: 'guru_asuh', label: 'Guru Asuh', icon: 'bi-heart' },
      { key: 'dropdown', label: 'Master Dropdown', icon: 'bi-menu-button-wide' },
      { key: 'libur', label: 'Data Libur', icon: 'bi-calendar-event' },
      { key: 'generate_jurnal', label: 'Generate Jurnal', icon: 'bi-plus-square' }
    ],
    []
  )

  const pagesArray = user?.pagesArray || []
  const knownKeys = tabs.map(t => t.key)
  const hasSpecificConfig = knownKeys.some(k => pagesArray.includes(k))

  const allowedTabs = tabs.filter(tab => {
    const hasRbac = hasPermission(permissions, `pengaturan_data:${tab.key}`, 'view', isAdmin)
    if (!hasRbac) return false
    if (isAdmin) return true

    // Granular Page Access Check
    const hasDirectAccess = pagesArray.includes(tab.key)
    const hasParentAccess = pagesArray.includes('Pengaturan Data')

    // Allow if explicitly selected OR (User has parent access AND hasn't opted into granular control yet)
    return hasDirectAccess || (hasParentAccess && !hasSpecificConfig)
  })

  const [activeTab, setActiveTab] = useState<TabType>(allowedTabs[0]?.key as TabType || 'siswa_kelas')

  return (
    <>
      {/* Header */}
      <div className="ds-header">
        <div className="ds-titleArea">
          <h1>Pengaturan Data</h1>
          <p>Relasi data master dan konfigurasi hari libur.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="ds-tabs" role="tablist" aria-label="Data settings tabs">
        {allowedTabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`ds-tab ${activeTab === tab.key ? 'isActive' : ''}`}
            onClick={() => setActiveTab(tab.key as TabType)}
            type="button"
          >
            <i className={`bi ${tab.icon} ds-tabIcon`}></i>
            <span className="ds-tabText">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="ds-content" role="tabpanel">
        {activeTab === 'siswa_kelas' && <SiswaKelasTab user={user} />}
        {activeTab === 'wali_kelas' && <WaliKelasTab />}
        {activeTab === 'guru_asuh' && <GuruAsuhTab />}
        {activeTab === 'dropdown' && <DropdownTab />}
        {activeTab === 'libur' && <LiburTab user={user} />}
        {activeTab === 'generate_jurnal' && <GenerateJurnalTab user={user} />}
      </div>

      <style jsx>{`
        /* =====================================================
           DATA SETTINGS PAGE — BLUE THEME ENHANCEMENT
        ====================================================== */

        /* HEADER */
        .ds-header {
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

        .ds-titleArea h1 {
          font-size: 1.8rem;
          font-weight: 800;
          color: white;
          margin: 0 0 6px 0;
          letter-spacing: -0.02em;
        }

        .ds-titleArea p {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.95rem;
          margin: 0;
          font-weight: 500;
        }

        /* TABS */
        .ds-tabs {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          padding: 4px;
          scrollbar-width: none;
          margin-bottom: 24px;
        }
        .ds-tabs::-webkit-scrollbar {
          display: none;
        }

        .ds-tab {
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

        .ds-tab:hover {
          background: rgba(0, 56, 168, 0.1);
          border-color: rgba(0, 56, 168, 0.2);
          transform: translateY(-2px);
        }

        .ds-tab.isActive {
          background: #0038A8;
          border-color: #0038A8;
          color: white;
          box-shadow: 0 8px 16px rgba(0, 56, 168, 0.25);
        }

        .ds-tabIcon {
          font-size: 1.1rem;
        }
        
        /* CONTENT AREA */
        .ds-content {
          padding: 0;
          min-height: 500px;
          background: transparent;
        }

        /* MOBILE RESPONSIVE */
        @media (max-width: 768px) {
          .ds-header {
            padding: 24px;
          }
          .ds-titleArea h1 {
            font-size: 1.5rem;
          }
          .ds-tab {
            padding: 10px 16px;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </>
  )
}

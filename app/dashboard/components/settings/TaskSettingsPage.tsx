'use client'

import { useMemo, useState } from 'react'
import GuruMapelTab from './GuruMapelTab'
import JadwalGuruTab from './JadwalGuruTab'
import TugasTambahanTab from './TugasTambahanTab'

type TabType = 'guru_mapel' | 'jadwal_guru' | 'tugas_tambahan'

export default function TaskSettingsPage({ user }: { user?: any }) {
  const { hasPermission } = require('@/lib/permissions-client')
  const permissions = user?.permissions || []
  const isAdmin = (user?.role === 'ADMIN') || (user?.roles?.some((r: string) => r.toUpperCase() === 'ADMIN')) || false

  const tabs = useMemo(
    () => [
      { key: 'guru_mapel', label: 'Guru Mapel', icon: 'bi-book-half' },
      { key: 'jadwal_guru', label: 'Jadwal Guru', icon: 'bi-calendar-week' },
      { key: 'tugas_tambahan', label: 'Tugas Tambahan', icon: 'bi-person-badge' }
    ],
    []
  )

  const pagesArray = user?.pagesArray || []
  const knownKeys = tabs.map(t => t.key)
  const hasSpecificConfig = knownKeys.some(k => pagesArray.includes(k))

  // Note: Keeping 'pengaturan_data' prefix for backward compatibility with existing permissions
  const allowedTabs = tabs.filter(tab => {
    const hasRbac = hasPermission(permissions, `pengaturan_data:${tab.key}`, 'read', isAdmin)
    if (!hasRbac) return false
    if (isAdmin) return true

    // Granular Page Access Check
    const hasDirectAccess = pagesArray.includes(tab.key)
    const hasParentAccess = pagesArray.includes('Pengaturan Tugas')

    // Allow if explicitly selected OR (User has parent access AND hasn't opted into granular control yet)
    return hasDirectAccess || (hasParentAccess && !hasSpecificConfig)
  })

  // Default to first allowed or generic fallback (though fallback might blank if none allowed)
  const [activeTab, setActiveTab] = useState<TabType>(allowedTabs[0]?.key as TabType || 'guru_mapel')

  return (
    <>
      {/* Header */}
      <div className="ts-header">
        <div className="ts-titleArea">
          <h1>Pengaturan Tugas</h1>
          <p>Konfigurasi beban kerja, jadwal, dan tugas tambahan guru.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="ts-tabs" role="tablist" aria-label="Task settings tabs">
        {allowedTabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`ts-tab ${activeTab === tab.key ? 'isActive' : ''}`}
            onClick={() => setActiveTab(tab.key as TabType)}
            type="button"
          >
            <i className={`bi ${tab.icon} ts-tabIcon`}></i>
            <span className="ts-tabText">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="ts-content" role="tabpanel">
        {activeTab === 'guru_mapel' && <GuruMapelTab />}
        {activeTab === 'jadwal_guru' && <JadwalGuruTab />}
        {activeTab === 'tugas_tambahan' && <TugasTambahanTab />}
      </div>

      <style jsx>{`
        /* =====================================================
           TASK SETTINGS PAGE — BLUE THEME ENHANCEMENT
        ====================================================== */

        /* HEADER */
        .ts-header {
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

        .ts-titleArea h1 {
          font-size: 1.8rem;
          font-weight: 800;
          color: white;
          margin: 0 0 6px 0;
          letter-spacing: -0.02em;
        }

        .ts-titleArea p {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.95rem;
          margin: 0;
          font-weight: 500;
        }

        /* TABS */
        .ts-tabs {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          padding: 4px;
          scrollbar-width: none;
          margin-bottom: 24px;
        }
        .ts-tabs::-webkit-scrollbar {
          display: none;
        }

        .ts-tab {
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

        .ts-tab:hover {
          background: rgba(0, 56, 168, 0.1);
          border-color: rgba(0, 56, 168, 0.2);
          transform: translateY(-2px);
        }

        .ts-tab.isActive {
          background: #0038A8;
          border-color: #0038A8;
          color: white;
          box-shadow: 0 8px 16px rgba(0, 56, 168, 0.25);
        }

        .ts-tabIcon {
          font-size: 1.1rem;
        }
        
        /* CONTENT AREA */
        .ts-content {
          padding: 0;
          min-height: 500px;
          background: transparent;
        }

        /* MOBILE RESPONSIVE */
        @media (max-width: 768px) {
          .ts-header {
            padding: 24px;
          }
          .ts-titleArea h1 {
            font-size: 1.5rem;
          }
          .ts-tab {
            padding: 10px 16px;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </>
  )
}

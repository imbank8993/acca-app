'use client'

import { useMemo, useState } from 'react'
import PageAccessTab from './PageAccessTab'
import UserDataTab from './UserDataTab'
import BulkReplaceTab from './BulkReplaceTab'
import RolePermissionsTab from './RolePermissionsTab'

type TabType = 'page_access' | 'role_permissions' | 'user_data' | 'bulk_replace'

export default function UserSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('page_access')

  const tabs = useMemo(
    () => [
      { key: 'page_access', label: 'Akses & Role', icon: 'bi-shield-lock' },
      { key: 'role_permissions', label: 'Izin Role (V2)', icon: 'bi-key' },
      { key: 'user_data', label: 'Data & Status', icon: 'bi-person-gear' },
      { key: 'bulk_replace', label: 'Ganti Data Massal', icon: 'bi-arrow-repeat' }
    ],
    []
  )

  return (
    <>
      {/* Header */}
      <div className="us-header">
        <div className="us-titleArea">
          <h1>Pengaturan Users</h1>
          <p>Kelola akses, role, dan data pengguna sistem dalam satu pusat kontrol.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="us-tabs" role="tablist" aria-label="User settings tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            role="tab"
            aria-selected={activeTab === tab.key}
            className={`us-tab ${activeTab === tab.key ? 'isActive' : ''}`}
            onClick={() => setActiveTab(tab.key as TabType)}
            type="button"
          >
            <i className={`bi ${tab.icon} us-tabIcon`}></i>
            <span className="us-tabText">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="us-content" role="tabpanel">
        {activeTab === 'page_access' && <PageAccessTab />}
        {activeTab === 'role_permissions' && <RolePermissionsTab />}
        {activeTab === 'user_data' && <UserDataTab />}
        {activeTab === 'bulk_replace' && <BulkReplaceTab />}
      </div>

      <style jsx>{`
        /* =====================================================
           USER SETTINGS PAGE — BLUE THEME ENHANCEMENT
        ====================================================== */

        /* HEADER */
        .us-header {
          background: var(--n-primary);
          padding: 32px 40px;
          border-radius: 24px;
          box-shadow: 0 10px 30px rgba(0, 56, 168, 0.15);
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 1px solid rgba(255, 255, 255, 0.1);
          margin-bottom: 24px;
          transition: background 0.3s ease;
        }

        :global(.dark) .us-header {
          background: #0f172a;
          box-shadow: 0 10px 40px -10px rgba(0, 0, 0, 0.5);
        }

        .us-titleArea h1 {
          font-size: 1.8rem;
          font-weight: 800;
          color: white;
          margin: 0 0 6px 0;
          letter-spacing: -0.02em;
        }

        .us-titleArea p {
          color: rgba(255, 255, 255, 0.8);
          font-size: 0.95rem;
          margin: 0;
          font-weight: 500;
        }

        /* TABS */
        .us-tabs {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          padding: 4px;
          scrollbar-width: none;
          margin-bottom: 24px;
        }
        .us-tabs::-webkit-scrollbar {
          display: none;
        }

        .us-tab {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--n-soft);
          border: 1px solid var(--n-border);
          border-radius: 16px;
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--n-primary);
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          white-space: nowrap;
        }

        .us-tab:hover {
          background: var(--n-border);
          transform: translateY(-2px);
        }

        .us-tab.isActive {
          background: var(--n-primary);
          border-color: var(--n-primary);
          color: white;
          box-shadow: 0 8px 16px rgba(0, 56, 168, 0.25);
        }

        :global(.dark) .us-tab.isActive {
            background: var(--n-primary);
            color: white;
        }

        .us-tabIcon {
          font-size: 1.1rem;
        }
        
        /* CONTENT AREA */
        .us-content {
          padding: 0;
          min-height: 500px;
          background: transparent;
        }

        /* MOBILE RESPONSIVE */
        @media (max-width: 768px) {
          .us-header {
            padding: 24px;
          }
          .us-titleArea h1 {
            font-size: 1.5rem;
          }
          .us-tab {
            padding: 10px 16px;
            font-size: 0.9rem;
          }
        }
      `}</style>
    </>
  )
}

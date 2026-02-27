'use client'

import { useMemo, useState, useEffect } from 'react'
import UserDataTab from './UserDataTab'
import BulkReplaceTab from './BulkReplaceTab'
import PageAccessTab from './PageAccessTab'
import RolePermissionsTab from './RolePermissionsTab'
import { hasPermission } from '@/lib/permissions-client'

type TabType = 'user_data' | 'bulk_replace' | 'page_access' | 'role_permissions'

export default function UserSettingsPage({ initialTab, user }: { initialTab?: string, user?: any }) {
  console.log('UserSettingsPage RECEIVED USER:', user);
  const [activeTab, setActiveTab] = useState<TabType>('user_data')

  const permissions = user?.permissions || []
  const isAdmin = (user?.role === 'ADMIN') || (user?.roles?.some((r: string) => r.toUpperCase() === 'ADMIN')) || false

  const tabs = useMemo(
    () => [
      { key: 'user_data', label: 'Data & Status User', icon: 'bi-person-gear' },
      { key: 'bulk_replace', label: 'Ganti Data Massal', icon: 'bi-arrow-repeat' },
      { key: 'page_access', label: 'Akses Halaman', icon: 'bi-shield-lock' },
      { key: 'role_permissions', label: 'Izin Role & Fungsi', icon: 'bi-shield-check' }
    ],
    []
  )

  const allowedTabs = useMemo(() => {
    // If no user prop yet, show nothing or just return empty
    if (!user) return []

    return tabs.filter(tab => {
      // Special case: 'user_data' is usually allowed if you can access the page, 
      // but we can enforce it too.
      return hasPermission(permissions, 'pengaturan_users', `tab:${tab.key}`, isAdmin)
    })
  }, [user, permissions, isAdmin, tabs])

  // Default active tab to first allowed
  useEffect(() => {
    if (allowedTabs.length > 0 && !allowedTabs.find(t => t.key === activeTab)) {
      setActiveTab(allowedTabs[0].key as TabType)
    }
  }, [allowedTabs, activeTab])

  if (!user) return <div className="p-8 text-center text-slate-500">Memuat data user settings...</div>

  // If user has NO allowed tabs (e.g. only 'view' page but no tabs), show empty or message
  if (allowedTabs.length === 0) {
    return (
      <div className="p-8 text-center text-red-500">
        <i className="bi bi-slash-circle text-4xl mb-4 block"></i>
        <p className="text-lg font-bold">Akses Terbatas</p>
        <p>Anda tidak memiliki izin untuk melihat tab apapun di halaman ini.</p>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="us-header">
        <div className="us-titleArea">
          <h1>Pusat Pengaturan Sistem</h1>
          <p>Konfigurasi akses, role, dan pemeliharaan data pengguna secara terpadu.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="us-tabs" role="tablist" aria-label="User settings tabs">
        {allowedTabs.map((tab) => (
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
        {activeTab === 'user_data' && <UserDataTab user={user} />}
        {activeTab === 'bulk_replace' && <BulkReplaceTab />}
        {activeTab === 'page_access' && <PageAccessTab />}
        {activeTab === 'role_permissions' && <RolePermissionsTab />}
      </div>

      <style jsx>{`
        /* =====================================================
           USER SETTINGS PAGE — ADMINISTRATIVE UI ALIGNMENT
        ====================================================== */

        /* HEADER */
        .us-header {
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

        .us-tab:hover {
          background: rgba(0, 56, 168, 0.1);
          border-color: rgba(0, 56, 168, 0.2);
          transform: translateY(-2px);
        }

        .us-tab.isActive {
          background: #0038A8;
          border-color: #0038A8;
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

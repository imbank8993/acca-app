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
    <section className="us">
      <header className="us__head">
        <div className="us__headLeft">
          <h1>Pengaturan Users</h1>
          <p>Kelola akses, role, dan data pengguna sistem.</p>
        </div>
      </header>

      <div className="us__card">
        <div className="us__tabs" role="tablist" aria-label="User settings tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'page' : undefined}
                className={`us__tab ${isActive ? 'isActive' : ''}`}
                onClick={() => setActiveTab(tab.key as TabType)}
              >
                <span className="us__tabIcon" aria-hidden="true">
                  <i className={`bi ${tab.icon}`}></i>
                </span>
                <span className="us__tabLabel">{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="us__panel" role="tabpanel">
          {activeTab === 'page_access' && <PageAccessTab />}
          {activeTab === 'role_permissions' && <RolePermissionsTab />}
          {activeTab === 'user_data' && <UserDataTab />}
          {activeTab === 'bulk_replace' && <BulkReplaceTab />}
        </div>
      </div>

      <style jsx>{`
        /* =====================================================
           USER SETTINGS PAGE — CLEAN NAVY THEME
           - Mengikuti pattern dari DataSettingsPage
           - Sticky tabs dengan smooth transitions
        ====================================================== */

        .us {
          width: 100%;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;

          background: radial-gradient(800px 420px at 10% -10%, rgba(58, 166, 255, 0.14), transparent 60%),
            radial-gradient(720px 420px at 92% -15%, rgba(15, 42, 86, 0.16), transparent 62%);
          border-radius: 16px;
          padding: 12px;
        }

        .us__head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          min-width: 0;
        }

        .us__headLeft {
          min-width: 0;
        }

        .us__headLeft h1 {
          margin: 0 0 6px;
          font-size: 1.3rem;
          line-height: 1.25;
          color: rgba(11, 31, 58, 0.92);
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .us__headLeft p {
          margin: 0;
          color: rgba(15, 23, 42, 0.62);
          font-size: 1rem;
          line-height: 1.4;
          font-weight: 400;
        }

        /* Card */
        .us__card {
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 18px;
          box-shadow: 0 14px 34px rgba(2, 6, 23, 0.08);
          overflow: hidden;
          min-width: 0;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        /* Tabs: sticky */
        .us__tabs {
          display: flex;
          gap: 10px;
          padding: 10px 12px;

          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          scroll-snap-type: x mandatory;
          overscroll-behavior-x: contain;

          position: sticky;
          top: 0;
          z-index: 20;

          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.96) 0%,
            rgba(255, 255, 255, 0.88) 60%,
            rgba(255, 255, 255, 0.78) 100%
          );
          border-bottom: 1px solid rgba(148, 163, 184, 0.22);
        }

        .us__tabs::-webkit-scrollbar {
          display: none;
        }

        .us__tab {
          scroll-snap-align: start;
          display: inline-flex;
          align-items: center;
          gap: 10px;

          padding: 10px 14px;
          border-radius: 0;
          border: none;
          background: transparent;
          color: rgba(11, 31, 58, 0.70);

          font-weight: 520;
          font-size: 0.93rem;
          white-space: nowrap;
          cursor: pointer;

          transition: color 0.12s ease;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
          touch-action: manipulation;

          flex: 0 0 auto;
        }

        .us__tabIcon {
          width: 30px;
          height: 30px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          justify-content: center;

          background: transparent;
          color: rgba(31, 79, 174, 0.80);
          flex: 0 0 auto;
        }

        .us__tabLabel {
           font-size: 0.95rem;
           letter-spacing: -0.01em;
           text-shadow: 0 1px 2px rgba(43, 108, 255, 0.15);
        }

        .us__tab:hover {
          color: rgba(11, 31, 58, 0.80);
          background: rgba(43, 108, 255, 0.06);
        }

        .us__tab.isActive {
          color: rgba(11, 31, 58, 0.88);
          position: relative;
        }

        .us__tab.isActive::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, rgba(15, 42, 86, 0.3), rgba(58, 166, 255, 0.4));
          border-radius: 2px;
        }

        .us__tab.isActive .us__tabIcon {
          background: rgba(43, 108, 255, 0.12);
          border-color: rgba(43, 108, 255, 0.16);
          color: rgba(31, 79, 174, 0.92);
        }

        /* Panel body */
        .us__panel {
          background: rgba(255, 255, 255, 0.92);
          padding: 14px;
          min-height: 420px;
          min-width: 0;
        }

        /* Mobile tuning */
        @media (max-width: 420px) {
          .us {
            padding: 10px;
            border-radius: 14px;
          }

          .us__tabs {
            gap: 8px;
            padding: 10px 10px;
          }

          .us__tab {
            padding: 9px 12px;
            font-size: 0.9rem;
          }

          .us__tabIcon {
            width: 28px;
            height: 28px;
          }

          .us__panel {
            padding: 12px;
            min-height: 360px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .us__tab {
            transition: none;
          }
        }
      `}</style>
    </section>
  )
}

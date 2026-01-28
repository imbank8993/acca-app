'use client'

import { useMemo, useState } from 'react'
import SiswaKelasTab from './SiswaKelasTab'
import WaliKelasTab from './WaliKelasTab'
import GuruAsuhTab from './GuruAsuhTab'
import GuruMapelTab from './GuruMapelTab'
import JadwalGuruTab from './JadwalGuruTab'
import LiburTab from './LiburTab'
import TugasTambahanTab from './TugasTambahanTab'

type TabType = 'siswa_kelas' | 'wali_kelas' | 'guru_asuh' | 'guru_mapel' | 'jadwal_guru' | 'libur' | 'tugas_tambahan'

export default function DataSettingsPage({ user }: { user?: any }) {
  const { hasPermission } = require('@/lib/permissions-client')
  const permissions = user?.permissions || []
  const isAdmin = user?.roles?.some((r: string) => r.toUpperCase() === 'ADMIN') || false

  const tabs = useMemo(
    () => [
      { key: 'siswa_kelas', label: 'Siswa - Kelas', icon: 'bi-people' },
      { key: 'wali_kelas', label: 'Wali Kelas', icon: 'bi-person-workspace' },
      { key: 'guru_asuh', label: 'Guru Asuh', icon: 'bi-heart' },
      { key: 'guru_mapel', label: 'Guru Mapel', icon: 'bi-book-half' },
      { key: 'jadwal_guru', label: 'Jadwal Guru', icon: 'bi-calendar-week' },
      { key: 'tugas_tambahan', label: 'Tugas Tambahan', icon: 'bi-person-badge' },
      { key: 'libur', label: 'Data Libur', icon: 'bi-calendar-event' }
    ],
    []
  )

  const allowedTabs = tabs.filter(tab =>
    hasPermission(permissions, `pengaturan_data:${tab.key}`, 'read', isAdmin)
  )

  const [activeTab, setActiveTab] = useState<TabType>(allowedTabs[0]?.key as TabType || 'siswa_kelas')

  return (
    <section className="ds">
      <header className="ds__head">
        <div className="ds__headLeft">
          <h1>Pengaturan Data</h1>
          <p>Relasi data master dan konfigurasi hari libur.</p>
        </div>
      </header>

      <div className="ds__card">
        <div className="ds__tabs" role="tablist" aria-label="Data settings tabs">
          {allowedTabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'page' : undefined}
                className={`ds__tab ${isActive ? 'isActive' : ''}`}
                onClick={() => setActiveTab(tab.key as TabType)}
              >
                <span className="ds__tabIcon" aria-hidden="true">
                  <i className={`bi ${tab.icon}`}></i>
                </span>
                <span className="ds__tabLabel">{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="ds__panel" role="tabpanel">
          {activeTab === 'siswa_kelas' && <SiswaKelasTab />}
          {activeTab === 'wali_kelas' && <WaliKelasTab />}
          {activeTab === 'guru_asuh' && <GuruAsuhTab />}
          {activeTab === 'guru_mapel' && <GuruMapelTab />}
          {activeTab === 'jadwal_guru' && <JadwalGuruTab />}
          {activeTab === 'tugas_tambahan' && <TugasTambahanTab />}
          {activeTab === 'libur' && <LiburTab />}
        </div>
      </div>

      <style jsx>{`
        /* =====================================================
           DATA SETTINGS PAGE — CLEAN NAVY (FULL REPLACE)
           - Mengikuti container dari Dashboard
           - Sticky tabs aman (tanpa double offset header)
        ====================================================== */

        .ds {
          width: 100%;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 14px;

          /* background halus saja (tidak bikin layout aneh) */
          background: radial-gradient(800px 420px at 10% -10%, rgba(58, 166, 255, 0.14), transparent 60%),
            radial-gradient(720px 420px at 92% -15%, rgba(15, 42, 86, 0.16), transparent 62%);
          border-radius: 16px;
          padding: 12px;
        }

        .ds__head {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px;
          min-width: 0;
        }

        .ds__headLeft {
          min-width: 0;
        }

        .ds__headLeft h1 {
          margin: 0 0 6px;
          font-size: 1.3rem;
          line-height: 1.25;
          color: rgba(11, 31, 58, 0.92);
          font-weight: 600;
          letter-spacing: -0.02em;
        }

        .ds__headLeft p {
          margin: 0;
          color: rgba(15, 23, 42, 0.62);
          font-size: 1rem;
          line-height: 1.4;
          font-weight: 400;
        }

        /* Card */
        .ds__card {
          background: rgba(255, 255, 255, 0.86);
          border: 1px solid rgba(148, 163, 184, 0.22);
          border-radius: 18px;
          box-shadow: 0 14px 34px rgba(2, 6, 23, 0.08);
          overflow: hidden;
          min-width: 0;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        /* Tabs: sticky to top of content-area (header fixed sudah di-handle dashboard) */
        .ds__tabs {
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

        .ds__tabs::-webkit-scrollbar {
          display: none;
        }

        .ds__tab {
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

        .ds__tabIcon {
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

        .ds__tabLabel {
           font-size: 0.95rem;
           letter-spacing: -0.01em;
           text-shadow: 0 1px 2px rgba(43, 108, 255, 0.15);
        }

        .ds__tab:hover {
          color: rgba(11, 31, 58, 0.80);
          background: rgba(43, 108, 255, 0.06);
        }

        .ds__tab.isActive {
          color: rgba(11, 31, 58, 0.88);
          position: relative;
        }

        .ds__tab.isActive::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, rgba(15, 42, 86, 0.3), rgba(58, 166, 255, 0.4));
          border-radius: 2px;
        }

        .ds__tab.isActive .ds__tabIcon {
          background: rgba(43, 108, 255, 0.12);
          border-color: rgba(43, 108, 255, 0.16);
          color: rgba(31, 79, 174, 0.92);
        }

        /* Panel body */
        .ds__panel {
          background: rgba(255, 255, 255, 0.92);
          padding: 14px;
          min-height: 420px;
          min-width: 0;
        }

        /* Mobile tuning (iPhone 13) */
        @media (max-width: 420px) {
          .ds {
            padding: 10px;
            border-radius: 14px;
          }

          .ds__tabs {
            gap: 8px;
            padding: 10px 10px;
          }

          .ds__tab {
            padding: 9px 12px;
            font-size: 0.9rem;
          }

          .ds__tabIcon {
            width: 28px;
            height: 28px;
          }

          .ds__panel {
            padding: 12px;
            min-height: 360px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .ds__tab {
            transition: none;
          }
          .ds__tab:hover {
            transform: none;
          }
          .ds__tab:active {
            transform: none;
          }
        }
      `}</style>
    </section>
  )
}

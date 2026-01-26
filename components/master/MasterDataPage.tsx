'use client'

import { useState, useRef, useEffect } from 'react'
import SiswaTab from './SiswaTab'
import GuruTab from './GuruTab'
import KelasTab from './KelasTab'
import MapelTab from './MapelTab'
import WaktuTab from './WaktuTab'
import KodeGuruTab from './KodeGuruTab'

type TabType = 'siswa' | 'guru' | 'kode-guru' | 'mapel' | 'kelas' | 'waktu'

const tabs = [
  { key: 'siswa', label: 'Siswa', icon: 'bi-people' },
  { key: 'guru', label: 'Guru', icon: 'bi-person-badge' },
  { key: 'kode-guru', label: 'Kode Guru', icon: 'bi-hash' },
  { key: 'mapel', label: 'Mapel', icon: 'bi-book' },
  { key: 'kelas', label: 'Kelas', icon: 'bi-door-open' },
  { key: 'waktu', label: 'Waktu', icon: 'bi-clock' },
]

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<TabType>('siswa')
  const tabsHeaderRef = useRef<HTMLDivElement>(null)

  const activeIndex = tabs.findIndex(tab => tab.key === activeTab)

  // Removed auto-centering on mobile to allow free scrolling

  return (
    <div className="md-page">
      {/* Header */}
      <div className="md-header">
        <div className="md-header__inner">
          <div className="md-titleWrap">
            <div className="md-badge" aria-hidden="true">
              <span className="md-badgeDot" />
            </div>
            <div className="md-titles">
              <h1 className="md-title">Master Data</h1>
              <p className="md-sub">
                Kelola data referensi dasar aplikasi (Siswa, Guru, Kode Guru, Mapel, Kelas, Waktu).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="md-card">
        <div className="md-tabsHeader" ref={tabsHeaderRef} role="tablist" aria-label="Master Data Tabs">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              className={`md-tab ${activeTab === tab.key ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.key as TabType)}
              type="button"
            >
              <span className="md-tabIcon" aria-hidden="true">
                <i className={`bi ${tab.icon}`}></i>
              </span>
              <span className="md-tabText">{tab.label}</span>
            </button>
          ))}


        </div>

        <div className="md-body" role="tabpanel">
          {activeTab === 'siswa' && <SiswaTab />}
          {activeTab === 'guru' && <GuruTab />}
          {activeTab === 'kode-guru' && <KodeGuruTab />}
          {activeTab === 'mapel' && <MapelTab />}
          {activeTab === 'kelas' && <KelasTab />}
          {activeTab === 'waktu' && <WaktuTab />}
        </div>
      </div>

      <style jsx>{`
        /* =====================================================
          MASTER DATA PAGE — SMOOTH NAVY (PC + MOBILE)
          FULL REPLACE (tampilan saja)
          Fix:
          - Tab header tidak kepotong (iPhone 13 390x844)
          - Scroll tab tetap bisa swipe tapi scrollbar disembunyikan
        ====================================================== */

        :global(:root) {
          --md-navy-950: #071426;
          --md-navy-900: #0b1f3a;
          --md-navy-800: #102a4f;
          --md-navy-700: #163663;

          --md-bg: #f7f9fd;
          --md-card: #ffffff;

          --md-line: rgba(15, 23, 42, 0.10);
          --md-muted: rgba(15, 23, 42, 0.62);
          --md-text: rgba(11, 31, 58, 0.92);

          --md-accent: rgba(43, 108, 255, 0.85);
          --md-accent-2: rgba(31, 79, 174, 0.85);
          --md-accent-soft: rgba(43, 108, 255, 0.10);

          --md-radius-xl: 16px;
          --md-radius-lg: 14px;
          --md-radius-md: 12px;

          --md-shadow: 0 14px 40px rgba(2, 8, 23, 0.10);
          --md-shadow-soft: 0 10px 24px rgba(2, 8, 23, 0.08);

          --md-ring: 0 0 0 3px rgba(43, 108, 255, 0.16);
        }

        .md-page {
          min-height: 100%;
          min-width: 0;
          padding: 0 12px;
          max-width: 1600px;
          margin: 0; /* Left align strict */
        }

        /* Header */
        .md-header {
          margin-bottom: 14px;
        }

        .md-header__inner {
          padding: 16px 0 8px;
        }

        .md-titleWrap {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          min-width: 0;
        }

        .md-badge {
          width: 38px;
          height: 38px;
          border-radius: 14px;
          background: radial-gradient(
            120% 120% at 20% 20%,
            rgba(43, 108, 255, 0.16),
            rgba(11, 31, 58, 0.04)
          );
          border: 1px solid rgba(16, 42, 79, 0.10);
          display: grid;
          place-items: center;
          box-shadow: 0 10px 18px rgba(2, 8, 23, 0.06);
          flex: 0 0 auto;
        }

        .md-badgeDot {
          width: 10px;
          height: 10px;
          border-radius: 999px;
          background: linear-gradient(180deg, var(--md-accent), var(--md-accent-2));
          box-shadow: 0 0 0 3px rgba(43, 108, 255, 0.12);
        }

        .md-titles {
          min-width: 0;
        }

        .md-title {
          margin: 0;
          font-size: 1.3rem;
          line-height: 1.25;
          color: var(--md-text);
          letter-spacing: -0.01em;
          font-weight: 600;
        }

        .md-sub {
          margin: 8px 0 0;
          color: var(--md-muted);
          font-size: 1rem;
          line-height: 1.4;
          font-weight: 400;
        }

        /* Card wrapper */
        .md-card {
          background: var(--md-card);
          border: 1px solid var(--md-line);
          border-radius: var(--md-radius-xl);
          box-shadow: var(--md-shadow);
          overflow: hidden; /* keep rounded corners */
          min-width: 0;
        }

        /* Tabs header */
        .md-tabsHeader {
          position: relative;
          display: flex;
          gap: 8px;

          /* FIX: beri ruang kiri/kanan agar pill pertama tidak kepotong */
          padding: 14px 16px 12px;

          border-bottom: 1px solid var(--md-line);
          background: linear-gradient(180deg, rgba(247, 250, 255, 1), rgba(255, 255, 255, 1));

          /* tetap bisa swipe */
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;

          /* sembunyikan scrollbar */
          scrollbar-width: none;
          -ms-overflow-style: none;

          /* agar saat swipe, start tidak mepet */
          scroll-padding-left: 16px;
          scroll-padding-right: 16px;

          /* opsional: feel lebih premium */
          scroll-snap-type: x proximity;
        }
        .md-tabsHeader::-webkit-scrollbar {
          width: 0 !important;
          height: 0 !important;
          display: none !important;
        }

        .md-tab {
          appearance: none;
          border: none;
          background: transparent;
          color: rgba(11, 31, 58, 0.70);
          border-radius: 0;
          padding: 10px 12px;
          cursor: pointer;

          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;

          transition: color 0.12s ease;

          user-select: none;
          font-weight: 520;

          /* penting: jangan mengecil saat scroll */
          flex: 0 0 auto;
          scroll-snap-align: start;
        }

        .md-tab:hover {
          border-color: rgba(43, 108, 255, 0.16);
          background: rgba(43, 108, 255, 0.06);
          color: rgba(11, 31, 58, 0.80);
          transform: translateY(-1px);
          box-shadow: var(--md-shadow-soft);
        }

        .md-tab:focus-visible {
          outline: none;
          box-shadow: var(--md-ring);
        }

        .md-tabIcon {
          width: 30px;
          height: 30px;
          border-radius: 0;
          display: grid;
          place-items: center;
          background: transparent;
          border: none;
          color: rgba(31, 79, 174, 0.80);
          flex: 0 0 auto;
        }

        .md-tabText {
          font-size: 0.95rem;
          letter-spacing: -0.01em;
          text-shadow: 0 1px 2px rgba(43, 108, 255, 0.15);
        }

        .md-tab.is-active {
          color: rgba(11, 31, 58, 0.88);
          position: relative;
        }

        .md-tab.is-active::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, rgba(15, 42, 86, 0.3), rgba(58, 166, 255, 0.4));
          border-radius: 2px;
        }

        .md-tab.is-active .md-tabIcon {
          background: rgba(43, 108, 255, 0.12);
          border-color: rgba(43, 108, 255, 0.16);
          color: rgba(31, 79, 174, 0.92);
        }

        /* soft underline indicator */
        .md-ink {
          position: absolute;
          left: 16px;   /* match padding */
          right: 16px;  /* match padding */
          bottom: 0;
          height: 2px;
          background: rgba(15, 23, 42, 0.06);
          border-radius: 999px;
          overflow: hidden;
          pointer-events: none;
        }
        .md-ink::after {
          content: '';
          display: block;
          height: 100%;
          width: 18%;
          background: linear-gradient(90deg, rgba(43, 108, 255, 0.65), rgba(31, 79, 174, 0.65));
          border-radius: 999px;
          transform: translateX(0%);
          transition: transform 0.22s ease;
        }

        .md-ink--siswa::after { transform: translateX(0%); }
        .md-ink--guru::after  { transform: translateX(120%); }
        .md-ink--kode-guru::after  { transform: translateX(240%); }
        .md-ink--mapel::after { transform: translateX(360%); }
        .md-ink--kelas::after { transform: translateX(480%); }
        .md-ink--waktu::after { transform: translateX(600%); }

        /* Body */
        .md-body {
          padding: 16px;
          background: linear-gradient(180deg, rgba(247, 249, 253, 1), rgba(255, 255, 255, 1));
          min-width: 0;
        }

        /* Mobile tuning */
        @media (max-width: 520px) {
          .md-header__inner {
            padding: 12px 0 6px;
          }

          .md-badge {
            width: 34px;
            height: 34px;
            border-radius: 13px;
          }

          .md-title {
            font-size: 1.12rem;
          }

          .md-sub {
            font-size: 0.88rem;
          }

          /* FIX mobile: tab area lebih lega & tidak kepotong */
          .md-tabsHeader {
            padding: 10px 12px 10px;
            gap: 8px;
            scroll-padding-left: 12px;
            scroll-padding-right: 12px;
            justify-content: flex-start; /* allow free scrolling from start */
          }

          .md-tab {
            padding: 9px 11px;
          }

          .md-tabIcon {
            width: 28px;
            height: 28px;
            border-radius: 10px;
          }

          .md-tabText {
            font-size: 0.85rem;
          }

          .md-body {
            padding: 12px;
          }

          .md-ink {
            left: 12px;
            right: 12px;
          }

          .md-ink::after {
            width: 22%;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .md-tab,
          .md-ink::after {
            transition: none;
          }
        }
      `}</style>
    </div>
  )
}

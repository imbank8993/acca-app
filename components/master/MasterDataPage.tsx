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
                Kelola data referensi dasar aplikasi (Siswa, Guru, Mapel, Kelas, Waktu).
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="md-card">
        <div className="md-tabsHeader" role="tablist" aria-label="Master Data Tabs">
          <button
            role="tab"
            aria-selected={activeTab === 'siswa'}
            className={`md-tab ${activeTab === 'siswa' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('siswa')}
            type="button"
          >
            <span className="md-tabIcon" aria-hidden="true">
              <i className="bi bi-people"></i>
            </span>
            <span className="md-tabText">Siswa</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'guru'}
            className={`md-tab ${activeTab === 'guru' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('guru')}
            type="button"
          >
            <span className="md-tabIcon" aria-hidden="true">
              <i className="bi bi-person-badge"></i>
            </span>
            <span className="md-tabText">Guru</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'mapel'}
            className={`md-tab ${activeTab === 'mapel' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('mapel')}
            type="button"
          >
            <span className="md-tabIcon" aria-hidden="true">
              <i className="bi bi-book"></i>
            </span>
            <span className="md-tabText">Mapel</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'kelas'}
            className={`md-tab ${activeTab === 'kelas' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('kelas')}
            type="button"
          >
            <span className="md-tabIcon" aria-hidden="true">
              <i className="bi bi-door-open"></i>
            </span>
            <span className="md-tabText">Kelas</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'waktu'}
            className={`md-tab ${activeTab === 'waktu' ? 'is-active' : ''}`}
            onClick={() => setActiveTab('waktu')}
            type="button"
          >
            <span className="md-tabIcon" aria-hidden="true">
              <i className="bi bi-clock"></i>
            </span>
            <span className="md-tabText">Waktu</span>
          </button>

          {/* soft underline indicator */}
          <span className={`md-ink md-ink--${activeTab}`} aria-hidden="true" />
        </div>

        <div className="md-body" role="tabpanel">
          {activeTab === 'siswa' && <SiswaTab />}
          {activeTab === 'guru' && <GuruTab />}
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
        }

        /* Header */
        .md-header {
          margin-bottom: 14px;
        }

        .md-header__inner {
          padding: 14px 0 6px;
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
          font-size: 1.22rem;
          line-height: 1.2;
          color: var(--md-text);
          letter-spacing: -0.01em;
          font-weight: 650;
        }

        .md-sub {
          margin: 6px 0 0;
          color: var(--md-muted);
          font-size: 0.92rem;
          line-height: 1.35;
          font-weight: 420;
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

          /* ✅ FIX: beri ruang kiri/kanan agar pill pertama tidak kepotong */
          padding: 12px 14px 10px;

          border-bottom: 1px solid var(--md-line);
          background: linear-gradient(180deg, rgba(247, 250, 255, 1), rgba(255, 255, 255, 1));

          /* ✅ tetap bisa swipe */
          overflow-x: auto;
          overflow-y: hidden;
          -webkit-overflow-scrolling: touch;

          /* ✅ sembunyikan scrollbar */
          scrollbar-width: none;
          -ms-overflow-style: none;

          /* ✅ agar saat swipe, start tidak mepet */
          scroll-padding-left: 14px;
          scroll-padding-right: 14px;

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
          border: 1px solid rgba(16, 42, 79, 0.10);
          background: rgba(255, 255, 255, 0.86);
          color: rgba(11, 31, 58, 0.70);
          border-radius: 999px;
          padding: 10px 12px;
          cursor: pointer;

          display: inline-flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;

          transition: transform 0.12s ease, box-shadow 0.12s ease, border-color 0.12s ease,
            background 0.12s ease, color 0.12s ease;

          user-select: none;
          font-weight: 520;

          /* ✅ penting: jangan mengecil saat scroll */
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
          border-radius: 10px;
          display: grid;
          place-items: center;
          background: rgba(16, 42, 79, 0.05);
          border: 1px solid rgba(16, 42, 79, 0.08);
          color: rgba(31, 79, 174, 0.80);
          flex: 0 0 auto;
        }

        .md-tabText {
          font-size: 0.92rem;
          letter-spacing: -0.01em;
        }

        .md-tab.is-active {
          background: rgba(43, 108, 255, 0.10);
          border-color: rgba(43, 108, 255, 0.18);
          color: rgba(11, 31, 58, 0.88);
          box-shadow: 0 12px 22px rgba(31, 79, 174, 0.12);
          transform: translateY(-1px);
        }

        .md-tab.is-active .md-tabIcon {
          background: rgba(43, 108, 255, 0.12);
          border-color: rgba(43, 108, 255, 0.16);
          color: rgba(31, 79, 174, 0.92);
        }

        /* soft underline indicator */
        .md-ink {
          position: absolute;
          left: 14px;   /* ✅ match padding */
          right: 14px;  /* ✅ match padding */
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
        .md-ink--mapel::after { transform: translateX(240%); }
        .md-ink--kelas::after { transform: translateX(360%); }
        .md-ink--waktu::after { transform: translateX(480%); }

        /* Body */
        .md-body {
          padding: 14px;
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

          /* ✅ FIX mobile: tab area lebih lega & tidak kepotong */
          .md-tabsHeader {
            padding: 10px 12px 10px;
            gap: 8px;
            scroll-padding-left: 12px;
            scroll-padding-right: 12px;
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
            font-size: 0.90rem;
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

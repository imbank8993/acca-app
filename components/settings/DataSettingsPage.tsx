'use client'

import { useMemo, useState } from 'react'
import SiswaKelasTab from './SiswaKelasTab'
import WaliKelasTab from './WaliKelasTab'
import GuruAsuhTab from './GuruAsuhTab'
import GuruMapelTab from './GuruMapelTab'
import LiburTab from './LiburTab'

type TabType = 'siswa_kelas' | 'wali_kelas' | 'guru_asuh' | 'guru_mapel' | 'libur'

export default function DataSettingsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('siswa_kelas')

  const tabs = useMemo(
    () => [
      { key: 'siswa_kelas', label: 'Siswa - Kelas', icon: 'bi-people' },
      { key: 'wali_kelas', label: 'Wali Kelas', icon: 'bi-person-workspace' },
      { key: 'guru_asuh', label: 'Guru Asuh', icon: 'bi-heart' },
      { key: 'guru_mapel', label: 'Guru Mapel', icon: 'bi-book-half' },
      { key: 'libur', label: 'Data Libur', icon: 'bi-calendar-event' },
    ],
    []
  )

  return (
    <div className="data-settings-page">
      <div className="page-header">
        <div className="page-header__left">
          <h1>Pengaturan Data</h1>
          <p>Relasi data master dan konfigurasi hari libur.</p>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs-header" role="tablist" aria-label="Data settings tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-current={isActive ? 'page' : undefined}
                className={`tab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key as TabType)}
              >
                <span className="tab-btn__icon" aria-hidden="true">
                  <i className={`bi ${tab.icon}`}></i>
                </span>
                <span className="tab-btn__label">{tab.label}</span>
              </button>
            )
          })}
        </div>

        <div className="tab-body" role="tabpanel">
          {activeTab === 'siswa_kelas' && <SiswaKelasTab />}
          {activeTab === 'wali_kelas' && <WaliKelasTab />}
          {activeTab === 'guru_asuh' && <GuruAsuhTab />}
          {activeTab === 'guru_mapel' && <GuruMapelTab />}
          {activeTab === 'libur' && <LiburTab />}
        </div>
      </div>

      <style jsx>{`
/* =====================================================
   DATA SETTINGS PAGE — iOS SAFE (FULL REPLACE)
   Target: iPhone 13 (390x844) tidak kepotong ✅
===================================================== */

:global(:root){
  --app-header-h: 65px;

  --bg: #f5f7fb;
  --card: rgba(255,255,255,.92);
  --text: #0b1220;
  --muted: #5b6b83;

  --navy-900: #071a33;
  --navy-800: #0b2346;
  --navy-700: #0f2f5f;

  --accent: #3aa6ff;

  --line: rgba(148,163,184,.28);
  --line-2: rgba(148,163,184,.18);

  --shadow: 0 18px 44px rgba(2,6,23,.10);
  --shadow-soft: 0 10px 26px rgba(2,6,23,.09);
  --shadow-mini: 0 6px 16px rgba(2,6,23,.07);

  --radius: 18px;

  --safe-b: env(safe-area-inset-bottom, 0px);
  --safe-t: env(safe-area-inset-top, 0px);
}

/* ✅ penting untuk iOS: pakai dynamic viewport */
.data-settings-page{
  width: 100%;
  max-width: 100%;
  min-height: 100dvh; /* iOS dynamic viewport */
  overflow-x: hidden;

  /* ✅ offset untuk header fixed + safe area */
  padding-top: calc(var(--app-header-h) + var(--safe-t) + 12px);
  padding-left: 16px;
  padding-right: 16px;
  padding-bottom: calc(16px + var(--safe-b));

  background:
    radial-gradient(900px 520px at 12% -10%, rgba(58,166,255,.16), transparent 58%),
    radial-gradient(820px 520px at 88% -18%, rgba(15,47,95,.18), transparent 62%),
    linear-gradient(180deg, #fbfdff 0%, var(--bg) 46%, #f4f7ff 100%);

  /* ✅ mencegah “layout melebar” akibat children */
  contain: layout paint;
}

/* ===== Header ===== */
.page-header{
  margin-bottom: 12px;
  display:flex;
  align-items:flex-end;
  justify-content: space-between;
  gap: 12px;
  min-width: 0;
}

.page-header__left{ min-width: 0; }

.page-header__left h1{
  margin: 0 0 6px;
  font-size: clamp(1.25rem, 1.08rem + 1.1vw, 1.9rem);
  line-height: 1.12;
  color: var(--text);
  font-weight: 900;
  letter-spacing: -0.03em;
}

.page-header__left p{
  margin: 0;
  color: var(--muted);
  font-size: clamp(.92rem, .88rem + .25vw, 1rem);
  line-height: 1.5;
}

/* ===== Tabs Container ===== */
.tabs-container{
  position: relative;
  min-width: 0;
  max-width: 100%;
}

/* ✅ Kunci: sticky top = 0 karena page sudah punya padding-top header */
.tabs-header{
  display:flex;
  gap: 10px;
  margin: 0;

  overflow-x:auto;
  overflow-y:hidden;
  padding: 8px 6px 10px;

  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;

  position: sticky;
  top: 0;              /* ✅ tidak lagi pakai 65px */
  z-index: 30;

  /* premium blur strip */
  background: linear-gradient(
    180deg,
    rgba(245,247,251,.98) 0%,
    rgba(245,247,251,.86) 60%,
    rgba(245,247,251,0) 100%
  );
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);

  min-width: 0;
}
.tabs-header::-webkit-scrollbar{ display:none; }

.tab-btn{
  scroll-snap-align: start;
  display:inline-flex;
  align-items:center;
  gap: 10px;

  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: rgba(255,255,255,.68);
  color: rgba(7,26,51,.72);

  font-weight: 800;
  font-size: .93rem;
  white-space: nowrap;
  cursor: pointer;

  transition: transform .15s ease, box-shadow .18s ease, background .18s ease, border-color .18s ease, color .18s ease;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;

  flex: 0 0 auto;
}

.tab-btn__icon{
  width: 30px;
  height: 30px;
  border-radius: 999px;
  display:inline-flex;
  align-items:center;
  justify-content:center;

  background: rgba(15,47,95,.08);
  color: var(--navy-700);
  flex: 0 0 auto;
}

.tab-btn:hover{
  background: rgba(255,255,255,.86);
  border-color: rgba(58,166,255,.22);
  color: rgba(7,26,51,.88);
  box-shadow: var(--shadow-mini);
  transform: translateY(-1px);
}

.tab-btn:active{ transform: translateY(0) scale(.99); }

.tab-btn:focus-visible{
  outline:none;
  box-shadow: 0 0 0 4px rgba(58,166,255,.18), var(--shadow-mini);
  border-color: rgba(58,166,255,.45);
}

.tab-btn.active{
  background: linear-gradient(
    135deg,
    rgba(58,166,255,.18) 0%,
    rgba(15,47,95,.10) 55%,
    rgba(255,255,255,.90) 100%
  );
  border-color: rgba(58,166,255,.38);
  color: var(--navy-900);
  box-shadow: 0 14px 30px rgba(7,26,51,.14);
  transform: translateY(-1px);
}

.tab-btn.active .tab-btn__icon{
  background: linear-gradient(135deg, rgba(58,166,255,.28), rgba(15,47,95,.18));
  color: var(--navy-900);
}

/* ===== Body ===== */
.tab-body{
  background: var(--card);
  border: 1px solid var(--line-2);
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;

  min-height: 420px;
  max-width: 100%;
  min-width: 0;

  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.tab-body::before{
  content:"";
  display:block;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(58,166,255,.35), rgba(15,47,95,.25), transparent);
}

/* ===== Mobile (iPhone 13) ===== */
@media (max-width: 420px){
  .data-settings-page{
    padding-left: 12px;
    padding-right: 12px;
    padding-top: calc(var(--app-header-h) + var(--safe-t) + 10px);
    padding-bottom: calc(14px + var(--safe-b));
  }

  .tabs-header{
    gap: 8px;
    padding: 8px 2px 10px;
  }

  .tab-btn{
    padding: 9px 12px;
    font-size: .9rem;
  }

  .tab-btn__icon{
    width: 28px;
    height: 28px;
  }

  .tab-body{
    min-height: 360px;
    border-radius: 16px;
  }
}

@media (prefers-reduced-motion: reduce){
  .tab-btn{ transition: none; }
  .tab-btn:hover{ transform: none; }
  .tab-btn:active{ transform: none; }
}
`}</style>


    </div>
  )
}

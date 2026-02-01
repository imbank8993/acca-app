'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getUserByAuthId, parsePages } from '@/lib/auth'
import type { User } from '@/lib/types'
import Sidebar from '@/components/Sidebar'
import Header from '@/components/Header'
import AbsensiPage from '../absensi/page'
import KetidakhadiranPage from '../ketidakhadiran/page'
import JurnalPage from '../jurnal/page'
import MasterDataPage from './components/master/MasterDataPage'
import DataSettingsPage from './components/settings/DataSettingsPage'
import TaskSettingsPage from './components/settings/TaskSettingsPage'
import ResetDataPage from './components/reset/ResetDataPage'
import UserSettingsPage from '../pengaturan-users/components/UserSettingsPage'
import NilaiPage from '../nilai/page'
import TugasTambahanPage from '../tugas-tambahan/page'
import AdminTugasTambahanPage from '../tugas-tambahan/admin/page'
import LckhPage from '../lckh/page'
import LckhApprovalPage from '../lckh-approval/page'

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="loading-screen">
          <div className="loading-content">
            <div className="spinner"></div>
            <p>Memuat Dashboard...</p>
          </div>
          <style jsx>{`
            .loading-screen {
              min-height: 100dvh;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #020617;
            }
            .loading-content {
              text-align: center;
              color: #eaf2ff;
            }
            .spinner {
              display: inline-block;
              width: 48px;
              height: 48px;
              border: 4px solid rgba(58, 166, 255, 0.2);
              border-top-color: #0038A8;
              border-radius: 50%;
              animation: spin 0.8s linear infinite;
              margin-bottom: 16px;
            }
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}</style>
        </div>
      }
    >
      <DashboardLogic />
    </Suspense>
  )
}

function DashboardLogic() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  useEffect(() => {
    checkAuth()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkAuth = async () => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) {
        router.push('/login')
        return
      }

      let userData = await getUserByAuthId(session.user.id)

      if (!userData) {
        console.warn('User not found in DB (or DB error). Using MOCK user for UI verification.')
        userData = {
          id: 0,
          auth_id: session.user.id,
          username: 'dev_admin',
          nip: '19800101',
          nama: 'Developer (Mock)',
          role: 'ADMIN',
          roles: ['ADMIN', 'GURU'],
          divisi: 'IT',
          pages: 'Dashboard, Jurnal>Jurnal=jurnal|Pengaturan Jurnal=jurnal/pengaturan,Konfigurasi Data>Master Data|Pengaturan Data|Reset Data,Absensi,Nilai,LCKHApproval,LCKH,Status User=LogLogin ,JadwalGuru,Rekap Data>Absensi=RekapAbsensi|Jurnal=RekapJurnal,Master Data>Wali Kelas=WaliKelas|Guru Asuh=GuruAsuh|Kelas,Pengaturan Akun=User,Export Data>Absensi=ExportAbsensi|Jurnal=ExportJurnal,Rekap Absen&Jurnal=RekapKehadiranJurnal,Layanan Guru>Absensi Guru=AbsensiSiswa|Jurnal Guru=JurnalGuru,Sosialisasi,Ketidakhadiran,StatusSiswa',
          pagesArray: ['Dashboard', 'jurnal', 'jurnal/pengaturan', 'Master Data', 'Pengaturan Data', 'Reset Data', 'Absensi', 'Nilai', 'LCKHApproval', 'LCKH', 'LogLogin', 'JadwalGuru', 'RekapAbsensi', 'RekapJurnal', 'WaliKelas', 'GuruAsuh', 'Kelas', 'User', 'ExportAbsensi', 'ExportJurnal', 'RekapKehadiranJurnal', 'AbsensiSiswa', 'JurnalGuru', 'Sosialisasi', 'Ketidakhadiran', 'StatusSiswa'],
          pagesTree: [],
          aktif: true,
          photoUrl: null
        } as any

        // Re-parse the tree for the mock user
        if (userData && userData.pages) {
          const { pagesTree, pagesArray } = parsePages(userData.pages)
          userData.pagesTree = pagesTree
          userData.pagesArray = pagesArray
        }
      }

      if (userData) {
        setUser(userData)

        const pageParam = searchParams.get('page')
        if (pageParam && userData.pagesArray.includes(pageParam)) {
          setCurrentPage(pageParam)
        } else {
          if (userData.pagesTree && userData.pagesTree.length > 0) {
            const firstPage = userData.pagesTree[0]
            if (firstPage.page) {
              setCurrentPage(firstPage.page)
            } else if (firstPage.children && firstPage.children.length > 0 && firstPage.children[0].page) {
              setCurrentPage(firstPage.children[0].page)
            }
          }
        }
      }
    } catch (error) {
      console.error('Auth check error:', error)
      router.push('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleNavigate = (page: string) => {
    setCurrentPage(page)
    setSidebarOpen(false)

    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('page', page)
    window.history.pushState({}, '', newUrl)
  }

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <div className="spinner"></div>
          <p>Memuat...</p>
        </div>

        <style jsx>{`
          .loading-screen {
            min-height: 100dvh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #020617;
          }

          .loading-content {
            text-align: center;
            color: #eaf2ff;
          }

          .spinner {
            display: inline-block;
            width: 48px;
            height: 48px;
            border: 4px solid rgba(58, 166, 255, 0.2);
            border-top-color: #3aa6ff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
            margin-bottom: 16px;
          }

          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    )
  }

  if (!user) return null

  return (
    <>
      <div className={`dashboard-layout ${sidebarOpen ? 'sidebar-mobile-open' : ''}`}>
        <Sidebar
          user={user}
          currentPage={currentPage}
          onNavigate={handleNavigate}
          isOpen={sidebarOpen}
          onToggle={() => setSidebarOpen(!sidebarOpen)}
          isCollapsed={sidebarCollapsed}
          onCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <Header user={user} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} isCollapsed={sidebarCollapsed} />

          <main className="content-area">
            <div className="content-container">{renderPageContent(currentPage, user)}</div>
          </main>
        </div>
      </div>

      <style jsx>{`
        .dashboard-layout {
          width: 100%;
          min-height: 100dvh;
          overflow-x: hidden;
          background: var(--n-bg, #f5f7fb);
        }

        .main-content {
          position: relative;
          margin-left: calc(var(--app-sidebar-w) + var(--app-margin) + var(--app-gap));
          margin-right: var(--app-margin);
          width: auto;
          min-width: 0;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .main-content.collapsed {
          margin-left: calc(var(--app-sidebar-w-collapsed) + var(--app-margin) + var(--app-gap));
        }

        .content-area {
          padding-top: calc(var(--app-header-h) + var(--app-margin) + var(--app-gap));
          padding-bottom: 32px;
          min-height: 100dvh;
        }

        .content-container {
          width: 100%;
          max-width: 1600px;
          margin: 0 auto;
          padding: 0 30px;
        }

        @media (max-width: 991.98px) {
          .main-content,
          .main-content.collapsed {
            margin-left: 0;
            margin-right: 0;
            width: 100%;
          }

          .content-area {
            padding-top: calc(var(--app-header-h) + var(--app-margin) + 10px);
            padding-bottom: 24px;
          }

          .content-container {
            padding: 0 14px;
          }
        }
      `}</style>
    </>
  )
}

function renderPageContent(page: string, user: User) {
  switch (page) {
    case 'Dashboard':
      return <DashboardContent user={user} />

    case 'Absensi':
      return <AbsensiPage />

    case 'Ketidakhadiran':
      return <KetidakhadiranPage />

    // === JURNAL MODULE ===
    case 'jurnal':
      return <JurnalPage user={user} />

    // === LAYANAN GURU ===
    case 'AbsensiSiswa':
      return <PagePlaceholder title="Absensi Guru" icon="bi-person-check" description="Modul Absensi untuk Guru" />

    case 'JurnalGuru':
      return <JurnalPage user={user} />

    // === KONFIGURASI DATA ===
    case 'Master Data':
      return <MasterDataPage user={user} />

    case 'Pengaturan Data':
      return <DataSettingsPage user={user} />

    case 'Pengaturan Tugas':
      return <TaskSettingsPage user={user} />

    case 'pengaturan-users':
      return <UserSettingsPage />

    case 'Reset Data':
      return <ResetDataPage />

    // === MASTER DATA SUBMENU ===
    case 'WaliKelas':
      return <PagePlaceholder title="Wali Kelas" icon="bi-person-badge" description="Management Wali Kelas" />

    case 'GuruAsuh':
      return <PagePlaceholder title="Guru Asuh" icon="bi-person-heart" description="Management Guru Asuh" />

    case 'Kelas':
      return <PagePlaceholder title="Kelas" icon="bi-building" description="Management Kelas" />

    // === REKAP DATA ===
    case 'RekapAbsensi':
      return <PagePlaceholder title="Rekap Absensi" icon="bi-table" description="Rekapitulasi Absensi" />

    case 'RekapJurnal':
      return <PagePlaceholder title="Rekap Jurnal" icon="bi-journal-check" description="Rekapitulasi Jurnal" />

    case 'RekapKehadiranJurnal':
      return <PagePlaceholder title="Rekap Absen & Jurnal" icon="bi-layout-split" description="Gabungan Rekap Absensi dan Jurnal" />

    // === EXPORT DATA ===
    case 'ExportAbsensi':
      return <PagePlaceholder title="Export Absensi" icon="bi-file-earmark-excel" description="Export Data Absensi" />

    case 'ExportJurnal':
      return <PagePlaceholder title="Export Jurnal" icon="bi-file-earmark-spreadsheet" description="Export Data Jurnal" />

    // === SETTINGS & STATUS ===
    case 'User':
      return <PagePlaceholder title="Pengaturan Akun" icon="bi-person-gear" description="Management User Akun" />

    case 'LogLogin':
      return <PagePlaceholder title="Log Login" icon="bi-clock-history" description="History Login User" />

    case 'StatusSiswa':
      return <PagePlaceholder title="Status Siswa" icon="bi-people" description="Status Keaktifan Siswa" />

    case 'JadwalGuru':
      return <PagePlaceholder title="Jadwal Guru" icon="bi-calendar-week" description="Jadwal Mengajar Guru" />

    // === OTHER MODULES ===
    case 'LCKH':
      return <LckhPage />

    case 'LCKHApproval':
      return <LckhApprovalPage />

    case 'Nilai':
      return <NilaiPage />

    case 'TugasTambahan':
      return <TugasTambahanPage />

    case 'AdminTugasTambahan':
      return <AdminTugasTambahanPage />

    case 'Rapor':
      return <PagePlaceholder title="Rapor" icon="bi-file-earmark-text" description="Modul Rapor Siswa" />

    case 'Sosialisasi':
      return <PagePlaceholder title="Sosialisasi" icon="bi-megaphone" description="Modul Sosialisasi" />

    default:
      return <PagePlaceholder title={page} icon="bi-file-earmark" description={`Halaman ${page}`} />
  }
}

function DashboardContent({ user }: { user: User }) {
  return (
    <div className="db">
      {/* Welcome Hero Section */}
      <div className="db__hero">
        <div className="db__heroContent">
          <h1 className="db__heroTitle">Selamat Datang, {user.nama}!</h1>
          <p className="db__heroSub">Portal Academic Center & Access terpadu untuk efisiensi data pendidikan.</p>
        </div>
        <div className="db__heroIcon">
          <i className="bi bi-rocket-takeoff"></i>
        </div>
      </div>

      {/* Quick Dashboard Stats */}
      <div className="db__stats">
        <div className="db__statCard blue">
          <div className="db__statIcon"><i className="bi bi-shield-lock-fill"></i></div>
          <div className="db__statInfo">
            <span className="db__statLabel">Akses Halaman</span>
            <span className="db__statValue">{user.pagesArray.length}</span>
          </div>
          <div className="db__statDecor"></div>
        </div>

        <div className="db__statCard green">
          <div className="db__statIcon"><i className="bi bi-person-check-fill"></i></div>
          <div className="db__statInfo">
            <span className="db__statLabel">Otoritas Peran</span>
            <span className="db__statValue">{user.roles.length}</span>
          </div>
          <div className="db__statDecor"></div>
        </div>

        <div className="db__statCard purple">
          <div className="db__statIcon"><i className="bi bi-collection-fill"></i></div>
          <div className="db__statInfo">
            <span className="db__statLabel">Grup Menu Utama</span>
            <span className="db__statValue">{user.pagesTree.length || 0}</span>
          </div>
          <div className="db__statDecor"></div>
        </div>
      </div>

      {/* Information Cards Section */}
      <div className="db__metaGrid">
        <div className="db__metaCard">
          <div className="db__metaHead">
            <div className="db__metaHeadIcon"><i className="bi bi-fingerprint"></i></div>
            <div className="db__metaHeadText">
              <h3>Profil Personil</h3>
              <span>Informasi kredensial pengguna</span>
            </div>
          </div>
          <div className="db__metaBody">
            <div className="db__dataRow">
              <span className="db__dataLabel">Nama Lengkap</span>
              <span className="db__dataValue">{user.nama}</span>
            </div>
            <div className="db__dataRow">
              <span className="db__dataLabel">Identitas Unik (NIP)</span>
              <span className="db__dataValue">{user.nip}</span>
            </div>
            <div className="db__dataRow">
              <span className="db__dataLabel">Unit/Divisi</span>
              <span className="db__dataValue">{user.divisi || '-'}</span>
            </div>
            <div className="db__dataRow">
              <span className="db__dataLabel">Tingkat Hak Akses</span>
              <span className="db__dataValue roleBadge">{user.role}</span>
            </div>
          </div>
        </div>

        <div className="db__metaCard">
          <div className="db__metaHead">
            <div className="db__metaHeadIcon"><i className="bi bi-toggles2"></i></div>
            <div className="db__metaHeadText">
              <h3>Hak Akses Aktif</h3>
              <span>Daftar modul yang dapat dikelola</span>
            </div>
          </div>
          <div className="db__metaBody">
            <div className="db__pagesWrap">
              {user.pagesArray.map((page) => (
                <span key={page} className="db__pageBadge">
                  {page}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .db { display: flex; flex-direction: column; gap: 32px; animation: dbFadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1); }
        @keyframes dbFadeIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
 
        /* HERO CARD */
        .db__hero {
          position: relative;
          background: var(--n-primary);
          color: white;
          padding: 3rem 3.5rem;
          border-radius: 28px;
          box-shadow: 0 15px 45px -10px rgba(0, 56, 168, 0.25);
          display: flex;
          justify-content: space-between;
          align-items: center;
          overflow: hidden;
          transition: background 0.3s ease;
        }

        :global(.dark) .db__hero {
          background: #0f172a;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .db__hero::after {
          content: "";
          position: absolute;
          top: -50%;
          right: -10%;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.1) 0%, transparent 70%);
          pointer-events: none;
        }

        .db__hero::before {
          content: "";
          position: absolute;
          bottom: -30%;
          left: -5%;
          width: 300px;
          height: 300px;
          background: radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 70%);
          pointer-events: none;
        }

        .db__heroTitle { 
          font-family: 'Poppins', sans-serif;
          font-size: 2.1rem; 
          font-weight: 750; 
          margin: 0 0 10px; 
          letter-spacing: -0.01em; 
          line-height: 1.2;
        }

        .db__heroSub { 
          font-size: 1rem; 
          opacity: 0.9; 
          max-width: 550px; 
          font-weight: 400; 
          line-height: 1.6; 
          letter-spacing: 0.01em;
        }

        .db__heroIcon { 
          font-size: 4rem; 
          opacity: 0.2; 
          transform: rotate(-10deg); 
          filter: drop-shadow(0 0 20px rgba(255, 255, 255, 0.2));
        }
 
        /* STATS */
        .db__stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
        .db__statCard {
          position: relative;
          background: var(--n-card);
          padding: 2.2rem;
          border-radius: 24px;
          border: 1px solid var(--n-border);
          box-shadow: 0 4px 15px rgba(0, 56, 168, 0.03);
          display: flex;
          align-items: center;
          gap: 20px;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          overflow: hidden;
        }
        .db__statCard:hover { 
          transform: translateY(-6px); 
          box-shadow: 0 15px 30px rgba(0, 56, 168, 0.08); 
          border-color: rgba(0, 56, 168, 0.1);
        }
        .db__statIcon {
          width: 56px;
          height: 56px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.8rem;
          z-index: 1;
          transition: all 0.3s ease;
        }
        .db__statCard.blue .db__statIcon { background: #eff6ff; color: #0038A8; }
        .db__statCard.green .db__statIcon { background: #f0fdf4; color: #10b981; }
        .db__statCard.purple .db__statIcon { background: #f5f3ff; color: #8b5cf6; }

        .db__statCard:hover .db__statIcon {
          transform: scale(1.1) rotate(-5deg);
        }

        .db__statLabel { 
          display: block; 
          font-size: 0.72rem; 
          font-weight: 700; 
          color: var(--n-muted); 
          text-transform: uppercase; 
          letter-spacing: 0.06em; 
          margin-bottom: 6px; 
          opacity: 0.8;
        }
        .db__statValue { 
          font-size: 1.9rem; 
          font-weight: 850; 
          color: var(--n-ink); 
          letter-spacing: -0.02em; 
          line-height: 1;
        }

        .db__statDecor {
          position: absolute;
          bottom: -20px;
          right: -20px;
          width: 120px;
          height: 120px;
          background: currentColor;
          opacity: 0.02;
          border-radius: 50%;
        }
 
        /* META CARDS */
        .db__metaGrid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
        .db__metaCard { 
          background: var(--n-card); 
          border-radius: 24px; 
          border: 1px solid var(--n-border); 
          box-shadow: 0 4px 15px rgba(0, 56, 168, 0.02); 
          overflow: hidden; 
        }
        .db__metaHead {
          background: var(--n-soft);
          padding: 24px 28px;
          border-bottom: 1px solid var(--n-border);
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .db__metaHeadIcon { 
          width: 48px; 
          height: 48px; 
          border-radius: 15px; 
          background: var(--n-card); 
          border: 1px solid var(--n-border); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          font-size: 1.3rem; 
          color: var(--n-primary); 
          box-shadow: 0 4px 10px rgba(0,0,0,0.02); 
        }
        .db__metaHeadText h3 { 
          margin: 0; 
          font-size: 1.1rem; 
          font-weight: 750; 
          color: var(--n-ink); 
          letter-spacing: -0.01em;
        }
        .db__metaHeadText span { 
          font-size: 0.82rem; 
          color: var(--n-muted); 
          font-weight: 500; 
          opacity: 0.8;
        }
 
        .db__metaBody { padding: 24px; }
        .db__dataRow { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid var(--n-soft); }
        .db__dataRow:last-child { border-bottom: none; }
        .db__dataLabel { font-size: 0.88rem; color: var(--n-muted); font-weight: 500; }
        .db__dataValue { font-size: 0.92rem; font-weight: 600; color: var(--n-ink); }
        .db__dataValue.roleBadge { background: var(--n-primary); color: white; padding: 4px 12px; border-radius: 8px; font-size: 0.75rem; text-transform: uppercase; }
 
        .db__pagesWrap { display: flex; flex-wrap: wrap; gap: 10px; }
        .db__pageBadge {
          background: var(--n-soft);
          color: var(--n-muted);
          padding: 8px 16px;
          border-radius: 12px;
          font-size: 0.85rem;
          font-weight: 600;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        .db__pageBadge:hover { background: var(--n-primary); color: white; transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 63, 136, 0.2); }
 
        @media (max-width: 1024px) {
          .db__stats { grid-template-columns: 1fr; }
          .db__metaGrid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .db__hero { padding: 32px 24px; flex-direction: column; text-align: center; }
          .db__heroIcon { display: none; }
          .db__heroTitle { font-size: 1.75rem; }
        }
      `}</style>
    </div>
  )
}

function PagePlaceholder({ title, icon, description }: { title: string; icon: string; description: string }) {
  return (
    <div className="page-placeholder">
      <div className="placeholder-icon">
        <i className={`bi ${icon}`}></i>
      </div>
      <h2>{title}</h2>
      <p>{description}</p>
      <div className="coming-soon">Coming Soon</div>

      <style jsx>{`
        .page-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 400px;
          background: var(--n-card);
          border-radius: 16px;
          padding: 48px 24px;
          text-align: center;
          box-shadow: var(--n-shadow);
          border: 1px solid var(--n-border);
        }

        .placeholder-icon {
          width: 96px;
          height: 96px;
          border-radius: 50%;
          background: rgba(58, 166, 255, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          color: #3aa6ff;
          margin-bottom: 24px;
        }

        h2 {
          font-size: 1.8rem;
          font-weight: 700;
          color: #0b1b3a;
          margin-bottom: 8px;
        }

        p {
          font-size: 1.05rem;
          color: #6b7280;
          margin-bottom: 24px;
        }

        .coming-soon {
          padding: 8px 24px;
          background: #d97706;
          color: #fff;
          border-radius: 999px;
          font-weight: 600;
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  )
}
